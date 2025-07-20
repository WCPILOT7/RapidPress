import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Hide initial loader once React is ready
const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => loader.remove(), 300);
  }
};

createRoot(document.getElementById("root")!).render(<App />);

// Hide loader once React has rendered
setTimeout(hideInitialLoader, 50);
