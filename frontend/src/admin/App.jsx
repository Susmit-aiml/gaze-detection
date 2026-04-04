import { useEffect, useState } from "react";
import { API_BASE_URL, ROUTES } from "../common/config";
import { clearSession, getSession, redirectTo } from "../common/auth";

export default function AdminApp() {
  const [error, setError] = useState("");
  const [data, setData] = useState("Loading...");

  useEffect(() => {
    async function loadData() {
      const { token, role } = getSession();

      if (!token || role !== "admin") {
        redirectTo(ROUTES.login);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/protected/admin`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(payload.message || "Unable to access admin route.");

          if (response.status === 401 || response.status === 403) {
            clearSession();
            redirectTo(ROUTES.login);
          }
          return;
        }

        setData(JSON.stringify(payload, null, 2));
      } catch {
        setError("Failed to contact backend.");
      }
    }

    loadData();
  }, []);

  function onLogout() {
    clearSession();
    redirectTo(ROUTES.login);
  }

  return (
    <div className="app-shell app-admin">
      <span className="scene-orb orb-a" aria-hidden="true" />
      <span className="scene-orb orb-b" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar-content">
          <div className="brand-block">
            <h1 className="brand-title">Admin Dashboard</h1>
            <p className="brand-subtitle">Protected access and diagnostics</p>
          </div>
          <button id="logoutBtn" className="btn-ghost" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-wrap">
        <section className="panel">
          <h2 className="panel-header">Admin Protected Data</h2>
          <div className="panel-body">
            <p id="errorMessage" className="message error" role="alert">
              {error}
            </p>
            <pre id="adminData" className="admin-data">
              {data}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
