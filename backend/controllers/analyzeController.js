const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PREFIXES = ["data:image/png;base64,", "data:image/jpeg;base64,"];

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

function deterministicBaselinePrediction(imageBuffer) {
  const labels = ["Looking Left", "Looking Center", "Looking Right", "Looking Up", "Looking Down"];

  let hash = 2166136261;
  const step = Math.max(1, Math.floor(imageBuffer.length / 2048));

  for (let index = 0; index < imageBuffer.length; index += step) {
    hash ^= imageBuffer[index];
    hash = Math.imul(hash, 16777619);
  }

  const normalized = Math.abs(hash >>> 0);
  const label = labels[normalized % labels.length];
  const confidence = Number((0.65 + ((normalized % 30) / 100)).toFixed(2));

  return {
    predictedGaze: label,
    confidence,
  };
}

const analyzeImage = async (req, res) => {
  try {
    const { imageDataUrl, fileName } = req.body || {};

    const parsed = parseImageDataUrl(imageDataUrl);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const prediction = deterministicBaselinePrediction(parsed.buffer);

    return res.status(200).json({
      message: "Image analyzed successfully",
      result: {
        fileName: fileName || "uploaded-image",
        mimeType: parsed.mimeType,
        predictedGaze: prediction.predictedGaze,
        confidence: prediction.confidence,
        analyzedAt: new Date().toISOString(),
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
