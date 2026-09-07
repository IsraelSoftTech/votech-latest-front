import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaFileAlt,
  FaUserPlus,
  FaChalkboard,
  FaChalkboardTeacher,
  FaClipboardList,
} from "react-icons/fa";
import SideTop from "../../../SideTop";
import api, { subBaseURL, headers } from "../../utils/api";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import { Button } from "../../components/Button/Button.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { DetailGrid, DetailRow } from "../../components/DetailGrid/DetailGrid.component";
import { Tabs } from "../../components/Tabs/Tabs.component";
import Modal from "../../components/Modal/Modal.component";
import { SubjectFormModal } from "../../components/SubjectFormModal/SubjectFormModal.component";
import AssignCourseModal from "../../components/AssignCourseModal/AssignCourseModal.component";
import {
  subjectToForm,
  subjectFormToPayload,
  validateSubjectForm,
} from "../../utils/subjectForm.util";
// Just for the .datatable-delete-content/.datatable-modal-buttons/
// .delete-resource-text classes, reusing DataTable's own delete-confirm
// look instead of re-styling a second version of the same dialog (same
// reuse ClassDetailPage already does for its own Delete confirmation).
import "../../components/DataTable/DataTable.styles.css";
import "./SubjectDetail.page.styles.css";

const TABS = [
  { key: "classes", label: "Classes", icon: <FaChalkboard /> },
  { key: "teachers", label: "Teachers", icon: <FaChalkboardTeacher /> },
  { key: "departments", label: "Departments", icon: <FaClipboardList /> },
];

// Roles allowed to actually land on the pages these tabs' rows link to
// (ClassDetailPage, TeacherDetailPage and Specialty/admin-specialty are
// each restricted to exactly these roles server- and page-side). Subject
// Detail itself is open much more broadly (Teacher, Admin2, Discipline,
// ...), so whoever's viewing it may not be allowed to follow any of them,
// same reasoning as the Classes-tab table used to apply per-cell.
const CAN_VIEW_CLASS = ["Admin3"];
const CAN_VIEW_DEPARTMENT = ["Admin1", "Admin3", "Admin4", "Discipline"];
const CAN_VIEW_TEACHER = ["Admin3"];

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

// One row per distinct class/teacher/department, deduped straight off the
// raw classSubjects rows (a subject can have more than one ClassSubject
// row for the same class across academic years, same reasoning
// ClassDetailPage's own tabs dedupe by id rather than showing history as
// visually-duplicate rows).
function buildSubjectTabData(classSubjects) {
  const classesData = [];
  const classSeen = new Set();
  const teachersById = new Map();
  const departmentsById = new Map();

  for (const cs of classSubjects) {
    if (cs.class?.id && !classSeen.has(cs.class.id)) {
      classSeen.add(cs.class.id);
      classesData.push({
        id: cs.class.id,
        name: cs.class.name || "Unknown class",
        departmentName: cs.department?.name || "N/A",
        teacherName: cs.teacher?.name || cs.teacher?.username || "Unassigned",
      });
    }

    if (cs.teacher?.id) {
      const entry = teachersById.get(cs.teacher.id) || {
        id: cs.teacher.id,
        name: cs.teacher.name || cs.teacher.username || "Unknown teacher",
        classes: new Set(),
      };
      if (cs.class?.name) entry.classes.add(cs.class.name);
      teachersById.set(cs.teacher.id, entry);
    }

    if (cs.department?.id) {
      const entry = departmentsById.get(cs.department.id) || {
        id: cs.department.id,
        name: cs.department.name || "Unknown department",
        classes: new Set(),
      };
      if (cs.class?.name) entry.classes.add(cs.class.name);
      departmentsById.set(cs.department.id, entry);
    }
  }

  return {
    classesData,
    teachersData: Array.from(teachersById.values()).map((t) => ({
      ...t,
      classes: Array.from(t.classes),
    })),
    departmentsData: Array.from(departmentsById.values()).map((d) => ({
      ...d,
      classes: Array.from(d.classes),
    })),
  };
}

