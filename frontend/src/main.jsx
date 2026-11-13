import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installFetchBridge } from "@/lib/api-base";
import App from "@/App";
import "@/globals.css";

installFetchBridge();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
