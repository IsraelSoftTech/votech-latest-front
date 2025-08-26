import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaPrint } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import ReportCard from "../../components/ReportCard/ReportCard.component";
import "./ReportCardPage.styles.css";
import api from "../../utils/api";
import { toast } from "react-toastify";

export const ReportCardPage = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const { student, academic_year_id, term, department, studentClass } =
    location.state || {};

  console.log("data", location.state);
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(false);

  // console.log("Term", term);

  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    if (!student) return;

    const fetchReportCard = async () => {
      setLoading(true);
      try {
        // if you added optional academicYearId in your controller Missing parameters: studentId=36, academicYearId=23, departmentId=undefined, classId=undefined
        const res = await api.get(
          `/report-cards/single?studentId=${student.id}&academicYearId=${academic_year_id}&departmentId=${department.id}&classId=${studentClass.id}`
        );
        res.data.data.reportCard.student.term = term.name.toUpperCase();
        setReportCard(res.data.data.reportCard);
        console.log(res.data.data.reportCard);
      } catch (err) {
        toast.error("Failed to load student report card");
        console.error("Failed to fetch report card", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportCard();
  }, [student, academic_year_id]);

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
          {loading ? (
            <div
              style={{
                padding: "20px",
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Skeleton
                height={1000} // A4 approx height
                width={800} // A4 approx width
                style={{ borderRadius: "8px" }}
              />
            </div>
          ) : !reportCard ? (
            <p>No report card found</p>
          ) : (
            <ReportCard data={reportCard} />
          )}
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
