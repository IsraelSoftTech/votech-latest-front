import React, { useEffect, useState } from "react";
import Select from "react-select";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useYearScope } from "../../../../hooks/useYearScope";
import { YearScopeBanner } from "../YearScopeBanner/YearScopeBanner.component";
import "./ClassMasterHistoryModal.styles.css";

// Year-scoped class master editor. classes.class_master_id (edited from
// the general class create/edit form) is only ever "who's the master
// right now" — this reads/writes class_master_assignments directly, the
// table every report card and transcript actually attributes years to.
// Editing here for an archived year never touches "who's current".
export default function ClassMasterHistoryModal({ classItem, teachersOptions }) {
  const yearScope = useYearScope();
  const { selectedYearId, isEditable } = yearScope;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHistory = async () => {
    if (!classItem?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classItem.id}/class-master`);
      setHistory(res.data?.data || []);
    } catch (err) {
      toast.error("Failed to load class master history.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classItem?.id]);

  useEffect(() => {
    const existing = history.find((h) => h.academic_year_id === selectedYearId);
    const teacherId = existing?.teacher_id || existing?.teacher?.id || null;
    setSelectedTeacher(
      teachersOptions.find((t) => t.value === teacherId) || null
    );
  }, [selectedYearId, history, teachersOptions]);

  const handleSave = async () => {
    if (!selectedYearId) return;
    if (!selectedTeacher) {
      toast.error("Select a teacher first.");
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post(`/classes/${classItem.id}/class-master`, {
        academic_year_id: selectedYearId,
        teacher_id: selectedTeacher.value,
      });
      toast.success("Class master saved for this year.");
      await fetchHistory();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.details ||
          "Failed to save class master."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.academic_year?.start_date || 0) - new Date(b.academic_year?.start_date || 0)
  );

  return (
    <div className="class-master-history">
      <YearScopeBanner yearScope={yearScope} />

      <div className="class-master-history-editor">
        <label className="class-master-history-label">
          Class Master for {yearScope.selectedYear?.name || "this year"}
        </label>
        <div className="class-master-history-row">
          <Select
            isDisabled={!isEditable}
            options={teachersOptions}
            value={selectedTeacher}
            onChange={setSelectedTeacher}
            placeholder="Select a teacher..."
            className="class-master-history-select"
            classNamePrefix="select"
          />
          <button
            className="btn-success class-master-history-save"
            onClick={handleSave}
            disabled={!isEditable || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="class-master-history-list">
        <h4>Full History</h4>
        {loading ? (
          <p className="class-master-history-hint">Loading...</p>
        ) : sortedHistory.length === 0 ? (
          <p className="class-master-history-hint">No class master recorded for any year yet.</p>
        ) : (
          <table className="class-master-history-table">
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Class Master</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((h) => (
                <tr key={h.id} className={h.academic_year_id === selectedYearId ? "is-selected" : ""}>
                  <td>{h.academic_year?.name}</td>
                  <td>{h.teacher?.name || h.teacher?.username || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

ClassMasterHistoryModal.propTypes = {
  classItem: PropTypes.object,
  teachersOptions: PropTypes.array.isRequired,
};
