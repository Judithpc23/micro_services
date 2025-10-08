import React from "react";
import ReactDOM from "react-dom/client";
import "@/styles/global.css"; // Tailwind primero
import Home from "./pages/Home";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>
);
