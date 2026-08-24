import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import ReportCard from "../../components/ReportCard/ReportCard.component";
import "./ReportCardPage.styles.css";
import api from "../../utils/api";
import { toast } from "react-toastify";

// Displayed with real components (data straight from /report-cards/single,
// the same fixed query bulk/session generation uses under the hood) so the
// admin gets a clean, navigable screen, not a PDF stuffed in an iframe.
// Download is a separate concern: it hits /report-cards/single-pdf-direct,
// which reuses the exact same pdfmake docDefinition builder as bulk, so
// the file you get is byte-for-byte the same layout either way.
function getBackendUrl(path, params) {
  const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token) params.set("token", token);
  return `${base}/${path}?${params.toString()}`;
}

export const ReportCardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    student,
    academicYear,
    department,
    class: studentClass,
    term,
    ids = {},
    academic_year_id,
    department_id,
    class_id,
  } = location.state || {};

  const academicYearId =
    academicYear?.id ?? ids.academic_year_id ?? academic_year_id ?? null;
  const departmentId =
    department?.id ?? ids.department_id ?? department_id ?? null;
  const classId = studentClass?.id ?? ids.class_id ?? class_id ?? null;
  const termId = term?.id ?? ids.term_id ?? null;

  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [academicBands, setAcademicBands] = useState([]);

  const handleGoBack = () => navigate(-1);

  useEffect(() => {
    if (!student) return;

    const fetchReportCard = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/report-cards/single?studentId=${student.id}&academicYearId=${academicYearId}&classId=${classId}&departmentId=${departmentId}`
        );
        const rc = res.data.data.reportCard;
        if (term?.name) rc.student.term = term.name.toUpperCase();

        const parents = [student?.father_name, student?.mother_name].filter(Boolean);
        rc.administration.parents = parents.length ? parents.join(", ") : "N/A";

        const academicBandsRes = await api.get(
          `/academic-bands?academic_year_id=${academicYearId}&class_id=${classId}`
        );
        setAcademicBands(academicBandsRes.data.data || []);
        setReportCard(rc);
      } catch (err) {
        toast.error(
          err.response?.data?.details ||
            err.response?.data?.message ||
            "Failed to load student Report Card"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReportCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, academicYearId]);

  const isReady = Boolean(student?.id && academicYearId && departmentId && classId);
  const downloadUrl = isReady
    ? getBackendUrl(
        "report-cards/single-pdf-direct",
        new URLSearchParams({
          studentId: student.id,
          academicYearId,
          departmentId,
          classId,
          ...(termId ? { term: termId } : {}),
          disposition: "attachment",
        })
      )
    : null;

  return (
    <div className="report-page">
      <header className="report-page-header">
        <h2>Student Report Card</h2>
        <div className="report-page-header-back-n-print-btn">
          <button className="back-btn" onClick={handleGoBack}>
            <FaArrowLeft /> <span>Go Back</span>
          </button>
          <div className="report-actions">
            {downloadUrl && (
              <a className="btn btn-create" href={downloadUrl}>
                <FaDownload /> <span>Download PDF</span>
              </a>
            )}
          </div>
        </div>
      </header>

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
              <Skeleton height={1000} width={800} style={{ borderRadius: "8px" }} />
            </div>
          ) : !reportCard ? (
            <p>No report card found</p>
          ) : (
            <ReportCard data={reportCard} grading={academicBands} />
          )}
        </div>
      </div>

      <footer className="report-page-footer">
        <p>
          This is a preview for review — use Download PDF for the official,
          signable copy (identical layout to bulk-printed report cards).
        </p>
      </footer>
    </div>
  );
};

export default ReportCardPage;
