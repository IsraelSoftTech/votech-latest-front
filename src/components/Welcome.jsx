import React from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";
import logo from "../assets/logo.png";

const FEATURES = [
  "Student Database",
  "Fee Payment",
  "Salary Payment",
  "Timetable Management",
  "Marks Management",
  "Report Cards",
  "Attendance",
  "ID Cards",
];

function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-root">
      <header className="welcome-header">
        <div className="welcome-header-inner">
          <div className="welcome-brand">
            <img src={logo} alt="VOTECH Logo" className="welcome-brand-logo" />
            <div className="welcome-brand-text">
              <span className="welcome-brand-main">VOTECH S7</span>
              <span className="welcome-brand-sub">ACADEMY</span>
            </div>
          </div>
          <button
            type="button"
            className="welcome-cta-btn"
            onClick={() => navigate("/signin")}
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="welcome-hero">
        <div className="welcome-hero-bg" aria-hidden="true" />
        <div className="welcome-hero-overlay" aria-hidden="true" />

        <div className="welcome-hero-content">
          <div className="welcome-hero-copy">
            <h1 className="welcome-hero-title">
              <span>School</span>
              <span>Management</span>
              <span>System</span>
            </h1>
            <p className="welcome-hero-sub">
              An efficient system for managing student and teacher data
            </p>
          </div>

          <div className="welcome-features-panel">
            <h2 className="welcome-features-title">Key Features</h2>
            <div className="welcome-features-grid">
              {FEATURES.map((title) => (
                <div key={title} className="welcome-feature-chip">
                  <span className="welcome-feature-dot" aria-hidden="true" />
                  {title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="welcome-footer">
        <span>
          © 2027 Votech Academy — Powered by Izzy Tech Team
          (+237 675 644 383)
        </span>
      </footer>
    </div>
  );
}

export default Welcome;
