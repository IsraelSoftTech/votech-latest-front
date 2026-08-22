import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaUndo,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaUserGraduate,
  FaArrowCircleUp,
} from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api from "../../utils/api";
import Modal from "../../components/Modal/Modal.component";
import { PromotionMoveResults } from "../../components/PromotionMoveResults/PromotionMoveResults.component";
import "./PromotionHistory.styles.css";

export const PromotionHistoryPage = () => {
  useRestrictTo("Admin3");

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { runId, moveId, message }
  const [reversing, setReversing] = useState(null); // moveId currently reversing
  const [overrideTarget, setOverrideTarget] = useState(null); // { runId, moveId, studentPromotion }
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/promotions/runs");
      setRuns(res?.data?.data || []);
    } catch (err) {
      console.error("Failed to load promotion history:", err);
      toast.error("Failed to load promotion history");
    } finally {
      setLoading(false);
    }
  };

  const attemptReverse = async (runId, moveId, confirmDespiteDownstreamMarks = false) => {
    setReversing(moveId);
    try {
      const res = await api.post(
        `/promotions/runs/${runId}/moves/${moveId}/reverse`,
        confirmDespiteDownstreamMarks ? { confirmDespiteDownstreamMarks: true } : {}
      );
      if (res?.data?.data?.requiresConfirmation) {
        setConfirmState({ runId, moveId, message: res.data.data.message });
        setReversing(null);
        return;
      }
      toast.success("Promotion move reversed");
      setConfirmState(null);
      fetchRuns();
      setRefreshToken((t) => t + 1);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to reverse promotion"
      );
    } finally {
      setReversing(null);
    }
  };

  const submitOverride = async () => {
    if (!overrideTarget) return;
    setOverriding(true);
    try {
      const { runId, moveId, studentPromotion } = overrideTarget;
      await api.post(
        `/promotions/runs/${runId}/moves/${moveId}/students/${studentPromotion.id}/override`,
        { reason: overrideReason || undefined }
      );
      toast.success(`${studentPromotion.name} promoted on condition`);
      setOverrideTarget(null);
      setOverrideReason("");
      setRefreshToken((t) => t + 1);
      fetchRuns();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to override this student's outcome"
      );
    } finally {
      setOverriding(false);
    }
  };

  if (loading) {
    return (
        <div className="promo-hist-page">
          <div className="promo-hist-skeleton">
            <div className="skeleton-line wide" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        </div>
    );
  }

  return (
      <div className="promo-hist-page">
        <h1 className="promo-hist-title">Promotion History</h1>

        {runs.length === 0 ? (
          <div className="promo-hist-empty">No promotion runs yet.</div>
        ) : (
          <div className="promo-hist-list">
            {runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                expanded={expandedRunId === run.id}
                onToggle={() =>
                  setExpandedRunId(expandedRunId === run.id ? null : run.id)
                }
                onReverse={(moveId) => attemptReverse(run.id, moveId)}
                reversing={reversing}
                onPromoteConditionally={(moveId, studentPromotion) =>
                  setOverrideTarget({ runId: run.id, moveId, studentPromotion })
                }
                refreshToken={refreshToken}
              />
            ))}
          </div>
        )}

        <Modal
          isOpen={!!confirmState}
          onClose={() => setConfirmState(null)}
          title="Confirm Reversal"
        >
          {confirmState && (
            <div className="promo-hist-confirm-modal">
              <p>
                <FaExclamationTriangle className="promo-hist-confirm-icon" />{" "}
                {confirmState.message}
              </p>
              <div className="promo-hist-confirm-actions">
                <button
                  type="button"
                  className="promo-hist-btn-secondary"
                  onClick={() => setConfirmState(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="promo-hist-btn-danger"
                  onClick={() =>
                    attemptReverse(confirmState.runId, confirmState.moveId, true)
                  }
                >
                  Reverse Anyway
                </button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={!!overrideTarget}
          onClose={() => {
            setOverrideTarget(null);
            setOverrideReason("");
          }}
          title="Promote Conditionally"
        >
          {overrideTarget && (
            <div className="promo-hist-confirm-modal">
              <p className="promo-override-student-name">
                {overrideTarget.studentPromotion.name}
              </p>
              <div className="promo-override-transition">
                <span className="promo-override-pill from">Repeating</span>
                <span className="promo-override-arrow">→</span>
                <span className="promo-override-pill to">
                  <FaArrowCircleUp /> Promoted on Condition
                </span>
              </div>
              <p className="promo-override-explainer">
                They will move into this move's destination class instead of
                repeating.
              </p>
              <textarea
                className="promo-hist-reason-input"
                placeholder="Reason (optional, kept in the audit trail)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
              <div className="promo-hist-confirm-actions">
                <button
                  type="button"
                  className="promo-hist-btn-secondary"
                  onClick={() => {
                    setOverrideTarget(null);
                    setOverrideReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="promo-hist-btn-promote"
                  disabled={overriding}
                  onClick={submitOverride}
                >
                  {overriding ? "Saving..." : "Promote Conditionally"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
  );
};

const RunCard = ({
  run,
  expanded,
  onToggle,
  onReverse,
  reversing,
  onPromoteConditionally,
  refreshToken,
}) => {
  const moves = run.moves || [];
  const totalDecisions = moves.reduce((acc, m) => acc + (m.processed_students || 0), 0);

  return (
    <div className="promo-hist-run-card">
      <button type="button" className="promo-hist-run-header" onClick={onToggle}>
        <div className="promo-hist-run-header-left">
          <span className={`promo-hist-status-pill ${run.status}`}>{run.status}</span>
          <span className="promo-hist-run-title">
            {run.academic_year_from?.name} to {run.academic_year_to?.name}, {run.scope}
          </span>
        </div>
        <div className="promo-hist-run-header-right">
          <span className="promo-hist-run-meta">
            {totalDecisions} student{totalDecisions === 1 ? "" : "s"},{" "}
            {new Date(run.initiated_at).toLocaleString()}
          </span>
          {run.interruption_count > 0 && (
            <span className="promo-hist-interrupted-pill">
              auto-resumed ×{run.interruption_count}
            </span>
          )}
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </button>

      {expanded && (
        <div className="promo-hist-moves">
          {moves.map((move) => (
            <MoveRow
              key={move.id}
              runId={run.id}
              move={move}
              onReverse={onReverse}
              reversing={reversing}
              onPromoteConditionally={onPromoteConditionally}
              refreshToken={refreshToken}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MoveRow = ({
  runId,
  move,
  onReverse,
  reversing,
  onPromoteConditionally,
  refreshToken,
}) => {
  const [studentsOpen, setStudentsOpen] = useState(false);

  return (
    <div className="promo-hist-move-block">
      <div className="promo-hist-move-row">
        <div className="promo-hist-move-info">
          <span className="promo-hist-move-classes">
            {move.source_class?.name}
            {" to "}
            {move.is_graduation ? "Graduating" : move.destination_class?.name}
          </span>
          <span className={`promo-hist-move-status ${move.status}`}>
            {move.status}, {move.processed_students}/{move.total_students}
          </span>
        </div>
        <div className="promo-hist-move-actions">
          {(move.status === "completed" || move.status === "interrupted") &&
            move.processed_students > 0 && (
              <button
                type="button"
                className="promo-hist-view-students-btn"
                onClick={() => setStudentsOpen((v) => !v)}
              >
                <FaUserGraduate />{" "}
                {studentsOpen ? "Hide Students" : "View Students"}
              </button>
            )}
          {move.status === "completed" && (
            <button
              type="button"
              className="promo-hist-reverse-btn"
              disabled={reversing === move.id}
              onClick={() => onReverse(move.id)}
            >
              <FaUndo /> {reversing === move.id ? "Reversing..." : "Reverse"}
            </button>
          )}
          {move.status === "reversed" && (
            <span className="promo-hist-reversed-note">
              Reversed{" "}
              {move.reversed_at ? new Date(move.reversed_at).toLocaleString() : ""}
            </span>
          )}
        </div>
      </div>

      {studentsOpen && (
        <div className="promo-hist-students">
          <PromotionMoveResults
            runId={runId}
            moveId={move.id}
            refreshToken={refreshToken}
            canOverride={move.status === "completed"}
            onPromoteConditionally={(studentPromotion) =>
              onPromoteConditionally(move.id, studentPromotion)
            }
          />
        </div>
      )}
    </div>
  );
};

export default PromotionHistoryPage;
