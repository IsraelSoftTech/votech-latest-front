import React, { useEffect, useState } from "react";
import { FaExclamationTriangle, FaGraduationCap, FaSignOutAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import Modal from "../Modal/Modal.component";
import { Button } from "../Button/Button.component";
import { CustomInput, CustomDatePicker } from "../Inputs/CustumInputs";
import api from "../../utils/api";
import "./ExitStudentModal.styles.css";

// One confirmation for "Mark as graduated" / "Mark as left the school",
// for a single student, a selection, or the end-of-registration sweep
// ("everyone still not placed from <year>"). The backend records each
// exit (student_status_changes) and every one of these is revertible from
// the student's page, which the copy says up front.
//
// mode: "single"  -> students: [one]
//       "bulk"    -> students: [many]            (POST /students/bulk-exit)
//       "sweep"   -> sweep: { from_academic_year_id, year_name, count }
//                    (POST /students/pending-placement/exit-all, the live
//                    count must still match or the server refuses)
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.details || err?.message || fallback;

export function ExitStudentModal({ isOpen, onClose, onDone, mode = "single", students = [], sweep = null, initialStatus = "withdrawn" }) {
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(initialStatus);
    setReason("");
    setEffectiveDate("");
    setAck(false);
    setSaving(false);
  }, [isOpen, initialStatus]);

  const count = mode === "sweep" ? sweep?.count || 0 : students.length;
  const names = students.slice(0, 8).map((s) => s.full_name);
  const needsAck = count > 1;
  const statusLabel = status === "graduated" ? "graduated" : "left the school";

  const submit = async () => {
    if (needsAck && !ack) return;
    setSaving(true);
    try {
      const body = { status, reason: reason.trim() || undefined, effective_date: effectiveDate || undefined };
      let res;
      if (mode === "sweep") {
        res = await api.post("/students/pending-placement/exit-all", {
          ...body,
          from_academic_year_id: sweep.from_academic_year_id,
          expected_count: sweep.count,
        });
      } else if (mode === "bulk") {
        res = await api.post("/students/bulk-exit", { ...body, student_ids: students.map((s) => s.id), expected_count: students.length });
      } else {
        res = await api.post(`/students/${students[0].id}/exit`, body);
      }
      toast.success(res?.data?.data?.message || `Marked as ${statusLabel}.`);
      if (onDone) onDone(res?.data?.data);
      onClose();
    } catch (err) {
      // 409s here are the guards talking (list changed, already inactive):
      // shown in place so the operator reads them before trying again.
      toast.error(getErrorMessage(err, "Could not update the student's status."));
      if (err?.response?.status === 409 && onDone) onDone(null, err);
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "sweep" ? "Mark remaining students" : count > 1 ? `Mark ${count} students` : "Mark student";

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={title}>
      <div className="esm-body">
        <div className="esm-choices" role="radiogroup" aria-label="New status">
          <label className={`esm-choice${status === "graduated" ? " on" : ""}`}>
            <input type="radio" name="exit-status" checked={status === "graduated"} onChange={() => setStatus("graduated")} />
            <FaGraduationCap />
            <span>
              <strong>Graduated</strong>
              <small>Finished their final level.</small>
            </span>
          </label>
          <label className={`esm-choice${status === "withdrawn" ? " on" : ""}`}>
            <input type="radio" name="exit-status" checked={status === "withdrawn"} onChange={() => setStatus("withdrawn")} />
            <FaSignOutAlt />
            <span>
              <strong>Left the school</strong>
              <small>Did not return, transferred, or withdrew.</small>
            </span>
          </label>
        </div>

        <div className="esm-who">
          {mode === "sweep" ? (
            <p>
              Everyone still <strong>not yet placed</strong> from <strong>{sweep?.year_name}</strong>:{" "}
              <strong>{count}</strong> student{count === 1 ? "" : "s"}.
            </p>
          ) : count === 1 ? (
            <p>
              <strong>{students[0]?.full_name}</strong>
              {students[0]?.student_id ? ` (${students[0].student_id})` : ""}
            </p>
          ) : (
            <p>
              <strong>{count} students</strong>: {names.join(", ")}
              {count > names.length ? ` and ${count - names.length} more` : ""}.
            </p>
          )}
          <p className="esm-note">
            They will stop appearing in class lists, marks and report card sessions. This can be undone from the
            student&apos;s page.
          </p>
        </div>

        <CustomInput
          label="Reason (optional)"
          name="reason"
          value={reason}
          placeholder={status === "graduated" ? "e.g. Completed Diploma" : "e.g. Did not return for registration"}
          onChange={(_, v) => setReason(v)}
          onClear={() => setReason("")}
        />
        <CustomDatePicker
          label="Effective date (optional)"
          name="effective_date"
          value={effectiveDate}
          onChange={(_, v) => setEffectiveDate(v)}
          onClear={() => setEffectiveDate("")}
        />

        {needsAck && (
          <label className="esm-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>
              <FaExclamationTriangle /> I have checked this list. Mark all {count} as {statusLabel}.
            </span>
          </label>
        )}

        <div className="esm-actions">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving || (needsAck && !ack)} loading={saving}>
            {saving ? "Saving..." : status === "graduated" ? "Mark as graduated" : "Mark as left"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ExitStudentModal;
