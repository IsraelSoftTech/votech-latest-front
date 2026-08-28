import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaDownload } from "react-icons/fa";
import Modal from "../Modal/Modal.component";
import api from "../../utils/api";
import "./ReportCardDownloadModal.styles.css";

const TERM_OPTIONS = [
  { value: "term1", label: "First Term" },
  { value: "term2", label: "Second Term" },
  { value: "term3", label: "Third Term" },
];

// Lets the admin pick exactly which year + term of a student's report
// card to download, instead of always silently downloading the current
// year's third-term card. Any year the student has real data for is
// selectable — the backend resolves which class they were in that year
// on its own (report-cards-pdf endpoint), so this never needs to know
// classId/departmentId itself.
export function ReportCardDownloadModal({ isOpen, onClose, student }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [yearId, setYearId] = useState(null);
  const [term, setTerm] = useState("term3");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api
      .get("/academic-years")
      .then((res) => {
        const years = res.data?.data || [];
        setAcademicYears(years);
        const preferred =
          years.find((y) => y.id === student?.academic_year_id) ||
          years.find((y) => y.status === "active") ||
          years[0];
        setYearId(preferred?.id || null);
        setTerm("term3");
      })
      .catch(() => toast.error("Failed to load academic years."));
  }, [isOpen, student?.academic_year_id]);

  const handleDownload = async () => {
    if (!yearId || !student?.id) return;
    setDownloading(true);
    try {
      const res = await api.get(`/students/${student.id}/report-card-pdf`, {
        params: { academic_year_id: yearId, term },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(student.full_name || "student").replace(/\s+/g, "_")}-report-card.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      // responseType "blob" means an error body arrives as an opaque
      // Blob, not parsed JSON — no usable err.response.data.message here.
      toast.error(
        "Failed to generate this report card. This student may have no marks for that year/term."
      );
    } finally {
      setDownloading(false);
    }
  };

  const yearOptions = academicYears.map((y) => ({
    value: y.id,
    label: `${y.name}${y.status === "active" ? " (active)" : ""}`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download Report Card">
      <div className="rcdm-container">
        <div className="rcdm-selector">
          <label>Academic Year</label>
          <Select
            classNamePrefix="select"
            options={yearOptions}
            value={yearOptions.find((o) => o.value === yearId) || null}
            onChange={(opt) => setYearId(opt?.value || null)}
            isSearchable={false}
          />
        </div>
        <div className="rcdm-selector">
          <label>Term</label>
          <Select
            classNamePrefix="select"
            options={TERM_OPTIONS}
            value={TERM_OPTIONS.find((o) => o.value === term)}
            onChange={(opt) => setTerm(opt?.value || "term3")}
            isSearchable={false}
          />
        </div>
        <button
          type="button"
          className="rcdm-download-btn"
          onClick={handleDownload}
          disabled={downloading || !yearId}
        >
          <FaDownload /> {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </Modal>
  );
}

ReportCardDownloadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  student: PropTypes.object,
};

export default ReportCardDownloadModal;
