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
  const [showExplanationModal, setShowExplanationModal] = useState(false);

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

  // --- BULK PRINT STATE ---
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printProgress, setPrintProgress] = useState({
    stage: "idle", // idle, preparing, fetching, rendering, printing, monitoring, ready
    current: 0,
    total: 0,
    message: "",
    percentage: 0,
    estimatedSeconds: 0,
  });
  const iframeRef = useRef(null);
  const renderCheckIntervalRef = useRef(null);

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

  // Block tab close during rendering and monitoring
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (
        printProgress.stage === "rendering" ||
        printProgress.stage === "fetching" ||
        printProgress.stage === "monitoring"
      ) {
        e.preventDefault();
        e.returnValue =
          "Report cards are still being processed. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [printProgress.stage]);

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

  // --- NAVIGATE TO REPORT CARD PAGE ---
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

  // --- BULK PRINT WITH FILE WRITE MONITORING ---
  // Add these functions after handleGoToMasterSheet function (around line 300)

  // --- SHOW EXPLANATION MODAL ---
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
    handleBulkPrintNative();
  };

  // --- BULK PRINT WITH CLEAR PROCESS ---
  const handleBulkPrintNative = async () => {
    try {
      const studentCount = students.length;
      const estimatedMB = Math.ceil(studentCount * 0.3);
      const estimatedMinutes = Math.ceil(studentCount * 0.1);
      const estimatedSeconds = Math.ceil(studentCount * 1.2);

      // Show modal and start
      setShowPrintModal(true);
      setPrintProgress({
        stage: "preparing",
        current: 0,
        total: studentCount,
        message: "Initializing generation",
        percentage: 0,
        estimatedSeconds,
      });

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Update to fetching stage
      setPrintProgress({
        stage: "fetching",
        current: 0,
        total: studentCount,
        message: "Retrieving data from server",
        percentage: 5,
        estimatedSeconds,
      });

      const termParam = filters.bulk_term || "annual";
      const params = new URLSearchParams({
        academicYearId: filters.academic_year_id,
        departmentId: filters.department_id,
        classId: filters.class_id,
        term: termParam,
      });

      // Simulate fetch progress
      const fetchInterval = setInterval(() => {
        setPrintProgress((prev) => {
          if (prev.stage !== "fetching") {
            clearInterval(fetchInterval);
            return prev;
          }
          const newPercentage = Math.min(prev.percentage + 2, 25);
          return {
            ...prev,
            percentage: newPercentage,
          };
        });
      }, 200);

      const response = await api.get(`/report-cards/bulk-html?${params}`, {
        responseType: "blob",
        timeout: 180000,
      });

      clearInterval(fetchInterval);

      // Create blob URL
      const htmlBlob = new Blob([response.data], { type: "text/html" });
      const blobUrl = URL.createObjectURL(htmlBlob);

      // Update to rendering stage
      setPrintProgress({
        stage: "rendering",
        current: 0,
        total: studentCount,
        message: "Rendering documents in browser",
        percentage: 30,
        estimatedSeconds,
      });

      // Create hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";

      iframeRef.current = iframe;

      // Promise-based iframe loading with comprehensive checks
      const waitForIframeReady = () => {
        return new Promise((resolve, reject) => {
          let checksCompleted = 0;
          const totalChecks = 3;

          const updateProgress = () => {
            checksCompleted++;
            const progressPerCheck = 55 / totalChecks;
            setPrintProgress((prev) => ({
              ...prev,
              percentage: Math.min(30 + checksCompleted * progressPerCheck, 85),
              current: Math.floor(
                (checksCompleted / totalChecks) * studentCount
              ),
            }));
          };

          iframe.onload = async () => {
            try {
              const iframeDoc =
                iframe.contentDocument || iframe.contentWindow.document;

              const waitForReadyState = () => {
                return new Promise((res) => {
                  if (iframeDoc.readyState === "complete") {
                    updateProgress();
                    res();
                  } else {
                    iframeDoc.addEventListener(
                      "readystatechange",
                      function handler() {
                        if (iframeDoc.readyState === "complete") {
                          iframeDoc.removeEventListener(
                            "readystatechange",
                            handler
                          );
                          updateProgress();
                          res();
                        }
                      }
                    );
                  }
                });
              };

              await waitForReadyState();

              const waitForImages = () => {
                return new Promise((res) => {
                  const images = Array.from(iframeDoc.images);
                  if (images.length === 0) {
                    updateProgress();
                    res();
                    return;
                  }

                  let loadedImages = 0;
                  const checkAllLoaded = () => {
                    loadedImages++;
                    if (loadedImages === images.length) {
                      updateProgress();
                      res();
                    }
                  };

                  images.forEach((img) => {
                    if (img.complete) {
                      checkAllLoaded();
                    } else {
                      img.addEventListener("load", checkAllLoaded);
                      img.addEventListener("error", checkAllLoaded);
                    }
                  });
                });
              };

              await waitForImages();

              const waitForStability = () => {
                return new Promise((res) => {
                  let lastHeight = iframeDoc.body.scrollHeight;
                  let stableCount = 0;
                  const requiredStableChecks = 5;

                  const checkStability = () => {
                    const currentHeight = iframeDoc.body.scrollHeight;
                    if (currentHeight === lastHeight) {
                      stableCount++;
                      if (stableCount >= requiredStableChecks) {
                        updateProgress();
                        res();
                        return;
                      }
                    } else {
                      stableCount = 0;
                      lastHeight = currentHeight;
                    }
                    setTimeout(checkStability, 600);
                  };

                  checkStability();
                });
              };

              await waitForStability();
              await new Promise((res) => setTimeout(res, 3000));

              resolve();
            } catch (error) {
              reject(error);
            }
          };

          iframe.onerror = () => {
            reject(new Error("Failed to load report cards"));
          };

          setTimeout(() => {
            reject(new Error("Rendering timeout"));
          }, 300000);
        });
      };

      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      await waitForIframeReady();

      setPrintProgress({
        stage: "printing",
        current: studentCount,
        total: studentCount,
        message: "Opening print dialog - please save when ready",
        percentage: 90,
        estimatedSeconds,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      const academicYear = academicYears.find(
        (y) => y.id === filters.academic_year_id
      );
      const department = departments.find(
        (d) => d.id === filters.department_id
      );
      const classObj = classes.find((c) => c.id === filters.class_id);
      const termLabel =
        filters.bulk_term === "annual"
          ? "Annual"
          : `Term-${filters.bulk_term.replace("t", "")}`;

      const expectedFileName = `ReportCards_${
        classObj?.name || "Class"
      }_${termLabel}_${academicYear?.name || "Year"}`;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const originalTitle = iframeDoc.title;
      iframeDoc.title = expectedFileName;

      iframe.contentWindow.print();

      // Show helpful toast with file write guidance
      toast.info(
        `⏳ After saving, the PDF will show 0 KB initially. Wait ${estimatedMinutes} minutes for the file to finish writing (final size ~${estimatedMB} MB).`,
        { autoClose: 15000 }
      );

      // Simple completion after print dialog
      let dialogClosed = false;

      const handleWindowFocus = () => {
        if (!dialogClosed) {
          dialogClosed = true;
          setTimeout(() => {
            setPrintProgress({
              stage: "ready",
              current: studentCount,
              total: studentCount,
              message: "Print dialog closed",
              percentage: 100,
              estimatedSeconds,
            });

            setTimeout(() => {
              setShowPrintModal(false);
              toast.success(
                `PDF generation started. The file will finish writing in ${estimatedMinutes} minutes.`,
                { autoClose: 8000 }
              );
              cleanupPrint();
              URL.revokeObjectURL(blobUrl);
            }, 1500);
          }, 1000);
        }
      };

      window.addEventListener("focus", handleWindowFocus, { once: true });

      setTimeout(() => {
        if (!dialogClosed) {
          dialogClosed = true;
          window.removeEventListener("focus", handleWindowFocus);
          setPrintProgress({
            stage: "ready",
            current: studentCount,
            total: studentCount,
            message: "Timeout reached",
            percentage: 100,
            estimatedSeconds,
          });

          setTimeout(() => {
            setShowPrintModal(false);
            cleanupPrint();
            URL.revokeObjectURL(blobUrl);
          }, 1500);
        }
      }, 300000);
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
    // Clear any intervals
    if (renderCheckIntervalRef.current) {
      clearInterval(renderCheckIntervalRef.current);
      renderCheckIntervalRef.current = null;
    }

    setShowPrintModal(false);
    setPrintProgress({
      stage: "idle",
      current: 0,
      total: 0,
      message: "",
      percentage: 0,
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
                    isDisabled={showPrintModal}
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
                    isDisabled={showPrintModal}
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
                    isDisabled={showPrintModal}
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
                    isDisabled={showPrintModal}
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
                  disabled={!isMasterSheetReady || showPrintModal}
                  aria-disabled={!isMasterSheetReady || showPrintModal}
                  onClick={handleBulkPrintClick}
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
                                    handleGoToReportCard(s, selectedTerm);
                                  }}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: (base) => ({
                                      ...base,
                                      zIndex: 9999,
                                    }),
                                  }}
                                  isDisabled={showPrintModal}
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

        {/* PROFESSIONAL MODAL */}
        {showPrintModal && (
          <div className="professional-modal-overlay">
            <div className="professional-modal-card">
              {/* Status Icon */}
              <div className="modal-status-icon">
                {printProgress.stage === "ready" ? (
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

              {/* Title */}
              <h2 className="modal-title">
                {printProgress.stage === "preparing" && "Initializing"}
                {printProgress.stage === "fetching" && "Retrieving Data"}
                {printProgress.stage === "rendering" && "Processing Documents"}
                {printProgress.stage === "printing" && "Print Dialog Ready"}
                {printProgress.stage === "monitoring" && "Saving PDF File"}
                {printProgress.stage === "ready" && "Complete"}
              </h2>

              {/* Message */}
              <p className="modal-message">{printProgress.message}</p>

              {/* Progress Bar */}
              <div className="modal-progress-container">
                <div className="modal-progress-bar">
                  <div
                    className="modal-progress-fill"
                    style={{ width: `${printProgress.percentage}%` }}
                  />
                </div>
                <div className="modal-progress-stats">
                  <span className="progress-text">
                    {printProgress.current} of {printProgress.total} students
                  </span>
                  <span className="progress-percentage">
                    {Math.round(printProgress.percentage)}%
                  </span>
                </div>
              </div>

              {/* Status Info */}
              {printProgress.stage !== "ready" && (
                <div className="modal-info-box">
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value">
                      {printProgress.stage === "preparing" && "Setting up"}
                      {printProgress.stage === "fetching" && "Loading data"}
                      {printProgress.stage === "rendering" &&
                        "Rendering in browser"}
                      {printProgress.stage === "printing" && "Ready to save"}
                      {printProgress.stage === "monitoring" &&
                        "Writing to disk"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">
                      {printProgress.stage === "printing" ||
                      printProgress.stage === "monitoring"
                        ? "Action Required"
                        : "Estimated time"}
                    </span>
                    <span className="info-value">
                      {printProgress.stage === "printing" ||
                      printProgress.stage === "monitoring"
                        ? "Please save PDF"
                        : `${Math.ceil(
                            printProgress.estimatedSeconds / 60
                          )} min`}
                    </span>
                  </div>
                </div>
              )}

              {/* Ready State */}
              {printProgress.stage === "ready" && (
                <div className="modal-success-box">
                  <p className="success-text">
                    All {printProgress.total} report cards have been fully
                    rendered. Download starting automatically.
                  </p>
                </div>
              )}

              {/* Warning (only during critical stages) */}
              {(printProgress.stage === "rendering" ||
                printProgress.stage === "fetching") && (
                <div className="modal-warning-box">
                  <span className="warning-text">
                    Please do not close this window
                  </span>
                </div>
              )}

              {/* Print instruction */}
              {printProgress.stage === "printing" && (
                <div className="modal-instruction-box">
                  <span className="instruction-text">
                    The print dialog has opened. Please click "Save" to save the
                    PDF file.
                  </span>
                </div>
              )}

              {/* Monitoring instruction */}
              {printProgress.stage === "monitoring" && (
                <div className="modal-monitoring-box">
                  <span className="monitoring-text">
                    Writing PDF file to disk. Please wait while the file is
                    being finalized.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPLANATION MODAL */}
        {showExplanationModal && (
          <div className="explanation-modal-overlay">
            <div className="explanation-modal-card">
              {/* Icon */}
              <div className="explanation-status-icon">
                <div className="explanation-info-icon">
                  <FaInfoCircle />
                </div>
              </div>

              {/* Title */}
              <h2 className="explanation-title">Bulk PDF Generation Process</h2>
              <p className="explanation-subtitle">
                Generating <strong>{students.length} report cards</strong> (~
                {Math.ceil(students.length * 0.3)} MB). This will take about{" "}
                <strong>{Math.ceil(students.length * 0.1)} minutes</strong>.
              </p>

              {/* Steps */}
              <div className="explanation-steps">
                <div className="explanation-step">
                  <div className="step-number">1</div>
                  <div className="step-text">
                    <h4>Save the PDF</h4>
                    <p>
                      Print dialog opens → Select "Save as PDF" → Choose
                      location
                    </p>
                  </div>
                </div>

                <div className="explanation-step">
                  <div className="step-number">2</div>
                  <div className="step-text">
                    <h4>File starts at 0 KB</h4>
                    <p>
                      PDF appears in Downloads showing <strong>0 KB</strong>.
                      This is normal browser behavior.
                    </p>
                  </div>
                </div>

                <div className="explanation-step">
                  <div className="step-number">3</div>
                  <div className="step-text">
                    <h4>File grows gradually</h4>
                    <p>
                      Size increases from 0 KB to ~
                      {Math.ceil(students.length * 0.3)} MB over{" "}
                      {Math.ceil(students.length * 0.1)} minutes.
                    </p>
                  </div>
                </div>

                <div className="explanation-step">
                  <div className="step-number">4</div>
                  <div className="step-text">
                    <h4>Ready when full size</h4>
                    <p>
                      Wait until file reaches {Math.ceil(students.length * 0.3)}{" "}
                      MB before opening.
                    </p>
                  </div>
                </div>
              </div>

              {/* Important */}
              <div className="explanation-important">
                <div className="important-header">
                  <FaExclamationTriangle className="important-icon" />
                  <h4>Important:</h4>
                </div>
                <ul className="important-list">
                  <li>
                    <strong>Wait for full size</strong> before opening (
                    {Math.ceil(students.length * 0.3)} MB)
                  </li>
                  <li>
                    <strong>Continue working</strong> - file writes in
                    background
                  </li>
                  <li>
                    <strong>Check Downloads folder</strong> to monitor progress
                  </li>
                </ul>
              </div>

              {/* Why This Happens */}
              <div className="explanation-info-box">
                <h4 className="info-box-title">Why does this happen?</h4>
                <p className="info-box-text">
                  Chrome writes large PDFs gradually to prevent browser
                  freezing. All browsers work this way for files over 10 MB.
                </p>
              </div>

              {/* Tip */}
              <div className="explanation-tip-box">
                <div className="tip-box-content">
                  <div className="tip-box-icon">💡</div>
                  <p className="tip-box-text">
                    <strong>Recommended:</strong> Start generation, then work on
                    other tasks. Return in {Math.ceil(students.length * 0.1)}{" "}
                    minutes when PDF is ready.
                  </p>
                </div>
              </div>

              {/* Actions */}
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
                  Proceed
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
