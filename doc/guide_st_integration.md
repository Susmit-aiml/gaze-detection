# 🔗 St's Guide — Integration, Testing & Documentation

> **Role**: Member D — Integration / QA / Docs  
> **Branch**: `features/integration`  
> **What you own**: Making sure everyone's work connects properly, writing setup docs, testing the full flow, tracking bugs, and preparing the final demo

---

## Big Picture: What You're Doing

You are the **glue** of this team. While Sj, Sd, and Rr build individual pieces, YOU make sure those pieces actually work together. Think of yourself as the quality inspector + project manager.

```
Sj's ML API  ←→  Sd's Backend  ←→  Rr's Frontend
                     ↑
              YOU test all connections
              YOU write docs
              YOU find and report bugs
              YOU prepare the demo
```

---

## Prerequisites: What to Install

### 1. Node.js (version 18 or newer)
```bash
node --version
# If not installed: https://nodejs.org/ (download LTS)
```

### 2. Python 3.10+ (for testing Sj's ML API)
```bash
python3 --version
# If not installed: sudo apt-get install python3 python3-pip python3-venv
```

### 3. Git
```bash
git --version
# If not installed: sudo apt-get install git
```

### 4. curl (for API testing)
```bash
curl --version
# Usually pre-installed on Linux/Mac
```

---

## Day-by-Day Plan

| Day | Task |
|-----|------|
| Day 3 | Clone repo, create `HOW_TO_RUN.md` and `.env.example`, set up bug tracker |
| Day 4 | Test auth APIs (register, login, logout), test ML API separately |
| Day 5 | Test full upload flow (frontend → backend → ML → result), test admin flow |
| Day 6 | Run full regression, file bugs, help fix critical issues |
| Day 7 | Prepare demo script, final smoke test, record backup demo |

---

## Step-by-Step Instructions

### Step 1: Clone and Set Up Everything

```bash
# Clone the repo
git clone https://github.com/codesani157/Gaze-Detection-System.git
cd Gaze-Detection-System

# Create your branch
git checkout -b features/integration

# Set up the Next.js project
cd Gaze-Detection-System
npm install

# Set up the Python CV environment (for testing ML)
cd ../
python3 -m venv .venv
source .venv/bin/activate
pip install -r Gaze-Detection-System/cv/requirements.txt
pip install fastapi uvicorn python-multipart
```

---

### Step 2: Create `HOW_TO_RUN.md`

Create this file at the project root: `Gaze-Detection-System/HOW_TO_RUN.md`

```markdown
# How to Run the Gaze Detection System

## Prerequisites
1. **Node.js** version 18+ → [Download](https://nodejs.org/)
2. **Python** 3.10+ → [Download](https://www.python.org/)
3. **Git** → [Download](https://git-scm.com/)

## Quick Start (Local Development)

### 1. Clone the repository
\```bash
git clone https://github.com/codesani157/Gaze-Detection-System.git
cd Gaze-Detection-System/Gaze-Detection-System
\```

### 2. Install Node.js dependencies
\```bash
npm install
\```

### 3. Set up environment variables
\```bash
cp .env.example .env.local
\```
Edit `.env.local` and set the ML API URL.

### 4. Set up the database
\```bash
# Create admin account
npx tsx src/scripts/seed-admin.ts
\```

### 5. Start the ML API (in a separate terminal)
\```bash
cd cv/
# Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn python-multipart

# Start the ML server
uvicorn api:app --reload --port 8000
\```

### 6. Start the web app (in another terminal)
\```bash
cd Gaze-Detection-System/
npm run dev
\```

### 7. Open in browser
Go to http://localhost:3000

## Default Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@gaze.com | admin123 | Admin |

## Test Flow
1. Register a new user at `/register`
2. Login at `/login`
3. Upload a face image on the dashboard
4. See gaze detection results
5. Login as admin → manage users

## Troubleshooting
- If ML API is not responding: check it's running on port 8000
- If database errors: delete `gaze.db` and re-run seed script
- If npm errors: try `rm -rf node_modules && npm install`
```

