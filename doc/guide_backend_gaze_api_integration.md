# Gaze Detection API — Backend Integration Guide

**For:** Backend Engineer  
**API Owner:** ah-freak  
**Live API Base URL:** `https://ah-freak-gaze-detection-api.hf.space`  
**Hosted on:** Hugging Face Spaces (Docker, CPU Basic)

---

## What This API Does

This is a computer vision ML API that receives a face image and returns a **gaze direction label** — one of:

```
Forward | Left | Right | Up | Down
```

It uses MediaPipe FaceMesh + iris landmarks with a custom rule-based `estimate_gaze()` function. Your job is to call this API from the backend, extract the result, and store it in the database.

---

## Base URL

```
https://ah-freak-gaze-detection-api.hf.space
```

No authentication required. API is public.

---

## Endpoints

### `GET /health`
Check if the API is alive before making predict calls.

**Request:**
```bash
curl -s https://ah-freak-gaze-detection-api.hf.space/health
```

**Response:**
```json
{
  "status": "ok"
}
```

Always call `/health` before `/predict` in production to avoid firing requests to a downed service.

---

### `POST /predict`
Send a face image, receive a gaze label.

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `image` | file | ✅ Yes | — | The image file (JPEG/PNG) |
| `h_thresh` | float | No | `0.12` | Horizontal gaze threshold |
| `v_thresh` | float | No | `0.10` | Vertical gaze threshold |
| `max_mb` | float | No | `5.0` | Max image size in MB |
| `debug_gaze` | bool | No | `false` | Include debug fields in response |

> ⚠️ The image field name must be exactly `image` — no other name will work.

---

## Response Shape

### Success
```json
{
  "ok": true,
  "data": {
    "status": "processed",
    "gazeLabel": "Forward",
    "confidence": 0.7383,
    "decisionPath": "forward_neutral_zone",
    "eyeBoundingBox": {
      "x": 1115,
      "y": 942,
      "width": 383,
      "height": 65
    },
    "modelVersion": "mediapipe-face-mesh-iris-v1",
    "thresholds": {
      "horizontal": 0.12,
      "vertical": 0.10
    },
    "meta": {
      "inputWidth": 2592,
      "inputHeight": 1944,
      "artifactsEphemeral": true
    }
  }
}
```

### Fields to Store in Database

| Field | Type | Description |
|---|---|---|
| `data.gazeLabel` | string | The gaze direction — store this |
| `data.confidence` | float | Confidence score 0–1 — store this |
| `data.decisionPath` | string | Internal decision label — optional to store |

### What NOT to Store
```
data.artifacts.markedImagePath
data.artifacts.leftEyeCropPath
data.artifacts.rightEyeCropPath
```
These are **ephemeral temp paths** on the server — they are wiped after the request. Do not store or reference them.

---

## Integration Code

### Python (FastAPI / httpx)

```python
import httpx

async def call_gaze_api(image_bytes: bytes, filename: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://ah-freak-gaze-detection-api.hf.space/predict",
            files={"image": (filename, image_bytes, "image/jpeg")},
            data={
                "h_thresh": "0.12",
                "v_thresh": "0.10",
                "debug_gaze": "false"
            }
        )
        response.raise_for_status()
        return response.json()


# Usage in your route
@app.post("/api/gaze/analyze")
async def analyze(image: UploadFile, user_id: str):
    # 1. Health check
    health = await client.get("https://ah-freak-gaze-detection-api.hf.space/health")
    if health.json().get("status") != "ok":
        raise HTTPException(503, "Gaze API unavailable")

    # 2. Call predict
    image_bytes = await image.read()
    result = await call_gaze_api(image_bytes, image.filename)

    if not result.get("ok"):
        raise HTTPException(500, "Gaze prediction failed")

    # 3. Extract what you need
    gaze_label = result["data"]["gazeLabel"]
    confidence = result["data"]["confidence"]

    # 4. Store in database
    await db.gaze_results.insert({
        "user_id": user_id,
        "gaze_label": gaze_label,
        "confidence": confidence,
        "timestamp": datetime.utcnow()
    })

    return {"gazeLabel": gaze_label, "confidence": confidence}
```

---

### Node.js (Express / node-fetch)

