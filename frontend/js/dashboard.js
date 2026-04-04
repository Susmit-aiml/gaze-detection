import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/main.css";
import DashboardApp from "../src/dashboard/App.jsx";
import { ensureMountNode } from "../src/common/mount";

const root = createRoot(ensureMountNode("gaze-dashboard-root"));
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(DashboardApp)
  )
);
