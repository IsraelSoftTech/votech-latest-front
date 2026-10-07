import React, { useEffect, useState } from "react";
import { FaArchive, FaFileDownload, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import Modal from "../Modal/Modal.component";
import { Button } from "../Button/Button.component";
import api, { headers } from "../../utils/api";
import "./ArchivedClassListModal.styles.css";

// Admin3 only: download a class list as it was in a PAST academic year
// (GET /students/class/:id/archived-list-pdf, restrictTo("Admin3")), without
// Admin1 switching the active year. Only archived years are offered, so the
// current year can't be picked here; it has the normal "Class List" button.
// The PDF itself carries an "archived" banner and footer on every page.
export function ArchivedClassListModal({ isOpen, onClose, classItem, academicYears = [] }) {
  const pastYears = academicYears
    .filter((y) => y.status !== "active")
    .sort((a, b) => String(b.name).localeCompare(String(a.name)));
  const [yearId, setYearId] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setYearId(pastYears[0]?.id ?? null);
    setDownloading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleDownload = async () => {
    if (!classItem?.id || !yearId || downloading) return;
    setDownloading(true);
    try {
      const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
      const res = await fetch(
        `${base}/students/class/${classItem.id}/archived-list-pdf?academic_year_id=${yearId}&disposition=attachment`,
        { headers: headers() }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to generate the past year's class list.");
      }
      const blob = await res.blob();
      const yearName = pastYears.find((y) => y.id === yearId)?.name || "past_year";
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Class_List_${String(classItem.name || "class").replace(/\s+/g, "_")}_${String(yearName).replace(/[\s/]+/g, "_")}_ARCHIVED.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to download the past year's class list.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !downloading && onClose()} title="Past year class list" icon={<FaArchive />}>
      <div className="acl-body">
        <p className="acl-intro">
          Download <strong>{classItem?.name}</strong> as it was in a past academic year. The list is rebuilt from
          that year's records (marks, promotions, exits), so it includes students who have since been promoted,
          graduated or left. Every page is marked as archived.
        </p>

        {pastYears.length === 0 ? (
          <p className="acl-empty">There are no past academic years yet.</p>
        ) : (
          <div className="acl-years" role="radiogroup" aria-label="Academic year">
            {pastYears.map((y) => (
              <label key={y.id} className={`acl-year${yearId === y.id ? " acl-year--on" : ""}`}>
                <input
                  type="radio"
                  name="acl-year"
                  checked={yearId === y.id}
                  onChange={() => setYearId(y.id)}
                  disabled={downloading}
                />
                <span>{y.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="acl-actions">
          <Button variant="secondary" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button
            icon={downloading ? <FaSpinner className="students-spin" /> : <FaFileDownload />}
            onClick={handleDownload}
            disabled={!yearId || downloading}
          >
            {downloading ? "Generating…" : "Download"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
