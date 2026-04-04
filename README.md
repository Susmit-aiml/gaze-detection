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

Required `backend/.env` values:

```env
MONGO_URI=<your_mongo_uri>
JWT_SECRET=<your_strong_jwt_secret>
PORT=5000
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
