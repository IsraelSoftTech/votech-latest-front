import "./ReportCard.styles.css";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { Button } from "../../components/Button/Button.component";
import {
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
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useActiveYear, useSelectableAcademicYears } from "../../../../context/ActiveYearContext";
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

// Mirrors the real filter card (title + the same select boxes) instead of
// generic gray bars, so the layout doesn't jump once dropdowns arrive.
function FiltersSkeleton() {
  return (
    <div className="report-filters-section">
      <div className="report-skel report-skel-line" style={{ width: 140, height: 18, marginBottom: 16 }} />
      <div className="report-filters-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="report-form-select" key={i}>
            <div className="report-skel report-skel-line" style={{ width: 90, height: 12 }} />
            <div className="report-skel report-skel-block" style={{ height: 38 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Mirrors the real table's columns/row count instead of a plain "Loading…"
// line, so the layout doesn't jump once students arrive.
function StudentsTableSkeleton() {
  return (
    <table className="report-students-table">
      <thead>
        <tr>
          <th>S/N</th>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Generate Report Card</th>
          <th>Transcript</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }).map((_, i) => (
          <tr key={i}>
            <td>
              <div className="report-skel report-skel-line" style={{ width: 20, height: 14 }} />
            </td>
            <td>
              <div className="report-skel report-skel-line" style={{ width: 84, height: 14 }} />
            </td>
            <td>
              <div className="report-skel report-skel-line" style={{ width: "72%", height: 14 }} />
            </td>
            <td>
              <div className="report-skel report-skel-block" style={{ width: 160, height: 32 }} />
            </td>
            <td>
              <div className="report-skel report-skel-block" style={{ width: 110, height: 32 }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ReportCardHomePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isAdmin1ReadOnly =
    JSON.parse(sessionStorage.getItem("authUser") || "{}").role === "Admin1";
  const {
    isViewingArchived,
    activeYear,
  } = useActiveYear();
  const isReadOnly = isAdmin1ReadOnly || isViewingArchived;

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const selectableYears = useSelectableAcademicYears(academicYears);
  const isYearSelectionLocked = Boolean(activeYear?.id);
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

  // Transcript download — per-row, tracks which student's PDF is in
  // flight so only that row's button shows a spinner/disables.
  const [transcriptDownloadingId, setTranscriptDownloadingId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  const navigateToSessions = () =>
    navigate("/academics/report-cards/sessions", {
      state: {
        academic_year_id: filters.academic_year_id,
        department_id: filters.department_id,
        class_id: filters.class_id,
      },
    });

  // Persistent filters
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("reportCardFilters");
    const base = {
      academic_year_id: null,
      department_id: null,
      class_id: null,
    };
    if (!saved) return base;
    try {
      const parsed = JSON.parse(saved);
      return { ...base, ...parsed };
    } catch {
      return base;
    }
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
        `/students?class_id=${class_id}&department_id=${department_id}&academic_year_id=${academic_year_id}&limit=200`
      );
      setStudents(res.data.data?.students || []);
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
    if (!activeYear?.id) return;
    setFilters((prev) => ({
      ...prev,
      academic_year_id: activeYear.id,
    }));
  }, [activeYear?.id]);

  useEffect(() => {
    const { class_id, department_id, academic_year_id } = filters;
    if (class_id && department_id && academic_year_id) fetchStudents();
  }, [filters]);

  // ── Navigate to individual report card ──
  const handleGoToReportCard = (student, termObj) => {
    const academicYear =
      selectableYears.find((y) => y.id === filters.academic_year_id) || null;
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

  // ── Transcript download ──
  // Any student, any status — deliberately not gated on the term/class
  // filters above, a transcript spans every year the student ever
  // attended, not just whichever one is currently selected in the filter.
  const handleDownloadTranscript = async (student) => {
    setTranscriptDownloadingId(student.id);
    try {
      const res = await api.get(`/students/${student.id}/transcript/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(student.full_name ?? student.name ?? "student").replace(/\s+/g, "_")}-transcript.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // responseType "blob" means an error body arrives as an opaque Blob,
      // not parsed JSON — there is no usable err.response.data.message
      // here, same reasoning as MarksOverview.page.jsx's PDF download.
      toast.error(
        "Failed to generate transcript. This student may have no recorded marks yet."
      );
    } finally {
      setTranscriptDownloadingId(null);
    }
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

  const isFilterReady = Boolean(
    filters.academic_year_id && filters.department_id && filters.class_id
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="report-card-home-page">
        <PageHeader
          title="Print Individual Report Cards"
          actions={
            isReadOnly ? (
              <span className="report-read-only-badge">
                <FaLock /> {!isMobile && "Read Only"}
              </span>
            ) : null
          }
        />

        {loadingPage ? (
          <FiltersSkeleton />
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
                    options={selectableYears.map((y) => ({
                      value: y.id,
                      label: y.name,
                    }))}
                    value={
                      selectableYears
                        .map((y) => ({ value: y.id, label: y.name }))
                        .find(
                          (opt) => opt.value === filters.academic_year_id
                        ) || null
                    }
                    onChange={(opt) =>
                      setFilters((prev) => ({
                        ...prev,
                        academic_year_id: opt?.value || null,
                      }))
                    }
                    isDisabled={loadingPage || loadingTable || isYearSelectionLocked}
                    isClearable={!isYearSelectionLocked}
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
            {!isReadOnly && (
              <div className="report-actions-section">
                <Button
                  variant="primary"
                  icon={<FaDownload />}
                  disabled={!isFilterReady}
                  onClick={navigateToSessions}
                  title="Generate report cards for one or more classes safely in the background"
                >
                  Bulk Generate Report Cards
                </Button>
              </div>
            )}

            {/* ── Students Table ── */}
            <div className="report-students-section">
              <h3 className="report-students-title">
                Students ({students.length})
              </h3>
              <div className="report-students-table-wrapper">
                {loadingTable ? (
                  <StudentsTableSkeleton />
                ) : paginatedStudents.length === 0 ? (
                  <EmptyState
                    title={
                      searchTerm || selectedStudentId
                        ? "No students found matching your search"
                        : "No students found. Please adjust your filters."
                    }
                  />
                ) : (
                  <table className="report-students-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Generate Report Card</th>
                        <th>Transcript</th>
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
                                                className="report-table-select"
                                  classNamePrefix="report-select"
                                />
                              ) : (
                                <span className="report-read-only-text">
                                  View Only
                                </span>
                              )}
                            </td>
                            <td>
                              <Button
                                variant="secondary"
                                icon={<FaFileAlt />}
                                disabled={transcriptDownloadingId === s.id}
                                onClick={() => handleDownloadTranscript(s)}
                                title="Download this student's full multi-year transcript"
                              >
                                {transcriptDownloadingId === s.id
                                  ? "Preparing..."
                                  : "Transcript"}
                              </Button>
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
    </div>
  );
};

export default ReportCardHomePage;