> **Important**: Replace the escaped backticks `\``` with actual triple backticks when creating this file. The backslashes are only here to avoid formatting issues in this guide.

---

### Step 3: Create `.env.example`

Create `Gaze-Detection-System/.env.example`:

```bash
# ML API URL — Sj's gaze detection service
# For local development:
ML_API_URL=http://localhost:8000
# For production (HuggingFace Spaces):
# ML_API_URL=https://USERNAME-gaze-detection-api.hf.space
```

---

### Step 4: Create the Bug Tracker

Create `doc/bugs.md`:

```markdown
# Bug Tracker

Track all bugs found during testing. Format:
- **ID**: BUG-XXX
- **Summary**: one-line description
- **Found by**: who
- **Status**: Open | Fixed | Won't Fix
- **Owner**: who should fix it
- **Steps to reproduce**: numbered steps

---

## Open Bugs

(none yet)

## Fixed Bugs

(none yet)
```

---

### Step 5: Daily Integration Testing Checklist

Use this checklist every day. Copy it into a new section with today's date.

#### Test 1: Auth Flow
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testday3@test.com","password":"test1234","confirmPassword":"test1234"}'

# Expected: {"ok":true,"data":{"id":"...","email":"testday3@test.com"}}

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testday3@test.com","password":"test1234"}' \
  -c cookies.txt

# Expected: {"ok":true,"data":{"id":"...","email":"testday3@test.com","role":"user"}}

# Check current user
curl http://localhost:3000/api/auth/me -b cookies.txt

# Expected: {"ok":true,"data":{"id":"...","email":"testday3@test.com","role":"user"}}

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt

# After logout, /me should fail
curl http://localhost:3000/api/auth/me -b cookies.txt
# Expected: {"ok":false,"error":{"code":"UNAUTHORIZED",...}}
```

#### Test 2: Duplicate Email
```bash
# Try to register with same email again
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testday3@test.com","password":"test1234","confirmPassword":"test1234"}'

# Expected: {"ok":false,"error":{"code":"DUPLICATE_EMAIL",...}}
```

#### Test 3: Bad Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testday3@test.com","password":"wrongpassword"}'

# Expected: {"ok":false,"error":{"code":"INVALID_CREDENTIALS",...}}
```

#### Test 4: Upload Flow
```bash
# Login first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testday3@test.com","password":"test1234"}' \
  -c cookies.txt

# Upload an image
curl -X POST http://localhost:3000/api/uploads \
  -F "face_image=@/path/to/face_photo.jpg" \
  -b cookies.txt

# Expected: JSON with gazeLabel, confidence, eyeBoundingBox
```

#### Test 5: Admin Flow
```bash
# Seed admin (if not done)
cd Gaze-Detection-System && npx tsx src/scripts/seed-admin.ts

# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gaze.com","password":"admin123"}' \
  -c admin_cookies.txt

# Get user list
curl http://localhost:3000/api/admin/users -b admin_cookies.txt

# Toggle a user's status (replace USER_ID)
curl -X POST http://localhost:3000/api/admin/users/USER_ID/toggle-active \
  -b admin_cookies.txt
```

#### Test 6: ML API Direct Test
```bash
# Test Sj's ML API directly
curl -X POST http://localhost:8000/analyze \
  -F "file=@/path/to/face_photo.jpg"

# Expected: JSON with gazeLabel, confidence, eyeBoundingBox
```

#### Test 7: RBAC Check
```bash
# Try accessing admin endpoint as regular user (should fail)
curl http://localhost:3000/api/admin/users -b cookies.txt

# Expected: {"ok":false,"error":{"code":"FORBIDDEN",...}}
```

---

### Step 6: Integration Test Log Template

Create `doc/test_log.md`:

```markdown
# Daily Integration Test Log

## Day 3 — YYYY-MM-DD

### Environment
- Node.js version: X.X.X
- Python version: X.X.X
- OS: Ubuntu/Mac/Windows

### Tests Run
| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Auth: Register | ✅/❌ | |
| 2 | Auth: Login | ✅/❌ | |
| 3 | Auth: Duplicate email | ✅/❌ | |
| 4 | Auth: Bad password | ✅/❌ | |
| 5 | Upload: Valid image | ✅/❌ | |
| 6 | Upload: No face image | ✅/❌ | |
| 7 | Admin: List users | ✅/❌ | |
| 8 | Admin: Toggle user | ✅/❌ | |
| 9 | RBAC: Non-admin blocked | ✅/❌ | |
| 10 | ML API: Direct test | ✅/❌ | |

