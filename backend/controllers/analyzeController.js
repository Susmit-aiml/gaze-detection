const { Blob } = require("buffer");
const GazeResult = require("../models/GazeResult");
const { insertGazePredictionSql } = require("../config/sqlite");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PREFIXES = ["data:image/png;base64,", "data:image/jpeg;base64,"];

const GAZE_API_BASE_URL = process.env.GAZE_API_BASE_URL || "https://ah-freak-gaze-detection-api.hf.space";
const GAZE_API_TIMEOUT_MS = Number(process.env.GAZE_API_TIMEOUT_MS || 30000);
const GAZE_API_RETRY_COUNT = Math.max(0, Number(process.env.GAZE_API_RETRY_COUNT || 1));
const GAZE_H_THRESHOLD = String(process.env.GAZE_API_H_THRESH || "0.12");
const GAZE_V_THRESHOLD = String(process.env.GAZE_API_V_THRESH || "0.10");

const USER_INPUT_ERROR_CODES = new Set(["NO_FACE_DETECTED", "EYES_NOT_DETECTED", "INVALID_THRESHOLD"]);

function parseImageDataUrl(imageDataUrl) {
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return { error: "Image data is required" };
  }

  const matchedPrefix = ALLOWED_PREFIXES.find((prefix) => imageDataUrl.startsWith(prefix));
  if (!matchedPrefix) {
    return { error: "Only .png or .jpg images are supported" };
  }

  const base64Payload = imageDataUrl.slice(matchedPrefix.length);
  if (!base64Payload) {
    return { error: "Image payload is empty" };
  }

  let buffer;
  try {
    buffer = Buffer.from(base64Payload, "base64");
  } catch (error) {
    return { error: "Image payload is invalid" };
  }

  if (!buffer || !buffer.length) {
    return { error: "Image payload is invalid" };
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    return { error: "Image is too large. Maximum allowed size is 5 MB" };
  }

  return {
    buffer,
    mimeType: matchedPrefix.includes("png") ? "image/png" : "image/jpeg",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getResponseMessage(payload, fallback = "Unexpected response from gaze API") {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  if (payload.error && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (payload.error && typeof payload.error.message === "string" && payload.error.message.trim()) {
    return payload.error.message;
  }

  return fallback;
}

function getResponseCode(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if (typeof payload.code === "string" && payload.code.trim()) {
    return payload.code.trim();
  }

  if (payload.error && typeof payload.error.code === "string" && payload.error.code.trim()) {
    return payload.error.code.trim();
  }

  return "";
}

function shouldRetryRequest(errorLike) {
  if (!errorLike) {
    return false;
  }

  if (errorLike.name === "AbortError") {
    return true;
  }

  if (typeof errorLike.status === "number") {
    return errorLike.status === 429 || errorLike.status >= 500;
  }

  return true;
}

async function fetchJsonWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GAZE_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const httpError = new Error(getResponseMessage(payload, `Gaze API request failed with status ${response.status}`));
      httpError.status = response.status;
      httpError.payload = payload;
      throw httpError;
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestWithRetry(task) {
  let lastError = null;

  for (let attempt = 0; attempt <= GAZE_API_RETRY_COUNT; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt >= GAZE_API_RETRY_COUNT || !shouldRetryRequest(error)) {
        throw error;
      }

      const retryDelayMs = 800 * Math.pow(2, attempt);
      await sleep(retryDelayMs);
    }
  }

  throw lastError || new Error("Unknown gaze API error");
}

