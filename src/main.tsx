import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppWorker } from './lib/registerAppWorker';

registerAppWorker();

createRoot(document.getElementById("root")!).render(<App />);
