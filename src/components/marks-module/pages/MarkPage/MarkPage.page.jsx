import "./MarksUpload.styles.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import SideTop from "../../../SideTop";
import api from "../../utils/api";
import Select from "react-select";
import { CustomInput } from "../../components/Inputs/CustumInputs";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  FaArrowLeft,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSortNumericDown,
  FaSortNumericUp,
  FaSearch,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
} from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import Modal from "../../components/Modal/Modal.component";

// Utility function for string similarity (Levenshtein distance)
const calculateSimilarity = (str1, str2) => {
  const s1 = str1?.toLowerCase().trim() || "";
  const s2 = str2?.toLowerCase().trim() || "";

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return 1 - matrix[s2.length][s1.length] / maxLength;
};

// Simple Modal Component
const SimpleModal = ({ type, title, message, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="simple-modal-overlay" onClick={onClose}>
      <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
        <button className="simple-modal-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className={`simple-modal-icon ${type}`}>
          {type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
        </div>

        <h3 className="simple-modal-title">{title}</h3>
        <p className="simple-modal-message">{message}</p>

        <button className="simple-modal-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

// Saving Modal Component with Upload Animation
const SavingModal = ({ marksCount = 0 }) => {
  return (
    <div className="simple-modal-overlay">
      <div
        className="simple-modal saving-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Upload Icon */}
        <div className="saving-icon-container">
          <div className="saving-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="upload-icon">
              <FaCheckCircle />
            </div>
          </div>
        </div>

        <h3 className="saving-title">Saving Marks</h3>
        <p className="saving-message">
          Uploading{" "}
          {marksCount > 0
            ? `${marksCount} mark${marksCount !== 1 ? "s" : ""}`
            : "marks"}{" "}
          to the database...
        </p>
        <p className="saving-submessage">
          This may take a moment. Please don't close this window.
        </p>

        {/* Animated Dots */}
        <div className="saving-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

// Missing Marks Confirmation Modal
const MissingMarksModal = ({ missingStudents, onAssignZero, onCancel }) => {
  const displayLimit = 10;
  const hasMore = missingStudents.length > displayLimit;

  return (
    <Modal isOpen={true} onClose={onCancel} title="Missing Marks Detected">
      <div className="missing-marks-modal">
        <div className="missing-marks-icon">
          <FaExclamationTriangle />
        </div>

        <p className="missing-marks-message">
          <strong>{missingStudents.length}</strong> student
          {missingStudents.length !== 1 ? "s" : ""}{" "}
          {missingStudents.length !== 1 ? "do" : "does"} not have marks
          assigned.
        </p>

        <div className="missing-students-list">
          {missingStudents.slice(0, displayLimit).map((student, index) => (
            <div key={student.id} className="missing-student-item">
              <span className="student-number">{index + 1}.</span>
              <span className="student-name">{student.full_name}</span>
              <span className="student-id">({student.student_id})</span>
            </div>
          ))}
          {hasMore && (
            <div className="missing-students-more">
              ... and {missingStudents.length - displayLimit} more student
              {missingStudents.length - displayLimit !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <p className="missing-marks-question">
          Would you like to assign <strong>0</strong> to these students, or fill
          in their marks manually?
        </p>

        <div className="missing-marks-actions">
          <button className="btn-secondary" onClick={onCancel}>
            <FaTimes /> Cancel
          </button>
          <button className="btn-outline" onClick={() => onCancel(true)}>
            <FaFilter /> Filter & Fill Manually
          </button>
          <button className="btn-primary" onClick={onAssignZero}>
            <FaCheck /> Assign Zero
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Name Matching Modal Component (unchanged from original)
const NameMatchingModal = ({
  unmatchedStudents,
  existingStudents,
  onComplete,
  onCancel,
  totalImported,
}) => {
  const [currentStep, setCurrentStep] = useState("summary");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedMatches, setResolvedMatches] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [history, setHistory] = useState([]);

  if (!Array.isArray(unmatchedStudents) || unmatchedStudents.length === 0) {
    return null;
  }

  if (!Array.isArray(existingStudents) || existingStudents.length === 0) {
    return null;
  }

  const currentStudent = unmatchedStudents[currentIndex];
  const totalUnmatched = unmatchedStudents.length;
  const matchedCount = Math.max(0, totalImported - totalUnmatched);

  const getSuggestions = (student) => {
    if (!student || !student.fullName) return [];

    try {
      return existingStudents
        .filter((s) => s && s.full_name && s.id)
        .map((s) => ({
          ...s,
          similarity: calculateSimilarity(student.fullName, s.full_name),
        }))
        .filter((s) => s.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      return [];
    }
  };

  const suggestions = currentStudent ? getSuggestions(currentStudent) : [];

  const handleStartMatching = () => {
    setCurrentStep("matching");
  };

  const handleSelectMatch = (matchedStudent) => {
    if (!matchedStudent || !currentStudent) return;

    const newMatch = {
      excelStudent: currentStudent,
      systemStudent: matchedStudent,
      score: currentStudent.score,
    };

    setResolvedMatches((prev) => [...prev, newMatch]);
    setHistory((prev) => [...prev, { index: currentIndex, action: "matched" }]);

    if (currentIndex < totalUnmatched - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish([...resolvedMatches, newMatch], skipped);
    }
  };

  const handleSkip = () => {
    if (!currentStudent) return;

    setSkipped((prev) => [...prev, currentStudent]);
    setHistory((prev) => [...prev, { index: currentIndex, action: "skipped" }]);

    if (currentIndex < totalUnmatched - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish(resolvedMatches, [...skipped, currentStudent]);
    }
  };

  const handleBack = () => {
    if (history.length === 0) {
      setCurrentStep("summary");
      return;
    }

    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(lastAction.index);

    if (lastAction.action === "matched") {
      setResolvedMatches((prev) => prev.slice(0, -1));
    } else {
      setSkipped((prev) => prev.slice(0, -1));
    }
  };

  const handleFinish = (matches, skippedStudents) => {
    if (typeof onComplete === "function") {
      onComplete(matches, skippedStudents);
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  if (currentStep === "summary") {
    return (
      <Modal isOpen={true} onClose={handleCancel} title="Import Summary">
        <div className="match-summary">
          <div className="summary-stats">
            <div className="stat-card matched">
              <div className="stat-number">{matchedCount}</div>
              <div className="stat-label">
                <FaCheck className="stat-icon" />
                Matched
              </div>
            </div>

            <div className="stat-card unmatched">
              <div className="stat-number">{totalUnmatched}</div>
              <div className="stat-label">
                <FaExclamationTriangle className="stat-icon" />
                Need Review
              </div>
            </div>
          </div>

          <div className="summary-message">
            <p>
              {matchedCount} student{matchedCount !== 1 ? "s" : ""} matched
              automatically.
            </p>
            <p>
              {totalUnmatched} student
              {totalUnmatched !== 1 ? "s need" : " needs"} manual matching.
            </p>
          </div>

          <div className="summary-actions">
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel Import
            </button>
            <button className="btn-primary" onClick={handleStartMatching}>
              Start Matching
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (!currentStudent) {
    return null;
  }

  return (
    <Modal isOpen={true} onClose={handleCancel} title="Match Students">
      <div className="match-container">
        <div className="match-progress">
          <div className="progress-info">
            <span className="progress-label">
              Student {currentIndex + 1} of {totalUnmatched}
            </span>
            <span className="progress-count">
              {resolvedMatches.length} matched • {skipped.length} skipped
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(
                  100,
                  ((currentIndex + 1) / totalUnmatched) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="excel-student">
          <div className="excel-label">From Excel File:</div>
          <div className="excel-card">
            <h4>{currentStudent.fullName || "Unknown"}</h4>
            <div className="excel-meta">
              <span>ID: {currentStudent.studentId || "N/A"}</span>
              <span>•</span>
              <span>
                Score:{" "}
                {currentStudent.score !== "" ? currentStudent.score : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="suggestions-container">
          <div className="suggestions-label">Click the matching student:</div>
          <div className="suggestions-list">
            {suggestions.length > 0 ? (
              suggestions.map((student) => (
                <button
                  key={student.id}
                  className="suggestion-btn"
                  onClick={() => handleSelectMatch(student)}
                  type="button"
                >
                  <div className="suggestion-info">
                    <div className="suggestion-name">
                      {student.full_name || "Unknown"}
                    </div>
                    <div className="suggestion-id">
                      ID: {student.student_id || "N/A"}
                    </div>
                  </div>
                  <div className="suggestion-match">
                    {Math.round((student.similarity || 0) * 100)}% match
                  </div>
                </button>
              ))
            ) : (
              <div className="no-matches">
                <FaExclamationTriangle />
                <p>No similar students found</p>
              </div>
            )}
          </div>
        </div>

        <div className="match-actions">
          <button
            className="btn-secondary"
            onClick={handleBack}
            disabled={currentIndex === 0 && history.length === 0}
            type="button"
          >
            <FaArrowLeft />
            Back
          </button>
          <button className="btn-outline" onClick={handleSkip} type="button">
            Skip
          </button>
        </div>
      </div>
    </Modal>
  );
};

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
  const isMountedRef = useRef(true);

  // Loading states
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [exportingExcelFile, setExportingExcelFile] = useState(false);
  const [importingExcelFile, setImportingExcelFile] = useState(false);

  // Data states
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [subjectClasses, setSubjectClasses] = useState([]);
  const [subject, setSubject] = useState({});

  // Filter states
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
  const [sortConfig, setSortConfig] = useState({ key: "name", order: "asc" }); // Changed from sortOrder
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  // NEW: Mark filter state
  const [markFilter, setMarkFilter] = useState("all"); // 'all', 'with-marks', 'without-marks'

  // NEW: Frozen filter state - captures students when filter is first applied
  // This prevents students from disappearing as you type marks
  const [frozenFilterStudents, setFrozenFilterStudents] = useState(null);

  // Search states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Name matching modal states
  const [unmatchedStudents, setUnmatchedStudents] = useState([]);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [totalImportedCount, setTotalImportedCount] = useState(0);

  // Simple modal state
  const [simpleModal, setSimpleModal] = useState(null);

  // NEW: Missing marks modal state
  const [showMissingMarksModal, setShowMissingMarksModal] = useState(false);
  const [missingMarksStudents, setMissingMarksStudents] = useState([]);

  const showModal = (type, title, message) => {
    setSimpleModal({ type, title, message });
  };

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --- FETCH FUNCTIONS ---
  const fetchStudents = useCallback(
    async (classId, departmentId, academicYearId) => {
      try {
        const res = await api.get(
          `/students?class_id=${classId}&specialty_id=${
            departmentId || ""
          }&academic_year_id=${academicYearId}`
        );
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (isMountedRef.current) {
          setStudents(list);
        }
        return list;
      } catch (err) {
        console.error("Failed to fetch students:", err);
        if (isMountedRef.current) {
          showModal(
            "error",
            "Failed to Load Students",
            err.response?.data?.details ||
              err.response?.data?.message ||
              "Could not load students. Please try again."
          );
          setStudents([]);
        }
        return [];
      }
    },
    []
  );

  const fetchDropdowns = useCallback(async () => {
    if (!user?.id) {
      console.warn("User not available for fetchDropdowns");
      return;
    }

    try {
      if (isMountedRef.current) {
        setLoadingPage(true);
      }

      const [
        subRes,
        yearsRes,
        classesRes,
        termsRes,
        sequencesRes,
        classSubjectRes,
        deptRes,
        subjectClassRes,
      ] = await Promise.allSettled([
        api.get(`/subjects/${id}`),
        api.get("/academic-years"),
        api.get("/classes"),
        api.get("/marks/terms"),
        api.get("/marks/sequences"),
        api.get(`/class-subjects?teacher_id=${user.id}`),
        api.get("/departments"),
        api.get(`/class-subjects?subject_id=${id}`),
      ]);

      if (!isMountedRef.current) return;

      if (subRes.status === "fulfilled") {
        setSubject(subRes.value?.data?.data || {});
      } else {
        console.error("Subject fetch failed:", subRes.reason);
        showModal(
          "error",
          "Failed to Load",
          "Could not load subject information."
        );
        setSubject({});
      }

      if (yearsRes.status === "fulfilled") {
        setAcademicYears(
          Array.isArray(yearsRes.value?.data?.data)
            ? yearsRes.value.data.data
            : []
        );
      } else {
        setAcademicYears([]);
      }

      if (termsRes.status === "fulfilled") {
        setTerms(
          Array.isArray(termsRes.value?.data?.data)
            ? termsRes.value.data.data
            : []
        );
      } else {
        setTerms([]);
      }

      if (sequencesRes.status === "fulfilled") {
        setSequences(
          Array.isArray(sequencesRes.value?.data?.data)
            ? sequencesRes.value.data.data
            : []
        );
      } else {
        setSequences([]);
      }

      if (deptRes.status === "fulfilled") {
        setDepartments(
          Array.isArray(deptRes.value?.data?.data)
            ? deptRes.value.data.data
            : []
        );
      } else {
        setDepartments([]);
      }

      if (subjectClassRes.status === "fulfilled") {
        setSubjectClasses(
          Array.isArray(subjectClassRes.value?.data?.data)
            ? subjectClassRes.value.data.data
            : []
        );
      } else {
        setSubjectClasses([]);
      }

      if (classesRes.status === "fulfilled") {
        const classData = Array.isArray(classesRes.value?.data?.data)
          ? classesRes.value.data.data
          : [];
        const classSubjects =
          classSubjectRes.status === "fulfilled"
            ? Array.isArray(classSubjectRes.value?.data?.data)
              ? classSubjectRes.value.data.data
              : []
            : [];

        if (user.role === "Admin3") {
          setClasses(classData);
        } else {
          const filteredClasses = classData
            .map((cls) => ({
              ...cls,
              classSubjects: (Array.isArray(cls.classSubjects)
                ? cls.classSubjects
                : []
              ).filter((cs) =>
                classSubjects.some(
                  (teacherCs) =>
                    teacherCs.id === cs.id && teacherCs.teacher_id === user.id
                )
              ),
            }))
            .filter(
              (cls) =>
                Array.isArray(cls.classSubjects) && cls.classSubjects.length > 0
            );

          setClasses(filteredClasses);
        }
      } else {
        setClasses([]);
      }

      setInitialDataLoaded(true);
    } catch (err) {
      console.error("Unexpected error in fetchDropdowns:", err);
      if (isMountedRef.current) {
        showModal(
          "error",
          "Error",
          "Failed to load page data. Please refresh."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingPage(false);
      }
    }
  }, [id, user?.id, user?.role]);

  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchDropdowns();
  }, [user, fetchDropdowns]);

  const loadStudentsMarks = useCallback(async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;

    if (
      !academic_year_id ||
      !class_id ||
      !term_id ||
      !sequence_id ||
      !subject?.id
    ) {
      if (isMountedRef.current) {
        setStudents([]);
        setMarks([]);
        setLoadingTable(false);
      }
      return;
    }

    if (!initialDataLoaded) {
      return;
    }

    if (isMountedRef.current) {
      setLoadingTable(true);
    }

    try {
      const classAssigned =
        Array.isArray(subjectClasses) &&
        subjectClasses.some((sc) => Number(sc.class_id) === Number(class_id));

      if (!classAssigned) {
        if (isMountedRef.current) {
          setStudents([
            {
              id: "none",
              full_name: "Subject has not been assigned to this class",
              student_id: "-",
            },
          ]);
          setMarks([]);
          setLoadingTable(false);
        }
        return;
      }

      const studentsList = await fetchStudents(
        class_id,
        filters.department_id,
        academic_year_id
      );

      if (!isMountedRef.current) return;

      if (!Array.isArray(studentsList) || studentsList.length === 0) {
        setStudents([]);
        setMarks([]);
        setLoadingTable(false);
        return;
      }

      try {
        const marksRes = await api.get(
          `/marks?subject_id=${subject.id}&academic_year_id=${academic_year_id}&class_id=${class_id}&term_id=${term_id}&sequence_id=${sequence_id}`
        );
        if (isMountedRef.current) {
          setMarks(
            Array.isArray(marksRes?.data?.data) ? marksRes.data.data : []
          );
        }
      } catch (marksErr) {
        console.error("Failed to fetch marks:", marksErr);
        if (isMountedRef.current) {
          showModal(
            "error",
            "Failed to Load Marks",
            "Could not load existing marks. Try again."
          );
          setMarks([]);
        }
      }
    } catch (err) {
      console.error("Error in loadStudentsMarks:", err);
      if (isMountedRef.current) {
        showModal(
          "error",
          "Error",
          err.response?.data?.details ||
            err.response?.data?.message ||
            "Failed to load students or marks."
        );
        setStudents([]);
        setMarks([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTable(false);
      }
    }
  }, [filters, subjectClasses, subject?.id, initialDataLoaded, fetchStudents]);

  useEffect(() => {
    if (!initialDataLoaded) return;
    loadStudentsMarks();
  }, [
    initialDataLoaded,
    filters.academic_year_id,
    filters.class_id,
    filters.term_id,
    filters.sequence_id,
    subject?.id,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
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

  const handleMarkChange = (studentId, value) => {
    if (!studentId) {
      console.error("Invalid student ID");
      return;
    }

    // Allow typing in progress - don't validate until value is complete
    // This prevents filtering students away while they're still typing
    if (value !== "" && value !== null && value !== undefined) {
      const numValue = Number(value);
      // Only validate if it's a complete number entry
      if (!isNaN(numValue)) {
        if (numValue < 0 || numValue > 20) {
          // Don't show error immediately, just prevent the value
          return;
        }
      }
    }

    setMarks((prev) => {
      if (!Array.isArray(prev)) return [];

      const exists = prev.find((m) => m && m.student_id === studentId);
      if (exists) {
        return prev.map((m) =>
          m && m.student_id === studentId
            ? { ...m, score: value === "" ? "" : value === null ? "" : value }
            : m
        );
      } else {
        return [
          ...prev,
          {
            student_id: studentId,
            score: value === "" ? "" : value === null ? "" : value,
          },
        ];
      }
    });
  };

  const handleSave = async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;

    // Validation
    if (!academic_year_id || !class_id || !term_id || !sequence_id) {
      showModal(
        "error",
        "Missing Information",
        "Please select all filters before saving marks."
      );
      return;
    }

    if (!subject || !subject.id) {
      showModal(
        "error",
        "Missing Subject",
        "Subject information is missing. Please refresh the page."
      );
      return;
    }

    if (!Array.isArray(students) || students.length === 0) {
      showModal("error", "No Students", "No students found to save marks for.");
      return;
    }

    if (!user || !user.id) {
      showModal(
        "error",
        "Authentication Error",
        "User information is missing."
      );
      return;
    }

    const validStudents = students.filter((s) => s.id !== "none" && s.id);

    if (validStudents.length === 0) {
      showModal("error", "No Valid Students", "No valid students found.");
      return;
    }

    // Check for missing marks
    const missingMarks = validStudents.filter((s) => {
      const mark = marks.find((m) => m.student_id === s.id);
      return mark?.score == null || mark.score === "";
    });

    if (missingMarks.length > 0) {
      setMissingMarksStudents(missingMarks);
      setShowMissingMarksModal(true);
      return;
    }

    // Proceed with save
    await performSave(validStudents);
  };

  const handleMissingMarksAssignZero = async () => {
    setShowMissingMarksModal(false);

    // Assign 0 to all missing students
    setMarks((prev) => {
      const updated = [...prev];
      missingMarksStudents.forEach((student) => {
        const existingIndex = updated.findIndex(
          (m) => m.student_id === student.id
        );
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], score: 0 };
        } else {
          updated.push({ student_id: student.id, score: 0 });
        }
      });
      return updated;
    });

    // Wait for state to update, then save
    setTimeout(async () => {
      const validStudents = students.filter((s) => s.id !== "none" && s.id);
      await performSave(validStudents);
    }, 100);
  };

  const handleMissingMarksCancel = (filterToMissing = false) => {
    setShowMissingMarksModal(false);

    if (filterToMissing) {
      // Filter to show only students without marks
      setMarkFilter("without-marks");
      showModal(
        "error",
        "Filter Applied",
        `Showing ${missingMarksStudents.length} student(s) without marks. Please fill in their marks.`
      );
    }

    setMissingMarksStudents([]);
  };

  const performSave = async (validStudents) => {
    try {
      setSaving(true);

      // Prepare marks with ALL required fields
      const marksToSave = validStudents.map((s) => {
        const m = marks.find((mk) => mk.student_id === s.id);
        const score = m?.score == null || m.score === "" ? 0 : Number(m.score);

        // Extra validation
        if (isNaN(score) || score < 0 || score > 20) {
          throw new Error(`Invalid score for ${s.full_name}: ${m?.score}`);
        }

        return {
          student_id: s.id,
          score: score,
        };
      });

      if (marksToSave.length === 0) {
        throw new Error("No marks to save.");
      }

      const payload = {
        subject_id: subject.id,
        academic_year_id: filters.academic_year_id,
        class_id: filters.class_id,
        term_id: filters.term_id,
        sequence_id: filters.sequence_id,
        uploaded_by: user.id,
        marks: marksToSave,
      };

      console.log("Saving marks payload:", payload);

      const response = await api.post("/marks/save", payload);

      if (!isMountedRef.current) return;

      const summary = response.data?.summary || {};
      const hasErrors =
        (response.data?.validationErrors?.length || 0) > 0 ||
        (response.data?.saveErrors?.length || 0) > 0;

      if (hasErrors) {
        // Partial success
        const errorMessages = [];
        if (response.data?.validationErrors?.length > 0) {
          errorMessages.push(
            `${response.data.validationErrors.length} validation error(s)`
          );
        }
        if (response.data?.saveErrors?.length > 0) {
          errorMessages.push(
            `${response.data.saveErrors.length} save error(s)`
          );
        }

        showModal(
          "error",
          "Partial Save",
          `Saved ${summary.successful || 0}/${
            summary.total || 0
          } marks. ${errorMessages.join(
            ", "
          )}. Please check the console for details.`
        );

        console.error("Save errors:", {
          validationErrors: response.data?.validationErrors,
          saveErrors: response.data?.saveErrors,
        });
      } else {
        // Complete success
        showModal(
          "success",
          "Success",
          `All ${
            summary.successful || marksToSave.length
          } marks saved successfully! ${
            summary.created
              ? `(${summary.created} new, ${summary.updated} updated)`
              : ""
          }`
        );
      }

      // Reload marks to get fresh data
      await loadStudentsMarks();
    } catch (err) {
      console.error("Save error:", err);
      if (isMountedRef.current) {
        const errorMessage =
          err.response?.data?.details ||
          err.response?.data?.message ||
          err.message ||
          "Failed to save marks. Please try again.";

        showModal("error", "Save Failed", errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleExportExcel = () => {
    setExportingExcelFile(true);

    try {
      if (
        !Array.isArray(students) ||
        students.length === 0 ||
        students.some((s) => s.id === "none")
      ) {
        setExportingExcelFile(false);
        showModal("error", "Cannot Export", "No valid students to export.");
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
    } catch (err) {
      console.error("Export error:", err);
      showModal("error", "Export Failed", "Failed to export Excel file.");
    } finally {
      setExportingExcelFile(false);
    }
  };

  const handleMatchingComplete = (matches, skippedStudents) => {
    setShowMatchingModal(false);

    if (!Array.isArray(matches)) matches = [];
    if (!Array.isArray(skippedStudents)) skippedStudents = [];

    if (matches.length > 0) {
      const newMatches = matches
        .filter(
          (match) => match && match.systemStudent && match.systemStudent.id
        )
        .map((match) => ({
          student_id: match.systemStudent.id,
          score:
            match.score !== "" &&
            match.score !== null &&
            match.score !== undefined
              ? Number(match.score)
              : "",
        }));

      if (newMatches.length > 0) {
        setMarks((prev) => {
          if (!Array.isArray(prev)) return newMatches;

          const updated = [...prev];
          newMatches.forEach((newMark) => {
            const existingIndex = updated.findIndex(
              (m) => m && m.student_id === newMark.student_id
            );
            if (existingIndex >= 0) {
              updated[existingIndex] = newMark;
            } else {
              updated.push(newMark);
            }
          });
          return updated;
        });
      }
    }

    const totalProcessed = matches.length + skippedStudents.length;
    const messages = [];

    if (matches.length > 0) {
      messages.push(`${matches.length} student(s) matched successfully.`);
    }
    if (skippedStudents.length > 0) {
      messages.push(`${skippedStudents.length} student(s) skipped.`);
    }

    if (messages.length > 0) {
      showModal(
        matches.length > 0 ? "success" : "error",
        "Matching Complete",
        messages.join(" ")
      );
    }

    setUnmatchedStudents([]);
    setTotalImportedCount(0);
  };

  const handleMatchingCancel = () => {
    setShowMatchingModal(false);
    setUnmatchedStudents([]);
    setTotalImportedCount(0);
    showModal("error", "Import Cancelled", "No marks were imported.");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".xlsx", ".xls"];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      showModal(
        "error",
        "Invalid File Type",
        "Please upload an Excel file (.xlsx or .xls)"
      );
      e.target.value = null;
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showModal(
        "error",
        "File Too Large",
        "Please upload a file smaller than 10MB"
      );
      e.target.value = null;
      return;
    }

    try {
      setImportingExcelFile(true);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Excel file is empty or corrupted.");
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (!Array.isArray(json) || json.length < 11) {
        throw new Error(
          "Excel file format is invalid. Please use the exported template."
        );
      }

      const rows = json.slice(10);

      if (!rows || rows.length === 0) {
        throw new Error("No student data found in Excel file.");
      }

      const firstRow = rows[0];
      if (!Array.isArray(firstRow) || firstRow.length < 9) {
        throw new Error(
          "Excel file is missing required metadata. Please use the exported template."
        );
      }

      const [
        ,
        ,
        ,
        excelDeptId,
        excelYearId,
        excelClassId,
        excelTermId,
        excelSeqId,
        excelSubjectId,
      ] = firstRow;

      if (
        !excelYearId ||
        !excelClassId ||
        !excelTermId ||
        !excelSeqId ||
        !excelSubjectId
      ) {
        throw new Error(
          "Excel file metadata is incomplete. Please export a fresh template."
        );
      }

      const {
        academic_year_id,
        department_id,
        class_id,
        term_id,
        sequence_id,
      } = filters;

      const mismatches = [];
      if (String(excelYearId) !== String(academic_year_id)) {
        mismatches.push("Academic Year");
      }
      if (String(excelClassId) !== String(class_id)) {
        mismatches.push("Class");
      }
      if (String(excelTermId) !== String(term_id)) {
        mismatches.push("Term");
      }
      if (String(excelSeqId) !== String(sequence_id)) {
        mismatches.push("Sequence");
      }
      if (String(excelSubjectId) !== String(subject.id)) {
        mismatches.push("Subject");
      }

      if (mismatches.length > 0) {
        throw new Error(
          `Excel file does not match current selection. Mismatched: ${mismatches.join(
            ", "
          )}. Please export a fresh template with current filters.`
        );
      }

      let currentStudents = students;
      if (
        !Array.isArray(currentStudents) ||
        currentStudents.length === 0 ||
        currentStudents.some((s) => s.id === "none")
      ) {
        currentStudents = await fetchStudents(
          class_id,
          department_id,
          academic_year_id
        );
      }

      if (!isMountedRef.current) return;

      if (!Array.isArray(currentStudents) || currentStudents.length === 0) {
        throw new Error("No students found for the selected class.");
      }

      const newMarks = [];
      const unmatched = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row) || row.length < 3) continue;

        const [fullName, studentId, score] = row;

        const nameStr = String(fullName || "").trim();
        const idStr = String(studentId || "").trim();

        if (!nameStr || !idStr || nameStr === "" || idStr === "") continue;

        let student = currentStudents.find(
          (s) =>
            s &&
            s.student_id &&
            String(s.student_id).trim().toLowerCase() === idStr.toLowerCase()
        );

        if (student) {
          if (score !== "" && score !== null && score !== undefined) {
            const numScore = Number(score);
            if (isNaN(numScore)) {
              errors.push(
                `Row ${i + 11}: Invalid score "${score}" for ${nameStr}`
              );
              continue;
            }
            if (numScore < 0 || numScore > 20) {
              errors.push(
                `Row ${
                  i + 11
                }: Score ${numScore} out of range (0-20) for ${nameStr}`
              );
              continue;
            }
            newMarks.push({
              student_id: student.id,
              score: numScore,
            });
          } else {
            newMarks.push({
              student_id: student.id,
              score: "",
            });
          }
        } else {
          const scoreValue =
            score !== "" && score !== null && score !== undefined
              ? Number(score)
              : "";

          if (scoreValue !== "") {
            const numScore = Number(scoreValue);
            if (isNaN(numScore) || numScore < 0 || numScore > 20) {
              errors.push(`Row ${i + 11}: Invalid score for ${nameStr}`);
              continue;
            }
          }

          unmatched.push({
            fullName: nameStr,
            studentId: idStr,
            score: scoreValue,
          });
        }
      }

      if (errors.length > 0) {
        throw new Error(
          `Found ${errors.length} error(s) in Excel file:\n${errors
            .slice(0, 5)
            .join("\n")}${
            errors.length > 5 ? `\n...and ${errors.length - 5} more` : ""
          }`
        );
      }

      if (newMarks.length === 0 && unmatched.length === 0) {
        throw new Error("No valid student data found in Excel file.");
      }

      if (unmatched.length > 0) {
        setUnmatchedStudents(unmatched);
        setTotalImportedCount(newMarks.length + unmatched.length);

        setMarks((prev) => {
          const updated = [...prev];
          newMarks.forEach((newMark) => {
            const existingIndex = updated.findIndex(
              (m) => m.student_id === newMark.student_id
            );
            if (existingIndex >= 0) {
              updated[existingIndex] = newMark;
            } else {
              updated.push(newMark);
            }
          });
          return updated;
        });

        setShowMatchingModal(true);
      } else {
        setMarks(newMarks);
        showModal(
          "success",
          "Import Successful",
          `${newMarks.length} student mark${
            newMarks.length !== 1 ? "s" : ""
          } imported successfully.`
        );
      }
    } catch (err) {
      console.error("Import error:", err);
      showModal(
        "error",
        "Import Failed",
        err.message ||
          "Failed to load Excel. Please check the file format and try again."
      );
    } finally {
      if (isMountedRef.current) {
        setImportingExcelFile(false);
      }
      e.target.value = null;
    }
  };

  const filteredTerms =
    filters.academic_year_id && Array.isArray(terms)
      ? terms.filter(
          (t) => Number(t.academic_year_id) === Number(filters.academic_year_id)
        )
      : [];

  const selectedTerm = Array.isArray(terms)
    ? terms.find((t) => Number(t.id) === Number(filters.term_id))
    : null;

  const filteredSequences =
    filters.academic_year_id && selectedTerm && Array.isArray(sequences)
      ? sequences
          .filter(
            (s) =>
              Number(s.academic_year_id) === Number(filters.academic_year_id)
          )
          .filter((s) => Number(s.term_id) === Number(selectedTerm.id))
          .sort((a, b) => Number(a.order_number) - Number(b.order_number))
      : [];

  const filteredClasses =
    filters.department_id && Array.isArray(classes)
      ? classes.filter(
          (c) => Number(c.department_id) === Number(filters.department_id)
        )
      : [];

  const getFilteredAndSortedStudents = () => {
    if (!Array.isArray(students) || students.length === 0) return [];

    try {
      // START WITH: Either frozen students (if mark filter active) or all students
      let filtered;

      if (markFilter !== "all" && frozenFilterStudents !== null) {
        // Use frozen snapshot - students won't disappear while typing
        filtered = frozenFilterStudents.filter((s) => s && s.id);
      } else if (markFilter !== "all") {
        // First time applying filter - create snapshot and freeze it
        filtered = students.filter((s) => s && s.id);

        // Apply mark filter ONCE to create initial snapshot
        if (markFilter === "with-marks") {
          filtered = filtered.filter((s) => {
            const mark = marks.find((m) => m.student_id === s.id);
            const score = mark?.score;
            return (
              score !== null &&
              score !== "" &&
              score !== undefined &&
              !isNaN(Number(score))
            );
          });
        } else if (markFilter === "without-marks") {
          filtered = filtered.filter((s) => {
            const mark = marks.find((m) => m.student_id === s.id);
            const score = mark?.score;
            return (
              score == null ||
              score === "" ||
              score === undefined ||
              isNaN(Number(score))
            );
          });
        }

        // Freeze this snapshot so students don't disappear while typing
        setFrozenFilterStudents(filtered);
      } else {
        // No mark filter active - use all students and clear frozen state
        filtered = students.filter((s) => s && s.id);
        if (frozenFilterStudents !== null) {
          setFrozenFilterStudents(null);
        }
      }

      // Apply search filter (if any)
      if (selectedStudentId) {
        filtered = filtered.filter((s) => s.id === selectedStudentId);
      } else if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            (s.full_name && s.full_name.toLowerCase().includes(searchLower)) ||
            (s.student_id && s.student_id.toLowerCase().includes(searchLower))
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        if (sortConfig.key === "name") {
          const nameA = (a.full_name || "").toLowerCase();
          const nameB = (b.full_name || "").toLowerCase();
          if (sortConfig.order === "asc") {
            return nameA.localeCompare(nameB);
          } else {
            return nameB.localeCompare(nameA);
          }
        } else if (sortConfig.key === "score") {
          const markA = marks.find((m) => m.student_id === a.id);
          const markB = marks.find((m) => m.student_id === b.id);

          // Handle in-progress typing - treat as -1 for sorting
          const scoreA =
            markA?.score == null ||
            markA?.score === "" ||
            isNaN(Number(markA?.score))
              ? -1
              : Number(markA.score);
          const scoreB =
            markB?.score == null ||
            markB?.score === "" ||
            isNaN(Number(markB?.score))
              ? -1
              : Number(markB.score);

          if (sortConfig.order === "asc") {
            return scoreA - scoreB;
          } else {
            return scoreB - scoreA;
          }
        }
        return 0;
      });

      return filtered;
    } catch (error) {
      console.error("Error filtering students:", error);
      return students;
    }
  };

  const filteredAndSortedStudents = getFilteredAndSortedStudents();

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
          s.id !== "none" &&
          (s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            s.student_id?.toLowerCase().includes(debouncedSearch.toLowerCase()))
      )
      .slice(0, 8)
      .sort((a, b) => {
        const nameA = (a.full_name || "").toLowerCase();
        const nameB = (b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
  };

  const searchSuggestions = getSearchSuggestions();

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

  useEffect(() => {
    setCurrentPage(1);
    // Reset frozen filter when mark filter changes
    if (markFilter === "all") {
      setFrozenFilterStudents(null);
    }
  }, [searchTerm, sortConfig, studentsPerPage, selectedStudentId, markFilter]);

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }));
  };

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
    setSearchInput(student.full_name);
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
                  !Array.isArray(students) ||
                  students.length === 0 ||
                  students.some((s) => s.id === "none")
                }
              >
                {exportingExcelFile ? "Downloading..." : "Export to Excel"}
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
                  disabled={
                    !Array.isArray(students) ||
                    students.length === 0 ||
                    students.some((s) => s.id === "none")
                  }
                  onClick={() =>
                    document.getElementById("uploadExcelInput")?.click()
                  }
                >
                  {importingExcelFile ? "Uploading..." : "Upload Excel"}
                </button>
              </div>
            </div>

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
                {/* NEW: Mark Filter Dropdown */}
                <Select
                  className="marks-filter-dropdown"
                  options={[
                    { value: "all", label: "All Students" },
                    { value: "with-marks", label: "With Marks" },
                    { value: "without-marks", label: "Without Marks" },
                  ]}
                  value={{
                    value: markFilter,
                    label:
                      markFilter === "all"
                        ? "All Students"
                        : markFilter === "with-marks"
                        ? "With Marks"
                        : "Without Marks",
                  }}
                  onChange={(opt) => setMarkFilter(opt.value)}
                  isSearchable={false}
                />

                <button
                  className="marks-sort-btn"
                  onClick={() => toggleSort("name")}
                  title={
                    sortConfig.key === "name" && sortConfig.order === "asc"
                      ? "Sort Z-A"
                      : "Sort A-Z"
                  }
                >
                  {sortConfig.key === "name" && sortConfig.order === "asc" ? (
                    <>
                      <FaSortAlphaDown /> A-Z
                    </>
                  ) : (
                    <>
                      <FaSortAlphaUp /> Z-A
                    </>
                  )}
                </button>

                <button
                  className="marks-sort-btn"
                  onClick={() => toggleSort("score")}
                  title={
                    sortConfig.key === "score" && sortConfig.order === "asc"
                      ? "Sort High to Low"
                      : "Sort Low to High"
                  }
                >
                  {sortConfig.key === "score" && sortConfig.order === "asc" ? (
                    <>
                      <FaSortNumericDown /> Low-High
                    </>
                  ) : (
                    <>
                      <FaSortNumericUp /> High-Low
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
              {markFilter !== "all" && (
                <span className="marks-filter-info">
                  Showing:{" "}
                  {markFilter === "with-marks"
                    ? "Students with marks"
                    : "Students without marks"}
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
                            : markFilter === "with-marks"
                            ? "No students with marks found"
                            : markFilter === "without-marks"
                            ? "All students have marks!"
                            : "No students found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

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
                {saving ? "Saving..." : "Save Marks"}
              </button>
            </div>
          </>
        )}

        {showMatchingModal && unmatchedStudents.length > 0 && (
          <NameMatchingModal
            unmatchedStudents={unmatchedStudents}
            existingStudents={students.filter((s) => s.id !== "none")}
            onComplete={handleMatchingComplete}
            onCancel={handleMatchingCancel}
            totalImported={totalImportedCount}
          />
        )}

        {showMissingMarksModal && (
          <MissingMarksModal
            missingStudents={missingMarksStudents}
            onAssignZero={handleMissingMarksAssignZero}
            onCancel={handleMissingMarksCancel}
          />
        )}

        {saving && (
          <SavingModal
            marksCount={students.filter((s) => s.id !== "none").length}
          />
        )}

        {simpleModal && (
          <SimpleModal
            type={simpleModal.type}
            title={simpleModal.title}
            message={simpleModal.message}
            onClose={() => setSimpleModal(null)}
          />
        )}
      </div>
    </SideTop>
  );
};
