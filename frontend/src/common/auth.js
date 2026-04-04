import { ROUTES, STORAGE_KEYS } from "./config";

export function getSession() {
  return {
    token: localStorage.getItem(STORAGE_KEYS.token) || "",
    role: localStorage.getItem(STORAGE_KEYS.role) || "",
    email: localStorage.getItem(STORAGE_KEYS.email) || "",
  };
}

export function setSession({ token, role, email }) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.token, token);
  }

  if (role) {
    localStorage.setItem(STORAGE_KEYS.role, role);
  }

  if (email) {
    localStorage.setItem(STORAGE_KEYS.email, email);
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.role);
  localStorage.removeItem(STORAGE_KEYS.email);
}

export function redirectTo(path) {
  window.location.href = path;
}

export function redirectByRole(role) {
  if (role === "admin") {
    redirectTo(ROUTES.admin);
    return;
  }

  redirectTo(ROUTES.dashboard);
}
