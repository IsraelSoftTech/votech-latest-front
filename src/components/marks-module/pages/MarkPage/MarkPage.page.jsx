import "./MarksUpload.styles.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import SideTop from "../../../SideTop";
import { toast } from "react-toastify";
import api from "../../utils/api";
import Select from "react-select";
import { CustomInput } from "../../components/Inputs/CustumInputs";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  FaArrowLeft,
  FaSort,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSearch,
} from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";

export const MarksUploadPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = useRestrictTo(
    "Admin1",
    "Admin2",
    "Admin3",
    "Admin4",
    "Teacher",
    "Discipline",
    "Psychosocialist"
  );

  const hasFetchedRef = useRef(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [exportingExcelFile, setExportingExcelFile] = useState(false);
  const [importingExcelFile, setImportingExcelFile] = useState(false);

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [subjectClasses, setSubjectClasses] = useState([]);
  const [subject, setSubject] = useState({});

  const [filters, setFilters] = useState({
    academic_year_id: null,
    department_id: null,
    class_id: null,
    term_id: null,
    sequence_id: null,
  });

  const [marks, setMarks] = useState([]);
  const [saving, setSaving] = useState(false);

  // Sorting, Search, and Pagination states
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  // NEW: Debounced search and suggestions
  const [searchInput, setSearchInput] = useState(""); // What user is typing
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounced value for suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null); // For single student view
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // For keyboard navigation

  // --- FETCH FUNCTIONS ---
  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      const departments = res.data?.data;

      if (Array.isArray(departments) && departments.length > 0) {
        setDepartments(departments);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to fetch departments."
      );
      console.log(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get(
        `/students?class_id=${filters.class_id}&specialty_id=${
          filters.department_id || ""
        }&academic_year_id=${filters.academic_year_id}`
      );
      const list = res?.data?.data || [];
      setStudents(list);
      return list;
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to fetch students."
      );
      setStudents([]);
      return [];
    }
  };

  const fetchSubjectClasses = async () => {
    try {
      const res = await api.get(`/class-subjects?subject_id=${id}`);
      setSubjectClasses(res?.data?.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to fetch subject classes."
      );
    }
  };

  const fetchDropdowns = useCallback(async () => {
    try {
      setLoadingPage(true);
      const subRes = await api.get(`/subjects/${id}`);

      const [yearsRes, classesRes, termsRes, sequencesRes, classSubjectRes] =
        await Promise.all([
          api.get("/academic-years"),
          api.get("/classes"),
          api.get("/marks/terms"),
          api.get("/marks/sequences"),
          api.get(`/class-subjects?teacher_id=${user.id}`),
        ]);

      const classSubjects = classSubjectRes.data.data || [];

      setAcademicYears(yearsRes?.data?.data || []);

      setClasses(
        user.role === "Admin3"
          ? classesRes.data.data
          : (classesRes?.data?.data || [])
              .map((cls) => ({
                ...cls,
                classSubjects: (cls.classSubjects || []).filter((cs) =>
                  classSubjects.some(
                    (teacherCs) =>
                      teacherCs.id === cs.id && teacherCs.teacher_id === user.id
                  )
                ),
              }))
              .filter((cls) => cls.classSubjects.length > 0)
      );
      setTerms(termsRes?.data?.data || []);
      setSequences(sequencesRes?.data?.data || []);
      setSubject(subRes?.data?.data || {});

      fetchDepartments();
      fetchSubjectClasses();
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingPage(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchDropdowns();
  }, [id, user, fetchDropdowns]);

  const loadStudentsMarks = useCallback(async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;

    if (
      !academic_year_id ||
      !class_id ||
      !term_id ||
      !sequence_id ||
      !subject?.id
    ) {
      setStudents([]);
      setMarks([]);
      return;
    }

    setLoadingTable(true);
    try {
      const classAssigned = subjectClasses.some(
        (sc) => Number(sc.class_id) === Number(class_id)
      );

      if (!classAssigned) {
        setStudents([
          {
            id: "none",
            full_name: "Subject has not been assigned to this class",
            student_id: "-",
          },
        ]);
        setMarks([]);
        return;
      }

      const resStudents = await api.get(
        `/students?class_id=${class_id}&specialty_id=${
          filters.department_id || ""
        }&academic_year_id=${academic_year_id}`
      );
      const studentsList = resStudents?.data?.data || [];
      setStudents(studentsList);

      const resMarks = await api.get(
        `/marks?subject_id=${subject.id}&academic_year_id=${academic_year_id}&class_id=${class_id}&term_id=${term_id}&sequence_id=${sequence_id}`
      );
      setMarks(resMarks?.data?.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to fetch students or marks."
      );
    } finally {
      setLoadingTable(false);
    }
  }, [filters, subjectClasses, subject?.id]);

  useEffect(() => {
    loadStudentsMarks();
  }, [loadStudentsMarks]);

  // NEW: Debounce effect for search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // NEW: Show suggestions when debounced search updates
  useEffect(() => {
    if (debouncedSearch.trim()) {
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedSearch]);

  // NEW: Click outside to close suggestions
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

  // --- HANDLERS ---
  const handleMarkChange = (studentId, value) => {
    if (value !== "" && (Number(value) < 0 || Number(value) > 20)) {
      toast.error("Marks must be between 0 and 20.");
      return;
    }

    setMarks((prev) => {
      const exists = prev.find((m) => m.student_id === studentId);
      if (exists) {
        return prev.map((m) =>
          m.student_id === studentId
            ? { ...m, score: value === "" ? "" : Number(value) }
            : m
        );
      } else {
        return [
          ...prev,
          { student_id: studentId, score: value === "" ? "" : Number(value) },
        ];
      }
    });
  };

  const handleSave = async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;
    if (!academic_year_id || !class_id || !term_id || !sequence_id) {
      toast.error("Select all filters before saving marks.");
      return;
    }

    const displayedStudents = getFilteredAndSortedStudents();
    const missingMarks = displayedStudents.filter((s) => {
      if (s.id === "none") return false;
      const mark = marks.find((m) => m.student_id === s.id);
      return mark?.score == null || mark.score === "";
    });

    if (missingMarks.length > 0) {
      toast.error(
        `Please enter marks for all students. ${missingMarks.length} student(s) missing marks.`
      );
      return;
    }

    try {
      setSaving(true);

      const filledMarks = students
        .filter((s) => s.id !== "none")
        .map((s) => {
          const m = marks.find((mk) => mk.student_id === s.id);
          return {
            student_id: s.id,
            score: m?.score == null || m.score === "" ? 0 : Number(m.score),
          };
        });

      await api.post("/marks/save", {
        subject_id: subject.id,
        academic_year_id,
        class_id,
        term_id,
        sequence_id,
        marks: filledMarks,
      });

      toast.success("Marks saved successfully.");
      await loadStudentsMarks();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to save marks."
      );
    } finally {
      setSaving(false);
    }
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    setExportingExcelFile(true);
    if (!students.length || students.some((s) => s.id === "none")) {
      setExportingExcelFile(false);
      toast.warn("No valid students to export.");
      return;
    }

    const wsData = [
      [
        "⚠️ WARNING: Do NOT edit any column except 'Score'. Leave all other columns unchanged!",
      ],
      [
        `Academic Year: ${
          academicYears.find(
            (y) => Number(y.id) === Number(filters.academic_year_id)
          )?.name || ""
        }`,
      ],
      [
        `Department: ${
          departments.find(
            (d) => Number(d.id) === Number(filters.department_id)
          )?.name || ""
        }`,
      ],
      [
        `Class: ${
          classes.find((c) => Number(c.id) === Number(filters.class_id))
            ?.name || ""
        }`,
      ],
      [`Subject: ${subject.name || ""} (${subject.code || ""})`],
      [
        `Term: ${
          terms.find((t) => Number(t.id) === Number(filters.term_id))?.name ||
          ""
        }`,
      ],
      [
        `Sequence: ${
          sequences.find((s) => Number(s.id) === Number(filters.sequence_id))
            ?.name || ""
        }`,
      ],
      [],
      ["Student Name", "Student ID", "Score"],
      [
        "",
        "",
        "",
        "department_id",
        "academic_year_id",
        "class_id",
        "term_id",
        "sequence_id",
        "subject_id",
      ],
      ...students.map((s) => {
        const m = marks.find((mk) => mk.student_id === s.id);
        return [
          s.full_name ?? s.name,
          s.student_id,
          m?.score ?? "",
          filters.department_id,
          filters.academic_year_id,
          filters.class_id,
          filters.term_id,
          filters.sequence_id,
          subject.id,
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { hidden: true },
      { hidden: true },
      { hidden: true },
      { hidden: true },
      { hidden: true },
      { hidden: true },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");

    XLSX.writeFile(
      wb,
      `Marks_${subject.code || subject.id}_${filters.class_id}_${
        filters.academic_year_id
      }.xlsx`
    );

    setExportingExcelFile(false);
  };

  // --- IMPORT EXCEL ---
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImportingExcelFile(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!students.length) {
        await fetchStudents();
      }

      if (json.length < 11) throw new Error("Excel file missing data rows.");

      const rows = json.slice(10);

      const newMarks = rows.map((row) => {
        const [fullName, studentId, score, , , , , , subjectId] = row;

        const student = students.find((s) => s.student_id === studentId);
        if (!student) throw new Error(`Student ${fullName} not found.`);

        if (score !== "" && (Number(score) < 0 || Number(score) > 20)) {
          throw new Error(`Invalid score for ${fullName}. Must be 0–20.`);
        }

        setSubject((prev) => ({ ...prev, id: subjectId }));

        return {
          student_id: student.id,
          score: score === "" ? "" : Number(score),
        };
      });

      setMarks(newMarks);
      toast.success("Excel marks loaded successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to load Excel. Check formatting.");
    } finally {
      setImportingExcelFile(false);
      e.target.value = null;
    }
  };

  // --- FILTERED ARRAYS ---
  const filteredTerms = filters.academic_year_id
    ? terms.filter(
        (t) => Number(t.academic_year_id) === Number(filters.academic_year_id)
      )
    : [];

  const selectedTerm = terms.find(
    (t) => Number(t.id) === Number(filters.term_id)
  );

  const filteredSequences =
    filters.academic_year_id && selectedTerm
      ? sequences
          .filter(
            (s) =>
              Number(s.academic_year_id) === Number(filters.academic_year_id)
          )
          .filter((s) => Number(s.term_id) === Number(selectedTerm.id))
          .sort((a, b) => Number(a.order_number) - Number(b.order_number))
      : [];

  const filteredClasses = filters.department_id
    ? classes.filter(
        (c) => Number(c.department_id) === Number(filters.department_id)
      )
    : [];

  // --- SORT, FILTER, AND PAGINATE STUDENTS ---
  const getFilteredAndSortedStudents = () => {
    let filtered = [...students];

    // NEW: If a specific student is selected, show only that student
    if (selectedStudentId) {
      filtered = filtered.filter((s) => s.id === selectedStudentId);
    }
    // Otherwise filter by search term
    else if (searchTerm.trim()) {
      filtered = filtered.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort alphabetically
    filtered.sort((a, b) => {
      const nameA = (a.full_name || "").toLowerCase();
      const nameB = (b.full_name || "").toLowerCase();
      if (sortOrder === "asc") {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    return filtered;
  };

  const filteredAndSortedStudents = getFilteredAndSortedStudents();

  // NEW: Get search suggestions
  const getSearchSuggestions = () => {
    if (!debouncedSearch.trim() || students.length === 0) return [];

    return students
      .filter(
        (s) =>
          s.id !== "none" &&
          (s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            s.student_id?.toLowerCase().includes(debouncedSearch.toLowerCase()))
      )
      .slice(0, 8) // Limit to 8 suggestions
      .sort((a, b) => {
        const nameA = (a.full_name || "").toLowerCase();
        const nameB = (b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
  };

  const searchSuggestions = getSearchSuggestions();

  // Pagination
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder, studentsPerPage, selectedStudentId]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // NEW: Handle search input change
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setSelectedStudentId(null); // Clear single student selection when typing
  };

  // NEW: Handle search execution (Enter or button click)
  const handleSearchExecute = () => {
    setSearchTerm(searchInput);
    setShowSuggestions(false);
    setSelectedStudentId(null);
    setHighlightedIndex(-1);
  };

  // NEW: Handle suggestion click
  const handleSuggestionClick = (student) => {
    setSearchInput(student.full_name);
    setSearchTerm(""); // Clear general search
    setSelectedStudentId(student.id); // Show only this student
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  // NEW: Clear all search
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setSelectedStudentId(null);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  // NEW: Handle keyboard navigation
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

  // --- RENDER ---
  return (
    <SideTop>
      <div className="marks-upload-page">
        <h2 className="marks-page-title">Upload {subject.name} Marks</h2>

        {loadingPage ? (
          <Skeleton height={35} count={6} style={{ marginBottom: "10px" }} />
        ) : (
          <>
            <div>
              <button className="marks-back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft /> <span>Go Back to Subjects</span>
              </button>
            </div>

            <div className="marks-filters-row">
              <div className="marks-filter-select">
                <Select
                  placeholder="Academic Year"
                  options={academicYears.map((y) => ({
                    value: y.id,
                    label: y.name,
                  }))}
                  value={
                    academicYears.find(
                      (y) => Number(y.id) === Number(filters.academic_year_id)
                    ) && {
                      value: filters.academic_year_id,
                      label: academicYears.find(
                        (y) => Number(y.id) === Number(filters.academic_year_id)
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      academic_year_id: opt?.value || null,
                      term_id: null,
                      sequence_id: null,
                    }))
                  }
                />
              </div>

              <div className="marks-filter-select">
                <Select
                  placeholder="Department"
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  value={
                    filters.department_id
                      ? {
                          value: filters.department_id,
                          label: departments.find(
                            (d) =>
                              Number(d.id) === Number(filters.department_id)
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
                />
              </div>

              <div className="marks-filter-select">
                <Select
                  placeholder="Select Class"
                  options={filteredClasses.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={
                    filters.class_id &&
                    filteredClasses.some((c) => c.id === filters.class_id)
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
                />
              </div>

              <div className="marks-filter-select">
                <Select
                  placeholder="Select Term"
                  options={filteredTerms.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  value={
                    filters.term_id &&
                    filteredTerms.some((t) => t.id === filters.term_id)
                      ? {
                          value: filters.term_id,
                          label: filteredTerms.find(
                            (t) => t.id === filters.term_id
                          )?.name,
                        }
                      : null
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      term_id: opt?.value || null,
                      sequence_id: null,
                    }))
                  }
                  isClearable
                />
              </div>

              <div className="marks-filter-select">
                <Select
                  placeholder="Select Sequence"
                  options={filteredSequences.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  isDisabled={!filters.term_id}
                  value={
                    filters.sequence_id &&
                    filteredSequences.some((s) => s.id === filters.sequence_id)
                      ? {
                          value: filters.sequence_id,
                          label: filteredSequences.find(
                            (s) => s.id === filters.sequence_id
                          )?.name,
                        }
                      : null
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      sequence_id: opt?.value || null,
                    }))
                  }
                  isClearable
                />
              </div>
            </div>

            <div className="marks-buttons-row">
              <button
                className="marks-btn marks-btn-export"
                onClick={handleExportExcel}
                disabled={
                  !students.length || students.some((s) => s.id === "none")
                }
              >
                {exportingExcelFile
                  ? "Downloading Excel File..."
                  : "Export to Excel"}
              </button>

              <div className="marks-upload-wrapper">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  id="uploadExcelInput"
                  onChange={handleImportExcel}
                  className="marks-hidden-input"
                />
                <button
                  type="button"
                  className="marks-btn marks-btn-import"
                  onClick={() =>
                    document.getElementById("uploadExcelInput").click()
                  }
                >
                  {importingExcelFile
                    ? "Uploading Excel File..."
                    : "Upload Excel Document"}
                </button>
              </div>
            </div>

            {/* NEW: Enhanced Search with Suggestions */}
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

                {/* NEW: Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="search-suggestions" ref={suggestionsRef}>
                    <div className="suggestions-header">
                      <span>Select a student or press Enter to search all</span>
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
                          {student.full_name}
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
                  onClick={toggleSortOrder}
                  title={sortOrder === "asc" ? "Sort Z-A" : "Sort A-Z"}
                >
                  {sortOrder === "asc" ? (
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

            <div className="marks-info-bar">
              <span className="marks-count-info">
                Showing {paginatedStudents.length} of {totalStudents} student(s)
              </span>
              {selectedStudentId && (
                <span className="marks-search-info">
                  Viewing:{" "}
                  {students.find((s) => s.id === selectedStudentId)?.full_name}
                </span>
              )}
              {searchTerm && !selectedStudentId && (
                <span className="marks-search-info">
                  Filtered by: "{searchTerm}"
                </span>
              )}
            </div>

            <div className="marks-table-container">
              {loadingTable ? (
                <Skeleton count={5} height={30} />
              ) : (
                <table className="marks-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((s, index) => {
                        const globalIndex =
                          studentsPerPage === "all"
                            ? index
                            : (currentPage - 1) * studentsPerPage + index;
                        return (
                          <tr key={s.id} className="marks-table-row">
                            {/* Desktop cells */}
                            <td className="desktop-cell">{globalIndex + 1}</td>
                            <td className="desktop-cell">{s.student_id}</td>
                            <td className="desktop-cell">{s.full_name}</td>
                            <td className="desktop-cell">
                              {s.id === "none" ? (
                                "-"
                              ) : (
                                <CustomInput
                                  type="number"
                                  value={
                                    marks.find((m) => m.student_id === s.id)
                                      ?.score ?? ""
                                  }
                                  onChange={(_, val) =>
                                    handleMarkChange(s.id, val)
                                  }
                                  onClear={() => handleMarkChange(s.id, "")}
                                />
                              )}
                            </td>

                            {/* Mobile card */}
                            <td className="mobile-marks-cell" colSpan={4}>
                              <div className="mobile-marks-card">
                                <div className="marks-card-header">
                                  <span className="student-number">
                                    #{globalIndex + 1}
                                  </span>
                                  <span className="student-id-badge">
                                    {s.student_id}
                                  </span>
                                </div>

                                <div className="marks-card-body">
                                  <div className="student-name-row">
                                    <span className="student-name">
                                      {s.full_name}
                                    </span>
                                  </div>

                                  <div className="marks-input-section">
                                    <label className="marks-input-label">
                                      Enter Mark (0-20)
                                    </label>
                                    {s.id === "none" ? (
                                      <div className="marks-placeholder">-</div>
                                    ) : (
                                      <CustomInput
                                        type="number"
                                        value={
                                          marks.find(
                                            (m) => m.student_id === s.id
                                          )?.score ?? ""
                                        }
                                        onChange={(_, val) =>
                                          handleMarkChange(s.id, val)
                                        }
                                        onClear={() =>
                                          handleMarkChange(s.id, "")
                                        }
                                        placeholder="0-20"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="no-data-row">
                        <td colSpan={4} className="no-data-cell">
                          {searchTerm || selectedStudentId
                            ? `No students found matching your search`
                            : "No students found"}
                        </td>
                      </tr>
                    )}
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

            <div className="marks-save-section">
              <button
                className="marks-btn marks-btn-save"
                onClick={handleSave}
                disabled={students.some((s) => s.id === "none") || saving}
              >
                {saving ? "Saving Marks..." : "Save Marks"}
              </button>
            </div>
          </>
        )}
      </div>
    </SideTop>
  );
};
