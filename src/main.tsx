import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import "./dependencies.ts";

createRoot(document.body).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
