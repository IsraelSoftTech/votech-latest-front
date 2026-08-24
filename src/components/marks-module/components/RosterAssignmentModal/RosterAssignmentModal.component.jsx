import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import { FaSearch, FaUsers } from "react-icons/fa";
import Modal from "../Modal/Modal.component";
import "./RosterAssignmentModal.styles.css";

const DECISION_LABELS = {
  promoted: "Promoted",
  promoted_on_condition: "Promoted on Condition",
  failed: "Failed / Repeats",
};

const PAGE_SIZE = 6;

// Menu rendered through a portal so it isn't clipped by the modal's own
// scroll container or the table's, matches the pattern already used
// elsewhere in this app for react-select inside a Modal.
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

// Bulk-first roster editor for a class that fans out into different
// destination classes (isSplitClass), and/or whose real result is a
// national exam not tracked here (isManualClass). A plain per-row dropdown
// doesn't scale to a 300-student Orientation class, so the primary path
// here is: search/filter down to a batch, select it, apply one action to
// the whole batch. Per-row controls stay available for one-off fixes.
export const RosterAssignmentModal = ({
  isOpen,
  onClose,
  sourceClassName,
  rosterData,
  isSplitClass,
  isManualClass,
  manualDecisions,
  setManualDecisions,
  destinationOverrides,
  setDestinationOverrides,
  classes,
  departments,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDestination, setBulkDestination] = useState(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300).trim().toLowerCase();

  // Reset the working selection/filters each time the popup opens, stale
  // selections from a previous session in here would be confusing.
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearch("");
      setStatusFilter("all");
      setBulkDestination(null);
      setPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const classesById = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes]
  );

  // Shared by the full (unrestricted) options list and each row's
  // narrowed-to-allowed-departments list below — same grouping logic,
  // just fed a different class subset.
  const buildGroupedOptions = (classList) => {
    const byDept = classList.reduce((acc, c) => {
      const deptName =
        departments.find((d) => d.id === c.department_id)?.name || "Other";
      if (!acc[deptName]) acc[deptName] = [];
      acc[deptName].push(c);
      return acc;
    }, {});
    return Object.entries(byDept).map(([deptName, opts]) => ({
      label: deptName,
      options: opts.map((c) => ({ value: c.id, label: c.name })),
    }));
  };

  const destinationGroupedOptions = useMemo(
    () => buildGroupedOptions(classes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, departments]
  );

  // Orientation backward-compat restriction: a row whose student has
  // recorded department choices (allowed_department_ids, from
  // registration or the backfill tool) only offers destinations inside
  // those departments. `restricted` and `noEligibleClasses` drive the
  // small flag shown next to the picker, so an admin always sees when a
  // row is narrowed, or when it fell back to unrestricted because none
  // of the student's chosen departments currently has a class in it
  // (e.g. renamed/deleted since registration) — never a silent
  // difference either way.
  const getRowDestinationInfo = (row) => {
    if (!row.allowed_department_ids) {
      return { options: destinationGroupedOptions, restricted: false, noEligibleClasses: false };
    }
    const eligibleClasses = classes.filter((c) =>
      row.allowed_department_ids.includes(c.department_id)
    );
    if (eligibleClasses.length === 0) {
      return { options: destinationGroupedOptions, restricted: true, noEligibleClasses: true };
    }
    return {
      options: buildGroupedOptions(eligibleClasses),
      restricted: true,
      noEligibleClasses: false,
    };
  };

  const statusFilterOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All students" }];
    if (isManualClass) {
      opts.push(
        { value: "promoted", label: "Promoted" },
        { value: "repeating", label: "Repeating" }
      );
    }
    if (isSplitClass) {
      opts.push(
        { value: "unassigned", label: "Unassigned" },
        ...destinationGroupedOptions
      );
    }
    return opts;
  }, [isManualClass, isSplitClass, destinationGroupedOptions]);

  const findStatusOption = (value) => {
    for (const opt of statusFilterOptions) {
      if (opt.options) {
        const found = opt.options.find(
          (o) => String(o.value) === String(value)
        );
        if (found) return found;
      } else if (String(opt.value) === String(value)) {
        return opt;
      }
    }
    return statusFilterOptions[0];
  };

  const rows = useMemo(() => {
    return (rosterData?.results || []).map((r) => {
      const effectiveDecision = isManualClass
        ? manualDecisions[r.student_id] ??
          manualDecisions[String(r.student_id)] ??
          r.decision
        : r.decision;
      const destId = isSplitClass
        ? destinationOverrides[r.student_id] ??
          destinationOverrides[String(r.student_id)]
        : null;
      return {
        ...r,
        effectiveDecision,
        isPromoted: effectiveDecision !== "failed",
        destinationId: destId || null,
        destinationName: destId ? classesById.get(Number(destId))?.name : null,
      };
    });
  }, [
    rosterData,
    isManualClass,
    isSplitClass,
    manualDecisions,
    destinationOverrides,
    classesById,
  ]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (debouncedSearch) {
        const haystack = `${r.name || ""} ${
          r.registration_number || ""
        }`.toLowerCase();
        if (!haystack.includes(debouncedSearch)) return false;
      }
      if (statusFilter === "all") return true;
      if (statusFilter === "promoted") return r.isPromoted;
      if (statusFilter === "repeating") return !r.isPromoted;
      if (statusFilter === "unassigned")
        return r.isPromoted && !r.destinationId;
      // Otherwise statusFilter is a destination class id (as a string).
      return r.isPromoted && String(r.destinationId) === statusFilter;
    });
  }, [rows, debouncedSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const promoted = rows.filter((r) => r.isPromoted).length;
    const repeating = total - promoted;
    const assigned = rows.filter((r) => r.isPromoted && r.destinationId).length;
    const unassigned = promoted - assigned;
    return { total, promoted, repeating, assigned, unassigned };
  }, [rows]);

  // Selection only ever holds students eligible for whatever the bulk
  // action currently means (destination assignment needs "promoted",
  // marking promoted/repeating applies to anyone). Selecting "all" only
  // ever touches the current filter, not the whole roster, so a search
  // narrows exactly what a bulk action will affect.
  const selectableRows = isSplitClass
    ? filteredRows.filter((r) => r.isPromoted)
    : filteredRows;
  const allSelectableSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selectedIds.has(r.student_id));

  const toggleRow = (studentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(
      allSelectableSelected
        ? new Set()
        : new Set(selectableRows.map((r) => r.student_id))
    );
  };

  const setDecisionFor = (studentId, decision) => {
    setManualDecisions((prev) => ({ ...prev, [studentId]: decision }));
  };

  const applyBulkDecision = (decision) => {
    if (selectedIds.size === 0) return;
    setManualDecisions((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = decision;
      });
      return next;
    });
    toast.success(
      `${selectedIds.size} student(s) marked ${
        decision === "failed" ? "repeating" : "promoted"
      }`
    );
    setSelectedIds(new Set());
  };

  const setDestinationFor = (studentId, destId) => {
    setDestinationOverrides((prev) => ({
      ...prev,
      [studentId]: destId || undefined,
    }));
  };

  const applyBulkDestination = () => {
    if (!bulkDestination) {
      toast.error("Choose a destination class first");
      return;
    }
    const destDepartmentId = classesById.get(Number(bulkDestination.value))?.department_id;
    const promoted = [...selectedIds].filter(
      (id) => rows.find((r) => r.student_id === id)?.isPromoted
    );
    // A student whose recorded departments don't include this
    // destination is skipped from the bulk action, same as a repeating
    // student — never silently assigned somewhere outside their chosen
    // departments just because they were in the selected batch.
    const restricted = promoted.filter((id) => {
      const row = rows.find((r) => r.student_id === id);
      return (
        row?.allowed_department_ids &&
        !row.allowed_department_ids.includes(destDepartmentId)
      );
    });
    const eligible = promoted.filter((id) => !restricted.includes(id));
    const skippedRepeating = selectedIds.size - promoted.length;
    if (eligible.length === 0) {
      toast.error(
        restricted.length > 0
          ? "Nothing to assign, every selected student's chosen department excludes this destination"
          : "Nothing to assign, everyone selected is repeating"
      );
      return;
    }
    setDestinationOverrides((prev) => {
      const next = { ...prev };
      eligible.forEach((id) => {
        next[id] = Number(bulkDestination.value);
      });
      return next;
    });
    const skippedParts = [];
    if (skippedRepeating > 0) skippedParts.push(`${skippedRepeating} repeating`);
    if (restricted.length > 0) skippedParts.push(`${restricted.length} outside their chosen department`);
    toast.success(
      `${eligible.length} student(s) assigned to ${bulkDestination.label}` +
        (skippedParts.length ? `, ${skippedParts.join(", ")} student(s) were skipped` : "")
    );
    setSelectedIds(new Set());
    setBulkDestination(null);
  };

  if (!rosterData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${sourceClassName} Roster`}
      size="large"
    >
      <div className="roster-modal">
        <div className="roster-modal-stats">
          <StatCard label="Total" value={stats.total} />
          {isManualClass && (
            <>
              <StatCard label="Promoted" value={stats.promoted} tone="good" />
              <StatCard label="Repeating" value={stats.repeating} tone="bad" />
            </>
          )}
          {isSplitClass && (
            <>
              {!isManualClass && (
                <StatCard label="Promoted" value={stats.promoted} tone="good" />
              )}
              <StatCard label="Assigned" value={stats.assigned} tone="good" />
              <StatCard
                label="Unassigned"
                value={stats.unassigned}
                tone={stats.unassigned > 0 ? "warn" : "good"}
              />
            </>
          )}
        </div>

        <div className="roster-modal-toolbar">
          <div className="roster-modal-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            classNamePrefix="select"
            className="roster-modal-select"
            options={statusFilterOptions}
            value={findStatusOption(statusFilter)}
            onChange={(opt) => setStatusFilter(String(opt.value))}
            isSearchable={false}
            {...selectPortalProps}
          />
        </div>

        <div className="roster-modal-bulkbar">
          <label className="roster-modal-select-all">
            <input
              type="checkbox"
              checked={allSelectableSelected}
              disabled={selectableRows.length === 0}
              onChange={toggleSelectAllFiltered}
            />
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : `Select all ${isSplitClass ? "promoted " : ""}shown (${
                  selectableRows.length
                })`}
          </label>

          {isManualClass && (
            <div className="roster-modal-bulk-actions">
              <button
                type="button"
                className="roster-modal-bulk-btn good"
                disabled={selectedIds.size === 0}
                onClick={() => applyBulkDecision("promoted")}
              >
                Mark Selected Promoted
              </button>
              <button
                type="button"
                className="roster-modal-bulk-btn bad"
                disabled={selectedIds.size === 0}
                onClick={() => applyBulkDecision("failed")}
              >
                Mark Selected Repeating
              </button>
            </div>
          )}

          {isSplitClass && (
            <div className="roster-modal-bulk-actions">
              <Select
                classNamePrefix="select"
                className="roster-modal-select"
                placeholder="Assign selected to..."
                options={destinationGroupedOptions}
                value={bulkDestination}
                onChange={setBulkDestination}
                {...selectPortalProps}
              />
              <button
                type="button"
                className="roster-modal-bulk-btn good"
                disabled={selectedIds.size === 0}
                onClick={applyBulkDestination}
              >
                Assign Selected
              </button>
            </div>
          )}
        </div>

        <div className="roster-modal-table-wrap">
          {filteredRows.length === 0 ? (
            <p className="roster-modal-empty">
              <FaUsers /> No students match this search/filter.
            </p>
          ) : (
            <table className="roster-modal-table">
              <thead>
                <tr>
                  <th />
                  <th>Student</th>
                  <th>Reg. No.</th>
                  <th>Average</th>
                  <th>{isManualClass ? "Recommendation" : "Decision"}</th>
                  {isManualClass && <th>Promoted</th>}
                  {isSplitClass && <th>Destination</th>}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      {(!isSplitClass || row.isPromoted) && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.student_id)}
                          onChange={() => toggleRow(row.student_id)}
                        />
                      )}
                    </td>
                    <td>{row.name}</td>
                    <td>{row.registration_number}</td>
                    <td>{row.overall_average ?? "—"}</td>
                    <td>{DECISION_LABELS[row.decision] || row.decision}</td>
                    {isManualClass && (
                      <td>
                        <input
                          type="checkbox"
                          checked={row.isPromoted}
                          onChange={(e) =>
                            setDecisionFor(
                              row.student_id,
                              e.target.checked ? "promoted" : "failed"
                            )
                          }
                        />
                      </td>
                    )}
                    {isSplitClass && (
                      <td className="roster-modal-destination-cell">
                        {!row.isPromoted ? (
                          <span className="roster-modal-repeats">
                            Repeats here
                          </span>
                        ) : (
                          (() => {
                            const destInfo = getRowDestinationInfo(row);
                            return (
                              <>
                                <Select
                                  classNamePrefix="select"
                                  className="roster-modal-row-select"
                                  placeholder="Not assigned"
                                  options={destInfo.options}
                                  value={
                                    row.destinationId
                                      ? {
                                          value: row.destinationId,
                                          label: row.destinationName,
                                        }
                                      : null
                                  }
                                  onChange={(opt) =>
                                    setDestinationFor(row.student_id, opt?.value)
                                  }
                                  isClearable
                                  {...selectPortalProps}
                                />
                                {destInfo.noEligibleClasses ? (
                                  <span
                                    className="roster-modal-dest-flag warn"
                                    title="None of this student's chosen departments currently has a class — showing all classes."
                                  >
                                    No class in chosen dept.
                                  </span>
                                ) : destInfo.restricted ? (
                                  <span
                                    className="roster-modal-dest-flag"
                                    title="Limited to this student's chosen departments."
                                  >
                                    Restricted
                                  </span>
                                ) : (
                                  <span
                                    className="roster-modal-dest-flag muted"
                                    title="No department choices recorded for this student — any class allowed."
                                  >
                                    No choices recorded
                                  </span>
                                )}
                              </>
                            );
                          })()
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="roster-modal-pagination">
            <button
              type="button"
              className="roster-modal-page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="roster-modal-page-label">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="roster-modal-page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}

        <button
          type="button"
          className="roster-modal-done-btn"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </Modal>
  );
};

const StatCard = ({ label, value, tone }) => (
  <div className={`roster-modal-stat-card ${tone || ""}`}>
    <span className="roster-modal-stat-value">{value}</span>
    <span className="roster-modal-stat-label">{label}</span>
  </div>
);

export default RosterAssignmentModal;
