export const API_BASE_URL =
  window.__GAZE_API_BASE_URL__ ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const isStaticHosting =
  typeof window !== "undefined" &&
  (window.location.pathname.endsWith(".html") ||
    window.location.hostname.endsWith("github.io"));

const configuredRoutes = window.__GAZE_ROUTES__ || {};

export const ROUTES = {
  login: configuredRoutes.login || (isStaticHosting ? "./login.html" : "/login"),
  register: configuredRoutes.register || (isStaticHosting ? "./register.html" : "/register"),
  dashboard: configuredRoutes.dashboard || (isStaticHosting ? "./dashboard.html" : "/dashboard"),
  admin: configuredRoutes.admin || (isStaticHosting ? "./admin.html" : "/admin"),
};

export const STORAGE_KEYS = {
  token: "token",
  role: "role",
  email: "userEmail",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];
export const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];
