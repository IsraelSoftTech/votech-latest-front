import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import { FaSearch, FaUsers, FaExclamationTriangle } from "react-icons/fa";
import Modal from "../Modal/Modal.component";
import api from "../../utils/api";
import "./OrientationBackfillModal.styles.css";

const PAGE_SIZE = 8;

const selectPortalProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
  styles: { menuPortal: (base) => ({ ...base, zIndex: 10000 }) },
};

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Backfill tool for the hundreds of students already enrolled in
// orientation classes before this feature existed. Deliberately sets
// only Choice 1 (the department), not a full six-way ranking — asking
// someone to rank six departments for a student already mid-year isn't
// realistic, and Choice 1 is all promotion's destination restriction
// needs as a baseline. A student who already has a choice recorded
// (full registration, or an earlier backfill) shows it plainly before
// applying, so overwriting one is always a visible, deliberate action.
export const OrientationBackfillModal = ({ isOpen, onClose, classes, departments }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDepartment, setBulkDepartment] = useState(null);
  const [page, setPage] = useState(1);
  const [applying, setApplying] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300).trim().toLowerCase();

  const orientationClassOptions = useMemo(
    () => classes.filter((c) => c.is_orientation).map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set("class_id", classFilter);
      const res = await api.get(`/students/orientation-pending?${params.toString()}`);
      setStudents(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load orientation students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearch("");
      setClassFilter(null);
      setBulkDepartment(null);
      setPage(1);
      setLastResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, classFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const rows = useMemo(() => {
    return students.map((s) => {
      const existing = (s.department_choices || [])[0] || null;
      return {
        ...s,
        existingDepartmentId: existing?.department_id || null,
        existingDepartmentName: existing?.department?.name || null,
      };
    });
  }, [students]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows;
    return rows.filter((r) =>
      `${r.full_name || ""} ${r.student_id || ""}`.toLowerCase().includes(debouncedSearch)
    );
  }, [rows, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allShownSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(allShownSelected ? new Set() : new Set(filteredRows.map((r) => r.id)));
  };

  const overwriteCount = useMemo(() => {
    return [...selectedIds].filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row?.existingDepartmentId && row.existingDepartmentId !== bulkDepartment?.value;
    }).length;
  }, [selectedIds, rows, bulkDepartment]);

  const applyBulk = async () => {
    if (!bulkDepartment) {
      toast.error("Choose a department first.");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Select at least one student.");
      return;
    }
    if (overwriteCount > 0) {
      const confirmed = window.confirm(
        `${overwriteCount} of the selected student(s) already have a different Choice 1 recorded — this will overwrite it. Continue?`
      );
      if (!confirmed) return;
    }

    setApplying(true);
    try {
      const res = await api.post("/students/bulk-department-choice", {
        student_ids: [...selectedIds],
        department_id: bulkDepartment.value,
      });
      const { applied, skipped } = res.data.data;
      setLastResult({ applied, skipped });
      toast.success(
        `${applied.length} student(s) set to ${bulkDepartment.label}` +
          (skipped.length ? `, ${skipped.length} skipped` : "")
      );
      setSelectedIds(new Set());
      setBulkDepartment(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backfill Orientation Choices" size="large">
      <div className="obm-modal">
        <p className="obm-explainer">
          Sets Choice 1 (department) for students already enrolled in an orientation class before
          this feature existed. This does not require ranking all six — a student can complete
          their full ranking later via Edit on the Students page.
        </p>

        <div className="obm-toolbar">
          <div className="obm-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name or student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            classNamePrefix="select"
            className="obm-select"
            placeholder="All orientation classes"
            options={orientationClassOptions}
            value={orientationClassOptions.find((o) => o.value === classFilter) || null}
            onChange={(opt) => setClassFilter(opt?.value || null)}
            isClearable
            {...selectPortalProps}
          />
        </div>

        <div className="obm-bulkbar">
          <label className="obm-select-all">
            <input
              type="checkbox"
              checked={allShownSelected}
              disabled={filteredRows.length === 0}
              onChange={toggleSelectAllFiltered}
            />
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all shown (${filteredRows.length})`}
          </label>

          <div className="obm-bulk-actions">
            <Select
              classNamePrefix="select"
              className="obm-select"
              placeholder="Set Choice 1 to..."
              options={departmentOptions}
              value={bulkDepartment}
              onChange={setBulkDepartment}
              {...selectPortalProps}
            />
            <button
              type="button"
              className="obm-apply-btn"
              disabled={selectedIds.size === 0 || applying}
              onClick={applyBulk}
            >
              {applying ? "Applying..." : "Apply to Selected"}
            </button>
          </div>
        </div>

        {overwriteCount > 0 && bulkDepartment && (
          <div className="obm-warning">
            <FaExclamationTriangle /> {overwriteCount} selected student(s) already have a
            different Choice 1 recorded and will be overwritten.
          </div>
        )}

        <div className="obm-table-wrap">
          {loading ? (
            <p className="obm-empty">Loading…</p>
          ) : filteredRows.length === 0 ? (
            <p className="obm-empty">
              <FaUsers /> No orientation students match this search/filter.
            </p>
          ) : (
            <table className="obm-table">
              <thead>
                <tr>
                  <th />
                  <th>Student</th>
                  <th>Class</th>
                  <th>Current Choice 1</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                    <td>
                      {row.full_name}
                      <span className="obm-student-id"> ({row.student_id})</span>
                    </td>
                    <td>{row.Class?.name}</td>
                    <td>
                      {row.existingDepartmentName ? (
                        <span className="obm-existing-pill">{row.existingDepartmentName}</span>
                      ) : (
                        <span className="obm-empty-pill">Not set</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="obm-pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}

        {lastResult?.skipped?.length > 0 && (
          <div className="obm-skipped-section">
            <h4>Skipped ({lastResult.skipped.length})</h4>
            {lastResult.skipped.map((s, i) => (
              <p key={i} className="obm-skipped-row">
                {s.name || `Student #${s.student_id}`}: {s.reason}
              </p>
            ))}
          </div>
        )}

        <button type="button" className="obm-done-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
};

export default OrientationBackfillModal;
