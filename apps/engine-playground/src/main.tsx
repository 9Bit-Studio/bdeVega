import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { EnginePlayground } from "./engine-playground";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EnginePlayground />
  </StrictMode>,
);
