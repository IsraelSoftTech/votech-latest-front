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

/* ═══════════════════════════════════════════════════════════════
   HELPER: Build direct backend URL for PDF downloads
   
   Opens the URL directly in the browser — exactly like pasting it
   in the address bar. No fetch, no Axios, no proxy, no CORS, no
   blob buffering. The browser handles the download natively with
   no size limits or timeout issues.
   
   When auth is re-enabled, pass the token as a query param and
   add a server-side check for ?token= in addition to the
   Authorization header.
   ═══════════════════════════════════════════════════════════════ */
function getBackendUrl(path, params) {
  // Use the full backend URL directly (bypasses CRA proxy entirely)
  const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");

  // Append token as query param so the browser's native request is authenticated
  // (when you re-enable auth, your backend middleware should check for this too)
  if (token) {
    params.set("token", token);
  }

  return `${base}/${path}?${params.toString()}`;
}

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
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: "name", order: "asc" });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  // Master sheet loading
  const [masterSheetLoading, setMasterSheetLoading] = useState(false);

  // Persistent filters
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

  // Bulk download state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    stage: "idle",
    current: 0,
    total: 0,
    message: "",
    percentage: 0,
  });

  useEffect(() => {
    localStorage.setItem("reportCardFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedSearch]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, studentsPerPage, selectedStudentId]);

  // Block tab close during generation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (
        downloadProgress.stage === "fetching" ||
        downloadProgress.stage === "generating" ||
        masterSheetLoading
      ) {
        e.preventDefault();
        e.returnValue =
          "A document is still being generated. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [downloadProgress.stage, masterSheetLoading]);

  // ── Fetch dropdowns ──
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
    if (class_id && department_id && academic_year_id) fetchStudents();
  }, [filters]);

  // ── Navigate to individual report card ──
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

    navigate(`/academics/report-card/${student.id}`, {
      state: {
        academicYear,
        department,
        class: klass,
        student,
        term: termObj,
        sequence: null,
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

  // ═══════════════════════════════════════════════════════════════
  // MASTER SHEET — Opens in new tab, browser handles download natively
  // ═══════════════════════════════════════════════════════════════
  const handleMasterSheetDownload = () => {
    if (
      !filters.academic_year_id ||
      !filters.department_id ||
      !filters.class_id
    ) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }

    const termParam = filters.bulk_term || "annual";
    const params = new URLSearchParams({
      academicYearId: filters.academic_year_id,
      departmentId: filters.department_id,
      classId: filters.class_id,
      term: termParam,
    });

    const url = getBackendUrl("report-cards/master-sheet", params);

    // Open in new tab — browser shows its own loading and downloads the PDF
    window.open(url, "_blank");

    toast.info(
      "Master Sheet is generating in a new tab — it will download automatically when ready.",
      {
        autoClose: 6000,
      }
    );
  };

  // ── Explanation modal for bulk ──
  const handleBulkPrintClick = () => {
    if (
      !filters.academic_year_id ||
      !filters.department_id ||
      !filters.class_id
    ) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }
    setShowExplanationModal(true);
  };

  const handleProceedWithPrint = () => {
    setShowExplanationModal(false);
    handleBulkDownload();
  };

  // ═══════════════════════════════════════════════════════════════
  // BULK PDF — Opens URL directly in browser (no fetch/Axios/proxy)
  // ═══════════════════════════════════════════════════════════════
  const handleBulkDownload = () => {
    const studentCount = students.length;

    const termParam = filters.bulk_term || "annual";
    const params = new URLSearchParams({
      academicYearId: filters.academic_year_id,
      departmentId: filters.department_id,
      classId: filters.class_id,
      term: termParam,
    });

    const url = getBackendUrl("report-cards/bulk-pdfs-direct", params);

    // Show progress modal
    setShowDownloadModal(true);
    setDownloadProgress({
      stage: "fetching",
      current: 0,
      total: studentCount,
      message: `Server is building ${studentCount} report cards — download will start automatically…`,
      percentage: 15,
    });

    // Simulate progress while server works
    const fetchInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev.stage !== "fetching") {
          clearInterval(fetchInterval);
          return prev;
        }
        return { ...prev, percentage: Math.min(prev.percentage + 1, 85) };
      });
    }, 600);

    // Open in hidden iframe — browser downloads the PDF natively
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    // We can't know exactly when the download finishes from an iframe,
    // so we use a reasonable timer based on class size, then show success.
    const estimatedTime = Math.max(10000, studentCount * 800);

    setTimeout(() => {
      clearInterval(fetchInterval);

      setDownloadProgress({
        stage: "ready",
        current: studentCount,
        total: studentCount,
        message: "Download started — check your Downloads folder",
        percentage: 100,
      });

      toast.success(
        `✅ ${studentCount} report cards — download should be in progress. Check your Downloads folder.`,
        { autoClose: 6000 }
      );

      setTimeout(() => {
        setShowDownloadModal(false);
        setDownloadProgress({
          stage: "idle",
          current: 0,
          total: 0,
          message: "",
          percentage: 0,
        });
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 3000);
    }, estimatedTime);
  };

  // ── Search handlers ──
  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value);
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
      if (e.key === "Enter") handleSearchExecute();
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

  const toggleSort = () => {
    setSortConfig((prev) => ({
      key: "name",
      order: prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const getSearchSuggestions = () => {
    if (!debouncedSearch.trim() || !Array.isArray(students) || !students.length)
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
      .sort((a, b) =>
        ((a.full_name ?? a.name) || "")
          .toLowerCase()
          .localeCompare(((b.full_name ?? b.name) || "").toLowerCase())
      );
  };

  const searchSuggestions = getSearchSuggestions();

  const getFilteredAndSortedStudents = () => {
    if (!Array.isArray(students) || !students.length) return [];
    let filtered = [...students];

    if (selectedStudentId) {
      filtered = filtered.filter((s) => s.id === selectedStudentId);
    } else if (searchTerm?.trim()) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          (s.full_name ?? s.name)?.toLowerCase().includes(q) ||
          s.student_id?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      const nameA = ((a.full_name ?? a.name) || "").toLowerCase();
      const nameB = ((b.full_name ?? b.name) || "").toLowerCase();
      return sortConfig.order === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    return filtered;
  };

  const filteredAndSortedStudents = getFilteredAndSortedStudents();
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

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SideTop>
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
            {/* ── FILTER ROW ── */}
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
                    isDisabled={showDownloadModal || masterSheetLoading}
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
                      )
                        ? {
                            value: filters.department_id,
                            label: (departments || []).find(
                              (d) => d.id === filters.department_id
                            )?.name,
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setFilters((prev) => ({
                        ...prev,
                        department_id: opt?.value || null,
                        class_id: null,
                      }))
                    }
                    isDisabled={showDownloadModal || masterSheetLoading}
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
                    isDisabled={showDownloadModal || masterSheetLoading}
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
                    isDisabled={showDownloadModal || masterSheetLoading}
                    isClearable
                    className="report-react-select"
                    classNamePrefix="report-select"
                  />
                </div>
              </div>
            </div>

            {/* ── Search & Sort ── */}
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

            {/* ── Info Bar ── */}
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

            {/* ── Action Buttons ── */}
            <div className="report-actions-section">
              <button
                className={`report-btn report-btn-primary ${
                  masterSheetLoading ? "report-btn-loading" : ""
                }`}
                onClick={handleMasterSheetDownload}
                disabled={
                  !isMasterSheetReady || masterSheetLoading || showDownloadModal
                }
                aria-disabled={!isMasterSheetReady || masterSheetLoading}
              >
                {masterSheetLoading ? (
                  <>
                    <FaSpinner className="report-btn-spinner" />
                    <span>Generating Master Sheet…</span>
                  </>
                ) : (
                  <>
                    <FaDownload />
                    <span>Download Master Sheet</span>
                  </>
                )}
              </button>

              {!isReadOnly && (
                <button
                  className="report-btn report-btn-download"
                  disabled={
                    !isMasterSheetReady ||
                    showDownloadModal ||
                    masterSheetLoading
                  }
                  aria-disabled={!isMasterSheetReady || showDownloadModal}
                  onClick={handleBulkPrintClick}
                >
                  <FaDownload />
                  <span>Download All Report Cards</span>
                </button>
              )}
            </div>

            {/* ── Students Table ── */}
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
                                    handleGoToReportCard(s, selectedTerm);
                                  }}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: (base) => ({
                                      ...base,
                                      zIndex: 9999,
                                    }),
                                  }}
                                  isDisabled={
                                    showDownloadModal || masterSheetLoading
                                  }
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

        {/* ── Download Progress Modal ── */}
        {showDownloadModal && (
          <div className="professional-modal-overlay">
            <div className="professional-modal-card">
              <div className="modal-status-icon">
                {downloadProgress.stage === "ready" ? (
                  <svg className="checkmark" viewBox="0 0 52 52">
                    <circle
                      className="checkmark-circle"
                      cx="26"
                      cy="26"
                      r="25"
                      fill="none"
                    />
                    <path
                      className="checkmark-check"
                      fill="none"
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                    />
                  </svg>
                ) : (
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>

              <h2 className="modal-title">
                {downloadProgress.stage === "preparing" && "Initializing"}
                {downloadProgress.stage === "fetching" &&
                  "Generating PDF on Server"}
                {downloadProgress.stage === "generating" && "Starting Download"}
                {downloadProgress.stage === "ready" && "Download Complete"}
              </h2>

              <p className="modal-message">{downloadProgress.message}</p>

              <div className="modal-progress-container">
                <div className="modal-progress-bar">
                  <div
                    className="modal-progress-fill"
                    style={{ width: `${downloadProgress.percentage}%` }}
                  />
                </div>
                <div className="modal-progress-stats">
                  <span className="progress-text">
                    {downloadProgress.current} of {downloadProgress.total}{" "}
                    students
                  </span>
                  <span className="progress-percentage">
                    {Math.round(downloadProgress.percentage)}%
                  </span>
                </div>
              </div>

              {downloadProgress.stage !== "ready" && (
                <div className="modal-info-box">
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value">
                      {downloadProgress.stage === "preparing" && "Setting up"}
                      {downloadProgress.stage === "fetching" &&
                        "Building PDF — please wait"}
                      {downloadProgress.stage === "generating" &&
                        "Downloading file"}
                    </span>
                  </div>
                </div>
              )}

              {downloadProgress.stage === "ready" && (
                <div className="modal-success-box">
                  <p className="success-text">
                    All {downloadProgress.total} report cards have been
                    downloaded as a single PDF. Check your Downloads folder.
                  </p>
                </div>
              )}

              {downloadProgress.stage === "fetching" && (
                <div className="modal-warning-box">
                  <span className="warning-text">
                    Please do not close this window while the PDF is being
                    generated
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Explanation Modal ── */}
        {showExplanationModal && (
          <div className="explanation-modal-overlay">
            <div className="explanation-modal-card">
              <div className="explanation-status-icon">
                <div className="explanation-info-icon">
                  <FaDownload />
                </div>
              </div>

              <h2 className="explanation-title">Download Bulk Report Cards</h2>
              <p className="explanation-subtitle">
                This will generate a single PDF containing{" "}
                <strong>{students.length} report cards</strong> (one per page)
                and download it directly to your computer.
              </p>

              <div className="explanation-steps">
                <div className="explanation-step">
                  <div className="step-number">1</div>
                  <div className="step-text">
                    <h4>Server generates PDF</h4>
                    <p>
                      All {students.length} report cards are built on the server
                      as a native PDF — sharp text, perfect layout.
                    </p>
                  </div>
                </div>

                <div className="explanation-step">
                  <div className="step-number">2</div>
                  <div className="step-text">
                    <h4>Automatic download</h4>
                    <p>
                      The finished PDF downloads directly to your Downloads
                      folder. No print dialog needed.
                    </p>
                  </div>
                </div>

                <div className="explanation-step">
                  <div className="step-number">3</div>
                  <div className="step-text">
                    <h4>Open and print</h4>
                    <p>
                      Open the downloaded PDF in any viewer and print — every
                      report card fits exactly one page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="explanation-important">
                <div className="important-header">
                  <FaExclamationTriangle className="important-icon" />
                  <h4>Please note:</h4>
                </div>
                <ul className="important-list">
                  <li>
                    Generation may take{" "}
                    <strong>
                      up to {Math.max(1, Math.ceil(students.length * 0.05))}{" "}
                      minute(s)
                    </strong>{" "}
                    for large classes
                  </li>
                  <li>
                    <strong>Do not close</strong> the browser tab while
                    generating
                  </li>
                  <li>
                    The PDF will have <strong>crisp, sharp text</strong> — no
                    blurry or doubled characters
                  </li>
                </ul>
              </div>

              <div className="explanation-actions">
                <button
                  className="explanation-btn explanation-btn-cancel"
                  onClick={() => setShowExplanationModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="explanation-btn explanation-btn-proceed"
                  onClick={handleProceedWithPrint}
                >
                  <FaDownload style={{ marginRight: 6 }} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
};

export default ReportCardHomePage;
