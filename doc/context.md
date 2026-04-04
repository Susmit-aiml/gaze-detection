# Project Context Journal

Last updated: 2026-04-03
Project root: `d:\login`

## 1) Project Motto
Build a **clean, end-to-end Gaze Detection web app** where:
- auth is stable (register/login/role routing),
- user dashboard upload flow is reliable,
- only valid image formats are accepted (`.png`, `.jpg`, `.jpeg`),
- results appear clearly,
- UI feels modern and smooth,
- handoff between agents is frictionless.

## 2) Current Substance of the Project
This repo is a split frontend/backend app.

- Frontend: React + Vite (custom no-HTML routing strategy)
- Backend: Node.js + Express + MongoDB auth
- Auth: JWT-based with role support (`user`, `admin`)
- Upload analysis: protected endpoint accepts image data URL and returns prediction payload

## 3) Critical Architecture Decisions

### Frontend has no physical HTML files
- Requirement was to remove HTML files.
- To support this, Vite config includes custom middleware that serves in-memory HTML shells at runtime.
- Virtual routes served by Vite middleware:
  - `/`
  - `/login`
  - `/register`
  - `/dashboard`
  - `/admin`
  - plus legacy aliases: `/login.html`, `/register.html`, `/dashboard.html`, `/admin.html`

### React entry model
- Script entries in `frontend/js/*.js` mount React apps from `frontend/src/*/App.jsx`.
- Shared helpers:
  - `frontend/src/common/config.js`
  - `frontend/src/common/auth.js`
  - `frontend/src/common/mount.js`

### Backend analysis endpoint exists (baseline implementation)
- Added `POST /api/protected/analyze`.
- Current analyze logic is deterministic placeholder hashing, not real ML inference yet.
- Endpoint validates MIME prefix and max size (`5 MB`).

## 4) Progress Journal (What has been done)

### Milestone A: Stabilized auth + protected APIs
- Confirmed and used auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/protected/me`
  - `GET /api/protected/admin`
- JWT payload updated to include email for better frontend display.
- JSON body size in backend increased to `8mb` to support image data URL upload.

### Milestone B: Added protected analyze API
- New file: `backend/controllers/analyzeController.js`
- Route wired in: `backend/routes/protectedRoutes.js`
- Input validation:
  - accepts `data:image/png;base64,...` and `data:image/jpeg;base64,...`
  - rejects invalid payload
  - rejects payload over `5 MB`
- Returns result object with:
  - `fileName`
  - `mimeType`
  - `predictedGaze`
  - `confidence`
  - `analyzedAt`

### Milestone C: Frontend migrated to React and no-HTML setup
- Removed frontend HTML pages.
- React pages implemented:
  - `frontend/src/login/App.jsx`
  - `frontend/src/register/App.jsx`
  - `frontend/src/dashboard/App.jsx`
  - `frontend/src/admin/App.jsx`
- Entry scripts:
  - `frontend/js/login.js`
  - `frontend/js/register.js`
  - `frontend/js/dashboard.js`
  - `frontend/js/admin.js`

### Milestone D: UX and validation behavior implemented
- Login/register forms wired to backend.
- Dashboard shows logged-in email in top bar.
- Dashboard upload flow enforces:
  - extension must be `.png`, `.jpg`, or `.jpeg`
  - MIME must be `image/png` or `image/jpeg`
  - size <= `5MB`
- Upload preview and status messaging implemented.
- Upload history persisted in localStorage per email.

### Milestone E: Visual redesign completed
- Frontend restyled to a non-boilerplate modern visual direction:
  - custom font pairing (`Sora`, `Manrope`)
  - layered atmospheric background
  - glassmorphism-like cards/panels
  - subtle motion (`rise`, `pop`, `drift`)
  - improved file input/button interactions
  - mobile responsive polish
- Main style file: `frontend/styles/main.css`

### Milestone F: Root auth-page behavior fixed
- User requested root to open auth first.
- Login page auto-redirect-on-mount removed.
- Current behavior:
  - `http://localhost:5173/` opens auth page
  - redirect to dashboard/admin only after successful login submit

## 5) Current Known Good Behavior
- Backend root responds: `http://localhost:5000/`
- Frontend root resolves: `http://localhost:5173/`
- Frontend routes resolve via middleware (no HTML files required)
- Dashboard requires token; redirects appropriately when unauthenticated

## 6) Known Issues / Pitfalls and Fixes

### A) `Port 5173 is already in use`
Cause: stale Vite process.
Fix:
1. Find and stop process on 5173.
2. Restart frontend dev server.

### B) Vite `spawn EPERM` in restricted sandbox
Cause: command sandbox limits in tool runtime.
Fix:
- Run with elevated permissions in this agent environment.
- On local machine terminal, this usually does not happen.

### C) PowerShell `npm` execution policy issue
Symptom: script blocked when calling `npm`.
Fix: use `npm.cmd` instead of `npm`.

### D) Frontend opening dashboard immediately
Cause: old login auto-redirect logic + existing token.
Fix done: removed auto-redirect on login mount.
If still seen, hard refresh and ensure route is `/`.

## 7) Runbook (How to run project)
From `d:\login`, use two terminals.

Terminal 1 (backend):
```powershell
npm.cmd install --prefix backend
npm.cmd run dev --prefix backend
```

Terminal 2 (frontend):
```powershell
npm.cmd install --prefix frontend
npm.cmd run dev --prefix frontend
```

Open:
- `http://localhost:5173/` (auth)
- `http://localhost:5173/register`
- `http://localhost:5173/dashboard`
- `http://localhost:5173/admin`

## 8) High-Value File Map for New Agent

Frontend:
- `frontend/vite.config.js` (virtual route middleware for no-HTML strategy)
- `frontend/styles/main.css` (primary design system)
- `frontend/src/login/App.jsx`
- `frontend/src/register/App.jsx`
- `frontend/src/dashboard/App.jsx`
- `frontend/src/admin/App.jsx`
- `frontend/src/common/config.js`
- `frontend/src/common/auth.js`
- `frontend/src/common/mount.js`

Backend:
- `backend/server.js`
- `backend/controllers/authController.js`
- `backend/controllers/analyzeController.js`
- `backend/routes/authRoutes.js`
- `backend/routes/protectedRoutes.js`
- `backend/middleware/authMiddleware.js`

## 9) Remaining Work / Future Direction
- Replace deterministic analyze placeholder with real model inference service.
- Optionally add persistent upload history in DB (currently localStorage).
- Optional: add e2e tests for auth + upload flow.
- Optional: add one-command dev launcher for backend + frontend.

## 10) Handoff Summary
If an agent switch happens, this is the current mission state:
- Project is functional with React frontend and Express backend.
- No static HTML files are used in frontend.
- Root route now opens auth first as requested.
- UI has already been upgraded to a polished modern style.
- Biggest pending product gap is real model integration behind `/api/protected/analyze`.
