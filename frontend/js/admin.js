import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/main.css";
import AdminApp from "../src/admin/App.jsx";
import { ensureMountNode } from "../src/common/mount";

const root = createRoot(ensureMountNode("gaze-admin-root"));
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(AdminApp)
  )
);
