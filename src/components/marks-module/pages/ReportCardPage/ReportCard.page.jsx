import React from "react";
import { FaArrowLeft, FaPrint } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import ReportCard from "../../components/ReportCard/ReportCard.component";
import "./ReportCardPage.styles.css";

export const ReportCardPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="report-page">
      {/* Header */}
      <header className="report-page-header">
        <h2>Student Report Card</h2>
        <div className="report-actions">
          <button className="back-btn" onClick={handleGoBack}>
            <FaArrowLeft /> <span>Go Back</span>
          </button>

          <button
            className="btn btn-create"
            onClick={() => {
              window.print();
            }}
          >
            <FaPrint /> <span>Print</span>
          </button>
        </div>
      </header>

      {/* Report Card */}
      <div className="report-card-wrapper">
        <div className="report-card-content">
          <ReportCard />
        </div>
      </div>

      {/* Footer */}
      <footer className="report-page-footer">
        <p>
          Tip: You can print or save this report card as PDF for records. Ensure
          the printed version is signed by the authorized school staff.
        </p>
      </footer>
    </div>
  );
};
