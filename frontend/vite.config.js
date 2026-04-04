import { defineConfig } from "vite";
import { resolve } from "node:path";

function htmlShell(title, entryModule) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <script type="module" src="${entryModule}"></script>
  </body>
</html>`;
}

function normalizePath(urlPath) {
  if (!urlPath) {
    return "/";
  }

  const cleanPath = urlPath.split("?")[0].split("#")[0];
  if (cleanPath === "/") {
    return "/";
  }

  return cleanPath.endsWith("/") ? cleanPath.slice(0, -1) : cleanPath;
}

function createRouteMiddleware(mode) {
  const isPreview = mode === "preview";

  const routeConfig = {
    "/": { title: "Login | Gaze Detection", page: "login" },
    "/login": { title: "Login | Gaze Detection", page: "login" },
    "/register": { title: "Register | Gaze Detection", page: "register" },
    "/dashboard": { title: "Dashboard | Gaze Detection", page: "dashboard" },
    "/admin": { title: "Admin | Gaze Detection", page: "admin" },
    "/login.html": { title: "Login | Gaze Detection", page: "login" },
    "/register.html": { title: "Register | Gaze Detection", page: "register" },
    "/dashboard.html": { title: "Dashboard | Gaze Detection", page: "dashboard" },
    "/admin.html": { title: "Admin | Gaze Detection", page: "admin" },
  };

  return function routeMiddleware(req, res, next) {
    const currentPath = normalizePath(req.url || "/");
    const matched = routeConfig[currentPath];

    if (!matched) {
      next();
      return;
    }

    const entryModule = isPreview
      ? `/assets/${matched.page}.js`
      : `/js/${matched.page}.js`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(htmlShell(matched.title, entryModule));
  };
}

function noHtmlFilesPlugin() {
  return {
    name: "no-html-files-routes",
    configureServer(server) {
      server.middlewares.use(createRouteMiddleware("dev"));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createRouteMiddleware("preview"));
    },
  };
}

export default defineConfig({
  plugins: [noHtmlFilesPlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, "js/login.js"),
        register: resolve(__dirname, "js/register.js"),
        dashboard: resolve(__dirname, "js/dashboard.js"),
        admin: resolve(__dirname, "js/admin.js"),
      },
      output: {
        entryFileNames: "assets/[name].js",
      },
    },
  },
});
