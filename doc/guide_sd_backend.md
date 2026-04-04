# ⚙️ Sd's Guide — Backend: Next.js API Routes + SQLite

> **Role**: Member B — Backend Developer  
> **Branch**: `features/backend`  
> **What you own**: All server-side logic — authentication, upload handling, database, admin APIs, and connecting to Sj's ML service

---

## Big Picture: What You're Building

You're building the **brain of the app** — the backend. When Rr's frontend sends a request (like "login" or "upload image"), YOUR code responds. Here's the flow:

```
User's Browser (Rr's frontend)
     │
     ▼
Your Next.js API Routes ← YOU BUILD THIS
     │
     ├── Auth (register/login/logout) → SQLite database
     ├── Upload image → Save to disk + call Sj's ML API
     └── Admin actions → Read/update SQLite database
     │
     ▼
Sj's ML API (on HuggingFace)
```

---

## Prerequisites: What to Install

### 1. Node.js (version 18 or newer)
```bash
# Check if you have it
node --version

# If NOT installed or version is below 18:
# Go to https://nodejs.org/ and download the LTS version
# Or on Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Git
```bash
git --version
# If not installed: sudo apt-get install git
```

---

## Day-by-Day Plan

| Day | Task |
|-----|------|
| Day 3 | Clone repo, install deps, set up SQLite + database schema |
| Day 4 | Build auth APIs (register, login, logout) |
| Day 5 | Build upload + ML integration + admin APIs |
| Day 6 | Bug fixes and integration testing with Rr's frontend |
| Day 7 | Final testing + demo |

---

## Step-by-Step Instructions

### Step 1: Clone the Repository and Set Up

```bash
# Clone from Sj's fork (replace with actual URL)
git clone https://github.com/codesani157/Gaze-Detection-System.git
cd Gaze-Detection-System

# Create and switch to your branch
git checkout -b features/backend

# Go into the main project folder
cd Gaze-Detection-System

# Install Node.js dependencies
npm install

# Install the extra packages you'll need
npm install better-sqlite3 bcryptjs uuid cookie
npm install --save-dev @types/better-sqlite3 @types/bcryptjs @types/uuid @types/cookie
```

**What each package does:**
- `better-sqlite3` — SQLite database driver (stores users, uploads, results)
- `bcryptjs` — hashes passwords securely (never store plain text passwords!)
- `uuid` — generates unique IDs for sessions and uploads
- `cookie` — reads/writes HTTP cookies for login sessions

---

### Step 2: Create the Database Setup

Create the file `src/lib/db.ts`:

```typescript
/**
 * Database setup — creates SQLite tables for users, images, and results.
 * SQLite stores everything in ONE file (gaze.db) — no server needed!
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database file lives at project root
const DB_PATH = path.join(process.cwd(), 'gaze.db');

// Create/connect to database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables (runs only if they don't exist yet)
db.exec(`
  -- Users table: stores everyone who registers
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Sessions table: tracks who is logged in
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Images table: tracks uploaded images
  CREATE TABLE IF NOT EXISTS images (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(id),
    original_filename TEXT NOT NULL,
    mime_type         TEXT NOT NULL,
    size_bytes        INTEGER NOT NULL,
    storage_path      TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed')),
    failure_reason    TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at      TEXT
  );

  -- Results table: stores gaze detection results
  CREATE TABLE IF NOT EXISTS results (
    id            TEXT PRIMARY KEY,
    image_id      TEXT UNIQUE NOT NULL REFERENCES images(id),
    gaze_label    TEXT NOT NULL CHECK(gaze_label IN ('Forward', 'Left', 'Right', 'Up', 'Down')),
    confidence    REAL NOT NULL,
    eye_box_x     INTEGER NOT NULL,
    eye_box_y     INTEGER NOT NULL,
    eye_box_w     INTEGER NOT NULL,
    eye_box_h     INTEGER NOT NULL,
    model_version TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
```

**What this does in plain English:**
- Creates a file called `gaze.db` in your project folder
- Creates 4 tables inside it (like spreadsheets): users, sessions, images, results
- `TEXT PRIMARY KEY` = a unique text ID for each row
- `REFERENCES users(id)` = links this row to a user
- `CHECK(...)` = only allows specific values

---

### Step 3: Create Helper Functions

Create the file `src/lib/auth.ts`:

```typescript
/**
 * Authentication helpers — password hashing, session management, etc.
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

// --- Password Hashing ---

/** Hash a plain text password. NEVER store the plain text! */
export function hashPassword(password: string): string {
  // "10" = salt rounds. Higher = more secure but slower. 10 is fine for MVP.
  return bcrypt.hashSync(password, 10);
}

