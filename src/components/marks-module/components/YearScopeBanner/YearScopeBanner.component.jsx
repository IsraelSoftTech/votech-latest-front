import React from "react";
import Select from "react-select";
import { FaLock, FaUnlockAlt, FaCheckCircle } from "react-icons/fa";
import "./YearScopeBanner.styles.css";

// Reusable "you're viewing/editing data for [Academic Year]" banner + year
// picker, driven by the useYearScope() hook. Any page/modal that reads or
// writes year-scoped data (class-subject assignments, class master
// assignments, and anything else built on academic_year_id) should surface
// this instead of silently assuming the active year.
export function YearScopeBanner({ yearScope, className = "" }) {
  const {
    years,
    loading,
    selectedYearId,
    setSelectedYearId,
    selectedYear,
    isEditable,
    editableReason,
  } = yearScope;

  const options = years.map((y) => ({
    value: y.id,
    label: `${y.name}${y.status === "active" ? " (active)" : ""}`,
  }));

  return (
    <div className={`year-scope-banner ${className}`}>
      <div className="year-scope-select-wrap">
        <label className="year-scope-select-label">Academic Year</label>
        <Select
          classNamePrefix="select"
          isDisabled={loading || options.length === 0}
          options={options}
          value={options.find((o) => o.value === selectedYearId) || null}
          onChange={(opt) => setSelectedYearId(opt?.value || null)}
          isSearchable={false}
        />
      </div>

      {selectedYear && (
        <div
          className={`year-scope-status ${
            isEditable ? "year-scope-status--editable" : "year-scope-status--readonly"
          }`}
        >
          {isEditable ? (
            selectedYear.status === "active" ? (
              <FaCheckCircle />
            ) : (
              <FaUnlockAlt />
            )
          ) : (
            <FaLock />
          )}
          <span>
            <strong>{isEditable ? "Editable" : "Read-only"}</strong> — {editableReason}
          </span>
        </div>
      )}
    </div>
  );
}

export default YearScopeBanner;
