import "./ReportCard.styles.css";
import React, { useState, useEffect, useRef } from "react";
import SideTop from "../../../SideTop";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  FaArrowLeft,
  FaDownload,
  FaLock,
  FaEye,
  FaSearch,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaFileAlt,
  FaCog,
  FaSpinner,
  FaCheckCircle,
  FaPrint,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal/Modal.component";
import { FaCoffee } from "react-icons/fa";

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

const ReportCardHomePage = () => {
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

  // Search states
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: "name", order: "asc" });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Show suggestions when debounced search changes
  useEffect(() => {
    if (debouncedSearch.trim()) {
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedSearch]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 when search, sort, or per-page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, studentsPerPage, selectedStudentId]);

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

  // Add new state for print modal

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printProgress, setPrintProgress] = useState({
    stage: "idle",

    current: 0,
    total: 0,
    message: "",
  });
  const iframeRef = useRef(null);

  const handleBulkPrintNative = async () => {
    try {
      if (
        !filters.academic_year_id ||
        !filters.department_id ||
        !filters.class_id
      ) {
        toast.error("Please select Academic Year, Department, and Class.");
        return;
      }

      const studentCount = students.length;
      const estimatedMinutes = Math.ceil((studentCount * 0.2) / 60); // 200ms per student

      setShowPrintModal(true);
      setPrintProgress({
        stage: "preparing",
        current: 0,
        total: studentCount,
        message: "Preparing to generate report cards...",
        estimatedMinutes: estimatedMinutes,
      });

      const termParam = filters.bulk_term || "annual";
      const params = new URLSearchParams({
        academicYearId: filters.academic_year_id,
        departmentId: filters.department_id,
        classId: filters.class_id,
        term: termParam,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      setPrintProgress({
        stage: "generating",
        current: 0,
        total: studentCount,
        message: "Generating report cards on server...",
        estimatedMinutes: estimatedMinutes,
      });

      const progressInterval = setInterval(() => {
        setPrintProgress((prev) => {
          if (prev.current >= prev.total * 0.8) {
            clearInterval(progressInterval);
            return prev;
          }
          const increment = Math.min(
            Math.floor(Math.random() * 3) + 1,
            Math.floor(prev.total * 0.8) - prev.current
          );
          return {
            ...prev,
            current: Math.min(
              prev.current + increment,
              Math.floor(prev.total * 0.8)
            ),
          };
        });
      }, 400);

      const response = await api.get(`/report-cards/bulk-html?${params}`, {
        responseType: "blob",
        timeout: 180000,
      });

      clearInterval(progressInterval);

      // Close modal and show important instructions
      setShowPrintModal(false);

      // Show critical user guidance modal BEFORE opening print
      const userConfirmed = window.confirm(
        `IMPORTANT INSTRUCTIONS:\n\n` +
          `When the print dialog opens:\n\n` +
          `1. The file will show "0 KB" initially - THIS IS NORMAL\n` +
          `2. DO NOT close the print dialog\n` +
          `3. Wait ${estimatedMinutes}-${
            estimatedMinutes + 2
          } minutes for the file to fully render\n` +
          `4. The file size will gradually increase to ~${Math.ceil(
            studentCount * 0.5
          )}MB\n` +
          `5. Only click "Save" when you see the full file size\n\n` +
          `The more students, the longer it takes. Please be patient.\n\n` +
          `Click OK to open the print dialog now.`
      );

      if (!userConfirmed) {
        toast.info("Print cancelled");
        return;
      }

      // Create blob and iframe
      const htmlBlob = new Blob([response.data], { type: "text/html" });
      const blobUrl = URL.createObjectURL(htmlBlob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.opacity = "0";

      iframeRef.current = iframe;

      iframe.onload = () => {
        // Open print dialog immediately
        // User has been warned about the 0KB delay
        iframe.contentWindow.print();

        // Show reminder toast
        toast.info(
          `⏳ The PDF is rendering... File will show 0KB initially. Wait ${estimatedMinutes}-${
            estimatedMinutes + 2
          } minutes before saving!`,
          { autoClose: 10000 }
        );
      };

      iframe.onerror = () => {
        toast.error("Failed to load report cards.");
      };

      iframe.src = blobUrl;
      document.body.appendChild(iframe);
    } catch (error) {
      console.error("Bulk print error:", error);
      toast.error(error.message || "Failed to generate report cards");
      cleanupPrint();
    }
  };

  /**
   * Cleanup function for print resources
   */
  const cleanupPrint = () => {
    setShowPrintModal(false);
    setPrintProgress({
      stage: "idle",
      current: 0,
      total: 0,
      message: "",
    });

    // Remove iframe if exists
    if (iframeRef.current && document.body.contains(iframeRef.current)) {
      const blobUrl = iframeRef.current.src;
      document.body.removeChild(iframeRef.current);

      // Revoke blob URL to free memory
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }

      iframeRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPrint();
    };
  }, []);

  // Search handlers
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setSelectedStudentId(null);
  };

  const handleSearchExecute = () => {
    setSearchTerm(searchInput);
    setShowSuggestions(false);
    setSelectedStudentId(null);
    setHighlightedIndex(-1);
  };

  const handleSuggestionClick = (student) => {
    setSearchInput(student.full_name ?? student.name);
    setSearchTerm("");
    setSelectedStudentId(student.id);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setSelectedStudentId(null);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || searchSuggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearchExecute();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < searchSuggestions.length
        ) {
          handleSuggestionClick(searchSuggestions[highlightedIndex]);
        } else {
          handleSearchExecute();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Toggle sort
  const toggleSort = () => {
    setSortConfig((prev) => ({
      key: "name",
      order: prev.order === "asc" ? "desc" : "asc",
    }));
  };

  // Get search suggestions
  const getSearchSuggestions = () => {
    if (
      !debouncedSearch.trim() ||
      !Array.isArray(students) ||
      students.length === 0
    )
      return [];

    return students
      .filter(
        (s) =>
          (s.full_name ?? s.name)
            ?.toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          s.student_id?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
      .slice(0, 8)
      .sort((a, b) => {
        const nameA = ((a.full_name ?? a.name) || "").toLowerCase();
        const nameB = ((b.full_name ?? b.name) || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
  };

  const searchSuggestions = getSearchSuggestions();

  // Filter and sort students
  const getFilteredAndSortedStudents = () => {
    if (!Array.isArray(students) || students.length === 0) return [];

    let filtered = [...students];

    // Apply search filter
    if (selectedStudentId) {
      filtered = filtered.filter((s) => s.id === selectedStudentId);
    } else if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          ((s.full_name ?? s.name) &&
            (s.full_name ?? s.name).toLowerCase().includes(searchLower)) ||
          (s.student_id && s.student_id.toLowerCase().includes(searchLower))
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      const nameA = ((a.full_name ?? a.name) || "").toLowerCase();
      const nameB = ((b.full_name ?? b.name) || "").toLowerCase();

      if (sortConfig.order === "asc") {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    return filtered;
  };

  const filteredAndSortedStudents = getFilteredAndSortedStudents();

  // Calculate pagination
  const totalStudents = filteredAndSortedStudents.length;
  const totalPages =
    studentsPerPage === "all" ? 1 : Math.ceil(totalStudents / studentsPerPage);

  const paginatedStudents =
    studentsPerPage === "all"
      ? filteredAndSortedStudents
      : filteredAndSortedStudents.slice(
          (currentPage - 1) * studentsPerPage,
          currentPage * studentsPerPage
        );

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

            {/* Search and Sort Controls */}
            {students.length > 0 && (
              <div className="marks-controls-container">
                <div className="marks-search-wrapper">
                  <div className="marks-search-bar" ref={searchInputRef}>
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name or student ID..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => {
                        if (debouncedSearch.trim()) setShowSuggestions(true);
                      }}
                      className="marks-search-input"
                    />
                    {(searchInput || selectedStudentId) && (
                      <button
                        className="search-clear-btn"
                        onClick={handleClearSearch}
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      className="search-execute-btn"
                      onClick={handleSearchExecute}
                      type="button"
                      title="Search"
                    >
                      <FaSearch />
                    </button>
                  </div>

                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="search-suggestions" ref={suggestionsRef}>
                      <div className="suggestions-header">
                        <span>
                          Select a student or press Enter to search all
                        </span>
                      </div>
                      {searchSuggestions.map((student, index) => (
                        <div
                          key={student.id}
                          className={`suggestion-item ${
                            index === highlightedIndex ? "highlighted" : ""
                          }`}
                          onClick={() => handleSuggestionClick(student)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="suggestion-name">
                            {student.full_name ?? student.name}
                          </div>
                          <div className="suggestion-id">
                            {student.student_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="marks-controls-right">
                  <button
                    className="marks-sort-btn"
                    onClick={toggleSort}
                    title={sortConfig.order === "asc" ? "Sort Z-A" : "Sort A-Z"}
                  >
                    {sortConfig.order === "asc" ? (
                      <>
                        <FaSortAlphaDown /> A-Z
                      </>
                    ) : (
                      <>
                        <FaSortAlphaUp /> Z-A
                      </>
                    )}
                  </button>

                  <Select
                    className="marks-per-page-select"
                    options={[
                      { value: 10, label: "Show 10" },
                      { value: 25, label: "Show 25" },
                      { value: 50, label: "Show 50" },
                      { value: "all", label: "Show All" },
                    ]}
                    value={{
                      value: studentsPerPage,
                      label:
                        studentsPerPage === "all"
                          ? "Show All"
                          : `Show ${studentsPerPage}`,
                    }}
                    onChange={(opt) => setStudentsPerPage(opt.value)}
                    isSearchable={false}
                  />
                </div>
              </div>
            )}

            {/* Info Bar */}
            {students.length > 0 && (
              <div className="marks-info-bar">
                <span className="marks-count-info">
                  Showing {paginatedStudents.length} of {totalStudents}{" "}
                  student(s)
                </span>
                {selectedStudentId && (
                  <span className="marks-search-info">
                    Viewing:{" "}
                    {students.find((s) => s.id === selectedStudentId)
                      ?.full_name ??
                      students.find((s) => s.id === selectedStudentId)?.name}
                  </span>
                )}
                {searchTerm && !selectedStudentId && (
                  <span className="marks-search-info">
                    Filtered by: "{searchTerm}"
                  </span>
                )}
              </div>
            )}

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
                  onClick={handleBulkPrintNative}
                >
                  <FaDownload />
                  <span>Print All Report Cards</span>
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
                ) : paginatedStudents.length === 0 ? (
                  <div className="report-empty-state">
                    {searchTerm || selectedStudentId ? (
                      <p>No students found matching your search</p>
                    ) : (
                      <p>No students found. Please adjust your filters.</p>
                    )}
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
                      {paginatedStudents.map((s, index) => {
                        const globalIndex =
                          studentsPerPage === "all"
                            ? index
                            : (currentPage - 1) * studentsPerPage + index;
                        return (
                          <tr key={s.id}>
                            <td>{globalIndex + 1}</td>
                            <td>{s.student_id}</td>
                            <td>{s.full_name ?? s.name}</td>
                            <td>
                              {!isReadOnly ? (
                                <Select
                                  placeholder="Select Term"
                                  options={filteredTerms.map((t) => ({
                                    label: `${t.name} (Term)`,
                                    value: t.id,
                                    termData: t,
                                  }))}
                                  onChange={(opt) => {
                                    const selectedTerm = filteredTerms.find(
                                      (t) => t.id === opt.value
                                    );
                                    console.log("Selected term:", selectedTerm);
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
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {studentsPerPage !== "all" && totalPages > 1 && (
                <div className="marks-pagination">
                  <button
                    className="marks-pagination-btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <div className="marks-pagination-numbers">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            className={`marks-pagination-number ${
                              currentPage === pageNum ? "active" : ""
                            }`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return <span key={pageNum}>...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    className="marks-pagination-btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <Modal isOpen={showPrintModal} onClose={cleanupPrint}>
          {/* Header */}
          <div className="print-modal-header">
            <div className="print-modal-header-icon">
              {printProgress.stage === "ready" ? (
                <FaCheckCircle className="icon-success-static" />
              ) : printProgress.stage === "rendering" ||
                printProgress.stage === "finalizing" ? (
                <FaCoffee className="icon-coffee-pulse" />
              ) : (
                <FaFileAlt />
              )}
            </div>
            <h3 className="print-modal-title">
              {printProgress.stage === "preparing" && "Preparing Report Cards"}
              {printProgress.stage === "generating" &&
                "Generating Report Cards"}
              {printProgress.stage === "rendering" && "Rendering Documents"}
              {printProgress.stage === "finalizing" &&
                "Finalizing - Almost Ready"}
              {printProgress.stage === "creating-download" &&
                "Creating Download"}
              {printProgress.stage === "ready" && "Report Cards Ready!"}
            </h3>
          </div>

          {/* Progress Body */}
          <div className="print-modal-body">
            {/* Progress Bar */}
            <div className="print-progress-container">
              <div className="print-progress-bar">
                <div
                  className="print-progress-fill"
                  style={{
                    width: `${
                      printProgress.total > 0
                        ? (printProgress.current / printProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="print-progress-stats">
                <span className="print-progress-count">
                  {printProgress.current} / {printProgress.total} students
                </span>
                <span className="print-progress-percent">
                  {printProgress.total > 0
                    ? Math.round(
                        (printProgress.current / printProgress.total) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Status Message */}
            <div className="print-status-message">
              <div className="print-status-icon">
                {printProgress.stage === "preparing" && (
                  <FaCog className="icon-spinning" />
                )}
                {printProgress.stage === "generating" && (
                  <FaSpinner className="icon-spinning" />
                )}
                {(printProgress.stage === "rendering" ||
                  printProgress.stage === "finalizing" ||
                  printProgress.stage === "creating-download") && (
                  <FaCog className="icon-spinning" />
                )}
                {printProgress.stage === "ready" && (
                  <FaCheckCircle className="icon-success" />
                )}
              </div>
              <p>{printProgress.message}</p>
            </div>

            {/* Stage-specific Instructions */}
            {printProgress.stage === "preparing" && (
              <div className="print-instructions">
                <p className="instruction-item">
                  <FaInfoCircle className="instruction-icon" />
                  Connecting to server and retrieving student data...
                </p>
              </div>
            )}

            {printProgress.stage === "generating" && (
              <div className="print-instructions">
                <p className="instruction-item">
                  <FaInfoCircle className="instruction-icon" />
                  Server is generating report cards with all calculations...
                </p>
                <p className="instruction-warning">
                  <FaExclamationTriangle className="warning-icon" />
                  Please do not close this window
                </p>
              </div>
            )}

            {(printProgress.stage === "rendering" ||
              printProgress.stage === "finalizing") && (
              <div className="print-instructions critical-phase">
                <div className="coffee-break-banner">
                  <FaCoffee className="coffee-icon-large" />
                  <div className="coffee-break-text">
                    <h4>This may take some time...</h4>
                    <p>
                      Typically {printProgress.estimatedMinutes} to{" "}
                      {printProgress.estimatedMinutes + 1} minute
                      {printProgress.estimatedMinutes !== 1 ? "s" : ""} for{" "}
                      {printProgress.total} students
                    </p>
                  </div>
                </div>

                <p className="instruction-item-large">
                  <FaInfoCircle className="instruction-icon" />
                  We're ensuring the file is <strong>100% written</strong> to
                  prevent the 0KB file issue.
                </p>

                <div className="critical-warning-box">
                  <FaExclamationTriangle className="warning-icon-large" />
                  <div>
                    <strong>
                      IMPORTANT: Please do not close this tab or window!
                    </strong>
                    <p>
                      Feel free to grab a coffee ☕ or work on something else
                      while we process. You'll get a download link when ready.
                    </p>
                  </div>
                </div>

                <div className="helpful-tips">
                  <p className="tip-item">
                    💡 The browser is rendering all {printProgress.total} report
                    cards
                  </p>
                  <p className="tip-item">
                    💡 This ensures your file will be instantly ready when
                    downloaded
                  </p>
                  <p className="tip-item">
                    💡 Larger classes take longer - this is normal and expected
                  </p>
                </div>
              </div>
            )}

            {printProgress.stage === "creating-download" && (
              <div className="print-instructions">
                <p className="instruction-item">
                  <FaCog className="icon-spinning instruction-icon" />
                  Creating download package...
                </p>
              </div>
            )}

            {printProgress.stage === "ready" && (
              <div className="print-instructions success">
                <p className="instruction-item success-header">
                  <FaCheckCircle className="instruction-icon" />
                  All {printProgress.total} report cards rendered successfully!
                </p>
                <p className="instruction-item success-detail">
                  ✅ File is 100% written - NO 0KB issue!
                </p>

                <a
                  href={printProgress.downloadUrl}
                  download={printProgress.fileName}
                  className="download-pdf-button"
                  onClick={() => {
                    setTimeout(() => cleanupPrint(), 1000);
                  }}
                >
                  <FaDownload />
                  Download Fully-Rendered Report Cards
                </a>

                <div className="instruction-note">
                  <FaInfoCircle className="instruction-icon-small" />
                  <p>
                    After downloading, open the HTML file in your browser and
                    use <strong>Ctrl+P</strong> (or <strong>Cmd+P</strong> on
                    Mac) to save as PDF. The file will be instantly ready since
                    it's already fully rendered.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="print-modal-footer">
            {printProgress.stage === "ready" ? (
              <button className="btn-close-success" onClick={cleanupPrint}>
                <FaCheckCircle />
                Close
              </button>
            ) : (
              <button
                className="btn-cancel"
                onClick={cleanupPrint}
                disabled={
                  printProgress.stage === "rendering" ||
                  printProgress.stage === "finalizing" ||
                  printProgress.stage === "creating-download"
                }
                title={
                  printProgress.stage === "rendering" ||
                  printProgress.stage === "finalizing" ||
                  printProgress.stage === "creating-download"
                    ? "Cannot cancel during rendering - file is being written"
                    : "Cancel operation"
                }
              >
                <FaTimes />
                {printProgress.stage === "rendering" ||
                printProgress.stage === "finalizing" ||
                printProgress.stage === "creating-download"
                  ? "Please Wait - File Writing..."
                  : "Cancel"}
              </button>
            )}
          </div>
        </Modal>
      </div>
    </SideTop>
  );
};

export default ReportCardHomePage;
