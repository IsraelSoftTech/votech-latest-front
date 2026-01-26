import React from "react";
import { useNavigate } from "react-router-dom";
import "./Unauthorized.styles.css";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <div className="unauth-page">
      <main className="unauth-main">
        <section className="unauth-card" role="alert" aria-live="polite">
          <div className="lock-wrap" aria-hidden="true">
            <svg
              className="lock"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
            >
              <g strokeWidth="2.5" stroke="#204080">
                <path
                  d="M22 28v-6c0-7 5-12 10-12s10 5 10 12v6"
                  strokeLinecap="round"
                />
                <rect
                  x="14"
                  y="28"
                  width="36"
                  height="28"
                  rx="7"
                  fill="rgba(32,64,128,0.08)"
                />
                <circle cx="32" cy="42" r="3.2" fill="#204080" />
                <path d="M32 45.5v5.5" strokeLinecap="round" />
              </g>
            </svg>
            <span className="sparkle s1">✦</span>
            <span className="sparkle s2">✨</span>
            <span className="sparkle s3">✦</span>
          </div>

          <h1>Unauthorized Request</h1>
          <p className="lead">
            You don’t have permission to view this page. Please log in or ask
            your system admins for access. (401/403)
          </p>

          <div className="actions">
            <a className="btn btn-primary" href="/login">
              Log in
            </a>

            <button className="btn btn-ghost" onClick={goBack}>
              ← Back
            </button>
          </div>
        </section>
      </main>

      <footer className="unauth-footer">
        &copy; {new Date().getFullYear()} Powered by Izzy Tech team
      </footer>
    </div>
  );
}
