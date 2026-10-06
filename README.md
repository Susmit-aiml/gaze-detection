# Gaze Detection System

## Project layout

- `frontend/` -> React frontend (script entries, no HTML files)
- `backend/` -> Express API (`http://localhost:5000`)

## Backend setup

```bash
cd backend
npm install
npm run dev
```

Copy `backend/.env.example` to `backend/.env` and update the values:

```env
PORT=5000
MONGO_URI=<your_mongo_uri>
JWT_SECRET=<your_strong_jwt_secret>

# Optional Gaze API / Model configuration
GAZE_API_BASE_URL=https://ah-freak-gaze-detection-api.hf.space
GAZE_API_KEY=
GAZE_API_TIMEOUT_MS=30000
GAZE_API_RETRY_COUNT=2
GAZE_API_H_THRESH=0.12
GAZE_API_V_THRESH=0.10
SQLITE_DB_PATH=./sqlite-data/gaze_results.sqlite
```

## Frontend setup

```bash
cd frontend
npm install
npm run build
```

React entry scripts:

- `/js/login.js`
- `/js/register.js`
- `/js/dashboard.js`
- `/js/admin.js`

Each entry renders its full page in React.

## API endpoints used

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/protected/me` (token required)
- `GET /api/protected/admin` (admin token required)
- `POST /api/protected/analyze` (token required)

## Dashboard upload rules

- Allowed formats: `.png`, `.jpg`, `.jpeg`
- Allowed MIME types: `image/png`, `image/jpeg`
- Max image size: `5 MB`
