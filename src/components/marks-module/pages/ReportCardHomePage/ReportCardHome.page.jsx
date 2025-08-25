import "./ReportCard.styles.css";
import React, { useState, useEffect, useRef } from "react";
import SideTop from "../../../SideTop";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export const ReportCardHomePage = () => {
  const navigate = useNavigate();

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
      bulk_term: "annual", // 'annual' or a specific term id
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

  // Simulate 30% → 50% → 70% then pause until real completion
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

  const fetchReportCards = async () => {
    try {
      const { class_id, department_id, academic_year_id } = filters;

      if (!class_id || !department_id || !academic_year_id) {
        toast.error("Filters incomplete.");
        return;
      }

      const res = await api.get(
        `/report-cards/bulk?academicYearId=${academic_year_id}&departmentId=${department_id}&classId=${class_id}`
      );

      console.log(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // save filters to localStorage whenever they change
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
          fetch(`${subBaseURL}/specialties`, { headers }).then((r) => r.json()),
        ]);

      setAcademicYears(yearsRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setTerms(termsRes.data.data || []);
      setSequences(sequencesRes.data.data || []);
      setDepartments(deptRes || []);
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingPage(false);
    }
  };

  const fetchStudents = async () => {
    const { class_id, department_id, academic_year_id } = filters;
    if (!class_id || !department_id || !academic_year_id) {
      setStudents([]); // clear table if filters incomplete
      return;
    }

    setLoadingTable(true);
    try {
      const res = await api.get(
        `/students?class_id=${class_id}&specialty_id=${department_id}&academic_year_id=${academic_year_id}`
      );
      setStudents(res.data.data || []);
      // fetchReportCards();
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
      // fetchReportCards();
    }
  }, [filters]);

  // --- NAVIGATE TO REPORT CARD PAGE ---
  const handleGoToReportCard = (student, termObj, sequenceObj) => {
    const academicYear =
      academicYears.find((y) => y.id === filters.academic_year_id) || null;
    const department =
      departments.find((d) => d.id === filters.department_id) || null;
    const klass = classes.find((c) => c.id === filters.class_id) || null;

    if (!academicYear || !department || !klass) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }

    navigate(`/academics/report-card/${student.id}`, {
      state: {
        // full objects (preferred)
        academicYear,
        department,
        class: klass,
        student,
        term: termObj || null,
        sequence: sequenceObj || null,

        // keep ids too (optional/back-compat)
        academic_year_id: academicYear.id,
        department_id: department.id,
        class_id: klass.id,
        ids: {
          academic_year_id: academicYear.id,
          department_id: department.id,
          class_id: klass.id,
        },
      },
    });
  };

  const handleGoToMasterSheet = () => {
    navigate(`/academics/master-sheets`, {
      state: {
        department: departments.find((d) => d.id === filters.department_id),
        class: classes.find((c) => c.id === filters.class_id),
        academic_year_id: filters.academic_year_id,
        term: terms.find((t) => t.id === filters.term_id),
        sequence: sequences.find((s) => s.id === filters.sequence_id),
      },
    });
  };

  const handleDownloadBulkPdfs = () => {
    const downloadPdfs = async () => {
      try {
        // Start the simulated progress
        startPdfSimProgress();

        const termParam = filters.bulk_term || "annual";

        const res = await api.get(
          `/report-cards/bulk-pdfs?classId=${filters.class_id}&departmentId=${
            filters.department_id
          }&academicYearId=${
            filters.academic_year_id
          }&term=${encodeURIComponent(termParam)}`,
          { responseType: "blob", timeout: 0 } // ensure we get raw bytes
        );

        // fallback values
        const academicYear =
          academicYears.find((y) => y.id === filters.academic_year_id)?.name ||
          "AcademicYear";
        const department =
          departments.find((d) => d.id === filters.department_id)?.name ||
          "Department";
        const klass =
          classes.find((c) => c.id === filters.class_id)?.name || "Class";

        // derive term label for filename
        const termObj = terms.find(
          (t) => String(t.id) === String(filters.bulk_term)
        );
        const termLabel =
          filters.bulk_term === "annual" ? "Annual" : termObj?.name || "Term";

        // create blob and object URL
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);

        // determine filename
        let fileName = `${academicYear}-${department}-${klass}-${termLabel}-ReportCards.pdf`;
        const contentDisposition = res.headers["content-disposition"];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+)"?/);
          if (match?.[1]) fileName = match[1];
        }

        // trigger download
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        // cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
        console.log("Report cards PDF downloaded successfully.");
        toast.success("Report cards PDF downloaded successfully.");

        // Rush to 100% and close overlay
        finishPdfSimProgress();
      } catch (err) {
        toast.error(
          err?.response?.data?.details || "Error downloading report cards."
        );
        console.error("PDF download error:", err);
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
  const filteredSequences = filters.academic_year_id
    ? sequences.filter((s) => s.academic_year_id === filters.academic_year_id)
    : [];

  const isMasterSheetReady = Boolean(
    filters.academic_year_id && filters.department_id && filters.class_id
  );

  // Options for Bulk PDF term select
  const bulkTermOptions = [
    { value: "annual", label: "Annual (All Terms)" },
    { value: "t1", label: "First Term" },
    { value: "t2", label: "Second Term" },
    { value: "t3", label: "Third Term" },
  ];
  const bulkTermValue =
    bulkTermOptions.find(
      (opt) => String(opt.value) === String(filters.bulk_term)
    ) || bulkTermOptions[0];

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
        <h2>Generate Report Cards</h2>

        {loadingPage ? (
          <Skeleton height={35} count={6} style={{ marginBottom: "10px" }} />
        ) : (
          <>
            <div>
              <button className="back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft /> <span>Go Back</span>
              </button>
            </div>
            {/* --- FILTER ROW --- */}
            <div className="filters-row">
              <div className="form-react-select">
                <Select
                  placeholder="Academic Year"
                  options={academicYears.map((y) => ({
                    value: y.id,
                    label: y.name,
                  }))}
                  value={
                    academicYears
                      .map((y) => ({ value: y.id, label: y.name }))
                      .find((opt) => opt.value === filters.academic_year_id) ||
                    null
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      academic_year_id: opt?.value || null,
                      // reset bulk term when year changes
                      bulk_term: "annual",
                    }))
                  }
                  isDisabled={loadingReportCardPdfs}
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Department"
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  value={
                    departments.find((d) => d.id === filters.department_id) && {
                      value: filters.department_id,
                      label: departments.find(
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
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Class"
                  options={filteredClasses.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={
                    filteredClasses.find((c) => c.id === filters.class_id) && {
                      value: filters.class_id,
                      label: filteredClasses.find(
                        (c) => c.id === filters.class_id
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      class_id: opt?.value || null,
                    }))
                  }
                  isDisabled={loadingReportCardPdfs}
                />
              </div>

              {/* Term for Bulk PDF */}
              <div className="form-react-select">
                <Select
                  placeholder="Term (Bulk PDF)"
                  options={bulkTermOptions}
                  value={bulkTermValue}
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      bulk_term: opt?.value || "annual",
                    }))
                  }
                  isDisabled={loadingReportCardPdfs}
                />
              </div>
            </div>

            <div className="master-sheet-holder">
              <button
                className="btn btn-create"
                onClick={handleGoToMasterSheet}
                disabled={!isMasterSheetReady}
                aria-disabled={!isMasterSheetReady}
              >
                View Master Sheet
              </button>

              <button
                className="btn btn-create"
                disabled={!isMasterSheetReady || loadingReportCardPdfs}
                aria-disabled={!isMasterSheetReady || loadingReportCardPdfs}
                onClick={handleDownloadBulkPdfs}
              >
                Download all Report Cards <FaDownload />
              </button>
            </div>
            {/* --- STUDENTS TABLE --- */}

            <div className="students-table-wrapper">
              {loadingTable ? (
                <Skeleton count={5} height={30} />
              ) : (
                <table>
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
                          <Select
                            placeholder="Select Term"
                            options={filteredTerms.map((t) => ({
                              label: `${t.name} (Term)`,
                              value: { term: t, sequence: null },
                            }))}
                            onChange={(opt) =>
                              handleGoToReportCard(s, opt.value.term, null)
                            }
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                            }}
                            isDisabled={loadingReportCardPdfs}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </SideTop>
  );
};
