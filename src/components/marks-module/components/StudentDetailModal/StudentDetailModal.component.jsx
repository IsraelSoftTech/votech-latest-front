import React, { useState, useEffect, useCallback } from "react";
import {
  FaChartBar,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCalendarCheck,
  FaGraduationCap,
  FaDownload,
  FaUser,
} from "react-icons/fa";
import Modal from "../Modal/Modal.component";
import api, { headers, subBaseURL } from "../../utils/api";
import "./StudentDetailModal.styles.css";

const TABS = [
  { key: "academics", label: "Academics", icon: <FaChartBar /> },
  { key: "fees", label: "Fees", icon: <FaMoneyBillWave /> },
  { key: "discipline", label: "Discipline", icon: <FaExclamationTriangle /> },
  { key: "attendance", label: "Attendance", icon: <FaCalendarCheck /> },
  { key: "promotion", label: "Promotion History", icon: <FaGraduationCap /> },
];

function getBackendUrl(path, params) {
  const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token) params.set("token", token);
  return `${base}/${path}?${params.toString()}`;
}

// Every tab here is genuinely popup-sized for one student in one year —
// none of this needed its own page. Each tab lazy-loads only when first
// opened, and caches per (student, tab) for the modal's lifetime so
// switching tabs back and forth doesn't re-fetch.
export const StudentDetailModal = ({ isOpen, onClose, student, academicYearId }) => {
  const [activeTab, setActiveTab] = useState("academics");
  const [cache, setCache] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("academics");
      setCache({});
    }
  }, [isOpen, student?.id]);

  const loadTab = useCallback(
    async (tab) => {
      if (!student?.id || cache[tab]) return;
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
        setCache((prev) => ({ ...prev, [tab]: { error: true } }));
      } finally {
        setLoadingTab(false);
      }
    },
    [student, academicYearId, cache]
  );

  useEffect(() => {
    if (isOpen) loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, student?.id]);

  if (!student) return null;

  const downloadUrl = getBackendUrl(
    "report-cards/single-pdf-direct",
    new URLSearchParams({
      studentId: student.id,
      academicYearId,
      departmentId: student.specialty_id || "",
      classId: student.class_id,
      disposition: "attachment",
    })
  );

  const tabData = cache[activeTab];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={student.full_name} size="large">
      <div className="sdm-container">
        <div className="sdm-subheader">
          <div className="sdm-identity">
            <div className="sdm-photo">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.full_name} />
              ) : (
                <FaUser className="sdm-photo-placeholder" />
              )}
            </div>
            <span className="sdm-id">{student.student_id}</span>
          </div>
          <a className="sdm-download-btn" href={downloadUrl}>
            <FaDownload /> Report Card PDF
          </a>
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
            <div className="sdm-loading">Loading…</div>
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
    </Modal>
  );
};

function AcademicsTab({ data }) {
  if (!data) return <div className="sdm-empty">No marks recorded yet.</div>;
  const subjects = [
    ...(data.generalSubjects || []),
    ...(data.professionalSubjects || []),
    ...(data.practicalSubjects || []),
  ];
  return (
    <div>
      <div className="sdm-stat-row">
        <div className="sdm-stat">
          <span className="sdm-stat-value">{data.termTotals?.annual?.average ?? "—"}</span>
          <span className="sdm-stat-label">Annual Average</span>
        </div>
        <div className="sdm-stat">
          <span className="sdm-stat-value">
            {data.termTotals?.annual?.rank ?? "—"} of {data.termTotals?.annual?.outOf ?? "—"}
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
              <td>{s.scores?.term1Avg ?? "—"}</td>
              <td>{s.scores?.term2Avg ?? "—"}</td>
              <td>{s.scores?.term3Avg ?? "—"}</td>
              <td>{s.scores?.finalAvg ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <span className="sdm-stat-value">{data.daysPresent ?? "—"}</span>
        <span className="sdm-stat-label">Days Present</span>
      </div>
      <div className="sdm-stat">
        <span className="sdm-stat-value">{data.totalSessions ?? "—"}</span>
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
            {row.overall_average != null ? ` — Average: ${row.overall_average}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

export default StudentDetailModal;
