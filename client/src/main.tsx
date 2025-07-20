import { createRoot } from "react-dom/client";
import App from "./App";
// Temporarily remove CSS import to test
// import "./index.css";

console.log('main.tsx loading...');
const root = document.getElementById("root");
console.log('Root element:', root);

if (root) {
  createRoot(root).render(<App />);
  console.log('React app rendered');
} else {
  console.error('Root element not found!');
}
