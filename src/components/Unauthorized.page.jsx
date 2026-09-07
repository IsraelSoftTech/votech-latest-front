import React from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaArrowLeft } from "react-icons/fa";
import { Button } from "./marks-module/components/Button/Button.component";
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
          <div className="unauth-icon" aria-hidden="true">
            <FaLock />
          </div>

          <h1>Unauthorized Request</h1>
          <p className="unauth-lead">
            You don't have permission to view this page. Please log in or ask
            your system admin for access.
          </p>

          <div className="unauth-actions">
            <Button as="a" href="/login" variant="primary">
              Log In
            </Button>
            <Button variant="ghost" icon={<FaArrowLeft />} onClick={goBack}>
              Back
            </Button>
          </div>
        </section>
      </main>

      <footer className="unauth-footer">
        &copy; {new Date().getFullYear()} Powered by Izzy Tech team
      </footer>
    </div>
  );
}