### Bugs Found
- BUG-001: [description]

### Blockers
- [any blockers]

---

## Day 4 — YYYY-MM-DD
(copy template above)
```

---

### Step 7: Prepare the Final Demo Script

Create `doc/demo_script.md` closer to Day 7:

```markdown
# Final Demo Script

## Setup Before Demo
1. Start ML API: `cd cv/ && uvicorn api:app --port 8000`
2. Start web app: `cd Gaze-Detection-System/ && npm run dev`
3. Seed admin: `npx tsx src/scripts/seed-admin.ts`

## Demo Flow (5 minutes)

### Act 1: Registration (30 sec)
1. Open http://localhost:3000
2. Click "Register here"
3. Enter: demo@test.com / demo1234
4. Show success → redirect to login

### Act 2: User Login + Upload (2 min)
1. Login with demo@test.com
2. Show clean dashboard
3. Upload a clear frontal face photo
4. Wait for result
5. Point out: gaze label, confidence score, eye bounding box
6. Upload a second image (looking left/right) to show different result

### Act 3: Error Handling (30 sec)
1. Upload an image with no face (e.g., landscape)
2. Show graceful error message

### Act 4: Admin Panel (1.5 min)
1. Logout
2. Login as admin@gaze.com / admin123
3. Show user management table
4. Deactivate demo@test.com
5. Show system usage logs with upload history
6. Logout → login as demo@test.com → show "account deactivated" error

### Act 5: Closing (30 sec)
- Mention tech stack: Next.js + Python + MediaPipe
- Mention future scope: real-time webcam, cloud deployment

## Backup Plan
If live demo fails:
- Show pre-recorded video/screenshots
- Keep screenshots of each step in `doc/demo_screenshots/`
```

---

### Step 8: Contract Drift Prevention

Your most important job is making sure the API contract doesn't change without everyone agreeing. Here's what to watch for:

| What to check | Why it matters |
|---------------|----------------|
| ML output JSON has `gazeLabel`, `confidence`, `eyeBoundingBox` | Frontend depends on these exact key names |
| All API responses use `{"ok": true/false, ...}` | Frontend parses this shape |
| Upload endpoint accepts `face_image` field name | Frontend sends with this name |
| Auth endpoints return user with `role` field | Frontend uses role for routing |
| Admin endpoints return 403 for non-admins | Security requirement |

If anyone wants to change a field name or response format, **they must tell the team first** and everyone must update their code together.

---

### Step 9: Daily Sync Responsibilities

As the integration person, lead the daily sync:

1. **Ask each member**: "What did you finish? Any blockers?"
2. **Check branches**: Has everyone pushed their latest code?
3. **Run integration tests**: Use the checklist from Step 5
4. **Report bugs**: Add to `doc/bugs.md`
5. **Update team**: "X works, Y is broken, Z needs attention"

---

## File Structure You'll Create

```
Gaze-Detection-System/
├── HOW_TO_RUN.md           ← Setup guide for anyone
├── .env.example            ← Template for environment variables
├── doc/
│   ├── bugs.md             ← Bug tracker
│   ├── test_log.md         ← Daily test results
│   └── demo_script.md      ← Final demo playbook
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend endpoint returns 404 | Sd hasn't built it yet — check with them |
| ML API not responding | Check if Python server is running (`uvicorn api:app`) |
| Frontend shows blank page | Open browser DevTools → Console → check errors |
| Git merge conflict | Ask the conflicting members to sync, help resolve |
| Different API response than expected | Someone changed the contract — flag immediately |

---

## Checklist Before Day 7

- [ ] `HOW_TO_RUN.md` exists and a fresh clone can follow it to get running
- [ ] `.env.example` is committed
- [ ] Bug tracker has all found bugs logged
- [ ] Test log has entries for each day of testing
- [ ] Demo script is written and rehearsed
- [ ] Full flow works end-to-end: register → login → upload → result → admin
- [ ] Backup screenshots/video taken in case live demo fails
- [ ] All branches merged to `main` or integration branch
- [ ] Pushed all changes to `features/integration` branch
