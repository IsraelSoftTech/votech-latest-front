import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaCheckCircle,
  FaExchangeAlt,
  FaHistory,
  FaPlus,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import SideTop from "./SideTop";
import SwitchYearWizard from "./SwitchYearWizard";
import api from "../services/api";
import {
  notifyActiveYearChanged,
  setActiveYearSnapshot,
} from "../utils/activeYearSession";
import "./AcademicYearManagement.css";

const ALLOWED_ROLES = ["Admin1", "Admin3"];

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

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionBadgeClass(action) {
  if (action === "switch") return "ay-badge ay-badge-switch";
  if (action === "reactivate") return "ay-badge ay-badge-reactivate";
  return "ay-badge ay-badge-archive";
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="ay-modal-overlay" onClick={onClose}>
      <div className="ay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ay-modal-header">
          <h3>{title}</h3>
          <button type="button" className="ay-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="ay-modal-body">{children}</div>
        {footer && <div className="ay-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default function AcademicYearManagement() {
  const navigate = useNavigate();
  const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");
  const role = authUser?.role;

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [switchLogs, setSwitchLogs] = useState([]);

  const [switchWizardOpen, setSwitchWizardOpen] = useState(false);
  const [wizardInitialMode, setWizardInitialMode] = useState("switch");
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [viewYearModal, setViewYearModal] = useState(null);

  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [reactivateReason, setReactivateReason] = useState("");
  const [reactivateConfirmed, setReactivateConfirmed] = useState(false);
  const [reactivateSubmitting, setReactivateSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ctxRes = await api.getAcademicYearContext();
      const ctx = ctxRes?.data ?? null;
      setContext(ctx);
      if (ctx?.activeYear) {
        setActiveYearSnapshot(ctx.activeYear);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load academic year data.");
      setContext(null);
    }

    try {
      const logs = await api.getAcademicYearSwitchLogs(20);
      setSwitchLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      setSwitchLogs([]);
      toast.warn("Could not load switch history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ALLOWED_ROLES.includes(role)) {
      navigate("/unauthorized", { replace: true });
      return;
    }
    loadData();
  }, [role, navigate, loadData]);

  const activeYear = context?.activeYear ?? null;
  const archivedYears = context?.archivedYears ?? [];
  const permissions = context?.permissions ?? {};

  const openSwitchWizard = (mode = "switch") => {
    setWizardInitialMode(mode);
    setSwitchWizardOpen(true);
  };

  const handleWizardSuccess = async (result, mode) => {
    const yearName =
      result?.activeYear?.name ||
      (mode === "switch" ? "selected year" : "new academic year");
    toast.success(`Academic year switched to ${yearName}`);
    await loadData();
    navigate("/admin");
  };

  const closeReactivateModal = () => {
    setReactivateModalOpen(false);
    setReactivateTarget(null);
    setReactivateReason("");
    setReactivateConfirmed(false);
  };

  const handleReactivate = async () => {
    if (!reactivateReason.trim()) {
      toast.error("A reason is required to reactivate an archived year.");
      return;
    }
    if (!reactivateConfirmed) {
      toast.error("Please confirm the reactivation.");
      return;
    }
    setReactivateSubmitting(true);
    try {
      const result = await api.reactivateAcademicYear(
        reactivateTarget.id,
        reactivateReason.trim()
      );
      toast.success(
        result?.message ||
          `${reactivateTarget.name} is now the active academic year.`
      );
      if (result?.activeYear) {
        notifyActiveYearChanged({ ...result.activeYear, isWritable: true });
      }
      closeReactivateModal();
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to reactivate academic year.");
    } finally {
      setReactivateSubmitting(false);
    }
  };

  const openReactivate = (year) => {
    setReactivateTarget(year);
    setReactivateReason("");
    setReactivateConfirmed(false);
    setReactivateModalOpen(true);
  };

  if (!ALLOWED_ROLES.includes(role)) {
    return null;
  }

  return (
    <SideTop>
      <div className="ay-mgmt-page">
        <header className="ay-mgmt-header">
          <h1 className="ay-mgmt-title">Academic Year Management</h1>
          <p className="ay-mgmt-subtitle">
            Manage the active academic year, switch between years, and review
            history.
            {role === "Admin1" && " As Admin1 you can reactivate archived years for corrections."}
            {role === "Admin3" && " As Admin3 you can switch years or start a new year."}
          </p>
        </header>

        {loading ? (
          <div className="ay-loading">Loading academic year data…</div>
        ) : (
          <>
            <section className="ay-active-banner">
              <div className="ay-active-banner-top">
                <div>
                  <span className="ay-active-label">
                    <FaCheckCircle /> Current Active Year
                  </span>
                  {activeYear ? (
                    <>
                      <h2 className="ay-active-name">{activeYear.name}</h2>
                      <p className="ay-active-dates">
                        {formatDate(activeYear.start_date)} —{" "}
                        {formatDate(activeYear.end_date)}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="ay-active-name">No active year</h2>
                      <p className="ay-active-dates">
                        Create or activate an academic year to begin data entry.
                      </p>
                    </>
                  )}
                </div>
                {permissions.canSwitch || permissions.canRollover ? (
                  <div className="ay-active-actions">
                    {permissions.canSwitch && (
                      <button
                        type="button"
                        className="ay-btn ay-btn-primary-light"
                        onClick={() => openSwitchWizard("switch")}
                      >
                        <FaExchangeAlt /> Switch Year
                      </button>
                    )}
                    {permissions.canRollover && (
                      <button
                        type="button"
                        className="ay-btn ay-btn-outline-light"
                        onClick={() => openSwitchWizard("create")}
                      >
                        <FaPlus /> Start New Year
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="ay-section">
              <div className="ay-section-header">
                <h2 className="ay-section-title">Archived Years</h2>
                <span className="ay-section-count">{archivedYears.length}</span>
              </div>
              <div className="ay-table-wrap">
                {archivedYears.length === 0 ? (
                  <div className="ay-empty">No archived academic years yet.</div>
                ) : (
                  <table className="ay-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Switched On</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedYears.map((year) => (
                        <tr key={year.id}>
                          <td>{year.name}</td>
                          <td>{formatDate(year.start_date)}</td>
                          <td>{formatDate(year.end_date)}</td>
                          <td>
                            {formatDateTime(
                              year.reactivated_at || year.switched_at
                            )}
                          </td>
                          <td>
                            <span className="ay-badge ay-badge-archived">
                              Read-only
                            </span>
                          </td>
                          <td>
                            <div className="ay-row-actions">
                              <button
                                type="button"
                                className="ay-btn ay-btn-secondary ay-btn-sm"
                                onClick={() => setViewYearModal(year)}
                              >
                                View Data
                              </button>
                              {permissions.canReactivate && (
                                <button
                                  type="button"
                                  className="ay-btn ay-btn-primary ay-btn-sm"
                                  onClick={() => openReactivate(year)}
                                >
                                  <FaUndo /> Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="ay-section">
              <div className="ay-section-header">
                <h2 className="ay-section-title">
                  <FaHistory style={{ marginRight: 8 }} />
                  Recent Switch Log
                </h2>
                <span className="ay-section-count">{switchLogs.length}</span>
              </div>
              <div className="ay-table-wrap">
                {switchLogs.length === 0 ? (
                  <div className="ay-empty">No switch activity recorded yet.</div>
                ) : (
                  <table className="ay-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                        <th>From</th>
                        <th>To</th>
                        <th>By</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {switchLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{formatDateTime(log.performed_at)}</td>
                          <td>
                            <span className={actionBadgeClass(log.action)}>
                              {log.action}
                            </span>
                          </td>
                          <td>{log.fromYear?.name || "—"}</td>
                          <td>{log.toYear?.name || "—"}</td>
                          <td>{log.performedBy || "—"}</td>
                          <td>{log.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        <SwitchYearWizard
          open={switchWizardOpen}
          onClose={() => setSwitchWizardOpen(false)}
          activeYear={activeYear}
          archivedYears={archivedYears}
          initialMode={wizardInitialMode}
          onSuccess={handleWizardSuccess}
        />

        {/* Reactivate modal (Admin1) */}
        <Modal
          open={reactivateModalOpen}
          title="Reactivate Archived Year"
          onClose={closeReactivateModal}
          footer={
            <>
              <button
                type="button"
                className="ay-btn ay-btn-secondary"
                onClick={closeReactivateModal}
                disabled={reactivateSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ay-btn ay-btn-danger"
                onClick={handleReactivate}
                disabled={reactivateSubmitting}
              >
                {reactivateSubmitting ? "Reactivating…" : "Reactivate Year"}
              </button>
            </>
          }
        >
          {reactivateTarget && (
            <>
              <div className="ay-warning-box">
                Reactivating <strong>{reactivateTarget.name}</strong> will archive
                the current active year
                {activeYear ? ` (${activeYear.name})` : ""}. Only one year can be
                active at a time. Use this for corrections only.
              </div>
              <div className="ay-form-group">
                <label htmlFor="reactivate-reason">Reason (required)</label>
                <textarea
                  id="reactivate-reason"
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="Explain why this year must be reactivated"
                  required
                />
              </div>
              <label className="ay-confirm-check">
                <input
                  type="checkbox"
                  checked={reactivateConfirmed}
                  onChange={(e) => setReactivateConfirmed(e.target.checked)}
                />
                I confirm this reactivation is necessary and understand the current
                active year will be archived.
              </label>
            </>
          )}
        </Modal>

        {/* View archived year details */}
        <Modal
          open={!!viewYearModal}
          title="Archived Year Details"
          onClose={() => setViewYearModal(null)}
          footer={
            <button
              type="button"
              className="ay-btn ay-btn-secondary"
              onClick={() => setViewYearModal(null)}
            >
              Close
            </button>
          }
        >
          {viewYearModal && (
            <>
              <p>
                <strong>{viewYearModal.name}</strong> is archived and read-only.
              </p>
              <p>
                Period: {formatDate(viewYearModal.start_date)} —{" "}
                {formatDate(viewYearModal.end_date)}
              </p>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: 12 }}>
                To view marks, students, or report cards for this year, use the
                academic year filter in those modules (historical view).
              </p>
            </>
          )}
        </Modal>
      </div>
    </SideTop>
  );
}
