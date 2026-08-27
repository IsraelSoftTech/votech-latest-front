import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import {
  FaGraduationCap,
  FaExclamationTriangle,
  FaWifi,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowCircleUp,
} from "react-icons/fa";
import Select from "react-select";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import { usePromotionSocket } from "../../../../hooks/usePromotionSocket";
import api, { headers, subBaseURL } from "../../utils/api";
import DataTable from "../../components/DataTable/DataTable.component";
import Modal from "../../components/Modal/Modal.component";
import { PromotionMoveResults } from "../../components/PromotionMoveResults/PromotionMoveResults.component";
import { RosterAssignmentModal } from "../../components/RosterAssignmentModal/RosterAssignmentModal.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import "./PromotionRun.styles.css";

const CONFIRM_DELAY_SECONDS = 5;
const POLL_INTERVAL_MS = 4000;

const DECISION_LABELS = {
  promoted: "Promoted",
  promoted_on_condition: "Promoted on Condition",
  failed: "Failed / Repeats",
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.details ||
  err?.message ||
  fallback;

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

// promotedClasses only means "there's a non-reversed move for this class"
// (pending/running/failed all block starting a new one, same as
// completed) — but "already promoted" as a message is only true once that
// move has actually finished. A class stuck mid-run or one whose move
// failed still needs a distinct, honest label, not the same "reverse to
// redo" text as a genuinely completed one.
const PROMOTED_STATUS_TEXT = {
  completed: { short: "already promoted", hint: "Already promoted, reverse on History tab to redo" },
  running: { short: "promotion in progress", hint: "Currently running — check the History tab" },
  pending: { short: "queued in active run", hint: "Queued in the active run — check the History tab" },
  failed: { short: "previous attempt failed", hint: "Previous attempt failed — check the History tab" },
};

function promotionStatusText(entry) {
  return (
    PROMOTED_STATUS_TEXT[entry?.status] || {
      short: "already has a promotion move",
      hint: "Already has a promotion move — check the History tab",
    }
  );
}

export const PromotionRunPage = () => {
  useRestrictTo("Admin3");

  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [promotedClasses, setPromotedClasses] = useState(new Map()); // class_id -> {move_id, status}
  const [loading, setLoading] = useState(true);
  // class_id -> { promotion_mode: "single"|"split", decision_mode: "automatic"|"manual" }
  const [requirementModes, setRequirementModes] = useState({});

  const [scope, setScope] = useState("class");
  const [toYearId, setToYearId] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedSourceClassId, setSelectedSourceClassId] = useState(null);
  const [manualAverageOverride, setManualAverageOverride] = useState("");

  // Split/manual roster (Orientation-style fan-out classes, and classes
  // whose real result is a national exam not tracked here), only relevant
  // for the "class"/"manual" scope's single source class.
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [manualDecisions, setManualDecisions] = useState({}); // { student_id: decision }
  const [destinationOverrides, setDestinationOverrides] = useState({}); // { student_id: destination_class_id }
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  // A manual class's decisions default to the computed recommendation,
  // which is explicitly NOT authoritative, that's the whole reason the
  // class is flagged manual. Never let a run start on those defaults
  // without the admin actually opening and confirming the roster at least
  // once for this class.
  const [rosterReviewed, setRosterReviewed] = useState(false);

  // department/school scope: { [source_class_id]: { destination_class_id, is_graduation } }
  const [moveConfig, setMoveConfig] = useState({});
  const [singleGraduation, setSingleGraduation] = useState(false);
  const [singleDestinationId, setSingleDestinationId] = useState(null);

  const [step, setStep] = useState("setup"); // setup | previewing | review | starting | running | done
  const [previewResults, setPreviewResults] = useState([]); // [{move, data}]
  const [countdown, setCountdown] = useState(CONFIRM_DELAY_SECONDS);
  const [run, setRun] = useState(null);
  const [runError, setRunError] = useState(null);
  const [overrideTarget, setOverrideTarget] = useState(null); // { moveId, studentPromotion }
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [resultsRefreshToken, setResultsRefreshToken] = useState(0);

  const countdownTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [yearsRes, deptRes, classesRes] = await Promise.all([
        api.get("/academic-years"),
        fetch(`${subBaseURL}/specialties`, { headers: headers() }),
        api.get("/classes"),
      ]);
      setAcademicYears(yearsRes?.data?.data || []);
      setDepartments(await deptRes.json());
      setClasses(classesRes?.data?.data || []);
    } catch (err) {
      console.error("Error loading promotion run data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const activeYear = useMemo(
    () => academicYears.find((y) => y.status === "active"),
    [academicYears]
  );

  const classesById = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes]
  );

  useEffect(() => {
    if (!activeYear) return;
    api
      .get(
        `/promotions/promoted-classes?academic_year_from_id=${activeYear.id}`
      )
      .then((res) => {
        const map = new Map();
        (res?.data?.data || []).forEach((row) => {
          map.set(row.class_id, { moveId: row.move_id, status: row.status });
        });
        setPromotedClasses(map);
      })
      .catch((err) => {
        console.error("Failed to load already-promoted classes:", err);
      });
  }, [activeYear]);

  useEffect(() => {
    if (!activeYear) return;
    api
      .get(`/promotion-requirements?academic_year_id=${activeYear.id}`)
      .then((res) => {
        const map = {};
        (res?.data?.data || []).forEach((r) => {
          map[r.class_id] = {
            promotion_mode: r.promotion_mode || "single",
            decision_mode: r.decision_mode || "automatic",
          };
        });
        setRequirementModes(map);
      })
      .catch((err) => {
        console.error("Failed to load promotion requirement modes:", err);
      });
  }, [activeYear]);

  const selectedMode = requirementModes[selectedSourceClassId] || {};
  const isSplitClass = selectedMode.promotion_mode === "split";
  const isManualClass = selectedMode.decision_mode === "manual";
  const needsRoster =
    (scope === "class" || scope === "manual") &&
    (isSplitClass || isManualClass);

  // Selecting a different source class invalidates whatever roster/manual
  // picks were in progress for the previous one.
  useEffect(() => {
    setRosterData(null);
    setManualDecisions({});
    setDestinationOverrides({});
    setRosterModalOpen(false);
    setRosterReviewed(false);
  }, [selectedSourceClassId]);

  const openRosterModal = () => {
    setRosterModalOpen(true);
    setRosterReviewed(true);
  };

  useEffect(() => {
    if (!needsRoster || !selectedSourceClassId || !toYearId || !activeYear) {
      return;
    }
    // A split class has no single destination to require, everything else
    // still needs one before the roster's recommendations mean anything.
    if (!isSplitClass && !singleGraduation && !singleDestinationId) {
      setRosterData(null);
      return;
    }
    setRosterLoading(true);
    api
      .post("/promotions/preview", {
        source_class_id: selectedSourceClassId,
        academic_year_from_id: activeYear.id,
        academic_year_to_id: toYearId,
        destination_class_id: isSplitClass ? undefined : singleDestinationId,
        is_graduation: isSplitClass ? false : singleGraduation,
      })
      .then((res) => {
        const data = res?.data?.data;
        setRosterData(data);
        if (isManualClass) {
          setManualDecisions((prev) => {
            const seeded = { ...prev };
            (data?.results || []).forEach((r) => {
              if (seeded[r.student_id] === undefined)
                seeded[r.student_id] = r.decision;
            });
            return seeded;
          });
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load this class's roster"));
        setRosterData(null);
      })
      .finally(() => setRosterLoading(false));
  }, [
    needsRoster,
    selectedSourceClassId,
    toYearId,
    isSplitClass,
    isManualClass,
    singleDestinationId,
    singleGraduation,
    activeYear,
  ]);

  const departmentClasses = (departmentId) =>
    classes.filter((c) => c.department_id === departmentId);

  const sameDepartmentDestinations = (sourceClassId) => {
    const sourceClass = classes.find((c) => c.id === sourceClassId);
    if (!sourceClass) return [];
    return classes.filter(
      (c) =>
        c.department_id === sourceClass.department_id && c.id !== sourceClassId
    );
  };

  // A student's effective decision: the admin's manual pick for a manual
  // class, otherwise whatever the roster's automatic computation says.
  const effectiveDecisionFor = (studentId) =>
    isManualClass
      ? manualDecisions[studentId]
      : rosterData?.results?.find((r) => r.student_id === studentId)?.decision;

  const rosterPromotedIds = (rosterData?.results || [])
    .filter((r) => effectiveDecisionFor(r.student_id) !== "failed")
    .map((r) => r.student_id);

  const rosterMissingDecisions = isManualClass
    ? (rosterData?.results || []).filter((r) => !manualDecisions[r.student_id])
    : [];
  const rosterMissingDestinations = isSplitClass
    ? rosterPromotedIds.filter((id) => !destinationOverrides[id])
    : [];

  const rosterComplete =
    !needsRoster ||
    (!!rosterData &&
      rosterMissingDecisions.length === 0 &&
      rosterMissingDestinations.length === 0 &&
      (!isManualClass || rosterReviewed));

  // ── Build the moves this run will attempt, from current setup state ──
  const buildMoves = () => {
    if (scope === "class" || scope === "manual") {
      if (!selectedSourceClassId) return [];

      if (needsRoster) {
        if (!rosterComplete) return [];
        return [
          {
            source_class_id: selectedSourceClassId,
            destination_class_id: isSplitClass
              ? null
              : singleGraduation
              ? null
              : singleDestinationId,
            is_graduation: isSplitClass ? false : singleGraduation,
            manual_decisions: isManualClass ? manualDecisions : undefined,
            destination_overrides: isSplitClass
              ? destinationOverrides
              : undefined,
          },
        ];
      }

      if (!singleGraduation && !singleDestinationId) return [];
      return [
        {
          source_class_id: selectedSourceClassId,
          destination_class_id: singleGraduation ? null : singleDestinationId,
          is_graduation: singleGraduation,
          manual_average_override:
            scope === "manual" && manualAverageOverride !== ""
              ? Number(manualAverageOverride)
              : undefined,
        },
      ];
    }

    const sourceClasses =
      scope === "department"
        ? departmentClasses(selectedDepartmentId)
        : classes;

    return sourceClasses
      .map((cls) => {
        const cfg = moveConfig[cls.id];
        if (!cfg) return null;
        if (!cfg.is_graduation && !cfg.destination_class_id) return null;
        return {
          source_class_id: cls.id,
          destination_class_id: cfg.is_graduation
            ? null
            : cfg.destination_class_id,
          is_graduation: !!cfg.is_graduation,
        };
      })
      .filter(Boolean);
  };

  const moves = buildMoves();

  const setMoveDestination = (classId, destinationClassId) => {
    setMoveConfig((prev) => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        destination_class_id: destinationClassId,
        is_graduation: false,
      },
    }));
  };
  const setMoveGraduation = (classId, isGraduation) => {
    setMoveConfig((prev) => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        is_graduation: isGraduation,
        destination_class_id: null,
      },
    }));
  };

  // A split/manual class can't be part of a bulk department/school run,
  // jump straight to "One Class" scope with it preselected instead of just
  // telling the admin to go find it themselves.
  const handleIndividually = (classId) => {
    setScope("class");
    setSelectedSourceClassId(classId);
    setSingleDestinationId(null);
    setSingleGraduation(false);
  };

  // ── Preview ──
  const runPreview = async () => {
    if (!activeYear) {
      toast.error("No active academic year found");
      return;
    }
    if (!toYearId) {
      toast.error("Select the academic year students are being promoted into");
      return;
    }
    if (moves.length === 0) {
      toast.error("Configure at least one destination before previewing");
      return;
    }

    setStep("previewing");
    const results = [];
    try {
      for (const move of moves) {
        const res = await api.post("/promotions/preview", {
          ...move,
          academic_year_from_id: activeYear.id,
          academic_year_to_id: toYearId,
        });
        let data = res?.data?.data;

        // A split/manual move's real outcome is whatever the admin picked
        // in the roster, not the server's recomputed recommendation, merge
        // that in so the review step (and the eventual run) shows the same
        // thing the admin actually chose.
        if (move.manual_decisions || move.destination_overrides) {
          const mergedResults = (data?.results || []).map((r) => {
            const decision = move.manual_decisions
              ? move.manual_decisions[r.student_id] || r.decision
              : r.decision;
            const destId = move.destination_overrides
              ? move.destination_overrides[r.student_id]
              : null;
            return {
              ...r,
              decision,
              destinationName: destId
                ? classesById.get(Number(destId))?.name
                : null,
            };
          });
          data = {
            ...data,
            results: mergedResults,
            summary: {
              total: mergedResults.length,
              promoted: mergedResults.filter((r) => r.decision === "promoted")
                .length,
              promoted_on_condition: mergedResults.filter(
                (r) => r.decision === "promoted_on_condition"
              ).length,
              failed: mergedResults.filter((r) => r.decision === "failed")
                .length,
              incomplete_data_count: mergedResults.filter(
                (r) => r.has_incomplete_data
              ).length,
            },
            is_split: !!move.destination_overrides,
          };
        }

        results.push({ move, data });
      }
      setPreviewResults(results);
      setStep("review");
      setCountdown(CONFIRM_DELAY_SECONDS);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownTimerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to preview promotion"));
      setStep("setup");
    }
  };

  const anyBlocked = previewResults.some((r) => r.data?.blocked);

  const aggregateSummary = previewResults.reduce(
    (acc, r) => {
      const s = r.data?.summary || {};
      acc.total += s.total || 0;
      acc.promoted += s.promoted || 0;
      acc.promoted_on_condition += s.promoted_on_condition || 0;
      acc.failed += s.failed || 0;
      acc.incomplete_data_count += s.incomplete_data_count || 0;
      return acc;
    },
    {
      total: 0,
      promoted: 0,
      promoted_on_condition: 0,
      failed: 0,
      incomplete_data_count: 0,
    }
  );

  // ── Execute ──
  const confirmAndRun = async () => {
    setStep("starting");
    setRunError(null);
    try {
      const res = await api.post("/promotions/runs", {
        scope,
        academic_year_from_id: activeYear.id,
        academic_year_to_id: toYearId,
        moves,
      });
      const runId = res?.data?.data?.run_id;
      const runRes = await api.get(`/promotions/runs/${runId}`);
      setRun(runRes?.data?.data);
      setStep("running");
      startPolling(runId);
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.details ||
        err.response?.data?.message ||
        "Failed to start promotion run";
      toast.error(message);
      setRunError(message);
      setStep("review");
    }
  };

  const refreshRun = async (runId) => {
    try {
      const res = await api.get(`/promotions/runs/${runId}`);
      const data = res?.data?.data;
      setRun(data);
      if (data?.status === "completed" || data?.status === "failed") {
        setStep("done");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    } catch (err) {
      console.error("Failed to poll run status:", err);
    }
  };

  const startPolling = (runId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (!socketConnectedRef.current) {
        refreshRun(runId);
      }
    }, POLL_INTERVAL_MS);
  };

  const socketConnectedRef = useRef(false);
  const { isConnected } = usePromotionSocket({
    onProgress: () => {
      if (run?.id) refreshRun(run.id);
    },
    onCompleted: () => {
      if (run?.id) refreshRun(run.id);
    },
    onFailed: () => {
      if (run?.id) refreshRun(run.id);
    },
    onInterrupted: (payload) => {
      toast.warn(
        payload?.message ||
          "The promotion process was interrupted and has been automatically resumed."
      );
      if (run?.id) refreshRun(run.id);
    },
  });
  useEffect(() => {
    socketConnectedRef.current = isConnected;
  }, [isConnected]);

  const resetToSetup = () => {
    setStep("setup");
    setPreviewResults([]);
    setRun(null);
    setRunError(null);
  };

  const submitOverride = async () => {
    if (!overrideTarget || !run) return;
    setOverriding(true);
    try {
      const { moveId, studentPromotion } = overrideTarget;
      await api.post(
        `/promotions/runs/${run.id}/moves/${moveId}/students/${studentPromotion.id}/override`,
        { reason: overrideReason || undefined }
      );
      toast.success(`${studentPromotion.name} promoted on condition`);
      setOverrideTarget(null);
      setOverrideReason("");
      setResultsRefreshToken((t) => t + 1);
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
      <div className="promo-run-page">
        <div className="promo-run-skeleton">
          <div className="skeleton-line wide" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  return (
    <div className="promo-run-page">
      <PageHeader
        title={
          <span className="promo-run-title-inner">
            <FaGraduationCap /> Run Promotion
          </span>
        }
        actions={
          !activeYear && (
            <span className="promo-run-warning-badge">
              <FaExclamationTriangle /> No active academic year found
            </span>
          )
        }
      />

      {step === "setup" && (
        <SetupStep
          activeYear={activeYear}
          academicYears={academicYears}
          departments={departments}
          classes={classes}
          promotedClasses={promotedClasses}
          scope={scope}
          setScope={setScope}
          toYearId={toYearId}
          setToYearId={setToYearId}
          selectedDepartmentId={selectedDepartmentId}
          setSelectedDepartmentId={setSelectedDepartmentId}
          selectedSourceClassId={selectedSourceClassId}
          setSelectedSourceClassId={setSelectedSourceClassId}
          singleGraduation={singleGraduation}
          setSingleGraduation={setSingleGraduation}
          singleDestinationId={singleDestinationId}
          setSingleDestinationId={setSingleDestinationId}
          manualAverageOverride={manualAverageOverride}
          setManualAverageOverride={setManualAverageOverride}
          sameDepartmentDestinations={sameDepartmentDestinations}
          departmentClasses={departmentClasses}
          moveConfig={moveConfig}
          setMoveDestination={setMoveDestination}
          setMoveGraduation={setMoveGraduation}
          movesCount={moves.length}
          onPreview={runPreview}
          isSplitClass={isSplitClass}
          isManualClass={isManualClass}
          needsRoster={needsRoster}
          rosterData={rosterData}
          rosterLoading={rosterLoading}
          manualDecisions={manualDecisions}
          setManualDecisions={setManualDecisions}
          destinationOverrides={destinationOverrides}
          setDestinationOverrides={setDestinationOverrides}
          rosterMissingDestinations={rosterMissingDestinations}
          rosterMissingDecisions={rosterMissingDecisions}
          rosterPromotedIds={rosterPromotedIds}
          rosterComplete={rosterComplete}
          requirementModes={requirementModes}
          onHandleIndividually={handleIndividually}
          rosterModalOpen={rosterModalOpen}
          setRosterModalOpen={setRosterModalOpen}
          openRosterModal={openRosterModal}
          rosterReviewed={rosterReviewed}
        />
      )}

      {step === "previewing" && (
        <div className="promo-run-skeleton">
          <p className="promo-run-loading-text">
            Computing decisions for every student in scope…
          </p>
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      )}

      {step === "review" && (
        <ReviewStep
          previewResults={previewResults}
          anyBlocked={anyBlocked}
          aggregateSummary={aggregateSummary}
          countdown={countdown}
          onBack={resetToSetup}
          onConfirm={confirmAndRun}
          runError={runError}
          classes={classes}
          departments={departments}
        />
      )}

      {step === "starting" && (
        <div className="promo-run-skeleton">
          <p className="promo-run-loading-text">Starting the promotion run…</p>
          <div className="skeleton-block" />
        </div>
      )}

      {(step === "running" || step === "done") && run && (
        <RunProgressStep
          run={run}
          isSocketConnected={isConnected}
          isDone={step === "done"}
          onNewRun={resetToSetup}
          refreshToken={resultsRefreshToken}
          onPromoteConditionally={(moveId, studentPromotion) =>
            setOverrideTarget({ moveId, studentPromotion })
          }
        />
      )}

      <Modal
        isOpen={!!overrideTarget}
        onClose={() => {
          setOverrideTarget(null);
          setOverrideReason("");
        }}
        title="Promote Conditionally"
      >
        {overrideTarget && (
          <div className="promo-run-override-modal">
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
              className="promo-run-override-reason"
              placeholder="Reason (optional, kept in the audit trail)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
            />
            <div className="promo-run-override-actions">
              <button
                type="button"
                className="promo-run-secondary-btn"
                onClick={() => {
                  setOverrideTarget(null);
                  setOverrideReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="promo-run-primary-btn"
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

// ── Setup step ─────────────────────────────────────────────────────────

const SetupStep = ({
  activeYear,
  academicYears,
  departments,
  classes,
  promotedClasses,
  scope,
  setScope,
  toYearId,
  setToYearId,
  selectedDepartmentId,
  setSelectedDepartmentId,
  selectedSourceClassId,
  setSelectedSourceClassId,
  singleGraduation,
  setSingleGraduation,
  singleDestinationId,
  setSingleDestinationId,
  manualAverageOverride,
  setManualAverageOverride,
  sameDepartmentDestinations,
  departmentClasses,
  moveConfig,
  setMoveDestination,
  setMoveGraduation,
  movesCount,
  onPreview,
  isSplitClass,
  isManualClass,
  needsRoster,
  rosterData,
  rosterLoading,
  manualDecisions,
  setManualDecisions,
  destinationOverrides,
  setDestinationOverrides,
  rosterMissingDestinations,
  rosterMissingDecisions,
  rosterPromotedIds,
  rosterComplete,
  requirementModes,
  onHandleIndividually,
  rosterModalOpen,
  setRosterModalOpen,
  openRosterModal,
  rosterReviewed,
}) => {
  const scopeOptions = [
    { value: "class", label: "One Class" },
    { value: "department", label: "Whole Department" },
    { value: "school", label: "Whole School" },
    { value: "manual", label: "Manual (custom average)" },
  ];

  return (
    <div className="promo-run-setup">
      <div className="promo-run-info-card">
        <p>
          Promoting from <strong>{activeYear?.name || "Not set"}</strong>. Only
          one promotion run may be active at a time, and it runs in the
          background, so you can leave this page once it starts.
        </p>
      </div>

      <div className="promo-run-filters">
        <div className="promo-run-filter-group">
          <label className="promo-run-filter-label">
            Promote Into Academic Year
          </label>
          <Select
            placeholder="Select destination academic year"
            options={academicYears
              .filter((y) => y.id !== activeYear?.id)
              .map((y) => ({ value: y.id, label: y.name }))}
            value={
              toYearId
                ? {
                    value: toYearId,
                    label: academicYears.find((y) => y.id === toYearId)?.name,
                  }
                : null
            }
            onChange={(opt) => setToYearId(opt?.value || null)}
            classNamePrefix="select"
          />
        </div>

        <div className="promo-run-filter-group">
          <label className="promo-run-filter-label">Scope</label>
          <Select
            options={scopeOptions}
            value={scopeOptions.find((o) => o.value === scope)}
            onChange={(opt) => setScope(opt.value)}
            classNamePrefix="select"
          />
        </div>
      </div>

      {(scope === "class" || scope === "manual") && (
        <div className="promo-run-single-move">
          <div className="promo-run-filters">
            <div className="promo-run-filter-group">
              <label className="promo-run-filter-label">Source Class</label>
              <Select
                placeholder="Select class"
                options={classes.map((c) => ({
                  value: c.id,
                  label: promotedClasses.has(c.id)
                    ? `${c.name} (${promotionStatusText(promotedClasses.get(c.id)).short})`
                    : c.name,
                  isPromoted: promotedClasses.has(c.id),
                }))}
                isOptionDisabled={(opt) => opt.isPromoted}
                value={
                  selectedSourceClassId
                    ? {
                        value: selectedSourceClassId,
                        label: classes.find(
                          (c) => c.id === selectedSourceClassId
                        )?.name,
                      }
                    : null
                }
                onChange={(opt) => {
                  setSelectedSourceClassId(opt?.value || null);
                  setSingleDestinationId(null);
                }}
                classNamePrefix="select"
              />
              {selectedSourceClassId &&
                promotedClasses.has(selectedSourceClassId) &&
                (() => {
                  const status = promotedClasses.get(selectedSourceClassId)?.status;
                  return (
                    <p className="promo-run-already-promoted-hint">
                      {status === "completed"
                        ? "This class was already promoted out of the active year. Reverse that move on the History tab first."
                        : status === "running"
                        ? "This class's promotion is currently running. Check the History tab for progress."
                        : status === "pending"
                        ? "This class is queued in the active run. Check the History tab for progress."
                        : status === "failed"
                        ? "This class's last promotion attempt failed. Check the History tab before retrying."
                        : "This class already has a promotion move for this academic year. Check the History tab."}
                    </p>
                  );
                })()}
            </div>

            {!singleGraduation && !isSplitClass && (
              <div className="promo-run-filter-group">
                <label className="promo-run-filter-label">
                  Destination Class
                </label>
                <Select
                  placeholder="Select destination"
                  isDisabled={!selectedSourceClassId}
                  options={sameDepartmentDestinations(
                    selectedSourceClassId
                  ).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={
                    singleDestinationId
                      ? {
                          value: singleDestinationId,
                          label: classes.find(
                            (c) => c.id === singleDestinationId
                          )?.name,
                        }
                      : null
                  }
                  onChange={(opt) => setSingleDestinationId(opt?.value || null)}
                  classNamePrefix="select"
                />
              </div>
            )}

            {scope === "manual" && (
              <div className="promo-run-filter-group">
                <label className="promo-run-filter-label">
                  Custom Promotion Average (optional)
                </label>
                <input
                  type="number"
                  className="promo-run-plain-input"
                  placeholder="Leave blank to use configured requirement"
                  value={manualAverageOverride}
                  onChange={(e) => setManualAverageOverride(e.target.value)}
                />
              </div>
            )}
          </div>

          {!isSplitClass && (
            <label className="promo-run-graduation-toggle">
              <input
                type="checkbox"
                checked={singleGraduation}
                onChange={(e) => setSingleGraduation(e.target.checked)}
              />
              This is a graduating class, so promoted students leave the school
              instead of moving to another class
            </label>
          )}

          {isSplitClass && (
            <p className="promo-run-split-hint">
              This class is configured to promote students into different
              classes/departments, each promoted student needs a destination
              assigned in the roster below instead of one for the whole class.
            </p>
          )}
          {isManualClass && (
            <p className="promo-run-split-hint">
              This class's results come from a national exam not tracked here,
              recommendations below are pre-filled from internal marks, review
              and confirm before running.
            </p>
          )}

          {needsRoster && selectedSourceClassId && (
            <div className="promo-run-roster-summary">
              {rosterLoading ? (
                <p className="promo-run-roster-loading">
                  Loading roster and recommendations…
                </p>
              ) : rosterData ? (
                <>
                  <div className="promo-run-roster-summary-counts">
                    {isManualClass && (
                      <span>
                        <strong>{rosterPromotedIds.length}</strong>/
                        {rosterData.results.length} marked promoted
                      </span>
                    )}
                    {isSplitClass && (
                      <span>
                        <strong>
                          {rosterPromotedIds.length -
                            rosterMissingDestinations.length}
                        </strong>
                        /{rosterPromotedIds.length} promoted students assigned a
                        destination
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="promo-run-btn-configure-roster"
                    onClick={openRosterModal}
                  >
                    Configure Roster ({rosterData.results.length} students)
                  </button>
                </>
              ) : null}
              {isManualClass && rosterData && !rosterReviewed && (
                <p className="promo-run-roster-review-hint">
                  You must open and confirm this roster at least once before
                  running, the decisions above are only a recommendation.
                </p>
              )}
            </div>
          )}

          <RosterAssignmentModal
            isOpen={rosterModalOpen}
            onClose={() => setRosterModalOpen(false)}
            sourceClassName={
              classes.find((c) => c.id === selectedSourceClassId)?.name || ""
            }
            rosterData={rosterData}
            isSplitClass={isSplitClass}
            isManualClass={isManualClass}
            manualDecisions={manualDecisions}
            setManualDecisions={setManualDecisions}
            destinationOverrides={destinationOverrides}
            setDestinationOverrides={setDestinationOverrides}
            classes={classes}
            departments={departments}
          />
        </div>
      )}

      {(scope === "department" || scope === "school") && (
        <div className="promo-run-multi-move">
          {scope === "department" && (
            <div className="promo-run-filter-group promo-run-dept-picker">
              <label className="promo-run-filter-label">Department</label>
              <Select
                placeholder="Select department"
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                value={
                  selectedDepartmentId
                    ? {
                        value: selectedDepartmentId,
                        label: departments.find(
                          (d) => d.id === selectedDepartmentId
                        )?.name,
                      }
                    : null
                }
                onChange={(opt) => setSelectedDepartmentId(opt?.value || null)}
                classNamePrefix="select"
              />
            </div>
          )}

          {(scope === "school"
            ? classes
            : selectedDepartmentId
            ? departmentClasses(selectedDepartmentId)
            : []
          ).map((cls) => {
            const cfg = moveConfig[cls.id] || {};
            const destinations = sameDepartmentDestinations(cls.id);
            const alreadyPromoted = promotedClasses.has(cls.id);
            const mode = requirementModes[cls.id] || {};
            const needsIndividualHandling =
              !alreadyPromoted &&
              (mode.promotion_mode === "split" ||
                mode.decision_mode === "manual");
            return (
              <div key={cls.id} className="promo-run-move-row">
                <span className="promo-run-move-source">{cls.name}</span>
                <span className="promo-run-move-arrow">→</span>
                {alreadyPromoted ? (
                  <span
                    className={`promo-run-move-already-promoted promo-run-move-status-${
                      promotedClasses.get(cls.id)?.status || "unknown"
                    }`}
                  >
                    {promotionStatusText(promotedClasses.get(cls.id)).hint}
                  </span>
                ) : needsIndividualHandling ? (
                  <div className="promo-run-move-needs-individual">
                    <span>
                      {mode.promotion_mode === "split"
                        ? "Fans out into different departments"
                        : "National exam, manual selection"}
                      , can't be included in a bulk run.
                    </span>
                    <button
                      type="button"
                      className="promo-run-handle-individually-btn"
                      onClick={() => onHandleIndividually(cls.id)}
                    >
                      Handle this class now
                    </button>
                  </div>
                ) : cfg.is_graduation ? (
                  <span className="promo-run-move-graduating">Graduating</span>
                ) : (
                  <Select
                    className="promo-run-move-select"
                    placeholder="Select destination"
                    options={destinations.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={
                      cfg.destination_class_id
                        ? {
                            value: cfg.destination_class_id,
                            label: classes.find(
                              (c) => c.id === cfg.destination_class_id
                            )?.name,
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setMoveDestination(cls.id, opt?.value || null)
                    }
                    classNamePrefix="select"
                  />
                )}
                {!alreadyPromoted && !needsIndividualHandling && (
                  <label className="promo-run-move-grad-toggle">
                    <input
                      type="checkbox"
                      checked={!!cfg.is_graduation}
                      onChange={(e) =>
                        setMoveGraduation(cls.id, e.target.checked)
                      }
                    />
                    Graduating
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      {needsRoster && rosterData && !rosterComplete && (
        <p className="promo-run-roster-incomplete-hint">
          {rosterMissingDecisions.length > 0 &&
            `${rosterMissingDecisions.length} student(s) still need a decision. `}
          {rosterMissingDestinations.length > 0 &&
            `${rosterMissingDestinations.length} promoted student(s) still need a destination class. `}
          {isManualClass &&
            !rosterReviewed &&
            rosterMissingDecisions.length === 0 &&
            rosterMissingDestinations.length === 0 &&
            "Open the roster and confirm it before running."}
        </p>
      )}

      <button
        type="button"
        className="promo-run-primary-btn"
        disabled={movesCount === 0 || !toYearId}
        onClick={onPreview}
      >
        Preview{" "}
        {movesCount > 0
          ? `(${movesCount} class${movesCount > 1 ? "es" : ""})`
          : ""}
      </button>
    </div>
  );
};

// ── Review step ────────────────────────────────────────────────────────

const ReviewStep = ({
  previewResults,
  anyBlocked,
  aggregateSummary,
  countdown,
  onBack,
  onConfirm,
  runError,
  classes,
  departments,
}) => {
  const departmentNameForClass = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return "N/A";
    return departments.find((d) => d.id === cls.department_id)?.name || "N/A";
  };

  const blockedMoves = previewResults.filter(({ data }) => data?.blocked);
  const okMoves = previewResults.filter(({ data }) => !data?.blocked);

  const combinedRows = okMoves.flatMap(({ data }) =>
    (data?.results || []).map((r) => ({
      ...r,
      id: `${data.source_class.id}-${r.student_id}`,
      class: data.source_class?.name,
      department: departmentNameForClass(data.source_class?.id),
      destination:
        r.decision === "failed"
          ? `${data.source_class?.name} (repeats)`
          : data.is_graduation
          ? "Graduating"
          : r.destinationName ||
            data.destination_class?.name ||
            "Not yet assigned",
      decisionLabel: DECISION_LABELS[r.decision] || r.decision,
      notesText: [
        ...(r.reasons || []),
        r.has_incomplete_data ? "Incomplete data" : null,
      ]
        .filter(Boolean)
        .join("; "),
    }))
  );

  const distinctClasses = [...new Set(combinedRows.map((r) => r.class))].sort();
  const distinctDepartments = [
    ...new Set(combinedRows.map((r) => r.department)),
  ].sort();

  return (
    <div className="promo-run-review">
      {runError && (
        <div className="promo-run-error-banner">
          <FaExclamationTriangle /> {runError}
        </div>
      )}

      <div className="promo-run-summary-cards">
        <SummaryCard label="Total Students" value={aggregateSummary.total} />
        <SummaryCard
          label="Promoted"
          value={aggregateSummary.promoted}
          tone="good"
        />
        <SummaryCard
          label="Promoted on Condition"
          value={aggregateSummary.promoted_on_condition}
          tone="warn"
        />
        <SummaryCard
          label="Failed / Repeats"
          value={aggregateSummary.failed}
          tone="bad"
        />
        <SummaryCard
          label="Incomplete Data"
          value={aggregateSummary.incomplete_data_count}
          tone="warn"
        />
      </div>

      {okMoves
        .filter(({ move }) => move.destination_overrides)
        .map(({ move, data }, idx) => {
          const breakdown = {};
          (data.results || []).forEach((r) => {
            if (r.decision === "failed") return;
            const name = r.destinationName || "Not yet assigned";
            breakdown[name] = (breakdown[name] || 0) + 1;
          });
          return (
            <div className="promo-run-split-breakdown" key={`split-${idx}`}>
              <h4>
                {data.source_class?.name} splits into{" "}
                {Object.keys(breakdown).length} destination(s), does this match
                what you intended?
              </h4>
              <div className="promo-run-split-breakdown-list">
                {Object.entries(breakdown).map(([name, count]) => (
                  <span
                    key={name}
                    className={`promo-run-split-breakdown-chip ${
                      name === "Not yet assigned" ? "warn" : ""
                    }`}
                  >
                    <strong>{count}</strong> → {name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

      {blockedMoves.map(({ data }, idx) => (
        <div className="promo-run-move-review" key={`blocked-${idx}`}>
          <div className="promo-run-move-review-header">
            <h3>
              {data?.source_class?.name}
              {" → "}
              {data?.is_graduation
                ? "Graduating"
                : data?.destination_class?.name ||
                  "Multiple classes/departments"}
            </h3>
          </div>
          <div className="promo-run-config-error">
            <FaExclamationTriangle />
            <div>
              {data.configuration_errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          </div>
        </div>
      ))}

      {combinedRows.length > 0 && (
        <DataTable
          columns={[
            { label: "Student", accessor: "name" },
            { label: "Class", accessor: "class" },
            { label: "Department", accessor: "department" },
            { label: "Destination", accessor: "destination" },
            { label: "Reg. No.", accessor: "registration_number" },
            { label: "Average", accessor: "overall_average" },
            { label: "Decision", accessor: "decisionLabel" },
            { label: "Notes", accessor: "notesText", sortable: false },
          ]}
          data={combinedRows}
          filters={[
            {
              key: "class",
              label: "Class",
              accessor: "class",
              options: distinctClasses,
            },
            {
              key: "department",
              label: "Department",
              accessor: "department",
              options: distinctDepartments,
            },
            {
              key: "decision",
              label: "Decision",
              accessor: "decisionLabel",
              options: Object.values(DECISION_LABELS),
            },
          ]}
          onEdit={() => {}}
          onDelete={() => {}}
          editRoles={[]}
          deleteRoles={[]}
          limit={10}
        />
      )}

      <div className="promo-run-review-actions">
        <button
          type="button"
          className="promo-run-secondary-btn"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="promo-run-primary-btn promo-run-confirm-btn"
          disabled={anyBlocked || countdown > 0}
          onClick={onConfirm}
        >
          {anyBlocked
            ? "Fix configuration errors above to continue"
            : countdown > 0
            ? `Confirm & Run Promotion (${countdown})`
            : "Confirm & Run Promotion"}
        </button>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, tone }) => (
  <div className={`promo-run-summary-card ${tone || ""}`}>
    <span className="promo-run-summary-value">{value}</span>
    <span className="promo-run-summary-label">{label}</span>
  </div>
);

// ── Run progress step ────────────────────────────────────────────────

const RunProgressStep = ({
  run,
  isSocketConnected,
  isDone,
  onNewRun,
  refreshToken,
  onPromoteConditionally,
}) => {
  const moveList = Array.isArray(run.moves) ? run.moves : [];

  return (
    <div className="promo-run-progress">
      <div className="promo-run-connection-status">
        <FaWifi className={isSocketConnected ? "connected" : "disconnected"} />
        {isSocketConnected
          ? "Live updates connected"
          : "Reconnecting, showing latest polled status"}
      </div>

      <div className="promo-run-status-banner">
        {run.status === "completed" ? (
          <>
            <FaCheckCircle className="promo-run-status-icon good" />
            Promotion run completed
          </>
        ) : run.status === "failed" ? (
          <>
            <FaTimesCircle className="promo-run-status-icon bad" />
            Promotion run failed, check the history page for details
          </>
        ) : (
          <>Running…</>
        )}
        {run.interruption_count > 0 && (
          <span className="promo-run-interrupted-note">
            Auto-resumed {run.interruption_count} time
            {run.interruption_count > 1 ? "s" : ""} after an interruption
          </span>
        )}
      </div>

      {moveList.map((move) => {
        const pct = move.total_students
          ? Math.round((move.processed_students / move.total_students) * 100)
          : move.status === "completed"
          ? 100
          : 0;
        return (
          <div key={move.id} className="promo-run-progress-row">
            <div className="promo-run-progress-label">
              <span>
                {move.source_class?.name}
                {" → "}
                {formatMoveDestination(move)}
              </span>
              <span>
                {move.processed_students}/{move.total_students} ({move.status})
              </span>
            </div>
            <div className="promo-run-progress-bar-track">
              <div
                className={`promo-run-progress-bar-fill ${move.status}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {isDone &&
              move.status === "completed" &&
              move.processed_students > 0 && (
                <div className="promo-run-move-results">
                  <PromotionMoveResults
                    runId={run.id}
                    moveId={move.id}
                    refreshToken={refreshToken}
                    canOverride
                    onPromoteConditionally={(studentPromotion) =>
                      onPromoteConditionally(move.id, studentPromotion)
                    }
                  />
                </div>
              )}
          </div>
        );
      })}

      {isDone && (
        <button
          type="button"
          className="promo-run-primary-btn"
          onClick={onNewRun}
        >
          Start Another Run
        </button>
      )}
    </div>
  );
};

export default PromotionRunPage;
