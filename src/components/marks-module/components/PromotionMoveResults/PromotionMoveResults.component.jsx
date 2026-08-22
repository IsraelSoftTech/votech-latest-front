import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { FaExclamationTriangle, FaArrowCircleUp } from "react-icons/fa";
import api from "../../utils/api";
import DataTable from "../DataTable/DataTable.component";
import "./PromotionMoveResults.styles.css";

export const DECISION_LABELS = {
  promoted: "Promoted",
  promoted_on_condition: "Promoted on Condition",
  failed: "Failed / Repeating",
};

/**
 * Full results for one completed promotion move: stats cards plus a
 * searchable, sortable, filterable student list with the reasons behind
 * each decision. Shared between the History page and the "just finished"
 * state on the Run page so both show the same thing.
 */
export const PromotionMoveResults = ({
  runId,
  moveId,
  onPromoteConditionally,
  canOverride = false,
  refreshToken = 0,
}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/promotions/runs/${runId}/moves/${moveId}/students`)
      .then((res) => {
        if (!cancelled) setStudents(res?.data?.data?.students || []);
      })
      .catch((err) => {
        console.error("Failed to load move results:", err);
        toast.error("Failed to load promotion results");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, moveId, refreshToken]);

  const stats = useMemo(() => {
    const promoted = students.filter((s) => s.decision === "promoted").length;
    const onCondition = students.filter(
      (s) => s.decision === "promoted_on_condition"
    ).length;
    const failed = students.filter((s) => s.decision === "failed").length;
    const incomplete = students.filter((s) => s.has_incomplete_data).length;
    return { total: students.length, promoted, onCondition, failed, incomplete };
  }, [students]);

  const tableData = students.map((s) => ({
    id: s.student_id,
    name: s.name,
    registration_number: s.registration_number,
    overall_average: s.overall_average,
    decisionLabel: DECISION_LABELS[s.decision] || s.decision,
    decision: s.decision,
    reasons:
      s.detail_snapshot?.reasons?.length > 0
        ? s.detail_snapshot.reasons.join("; ")
        : s.decision === "promoted"
        ? "Met all promotion requirements"
        : "",
    was_overridden: s.was_overridden,
    has_incomplete_data: s.has_incomplete_data,
    _raw: s,
  }));

  if (loading) {
    return (
      <div className="promo-results-skeleton">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-block" />
      </div>
    );
  }

  return (
    <div className="promo-results">
      <div className="promo-results-stats">
        <div className="promo-results-stat">
          <span className="promo-results-stat-value">{stats.total}</span>
          <span className="promo-results-stat-label">Total</span>
        </div>
        <div className="promo-results-stat good">
          <span className="promo-results-stat-value">{stats.promoted}</span>
          <span className="promo-results-stat-label">Promoted</span>
        </div>
        <div className="promo-results-stat warn">
          <span className="promo-results-stat-value">{stats.onCondition}</span>
          <span className="promo-results-stat-label">On Condition</span>
        </div>
        <div className="promo-results-stat bad">
          <span className="promo-results-stat-value">{stats.failed}</span>
          <span className="promo-results-stat-label">Repeating</span>
        </div>
        {stats.incomplete > 0 && (
          <div className="promo-results-stat warn">
            <span className="promo-results-stat-value">{stats.incomplete}</span>
            <span className="promo-results-stat-label">Incomplete Data</span>
          </div>
        )}
      </div>

      <DataTable
        columns={[
          { label: "Student", accessor: "name" },
          { label: "Reg. No.", accessor: "registration_number" },
          { label: "Average", accessor: "overall_average" },
          { label: "Outcome", accessor: "decisionLabel" },
          { label: "Reason", accessor: "reasons", sortable: false },
        ]}
        data={tableData}
        filterCategories={Object.values(DECISION_LABELS)}
        loading={false}
        limit={10}
        onEdit={() => {}}
        onDelete={() => {}}
        editRoles={[]}
        deleteRoles={[]}
        extraActions={
          canOverride
            ? [
                {
                  icon: <FaArrowCircleUp />,
                  title: "Promote Conditionally",
                  isVisible: (row) => row.decision === "failed",
                  onClick: (row) => onPromoteConditionally?.(row._raw),
                },
              ]
            : []
        }
      />

      {stats.incomplete > 0 && (
        <p className="promo-results-incomplete-note">
          <FaExclamationTriangle /> {stats.incomplete} student(s) had incomplete
          mark data when this decision was computed, check the Reason column.
        </p>
      )}
    </div>
  );
};

export default PromotionMoveResults;
