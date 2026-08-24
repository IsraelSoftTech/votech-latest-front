import React, { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import api from "../services/api";
import { notifyActiveYearChanged } from "../utils/activeYearSession";
import "./SwitchYearWizard.css";

const CONFIRM_PHRASE = "CONFIRM";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function previewNewYearName(startDate) {
  if (!startDate) return "New academic year";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "New academic year";
  const y1 = start.getFullYear();
  const y2 = y1 + 1;
  return `${y1}/${y2} Academic Year`;
}

export default function SwitchYearWizard({
  open,
  onClose,
  activeYear,
  archivedYears = [],
  initialMode = "switch",
  onSuccess,
}) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(initialMode);
  const [targetYearId, setTargetYearId] = useState("");
  const [newYearForm, setNewYearForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedArchivedYear = useMemo(
    () => archivedYears.find((y) => String(y.id) === String(targetYearId)),
    [archivedYears, targetYearId]
  );

  const targetYearLabel = useMemo(() => {
    if (mode === "switch") {
      return selectedArchivedYear?.name || "—";
    }
    return previewNewYearName(newYearForm.start_date);
  }, [mode, selectedArchivedYear, newYearForm.start_date]);

  const currentYearLabel = activeYear?.name || "None";

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setMode(initialMode);
    setTargetYearId("");
    setNewYearForm({ start_date: "", end_date: "", reason: "" });
    setReason("");
    setConfirmText("");
    setError("");
    setSubmitting(false);
  }, [open, initialMode]);

  if (!open) return null;

  const validateStep1 = () => {
    if (mode === "switch") {
      if (!targetYearId) {
        setError("Select an archived year to switch to.");
        return false;
      }
    } else {
      const { start_date, end_date } = newYearForm;
      if (!start_date || !end_date) {
        setError("Start and end dates are required for the new year.");
        return false;
      }
      if (new Date(start_date) >= new Date(end_date)) {
        setError("Start date must be before end date.");
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handleBack = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (confirmText.trim().toUpperCase() !== CONFIRM_PHRASE) {
      setError(`Type ${CONFIRM_PHRASE} to proceed.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let result;
      if (mode === "switch") {
        result = await api.switchAcademicYear(
          Number(targetYearId),
          (reason || newYearForm.reason).trim()
        );
      } else {
        result = await api.rolloverAcademicYear({
          start_date: newYearForm.start_date,
          end_date: newYearForm.end_date,
          reason: (reason || newYearForm.reason).trim(),
        });
      }

      const active = result?.activeYear;
      if (active) {
        notifyActiveYearChanged({ ...active, isWritable: true });
      }

      onSuccess?.(result, mode);
      onClose();
    } catch (err) {
      setError(err.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 =
    mode === "switch" ? Boolean(targetYearId) : Boolean(newYearForm.start_date && newYearForm.end_date);

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_PHRASE && !submitting;

  return (
    <div className="ay-wizard-overlay" onClick={onClose}>
      <div
        className="ay-wizard"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-year-wizard-title"
      >
        <div className="ay-wizard-header">
          <div>
            <h2 id="switch-year-wizard-title">Switch Academic Year</h2>
            <p className="ay-wizard-subtitle">Step {step} of 3</p>
          </div>
          <button type="button" className="ay-wizard-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="ay-wizard-steps" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`ay-wizard-step-dot${step >= n ? " active" : ""}${step === n ? " current" : ""}`}
            />
          ))}
        </div>

        <div className="ay-wizard-body">
          {step === 1 && (
            <>
              <p className="ay-wizard-lead">
                Choose whether to activate an archived year or create a new one.
              </p>

              <div className="ay-wizard-mode-tabs">
                <button
                  type="button"
                  className={`ay-wizard-mode-tab${mode === "switch" ? " active" : ""}`}
                  onClick={() => {
                    setMode("switch");
                    setError("");
                  }}
                  disabled={archivedYears.length === 0}
                >
                  Use archived year
                </button>
                <button
                  type="button"
                  className={`ay-wizard-mode-tab${mode === "create" ? " active" : ""}`}
                  onClick={() => {
                    setMode("create");
                    setError("");
                  }}
                >
                  Create new year
                </button>
              </div>

              {mode === "switch" ? (
                archivedYears.length === 0 ? (
                  <div className="ay-warning-box">
                    No archived years available. Use &quot;Create new year&quot; instead.
                  </div>
                ) : (
                  <div className="ay-form-group">
                    <label htmlFor="wizard-archived-year">Archived year</label>
                    <select
                      id="wizard-archived-year"
                      value={targetYearId}
                      onChange={(e) => setTargetYearId(e.target.value)}
                    >
                      <option value="">— Select a year —</option>
                      {archivedYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} ({formatDate(y.start_date)} – {formatDate(y.end_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                )
              ) : (
                <>
                  <div className="ay-form-group">
                    <label htmlFor="wizard-start">Start date</label>
                    <input
                      id="wizard-start"
                      type="date"
                      value={newYearForm.start_date}
                      onChange={(e) =>
                        setNewYearForm((f) => ({
                          ...f,
                          start_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="ay-form-group">
                    <label htmlFor="wizard-end">End date</label>
                    <input
                      id="wizard-end"
                      type="date"
                      value={newYearForm.end_date}
                      onChange={(e) =>
                        setNewYearForm((f) => ({
                          ...f,
                          end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {newYearForm.start_date && (
                    <p className="ay-wizard-preview-name">
                      Preview name: <strong>{previewNewYearName(newYearForm.start_date)}</strong>
                    </p>
                  )}
                </>
              )}

              <div className="ay-form-group">
                <label htmlFor="wizard-reason-step1">Reason (optional)</label>
                <textarea
                  id="wizard-reason-step1"
                  value={mode === "create" ? newYearForm.reason : reason}
                  onChange={(e) =>
                    mode === "create"
                      ? setNewYearForm((f) => ({ ...f, reason: e.target.value }))
                      : setReason(e.target.value)
                  }
                  placeholder="Brief note for the audit log"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="ay-warning-box ay-wizard-warning-prominent">
                <strong>Please review before continuing</strong>
                <p>
                  All new data entry will apply to{" "}
                  <strong>{targetYearLabel}</strong>.
                </p>
                <p>
                  <strong>{currentYearLabel}</strong> will become{" "}
                  <strong>read-only</strong> and cannot be edited unless an Admin1
                  reactivates it.
                </p>
              </div>

              <div className="ay-wizard-summary">
                <div className="ay-wizard-summary-row">
                  <span>Current active year</span>
                  <strong>{currentYearLabel}</strong>
                </div>
                <div className="ay-wizard-summary-row">
                  <span>After switch</span>
                  <strong>{targetYearLabel}</strong>
                </div>
                <div className="ay-wizard-summary-row">
                  <span>Action</span>
                  <strong>{mode === "switch" ? "Switch to archived" : "Create & activate"}</strong>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="ay-wizard-lead">
                To complete this change, type <strong>{CONFIRM_PHRASE}</strong> below.
              </p>
              <div className="ay-form-group">
                <label htmlFor="wizard-confirm">Confirmation</label>
                <input
                  id="wizard-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className="ay-wizard-confirm-hint">
                Switching to <strong>{targetYearLabel}</strong> will archive{" "}
                <strong>{currentYearLabel}</strong>.
              </p>
            </>
          )}

          {error && <p className="ay-form-error">{error}</p>}
        </div>

        <div className="ay-wizard-footer">
          {step > 1 ? (
            <button
              type="button"
              className="ay-btn ay-btn-secondary"
              onClick={handleBack}
              disabled={submitting}
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              className="ay-btn ay-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="ay-btn ay-btn-primary"
              onClick={handleNext}
              disabled={step === 1 && !canProceedStep1}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="ay-btn ay-btn-primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting
                ? "Processing…"
                : mode === "switch"
                  ? "Switch Year"
                  : "Create & Activate"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
