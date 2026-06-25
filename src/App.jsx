import { useState } from "react";
import ThreeCanvas, { datasets, okabeIto } from "./ThreeCanvas.jsx";
import "./index.css";

const GitHubIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="14"
    height="14"
    aria-hidden="true"
  >
    <path
      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303
      3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
      0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.083-.729.083-.729
      1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305
      3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93
      0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176
      0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399
      3-.405 1.02.006 2.04.138 3 .405 2.28-1.552
      3.285-1.23 3.285-1.23.645 1.653.24 2.873.12
      3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805
      5.625-5.475 5.92.42.36.81 1.096.81 2.22
      0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57
      C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="14"
    height="14"
    aria-hidden="true"
  >
    <path
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853
      0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9
      1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267
      5.455v6.286zM5.337 7.433a2.062 2.062 0 0
      1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782
      13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0
      1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24
      23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
    />
  </svg>
);

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
          <span>Drag to orbit · Scroll to zoom</span>
          <div className="social-links">
            <a
              href="https://www.linkedin.com/in/jeremiahjking/"
              className="social-btn"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedInIcon />
              LinkedIn
            </a>
            <a
              href="https://github.com/unguisdraconis"
              className="social-btn"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>
        </footer>
      </aside>

      {/* ── Canvas ──────────────────────────────────────────── */}
      <main className="canvas-area">
        <ThreeCanvas selectedIndex={selected} onStats={setStats} />
      </main>
    </div>
  );
}
