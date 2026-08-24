import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Select from "react-select";
import {
  FaDownload,
  FaPlay,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api, { headers, subBaseURL } from "../../utils/api";
import { ServerListControls } from "../../components/ServerListControls/ServerListControls.component";
import "./ReportCardSessions.styles.css";

const POLL_INTERVAL_MS = 4000;

const TERM_OPTIONS = [
  { value: "annual", label: "Annual (All Terms)" },
  { value: "term1", label: "First Term" },
  { value: "term2", label: "Second Term" },
  { value: "term3", label: "Third Term" },
];

const STATUS_META = {
  pending: { label: "Pending", className: "pending", icon: <FaClock /> },
  running: { label: "Running", className: "running", icon: <FaSpinner className="rcs-spin" /> },
  completed: { label: "Completed", className: "completed", icon: <FaCheckCircle /> },
  failed: { label: "Failed", className: "failed", icon: <FaTimesCircle /> },
  interrupted: { label: "Interrupted", className: "failed", icon: <FaExclamationTriangle /> },
};

const StatusPill = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`rcs-status-pill ${meta.className}`}>
      {meta.icon} {meta.label}
    </span>
  );
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.details || err?.message || fallback;

const SESSION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const SESSION_SORT_OPTIONS = [
  { value: "id", label: "Session #" },
  { value: "created_at", label: "Date started" },
  { value: "status", label: "Status" },
  { value: "term", label: "Term" },
];

