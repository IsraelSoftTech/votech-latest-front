import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  FaTable,
  FaClipboardCheck,
  FaDownload,
  FaChevronDown,
  FaChevronRight,
  FaSearch,
  FaSpinner,
} from "react-icons/fa";
import api, { headers, subBaseURL } from "../../utils/api";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { Button } from "../../components/Button/Button.component";
import MasterSheet from "../../components/MasterSheet/MasterSheet.component";
import "./MarksOverview.styles.css";

const SUB_VIEWS = [
  { key: "matrix", label: "Marks Matrix", icon: <FaTable /> },
  { key: "tracker", label: "Compliance Tracker", icon: <FaClipboardCheck /> },
];

const TERM_OPTIONS = [
  { value: "term1", label: "First Term" },
  { value: "term2", label: "Second Term" },
  { value: "term3", label: "Third Term" },
  { value: "annual", label: "Annual" },
];

function MovFormSkeleton() {
  return (
    <div className="mov-form">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="mov-field" key={i}>
          <div className="mov-skel mov-skel-line" style={{ width: 90, height: 12, marginBottom: 8 }} />
          <div className="mov-skel mov-skel-block" style={{ height: 38 }} />
        </div>
      ))}
    </div>
  );
}

function MovTableSkeleton() {
  return (
    <div className="mov-table-skel">
      <div className="mov-skel mov-skel-row header" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="mov-skel mov-skel-row" key={i} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════ MATRIX ═══════════════════════════════ */

function MatrixView() {
  const [loadingLists, setLoadingLists] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  const [academicYearId, setAcademicYearId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [classId, setClassId] = useState(null);
  const [term, setTerm] = useState("annual");

  const [cards, setCards] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixError, setMatrixError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoadingLists(true);
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
        setLoadingLists(false);
      }
    })();
  }, []);

  const filteredClasses = departmentId ? classes.filter((c) => c.department_id === departmentId) : classes;
  const isReady = Boolean(academicYearId && classId);

  const handleView = async () => {
    if (!isReady) {
      toast.error("Please select Academic Year and Class.");
      return;
    }
    setLoadingMatrix(true);
    setMatrixError(null);
    setCards(null);
    try {
      const params = new URLSearchParams({ academicYearId, classId });
      if (departmentId) params.set("departmentId", departmentId);
      const res = await api.get(`/report-cards/marks-overview/matrix?${params.toString()}`);
      setCards(res.data.data);
    } catch (err) {
      setMatrixError(
        err.response?.data?.message || err.response?.data?.details || "Failed to load marks matrix."
      );
    } finally {
      setLoadingMatrix(false);
    }
  };

  return (
    <div className="mov-panel">
      {loadingLists ? (
        <MovFormSkeleton />
      ) : (
        <div className="mov-form">
          <div className="mov-field">
            <label>Academic Year</label>
            <Select
              placeholder="Select Academic Year"
              options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
              value={
                academicYears.map((y) => ({ value: y.id, label: y.name })).find((o) => o.value === academicYearId) ||
                null
              }
              onChange={(opt) => setAcademicYearId(opt?.value || null)}
              isClearable
              classNamePrefix="mov-select"
            />
          </div>

          <div className="mov-field">
            <label>Department</label>
            <Select
              placeholder="All Departments"
              options={(departments || []).map((d) => ({ value: d.id, label: d.name }))}
              value={
                (departments || [])
                  .map((d) => ({ value: d.id, label: d.name }))
                  .find((o) => o.value === departmentId) || null
              }
              onChange={(opt) => {
                setDepartmentId(opt?.value || null);
                setClassId(null);
              }}
              isClearable
              classNamePrefix="mov-select"
            />
          </div>

          <div className="mov-field">
            <label>Class</label>
            <Select
              placeholder="Select Class"
              options={filteredClasses.map((c) => ({ value: c.id, label: c.name }))}
              value={filteredClasses.map((c) => ({ value: c.id, label: c.name })).find((o) => o.value === classId) || null}
              onChange={(opt) => setClassId(opt?.value || null)}
              isClearable
              classNamePrefix="mov-select"
            />
          </div>

          <div className="mov-field">
            <label>Term</label>
            <Select
              placeholder="Select Term"
              options={TERM_OPTIONS}
              value={TERM_OPTIONS.find((o) => o.value === term) || TERM_OPTIONS[3]}
              onChange={(opt) => setTerm(opt?.value || "annual")}
              classNamePrefix="mov-select"
            />
          </div>
        </div>
      )}

      <div className="mov-actions">
        <Button onClick={handleView} disabled={!isReady || loadingMatrix} loading={loadingMatrix}>
          View Matrix
        </Button>
      </div>

      {loadingMatrix && <MovTableSkeleton />}

      {!loadingMatrix && matrixError && (
        <EmptyState title="Couldn't load the marks matrix" subtitle={matrixError} />
      )}

      {!loadingMatrix && !matrixError && cards && <MasterSheet data={cards} term={term} />}

      {!loadingMatrix && !matrixError && !cards && (
        <EmptyState icon={<FaTable />} title="Pick a class and term to view every student's marks, subject by subject." />
      )}
    </div>
  );
}

