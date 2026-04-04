import { useEffect, useMemo, useState } from "react";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  API_BASE_URL,
  MAX_IMAGE_BYTES,
  ROUTES,
} from "../common/config";
import { clearSession, getSession, redirectTo } from "../common/auth";

function extensionOf(fileName) {
  const lowered = String(fileName || "").toLowerCase();
  const dotIndex = lowered.lastIndexOf(".");
  return dotIndex < 0 ? "" : lowered.slice(dotIndex);
}

function validateImage(file) {
  if (!file) {
    return "Please choose an image first.";
  }

  const extension = extensionOf(file.name);
  const extensionOk = ALLOWED_EXTENSIONS.includes(extension);
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.type);

  if (!extensionOk || !mimeOk) {
    return "Only .png or .jpg images are allowed.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large. Maximum allowed size is 5 MB.";
  }

  return "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target?.result || "");
    };

    reader.onerror = () => {
      reject(new Error("Unable to read selected image."));
    };

    reader.readAsDataURL(file);
  });
}

function historyKey(email) {
  return `gazeUploadHistory:${String(email || "anonymous").toLowerCase()}`;
}

function loadHistory(email) {
  const raw = localStorage.getItem(historyKey(email));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(email, historyItems) {
  localStorage.setItem(historyKey(email), JSON.stringify(historyItems));
}

function formatConfidence(value) {
  if (typeof value === "number") {
    return `${Math.round(value * 100)}%`;
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

export default function DashboardApp() {
  const [checkedSession, setCheckedSession] = useState(false);
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("No upload in progress.");
  const [predictedGaze, setPredictedGaze] = useState("-");
  const [confidence, setConfidence] = useState("-");
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function verifySession() {
      const { token, role, email } = getSession();

      if (!token) {
        redirectTo(ROUTES.login);
        return;
      }

      if (role === "admin") {
        redirectTo(ROUTES.admin);
        return;
      }

      setUserEmail(email || "user@example.com");
      setHistory(loadHistory(email || "user@example.com"));

      try {
        const response = await fetch(`${API_BASE_URL}/protected/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("session-invalid");
        }

        const payload = await response.json().catch(() => ({}));
        const backendEmail = payload.user?.email || email || "user@example.com";
        localStorage.setItem("userEmail", backendEmail);
        setUserEmail(backendEmail);
        setHistory(loadHistory(backendEmail));
      } catch {
        clearSession();
        redirectTo(ROUTES.login);
        return;
      }

      setCheckedSession(true);
    }

    verifySession();
  }, []);

  const canAnalyze = useMemo(
    () => Boolean(selectedFile && imageDataUrl && !submitting),
    [selectedFile, imageDataUrl, submitting]
  );

  function onLogout() {
    clearSession();
    redirectTo(ROUTES.login);
  }

  async function onFileChange(event) {
    const file = event.target.files?.[0] || null;

    setError("");
    setPredictedGaze("-");
    setConfidence("-");

    if (!file) {
      setSelectedFile(null);
      setImageDataUrl("");
      setPreviewUrl("");
      setStatus("No upload in progress.");
      return;
    }

    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setImageDataUrl("");
      setPreviewUrl("");
      setStatus("Choose a valid .png or .jpg image before analyzing.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSelectedFile(file);
      setImageDataUrl(dataUrl);
      setPreviewUrl(dataUrl);
      setStatus(`Ready to analyze: ${file.name}`);
    } catch {
      setError("Unable to read selected image.");
      setSelectedFile(null);
      setImageDataUrl("");
      setPreviewUrl("");
      setStatus("Image read failed.");
    }
  }

  async function onAnalyzeSubmit(event) {
    event.preventDefault();

    const { token } = getSession();

    if (!selectedFile || !imageDataUrl) {
      setError("Please choose a valid .png or .jpg image first.");
      setStatus("No upload in progress.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("Uploading image and running model inference...");

    try {
      const response = await fetch(`${API_BASE_URL}/protected/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageDataUrl,
          fileName: selectedFile.name,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "Analysis failed.");
      }

      const result = payload.result || {};
      const resultGaze = result.predictedGaze || result.label || "-";
      const resultConfidence = formatConfidence(result.confidence || result.score || "-");

      setPredictedGaze(resultGaze);
      setConfidence(resultConfidence);
      setStatus(`Analysis complete for ${result.fileName || selectedFile.name}.`);

      const historyItem = {
        fileName: result.fileName || selectedFile.name,
        predictedGaze: resultGaze,
        confidence: resultConfidence,
        analyzedAt: result.analyzedAt || new Date().toISOString(),
      };

      const nextHistory = [historyItem, ...history].slice(0, 20);
      setHistory(nextHistory);
      saveHistory(userEmail, nextHistory);
    } catch (analyzeError) {
      setError(analyzeError.message || "Analysis failed.");
      setStatus("Analysis failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!checkedSession) {
    return null;
  }

  return (
    <div className="app-shell app-dashboard">
      <span className="scene-orb orb-a" aria-hidden="true" />
      <span className="scene-orb orb-b" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar-content">
          <div className="brand-block">
            <h1 className="brand-title">User Dashboard</h1>
            <p className="brand-subtitle">Vision stream and model confidence</p>
          </div>
          <div className="topbar-actions">
            <span id="userEmail" className="nav-email">
              {userEmail}
            </span>
            <button id="logoutBtn" className="btn-ghost" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-grid">
          <section className="panel">
            <h2 className="panel-header">Upload and Analyze</h2>
            <div className="panel-body">
              <p className="panel-note">
                Upload one clear frontal face image. Supported formats: JPG/PNG. Max size: 5 MB.
              </p>

              <form id="uploadForm" className="stack" onSubmit={onAnalyzeSubmit} noValidate>
                <div className="field">
                  <label htmlFor="facialImage">Facial image</label>
                  <input
                    id="facialImage"
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={onFileChange}
                    required
                  />
                </div>

                <p id="errorMessage" className="message error" role="alert">
                  {error}
                </p>

                <button id="analyzeBtn" type="submit" disabled={!canAnalyze}>
                  {submitting ? "Analyzing..." : "Analyze image"}
                </button>
              </form>

              <div className="separator" />

              <h3 className="status-title">Processing status</h3>
              <p id="processingStatus" className="status-text">
                {status}
              </p>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-header">Latest Result</h2>
            <div className="panel-body">
              {!previewUrl ? (
                <div id="previewPlaceholder" className="preview-box">
                  Your uploaded image preview will appear here.
                </div>
              ) : (
                <div id="previewImageWrap" className="preview-box" aria-live="polite">
                  <img
                    id="previewImage"
                    className="preview-image"
                    src={previewUrl}
                    alt="Selected facial preview"
                    style={{ display: "block" }}
                  />
                </div>
              )}

              <div className="result-grid">
                <div>
                  <div className="metric-label">Predicted gaze</div>
                  <div id="predictedGaze" className="metric-value">
                    {predictedGaze}
                  </div>
                </div>
                <div>
                  <div className="metric-label">Confidence</div>
                  <div id="confidence" className="metric-value">
                    {confidence}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="panel" style={{ marginTop: 20 }}>
          <div className="history-header">
            <h2 className="history-title">Upload History</h2>
            <span id="historyCount" className="history-count">
              {history.length} {history.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <div className="panel-body">
            {!history.length ? (
              <p id="historyEmpty" className="history-empty">
                No uploads yet. Start by uploading a facial image.
              </p>
            ) : (
              <ul id="historyList" className="history-list">
                {history.map((item, index) => (
                  <li key={`${item.fileName}-${item.analyzedAt}-${index}`} className="history-item">
                    <p className="history-file">{item.fileName || "image.jpg"}</p>
                    <p className="history-meta">
                      Gaze: {item.predictedGaze || "-"} | Confidence: {item.confidence || "-"}
                    </p>
                    <p className="history-meta">{formatDate(item.analyzedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