/** Check if a plain text password matches the stored hash */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// --- Session Management ---

/** Create a new session for a user. Returns the session ID (used as cookie). */
export function createSession(userId: string): string {
  const sessionId = uuidv4();
  // Session expires in 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(sessionId, userId, expiresAt);

  return sessionId;
}

/** Look up a session by its ID. Returns the user if session is valid. */
export function getSessionUser(sessionId: string): any | null {
  const row = db.prepare(`
    SELECT u.id, u.email, u.role, u.is_active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId) as any;

  return row || null;
}

/** Delete a session (logout) */
export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

// --- Cookie Helpers ---

/** Parse cookies from the request Cookie header string */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  return cookies;
}

/** Build a Set-Cookie header value */
export function makeSessionCookie(sessionId: string): string {
  return `session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${24 * 60 * 60}`;
}

/** Build a cookie that clears the session (for logout) */
export function makeClearCookie(): string {
  return `session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
```

Create the file `src/lib/response.ts`:

```typescript
/**
 * Standard API response helpers.
 * EVERY API response uses the same shape so the frontend always knows what to expect.
 */

import { NextResponse } from 'next/server';

/** Success response: { ok: true, data: ... } */
export function success(data: any, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Error response: { ok: false, error: { code, message } } */
export function error(code: string, message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}
```

---

### Step 4: Build the Auth API Endpoints

#### 4a: Register — `src/app/api/auth/register/route.ts`

```typescript
/**
 * POST /api/auth/register
 * Creates a new user account.
 */

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    // 1. Read the request body
    const body = await req.json();
    const { email, password, confirmPassword } = body;

    // 2. Validate inputs
    if (!email || !password || !confirmPassword) {
      return error('VALIDATION_ERROR', 'Email, password, and confirmPassword are required.', 400);
    }

    // Basic email check (contains @ and a dot after it)
    if (!email.includes('@') || !email.includes('.')) {
      return error('VALIDATION_ERROR', 'Invalid email format.', 400);
    }

    if (password.length < 8) {
      return error('VALIDATION_ERROR', 'Password must be at least 8 characters.', 400);
    }

    if (password !== confirmPassword) {
      return error('VALIDATION_ERROR', 'Passwords do not match.', 400);
    }

    // 3. Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return error('DUPLICATE_EMAIL', 'This email is already registered.', 409);
    }

    // 4. Create the user
    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    db.prepare(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(userId, email, passwordHash, 'user');

    // 5. Return success (NEVER return the password hash!)
    return success({ id: userId, email }, 201);

  } catch (err) {
    console.error('Register error:', err);
    return error('SERVER_ERROR', 'Something went wrong. Please try again.', 500);
  }
}
```

#### 4b: Login — `src/app/api/auth/login/route.ts`

```typescript
/**
 * POST /api/auth/login
 * Authenticates a user and sets a session cookie.
 */

import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, createSession, makeSessionCookie } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return error('VALIDATION_ERROR', 'Email and password are required.', 400);
    }

    // 1. Find the user by email
    const user = db.prepare(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = ?'
    ).get(email) as any;

    if (!user) {
      return error('INVALID_CREDENTIALS', 'Wrong email or password.', 401);
    }

    // 2. Check if account is active
    if (!user.is_active) {
      return error('INACTIVE_USER', 'Your account has been deactivated. Contact admin.', 403);
    }

    // 3. Verify the password
    if (!verifyPassword(password, user.password_hash)) {
      return error('INVALID_CREDENTIALS', 'Wrong email or password.', 401);
    }

    // 4. Create a session
    const sessionId = createSession(user.id);

    // 5. Return success + set cookie
    const response = success({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    response.headers.set('Set-Cookie', makeSessionCookie(sessionId));
    return response;

  } catch (err) {
    console.error('Login error:', err);
    return error('SERVER_ERROR', 'Something went wrong.', 500);
  }
}
```

#### 4c: Logout — `src/app/api/auth/logout/route.ts`

```typescript
/**
 * POST /api/auth/logout
 * Clears the session cookie and deletes the session from DB.
 */

