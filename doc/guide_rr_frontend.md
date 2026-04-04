# 🎨 Rr's Guide — Frontend: Converting HTML to React + Wiring APIs

> **Role**: Member C — Frontend Developer  
> **Branch**: `features/frontend`  
> **What you own**: Turn the existing static HTML pages into working React components that talk to Sd's backend APIs

---

## Big Picture: What You're Building

Right now, the project has static HTML pages (`login.html`, `register.html`, etc.) that **look right** but **do nothing**. Your job is to:

1. Convert those HTML pages into React/Next.js components
2. Wire the forms to send data to the backend APIs (Sd's work)
3. Display real results from the gaze detection ML pipeline

```
Static HTML (what exists now)  →  React Pages (what you'll build)
                                       │
                                       ▼
                                  Sd's Backend APIs
                                  (auth, upload, admin)
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

### 3. A code editor
Use **VS Code** (free): https://code.visualstudio.com/

---

## Day-by-Day Plan

| Day | Task |
|-----|------|
| Day 3 | Clone repo, understand project structure, set up Next.js app folder |
| Day 4 | Build Login + Register pages (connected to Sd's API) |
| Day 5 | Build User Dashboard (upload + result display) |
| Day 6 | Build Admin Dashboard + error pages |
| Day 7 | Bug fixes + polish + demo |

---

## Step-by-Step Instructions

### Step 1: Clone the Repository and Set Up

```bash
# Clone from Sj's fork (replace with actual URL)
git clone https://github.com/codesani157/Gaze-Detection-System.git
cd Gaze-Detection-System

# Create and switch to your branch
git checkout -b features/frontend

# Go into the main project folder
cd Gaze-Detection-System

# Install dependencies
npm install
```

---

### Step 2: Understand the Next.js App Structure

Next.js uses a **file-based routing** system. Each page is a file in the `src/app/` folder:

```
src/app/
├── layout.tsx        ← The outer shell (navbar appears on every page)
├── page.tsx          ← The home page (redirect to login)
├── login/
│   └── page.tsx      ← /login page
├── register/
│   └── page.tsx      ← /register page
├── dashboard/
│   └── page.tsx      ← /dashboard page (user)
├── admin/
│   └── page.tsx      ← /admin page
├── access-denied/
│   └── page.tsx      ← /access-denied page
└── session-expired/
    └── page.tsx      ← /session-expired page
```

**Key rule**: The file `src/app/login/page.tsx` automatically becomes the `/login` route. No manual routing configuration needed!

---

### Step 3: Create the Root Layout

Create `src/app/layout.tsx`:

```tsx
/**
 * Root layout — wraps every page. Contains the navbar.
 */
import './globals.css';

export const metadata = {
  title: 'Gaze Detection System',
  description: 'Upload facial images to detect gaze direction.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-light" style={{ minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
```

Create `src/app/globals.css` — copy the contents of the existing `styles.css` file into this file.

---

### Step 4: Create a Shared Navbar Component

Create `src/components/Navbar.tsx`:

```tsx
'use client'; // This tells Next.js this component runs in the browser

import { useRouter } from 'next/navigation';

interface NavbarProps {
  title: string;
  variant?: 'dark' | 'danger'; // dark = normal, danger = admin (red)
  showLogout?: boolean;
}

export default function Navbar({ title, variant = 'dark', showLogout = false }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    // Call the logout API
    await fetch('/api/auth/logout', { method: 'POST' });
    // Redirect to login page
    router.push('/login');
  }

  return (
    <nav className={`navbar navbar-dark bg-${variant} mb-4`}>
      <div className="container page-shell">
        <span className="navbar-brand mb-0 h1">{title}</span>
        {showLogout && (
          <button
            onClick={handleLogout}
            className="btn btn-outline-light btn-sm"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
```

---

### Step 5: Build the Login Page

Create `src/app/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Prevent the default form submission (page reload)
    setErrorMsg('');
    setLoading(true);

    try {
      // Send login request to Sd's backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.ok) {
        // Login successful! Redirect based on role
        if (data.data.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Show error message
        setErrorMsg(data.error?.message || 'Login failed. Try again.');
      }
    } catch (err) {
      setErrorMsg('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar title="Gaze Detection System" />
      <div className="d-flex flex-grow-1 align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="card shadow p-4" style={{ width: '100%', maxWidth: '400px' }}>
          <h3 className="text-center mb-4">System Login</h3>

          {/* Error alert — only shows when there's an error */}
          {errorMsg && (
            <div className="alert alert-danger" role="alert">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <hr className="my-4" />
          <p className="text-center mb-0">
            No account? <a href="/register">Register here</a>
          </p>
        </div>
      </div>
    </>
  );
}
```

**What's happening here (in plain English):**
- `useState` — React's way to store data that can change (like what the user types)
- `fetch('/api/auth/login', ...)` — sends the email + password to Sd's backend
- `router.push('/dashboard')` — redirects the user after successful login
- `{errorMsg && (...)}` — only shows the error box when there IS an error

---

### Step 6: Build the Register Page

Create `src/app/register/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validation
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await response.json();

      if (data.ok) {
        // Registration successful! Redirect to login
        router.push('/login');
      } else {
        setErrorMsg(data.error?.message || 'Registration failed.');
      }
    } catch (err) {
      setErrorMsg('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar title="Gaze Detection System" />
      <main className="container page-shell d-flex align-items-center justify-content-center auth-shell py-4">
        <section className="card shadow-sm p-4" style={{ maxWidth: '460px', width: '100%' }}>
          <h1 className="h4 text-center mb-2">Create account</h1>
          <p className="text-muted text-center mb-4">Register with email and password.</p>

          {errorMsg && (
            <div className="alert alert-danger" role="alert">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <div className="form-text">Use at least 8 characters.</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Confirm password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <hr className="my-4" />
          <p className="text-center mb-0">
            Already registered? <a href="/login">Back to login</a>
          </p>
        </section>
      </main>
    </>
  );
}
```

---

### Step 7: Build the User Dashboard (Upload + Results)

This is the most important page — where users upload images and see gaze results.

Create `src/app/dashboard/page.tsx`:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

// Type for an upload result from the API
interface UploadResult {
  id: string;
  original_filename: string;
  status: string;
  failure_reason: string | null;
  storage_path: string;
  gaze_label: string | null;
  confidence: number | null;
  eye_box_x: number | null;
  eye_box_y: number | null;
  eye_box_w: number | null;
  eye_box_h: number | null;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [latestResult, setLatestResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Check if user is logged in when page loads
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.ok) {
          router.push('/login');
          return;
        }
        if (data.data.role === 'admin') {
          router.push('/admin');
          return;
        }
        setUser(data.data);
        loadUploads();
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, []);

  async function loadUploads() {
    const res = await fetch('/api/uploads');
    const data = await res.json();
    if (data.ok) {
      setUploads(data.data);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError('');
    setLatestResult(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Please select an image file.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('face_image', file);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setLatestResult(data.data);
        loadUploads(); // Refresh upload history
      } else {
        setUploadError(data.error?.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadError('Network error. Is the server running?');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Navbar title="User Dashboard" showLogout />

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">

            {/* Upload Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-body text-center">
                <h4 className="card-title">Upload Facial Image</h4>
                <p className="text-muted">Upload a clear photo of a face to detect gaze direction.</p>

                {uploadError && (
                  <div className="alert alert-danger">{uploadError}</div>
                )}

                <form onSubmit={handleUpload}>
                  <input
                    ref={fileInputRef}
                    className="form-control mb-3"
                    type="file"
                    accept="image/png, image/jpeg"
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-success px-5"
                    disabled={uploading}
                  >
                    {uploading ? 'Analyzing...' : 'Analyze Image'}
                  </button>
                </form>
              </div>
            </div>

            {/* Result Card — shows after upload */}
            {latestResult && (
              <div className="card shadow-sm border-primary mb-4">
                <div className="card-body">
                  <h5 className="card-title text-primary text-center">Analysis Results</h5>

                  {latestResult.status === 'processed' ? (
                    <>
                      {/* Image with eye bounding box overlay */}
                      <div
                        ref={imageContainerRef}
                        className="image-stage mb-3"
                        style={{ position: 'relative' }}
                      >
                        <img
                          src={latestResult.imagePath}
                          alt="Uploaded face"
                          style={{ width: '100%', height: 'auto' }}
                          onLoad={(e) => {
                            // Draw the eye bounding box after image loads
                            const img = e.target as HTMLImageElement;
                            const container = imageContainerRef.current;
                            if (!container || !latestResult.eyeBoundingBox) return;

                            // Remove old box if any
                            container.querySelectorAll('.eye-box').forEach(el => el.remove());

                            // Calculate scaling (image might be displayed smaller than original)
                            // We need the natural dimensions to compute the ratio
                            const scaleX = img.clientWidth / img.naturalWidth;
                            const scaleY = img.clientHeight / img.naturalHeight;

                            const box = latestResult.eyeBoundingBox;
                            const boxEl = document.createElement('div');
                            boxEl.className = 'eye-box';
                            boxEl.style.display = 'block';
                            boxEl.style.left = `${box.x * scaleX}px`;
                            boxEl.style.top = `${box.y * scaleY}px`;
                            boxEl.style.width = `${box.width * scaleX}px`;
                            boxEl.style.height = `${box.height * scaleY}px`;
                            container.appendChild(boxEl);
                          }}
                        />
                      </div>

                      {/* Metrics */}
                      <div className="metrics-grid">
                        <div className="metric-card text-center">
                          <div className="text-muted small">Gaze Direction</div>
                          <div className="metric-value text-primary">
                            {latestResult.gazeLabel}
                          </div>
                        </div>
                        <div className="metric-card text-center">
                          <div className="text-muted small">Confidence</div>
                          <div className={`metric-value ${latestResult.confidence < 0.6 ? 'low-confidence' : 'text-success'}`}>
                            {(latestResult.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {latestResult.confidence < 0.6 && (
                        <div className="alert alert-warning mt-3">
                          ⚠️ Low confidence result. Try a clearer, well-lit frontal photo.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="alert alert-danger text-center">
                      <strong>Analysis Failed</strong>
                      <p className="mb-0">{latestResult.failureReason || 'Unknown error'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload History */}
            {uploads.length > 0 && (
              <div className="card shadow-sm">
                <div className="card-header">Upload History</div>
                <div className="card-body">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Status</th>
                        <th>Gaze</th>
                        <th>Confidence</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploads.map((u) => (
                        <tr key={u.id}>
                          <td>{u.original_filename}</td>
                          <td>
                            <span className={`badge bg-${u.status === 'processed' ? 'success' : u.status === 'failed' ? 'danger' : 'warning'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td>{u.gaze_label || '—'}</td>
                          <td>{u.confidence ? `${(u.confidence * 100).toFixed(1)}%` : '—'}</td>
                          <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
```

**What's new here:**
- `useEffect` — runs code when the page loads (like checking if user is logged in)
- `useRef` — gives you a direct reference to a DOM element (the file input, the image container)
- `FormData` — the way to send files in JavaScript (like choosing a file and clicking upload)
- The eye bounding box is drawn using a `<div>` positioned absolutely on top of the image

---

### Step 8: Build the Admin Dashboard

Create `src/app/admin/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
}

interface AdminUpload {
  id: string;
  user_email: string;
  original_filename: string;
  status: string;
  gaze_label: string | null;
  confidence: number | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [uploads, setUploads] = useState<AdminUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.ok) {
          router.push('/login');
          return;
        }
        if (data.data.role !== 'admin') {
          router.push('/access-denied');
          return;
        }
        loadData();
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, []);

  async function loadData() {
    try {
      const [usersRes, uploadsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/uploads'),
      ]);
      const usersData = await usersRes.json();
      const uploadsData = await uploadsRes.json();

      if (usersData.ok) setUsers(usersData.data);
      if (uploadsData.ok) setUploads(uploadsData.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        loadData(); // Refresh the list
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar title="Admin Dashboard" variant="danger" showLogout />
        <div className="container text-center mt-5">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Admin Dashboard" variant="danger" showLogout />

      <div className="container">
        {/* User Management Section */}
        <h3 className="mb-3">User Management</h3>
        <div className="card shadow-sm mb-5">
          <div className="card-body">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Registered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`badge bg-${u.is_active ? 'success' : 'secondary'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => toggleUser(u.id)}
                          className={`btn btn-sm btn-${u.is_active ? 'danger' : 'success'}`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Usage Logs Section */}
        <h3 className="mb-3">System Usage Logs</h3>
        <div className="card shadow-sm">
          <div className="card-body">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>User</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Gaze Result</th>
                  <th>Confidence</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td>{u.user_email}</td>
                    <td>{u.original_filename}</td>
                    <td>
                      <span className={`badge bg-${u.status === 'processed' ? 'success' : 'danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{u.gaze_label || '—'}</td>
                    <td>{u.confidence ? `${(u.confidence * 100).toFixed(1)}%` : '—'}</td>
                    <td>{new Date(u.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

### Step 9: Build Error Pages

#### Access Denied — `src/app/access-denied/page.tsx`:

```tsx
import Navbar from '@/components/Navbar';

export default function AccessDeniedPage() {
  return (
    <>
      <Navbar title="Gaze Detection System" />
      <main className="container page-shell d-flex align-items-center justify-content-center auth-shell py-4">
        <section className="card shadow-sm p-4 text-center" style={{ maxWidth: '460px', width: '100%' }}>
          <h1 className="h4 mb-3">403: Access denied</h1>
          <p className="text-muted mb-4">You are authenticated but not authorized to access this page.</p>
          <a href="/login" className="btn btn-primary">Back to login</a>
        </section>
      </main>
    </>
  );
}
```

#### Session Expired — `src/app/session-expired/page.tsx`:

```tsx
import Navbar from '@/components/Navbar';

export default function SessionExpiredPage() {
  return (
    <>
      <Navbar title="Gaze Detection System" />
      <main className="container page-shell d-flex align-items-center justify-content-center auth-shell py-4">
        <section className="card shadow-sm p-4 text-center" style={{ maxWidth: '460px', width: '100%' }}>
          <h1 className="h4 mb-3">Session expired</h1>
          <p className="text-muted mb-4">Your login session is no longer valid. Please sign in again.</p>
          <a href="/login" className="btn btn-primary">Go to login</a>
        </section>
      </main>
    </>
  );
}
```

#### Home Page Redirect — `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login');
}
```

---

### Step 10: Test Your Frontend

```bash
# Make sure you're in the Gaze-Detection-System folder
npm run dev
```

Open `http://localhost:3000` in your browser. You should see:
- Login page at `/login`
- Register page at `/register`
- After login → Dashboard at `/dashboard` (user) or `/admin` (admin)

**Testing flow:**
1. Go to `/register` → create an account
2. Go to `/login` → login with that account
3. On dashboard → upload an image
4. See the gaze result with eye bounding box

> **Note**: The backend (Sd's work) needs to be running for the API calls to work. If Sd hasn't finished yet, you'll see "Network error" — that's expected. You can still build and check your UI layout.

---

## Key Concepts Quick Reference

| Concept | What it means |
|---------|--------------|
| `'use client'` | This component runs in the browser (needed for useState, onClick, etc.) |
| `useState` | Store data that can change (user input, API results) |
| `useEffect` | Run code when the page loads |
| `useRef` | Get a direct reference to an HTML element |
| `fetch()` | Make HTTP requests to the backend API |
| `async/await` | Wait for a network request to finish before continuing |
| `router.push()` | Navigate to another page programmatically |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page shows blank | Open browser DevTools (F12) → Console tab → check for errors |
| `Module not found: @/components/...` | Check your file paths and tsconfig.json paths setting |
| API returns "Not logged in" | Make sure you're on the same domain (localhost:3000) |
| CSS looks wrong | Make sure `globals.css` has the contents from `styles.css` |
| `npm run dev` crashes | Run `npm install` again, check Node.js version is 18+ |

---

## Checklist Before Day 7

- [ ] Login page works and redirects based on role
- [ ] Register page creates accounts
- [ ] Dashboard shows upload form and displays results with eye box overlay
- [ ] Admin page shows user list with activate/deactivate buttons
- [ ] Admin page shows upload history
- [ ] Error pages (access-denied, session-expired) display correctly
- [ ] Logout button works
- [ ] Pushed all changes to `features/frontend` branch
