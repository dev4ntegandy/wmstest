import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

// Create root
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Render the app
createRoot(rootElement).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
