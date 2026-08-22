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
import "./PromotionRun.styles.css";

const CONFIRM_DELAY_SECONDS = 5;
const POLL_INTERVAL_MS = 4000;

const DECISION_LABELS = {
  promoted: "Promoted",
  promoted_on_condition: "Promoted on Condition",
  failed: "Failed / Repeats",
};

export const PromotionRunPage = () => {
  useRestrictTo("Admin3");

  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [promotedClasses, setPromotedClasses] = useState(new Map()); // class_id -> {move_id, status}
  const [loading, setLoading] = useState(true);

  const [scope, setScope] = useState("class");
  const [toYearId, setToYearId] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedSourceClassId, setSelectedSourceClassId] = useState(null);
  const [manualAverageOverride, setManualAverageOverride] = useState("");

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

  useEffect(() => {
    if (!activeYear) return;
    api
      .get(`/promotions/promoted-classes?academic_year_from_id=${activeYear.id}`)
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

  const departmentClasses = (departmentId) =>
    classes.filter((c) => c.department_id === departmentId);

  const sameDepartmentDestinations = (sourceClassId) => {
    const sourceClass = classes.find((c) => c.id === sourceClassId);
    if (!sourceClass) return [];
    return classes.filter(
      (c) => c.department_id === sourceClass.department_id && c.id !== sourceClassId
    );
  };

  // ── Build the moves this run will attempt, from current setup state ──
  const buildMoves = () => {
    if (scope === "class" || scope === "manual") {
      if (!selectedSourceClassId) return [];
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
          destination_class_id: cfg.is_graduation ? null : cfg.destination_class_id,
          is_graduation: !!cfg.is_graduation,
        };
      })
      .filter(Boolean);
  };

  const moves = buildMoves();

  const setMoveDestination = (classId, destinationClassId) => {
    setMoveConfig((prev) => ({
      ...prev,
      [classId]: { ...prev[classId], destination_class_id: destinationClassId, is_graduation: false },
    }));
  };
  const setMoveGraduation = (classId, isGraduation) => {
    setMoveConfig((prev) => ({
      ...prev,
      [classId]: { ...prev[classId], is_graduation: isGraduation, destination_class_id: null },
    }));
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
        results.push({ move, data: res?.data?.data });
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
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to preview promotion"
      );
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
    { total: 0, promoted: 0, promoted_on_condition: 0, failed: 0, incomplete_data_count: 0 }
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
        <div className="promo-run-header">
          <h1 className="promo-run-title">
            <FaGraduationCap /> Run Promotion
          </h1>
          {!activeYear && (
            <span className="promo-run-warning-badge">
              <FaExclamationTriangle /> No active academic year found
            </span>
          )}
        </div>

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
          />
        )}

        {step === "previewing" && (
          <div className="promo-run-skeleton">
            <p className="promo-run-loading-text">Computing decisions for every student in scope…</p>
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
          <label className="promo-run-filter-label">Promote Into Academic Year</label>
          <Select
            placeholder="Select destination academic year"
            options={academicYears
              .filter((y) => y.id !== activeYear?.id)
              .map((y) => ({ value: y.id, label: y.name }))}
            value={
              toYearId
                ? { value: toYearId, label: academicYears.find((y) => y.id === toYearId)?.name }
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
                    ? `${c.name} (already promoted)`
                    : c.name,
                  isPromoted: promotedClasses.has(c.id),
                }))}
                isOptionDisabled={(opt) => opt.isPromoted}
                value={
                  selectedSourceClassId
                    ? {
                        value: selectedSourceClassId,
                        label: classes.find((c) => c.id === selectedSourceClassId)?.name,
                      }
                    : null
                }
                onChange={(opt) => {
                  setSelectedSourceClassId(opt?.value || null);
                  setSingleDestinationId(null);
                }}
                classNamePrefix="select"
              />
              {selectedSourceClassId && promotedClasses.has(selectedSourceClassId) && (
                <p className="promo-run-already-promoted-hint">
                  This class was already promoted out of the active year.
                  Reverse that move on the History tab first.
                </p>
              )}
            </div>

            {!singleGraduation && (
              <div className="promo-run-filter-group">
                <label className="promo-run-filter-label">Destination Class</label>
                <Select
                  placeholder="Select destination"
                  isDisabled={!selectedSourceClassId}
                  options={sameDepartmentDestinations(selectedSourceClassId).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={
                    singleDestinationId
                      ? {
                          value: singleDestinationId,
                          label: classes.find((c) => c.id === singleDestinationId)?.name,
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

          <label className="promo-run-graduation-toggle">
            <input
              type="checkbox"
              checked={singleGraduation}
              onChange={(e) => setSingleGraduation(e.target.checked)}
            />
            This is a graduating class, so promoted students leave the school
            instead of moving to another class
          </label>
        </div>
      )}

      {(scope === "department" || scope === "school") && (
        <div className="promo-run-multi-move">
          {scope === "department" && (
            <div className="promo-run-filter-group promo-run-dept-picker">
              <label className="promo-run-filter-label">Department</label>
              <Select
                placeholder="Select department"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={
                  selectedDepartmentId
                    ? {
                        value: selectedDepartmentId,
                        label: departments.find((d) => d.id === selectedDepartmentId)?.name,
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
            return (
              <div key={cls.id} className="promo-run-move-row">
                <span className="promo-run-move-source">{cls.name}</span>
                <span className="promo-run-move-arrow">→</span>
                {alreadyPromoted ? (
                  <span className="promo-run-move-already-promoted">
                    Already promoted, reverse on History tab to redo
                  </span>
                ) : cfg.is_graduation ? (
                  <span className="promo-run-move-graduating">Graduating</span>
                ) : (
                  <Select
                    className="promo-run-move-select"
                    placeholder="Select destination"
                    options={destinations.map((c) => ({ value: c.id, label: c.name }))}
                    value={
                      cfg.destination_class_id
                        ? {
                            value: cfg.destination_class_id,
                            label: classes.find((c) => c.id === cfg.destination_class_id)?.name,
                          }
                        : null
                    }
                    onChange={(opt) => setMoveDestination(cls.id, opt?.value || null)}
                    classNamePrefix="select"
                  />
                )}
                {!alreadyPromoted && (
                  <label className="promo-run-move-grad-toggle">
                    <input
                      type="checkbox"
                      checked={!!cfg.is_graduation}
                      onChange={(e) => setMoveGraduation(cls.id, e.target.checked)}
                    />
                    Graduating
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="promo-run-primary-btn"
        disabled={movesCount === 0 || !toYearId}
        onClick={onPreview}
      >
        Preview {movesCount > 0 ? `(${movesCount} class${movesCount > 1 ? "es" : ""})` : ""}
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
      destination: data.is_graduation ? "Graduating" : data.destination_class?.name,
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
      <SummaryCard label="Promoted" value={aggregateSummary.promoted} tone="good" />
      <SummaryCard
        label="Promoted on Condition"
        value={aggregateSummary.promoted_on_condition}
        tone="warn"
      />
      <SummaryCard label="Failed / Repeats" value={aggregateSummary.failed} tone="bad" />
      <SummaryCard
        label="Incomplete Data"
        value={aggregateSummary.incomplete_data_count}
        tone="warn"
      />
    </div>

    {blockedMoves.map(({ data }, idx) => (
      <div className="promo-run-move-review" key={`blocked-${idx}`}>
        <div className="promo-run-move-review-header">
          <h3>
            {data?.source_class?.name}
            {" → "}
            {data?.is_graduation ? "Graduating" : data?.destination_class?.name}
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
          { key: "class", label: "Class", accessor: "class", options: distinctClasses },
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
      <button type="button" className="promo-run-secondary-btn" onClick={onBack}>
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
        {isSocketConnected ? "Live updates connected" : "Reconnecting, showing latest polled status"}
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
                {move.is_graduation ? "Graduating" : move.destination_class?.name}
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

            {isDone && move.status === "completed" && move.processed_students > 0 && (
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
        <button type="button" className="promo-run-primary-btn" onClick={onNewRun}>
          Start Another Run
        </button>
      )}
    </div>
  );
};

export default PromotionRunPage;
