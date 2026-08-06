import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/base.css";
import "./styles/chatscan.css";
import "./styles/app.css";

import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