```javascript
const FormData = require("form-data");
const fetch = require("node-fetch");

async function callGazeAPI(imageBuffer, filename) {
  const form = new FormData();
  form.append("image", imageBuffer, { filename, contentType: "image/jpeg" });
  form.append("h_thresh", "0.12");
  form.append("v_thresh", "0.10");
  form.append("debug_gaze", "false");

  const res = await fetch(
    "https://ah-freak-gaze-detection-api.hf.space/predict",
    { method: "POST", body: form }
  );

  if (!res.ok) throw new Error(`Gaze API error: ${res.status}`);
  return res.json();
}


// Usage in your route
app.post("/api/gaze/analyze", async (req, res) => {
  // 1. Health check
  const health = await fetch("https://ah-freak-gaze-detection-api.hf.space/health");
  const healthData = await health.json();
  if (healthData.status !== "ok") {
    return res.status(503).json({ error: "Gaze API unavailable" });
  }

  // 2. Call predict
  const result = await callGazeAPI(req.file.buffer, req.file.originalname);

  if (!result.ok) {
    return res.status(500).json({ error: "Prediction failed" });
  }

  // 3. Extract and store
  const { gazeLabel, confidence } = result.data;

  await db.collection("gaze_results").insertOne({
    userId: req.body.userId,
    gazeLabel,
    confidence,
    timestamp: new Date()
  });

  res.json({ gazeLabel, confidence });
});
```

---

## Full Integration Flow

```
1. Frontend captures image
        ↓
2. Frontend sends image to YOUR backend endpoint
        ↓
3. Your backend calls GET /health → confirm API is alive
        ↓
4. Your backend calls POST /predict with image as multipart/form-data
        ↓
5. HF API returns { ok, data: { gazeLabel, confidence } }
        ↓
6. Your backend stores gazeLabel + confidence in database
        ↓
7. Your backend returns result to frontend
```

---

## Quick Terminal Test

To verify the API is working before integrating:

```bash
# Health check
curl -s https://ah-freak-gaze-detection-api.hf.space/health | python3 -m json.tool

# Predict with a test image
curl -s -X POST "https://ah-freak-gaze-detection-api.hf.space/predict" \
  -F "image=@/path/to/your/test-face.jpg" \
  -F "h_thresh=0.12" \
  -F "v_thresh=0.10" \
  -F "debug_gaze=false" \
  | python3 -m json.tool
```

Use any clear frontal face JPEG. You should get `"gazeLabel"` in the response.

---

## Troubleshooting

### `422 Unprocessable Entity`
**Cause:** Wrong form field name or missing image.  
**Fix:** Make sure the file field is named exactly `image`. No other name works.

```python
# Wrong
files={"file": ...}
files={"photo": ...}

# Correct
files={"image": ...}
```

---

### `{"detail": "Not Found"}`
**Cause:** Calling a non-existent endpoint.  
**Fix:** Only `/health` and `/predict` exist. Check for typos. The old `/analyze` endpoint does not exist.

---

### `NO_FACE_DETECTED` in response
**Cause:** Image has no detectable face — poor quality, profile angle, small face region.  
**Fix:** Validate image quality on the frontend before sending. Ensure frontal face, good lighting, no heavy occlusion.

---

### `EYES_NOT_DETECTED` in response
**Cause:** Face found but eyes not clearly visible — sunglasses, extreme angle, occlusion.  
**Fix:** Same as above — add frontend validation before sending.

---

### `INVALID_THRESHOLD`
**Cause:** `h_thresh` or `v_thresh` passed as zero or negative.  
**Fix:** Always pass positive floats. Defaults (`0.12`, `0.10`) are fine for most cases.

---

### CORS error (if calling directly from browser)
**Cause:** Frontend origin not allowed.  
**Fix:** This should not happen if your backend is the one calling the API (server-to-server). If frontend calls directly, contact the API owner to whitelist your domain in `GAZE_API_ALLOW_ORIGINS`.

---

### Timeout / Long Latency
**Cause:** Large image file, cold start on HF Space, or network delay.  
**Fix:**
- Resize images to max 1280px on the longest side before sending
- Set request timeout to at least 30 seconds
- Add retry logic (1-2 retries with exponential backoff)
- Keep `debug_gaze=false` in production

---

### Empty response / Connection refused
**Cause:** HF Space may be sleeping (free tier sleeps after inactivity).  
**Fix:** Call `/health` first. If it times out, the Space is waking up — retry after 15-20 seconds.

---

## Error Codes to Log

Always log these error codes from the response for monitoring:

| Code | Meaning |
|---|---|
| `NO_FACE_DETECTED` | No face in image |
| `EYES_NOT_DETECTED` | Face found, eyes not visible |
| `INVALID_THRESHOLD` | Bad threshold values passed |
| `UNSUPPORTED_MEDIAPIPE_VERSION` | Internal API error — report to ML team |

---

## Production Checklist

- [ ] Call `/health` before `/predict` in every request flow
- [ ] Set request timeout to 30 seconds minimum
- [ ] Add retry logic for transient failures
- [ ] Do NOT store artifact file paths from response
- [ ] Log error codes for monitoring
- [ ] Keep `debug_gaze=false` in production
- [ ] Resize large images before upload to reduce latency

---

## Contact

For API issues, threshold tuning, or model behavior questions — reach out to the ML team (ah-freak).
