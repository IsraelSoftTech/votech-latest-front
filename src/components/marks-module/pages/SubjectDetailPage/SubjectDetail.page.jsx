import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import SideTop from "../../../SideTop";
import api from "../../utils/api";
import DataTable from "../../components/DataTable/DataTable.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { DetailGrid, DetailRow } from "../../components/DetailGrid/DetailGrid.component";
import "./SubjectDetail.page.styles.css";

const CLASS_COLUMNS = [
  { label: "Class", accessor: "className" },
  { label: "Department", accessor: "departmentName" },
  { label: "Teacher", accessor: "teacherName" },
];

// Mirrors the real info card (label/value rows) and classes table instead
// of generic gray bars, so the layout doesn't jump once the subject loads.
function SubjectDetailSkeleton() {
  return (
    <>
      <div className="sdp-info-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="sdp-skel-row" key={i}>
            <div className="sdp-skel sdp-skel-line" style={{ width: 120, height: 12 }} />
            <div className="sdp-skel sdp-skel-line" style={{ width: "40%", height: 14 }} />
          </div>
        ))}
      </div>
      <div className="sdp-classes-section">
        <div className="sdp-skel sdp-skel-line" style={{ width: 200, height: 18, marginBottom: 16 }} />
        <table className="sdp-skel-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Department</th>
              <th>Teacher</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td><div className="sdp-skel sdp-skel-line" style={{ width: "80%", height: 14 }} /></td>
                <td><div className="sdp-skel sdp-skel-line" style={{ width: "70%", height: 14 }} /></td>
                <td><div className="sdp-skel sdp-skel-line" style={{ width: "60%", height: 14 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const SubjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSubject = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/subjects/${id}`);
        if (!cancelled) setSubject(res?.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.details ||
            "Failed to load subject.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSubject();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const classRows = (subject?.classSubjects || []).map((cs, index) => ({
    id: cs.id ?? index,
    className: cs.class?.name || "Unknown class",
    departmentName: cs.department?.name || "N/A",
    teacherName: cs.teacher?.name || cs.teacher?.username || "Unassigned",
  }));

  const departmentOptions = Array.from(
    new Set(classRows.map((r) => r.departmentName).filter(Boolean))
  );

  const backButton = (
    <button className="sdp-back-btn" onClick={() => navigate(-1)}>
      <FaArrowLeft /> <span>Go Back</span>
    </button>
  );

  if (loading) {
    return (
      <SideTop>
        <div className="sdp-page">
          <PageHeader title="Subject Details" actions={backButton} />
          <SubjectDetailSkeleton />
        </div>
      </SideTop>
    );
  }

  if (error || !subject) {
    return (
      <SideTop>
        <div className="sdp-page">
          <PageHeader title="Subject Details" actions={backButton} />
          <EmptyState title={error || "Subject not found"} />
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="sdp-page">
        <PageHeader
          title={subject.name}
          subtitle={`${subject.code} · Coefficient ${subject.coefficient} · ${subject.category}`}
          actions={backButton}
        />

        <div className="sdp-info-card">
          <DetailGrid>
            <DetailRow label="Code" value={subject.code} />
            <DetailRow label="Coefficient" value={subject.coefficient} />
            <DetailRow
              label="Category"
              value={<span className="text-capitalize">{subject.category}</span>}
            />
            <DetailRow
              label="Orientation Placement"
              value={subject.orientationDepartment?.name || "None"}
            />
          </DetailGrid>
        </div>

        <div className="sdp-classes-section">
          <h3 className="sdp-section-title">
            Classes Taking This Subject ({classRows.length})
          </h3>
          {classRows.length === 0 ? (
            <EmptyState title="Not assigned to any class yet" />
          ) : (
            <DataTable
              columns={CLASS_COLUMNS}
              data={classRows}
              limit={15}
              filterCategories={departmentOptions}
              onEdit={() => {}}
              onDelete={() => {}}
              editRoles={[]}
              deleteRoles={[]}
            />
          )}
        </div>
      </div>
    </SideTop>
  );
};

export default SubjectDetailPage;