import { NextRequest } from 'next/server';
import { parseCookies, deleteSession, makeClearCookie } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies['session'];

  if (sessionId) {
    deleteSession(sessionId);
  }

  const response = NextResponse.json({ ok: true, data: null }, { status: 204 });
  response.headers.set('Set-Cookie', makeClearCookie());
  return response;
}
```

#### 4d: Get Current User — `src/app/api/auth/me/route.ts`

```typescript
/**
 * GET /api/auth/me
 * Returns the currently logged-in user's info (or 401 if not logged in).
 */

import { NextRequest } from 'next/server';
import { parseCookies, getSessionUser } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function GET(req: NextRequest) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies['session'];

  if (!sessionId) {
    return error('UNAUTHORIZED', 'Not logged in.', 401);
  }

  const user = getSessionUser(sessionId);
  if (!user) {
    return error('SESSION_EXPIRED', 'Session expired. Please login again.', 401);
  }

  if (!user.is_active) {
    return error('INACTIVE_USER', 'Account deactivated.', 403);
  }

  return success({ id: user.id, email: user.email, role: user.role });
}
```

---

### Step 5: Build the Upload + ML Integration

Create directory for uploads:
```bash
mkdir -p public/uploads
```

#### 5a: Upload API — `src/app/api/uploads/route.ts`

```typescript
/**
 * POST /api/uploads
 * Authenticated user uploads an image → save to disk → call Sj's ML API → store result
 */

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { parseCookies, getSessionUser } from '@/lib/auth';
import { success, error } from '@/lib/response';

