import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";   // 👈 importante la extensión .tsx
import "./index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// PWA: el service worker (public/sw.js) solo guarda los archivos estáticos del build; solo en producción.
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
