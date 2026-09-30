import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MGConnect from "./MGConnect";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MGConnect />
  </StrictMode>,
);