// Sj's ML API URL — UPDATE THIS when Sj deploys to HuggingFace!
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication
    const cookies = parseCookies(req.headers.get('cookie'));
    const sessionId = cookies['session'];
    if (!sessionId) return error('UNAUTHORIZED', 'Not logged in.', 401);

    const user = getSessionUser(sessionId);
    if (!user) return error('SESSION_EXPIRED', 'Session expired.', 401);
    if (!user.is_active) return error('INACTIVE_USER', 'Account deactivated.', 403);

    // 2. Read the uploaded file
    const formData = await req.formData();
    const file = formData.get('face_image') as File;
    if (!file) return error('INVALID_FILE', 'No image file provided.', 400);

    // 3. Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return error('INVALID_FILE_TYPE', 'Only JPEG/PNG images are allowed.', 400);
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return error('FILE_TOO_LARGE', 'Image must be under 5 MB.', 413);
    }

    // 4. Save file to disk
    const imageId = uuidv4();
    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const filename = `${imageId}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const storagePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storagePath, buffer);

    // 5. Save image record to database with status 'pending'
    db.prepare(`
      INSERT INTO images (id, user_id, original_filename, mime_type, size_bytes, storage_path, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(imageId, user.id, file.name, file.type, file.size, `/uploads/${filename}`);

    // 6. Call Sj's ML API
    try {
      const mlFormData = new FormData();
      mlFormData.append('file', new Blob([buffer], { type: file.type }), filename);

      const mlResponse = await fetch(`${ML_API_URL}/analyze`, {
        method: 'POST',
        body: mlFormData,
      });

      const mlResult = await mlResponse.json();

      if (mlResult.ok && mlResult.data) {
        // Success! Save result to database
        const d = mlResult.data;
        const resultId = uuidv4();

        db.prepare(`
          INSERT INTO results (id, image_id, gaze_label, confidence, eye_box_x, eye_box_y, eye_box_w, eye_box_h, model_version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          resultId, imageId,
          d.gazeLabel, d.confidence,
          d.eyeBoundingBox.x, d.eyeBoundingBox.y,
          d.eyeBoundingBox.width, d.eyeBoundingBox.height,
          d.modelVersion || 'unknown'
        );

        // Update image status to 'processed'
        db.prepare(
          "UPDATE images SET status = 'processed', processed_at = datetime('now') WHERE id = ?"
        ).run(imageId);

        return success({
          imageId,
          status: 'processed',
          gazeLabel: d.gazeLabel,
          confidence: d.confidence,
          eyeBoundingBox: d.eyeBoundingBox,
          imagePath: `/uploads/${filename}`,
        }, 201);

      } else {
        // ML returned an error
        const reason = mlResult.error?.message || 'ML processing failed';
        db.prepare(
          "UPDATE images SET status = 'failed', failure_reason = ? WHERE id = ?"
        ).run(reason, imageId);

        return success({
          imageId,
          status: 'failed',
          failureReason: reason,
          imagePath: `/uploads/${filename}`,
        }, 201);
      }

    } catch (mlError) {
      // ML API unreachable
      db.prepare(
        "UPDATE images SET status = 'failed', failure_reason = 'ML service unreachable' WHERE id = ?"
      ).run(imageId);

      return success({
        imageId,
        status: 'failed',
        failureReason: 'ML service is currently unavailable. Try again later.',
        imagePath: `/uploads/${filename}`,
      }, 201);
    }

  } catch (err) {
    console.error('Upload error:', err);
    return error('SERVER_ERROR', 'Something went wrong during upload.', 500);
  }
}

/**
 * GET /api/uploads
 * Get all uploads for the current logged-in user
 */
export async function GET(req: NextRequest) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies['session'];
  if (!sessionId) return error('UNAUTHORIZED', 'Not logged in.', 401);

  const user = getSessionUser(sessionId);
  if (!user) return error('SESSION_EXPIRED', 'Session expired.', 401);

  const uploads = db.prepare(`
    SELECT i.id, i.original_filename, i.status, i.failure_reason, i.storage_path,
           i.created_at, i.processed_at,
           r.gaze_label, r.confidence, r.eye_box_x, r.eye_box_y, r.eye_box_w, r.eye_box_h
    FROM images i
    LEFT JOIN results r ON r.image_id = i.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
  `).all(user.id);

  return success(uploads);
}
```

---

### Step 6: Build the Admin APIs

#### 6a: List Users — `src/app/api/admin/users/route.ts`

```typescript
/**
 * GET /api/admin/users
 * Admin only — returns all users with their status
 */

import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseCookies, getSessionUser } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function GET(req: NextRequest) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies['session'];
  if (!sessionId) return error('UNAUTHORIZED', 'Not logged in.', 401);

  const user = getSessionUser(sessionId);
  if (!user) return error('SESSION_EXPIRED', 'Session expired.', 401);

  // RBAC check: only admins can see this
  if (user.role !== 'admin') {
    return error('FORBIDDEN', 'Admin access required.', 403);
  }

  const users = db.prepare(`
    SELECT id, email, role, is_active, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  return success(users);
}
```

#### 6b: Toggle User Active — `src/app/api/admin/users/[id]/toggle-active/route.ts`

```typescript
/**
 * POST /api/admin/users/:id/toggle-active
 * Admin only — toggles a user's is_active status
 */

import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseCookies, getSessionUser } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies['session'];
  if (!sessionId) return error('UNAUTHORIZED', 'Not logged in.', 401);

  const admin = getSessionUser(sessionId);
  if (!admin) return error('SESSION_EXPIRED', 'Session expired.', 401);
  if (admin.role !== 'admin') return error('FORBIDDEN', 'Admin access required.', 403);

  const { id: targetUserId } = await params;

  // Don't allow admin to deactivate themselves!
  if (targetUserId === admin.id) {
    return error('VALIDATION_ERROR', 'Cannot deactivate your own account.', 400);
  }

  const targetUser = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(targetUserId) as any;
  if (!targetUser) return error('NOT_FOUND', 'User not found.', 404);

  const newStatus = targetUser.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, targetUserId);

  return success({
    id: targetUserId,
    is_active: newStatus === 1,
    message: newStatus ? 'User activated' : 'User deactivated',
  });
}
```

#### 6c: Admin Uploads List — `src/app/api/admin/uploads/route.ts`

```typescript
/**
 * GET /api/admin/uploads
 * Admin only — system-wide upload history
 */