/* ══════════════════════════════ TRACKER ═══════════════════════════════ */

const STATUS_META = {
  complete: { label: "Complete", tone: "good" },
  partial: { label: "Partial", tone: "warn" },
  not_started: { label: "Not Started", tone: "bad" },
};

function TeacherRow({ teacher }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[teacher.worstStatus];

  return (
    <div className={`mov-teacher-card mov-tone-${meta.tone}`}>
      <button type="button" className="mov-teacher-header" onClick={() => setOpen((o) => !o)}>
        {open ? <FaChevronDown /> : <FaChevronRight />}
        <span className="mov-teacher-name">{teacher.teacherName}</span>
        <span className={`mov-status-pill mov-tone-${meta.tone}`}>{meta.label}</span>
        <span className="mov-teacher-count">
          {teacher.assignments.length} assignment{teacher.assignments.length !== 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="mov-assignment-list">
          {teacher.assignments.map((a) => {
            const aMeta = STATUS_META[a.status];
            return (
              <div key={a.classSubjectId} className="mov-assignment-row">
                <div className="mov-assignment-top">
                  <span className="mov-assignment-title">
                    {a.className} — {a.subjectTitle}
                  </span>
                  <span className={`mov-status-pill mov-tone-${aMeta.tone}`}>{aMeta.label}</span>
                </div>
                {a.status !== "complete" && (
                  <div className="mov-missing-names">
                    {a.missingStudents.slice(0, 8).map((s) => (
                      <span key={s.id} className="mov-missing-pill">
                        {s.name}
                        {s.note}
                      </span>
                    ))}
                    {a.missingStudents.length > 8 && (
                      <span className="mov-missing-more">+{a.missingStudents.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrackerView() {
  const [loadingLists, setLoadingLists] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);

  const [academicYearId, setAcademicYearId] = useState(null);
  const [termId, setTermId] = useState(null);
  const [scopeMode, setScopeMode] = useState("sequence"); // "sequence" | "term"
  const [sequenceId, setSequenceId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingLists(true);
      try {
        const [yearsRes, termsRes, seqRes] = await Promise.all([
          api.get("/academic-years"),
          api.get("/marks/terms"),
          api.get("/marks/sequences"),
        ]);
        setAcademicYears(yearsRes.data?.data || []);
        setTerms(Array.isArray(termsRes.data?.data) ? termsRes.data.data : []);
        setSequences(Array.isArray(seqRes.data?.data) ? seqRes.data.data : []);
      } catch (err) {
        toast.error("Failed to load dropdowns.");
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const filteredTerms = academicYearId
    ? terms.filter((t) => Number(t.academic_year_id) === Number(academicYearId))
    : [];
  const selectedTerm = terms.find((t) => Number(t.id) === Number(termId));
  const filteredSequences =
    academicYearId && selectedTerm
      ? sequences
          .filter((s) => Number(s.academic_year_id) === Number(academicYearId))
          .filter((s) => Number(s.term_id) === Number(selectedTerm.id))
          .sort((a, b) => Number(a.order_number) - Number(b.order_number))
      : [];

  const isReady = Boolean(academicYearId && (scopeMode === "term" ? termId : sequenceId));

  const handleLoad = async () => {
    if (!isReady) {
      toast.error("Please select an academic year and a term or sequence.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({ academicYearId });
      if (scopeMode === "term") params.set("termId", termId);
      else params.set("sequenceId", sequenceId);
      const res = await api.get(`/report-cards/marks-overview/coverage?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || err.response?.data?.details || "Failed to load compliance data."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!isReady) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams({ academicYearId });
      if (scopeMode === "term") params.set("termId", termId);
      else params.set("sequenceId", sequenceId);
      const res = await api.get(`/report-cards/marks-overview/coverage-pdf?${params.toString()}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Marks_Completion_Status.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.teacherRows;
    return data.teacherRows.filter((t) => t.teacherName.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="mov-panel">
      {loadingLists ? (
        <MovFormSkeleton />
      ) : (
        <div className="mov-form">
          <div className="mov-field">
            <label>Academic Year</label>
            <Select
              placeholder="Select Academic Year"
              options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
              value={
                academicYears.map((y) => ({ value: y.id, label: y.name })).find((o) => o.value === academicYearId) ||
                null
              }
              onChange={(opt) => {
                setAcademicYearId(opt?.value || null);
                setTermId(null);
                setSequenceId(null);
              }}
              isClearable
              classNamePrefix="mov-select"
            />
          </div>

          <div className="mov-field">
            <label>Term</label>
            <Select
              placeholder="Select Term"
              options={filteredTerms.map((t) => ({ value: t.id, label: t.name }))}
              value={
                filteredTerms.map((t) => ({ value: t.id, label: t.name })).find((o) => o.value === termId) || null
              }
              onChange={(opt) => {
                setTermId(opt?.value || null);
                setSequenceId(null);
              }}
              isDisabled={!academicYearId}
              classNamePrefix="mov-select"
            />
          </div>

          <div className="mov-field">
            <label>Scope</label>
            <div className="mov-scope-toggle">
              <button
                type="button"
                className={scopeMode === "sequence" ? "active" : ""}
                onClick={() => setScopeMode("sequence")}
              >
                One Sequence
              </button>
              <button type="button" className={scopeMode === "term" ? "active" : ""} onClick={() => setScopeMode("term")}>
                Whole Term
              </button>
            </div>
          </div>

          {scopeMode === "sequence" && (
            <div className="mov-field">
              <label>Sequence</label>
              <Select
                placeholder="Select Sequence"
                options={filteredSequences.map((s) => ({ value: s.id, label: s.name }))}
                value={
                  filteredSequences.map((s) => ({ value: s.id, label: s.name })).find((o) => o.value === sequenceId) ||
                  null
                }
                onChange={(opt) => setSequenceId(opt?.value || null)}
                isDisabled={!termId}
                classNamePrefix="mov-select"
              />
            </div>
          )}
        </div>
      )}

      <div className="mov-actions">
        <Button onClick={handleLoad} disabled={!isReady || loading} loading={loading}>
          Check Completion
        </Button>
        {data && (
          <Button
            onClick={handleDownloadPdf}
            variant="outline"
            icon={downloading ? <FaSpinner className="mov-spin" /> : <FaDownload />}
            disabled={downloading}
            loading={downloading}
          >
            {downloading ? "Downloading…" : "Download PDF"}
          </Button>
        )}
      </div>

      {loading && <MovTableSkeleton />}

      {!loading && error && <EmptyState title="Couldn't load completion status" subtitle={error} />}

      {!loading && !error && data && (
        <>
          <div className="mov-summary-row">
            <div className="mov-summary-card mov-tone-good">
              <span className="mov-summary-value">{data.summary.complete}</span>
              <span className="mov-summary-label">Complete</span>
            </div>
            <div className="mov-summary-card mov-tone-warn">
              <span className="mov-summary-value">{data.summary.partial}</span>
              <span className="mov-summary-label">Partial</span>
            </div>
            <div className="mov-summary-card mov-tone-bad">
              <span className="mov-summary-value">{data.summary.notStarted}</span>
              <span className="mov-summary-label">Not Started</span>
            </div>
          </div>

          <div className="mov-search-row">
            <FaSearch className="mov-search-icon" />
            <input
              className="mov-search-input"
              placeholder="Search by teacher name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredTeachers.length === 0 ? (
            <EmptyState title="No teachers match your search." />
          ) : (
            <div className="mov-teacher-list">
              {filteredTeachers.map((t) => (
                <TeacherRow key={t.teacherId ?? t.teacherName} teacher={t} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && !data && (
        <EmptyState
          icon={<FaClipboardCheck />}
          title="Pick a sequence or term to see which teachers still have marks to fill."
        />
      )}
    </div>
  );
}

/* ══════════════════════════════ PAGE ═══════════════════════════════ */

export const MarksOverviewPage = () => {
  const [activeSubView, setActiveSubView] = useState("matrix");

  return (
    <div className="mov-page">
      <PageHeader
        title="Marks Overview"
        subtitle="Browse a class's full marks spreadsheet, or see which teachers still have marks to fill for a sequence."
      />

      <div className="mov-subtabs">
        {SUB_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`mov-subtab ${activeSubView === v.key ? "active" : ""}`}
            onClick={() => setActiveSubView(v.key)}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {activeSubView === "matrix" && <MatrixView />}
      {activeSubView === "tracker" && <TrackerView />}
    </div>
  );
};

export default MarksOverviewPage;
