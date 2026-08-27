import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import { FaDownload, FaEye, FaTable } from "react-icons/fa";
import api, { headers, subBaseURL } from "../../utils/api";
import { MasterSheetView } from "../../components/MasterSheetView/MasterSheetView.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import "./MasterSheetDownload.styles.css";

// Mirrors the real filter form (4 labeled select boxes) instead of
// generic gray bars, so the layout doesn't jump once dropdowns arrive.
function MsdFormSkeleton() {
  return (
    <div className="msd-form">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="msd-field" key={i}>
          <div className="msd-skel msd-skel-line" style={{ width: 90, height: 12, marginBottom: 8 }} />
          <div className="msd-skel msd-skel-block" style={{ height: 38 }} />
        </div>
      ))}
    </div>
  );
}

// Mirrors the real view's stat cards + grade table instead of plain bars.
function MsdViewSkeleton() {
  return (
    <div className="msd-view-skel">
      <div className="msd-skel-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="msd-skel msd-skel-stat-card" key={i} />
        ))}
      </div>
      <div className="msd-skel-table">
        <div className="msd-skel msd-skel-table-row header" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="msd-skel msd-skel-table-row" key={i} />
        ))}
      </div>
    </div>
  );
}

// Download stays a direct, synchronous PDF (measured worst case ~485MB RSS
// for a single 1000-student class, streamed server-side, safe for one
// class at a time). "View" is a different concern entirely — it fetches
// the same underlying analysis as JSON (report-cards/master-sheet-data,
// same fetchMarksWithIncludes/analyzeMasterSheet as the PDF) and renders
// it as real, navigable components (MasterSheetView), never the PDF
// itself, so it's cheap and instant regardless of class size.
function getBackendUrl(path, params) {
  const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token) params.set("token", token);
  return `${base}/${path}?${params.toString()}`;
}

const TERM_OPTIONS = [
  { value: "annual", label: "Annual (All Terms)" },
  { value: "t1", label: "First Term" },
  { value: "t2", label: "Second Term" },
  { value: "t3", label: "Third Term" },
];

export const MasterSheetDownloadPage = () => {
  const [loadingPage, setLoadingPage] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  const [academicYearId, setAcademicYearId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [classId, setClassId] = useState(null);
  const [term, setTerm] = useState("annual");

  const [viewData, setViewData] = useState(null); // { meta, analysis }
  const [loadingView, setLoadingView] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingPage(true);
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
        setLoadingPage(false);
      }
    })();
  }, []);

  const filteredClasses = departmentId ? classes.filter((c) => c.department_id === departmentId) : [];
  const isReady = Boolean(academicYearId && departmentId && classId);

  const downloadUrl = isReady
    ? getBackendUrl(
        "report-cards/master-sheet",
        new URLSearchParams({ academicYearId, departmentId, classId, term, disposition: "attachment" })
      )
    : null;

  const handleView = async () => {
    if (!isReady) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }
    setLoadingView(true);
    setViewData(null);
    try {
      const res = await api.get(
        `/report-cards/master-sheet-data?academicYearId=${academicYearId}&departmentId=${departmentId}&classId=${classId}&term=${term}`
      );
      setViewData(res.data.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.response?.data?.details || "Failed to load master sheet."
      );
    } finally {
      setLoadingView(false);
    }
  };

  return (
    <div className="msd-page">
      <PageHeader
        title={
          <span className="msd-title-inner">
            <FaTable /> Master Sheet
          </span>
        }
        subtitle="Pick a class to view or download its master sheet — class averages, rankings, and grade distribution for a term."
      />
      <div className="msd-panel">
        {loadingPage ? (
          <MsdFormSkeleton />
        ) : (
          <>
            <div className="msd-form">
              <div className="msd-field">
                <label>Academic Year</label>
                <Select
                  placeholder="Select Academic Year"
                  options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
                  value={
                    academicYears
                      .map((y) => ({ value: y.id, label: y.name }))
                      .find((opt) => opt.value === academicYearId) || null
                  }
                  onChange={(opt) => setAcademicYearId(opt?.value || null)}
                  isClearable
                  classNamePrefix="msd-select"
                />
              </div>

              <div className="msd-field">
                <label>Department</label>
                <Select
                  placeholder="Select Department"
                  options={(departments || []).map((d) => ({ value: d.id, label: d.name }))}
                  value={
                    (departments || [])
                      .map((d) => ({ value: d.id, label: d.name }))
                      .find((opt) => opt.value === departmentId) || null
                  }
                  onChange={(opt) => {
                    setDepartmentId(opt?.value || null);
                    setClassId(null);
                  }}
                  isClearable
                  classNamePrefix="msd-select"
                />
              </div>

              <div className="msd-field">
                <label>Class</label>
                <Select
                  placeholder="Select Class"
                  options={filteredClasses.map((c) => ({ value: c.id, label: c.name }))}
                  value={
                    filteredClasses
                      .map((c) => ({ value: c.id, label: c.name }))
                      .find((opt) => opt.value === classId) || null
                  }
                  onChange={(opt) => setClassId(opt?.value || null)}
                  isDisabled={!departmentId}
                  isClearable
                  classNamePrefix="msd-select"
                />
              </div>

              <div className="msd-field">
                <label>Term</label>
                <Select
                  placeholder="Select Term"
                  options={TERM_OPTIONS}
                  value={TERM_OPTIONS.find((opt) => opt.value === term) || TERM_OPTIONS[0]}
                  onChange={(opt) => setTerm(opt?.value || "annual")}
                  classNamePrefix="msd-select"
                />
              </div>
            </div>

            <div className="msd-actions">
              <button className="msd-view-btn" onClick={handleView} disabled={!isReady || loadingView}>
                <FaEye /> {loadingView ? "Loading…" : "View Master Sheet"}
              </button>
              {downloadUrl && (
                <a className="msd-download-btn" href={downloadUrl}>
                  <FaDownload /> Download PDF
                </a>
              )}
            </div>

            {loadingView && <MsdViewSkeleton />}

            {viewData && !loadingView && (
              <MasterSheetView meta={viewData.meta} analysis={viewData.analysis} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MasterSheetDownloadPage;