function RunRow({ run }) {
  const pct =
    run.total_students > 0
      ? Math.min(100, Math.round((run.processed_students / run.total_students) * 100))
      : run.status === "completed"
      ? 100
      : 0;

  return (
    <div className="rcs-run-row">
      <div className="rcs-run-class">{run.class?.name || `Class #${run.class_id}`}</div>
      <div className="rcs-run-progress">
        <div className="rcs-run-progress-bar">
          <div
            className={`rcs-run-progress-fill ${run.status}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="rcs-run-progress-text">
          {run.status === "pending"
            ? "Waiting…"
            : `${run.processed_students || 0} / ${run.total_students || 0} students`}
        </span>
      </div>
      <div className="rcs-run-status">
        <StatusPill status={run.status} />
      </div>
      <div className="rcs-run-action">
        {run.status === "completed" && run.file_url ? (
          <a
            className="rcs-download-btn"
            href={run.file_url}
            target="_blank"
            rel="noreferrer"
          >
            <FaDownload /> Download
          </a>
        ) : run.status === "failed" ? (
          <span className="rcs-run-error" title={run.error_message}>
            {run.error_message || "Failed"}
          </span>
        ) : (
          <span className="rcs-run-action-empty">—</span>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, defaultExpanded }) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const runs = session.runs || [];
  const completedRuns = runs.filter((r) => r.status === "completed" && r.file_url);

  const handleDownloadAll = () => {
    if (completedRuns.length === 0) return;
    toast.info(
      `Opening ${completedRuns.length} report card PDF(s) one by one — allow pop-ups if your browser blocks them.`,
      { autoClose: 5000 }
    );
    completedRuns.forEach((run, i) => {
      setTimeout(() => window.open(run.file_url, "_blank"), i * 700);
    });
  };

  return (
    <div className="rcs-session-card">
      <div className="rcs-session-header" onClick={() => setExpanded((v) => !v)}>
        <div className="rcs-session-header-main">
          <span className="rcs-session-id">Session #{session.id}</span>
          <span className="rcs-session-meta">
            {session.academic_year?.name || `Year #${session.academic_year_id}`} · {session.term}
          </span>
          <StatusPill status={session.status} />
        </div>
        <div className="rcs-session-header-stats">
          <span>
            {session.completed_classes || 0}/{session.total_classes || 0} classes done
          </span>
          {session.failed_classes > 0 && (
            <span className="rcs-session-failed-count">{session.failed_classes} failed</span>
          )}
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      {expanded && (
        <div className="rcs-session-body">
          {completedRuns.length > 0 && (
            <div className="rcs-session-toolbar">
              <button className="rcs-download-all-btn" onClick={handleDownloadAll}>
                <FaDownload /> Download All ({completedRuns.length})
              </button>
            </div>
          )}
          <div className="rcs-run-list">
            {runs.length === 0 ? (
              <div className="rcs-empty-note">No classes in this session.</div>
            ) : (
              runs.map((run) => <RunRow key={run.id} run={run} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const ReportCardSessionsPage = () => {
  useRestrictTo("Admin3");
  const navigate = useNavigate();
  const location = useLocation();
  const { id: focusedSessionId } = useParams();
  const prefill = location.state || {};

  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedYearId, setSelectedYearId] = useState(prefill.academic_year_id || null);
  const [selectedDeptId, setSelectedDeptId] = useState(prefill.department_id || null);
  const [selectedClassIds, setSelectedClassIds] = useState(
    prefill.class_id ? [prefill.class_id] : []
  );
  const [selectedTerm, setSelectedTerm] = useState("term3");
  const [starting, setStarting] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const pollTimerRef = useRef(null);

  // Search/filter/sort/pagination is all server-side (see listSessions in
  // reportCardSession.controller.js) — history can grow to cover a whole
  // school's worth of sessions, so this never loads more than one page's
  // worth of rows into the browser.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Whether ANY session is active, independent of the history list's own
  // filters/search/page — an admin filtering the list to "failed" must
  // still be blocked from starting a new session if one is quietly
  // running underneath, and this is what drives the poll.
  const [activeSession, setActiveSession] = useState(null);

  const fetchInitialData = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const [yearsRes, classesRes, deptRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/classes"),
        fetch(`${subBaseURL}/specialties`, { headers: headers() }).then((r) => r.json()),
      ]);
      setAcademicYears(yearsRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortBy,
        sortDir,
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/report-card-sessions?${params.toString()}`);
      setSessions(res.data.data.sessions || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      // Silent on background polls, keep last-known list.
    } finally {
      setLoadingSessions(false);
    }
  }, [page, sortBy, sortDir, search, statusFilter]);

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await api.get("/report-card-sessions?limit=5&sortBy=id&sortDir=desc");
      const recent = res.data.data.sessions || [];
      setActiveSession(
        recent.find((s) => s.status === "pending" || s.status === "running") || null
      );
    } catch (err) {
      // Non-critical, keep last-known state.
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchActiveSession();
  }, [fetchInitialData, fetchActiveSession]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Reset to page 1 whenever the search/filter/sort criteria change, a
  // stale page number from a previous filter could otherwise point past
  // the end of the new, smaller result set.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, sortDir]);

  // Poll while any session is pending/running, background job continues
  // server-side regardless — this is purely a live-view convenience.
  useEffect(() => {
    if (!activeSession) return undefined;
    pollTimerRef.current = setInterval(() => {
      fetchActiveSession();
      fetchSessions();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollTimerRef.current);
  }, [activeSession, fetchActiveSession, fetchSessions]);

  const filteredClasses = selectedDeptId
    ? classes.filter((c) => c.department_id === selectedDeptId)
    : classes;

  const handleStartSession = async () => {
    if (!selectedYearId) {
      toast.error("Please select an Academic Year.");
      return;
    }
    if (selectedClassIds.length === 0) {
      toast.error("Please select at least one class.");
      return;
    }
    if (activeSession) {
      toast.error("A session is already running — wait for it to finish.");
      return;
    }
    setStarting(true);
    try {
      await api.post("/report-card-sessions", {
        academic_year_id: selectedYearId,
        term: selectedTerm,
        class_ids: selectedClassIds,
      });
      toast.success("Report card generation started — track progress below.");
      setSelectedClassIds([]);
      fetchSessions();
      fetchActiveSession();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to start session."));
    } finally {
      setStarting(false);
    }
  };

  const classOptions = filteredClasses.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="rcs-page">
        <div className="rcs-header">
          <h2 className="rcs-title">Report Card Sessions</h2>
        </div>

        <div className="rcs-start-panel">
          <h3 className="rcs-panel-title">Start New Session</h3>
          <p className="rcs-panel-subtitle">
            Classes are generated one at a time, safely, in the background — you can leave this
            page and come back later. Each class's report cards become available for download as
            soon as they finish.
          </p>

          {activeSession && (
            <div className="rcs-active-banner">
              <FaSpinner className="rcs-spin" /> A session is currently running (Session #
              {activeSession.id}). Start a new one once it finishes.
            </div>
          )}

          <div className="rcs-start-form">
            <div className="rcs-form-field">
              <label>Academic Year</label>
              <Select
                placeholder="Select Academic Year"
                options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
                value={
                  academicYears
                    .map((y) => ({ value: y.id, label: y.name }))
                    .find((opt) => opt.value === selectedYearId) || null
                }
                onChange={(opt) => setSelectedYearId(opt?.value || null)}
                isDisabled={Boolean(activeSession) || starting}
                isClearable
                classNamePrefix="rcs-select"
              />
            </div>

            <div className="rcs-form-field">
              <label>Term</label>
              <Select
                placeholder="Select Term"
                options={TERM_OPTIONS}
                value={TERM_OPTIONS.find((opt) => opt.value === selectedTerm) || TERM_OPTIONS[0]}
                onChange={(opt) => setSelectedTerm(opt?.value || "term3")}
                isDisabled={Boolean(activeSession) || starting}
                classNamePrefix="rcs-select"
              />
            </div>

            <div className="rcs-form-field">
              <label>Department (narrows class list)</label>
              <Select
                placeholder="All Departments"
                options={(departments || []).map((d) => ({ value: d.id, label: d.name }))}
                value={
                  (departments || [])
                    .map((d) => ({ value: d.id, label: d.name }))
                    .find((opt) => opt.value === selectedDeptId) || null
                }
                onChange={(opt) => setSelectedDeptId(opt?.value || null)}
                isDisabled={Boolean(activeSession) || starting}
                isClearable
                classNamePrefix="rcs-select"
              />
            </div>

            <div className="rcs-form-field rcs-form-field-wide">
              <label>Classes ({selectedClassIds.length} selected)</label>
              <Select
                placeholder="Select one or more classes"
                options={classOptions}
                value={classOptions.filter((opt) => selectedClassIds.includes(opt.value))}
                onChange={(opts) => setSelectedClassIds((opts || []).map((o) => o.value))}
                isDisabled={Boolean(activeSession) || starting}
                isMulti
                classNamePrefix="rcs-select"
              />
              {filteredClasses.length > 0 && (
                <button
                  type="button"
                  className="rcs-select-all-btn"
                  onClick={() => setSelectedClassIds(filteredClasses.map((c) => c.id))}
                  disabled={Boolean(activeSession) || starting}
                >
                  Select all {selectedDeptId ? "in department" : "classes"} (
                  {filteredClasses.length})
                </button>
              )}
            </div>
          </div>

          <button
            className="rcs-start-btn"
            onClick={handleStartSession}
            disabled={Boolean(activeSession) || starting || loadingInitial}
          >
            {starting ? (
              <>
                <FaSpinner className="rcs-spin" /> Starting…
              </>
            ) : (
              <>
                <FaPlay /> Start Generation
              </>
            )}
          </button>
        </div>

        <div className="rcs-sessions-section">
          <h3 className="rcs-panel-title">Session History</h3>

          <ServerListControls
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by class, term, status, or session #..."
            statusOptions={SESSION_STATUS_OPTIONS}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            sortOptions={SESSION_SORT_OPTIONS}
            sortValue={sortBy}
            onSortChange={setSortBy}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            loading={loadingSessions}
          />

          {loadingSessions && sessions.length === 0 ? (
            <div className="rcs-empty-note">Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="rcs-empty-note">No report card sessions match these filters.</div>
          ) : (
            <div className="rcs-session-list">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  defaultExpanded={
                    String(session.id) === String(focusedSessionId) ||
                    session.status === "pending" ||
                    session.status === "running"
                  }
                />
              ))}
            </div>
          )}
        </div>
    </div>
  );
};

export default ReportCardSessionsPage;
