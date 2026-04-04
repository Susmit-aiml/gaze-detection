import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/main.css";
import LoginApp from "../src/login/App.jsx";
import { ensureMountNode } from "../src/common/mount";

const root = createRoot(ensureMountNode("gaze-login-root"));
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(LoginApp)
  )
);
