import { useState } from "react";
import { API_BASE_URL, ROUTES } from "../common/config";
import { redirectTo } from "../common/auth";

export default function RegisterApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message || "Registration failed. Please try again.");
        return;
      }

      setSuccess("Registration successful. Redirecting to login...");
      window.setTimeout(() => redirectTo(ROUTES.login), 1200);
    } catch (submitError) {
      setError("Unable to reach backend. Check if API is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell app-auth">
      <span className="scene-orb orb-a" aria-hidden="true" />
      <span className="scene-orb orb-b" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar-content">
          <div className="brand-block">
            <h1 className="brand-title">Gaze Detection System</h1>
            <p className="brand-subtitle">Neural vision access platform</p>
          </div>
        </div>
      </header>

      <main className="page-center">
        <section className="auth-card" aria-label="Registration form">
          <p className="kicker">Onboarding</p>
          <h2 className="card-title">Create account</h2>
          <p className="card-subtitle">
            Create your workspace and start uploading gaze samples in seconds.
          </p>

          <form id="registerForm" className="stack" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="hint">Use at least 8 characters.</p>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <p id="errorMessage" className="message error" role="alert">
              {error}
            </p>
            <p id="successMessage" className="message success" role="status">
              {success}
            </p>

            <button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <p className="auth-foot">
            Already registered? <a href={ROUTES.login}>Back to login</a>
          </p>
        </section>
      </main>
    </div>
  );
}
