import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply theme class synchronously before first paint to avoid FOUC.
// Duplicates the minimal localStorage read that loadSettings() does.
try {
  const raw = localStorage.getItem("kanji-graph:settings:v3");
  if (raw && (JSON.parse(raw) as { theme?: string }).theme === "light") {
    document.documentElement.classList.add("light");
  }
} catch {
  // ignore — defaults to dark
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
