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
import { ServerListControls } from "../../components/ServerListControls/ServerListControls.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import "./PromotionHistory.styles.css";

const RUN_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "interrupted", label: "Interrupted" },
  { value: "failed", label: "Failed" },
];

const RUN_SORT_OPTIONS = [
  { value: "id", label: "Run #" },
  { value: "initiated_at", label: "Date" },
  { value: "status", label: "Status" },
  { value: "scope", label: "Scope" },
];

// A split move (Orientation-style fan-out) has no single destination_class,
// the backend attaches a per-destination count breakdown instead.
const formatMoveDestination = (move) => {
  if (move.is_graduation) return "Graduating";
  if (move.destination_class) return move.destination_class.name;
  if (move.destination_breakdown && move.destination_breakdown.length > 0) {
    return move.destination_breakdown
      .map((d) => `${d.class_name} (${d.count})`)
      .join(", ");
  }
  return "Multiple classes/departments";
};

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

  // Search/filter/sort/pagination is all server-side (see listRuns in
  // promotion.controller.js) — history can grow to cover years of runs,
  // so this never loads more than one page's worth into the browser.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", sortBy, sortDir });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/promotions/runs?${params.toString()}`);
      setRuns(res?.data?.data?.runs || []);
      setPagination(res?.data?.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("Failed to load promotion history:", err);
      toast.error("Failed to load promotion history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortDir, search, statusFilter]);

  // Reset to page 1 whenever the search/filter/sort criteria change, a
  // stale page number from a previous filter could otherwise point past
  // the end of the new, smaller result set.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sortBy, sortDir]);

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

  return (
      <div className="promo-hist-page">
        <PageHeader title="Promotion History" />

        <ServerListControls
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by class, scope, status, or run #..."
          statusOptions={RUN_STATUS_OPTIONS}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          sortOptions={RUN_SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          loading={loading}
        />

        {loading && runs.length === 0 ? (
          <div className="promo-hist-skeleton">
            <div className="skeleton-line wide" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        ) : runs.length === 0 ? (
          <EmptyState title="No promotion runs match these filters." />
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
            {formatMoveDestination(move)}
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
