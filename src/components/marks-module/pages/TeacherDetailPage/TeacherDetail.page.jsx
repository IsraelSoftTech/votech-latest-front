import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaBook, FaLayerGroup } from "react-icons/fa";
import SideTop from "../../../SideTop";
import api from "../../utils/api";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { DetailGrid, DetailRow } from "../../components/DetailGrid/DetailGrid.component";
import { Tabs } from "../../components/Tabs/Tabs.component";
import { Button } from "../../components/Button/Button.component";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import "./TeacherDetail.page.styles.css";

const TABS = [
  { key: "subjects", label: "Subjects", icon: <FaBook /> },
  { key: "classes", label: "Classes", icon: <FaLayerGroup /> },
];

function TeacherDetailSkeleton() {
  return (
    <>
      <div className="tdp-info-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="tdp-skel-row" key={i}>
            <div className="tdp-skel tdp-skel-line" style={{ width: 120, height: 12 }} />
            <div className="tdp-skel tdp-skel-line" style={{ width: "40%", height: 14 }} />
          </div>
        ))}
      </div>
      <div className="tdp-classes-section">
        <div className="tdp-skel tdp-skel-line" style={{ width: 220, height: 18, marginBottom: 16 }} />
        <table className="tdp-skel-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td><div className="tdp-skel tdp-skel-line" style={{ width: "80%", height: 14 }} /></td>
                <td><div className="tdp-skel tdp-skel-line" style={{ width: "70%", height: 14 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const TeacherDetailPage = () => {
  // Companion page to ClassDetailPage (same Admin3-only scope) — another
  // teacher's own assignment record isn't something a teacher should be
  // able to browse, whether they land here from a nav link or a
  // click-through on the Subject Detail page.
  useRestrictTo("Admin3");
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "subjects";
  const setActiveTab = (key) => setSearchParams({ tab: key });

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTeacher = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/teachers/${id}`);
        if (!cancelled) setTeacher(res?.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.details ||
            "Failed to load teacher.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTeacher();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const assignments = teacher?.teachingAssignments || [];

  // Two different pivots of the same rows instead of one flat table: a
  // teacher who takes Maths in both Orientation A and B used to show as
  // two near-identical rows, once per class-subject pair. Grouping by
  // subject (then by class) collapses that into one row per subject with
  // its classes listed, and vice versa.
  const bySubject = new Map();
  const byClass = new Map();
  for (const ta of assignments) {
    if (ta.subject?.id) {
      const entry = bySubject.get(ta.subject.id) || {
        id: ta.subject.id,
        name: ta.subject.name,
        related: [],
      };
      if (ta.class?.name && !entry.related.some((c) => c.id === ta.class.id)) {
        entry.related.push({ id: ta.class.id, name: ta.class.name });
      }
      bySubject.set(ta.subject.id, entry);
    }
    if (ta.class?.id) {
      const entry = byClass.get(ta.class.id) || {
        id: ta.class.id,
        name: ta.class.name,
        related: [],
      };
      if (ta.subject?.name && !entry.related.some((s) => s.id === ta.subject.id)) {
        entry.related.push({ id: ta.subject.id, name: ta.subject.name });
      }
      byClass.set(ta.class.id, entry);
    }
  }
  const subjectRows = Array.from(bySubject.values());
  const classRows = Array.from(byClass.values());

  const backButton = (
    <div className="vt-back-row">
      <Button variant="ghost" icon={<FaArrowLeft />} onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </div>
  );

  if (loading) {
    return (
      <SideTop>
        <div className="tdp-page">
          {backButton}
          <PageHeader title="Teacher Details" />
          <TeacherDetailSkeleton />
        </div>
      </SideTop>
    );
  }

  if (error || !teacher) {
    return (
      <SideTop>
        <div className="tdp-page">
          {backButton}
          <PageHeader title="Teacher Details" />
          <EmptyState title={error || "Teacher not found"} />
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="tdp-page">
        {backButton}
        <PageHeader
          title={teacher.name || teacher.username}
          subtitle={teacher.role}
        />

        <div className="tdp-info-card">
          <DetailGrid>
            <DetailRow label="Username" value={teacher.username} />
            <DetailRow label="Contact" value={teacher.contact || "N/A"} />
            <DetailRow label="Email" value={teacher.email || "N/A"} />
            <DetailRow label="Gender" value={teacher.gender || "N/A"} />
          </DetailGrid>
        </div>

        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

        <div className="tdp-classes-section">
          {activeTab === "subjects" && (
            subjectRows.length === 0 ? (
              <EmptyState title="Not assigned to any subject yet" />
            ) : (
              <div className="tdp-table-scroll">
              <table className="tdp-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((r) => (
                    <tr
                      key={r.id}
                      className="tdp-row"
                      onClick={() => navigate(`/academics/subjects/${r.id}`)}
                    >
                      <td>{r.name}</td>
                      <td>{r.related.map((c) => c.name).join(", ") || "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )
          )}

          {activeTab === "classes" && (
            classRows.length === 0 ? (
              <EmptyState title="Not assigned to any class yet" />
            ) : (
              <div className="tdp-table-scroll">
              <table className="tdp-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {classRows.map((r) => (
                    <tr
                      key={r.id}
                      className="tdp-row"
                      onClick={() => navigate(`/academics/classes/${r.id}`)}
                    >
                      <td>{r.name}</td>
                      <td>{r.related.map((s) => s.name).join(", ") || "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )
          )}
        </div>
      </div>
    </SideTop>
  );
};

export default TeacherDetailPage;
