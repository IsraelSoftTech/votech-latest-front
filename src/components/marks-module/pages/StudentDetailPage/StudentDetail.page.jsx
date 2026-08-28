import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaChartBar,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCalendarCheck,
  FaGraduationCap,
  FaDownload,
  FaUser,
  FaTimes,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaFileAlt,
  FaPen,
} from "react-icons/fa";
import SideTop from "../../../SideTop";
import Modal from "../../components/Modal/Modal.component";
import { StudentFormModal } from "../../components/StudentFormModal/StudentFormModal.component";
import { StudentMarksEditModal } from "../../components/StudentMarksEditModal/StudentMarksEditModal.component";
import { ReportCardDownloadModal } from "../../components/ReportCardDownloadModal/ReportCardDownloadModal.component";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api, { headers, subBaseURL } from "../../utils/api";
// Tab content styling reused as-is from the modal this page replaces —
// the tab panels themselves are unchanged, only the surrounding chrome
// (page vs modal) differs. See StudentDetailModal.component.jsx (kept,
// unused) for the version this was ported from.
import "../../components/StudentDetailModal/StudentDetailModal.styles.css";
// Reused for the status pill + delete-confirm modal classes already
// built for the Students list page, so both surfaces look identical.
import "../StudentsPage/Students.styles.css";
import "./StudentDetail.page.styles.css";

const TABS = [
  { key: "academics", label: "Academics", icon: <FaChartBar /> },
  { key: "fees", label: "Fees", icon: <FaMoneyBillWave /> },
  { key: "discipline", label: "Discipline", icon: <FaExclamationTriangle /> },
  { key: "attendance", label: "Attendance", icon: <FaCalendarCheck /> },
  { key: "promotion", label: "Promotion History", icon: <FaGraduationCap /> },
];

