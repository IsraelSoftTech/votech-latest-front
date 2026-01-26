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
  FaUserSlash,
  FaTrash,
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

// Simple Confirmation Modal Component
const SimpleConfirmModal = ({ title, message, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <div className="simple-modal-overlay" onClick={onCancel}>
      <div
        className="simple-modal confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="simple-modal-close" onClick={onCancel}>
          <FaTimes />
        </button>

        <div className="simple-modal-icon warning">
          <FaExclamationTriangle />
        </div>

        <h3 className="simple-modal-title">{title}</h3>
        <p className="simple-modal-message">{message}</p>

        <div className="simple-modal-actions">
          <button
            className="simple-modal-button secondary"
            onClick={onCancel}
            style={{ marginBottom: "1rem" }}
          >
            Cancel
          </button>

          <button
            className="simple-modal-button primary btn delete-mark-btn"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
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

// NEW: Exclude Students Modal
const ExcludeStudentsModal = ({ studentsToExclude, onConfirm, onCancel }) => {
  const displayLimit = 10;
  const hasMore = studentsToExclude.length > displayLimit;

  return (
    <Modal isOpen={true} onClose={onCancel} title="Exclude Students">
      <div className="exclude-students-modal">
        <div className="exclude-icon">
          <FaUserSlash />
        </div>

        <p className="exclude-message">
          You're about to exclude <strong>{studentsToExclude.length}</strong>{" "}
          student
          {studentsToExclude.length !== 1 ? "s" : ""} who{" "}
          {studentsToExclude.length !== 1 ? "don't" : "doesn't"} take this
          subject.
        </p>

        <div className="excluded-students-list">
          {studentsToExclude.slice(0, displayLimit).map((student, index) => (
            <div key={student.id} className="excluded-student-item">
              <span className="student-number">{index + 1}.</span>
              <span className="student-name">{student.full_name}</span>
              <span className="student-id">({student.student_id})</span>
            </div>
          ))}
          {hasMore && (
            <div className="excluded-students-more">
              ... and {studentsToExclude.length - displayLimit} more student
              {studentsToExclude.length - displayLimit !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <p className="exclude-info">
          These students will be marked as "Not Taking Subject" and won't appear
          in the marks table.
        </p>

        <div className="exclude-actions">
          <button className="btn-secondary" onClick={onCancel}>
            <FaTimes /> Cancel
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            <FaCheck /> Confirm Exclusion
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Missing Marks Modal - SIMPLIFIED
const MissingMarksModal = ({ missingStudents, onConfirm, onCancel }) => {
  const [studentActions, setStudentActions] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Initialize all students with no action
  useEffect(() => {
    const initial = {};
    missingStudents.forEach((s) => {
      initial[s.id] = null; // null, 'zero', or 'exclude'
    });
    setStudentActions(initial);
  }, [missingStudents]);

  const setActionForStudent = (studentId, action) => {
    setStudentActions((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === action ? null : action, // Toggle off if clicking same action
    }));
  };

  const setActionForAll = (action) => {
    const updated = {};
    missingStudents.forEach((s) => {
      updated[s.id] = action;
    });
    setStudentActions(updated);
  };

  const getActionCounts = () => {
    const counts = { zero: 0, exclude: 0, none: 0 };

    Object.values(studentActions).forEach((action) => {
      if (action === "zero") counts.zero++;
      else if (action === "exclude") counts.exclude++;
      else counts.none++;
    });

    return counts;
  };

  const handleProceed = () => {
    const counts = getActionCounts();

    if (counts.none > 0) {
      alert(
        `Please choose an action for all students.\n\n${counts.none} student(s) still need an action.`
      );
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    const studentsToZero = missingStudents.filter(
      (s) => studentActions[s.id] === "zero"
    );
    const studentsToExclude = missingStudents.filter(
      (s) => studentActions[s.id] === "exclude"
    );

    onConfirm({ zero: studentsToZero, exclude: studentsToExclude });
  };

  const counts = getActionCounts();

  if (showConfirmation) {
    return (
      <Modal
        isOpen={true}
        onClose={() => setShowConfirmation(false)}
        title="Confirm & Save"
      >
        <div className="confirmation-modal">
          <div className="confirmation-icon">
            <FaCheckCircle />
          </div>

          {counts.zero > 0 && (
            <div className="summary-item zero">
              <div className="summary-count">{counts.zero}</div>
              <div className="summary-text">
                Student{counts.zero !== 1 ? "s" : ""} will get{" "}
                <strong>0 marks</strong>
              </div>
            </div>
          )}

          {counts.exclude > 0 && (
            <div className="summary-item exclude">
              <div className="summary-count">{counts.exclude}</div>
              <div className="summary-text">
                Student{counts.exclude !== 1 ? "s" : ""} marked as{" "}
                <strong>Not Taking Subject</strong>
              </div>
            </div>
          )}

          <div className="confirmation-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowConfirmation(false)}
            >
              <FaArrowLeft /> Back
            </button>
            <button className="btn-primary" onClick={handleConfirm}>
              <FaCheck /> Save
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`${missingStudents.length} Students Without Marks`}
    >
      <div className="missing-marks-modal simple">
        {/* Bulk Actions */}
        <div className="bulk-actions">
          <button
            className="bulk-btn zero"
            onClick={() => setActionForAll("zero")}
          >
            All Get Zero
          </button>
          <button
            className="bulk-btn exclude"
            onClick={() => setActionForAll("exclude")}
          >
            All Excluded
          </button>
        </div>

        {/* Students List */}
        <div className="students-action-list">
          {missingStudents.map((student) => {
            const action = studentActions[student.id];

            return (
              <div
                key={student.id}
                className={`student-row ${action || "none"}`}
              >
                <div className="student-info">
                  <span className="student-name">{student.full_name}</span>
                  <span className="student-id">{student.student_id}</span>
                </div>

                <div className="action-btns">
                  <button
                    className={`act-btn zero ${
                      action === "zero" ? "active" : ""
                    }`}
                    onClick={() => setActionForStudent(student.id, "zero")}
                  >
                    0
                  </button>
                  <button
                    className={`act-btn exclude ${
                      action === "exclude" ? "active" : ""
                    }`}
                    onClick={() => setActionForStudent(student.id, "exclude")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status */}
        {counts.none > 0 && (
          <div className="status-bar pending">
            {counts.none} student{counts.none !== 1 ? "s" : ""} need an action
          </div>
        )}

        {counts.none === 0 && (
          <div className="status-bar ready">
            ✓ Ready: {counts.zero} zero, {counts.exclude} excluded
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-outline" onClick={() => onCancel(true)}>
            Fill Manually
          </button>
          <button
            className="btn-primary"
            onClick={handleProceed}
            disabled={counts.none > 0}
          >
            Proceed ({counts.zero + counts.exclude})
          </button>
        </div>
      </div>
    </Modal>
  );
};
//#1e3a8a

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

  // NEW: Excluded students state
  const [excludedStudents, setExcludedStudents] = useState([]);

  // Sorting, Search, and Pagination states
  const [sortConfig, setSortConfig] = useState({ key: "name", order: "asc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  // Mark filter state - UPDATED with new option
  const [markFilter, setMarkFilter] = useState("all"); // 'all', 'with-marks', 'without-marks', 'excluded'

  // Frozen filter state
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

  // Missing marks modal state
  const [showMissingMarksModal, setShowMissingMarksModal] = useState(false);
  const [missingMarksStudents, setMissingMarksStudents] = useState([]);

  // NEW: Exclude modal state
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  const [studentsToExclude, setStudentsToExclude] = useState([]);

  // NEW: Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { studentId, markId, studentName }

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
        setExcludedStudents([]);
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
          setExcludedStudents([]);
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
        setExcludedStudents([]);
        setLoadingTable(false);
        return;
      }

      try {
        const marksRes = await api.get(
          `/marks?subject_id=${subject.id}&academic_year_id=${academic_year_id}&class_id=${class_id}&term_id=${term_id}&sequence_id=${sequence_id}`
        );
        if (isMountedRef.current) {
          const fetchedMarks = Array.isArray(marksRes?.data?.data)
            ? marksRes.data.data
            : [];
          setMarks(fetchedMarks);

          // NEW: Load excluded students (marks with score = null)
          const excluded = fetchedMarks
            .filter((m) => m.score === null)
            .map((m) => m.student_id);
          setExcludedStudents(excluded);
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
          setExcludedStudents([]);
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
        setExcludedStudents([]);
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

    if (value !== "" && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        if (numValue < 0 || numValue > 20) {
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

  // NEW: Delete mark function
  const handleDeleteMark = (studentId, markId) => {
    if (!markId) {
      showModal("error", "Cannot Delete", "No saved mark found to delete.");
      return;
    }

    const student = students.find((s) => s.id === studentId);
    const studentName = student?.full_name || "this student";

    // Show confirmation modal
    setDeleteTarget({ studentId, markId, studentName });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMark = async () => {
    if (!deleteTarget) return;

    const { markId, studentName } = deleteTarget;

    try {
      await api.delete(`/marks/${markId}`);

      // Remove from local marks state
      setMarks((prev) => prev.filter((m) => m.id !== markId));

      // Close confirmation modal
      setShowDeleteConfirm(false);
      setDeleteTarget(null);

      showModal(
        "success",
        "Mark Deleted",
        `Successfully deleted the mark for ${studentName}.`
      );

      // Reload to get fresh data
      await loadStudentsMarks();
    } catch (err) {
      console.error("Delete mark error:", err);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      showModal(
        "error",
        "Delete Failed",
        err.response?.data?.message ||
          "Failed to delete mark. Please try again."
      );
    }
  };

  const cancelDeleteMark = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // NEW: Toggle exclude student
  const handleToggleExclude = (studentId) => {
    setExcludedStudents((prev) => {
      if (prev.includes(studentId)) {
        // Un-exclude
        return prev.filter((id) => id !== studentId);
      } else {
        // Exclude
        return [...prev, studentId];
      }
    });

    // Remove mark if excluding
    if (!excludedStudents.includes(studentId)) {
      setMarks((prev) => prev.filter((m) => m.student_id !== studentId));
    }
  };

  // NEW: Bulk exclude from missing marks modal
  const handleBulkExclude = () => {
    setShowMissingMarksModal(false);
    setStudentsToExclude(missingMarksStudents);
    setShowExcludeModal(true);
  };

  // NEW: Confirm bulk exclusion
  const handleConfirmExclusion = () => {
    const studentIds = studentsToExclude.map((s) => s.id);
    setExcludedStudents((prev) => [...new Set([...prev, ...studentIds])]);

    // Remove marks for excluded students
    setMarks((prev) => prev.filter((m) => !studentIds.includes(m.student_id)));

    setShowExcludeModal(false);
    setStudentsToExclude([]);
    setMissingMarksStudents([]);

    showModal(
      "success",
      "Students Excluded",
      `${studentIds.length} student(s) marked as not taking this subject.`
    );
  };

  const handleSave = async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;

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

    // Filter out excluded students - these will NOT be sent to backend
    const activeStudents = validStudents.filter(
      (s) => !excludedStudents.includes(s.id)
    );

    if (activeStudents.length === 0) {
      showModal(
        "error",
        "No Active Students",
        "All students are excluded. Please include at least one student."
      );
      return;
    }

    // Check for missing marks (only for non-excluded students)
    const missingMarks = activeStudents.filter((s) => {
      const mark = marks.find((m) => m.student_id === s.id);
      // A mark is "missing" if it's null, undefined, or empty string
      // Note: 0 is a VALID mark, not missing!
      return (
        mark?.score === null || mark?.score === undefined || mark?.score === ""
      );
    });

    if (missingMarks.length > 0) {
      setMissingMarksStudents(missingMarks);
      setShowMissingMarksModal(true);
      return;
    }

    await performSave(activeStudents);
  };

  const handleMissingMarksConfirm = async (actions) => {
    setShowMissingMarksModal(false);

    const { zero, exclude } = actions;

    // Update marks - assign 0 to zero group
    if (zero.length > 0) {
      setMarks((prev) => {
        const updated = [...prev];
        zero.forEach((student) => {
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
    }

    // Update excluded students - exclude group
    if (exclude.length > 0) {
      const excludeIds = exclude.map((s) => s.id);
      setExcludedStudents((prev) => [...new Set([...prev, ...excludeIds])]);

      // Remove marks for excluded students
      setMarks((prev) =>
        prev.filter((m) => !excludeIds.includes(m.student_id))
      );
    }

    // Show summary
    const messages = [];
    if (zero.length > 0) {
      messages.push(`${zero.length} student(s) assigned 0 marks`);
    }
    if (exclude.length > 0) {
      messages.push(
        `${exclude.length} student(s) excluded (not taking subject)`
      );
    }

    showModal("success", "Actions Applied", messages.join("\n"));

    // Wait a bit then save
    setTimeout(async () => {
      const validStudents = students.filter(
        (s) => s.id !== "none" && s.id && !excludedStudents.includes(s.id)
      );
      await performSave(validStudents);
    }, 100);

    setMissingMarksStudents([]);
  };

  const handleMissingMarksCancel = (filterToMissing = false) => {
    setShowMissingMarksModal(false);

    if (filterToMissing) {
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

      // Prepare marks for active students ONLY (excluded students are NOT sent)
      const marksToSave = students
        .filter((s) => !excludedStudents.includes(s.id)) // Double-check exclusion
        .map((s) => {
          const m = marks.find((mk) => mk.student_id === s.id);

          let score;

          // Explicit zero is valid
          if (m?.score === 0 || m?.score === "0") {
            score = 0;
          }
          // Empty or null → skip this student
          else if (m?.score == null || m?.score === "") {
            return null; // 👈 THIS is the "skip"
          }
          // Normal number
          else {
            score = Number(m.score);
          }

          if (isNaN(score) || score < 0 || score > 20) {
            throw new Error(`Invalid score for ${s.full_name}: ${m?.score}`);
          }

          return {
            student_id: s.id,
            score,
          };
        })
        .filter(Boolean); // 👈 removes all null entries

      if (marksToSave.length === 0) {
        throw new Error("No marks to save. All students may be excluded.");
      }

      const payload = {
        subject_id: subject.id,
        academic_year_id: filters.academic_year_id,
        class_id: filters.class_id,
        term_id: filters.term_id,
        sequence_id: filters.sequence_id,
        uploaded_by: user.id,
        marks: marksToSave, // Only active students with scores (including 0)
      };

      console.log("Saving marks payload:", payload);
      console.log(
        `Sending ${marksToSave.length} marks (${excludedStudents.length} students excluded)`
      );

      const response = await api.post("/marks/save", payload);

      if (!isMountedRef.current) return;

      const summary = response.data?.summary || {};
      const hasErrors =
        (response.data?.validationErrors?.length || 0) > 0 ||
        (response.data?.saveErrors?.length || 0) > 0;

      if (hasErrors) {
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
        const excludedCount = excludedStudents.length;
        const message =
          excludedCount > 0
            ? `Successfully saved ${
                summary.successful || marksToSave.length
              } marks! (${excludedCount} student(s) excluded - not sent to server)`
            : `Successfully saved ${
                summary.successful || marksToSave.length
              } marks!`;

        showModal("success", "Success", message);
      }

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
        ["Student Name", "Student ID", "Score", "Excluded"],
        [
          "",
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
          const isExcluded = excludedStudents.includes(s.id);
          return [
            s.full_name ?? s.name,
            s.student_id,
            isExcluded ? "N/A" : m?.score ?? "",
            isExcluded ? "YES" : "NO",
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
      if (!Array.isArray(firstRow) || firstRow.length < 10) {
        throw new Error(
          "Excel file is missing required metadata. Please use the exported template."
        );
      }

      const [
        ,
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
        if (!Array.isArray(row) || row.length < 4) continue;

        const [fullName, studentId, score, excludedFlag] = row;

        const nameStr = String(fullName || "").trim();
        const idStr = String(studentId || "").trim();
        const isExcluded = String(excludedFlag || "").toUpperCase() === "YES";

        if (!nameStr || !idStr || nameStr === "" || idStr === "") continue;

        let student = currentStudents.find(
          (s) =>
            s &&
            s.student_id &&
            String(s.student_id).trim().toLowerCase() === idStr.toLowerCase()
        );

        if (student) {
          if (isExcluded) {
            // Mark as excluded (no score)
            if (!excludedStudents.includes(student.id)) {
              setExcludedStudents((prev) => [...prev, student.id]);
            }
          } else if (score !== "" && score !== null && score !== undefined) {
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
      let filtered;

      if (markFilter !== "all" && frozenFilterStudents !== null) {
        filtered = frozenFilterStudents.filter((s) => s && s.id);
      } else if (markFilter !== "all") {
        filtered = students.filter((s) => s && s.id);

        if (markFilter === "with-marks") {
          filtered = filtered.filter((s) => {
            if (excludedStudents.includes(s.id)) return false;
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
            if (excludedStudents.includes(s.id)) return false;
            const mark = marks.find((m) => m.student_id === s.id);
            const score = mark?.score;
            return (
              score == null ||
              score === "" ||
              score === undefined ||
              isNaN(Number(score))
            );
          });
        } else if (markFilter === "with-zero") {
          // NEW: Filter to show only students with zero marks
          filtered = filtered.filter((s) => {
            const mark = marks.find((m) => m.student_id === s.id);
            return mark?.score === 0;
          });
        } else if (markFilter === "excluded") {
          // Filter to show only excluded students
          filtered = filtered.filter((s) => excludedStudents.includes(s.id));
        }

        setFrozenFilterStudents(filtered);
      } else {
        filtered = students.filter((s) => s && s.id);
        if (frozenFilterStudents !== null) {
          setFrozenFilterStudents(null);
        }
      }

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
                <Select
                  className="marks-filter-dropdown"
                  options={[
                    { value: "all", label: "All Students" },
                    { value: "with-marks", label: "With Marks" },
                    { value: "without-marks", label: "Without Marks" },
                    { value: "with-zero", label: "With Zero Marks" },
                    { value: "excluded", label: "Excluded (Don't Take)" },
                  ]}
                  value={{
                    value: markFilter,
                    label:
                      markFilter === "all"
                        ? "All Students"
                        : markFilter === "with-marks"
                        ? "With Marks"
                        : markFilter === "without-marks"
                        ? "Without Marks"
                        : markFilter === "with-zero"
                        ? "With Zero Marks"
                        : "Excluded (Don't Take)",
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
                  {markFilter === "with-marks"
                    ? "Students with marks"
                    : markFilter === "without-marks"
                    ? "Students without marks"
                    : markFilter === "with-zero"
                    ? "Students with zero marks"
                    : "Excluded students"}
                </span>
              )}
              {excludedStudents.length > 0 && markFilter === "all" && (
                <span className="marks-excluded-info">
                  {excludedStudents.length} student(s) excluded
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((s, index) => {
                        const globalIndex =
                          studentsPerPage === "all"
                            ? index
                            : (currentPage - 1) * studentsPerPage + index;
                        const isExcluded = excludedStudents.includes(s.id);

                        return (
                          <tr
                            key={s.id}
                            className={`marks-table-row ${
                              isExcluded ? "excluded-row" : ""
                            }`}
                          >
                            <td className="desktop-cell">{globalIndex + 1}</td>
                            <td className="desktop-cell">{s.student_id}</td>
                            <td className="desktop-cell">
                              {s.full_name}
                              {isExcluded && (
                                <span className="excluded-badge">
                                  Not Taking Subject
                                </span>
                              )}
                            </td>
                            <td className="desktop-cell">
                              {s.id === "none" || isExcluded ? (
                                <span className="not-applicable">N/A</span>
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
                                  disabled={isExcluded}
                                />
                              )}
                            </td>
                            <td className="desktop-cell">
                              {s.id !== "none" && (
                                <>
                                  {/* Show delete button if student has a saved mark (regardless of score) */}
                                  {marks.find(
                                    (m) => m.student_id === s.id && m.id
                                  ) && (
                                    <button
                                      className="delete-mark-btn"
                                      onClick={() =>
                                        handleDeleteMark(
                                          s.id,
                                          marks.find(
                                            (m) => m.student_id === s.id
                                          )?.id
                                        )
                                      }
                                      title="Delete mark"
                                    >
                                      <FaTrash />
                                    </button>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="mobile-marks-cell" colSpan={5}>
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
                                    {isExcluded && (
                                      <span className="excluded-badge-mobile">
                                        Not Taking Subject
                                      </span>
                                    )}
                                  </div>

                                  <div className="marks-input-section">
                                    <label className="marks-input-label">
                                      Enter Mark (0-20)
                                    </label>
                                    {s.id === "none" || isExcluded ? (
                                      <div className="marks-placeholder">
                                        N/A
                                      </div>
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
                                        disabled={isExcluded}
                                      />
                                    )}
                                  </div>

                                  {s.id !== "none" && (
                                    <>
                                      {/* Show delete button if student has a saved mark */}
                                      {marks.find(
                                        (m) => m.student_id === s.id && m.id
                                      ) && (
                                        <button
                                          className="delete-mark-btn-mobile"
                                          onClick={() =>
                                            handleDeleteMark(
                                              s.id,
                                              marks.find(
                                                (m) => m.student_id === s.id
                                              )?.id
                                            )
                                          }
                                        >
                                          <FaTrash /> Delete Mark
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="no-data-row">
                        <td colSpan={5} className="no-data-cell">
                          {searchTerm || selectedStudentId
                            ? `No students found matching your search`
                            : markFilter === "with-marks"
                            ? "No students with marks found"
                            : markFilter === "without-marks"
                            ? "All students have marks!"
                            : markFilter === "with-zero"
                            ? "No students with zero marks"
                            : markFilter === "excluded"
                            ? "No excluded students"
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
            onConfirm={handleMissingMarksConfirm}
            onCancel={handleMissingMarksCancel}
          />
        )}

        {showExcludeModal && (
          <ExcludeStudentsModal
            studentsToExclude={studentsToExclude}
            onConfirm={handleConfirmExclusion}
            onCancel={() => {
              setShowExcludeModal(false);
              setStudentsToExclude([]);
            }}
          />
        )}

        {saving && (
          <SavingModal
            marksCount={
              students.filter(
                (s) => s.id !== "none" && !excludedStudents.includes(s.id)
              ).length
            }
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

        {showDeleteConfirm && deleteTarget && (
          <SimpleConfirmModal
            title="Delete Mark"
            message={`Are you sure you want to delete the mark for ${deleteTarget.studentName}? This will remove the mark from the database.`}
            onConfirm={confirmDeleteMark}
            onCancel={cancelDeleteMark}
          />
        )}
      </div>
    </SideTop>
  );
};

export default MarksUploadPage;
