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

  // console.log("data", location.state);
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [academicBands, setAcademicBands] = useState([]);

  // console.log("Student Data", student);
  // console.log("Term", term);

  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    if (!student) return;

    const fetchReportCard = async () => {
      setLoading(true);
      try {
        // if you added optional academicYearId in your controller
        const res = await api.get(
          `/report-cards/single?studentId=${student.id}&academicYearId=${academic_year_id}`
        );
        res.data.data.reportCard.student.term = term.name.toUpperCase();
        res.data.data.reportCard.student.term;
        let parents = [];

        if (student?.father_name) parents.push(student.father_name);
        if (student?.mother_name) parents.push(student.mother_name);

        res.data.data.reportCard.administration.parents =
          parents.length > 0 ? parents.join(", ") : "N/A";

        res.data.data.reportCard.administration.parents = parents.join(", ");
        const academicBandsRes = await api.get(
          `/academic-bands?academic_year_id=${academic_year_id}&class_id=${studentClass.id}`
        );
        setAcademicBands(academicBandsRes.data.data || []);
        setReportCard(res.data.data.reportCard || []);
        console.log(academicBands);
      } catch (err) {
        toast.error("Failed to load student transcript");
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
            <ReportCard data={reportCard} grading={academicBands} />
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