export const StudentDetailPage = () => {
  useRestrictTo("Admin3");
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [activeTab, setActiveTab] = useState("academics");
  const [cache, setCache] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);

  // Dropdown options for StudentFormModal (edit info) — same fetch shape
  // as the Students list page, since this page can be reached directly
  // (bookmark/refresh), not only via a row click that already has them.
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [marksModalOpen, setMarksModalOpen] = useState(false);
  const [reportCardModalOpen, setReportCardModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [transcriptDownloading, setTranscriptDownloading] = useState(false);

  const fetchStudent = useCallback(async () => {
    setLoadingStudent(true);
    try {
      const res = await api.get(`/students/${id}`);
      setStudent(res.data.data);
    } catch (err) {
      toast.error("Failed to load this student.");
      setStudent(null);
    } finally {
      setLoadingStudent(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  useEffect(() => {
    Promise.all([
      api.get("/academic-years"),
      api.get("/classes"),
      fetch(`${subBaseURL}/specialties`, { headers: headers() }).then((r) => r.json()),
    ])
      .then(([yearsRes, classesRes, deptRes]) => {
        setAcademicYears(yearsRes.data?.data || []);
        setClasses(classesRes.data?.data || []);
        setDepartments(Array.isArray(deptRes) ? deptRes : []);
      })
      .catch(() => {});
  }, []);

  const academicYearId = student?.academic_year_id;

  const loadTab = useCallback(
    async (tab, force = false) => {
      if (!student?.id || (cache[tab] && !force)) return;
      setLoadingTab(true);
      try {
        let data;
        if (tab === "academics") {
          const res = await api.get(
            `/report-cards/single?studentId=${student.id}&academicYearId=${academicYearId}&classId=${student.class_id}&departmentId=${student.specialty_id}`
          );
          data = res.data.data.reportCard;
        } else if (tab === "fees") {
          const res = await fetch(
            `${subBaseURL}/fees/student/${student.id}?year=${new Date().getFullYear()}`,
            { headers: headers() }
          );
          data = await res.json();
        } else if (tab === "discipline") {
          const res = await fetch(
            `${subBaseURL}/discipline-cases?student_id=${student.id}`,
            { headers: headers() }
          );
          data = await res.json();
        } else if (tab === "attendance") {
          const res = await fetch(
            `${subBaseURL}/attendance/student/${student.id}/summary?academic_year_id=${academicYearId}`,
            { headers: headers() }
          );
          data = await res.json();
        } else if (tab === "promotion") {
          const res = await api.get(`/promotions/students/${student.id}/history`);
          data = res.data.data || [];
        }
        setCache((prev) => ({ ...prev, [tab]: data }));
      } catch (err) {
        if (err.response?.status === 404) {
          setCache((prev) => ({ ...prev, [tab]: tab === "promotion" ? [] : null }));
        } else {
          setCache((prev) => ({ ...prev, [tab]: { error: true } }));
        }
      } finally {
        setLoadingTab(false);
      }
    },
    [student, academicYearId, cache]
  );

  useEffect(() => {
    if (student) loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, student?.id]);

  // Clearing the cache alone doesn't refetch anything — the fetch only
  // runs from the effect below, which is keyed on activeTab/student.id,
  // neither of which changes when a save happens. Without calling loadTab
  // directly here, the tab silently goes stale (reads as empty/outdated)
  // until something else happens to change activeTab and back.
  const refreshAcademics = () => {
    loadTab("academics", true);
  };

  const handleDownloadTranscript = async () => {
    if (!student || transcriptDownloading) return;
    setTranscriptDownloading(true);
    try {
      const res = await api.get(`/students/${student.id}/transcript/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(student.full_name || "student").replace(/\s+/g, "_")}-transcript.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to generate transcript. This student may have no recorded marks yet.");
    } finally {
      setTranscriptDownloading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/students/${id}`);
      toast.success("Student removed.");
      navigate("/admin-student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove student.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loadingStudent) {
    return (
      <SideTop>
        <StudentDetailPageSkeleton />
      </SideTop>
    );
  }

  if (!student) {
    return (
      <SideTop>
        <div className="sdp-page">
          <button className="sdp-back-btn" onClick={() => navigate("/admin-student")}>
            <FaArrowLeft /> Back to Students
          </button>
          <div className="sdp-loading">Student not found.</div>
        </div>
      </SideTop>
    );
  }

  const tabData = cache[activeTab];

  return (
    <SideTop>
      <div className="sdp-page">
        <button className="sdp-back-btn" onClick={() => navigate("/admin-student")}>
          <FaArrowLeft /> Back to Students
        </button>

        <div className="sdp-header">
          <div className="sdm-identity">
            {student.photo_url ? (
              <button
                type="button"
                className="sdm-photo sdm-photo-clickable"
                onClick={() => setPhotoLightboxOpen(true)}
                title="View larger photo"
              >
                <img src={student.photo_url} alt={student.full_name} />
              </button>
            ) : (
              <div className="sdm-photo">
                <FaUser className="sdm-photo-placeholder" />
              </div>
            )}
            <div className="sdp-identity-text">
              <h2 className="sdp-name">{student.full_name}</h2>
              <span className="sdp-sub">
                {student.student_id} • {student.Class?.name || "No class"} •{" "}
                <span className={`students-status-pill ${student.status}`}>{student.status}</span>
              </span>
            </div>
          </div>

          <div className="sdp-actions">
            <button className="sdp-action-btn" onClick={() => setEditModalOpen(true)}>
              <FaEdit /> Edit Info
            </button>
            <button className="sdp-action-btn" onClick={() => setMarksModalOpen(true)}>
              <FaPen /> Edit Marks
            </button>
            <button className="sdp-action-btn" onClick={() => setReportCardModalOpen(true)}>
              <FaDownload /> Report Card
            </button>
            <button
              className="sdp-action-btn"
              onClick={handleDownloadTranscript}
              disabled={transcriptDownloading}
            >
              <FaFileAlt /> {transcriptDownloading ? "Preparing…" : "Transcript"}
            </button>
            <button
              className="sdp-action-btn sdp-danger"
              onClick={() => setDeleteTarget(student)}
            >
              <FaTrash /> Delete
            </button>
          </div>
        </div>

        <div className="sdm-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`sdm-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="sdm-tab-panel">
          {loadingTab && !tabData ? (
            <TabSkeleton tab={activeTab} />
          ) : tabData?.error ? (
            <div className="sdm-empty">Failed to load this data.</div>
          ) : activeTab === "academics" ? (
            <AcademicsTab data={tabData} />
          ) : activeTab === "fees" ? (
            <FeesTab data={tabData} />
          ) : activeTab === "discipline" ? (
            <DisciplineTab data={tabData} />
          ) : activeTab === "attendance" ? (
            <AttendanceTab data={tabData} />
          ) : activeTab === "promotion" ? (
            <PromotionTab data={tabData} />
          ) : null}
        </div>
      </div>

      {photoLightboxOpen &&
        student.photo_url &&
        createPortal(
          <div
            className="sdm-lightbox-backdrop"
            onClick={() => setPhotoLightboxOpen(false)}
          >
            <button
              type="button"
              className="sdm-lightbox-close"
              onClick={() => setPhotoLightboxOpen(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <img
              src={student.photo_url}
              alt={student.full_name}
              className="sdm-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}

      <StudentFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        student={student}
        classes={classes}
        departments={departments}
        academicYears={academicYears}
        onSaved={() => {
          setEditModalOpen(false);
          fetchStudent();
          refreshAcademics();
        }}
      />

      <StudentMarksEditModal
        isOpen={marksModalOpen}
        onClose={() => setMarksModalOpen(false)}
        student={student}
        onSaved={refreshAcademics}
      />

      <ReportCardDownloadModal
        isOpen={reportCardModalOpen}
        onClose={() => setReportCardModalOpen(false)}
        student={student}
      />

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Remove Student"
      >
        {deleteTarget && (
          <div className="students-delete-confirm">
            <FaExclamationTriangle className="students-delete-confirm-icon" />
            <p className="students-delete-confirm-text">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.full_name}</strong>? This data may not be
              recoverable.
            </p>
            <div className="students-delete-confirm-actions">
              <button
                type="button"
                className="students-delete-confirm-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="students-delete-confirm-danger"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Removing..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </SideTop>
  );
};

// Shaped like the tab it stands in for — a stat row + table for
// academics/fees, stat row only for attendance, stacked cards for
// discipline/promotion — so the layout doesn't jump once real data
// arrives, and the page doesn't read as broken/empty while loading.
const SKEL_BAR = (props) => <div className="sdp-skel sdp-skel-bar" {...props} />;

function TabSkeleton({ tab }) {
  if (tab === "academics" || tab === "fees") {
    return (
      <div className="sdp-skeleton">
        {tab === "academics" && (
          <div className="sdm-stat-row">
            <div className="sdm-stat">
              <SKEL_BAR style={{ width: 48, height: 22, margin: "0 auto 6px" }} />
              <span className="sdm-stat-label">Annual Average</span>
            </div>
            <div className="sdm-stat">
              <SKEL_BAR style={{ width: 64, height: 22, margin: "0 auto 6px" }} />
              <span className="sdm-stat-label">Class Rank</span>
            </div>
          </div>
        )}
        <table className="sdm-table">
          <thead>
            <tr>
              {(tab === "academics" ? ["Subject", "T1", "T2", "T3", "Final"] : ["Fee Type", "Outstanding Balance"]).map(
                (h) => (
                  <th key={h}>{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: tab === "academics" ? 5 : 2 }).map((__, j) => (
                  <td key={j}>
                    <SKEL_BAR style={{ width: j === 0 ? "70%" : 28, height: 12 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "attendance") {
    return (
      <div className="sdm-stat-row">
        <div className="sdm-stat">
          <SKEL_BAR style={{ width: 40, height: 22, margin: "0 auto 6px" }} />
          <span className="sdm-stat-label">Days Present</span>
        </div>
        <div className="sdm-stat">
          <SKEL_BAR style={{ width: 40, height: 22, margin: "0 auto 6px" }} />
          <span className="sdm-stat-label">Sessions Recorded</span>
        </div>
      </div>
    );
  }

  // discipline / promotion — stacked case-card shape
  return (
    <div className="sdm-case-list">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sdm-case-card">
          <div className="sdm-case-header">
            <SKEL_BAR style={{ width: 90, height: 16 }} />
            <SKEL_BAR style={{ width: 70, height: 12 }} />
          </div>
          <SKEL_BAR style={{ width: "85%", height: 12, marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

// Full-page skeleton for the initial student fetch — shaped like the
// finished page (back link, photo/name header, action buttons, tab bar,
// academics table) instead of a plain "Loading student…" line, matching
// the same shimmer treatment already used for per-tab loading below.
function StudentDetailPageSkeleton() {
  return (
    <div className="sdp-page">
      <SKEL_BAR style={{ width: 140, height: 16, marginBottom: 16 }} />

      <div className="sdp-header">
        <div className="sdm-identity">
          <div className="sdp-skel sdp-skel-photo" />
          <div className="sdp-identity-text">
            <SKEL_BAR style={{ width: 180, height: 20 }} />
            <SKEL_BAR style={{ width: 220, height: 13, marginTop: 8 }} />
          </div>
        </div>
        <div className="sdp-actions">
          {Array.from({ length: 5 }).map((_, i) => (
            <SKEL_BAR key={i} style={{ width: 100, height: 34, borderRadius: 8 }} />
          ))}
        </div>
      </div>

      <div className="sdm-tabs">
        {Array.from({ length: 5 }).map((_, i) => (
          <SKEL_BAR key={i} style={{ width: 110, height: 30, borderRadius: 6 }} />
        ))}
      </div>

      <div className="sdm-tab-panel">
        <TabSkeleton tab="academics" />
      </div>
    </div>
  );
}

function AcademicsTab({ data }) {
  if (!data) return <div className="sdm-empty">No marks recorded yet.</div>;
  const subjects = [
    ...(data.generalSubjects || []),
    ...(data.professionalSubjects || []),
    ...(data.practicalSubjects || []),
  ];
  const orientationSubjects = data.orientationSubjects || [];
  const bestOrientationCode = orientationSubjects.reduce((bestCode, s) => {
    const val = s.scores?.finalAvg ?? s.scores?.term3Avg ?? s.scores?.term2Avg ?? s.scores?.term1Avg;
    if (val == null) return bestCode;
    const bestVal = bestCode
      ? orientationSubjects.find((o) => o.code === bestCode)?.scores?.finalAvg ??
        orientationSubjects.find((o) => o.code === bestCode)?.scores?.term3Avg ??
        orientationSubjects.find((o) => o.code === bestCode)?.scores?.term2Avg ??
        orientationSubjects.find((o) => o.code === bestCode)?.scores?.term1Avg
      : null;
    return bestVal == null || val > bestVal ? s.code : bestCode;
  }, null);
  const bestOrientationSubject = orientationSubjects.find((s) => s.code === bestOrientationCode);

  return (
    <div>
      <div className="sdm-stat-row">
        <div className="sdm-stat">
          <span className="sdm-stat-value">{data.termTotals?.annual?.average ?? "N/A"}</span>
          <span className="sdm-stat-label">Annual Average</span>
        </div>
        <div className="sdm-stat">
          <span className="sdm-stat-value">
            {data.termTotals?.annual?.rank ?? "N/A"} of {data.termTotals?.annual?.outOf ?? "N/A"}
          </span>
          <span className="sdm-stat-label">Class Rank</span>
        </div>
      </div>
      <table className="sdm-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>T1</th>
            <th>T2</th>
            <th>T3</th>
            <th>Final</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.code}>
              <td>{s.title}</td>
              <td>{s.scores?.term1Avg ?? "N/A"}</td>
              <td>{s.scores?.term2Avg ?? "N/A"}</td>
              <td>{s.scores?.term3Avg ?? "N/A"}</td>
              <td>{s.scores?.finalAvg ?? "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {orientationSubjects.length > 0 && (
        <>
          <h4 className="sdm-section-title">Orientation Placement Subjects</h4>
          <table className="sdm-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>T1</th>
                <th>T2</th>
                <th>T3</th>
                <th>Final</th>
              </tr>
            </thead>
            <tbody>
              {orientationSubjects.map((s) => (
                <tr key={s.code} className={s.code === bestOrientationCode ? "sdm-row-best" : ""}>
                  <td>{s.title}</td>
                  <td>{s.scores?.term1Avg ?? "N/A"}</td>
                  <td>{s.scores?.term2Avg ?? "N/A"}</td>
                  <td>{s.scores?.term3Avg ?? "N/A"}</td>
                  <td>{s.scores?.finalAvg ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bestOrientationSubject && (
            <p className="sdm-orientation-note">
              Currently strongest in: <b>{bestOrientationSubject.title}</b>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FeesTab({ data }) {
  if (!data?.balance) return <div className="sdm-empty">No fee record found.</div>;
  return (
    <table className="sdm-table">
      <thead>
        <tr>
          <th>Fee Type</th>
          <th>Outstanding Balance</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data.balance).map(([type, balance]) => (
          <tr key={type}>
            <td>{type}</td>
            <td className={balance > 0 ? "sdm-balance-due" : "sdm-balance-clear"}>
              {balance.toLocaleString()} FCFA
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DisciplineTab({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="sdm-empty">No discipline cases recorded.</div>;
  }
  return (
    <div className="sdm-case-list">
      {data.map((c) => (
        <div key={c.id} className="sdm-case-card">
          <div className="sdm-case-header">
            <span className={`sdm-case-status ${c.status}`}>{c.status}</span>
            <span className="sdm-case-date">
              {c.recorded_at ? new Date(c.recorded_at).toLocaleDateString() : ""}
            </span>
          </div>
          <p className="sdm-case-desc">{c.case_description}</p>
        </div>
      ))}
    </div>
  );
}

function AttendanceTab({ data }) {
  if (!data) return <div className="sdm-empty">No attendance record found.</div>;
  return (
    <div className="sdm-stat-row">
      <div className="sdm-stat">
        <span className="sdm-stat-value">{data.daysPresent ?? "N/A"}</span>
        <span className="sdm-stat-label">Days Present</span>
      </div>
      <div className="sdm-stat">
        <span className="sdm-stat-value">{data.totalSessions ?? "N/A"}</span>
        <span className="sdm-stat-label">Sessions Recorded</span>
      </div>
    </div>
  );
}

const DECISION_LABELS = {
  promoted: "Promoted",
  promoted_on_condition: "Promoted on Condition",
  failed: "Failed / Repeated",
};

function PromotionTab({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="sdm-empty">No promotion history found for this student.</div>;
  }
  return (
    <div className="sdm-case-list">
      {data.map((row) => (
        <div key={row.id} className="sdm-case-card">
          <div className="sdm-case-header">
            <span className={`sdm-case-status ${row.decision}`}>
              {DECISION_LABELS[row.decision] || row.decision}
            </span>
            <span className="sdm-case-date">
              {row.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
            </span>
          </div>
          <p className="sdm-case-desc">
            {row.from_class?.name} ({row.from_academic_year?.name}) →{" "}
            {row.to_class?.name || "Graduated"}
            {row.to_academic_year ? ` (${row.to_academic_year.name})` : ""}
            {row.overall_average != null ? `, Average: ${row.overall_average}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

export default StudentDetailPage;
