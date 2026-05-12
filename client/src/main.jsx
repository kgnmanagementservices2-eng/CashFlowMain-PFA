import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { GlobalStateProvider } from "./context/GlobalStateContext.jsx";
import "./index.css";

// This is the main entry point for your React application.
// We wrap the entire App in our Context providers so that
// authentication and global state (like market/store)
// are available to all components.

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <GlobalStateProvider>
        <App />
      </GlobalStateProvider>
    </AuthProvider>
  </React.StrictMode>
);