async function ensureGazeApiHealthy() {
  const healthPayload = await requestWithRetry(() =>
    fetchJsonWithTimeout(`${GAZE_API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
  );

  const statusValue = String(
    healthPayload.status || (healthPayload.data && healthPayload.data.status) || ""
  ).toLowerCase();
  const isHealthy =
    healthPayload.ok === true || statusValue === "ok" || statusValue === "healthy";

  if (!isHealthy) {
    const error = new Error("Gaze API health check did not return ok status");
    error.status = 503;
    error.payload = healthPayload;
    throw error;
  }
}

async function callGazePredictAPI({ imageBuffer, fileName, mimeType }) {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });

  formData.append("image", blob, fileName);
  formData.append("h_thresh", GAZE_H_THRESHOLD);
  formData.append("v_thresh", GAZE_V_THRESHOLD);
  formData.append("debug_gaze", "false");

  return requestWithRetry(() =>
    fetchJsonWithTimeout(`${GAZE_API_BASE_URL}/predict`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    })
  );
}

function getUserIdFromToken(req) {
  const userId = req.user && (req.user.id || req.user._id);
  return userId ? String(userId) : "";
}

const analyzeImage = async (req, res) => {
  try {
    const { imageDataUrl, fileName } = req.body || {};

    const parsed = parseImageDataUrl(imageDataUrl);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const safeFileName = String(fileName || "uploaded-image.jpg").trim() || "uploaded-image.jpg";
    const userId = getUserIdFromToken(req);

    if (!userId) {
      return res.status(401).json({ message: "User authentication is required for analysis" });
    }

    try {
      await ensureGazeApiHealthy();
    } catch (healthError) {
      const healthMessage = getResponseMessage(
        healthError.payload,
        "Gaze API unavailable right now. Please try again shortly."
      );

      return res.status(503).json({
        message: healthMessage,
        code: "GAZE_API_UNAVAILABLE",
      });
    }

    let predictionPayload;
    try {
      predictionPayload = await callGazePredictAPI({
        imageBuffer: parsed.buffer,
        fileName: safeFileName,
        mimeType: parsed.mimeType,
      });
    } catch (predictError) {
      const status = predictError.status >= 400 && predictError.status < 500 ? 400 : 502;
      return res.status(status).json({
        message: getResponseMessage(predictError.payload, "Gaze prediction request failed"),
        code: getResponseCode(predictError.payload) || "GAZE_API_REQUEST_FAILED",
      });
    }

    if (!predictionPayload || predictionPayload.ok !== true || !predictionPayload.data) {
      const upstreamCode = getResponseCode(predictionPayload) || "PREDICTION_FAILED";
      const message = getResponseMessage(predictionPayload, "Prediction failed. Please use a clearer frontal face image.");
      const status = USER_INPUT_ERROR_CODES.has(upstreamCode) ? 422 : 502;

      return res.status(status).json({
        message,
        code: upstreamCode,
      });
    }

    const gazeLabel = predictionPayload.data.gazeLabel;
    const confidenceRaw = predictionPayload.data.confidence;
    const confidence = typeof confidenceRaw === "number" ? confidenceRaw : Number(confidenceRaw);

    if (!gazeLabel || Number.isNaN(confidence)) {
      return res.status(502).json({
        message: "Gaze API returned incomplete prediction data",
        code: "INVALID_PREDICTION_PAYLOAD",
      });
    }

    const decisionPath = predictionPayload.data.decisionPath || "";
    const modelVersion = predictionPayload.data.modelVersion || "";
    const analyzedAt = new Date();

    const analysisRecord = await GazeResult.create({
      userId,
      fileName: safeFileName,
      mimeType: parsed.mimeType,
      gazeLabel: String(gazeLabel),
      confidence,
      decisionPath,
      modelVersion,
      analyzedAt,
    });

    const sqlRecord = insertGazePredictionSql({
      userId,
      fileName: safeFileName,
      mimeType: parsed.mimeType,
      imageBuffer: parsed.buffer,
      gazeLabel: String(gazeLabel),
      confidence,
      decisionPath,
      modelVersion,
      createdAt: analysisRecord.analyzedAt.toISOString(),
    });

    return res.status(200).json({
      message: "Image analyzed successfully",
      result: {
        fileName: safeFileName,
        mimeType: parsed.mimeType,
        predictedGaze: String(gazeLabel),
        confidence,
        decisionPath,
        modelVersion,
        analyzedAt: analysisRecord.analyzedAt.toISOString(),
        sqlRecordId: sqlRecord.id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Analysis failed",
      error: error.message,
    });
  }
};

module.exports = {
  analyzeImage,
};
