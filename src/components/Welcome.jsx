import React from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";
import logo from "../assets/logo.png";
// Background image is applied via CSS; no direct import needed

function Welcome() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signin");
  };

  return (
    <div className="welcome-root">
      <header className="welcome-header">
        <div className="nav-left">
          <img src={logo} alt="Votech Logo" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-main">VOTECH S7</span>
            <span className="brand-sub">ACADEMY</span>
          </div>
        </div>

        <nav className="nav-right">
          <button className="nav-link nav-login-btn active" onClick={handleGetStarted}>Login</button>
        </nav>
      </header>

      <main className="welcome-hero">
        <section className="hero-left">
          <h1 className="hero-title">
            <span>School</span>
            <span>Management</span>
            <span>System</span>
          </h1>
          <p className="hero-sub">
            An efficient system for managing student and teacher data
          </p>
          
        </section>
      </main>

      <section id="features" className="features">
        <h2 className="features-title">Key Features</h2>
        <div className="features-grid">
          {[
            { title: "Student Database", desc: "Easy and secure management of school fee" },
            { title: "Fee Payment", desc: "Maintain a comprehensive student database" },
            { title: "Salary Payment", desc: "Efficient management of teacher information" },
            { title: "Timetable Management", desc: "Empolyed eallbwance" },
            { title: "Marks Management", desc: "Deska management" },
            { title: "Report Cards", desc: "Marks management" },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon" />
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="welcome-footer">
        <span>
          © {new Date().getFullYear()} Votech Academy — Powered by Izzy Tech Team (+237 675 644 383)
        </span>
      </footer>
    </div>
  );
}

export default Welcome;