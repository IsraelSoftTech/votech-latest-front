import "./ReportCard.styles.css";
import React, { useState, useEffect, useRef } from "react";
import SideTop from "../../../SideTop";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FaArrowLeft, FaDownload, FaLock, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// Custom hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

export const ReportCardHomePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isReadOnly =
    JSON.parse(sessionStorage.getItem("authUser") || "{}").role === "Admin1";

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);

  // --- PERSISTENT FILTERS ---
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("reportCardFilters");
    const base = {
      academic_year_id: null,
      department_id: null,
      class_id: null,
      bulk_term: "annual",
    };
    if (!saved) return base;
    try {
      const parsed = JSON.parse(saved);
      return { ...base, ...parsed, bulk_term: parsed?.bulk_term ?? "annual" };
    } catch {
      return base;
    }
  });

  // --- PDF PROGRESS OVERLAY STATE ---
  const [loadingReportCardPdfs, setLoadingReportCardPdfs] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const pdfTimersRef = useRef([]);

  const clearPdfTimers = () => {
    pdfTimersRef.current.forEach(clearTimeout);
    pdfTimersRef.current = [];
  };

  const startPdfSimProgress = () => {
    setPdfProgress(0);
    setLoadingReportCardPdfs(true);
    clearPdfTimers();

    pdfTimersRef.current.push(
      setTimeout(() => setPdfProgress(30), 600),
      setTimeout(() => setPdfProgress(50), 1300),
      setTimeout(() => setPdfProgress(70), 2300)
    );
  };

  const finishPdfSimProgress = () => {
    clearPdfTimers();
    setPdfProgress(100);
    pdfTimersRef.current.push(
      setTimeout(() => {
        setLoadingReportCardPdfs(false);
        setPdfProgress(0);
      }, 900)
    );
  };

  const failPdfSimProgress = () => {
    clearPdfTimers();
    setTimeout(() => {
      setLoadingReportCardPdfs(false);
      setPdfProgress(0);
    }, 500);
  };

  useEffect(() => {
    return () => {
      clearPdfTimers();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("reportCardFilters", JSON.stringify(filters));
  }, [filters]);

  // --- FETCH FUNCTIONS ---
  const fetchDropdowns = async () => {
    try {
      setLoadingPage(true);
      const [yearsRes, classesRes, termsRes, sequencesRes, deptRes] =
        await Promise.all([
          api.get("/academic-years"),
          api.get("/classes"),
          api.get("/marks/terms"),
          api.get("/marks/sequences"),
          fetch(`${subBaseURL}/specialties`, { headers: headers() }).then((r) =>
            r.json()
          ),
        ]);

      setAcademicYears(yearsRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setTerms(termsRes.data.data || []);
      setSequences(sequencesRes.data.data || []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingPage(false);
    }
  };

  const fetchStudents = async () => {
    const { class_id, department_id, academic_year_id } = filters;
    if (!class_id || !department_id || !academic_year_id) {
      setStudents([]);
      return;
    }

    setLoadingTable(true);
    try {
      const res = await api.get(
        `/students?class_id=${class_id}&specialty_id=${department_id}&academic_year_id=${academic_year_id}`
      );
      setStudents(res.data.data || []);
    } catch (err) {
      toast.error("Failed to fetch students.");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const { class_id, department_id, academic_year_id } = filters;
    if (class_id && department_id && academic_year_id) {
      fetchStudents();
    }
  }, [filters]);

  // --- NAVIGATE TO REPORT CARD PAGE (FIXED) ---
  const handleGoToReportCard = (student, termObj) => {
    const academicYear =
      academicYears.find((y) => y.id === filters.academic_year_id) || null;
    const department =
      (departments || []).find((d) => d.id === filters.department_id) || null;
    const klass = classes.find((c) => c.id === filters.class_id) || null;

    if (!academicYear || !department || !klass) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }

    if (!termObj) {
      toast.error("Please select a term.");
      return;
    }

    console.log("Navigating with term:", termObj); // Debug log

    navigate(`/academics/report-card/${student.id}`, {
      state: {
        // full objects (preferred)
        academicYear,
        department,
        class: klass,
        student,
        term: termObj,
        sequence: null,

        // keep ids too (optional/back-compat)
        academic_year_id: academicYear.id,
        department_id: department.id,
        class_id: klass.id,
        term_id: termObj?.id || null,
        ids: {
          academic_year_id: academicYear.id,
          department_id: department.id,
          class_id: klass.id,
          term_id: termObj?.id || null,
        },
      },
    });
  };

  const handleGoToMasterSheet = () => {
    const departmentObj = (departments || []).find(
      (d) => d.id === filters.department_id
    );
    const classObj = classes.find((c) => c.id === filters.class_id);
    const academicYearObj = academicYears.find(
      (y) => y.id === filters.academic_year_id
    );

    if (!departmentObj || !classObj || !academicYearObj) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }

    navigate(`/academics/master-sheets`, {
      state: {
        academicYear: academicYearObj,
        department: departmentObj,
        class: classObj,
        academic_year_id: filters.academic_year_id,
        ids: {
          academic_year_id: filters.academic_year_id,
          department_id: departmentObj.id,
          class_id: classObj.id,
        },
        bulk_term: filters.bulk_term,
      },
    });
  };

  const handleDownloadBulkPdfs = () => {
    const downloadPdfs = async () => {
      try {
        startPdfSimProgress();

        const termParam = filters.bulk_term || "annual";

        const res = await api.get(
          `/report-cards/bulk-pdfs?classId=${filters.class_id}&departmentId=${
            filters.department_id
          }&academicYearId=${
            filters.academic_year_id
          }&term=${encodeURIComponent(termParam)}`,
          { responseType: "blob", timeout: 0 }
        );

        const academicYear =
          academicYears.find((y) => y.id === filters.academic_year_id)?.name ||
          "AcademicYear";
        const department =
          (departments || []).find((d) => d.id === filters.department_id)
            ?.name || "Department";
        const klass =
          classes.find((c) => c.id === filters.class_id)?.name || "Class";

        const termObj = terms.find(
          (t) => String(t.id) === String(filters.bulk_term)
        );
        const termLabel =
          filters.bulk_term === "annual" ? "Annual" : termObj?.name || "Term";

        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);

        let fileName = `${academicYear}-${department}-${klass}-${termLabel}-ReportCards.pdf`;
        const contentDisposition = res.headers["content-disposition"];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+)"?/);
          if (match?.[1]) fileName = match[1];
        }

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Report cards PDF downloaded successfully.");

        finishPdfSimProgress();
      } catch (err) {
        if (err.response?.data) {
          const blob = err.response.data;
          try {
            const text = await blob.text();
            const json = JSON.parse(text);
            toast.error(json.details || json.message || "Server error");
          } catch (parseErr) {
            toast.error("Server returned an invalid error response");
          }
        } else {
          toast.error(err.message || "Unknown error");
        }
        failPdfSimProgress();
      }
    };

    downloadPdfs();
  };

  // --- FILTERED ARRAYS ---
  const filteredClasses = filters.department_id
    ? classes.filter((c) => c.department_id === filters.department_id)
    : [];
  const filteredTerms = filters.academic_year_id
    ? terms.filter((t) => t.academic_year_id === filters.academic_year_id)
    : [];

  const isMasterSheetReady = Boolean(
    filters.academic_year_id && filters.department_id && filters.class_id
  );

  const bulkTermOptions = [
    { value: "annual", label: "Annual (All Terms)" },
    { value: "t1", label: "First Term" },
    { value: "t2", label: "Second Term" },
    { value: "t3", label: "Third Term" },
  ];

  // --- RENDER ---
  return (
    <SideTop>
      {loadingReportCardPdfs && (
        <div className="pdf-progress-overlay" role="alert" aria-live="polite">
          <div className="pdf-progress-card">
            <div className="pdf-progress-emoji" aria-hidden>
              ☕
            </div>
            <h3>Generating report cards…</h3>
            <p>
              We are generating the report cards. This may take some time —
              please grab a coffee while we work.
            </p>

            <div
              className="pdf-progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pdfProgress}
              aria-label="Report card generation progress"
            >
              <div
                className="pdf-progress-fill"
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
            <div className="pdf-progress-percent">{pdfProgress}%</div>
          </div>
        </div>
      )}

      <div className="report-card-home-page">
        <div className="report-card-header">
          <button className="report-back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft />
            {!isMobile && <span>Go Back</span>}
          </button>
          <h2 className="report-card-title">
            Generate Report Cards
            {isReadOnly && (
              <span className="report-read-only-badge">
                <FaLock /> {!isMobile && "Read Only"}
              </span>
            )}
          </h2>
        </div>

        {loadingPage ? (
          <Skeleton height={35} count={6} style={{ marginBottom: "10px" }} />
        ) : (
          <>
            {/* --- FILTER ROW --- */}
            <div className="report-filters-section">
              <h3 className="report-filters-title">Filter Options</h3>
              <div className="report-filters-row">
                <div className="report-form-select">
                  <label className="report-form-label">Academic Year</label>
                  <Select
                    placeholder="Select Academic Year"
                    options={academicYears.map((y) => ({
                      value: y.id,
                      label: y.name,
                    }))}
                    value={
                      academicYears
                        .map((y) => ({ value: y.id, label: y.name }))
                        .find(
                          (opt) => opt.value === filters.academic_year_id
                        ) || null
                    }
                    onChange={(opt) =>
                      setFilters((prev) => ({
                        ...prev,
                        academic_year_id: opt?.value || null,
                        bulk_term: "annual",
                      }))
                    }
                    isDisabled={loadingReportCardPdfs}
                    isClearable
                    className="report-react-select"
                    classNamePrefix="report-select"
                  />
                </div>

                <div className="report-form-select">
                  <label className="report-form-label">Department</label>
                  <Select
                    placeholder="Select Department"
                    options={(departments || []).map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                    value={
                      (departments || []).find(
                        (d) => d.id === filters.department_id
                      ) && {
                        value: filters.department_id,
                        label: (departments || []).find(
                          (d) => d.id === filters.department_id
                        )?.name,
                      }
                    }
                    onChange={(opt) =>
                      setFilters((prev) => ({
                        ...prev,
                        department_id: opt?.value || null,
                        class_id: null,
                      }))
                    }
                    isDisabled={loadingReportCardPdfs}
                    isClearable
                    className="report-react-select"
                    classNamePrefix="report-select"
                  />
                </div>

                <div className="report-form-select">
                  <label className="report-form-label">Class</label>
                  <Select
                    placeholder="Select Class"
                    options={filteredClasses.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={
                      filteredClasses.find((c) => c.id === filters.class_id)
                        ? {
                            value: filters.class_id,
                            label: filteredClasses.find(
                              (c) => c.id === filters.class_id
                            )?.name,
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setFilters((prev) => ({
                        ...prev,
                        class_id: opt?.value || null,
                      }))
                    }
                    isDisabled={loadingReportCardPdfs}
                    isClearable
                    className="report-react-select"
                    classNamePrefix="report-select"
                  />
                </div>

                <div className="report-form-select">
                  <label className="report-form-label">Term (Bulk PDF)</label>
                  <Select
                    placeholder="Term (Bulk PDF)"
                    options={bulkTermOptions}
                    value={
                      bulkTermOptions.find(
                        (opt) => String(opt.value) === String(filters.bulk_term)
                      ) || bulkTermOptions[0]
                    }
                    onChange={(opt) =>
                      setFilters((prev) => ({
                        ...prev,
                        bulk_term: opt?.value || "annual",
                      }))
                    }
                    isDisabled={loadingReportCardPdfs}
                    isClearable
                    className="report-react-select"
                    classNamePrefix="report-select"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="report-actions-section">
              <button
                className="report-btn report-btn-primary"
                onClick={handleGoToMasterSheet}
                disabled={!isMasterSheetReady}
                aria-disabled={!isMasterSheetReady}
              >
                <FaEye />
                <span>View Master Sheet</span>
              </button>

              {!isReadOnly && (
                <button
                  className="report-btn report-btn-download"
                  disabled={!isMasterSheetReady || loadingReportCardPdfs}
                  aria-disabled={!isMasterSheetReady || loadingReportCardPdfs}
                  onClick={handleDownloadBulkPdfs}
                >
                  <FaDownload />
                  <span>Download All Report Cards</span>
                </button>
              )}
            </div>

            {/* --- STUDENTS TABLE --- */}
            <div className="report-students-section">
              <h3 className="report-students-title">
                Students ({students.length})
              </h3>
              <div className="report-students-table-wrapper">
                {loadingTable ? (
                  <Skeleton count={5} height={30} />
                ) : students.length === 0 ? (
                  <div className="report-empty-state">
                    <p>No students found. Please adjust your filters.</p>
                  </div>
                ) : (
                  <table className="report-students-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Generate Report Card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, index) => (
                        <tr key={s.id}>
                          <td>{index + 1}</td>
                          <td>{s.student_id}</td>
                          <td>{s.full_name ?? s.name}</td>
                          <td>
                            {!isReadOnly ? (
                              <Select
                                placeholder="Select Term"
                                options={filteredTerms.map((t) => ({
                                  label: `${t.name} (Term)`,
                                  value: t.id, // FIXED: Use term ID directly
                                  termData: t, // Store full term object
                                }))}
                                onChange={(opt) => {
                                  // FIXED: Get term from filteredTerms by ID
                                  const selectedTerm = filteredTerms.find(
                                    (t) => t.id === opt.value
                                  );
                                  console.log("Selected term:", selectedTerm); // Debug
                                  handleGoToReportCard(s, selectedTerm);
                                }}
                                menuPortalTarget={document.body}
                                styles={{
                                  menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                  }),
                                }}
                                isDisabled={loadingReportCardPdfs}
                                className="report-table-select"
                                classNamePrefix="report-select"
                              />
                            ) : (
                              <span className="report-read-only-text">
                                View Only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SideTop>
  );
};