function ClassesTab({ classesData, canViewClass, navigate }) {
  if (classesData.length === 0) {
    return <EmptyState title="Not assigned to any class yet" />;
  }
  return (
    <table className="sdp-tab-table">
      <thead>
        <tr>
          <th>Class</th>
          <th>Department</th>
          <th>Teacher</th>
        </tr>
      </thead>
      <tbody>
        {classesData.map((c) => (
          <tr
            key={c.id}
            className={canViewClass ? "sdp-tab-row-clickable" : ""}
            onClick={() => canViewClass && navigate(`/academics/classes/${c.id}`)}
          >
            <td>{c.name}</td>
            <td>{c.departmentName}</td>
            <td>{c.teacherName}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TeachersTab({ teachersData, canViewTeacher, navigate }) {
  if (teachersData.length === 0) {
    return <EmptyState title="No teacher assigned to this subject yet" />;
  }
  return (
    <table className="sdp-tab-table">
      <thead>
        <tr>
          <th>Teacher</th>
          <th>Classes Taught (this subject)</th>
        </tr>
      </thead>
      <tbody>
        {teachersData.map((t) => (
          <tr
            key={t.id}
            className={canViewTeacher ? "sdp-tab-row-clickable" : ""}
            onClick={() => canViewTeacher && navigate(`/academics/teachers/${t.id}`)}
          >
            <td>{t.name}</td>
            <td>{t.classes.join(", ") || "None"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DepartmentsTab({ departmentsData, canViewDepartment, navigate }) {
  if (departmentsData.length === 0) {
    return <EmptyState title="Not offered by any department yet" />;
  }
  return (
    <table className="sdp-tab-table">
      <thead>
        <tr>
          <th>Department</th>
          <th>Classes (this subject)</th>
        </tr>
      </thead>
      <tbody>
        {departmentsData.map((d) => (
          <tr
            key={d.id}
            className={canViewDepartment ? "sdp-tab-row-clickable" : ""}
            onClick={() => canViewDepartment && navigate("/admin-specialty")}
          >
            <td>{d.name}</td>
            <td>{d.classes.join(", ") || "None"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const SubjectDetailPage = () => {
  const user = useRestrictTo(
    "Admin1",
    "Admin2",
    "Admin3",
    "Admin4",
    "Teacher",
    "Discipline",
    "Psychosocialist"
  );
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "classes";
  const setActiveTab = (key) => setSearchParams({ tab: key });

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const fetchSubject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/subjects/${id}`);
      setSubject(res?.data?.data || null);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.details ||
        "Failed to load subject.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  // Only needed for Admin3's Edit/Assign modals, skipped for every other
  // role so viewing a subject doesn't fetch data a Teacher has no use for.
  useEffect(() => {
    if (user?.role !== "Admin3") return;
    fetch(`${subBaseURL}/specialties`, { headers: headers() })
      .then((res) => res.json())
      .then((list) => setDepartments(list.map((d) => ({ value: d.id, label: d.name }))))
      .catch(() => toast.error("Failed to load departments."));

    api
      .get("/classes")
      .then((res) => {
        const list = res.data?.data || [];
        setClasses(list.map((c) => ({ ...c, value: c.id, label: c.name })));
      })
      .catch(() => toast.error("Failed to load classes."));

    api
      .get("/teachers")
      .then((res) => {
        const list = res.data?.data || [];
        setTeachers(
          list.map((t, i) => ({ value: t.id, label: t.name || t.username || `Teacher ${i}` }))
        );
      })
      .catch(() => toast.error("Failed to load teachers."));
  }, [user?.role]);

  const departmentNameOptions = departments.map((d) => d.label);

  const openEdit = () => {
    if (!subject) return;
    setForm(subjectToForm(subject));
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateSubjectForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    try {
      setEditLoading(true);
      await api.patch(`/subjects/${form.id}`, subjectFormToPayload(form, departments));
      toast.success("Subject updated successfully.");
      setEditModalOpen(false);
      fetchSubject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update subject.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await api.delete(`/subjects/${id}`);
      toast.success("Subject deleted successfully.");
      navigate("/academics/subjects");
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Warning: deleting this subject may not be possible because students, marks, and other data are linked to it."
      );
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Standalone, first thing on the page, above the title — same spot on
  // every marks-module detail page, not mixed into PageHeader's actions.
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
        <div className="sdp-page">
          {backButton}
          <PageHeader title="Subject Details" />
          <SubjectDetailSkeleton />
        </div>
      </SideTop>
    );
  }

  if (error || !subject) {
    return (
      <SideTop>
        <div className="sdp-page">
          {backButton}
          <PageHeader title="Subject Details" />
          <EmptyState title={error || "Subject not found"} />
        </div>
      </SideTop>
    );
  }

  const canViewClass = CAN_VIEW_CLASS.includes(user?.role);
  const canViewDepartment = CAN_VIEW_DEPARTMENT.includes(user?.role);
  const canViewTeacher = CAN_VIEW_TEACHER.includes(user?.role);
  const isAdmin3 = user?.role === "Admin3";

  const { classesData, teachersData, departmentsData } = buildSubjectTabData(
    subject.classSubjects || []
  );

  return (
    <SideTop>
      <div className="sdp-page">
        {backButton}
        <PageHeader
          title={subject.name}
          subtitle={`${subject.code} · Coefficient ${subject.coefficient} · ${subject.category}`}
          actions={
            <div className="sdp-header-actions">
              {isAdmin3 && (
                <>
                  <Button variant="secondary" onClick={openEdit}>
                    <FaEdit /> Edit
                  </Button>
                  <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
                    <FaTrash /> Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAssignModalOpen(true)}
                  >
                    <FaUserPlus /> Assign To
                  </Button>
                </>
              )}
              <Button
                variant="primary"
                onClick={() => navigate(`/academics/mark-upload/${id}`)}
              >
                <FaFileAlt /> Enter Marks
              </Button>
            </div>
          }
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
          <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
          <div className="sdp-tab-panel">
            {activeTab === "classes" && (
              <ClassesTab classesData={classesData} canViewClass={canViewClass} navigate={navigate} />
            )}
            {activeTab === "teachers" && (
              <TeachersTab teachersData={teachersData} canViewTeacher={canViewTeacher} navigate={navigate} />
            )}
            {activeTab === "departments" && (
              <DepartmentsTab
                departmentsData={departmentsData}
                canViewDepartment={canViewDepartment}
                navigate={navigate}
              />
            )}
          </div>
        </div>
      </div>

      {isAdmin3 && form && (
        <SubjectFormModal
          mode="edit"
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          form={form}
          formErrors={formErrors}
          onChange={handleUpdateForm}
          onSubmit={handleEditSubmit}
          departmentNameOptions={departmentNameOptions}
          loading={editLoading}
        />
      )}

      {isAdmin3 && (
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title="Confirm Delete"
        >
          <div className="datatable-delete-content">
            <p className="delete-resource-text">
              Are you sure you want to delete <strong>{subject.name}</strong>? Students, marks, and
              other data may be linked to it. This cannot be undone.
            </p>
            <div className="datatable-modal-buttons">
              <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {isAdmin3 && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Assign ${subject.name}`}
        >
          <AssignCourseModal
            departmentsOptions={departments}
            classesOptions={classes}
            teachersOptions={teachers}
            subject={subject}
            onUpdate={fetchSubject}
          />
        </Modal>
      )}
    </SideTop>
  );
};

export default SubjectDetailPage;
