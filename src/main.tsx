// FluidStack Compass - PWA entry
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(<App />);

// Register service worker only in production (not in iframes or preview hosts)
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
