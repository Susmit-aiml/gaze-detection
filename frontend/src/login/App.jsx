import { useState } from "react";
import { API_BASE_URL, ROUTES } from "../common/config";
import { redirectByRole, setSession } from "../common/auth";

export default function LoginApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message || "Login failed. Please try again.");
        return;
      }

      setSession({
        token: payload.token || "",
        role: payload.role || "user",
        email: payload.user?.email || normalizedEmail,
      });

      redirectByRole(payload.role || "user");
    } catch (submitError) {
      if (typeof window !== "undefined" && window.location.protocol === "https:" && API_BASE_URL.startsWith("http://")) {
        setError("Cannot connect to HTTP backend from HTTPS. Please set your live Render backend URL.");
      } else {
        setError("Unable to reach backend. Check your backend server URL.");
      }
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
        <section className="auth-card" aria-label="Sign in form">
          <p className="kicker">Secure Access</p>
          <h2 className="card-title">Sign in</h2>
          <p className="card-subtitle">
            Jump back into analysis quickly with your account credentials.
          </p>

          <form id="loginForm" className="stack" onSubmit={onSubmit} noValidate>
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
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div id="errorMessage" className="message error" role="alert" style={{ textAlign: "center" }}>
                <div>{error}</div>
                <button
                  type="button"
                  style={{
                    display: "inline-block",
                    marginTop: "8px",
                    background: "#0068cc",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                  onClick={() => {
                    const current = localStorage.getItem("GAZE_API_BASE_URL") || "";
                    const input = window.prompt(
                      "Enter your live Render backend URL (e.g. https://your-backend.onrender.com/api):",
                      current || "https://"
                    );
                    if (input !== null && input.trim()) {
                      let clean = input.trim().replace(/\/+$/, "");
                      if (!clean.endsWith("/api")) {
                        clean = `${clean}/api`;
                      }
                      localStorage.setItem("GAZE_API_BASE_URL", clean);
                      window.location.reload();
                    }
                  }}
                >
                  ⚙️ Configure Backend URL
                </button>
              </div>
            ) : null}

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="auth-foot">
            New here? <a href={ROUTES.register}>Create account</a>
          </p>
        </section>
      </main>
    </div>
  );
}
