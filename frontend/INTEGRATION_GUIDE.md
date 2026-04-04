# Frontend Integration Guide (React, No HTML Files)

Frontend is implemented in React and bundled as script entry points.

## Entry scripts

- `/js/login.js`
- `/js/register.js`
- `/js/dashboard.js`
- `/js/admin.js`

Each entry mounts itself and renders the full UI with React.

## Optional runtime config

```js
window.__GAZE_API_BASE_URL__ = "http://localhost:5000/api";
window.__GAZE_ROUTES__ = {
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  admin: "/admin",
};
```

## Backend APIs expected

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/protected/me`
- `GET /api/protected/admin`
- `POST /api/protected/analyze`

## Upload validation

- Allowed extensions: `.png`, `.jpg`, `.jpeg`
- Allowed MIME: `image/png`, `image/jpeg`
- Max size: `5 MB`