import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseCookies, getSessionUser } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function GET(req: NextRequest) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies['session'];
  if (!sessionId) return error('UNAUTHORIZED', 'Not logged in.', 401);

  const user = getSessionUser(sessionId);
  if (!user) return error('SESSION_EXPIRED', 'Session expired.', 401);
  if (user.role !== 'admin') return error('FORBIDDEN', 'Admin access required.', 403);

  const uploads = db.prepare(`
    SELECT i.id, i.original_filename, i.status, i.failure_reason, i.storage_path,
           i.created_at, i.processed_at,
           u.email as user_email,
           r.gaze_label, r.confidence
    FROM images i
    JOIN users u ON i.user_id = u.id
    LEFT JOIN results r ON r.image_id = i.id
    ORDER BY i.created_at DESC
  `).all();

  return success(uploads);
}
```

---

### Step 7: Create an Admin Seed Script

Create `src/scripts/seed-admin.ts`:

```typescript
/**
 * Run this ONCE to create the admin account.
 * Usage: npx tsx src/scripts/seed-admin.ts
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'gaze.db');
const db = new Database(DB_PATH);

const adminEmail = 'admin@gaze.com';
const adminPassword = 'admin123';  // Change in production!

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (existing) {
  console.log('Admin already exists.');
  process.exit(0);
}

const id = uuidv4();
const hash = bcrypt.hashSync(adminPassword, 10);
db.prepare(
  "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
).run(id, adminEmail, hash);

console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
```

Run it:
```bash
npm install tsx  # TypeScript execution tool
npx tsx src/scripts/seed-admin.ts
```

---

### Step 8: Create `.env.local` File

Create `.env.local` in the project root:

```bash
# Sj's ML API URL — UPDATE when deployed to HuggingFace
ML_API_URL=http://localhost:8000

# In production, set this to the actual HuggingFace URL:
# ML_API_URL=https://USERNAME-gaze-detection-api.hf.space
```

---

### Step 9: Configure `tsconfig.json` Path Alias

Update `tsconfig.json` to add the `@/` path alias so imports like `@/lib/db` work:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

### Step 10: Test Your Backend

```bash
# Start the dev server
npm run dev
```

Open another terminal and test with curl:

```bash
# 1. Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","confirmPassword":"test1234"}'

# Expected: {"ok":true,"data":{"id":"...","email":"test@test.com"}}

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}' \
  -c cookies.txt

# Expected: {"ok":true,"data":{"id":"...","email":"test@test.com","role":"user"}}

# 3. Upload an image (use any JPEG)
curl -X POST http://localhost:3000/api/uploads \
  -F "face_image=@/path/to/photo.jpg" \
  -b cookies.txt

# Expected: {"ok":true,"data":{"imageId":"...","status":"processed","gazeLabel":"Forward",...}}

# 4. Seed admin and test admin endpoints
npx tsx src/scripts/seed-admin.ts
# Login as admin, then:
curl http://localhost:3000/api/admin/users -b admin_cookies.txt
```

---

## File Structure You'll Create

```
Gaze-Detection-System/
├── src/
│   ├── lib/
│   │   ├── db.ts              ← Database setup
│   │   ├── auth.ts            ← Password + session helpers
│   │   └── response.ts        ← API response helpers
│   ├── app/
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/route.ts
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── me/route.ts
│   │       ├── uploads/route.ts
│   │       └── admin/
│   │           ├── users/route.ts
│   │           ├── users/[id]/toggle-active/route.ts
│   │           └── uploads/route.ts
│   └── scripts/
│       └── seed-admin.ts
├── public/
│   └── uploads/              ← Uploaded images stored here
├── .env.local
└── gaze.db                   ← Created automatically
```

---

## API Endpoint Summary (For Rr)

Share this table with Rr so he can wire the frontend:

| Method | Endpoint | Auth? | Purpose |
|--------|----------|-------|---------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login + get cookie |
| POST | `/api/auth/logout` | Yes | Clear session |
| GET | `/api/auth/me` | Yes | Get current user info |
| POST | `/api/uploads` | Yes | Upload image for analysis |
| GET | `/api/uploads` | Yes | Get user's upload history |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users/:id/toggle-active` | Admin | Block/unblock user |
| GET | `/api/admin/uploads` | Admin | System-wide uploads |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module 'better-sqlite3'` | Run `npm install better-sqlite3` |
| `SQLITE_ERROR: table already exists` | This is fine — `IF NOT EXISTS` prevents errors |
| ML API returns connection error | Check that Sj's API is running (locally or on HuggingFace) |
| Cookie not being set | Check browser DevTools → Application → Cookies |
| `@/lib/db` import not found | Make sure `tsconfig.json` has the `paths` config from Step 9 |

---

## Checklist Before Day 7

- [ ] All auth endpoints work (register, login, logout, me)
- [ ] Upload endpoint saves image + calls ML API + stores result
- [ ] Admin endpoints work (list users, toggle active, list uploads)
- [ ] Admin seed script creates default admin account
- [ ] `.env.local` has correct `ML_API_URL`
- [ ] Pushed all changes to `features/backend` branch
- [ ] Shared API endpoint table with Rr
