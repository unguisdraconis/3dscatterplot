import { useState } from "react";
import ThreeCanvas, { datasets, okabeIto } from "./ThreeCanvas.jsx";
import "./index.css";

export default function App() {
  const [selected, setSelected] = useState(0);
  const [stats, setStats] = useState("");

  return (
    <div className="dashboard">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <h1 className="sidebar-title">3D Dataset Explorer</h1>
        <p className="sidebar-sub">
          Select a dataset to view it on the cube face.
        </p>

        <nav className="dataset-list">
          {datasets.map((ds, i) => (
            <button
              key={ds.name}
              className={`dataset-btn ${i === selected ? "active" : ""}`}
              style={{ "--accent": okabeIto[i % okabeIto.length] }}
              onClick={() => setSelected(i)}
            >
              <span
                className="dot"
                style={{ background: okabeIto[i % okabeIto.length] }}
              />
              {ds.name}
            </button>
          ))}
        </nav>

        {/* Regression stats */}
        {stats && (
          <div className="stats-card">
            <h2 className="stats-title">Regression</h2>
            <pre className="stats-body">{stats}</pre>
          </div>
        )}

        <footer className="sidebar-footer">
          Drag to orbit · Scroll to zoom
        </footer>
      </aside>

      {/* ── Canvas ──────────────────────────────────────────── */}
      <main className="canvas-area">
        <ThreeCanvas selectedIndex={selected} onStats={setStats} />
      </main>
    </div>
  );
}
