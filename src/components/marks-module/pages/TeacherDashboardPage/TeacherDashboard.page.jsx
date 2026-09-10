import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChalkboard,
  FaUserGraduate,
  FaBookOpen,
  FaChalkboardTeacher,
  FaExclamationCircle,
} from "react-icons/fa";
import api from "../../utils/api";
import SideTop from "../../../SideTop";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { Tabs } from "../../components/Tabs/Tabs.component";
import "./TeacherDashboard.styles.css";

function StatCard({ icon, label, value, tone, onClick }) {
  return (
    <div
      className={`tcd-stat-card ${tone || ""} ${onClick ? "tcd-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="tcd-stat-icon">{icon}</div>
      <div className="tcd-stat-body">
        <span className="tcd-stat-value">{value}</span>
        <span className="tcd-stat-label">{label}</span>
      </div>
    </div>
  );
}

const MARKS_STATUS_LABEL = {
  not_started: "Not started",
  partial: "Partial",
};

const OWED_PAGE_SIZE = 5;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function buildMarkUploadUrl(subjectId, params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) qs.set(key, value);
  });
  return `/academics/mark-upload/${subjectId}?${qs.toString()}`;
}

function TcdSkeleton() {
  return (
    <div className="tcd-page">
      <div className="tcd-skel tcd-skel-header" />
      <div className="tcd-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tcd-skel tcd-skel-stat" />
        ))}
      </div>
      <div className="tcd-skel tcd-skel-block" style={{ height: 220, marginTop: 24 }} />
    </div>
  );
}

export const TeacherDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllOwed, setShowAllOwed] = useState(false);
  const [activeTab, setActiveTab] = useState("classes");

  const authUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("authUser"));
    } catch {
      return null;
    }
  }, []);
  const displayName = authUser?.name || authUser?.username || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/teacher-dashboard/summary");
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || err.response?.data?.details || "Failed to load your dashboard."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SideTop>
        <TcdSkeleton />
      </SideTop>
    );
  }

  if (error) {
    return (
      <SideTop>
        <div className="tcd-page">
          <EmptyState icon={<FaExclamationCircle />} title="Couldn't load your dashboard" subtitle={error} />
        </div>
      </SideTop>
    );
  }

  const masterClassIds = new Set((data.classMasterOf || []).map((c) => c.id));
  const owedAssignments = data.marksOwed?.assignments || [];
  const visibleOwed = showAllOwed ? owedAssignments : owedAssignments.slice(0, OWED_PAGE_SIZE);
  const remainingOwed = owedAssignments.length - visibleOwed.length;

  const goToSubject = (subjectId, classInfo) =>
    navigate(
      buildMarkUploadUrl(subjectId, {
        academic_year_id: data.academicYearId,
        department_id: classInfo.departmentId,
        class_id: classInfo.id,
      })
    );

  const goToOwedAssignment = (a) =>
    navigate(
      buildMarkUploadUrl(a.subjectId, {
        academic_year_id: data.marksOwed.academicYearId,
        department_id: a.departmentId,
        class_id: a.classId,
        term_id: data.marksOwed.termId,
        sequence_id: data.marksOwed.sequenceId,
        // Land straight on the students still missing this mark instead
        // of the "All Students" default, since that's the whole reason
        // this row is in the owed list.
        mark_filter: "without-marks",
      })
    );

  return (
    <SideTop>
      <div className="tcd-page">
        <PageHeader
          title={displayName ? `${getGreeting()}, ${displayName}` : "My Dashboard"}
          subtitle={`Your classes, students, and subjects for ${data.academicYear}`}
        />

        <div className="tcd-stat-grid">
          <StatCard icon={<FaChalkboard />} label="My Classes" value={data.classes.length} />
          <StatCard icon={<FaUserGraduate />} label="Total Students" value={data.totalStudents} tone="good" />
          <StatCard
            icon={<FaBookOpen />}
            label="Total Subjects"
            value={data.totalSubjects}
            tone="warn"
            onClick={() => navigate("/academics/subjects")}
          />
          <StatCard
            icon={<FaChalkboardTeacher />}
            label="Class Master Of"
            value={(data.classMasterOf || []).length}
            tone="accent"
          />
        </div>

        {(data.classMasterOf || []).length > 0 && (
          <section className="tcd-section">
            <h3 className="tcd-section-title">Class Master Of</h3>
            <div className="tcd-master-row">
              {data.classMasterOf.map((c) => (
                <div key={c.id} className="tcd-master-card">
                  <span className="tcd-master-name">{c.name}</span>
                  <span className="tcd-master-count">{c.studentCount} students</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="tcd-section">
          <Tabs
            tabs={[
              { key: "classes", label: "My Classes", icon: <FaChalkboard /> },
              {
                key: "owed",
                label: (
                  <>
                    Marks I Still Owe
                    {owedAssignments.length > 0 && (
                      <span className="tcd-alert-badge" title={`${owedAssignments.length} outstanding`}>
                        {owedAssignments.length}
                      </span>
                    )}
                  </>
                ),
                icon: <FaBookOpen />,
              },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "classes" &&
            (data.classes.length === 0 ? (
              <EmptyState icon={<FaChalkboard />} title="You aren't assigned to any classes yet." />
            ) : (
              <table className="tcd-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Students</th>
                    <th>Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {data.classes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="tcd-class-name">{c.name}</span>
                        {masterClassIds.has(c.id) && <span className="tcd-master-badge">Class Master</span>}
                      </td>
                      <td>{c.studentCount}</td>
                      <td>
                        <div className="tcd-class-subjects">
                          {c.subjects.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="tcd-subject-pill"
                              onClick={() => goToSubject(s.id, c)}
                              title={`Enter ${s.title} marks for ${c.name}`}
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {activeTab === "owed" &&
            (!data.marksOwed || owedAssignments.length === 0 ? (
              <EmptyState icon={<FaBookOpen />} title="You're all caught up, no missing marks." />
            ) : (
              <>
                {data.marksOwed.sequenceLabel && (
                  <p className="tcd-owed-sequence">Sequence: {data.marksOwed.sequenceLabel}</p>
                )}
                <table className="tcd-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOwed.map((a, i) => (
                      <tr
                        key={i}
                        className="tcd-row-clickable"
                        onClick={() => goToOwedAssignment(a)}
                        title={`Fill ${a.subjectTitle} marks for ${a.className}`}
                      >
                        <td>{a.className}</td>
                        <td>{a.subjectTitle}</td>
                        <td>
                          <span className={`tcd-owed-pill tcd-tone-${a.status}`}>
                            {MARKS_STATUS_LABEL[a.status] || a.status}
                            {a.status === "partial" ? ` (${a.missingCount} missing)` : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {remainingOwed > 0 && (
                  <button type="button" className="tcd-see-more-btn" onClick={() => setShowAllOwed(true)}>
                    See more ({remainingOwed})
                  </button>
                )}
                {showAllOwed && owedAssignments.length > OWED_PAGE_SIZE && (
                  <button type="button" className="tcd-see-more-btn" onClick={() => setShowAllOwed(false)}>
                    Show less
                  </button>
                )}
              </>
            ))}
        </section>
      </div>
    </SideTop>
  );
};

export default TeacherDashboardPage;
