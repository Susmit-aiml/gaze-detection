import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/main.css";
import RegisterApp from "../src/register/App.jsx";
import { ensureMountNode } from "../src/common/mount";

const root = createRoot(ensureMountNode("gaze-register-root"));
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(RegisterApp)
  )
);
