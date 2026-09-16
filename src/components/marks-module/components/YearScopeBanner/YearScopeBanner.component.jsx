import React from "react";
import Select from "react-select";
import { FaLock, FaUnlockAlt } from "react-icons/fa";
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

      {/* The normal case (active year, editable) says nothing: a status
          line is only worth the space when the user CANNOT edit and needs
          to know why, or when they can only because of a temporary grant
          on an archived year, which is unusual enough to flag. */}
      {selectedYear && !isEditable && (
        <div className="year-scope-status year-scope-status--readonly">
          <FaLock />
          <span>
            <strong>Read-only.</strong> {editableReason}
          </span>
        </div>
      )}
      {selectedYear && isEditable && selectedYear.status !== "active" && (
        <div className="year-scope-status year-scope-status--editable">
          <FaUnlockAlt />
          <span>{editableReason}</span>
        </div>
      )}
    </div>
  );
}

export default YearScopeBanner;
