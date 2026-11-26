import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../src/index.css";
import Game from "../src/features/training-evaluation/Game";

// No auth, analytics, event RPCs or production writes in this isolated game fixture.
const root = document.getElementById("root");
if (root) createRoot(root).render(<BrowserRouter><Game userId="training-isolated-qa" onDone={() => { document.body.dataset.finished = "true"; }} /></BrowserRouter>);