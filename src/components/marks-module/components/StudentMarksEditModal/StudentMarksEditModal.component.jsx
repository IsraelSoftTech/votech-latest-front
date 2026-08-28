import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaSave, FaExclamationTriangle } from "react-icons/fa";
import Modal from "../Modal/Modal.component";
import api from "../../utils/api";
import "./StudentMarksEditModal.styles.css";

// Admin3-only, single-student marks editor: every subject the student's
// class was assigned for one (academic year, term, sequence), in one
// table, editable and saved through the exact same Mark model/hooks as
// normal class-wide entry (promotion lock, year lock — a grant is still
// required to edit an archived year, nothing here bypasses that).
export function StudentMarksEditModal({ isOpen, onClose, student, onSaved }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);

  const [yearId, setYearId] = useState(null);
  const [termId, setTermId] = useState(null);
  const [sequenceId, setSequenceId] = useState(null);

  const [subjects, setSubjects] = useState(null); // null = not loaded yet
  const [edits, setEdits] = useState({}); // subject_id -> string input value
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSubjects(null);
    setEdits({});
    setLoadError(null);
    Promise.all([
      api.get("/academic-years"),
      api.get("/marks/terms"),
      api.get("/marks/sequences"),
    ])
      .then(([yearsRes, termsRes, seqRes]) => {
        const years = yearsRes.data?.data || [];
        setAcademicYears(years);
        setTerms(termsRes.data?.data || []);
        setSequences(seqRes.data?.data || []);
        const active = years.find((y) => y.status === "active");
        setYearId(active?.id || years[0]?.id || null);
        setTermId(null);
        setSequenceId(null);
      })
      .catch(() => toast.error("Failed to load academic years/terms/sequences."));
  }, [isOpen]);

  const filteredTerms = useMemo(
    () => terms.filter((t) => t.academic_year_id === yearId),
    [terms, yearId]
  );
  const filteredSequences = useMemo(
    () => sequences.filter((s) => s.term_id === termId),
    [sequences, termId]
  );

  useEffect(() => {
    if (!filteredTerms.length) return;
    if (!filteredTerms.some((t) => t.id === termId)) {
      setTermId(filteredTerms[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTerms]);

  useEffect(() => {
    if (!filteredSequences.length) return;
    if (!filteredSequences.some((s) => s.id === sequenceId)) {
      setSequenceId(filteredSequences[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSequences]);

  useEffect(() => {
    if (!isOpen || !student?.id || !yearId || !termId || !sequenceId) return;
    setLoadingSubjects(true);
    setLoadError(null);
    api
      .get(
        `/marks/student/${student.id}?academic_year_id=${yearId}&term_id=${termId}&sequence_id=${sequenceId}`
      )
      .then((res) => {
        setSubjects(res.data?.data?.subjects || []);
        setEdits({});
      })
      .catch((err) => {
        setSubjects([]);
        setLoadError(
          err?.response?.data?.message ||
            "Failed to load this student's subjects for that period."
        );
      })
      .finally(() => setLoadingSubjects(false));
  }, [isOpen, student?.id, yearId, termId, sequenceId]);

  const handleScoreChange = (subjectId, value) => {
    setEdits((prev) => ({ ...prev, [subjectId]: value }));
  };

  const getDisplayValue = (subject) => {
    if (subject.subject_id in edits) return edits[subject.subject_id];
    return subject.score != null ? String(subject.score) : "";
  };

  const hasChanges = useMemo(() => {
    if (!subjects) return false;
    return subjects.some((s) => {
      if (!(s.subject_id in edits)) return false;
      const original = s.score != null ? String(s.score) : "";
      return edits[s.subject_id] !== original;
    });
  }, [subjects, edits]);

  const handleSave = async () => {
    if (!subjects) return;
    const changed = subjects
      .filter((s) => s.subject_id in edits && edits[s.subject_id] !== (s.score != null ? String(s.score) : ""))
      .map((s) => ({ subject_id: s.subject_id, score: Number(edits[s.subject_id]) }));

    if (!changed.length) {
      toast.info("No changes to save.");
      return;
    }
    for (const c of changed) {
      if (Number.isNaN(c.score) || c.score < 0 || c.score > 20) {
        toast.error("Every score must be a number between 0 and 20.");
        return;
      }
    }

    setSaving(true);
    try {
      await api.post(`/marks/student/${student.id}/save`, {
        academic_year_id: yearId,
        term_id: termId,
        sequence_id: sequenceId,
        marks: changed,
      });
      toast.success(`Saved ${changed.length} mark(s).`);
      const res = await api.get(
        `/marks/student/${student.id}?academic_year_id=${yearId}&term_id=${termId}&sequence_id=${sequenceId}`
      );
      setSubjects(res.data?.data?.subjects || []);
      setEdits({});
      onSaved?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save marks."
      );
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = academicYears.map((y) => ({
    value: y.id,
    label: `${y.name}${y.status === "active" ? " (active)" : ""}`,
  }));
  const termOptions = filteredTerms.map((t) => ({ value: t.id, label: t.name }));
  const sequenceOptions = filteredSequences.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Marks — ${student?.full_name || student?.name || ""}`}
      size="large"
    >
      <div className="sme-container">
        <div className="sme-selectors">
          <div className="sme-selector">
            <label>Academic Year</label>
            <Select
              classNamePrefix="select"
              options={yearOptions}
              value={yearOptions.find((o) => o.value === yearId) || null}
              onChange={(opt) => setYearId(opt?.value || null)}
              isSearchable={false}
            />
          </div>
          <div className="sme-selector">
            <label>Term</label>
            <Select
              classNamePrefix="select"
              options={termOptions}
              value={termOptions.find((o) => o.value === termId) || null}
              onChange={(opt) => setTermId(opt?.value || null)}
              isSearchable={false}
              isDisabled={!termOptions.length}
            />
          </div>
          <div className="sme-selector">
            <label>Sequence</label>
            <Select
              classNamePrefix="select"
              options={sequenceOptions}
              value={sequenceOptions.find((o) => o.value === sequenceId) || null}
              onChange={(opt) => setSequenceId(opt?.value || null)}
              isSearchable={false}
              isDisabled={!sequenceOptions.length}
            />
          </div>
        </div>

        {loadingSubjects ? (
          <p className="sme-hint">Loading subjects…</p>
        ) : loadError ? (
          <div className="sme-error-banner">
            <FaExclamationTriangle />
            <span>{loadError}</span>
          </div>
        ) : !subjects || subjects.length === 0 ? (
          <p className="sme-hint">
            No subjects found for this student's class in that year — the
            class may not have any subject/teacher assignments for this
            academic year yet.
          </p>
        ) : (
          <table className="sme-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Category</th>
                <th>Coef.</th>
                <th>Score (/20)</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subject_id}>
                  <td>{s.name}</td>
                  <td className="sme-category">{s.category}</td>
                  <td>{s.coefficient}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      className="sme-score-input"
                      value={getDisplayValue(s)}
                      onChange={(e) => handleScoreChange(s.subject_id, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="sme-footer">
          <button
            type="button"
            className="sme-save-btn"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            <FaSave /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

StudentMarksEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  student: PropTypes.object,
  onSaved: PropTypes.func,
};

export default StudentMarksEditModal;
