import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaSearch, FaUserPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import Modal from "../Modal/Modal.component";
import { Button } from "../Button/Button.component";
import { Badge } from "../Badge/Badge.component";
import { EmptyState } from "../EmptyState/EmptyState.component";
import { CustomInput } from "../Inputs/CustumInputs";
import { StudentFormModal } from "../StudentFormModal/StudentFormModal.component";
import api from "../../utils/api";
import "./RegisterStudentFlow.styles.css";

// Every registration starts here, with a search, so a returning student
// is never registered twice and the clerk never has to ask "are you new?":
//   step "search"  -> matches across every year, each saying what happens next
//   step "place"   -> returning student: last class, average, decision, pick
//                     the class for this year (POST /students/:id/place)
//   step "new"     -> nothing matched: the normal registration form
// Works from the Students page and from a class page (lockedClassId then
// pre-selects the destination).

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.details || err?.message || fallback;

const STATE_LABEL = {
  pending: { label: "Returning, not yet placed", tone: "warn" },
  placed: { label: "Already registered this year", tone: "good" },
  graduated: { label: "Graduated", tone: "neutral" },
  withdrawn: { label: "Left the school", tone: "bad" },
};

const DECISION_LABEL = {
  promoted: "Promoted",
  promoted_on_condition: "Promoted on condition",
  failed: "Repeat the class",
};

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function RegisterStudentFlow({
  isOpen,
  onClose,
  onDone,
  classes = [],
  departments = [],
  academicYears = [],
  lockedClassId = null,
  lockedDepartmentId = null,
  onOpenProfile,
  // From a row action ("Place in class") the student is already known:
  // pre-fill the search with their ID and go straight to placement when
  // that record comes back pending.
  autoPlace = null,
}) {
  const [step, setStep] = useState("search");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);
  const [results, setResults] = useState(null); // null = not searched yet
  const [searching, setSearching] = useState(false);
  const [activeYear, setActiveYear] = useState(null);
  const [selected, setSelected] = useState(null);
  const [destinationId, setDestinationId] = useState(null);
  const [otherDepartments, setOtherDepartments] = useState(false);
  const [confirmCross, setConfirmCross] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep("search");
    setQuery(autoPlace?.search || "");
    setResults(null);
    setSelected(null);
    setDestinationId(null);
    setOtherDepartments(false);
    setConfirmCross(false);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== "search") return undefined;
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults(null);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    api
      .get(`/students/returning?search=${encodeURIComponent(q)}`)
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.data?.results || [];
        setResults(list);
        setActiveYear(res?.data?.data?.active_year || null);
        if (autoPlace?.id) {
          const match = list.find((r) => r.id === autoPlace.id && r.placement_state === "pending");
          if (match) startPlacement(match);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err, "Search failed."));
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, isOpen, step]);

  const startPlacement = (student) => {
    setSelected(student);
    const sameDept = (student.department_classes || []).some((c) => c.id === lockedClassId);
    setDestinationId(lockedClassId && sameDept ? lockedClassId : student.suggested_class_id || null);
    setOtherDepartments(false);
    setConfirmCross(false);
    setStep("place");
  };

  // Graduated / left: revert the exit, then search again for the fresh
  // record (now "pending") and go straight to placement.
  const reactivateAndPlace = async (student) => {
    setSaving(true);
    try {
      await api.post(`/students/${student.id}/exit/revert`, { reason: "Returned to register" });
      const res = await api.get(`/students/returning?search=${encodeURIComponent(student.student_id || student.full_name)}`);
      const fresh = (res?.data?.data?.results || []).find((r) => r.id === student.id);
      if (!fresh) throw new Error("Reactivated, but the record could not be reloaded. Search again.");
      toast.success(`${student.full_name} is active again.`);
      if (fresh.placement_state === "pending") startPlacement(fresh);
      else {
        setResults((prev) => (prev || []).map((r) => (r.id === fresh.id ? fresh : r)));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not reactivate the student."));
    } finally {
      setSaving(false);
    }
  };

  const deptName = (id) => departments.find((d) => d.id === id)?.name || "";

  const destinationOptions = useMemo(() => {
    if (!selected) return [];
    const own = (selected.department_classes || []).map((c) => ({ value: c.id, label: c.name, department_id: c.department_id }));
    if (!otherDepartments) return own;
    const ownIds = new Set(own.map((o) => o.value));
    const others = classes
      .filter((c) => !c.suspended && !ownIds.has(c.id))
      .map((c) => ({ value: c.id, label: `${c.name}${deptName(c.department_id) ? ` (${deptName(c.department_id)})` : ""}`, department_id: c.department_id }));
    return [...own, ...others];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, otherDepartments, classes, departments]);

  const destination = destinationOptions.find((o) => o.value === destinationId) || null;
  const isCrossDepartment = !!(selected && destination && selected.department_id && destination.department_id !== selected.department_id);
  const isRepeat = !!(selected && destination && destination.value === selected.class_id);
  const decision = isRepeat ? "failed" : selected?.evaluation?.decision === "promoted_on_condition" ? "promoted_on_condition" : "promoted";

  const confirmPlacement = async () => {
    if (!selected || !destination) return;
    if (isCrossDepartment && !confirmCross) return;
    setSaving(true);
    try {
      const res = await api.post(`/students/${selected.id}/place`, {
        destination_class_id: destination.value,
        decision,
        confirm_cross_department: isCrossDepartment ? true : undefined,
      });
      toast.success(res?.data?.data?.message || "Student placed.");
      if (onDone) onDone(res?.data?.data);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not place the student."));
    } finally {
      setSaving(false);
    }
  };

  // Step "new": hand over to the normal registration form.
  if (isOpen && step === "new") {
    return (
      <StudentFormModal
        isOpen
        onClose={onClose}
        student={null}
        classes={classes}
        departments={departments}
        academicYears={academicYears}
        lockedClassId={lockedClassId}
        lockedDepartmentId={lockedDepartmentId}
        onSaved={() => {
          if (onDone) onDone();
          onClose();
        }}
      />
    );
  }

  const evaluation = selected?.evaluation || null;

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={step === "place" ? "Place returning student" : "Register Student"} size="large">
      {step === "search" && (
        <div className="rsf-body">
          <p className="rsf-lead">
            <FaSearch /> Search first: returning students are already in the system.
          </p>
          <CustomInput
            name="rsf-search"
            placeholder="Student's name or ID"
            value={query}
            onChange={(_, v) => setQuery(v)}
            onClear={() => setQuery("")}
            id="rsf-search-input"
          />

          {query.trim().length >= 2 && (
            <div className="rsf-results" aria-live="polite">
              {searching && results === null && <p className="rsf-muted">Searching...</p>}
              {results && results.length === 0 && !searching && (
                <EmptyState title="No student matches" subtitle="Check the spelling or try their student ID from an old report card." />
              )}
              {(results || []).map((r) => {
                const st = STATE_LABEL[r.placement_state] || { label: r.placement_state, tone: "neutral" };
                return (
                  <div className={`rsf-card state-${r.placement_state}`} key={r.id}>
                    <div className="rsf-card-main">
                      <div className="rsf-card-title">{r.full_name}</div>
                      <div className="rsf-card-sub">
                        {r.student_id} · {r.sex === "M" ? "Male" : r.sex === "F" ? "Female" : "N/A"}
                      </div>
                      <div className="rsf-card-meta">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {r.class_name && (
                          <span>
                            {r.placement_state === "placed" ? "In" : "Was in"} <strong>{r.class_name}</strong>
                            {r.academic_year_name ? `, ${r.academic_year_name}` : ""}
                          </span>
                        )}
                        {r.placement_state === "pending" && r.evaluation?.annual_average != null && (
                          <span>
                            Average <strong>{r.evaluation.annual_average}</strong>
                            {r.evaluation.decision ? ` · ${DECISION_LABEL[r.evaluation.decision] || r.evaluation.decision}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rsf-card-actions">
                      {r.placement_state === "pending" && (
                        <Button onClick={() => startPlacement(r)} disabled={saving}>
                          Place in class
                        </Button>
                      )}
                      {r.placement_state === "placed" && (
                        <Button variant="secondary" onClick={() => onOpenProfile && onOpenProfile(r)}>
                          Open profile
                        </Button>
                      )}
                      {(r.placement_state === "graduated" || r.placement_state === "withdrawn") && (
                        <Button variant="secondary" onClick={() => reactivateAndPlace(r)} disabled={saving} loading={saving}>
                          Reactivate and place
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rsf-new">
            <span>{query.trim().length >= 2 ? "Not found?" : "New to the school?"}</span>
            <Button variant="secondary" icon={<FaUserPlus />} onClick={() => setStep("new")}>
              Register as a new student
            </Button>
          </div>
        </div>
      )}

      {step === "place" && selected && (
        <div className="rsf-body">
          <button type="button" className="rsf-back" onClick={() => setStep("search")} disabled={saving}>
            <FaArrowLeft /> Back to search
          </button>

          <div className="rsf-student">
            <div className="rsf-card-title">{selected.full_name}</div>
            <div className="rsf-card-sub">{selected.student_id}</div>
          </div>

          <div className="rsf-lastyear">
            <div className="rsf-section-title">Last year</div>
            <div className="rsf-grid">
              <div>
                <span className="rsf-label">Class</span>
                <span className="rsf-value">{selected.class_name || "N/A"}</span>
              </div>
              <div>
                <span className="rsf-label">Year</span>
                <span className="rsf-value">{selected.academic_year_name || "N/A"}</span>
              </div>
              <div>
                <span className="rsf-label">Annual average</span>
                <span className="rsf-value">{evaluation?.annual_average != null ? evaluation.annual_average : "N/A"}</span>
              </div>
              <div>
                <span className="rsf-label">Decision</span>
                <span className="rsf-value">
                  {evaluation?.decision ? (
                    <Badge tone={evaluation.decision === "failed" ? "warn" : "good"}>{DECISION_LABEL[evaluation.decision]}</Badge>
                  ) : (
                    "Decide manually"
                  )}
                </span>
              </div>
            </div>
            {evaluation?.reasons?.length > 0 && evaluation.source !== "none" && (
              <p className="rsf-muted">{evaluation.reasons.join(" ")}</p>
            )}
            <p className="rsf-muted">
              {evaluation?.source === "promotion_run"
                ? "From the promotion run that judged this class."
                : evaluation?.source === "rules"
                ? "Calculated from marks with this class's promotion rules."
                : evaluation?.source === "marks_only"
                ? "Calculated from marks; no promotion rules set for this class."
                : "No marks found for this student in that year."}
            </p>
          </div>

          <div className="rsf-destination">
            <div className="rsf-section-title">Place in {activeYear?.name || "the current year"}</div>
            <Select
              classNamePrefix="select"
              placeholder={`Choose the class for ${activeYear?.name || "this year"}`}
              options={destinationOptions}
              value={destination}
              onChange={(opt) => {
                setDestinationId(opt?.value || null);
                setConfirmCross(false);
              }}
              isClearable
              isSearchable
            />
            <label className="rsf-toggle">
              <input type="checkbox" checked={otherDepartments} onChange={(e) => setOtherDepartments(e.target.checked)} />
              Show classes from other departments
            </label>

            {destination && (
              <div className="rsf-outcome">
                {isRepeat ? (
                  <Badge tone="warn">Repeating {destination.label}</Badge>
                ) : (
                  <Badge tone="good">{DECISION_LABEL[decision]} to {destination.label}</Badge>
                )}
              </div>
            )}

            {isCrossDepartment && (
              <label className="rsf-warn">
                <input type="checkbox" checked={confirmCross} onChange={(e) => setConfirmCross(e.target.checked)} />
                <span>
                  <FaExclamationTriangle /> This class is in a different department from last year&apos;s. I confirm this
                  student is changing department.
                </span>
              </label>
            )}
          </div>

          <div className="rsf-actions">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              icon={<FaCheckCircle />}
              onClick={confirmPlacement}
              disabled={saving || !destination || (isCrossDepartment && !confirmCross)}
              loading={saving}
            >
              {saving ? "Placing..." : "Confirm placement"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default RegisterStudentFlow;
