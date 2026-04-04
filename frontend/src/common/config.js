export const API_BASE_URL = window.__GAZE_API_BASE_URL__ || "http://localhost:5000/api";

const configuredRoutes = window.__GAZE_ROUTES__ || {};

export const ROUTES = {
  login: configuredRoutes.login || "/login",
  register: configuredRoutes.register || "/register",
  dashboard: configuredRoutes.dashboard || "/dashboard",
  admin: configuredRoutes.admin || "/admin",
};

export const STORAGE_KEYS = {
  token: "token",
  role: "role",
  email: "userEmail",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];
export const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];
