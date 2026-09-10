import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import ReportCard from "../../components/ReportCard/ReportCard.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { Button } from "../../components/Button/Button.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import "./ReportCardPage.styles.css";
import api from "../../utils/api";
import { toast } from "react-toastify";

// Displayed with real components (data straight from /report-cards/single,
// the same fixed query bulk/session generation uses under the hood) so the
// admin gets a clean, navigable screen, not a PDF stuffed in an iframe.
// Download is a separate concern: it hits /report-cards/single-pdf-direct,
// which reuses the exact same pdfmake docDefinition builder as bulk, so
// the file you get is byte-for-byte the same layout either way.
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
  const [downloading, setDownloading] = useState(false);

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

  // A plain <a href> here used to fire the download with zero feedback —
  // PDF generation isn't instant (same pdfmake+qpdf pipeline as bulk
  // generation), so a click gave no sign anything was happening until the
  // browser's own download eventually landed. Fetching as a blob instead
  // (same pattern as ReportCardHomePage's handleDownloadTranscript) gives
  // a real loading state to show while it's in flight.
  const handleDownload = async () => {
    if (!isReady || downloading) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        studentId: student.id,
        academicYearId,
        departmentId,
        classId,
        ...(termId ? { term: termId } : {}),
      });
      const res = await api.get(
        `/report-cards/single-pdf-direct?${params.toString()}`,
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(student.full_name ?? student.name ?? "student").replace(/\s+/g, "_")}-report-card.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // responseType "blob" means an error body arrives as an opaque Blob,
      // not parsed JSON, same reasoning as handleDownloadTranscript.
      toast.error("Failed to generate the report card PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="report-page">
      <div className="vt-back-row">
        <Button variant="ghost" icon={<FaArrowLeft />} onClick={handleGoBack}>
          Go Back
        </Button>
      </div>
      <PageHeader
        title="Student Report Card"
        actions={
          isReady && (
            <Button
              variant="primary"
              icon={<FaDownload />}
              loading={downloading}
              onClick={handleDownload}
            >
              {downloading ? "Preparing..." : "Download PDF"}
            </Button>
          )
        }
      />

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
            <EmptyState title="No report card found" subtitle="Try going back and selecting the student again." />
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
