import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Select from "react-select";
import {
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaLayerGroup,
  FaUserGraduate,
  FaHistory,
  FaMale,
  FaFemale,
  FaChalkboardTeacher,
  FaBook,
  FaPlus,
  FaExclamationTriangle,
  FaFileDownload,
  FaSpinner,
  FaUserCheck,
  FaGraduationCap,
  FaSignOutAlt,
  FaUndo,
} from "react-icons/fa";
import SideTop from "../../../SideTop";
import api, { headers, subBaseURL } from "../../utils/api";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import { Tabs } from "../../components/Tabs/Tabs.component";
import Stats from "../../components/Stats/Stats.component";
import { ClassFormModal } from "../../components/ClassFormModal/ClassFormModal.component";
import { StudentFormModal } from "../../components/StudentFormModal/StudentFormModal.component";
import { RegisterStudentFlow } from "../../components/RegisterStudentFlow/RegisterStudentFlow.component";
import { ExitStudentModal } from "../../components/ExitStudentModal/ExitStudentModal.component";
import Modal from "../../components/Modal/Modal.component";
import { Button } from "../../components/Button/Button.component";
// import { ServerListControls } from "../../components/ServerListControls/ServerListControls.component";
import DataTable from "../../components/DataTable/DataTable.component";
import { ActionMenu } from "../../components/ActionMenu/ActionMenu.component";
// Just for the .datatable-delete-content/.datatable-modal-buttons/
// .delete-resource-text classes, reusing DataTable's own delete-confirm
// look instead of re-styling a second version of the same dialog.
import "../../components/DataTable/DataTable.styles.css";
// For .students-register-btn/.students-icon-btn/.students-status-pill/
// .students-repeating-pill/.students-delete-confirm* — the Students tab
// here is a filtered port of StudentsPage's own table/actions, reusing
// its look rather than re-styling a second version of it.
import "../StudentsPage/Students.styles.css";
import ClassMasterHistoryModal from "../../components/ClassMasterHistoryModal/ClassMasterHistoryModal.component";
import {
  EMPTY_CLASS_FORM,
  classToForm,
  confirmOrientationNameMismatch,
  transformClassForm,
  validateClassForm,
} from "../../utils/classForm.util";
import "../ClassPage/Class.styles.css";
import "./ClassDetail.styles.css";

const TABS = [
  { key: "overview", label: "Overview", icon: <FaLayerGroup /> },
  { key: "students", label: "Students", icon: <FaUserGraduate /> },
  { key: "subjects", label: "Subjects", icon: <FaBook /> },
  { key: "teachers", label: "Teachers", icon: <FaChalkboardTeacher /> },
  { key: "class-master", label: "Class Master", icon: <FaHistory /> },
];

// Full port of StudentsPage's own table + register/edit/delete flow,
// server-filtered to this one class instead of every student — the Class
// column is dropped since every row here is already that class by
// definition, showing it would just repeat the page title. Registering
// from here locks the Class/Department fields to this class (see
// StudentFormModal's lockedClassId/lockedDepartmentId) since an admin
// working from a specific class's own page is registering INTO that
// class, not picking one from scratch.
function StudentsTab({ classItem }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [repeatingFilter, setRepeatingFilter] = useState("");
  const [sortBy, setSortBy] = useState("full_name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [downloadingClassList, setDownloadingClassList] = useState(false);

  const [classesOptions, setClassesOptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        class_id: String(classItem.id),
        sortBy,
        sortDir,
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (repeatingFilter) params.set("is_repeating", repeatingFilter);
      const res = await api.get(`/students?${params.toString()}`);
      setStudents(res.data?.data?.students || []);
      setPagination(res.data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [classItem.id, page, search, statusFilter, repeatingFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, repeatingFilter, sortBy, sortDir]);

  // Dropdown data for the register/edit modal — fetched once per tab
  // mount, same source lists StudentsPage itself uses.
  useEffect(() => {
    api
      .get("/classes")
      .then((res) => setClassesOptions(res.data?.data || []))
      .catch(() => toast.error("Failed to load classes."));
    fetch(`${subBaseURL}/specialties`, { headers: headers() })
      .then((res) => res.json())
      .then((list) => setDepartments(Array.isArray(list) ? list : []))
      .catch(() => toast.error("Failed to load departments."));
    api
      .get("/academic-years")
      .then((res) => setAcademicYears(res.data?.data || []))
      .catch(() => toast.error("Failed to load academic years."));
  }, []);

  // Registration always starts with the returning-student search; from a
  // class page the destination is pre-selected to this class.
  const [registerOpen, setRegisterOpen] = useState(false);
  const [exitModal, setExitModal] = useState(null);
  // Students of THIS class still sitting in an older year after a switch
  // (the tab itself lists the active year's roster).
  const [pendingHere, setPendingHere] = useState({ count: 0, students: [], year_name: null });

  const fetchPendingHere = useCallback(async () => {
    try {
      const res = await api.get(`/students/pending-placement?class_id=${classItem.id}&limit=200`);
      const d = res.data?.data || {};
      const mine = (d.classes || []).filter((c) => Number(c.class_id) === Number(classItem.id));
      setPendingHere({
        count: mine.reduce((n, c) => n + c.students, 0),
        students: d.students || [],
        year_name: mine[0]?.academic_year_name || null,
      });
    } catch {
      setPendingHere({ count: 0, students: [], year_name: null });
    }
  }, [classItem.id]);
  useEffect(() => {
    fetchPendingHere();
  }, [fetchPendingHere, students]);

  const handleRegister = () => setRegisterOpen(true);

  const reactivate = async (student) => {
    try {
      const res = await api.post(`/students/${student.id}/exit/revert`, {});
      toast.success(res?.data?.data?.message || "Student is active again.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reactivate the student.");
    }
  };

  const rowActions = [
    {
      icon: <FaGraduationCap />,
      title: "Mark as graduated",
      isVisible: (row) => row.status === "active",
      onClick: (row) => setExitModal({ mode: "single", students: [row], initialStatus: "graduated" }),
    },
    {
      icon: <FaSignOutAlt />,
      title: "Mark as left",
      isVisible: (row) => row.status === "active",
      onClick: (row) => setExitModal({ mode: "single", students: [row], initialStatus: "withdrawn" }),
    },
    {
      icon: <FaUndo />,
      title: "Reactivate",
      isVisible: (row) => row.status === "graduated" || row.status === "withdrawn",
      onClick: reactivate,
    },
  ];

  const handleEdit = (student, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setEditingStudent(student);
    setFormModalOpen(true);
  };

  const handleDelete = (student, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setDeleteTarget(student);
  };

  // Same PDF the Students page offers once a class filter is set; here the
  // class is a given, so it is always available.
  const handleDownloadClassList = async () => {
    if (downloadingClassList) return;
    setDownloadingClassList(true);
    try {
      const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
      const res = await fetch(`${base}/students/class/${classItem.id}/list-pdf?disposition=attachment`, {
        headers: headers(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to generate class list.");
      }
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Class_List_${String(classItem.name || "class").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err.message || "Failed to download class list.");
    } finally {
      setDownloadingClassList(false);
    }
  };

  // Same shape as the Students page's table, minus the Class column (every
  // row here is this class by definition). Accessors match the API's sort
  // keys; `role` tags pick the phone card's value strip.
  const studentColumns = [
    { label: "Name", accessor: "full_name", role: "title" },
    { label: "Student ID", accessor: "student_id", role: "subtitle" },
    { label: "Sex", accessor: "sex_label", sortable: false, role: "kpi" },
    {
      label: "Status",
      accessor: "status",
      role: "kpi",
      render: (s) => (
        <span className="students-status-cell">
          <span className={`students-status-pill ${s.status}`}>{s.status}</span>
          {s.is_repeating && <span className="students-repeating-pill">Repeating</span>}
        </span>
      ),
    },
    {
      label: "Registered",
      accessor: "registration_date",
      render: (s) => (s.registration_date ? new Date(s.registration_date).toLocaleDateString("en-GB") : "-"),
    },
  ];
  const studentRows = students.map((s) => ({
    ...s,
    sex_label: s.sex === "M" ? "Male" : s.sex === "F" ? "Female" : "N/A",
  }));

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      toast.success("Student removed.");
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove student.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="class-detail-students-tab">
      {/* Register button row, ServerListControls and the hand-rolled table
          were replaced by DataTable (server mode) on 2026-09-13; kept for reference.
      <div className="class-detail-students-toolbar">
        <button className="students-register-btn" onClick={handleRegister}>
          <FaPlus /> Register Student
        </button>
      </div>

      <ServerListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search students in this class..."
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        loading={loading}
      />

      <table className="class-detail-students-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Student ID</th>
            <th>Sex</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="class-detail-students-empty">Loading...</td>
            </tr>
          ) : students.length === 0 ? (
            <tr>
              <td colSpan={5} className="class-detail-students-empty">No students in this class.</td>
            </tr>
          ) : (
            students.map((s) => (
              <tr
                key={s.id}
                className="class-detail-students-row"
                onClick={() => navigate(`/admin-student/${s.id}`)}
              >
                <td>{s.full_name}</td>
                <td>{s.student_id}</td>
                <td>{s.sex === "M" ? "Male" : s.sex === "F" ? "Female" : "N/A"}</td>
                <td>
                  <span className={`students-status-pill ${s.status}`}>{s.status}</span>
                  {s.is_repeating && <span className="students-repeating-pill">Repeating</span>}
                </td>
                <td className="students-actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="students-icon-btn"
                    onClick={(e) => handleEdit(s, e)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    className="students-icon-btn danger"
                    onClick={(e) => handleDelete(s, e)}
                    title="Remove"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      */}

      {pendingHere.count > 0 && (
        <div className="class-detail-pending-banner">
          <div className="class-detail-pending-text">
            <FaUserCheck />
            <span>
              <strong>{pendingHere.count}</strong> student{pendingHere.count === 1 ? "" : "s"} from this class
              {pendingHere.year_name ? ` (${pendingHere.year_name})` : ""} {pendingHere.count === 1 ? "is" : "are"} not
              yet placed for this year. Place each one when they register, or mark those who did not return.
            </span>
          </div>
          <div className="class-detail-pending-actions">
            <Button size="sm" icon={<FaUserCheck />} onClick={handleRegister}>
              Place a student
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<FaSignOutAlt />}
              onClick={() => setExitModal({ mode: "bulk", students: pendingHere.students, initialStatus: "withdrawn" })}
            >
              Mark remaining as left ({pendingHere.count})
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={studentColumns}
        data={studentRows}
        loading={loading}
        searchPlaceholder="Search students in this class..."
        onRowClick={(s) => navigate(`/admin-student/${s.id}`)}
        onEdit={(s) => handleEdit(s)}
        onDelete={(s) => handleDelete(s)}
        skipDeleteConfirm
        extraActions={rowActions}
        selectable
        bulkActions={(rows) => {
          const active = rows.filter((r) => r.status === "active");
          return (
            <>
              <Button size="sm" variant="secondary" icon={<FaGraduationCap />} disabled={active.length === 0} onClick={() => setExitModal({ mode: "bulk", students: active, initialStatus: "graduated" })}>
                Mark as graduated
              </Button>
              <Button size="sm" variant="secondary" icon={<FaSignOutAlt />} disabled={active.length === 0} onClick={() => setExitModal({ mode: "bulk", students: active, initialStatus: "withdrawn" })}>
                Mark as left
              </Button>
            </>
          );
        }}
        server={{
          search,
          onSearchChange: setSearch,
          filters: [
            {
              key: "status",
              label: "Status",
              options: [
                { value: "active", label: "Active" },
                { value: "graduated", label: "Graduated" },
                { value: "withdrawn", label: "Withdrawn" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
            {
              key: "repeating",
              label: "Repeating",
              options: [
                { value: "true", label: "Repeating" },
                { value: "false", label: "Not Repeating" },
              ],
              value: repeatingFilter,
              onChange: setRepeatingFilter,
            },
          ],
          sort: { accessor: sortBy, direction: sortDir },
          onSortChange: (accessor, direction) => {
            setSortBy(accessor || "full_name");
            setSortDir(direction || "asc");
          },
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
          onPageChange: setPage,
        }}
        toolbarActions={
          <>
            <Button variant="secondary" icon={downloadingClassList ? <FaSpinner className="students-spin" /> : <FaFileDownload />} onClick={handleDownloadClassList} disabled={downloadingClassList}>
              {downloadingClassList ? "Generating…" : "Class List"}
            </Button>
            <Button icon={<FaPlus />} onClick={handleRegister}>
              Register Student
            </Button>
          </>
        }
      />

      {/* Edit only: new registrations go through RegisterStudentFlow below. */}
      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        student={editingStudent}
        classes={classesOptions}
        departments={departments}
        academicYears={academicYears}
        lockedClassId={classItem.id}
        lockedDepartmentId={classItem.department_id}
        onSaved={fetchStudents}
      />

      <RegisterStudentFlow
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onDone={fetchStudents}
        classes={classesOptions}
        departments={departments}
        academicYears={academicYears}
        lockedClassId={classItem.id}
        lockedDepartmentId={classItem.department_id}
        onOpenProfile={(s) => {
          setRegisterOpen(false);
          navigate(`/admin-student/${s.id}`);
        }}
      />

      <ExitStudentModal
        isOpen={!!exitModal}
        onClose={() => setExitModal(null)}
        onDone={() => fetchStudents()}
        mode={exitModal?.mode || "single"}
        students={exitModal?.students || []}
        initialStatus={exitModal?.initialStatus || "withdrawn"}
      />

      {/* Same styled confirm dialog as StudentsPage — never a native
          window.confirm() for a destructive delete. */}
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
    </div>
  );
}

const SUBJECT_TYPE_LABELS = {
  general: "General",
  professional: "Professional",
  practical: "Practical",
};

const SUBJECT_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "general", label: "General" },
  { value: "professional", label: "Professional" },
  { value: "practical", label: "Practical" },
];

function SubjectsTab({ classSubjects }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("subjectName");
  const [sortDir, setSortDir] = useState("asc");

  const rows = classSubjects.map((cs) => ({
    id: cs.id,
    subjectId: cs.subject?.id,
    subjectName: cs.subject?.name || "Unknown subject",
    type: cs.subject?.category || "",
    teacherName: cs.teacher?.name || cs.teacher?.username || "Unassigned",
  }));

  const filtered = rows.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.subjectName.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortBy] || "").toLowerCase();
    const bv = String(b[sortBy] || "").toLowerCase();
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key) => (sortBy === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  return (
    <div className="class-detail-students-tab">
      <div className="class-detail-subjects-toolbar">
        <input
          type="text"
          className="class-detail-search-input"
          placeholder="Search subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={SUBJECT_TYPE_OPTIONS}
          value={SUBJECT_TYPE_OPTIONS.find((o) => o.value === typeFilter)}
          onChange={(opt) => setTypeFilter(opt?.value || "")}
          className="class-react-select class-detail-type-filter"
          classNamePrefix="class-select"
        />
      </div>

      {rows.length === 0 ? (
        <p className="class-detail-empty-text">No subjects assigned to this class yet.</p>
      ) : (
        <div className="class-detail-table-scroll">
        <table className="class-detail-students-table">
          <thead>
            <tr>
              <th className="class-detail-sortable" onClick={() => toggleSort("subjectName")}>
                Subject{sortIndicator("subjectName")}
              </th>
              <th className="class-detail-sortable" onClick={() => toggleSort("type")}>
                Type{sortIndicator("type")}
              </th>
              <th className="class-detail-sortable" onClick={() => toggleSort("teacherName")}>
                Teacher{sortIndicator("teacherName")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={3} className="class-detail-students-empty">No subjects match your search/filter.</td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr
                  key={r.id}
                  className="class-detail-students-row"
                  onClick={() => r.subjectId && navigate(`/academics/subjects/${r.subjectId}`)}
                >
                  <td>{r.subjectName}</td>
                  <td>{SUBJECT_TYPE_LABELS[r.type] || r.type || "N/A"}</td>
                  <td>{r.teacherName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function TeachersTab({ classSubjects }) {
  const navigate = useNavigate();

  // A teacher can have more than one ClassSubject row for the same
  // (class, subject) pair — e.g. one per academic year — so this needs to
  // dedupe by subject id (a Map, keyed by id) rather than pushing every
  // row's subject name, which showed up as "Mathematics, Mathematics".
  const byTeacher = new Map();
  for (const cs of classSubjects) {
    if (!cs.teacher?.id) continue;
    const entry = byTeacher.get(cs.teacher.id) || {
      id: cs.teacher.id,
      name: cs.teacher.name || cs.teacher.username,
      subjects: new Map(),
    };
    if (cs.subject?.id) entry.subjects.set(cs.subject.id, cs.subject.name);
    byTeacher.set(cs.teacher.id, entry);
  }
  const rows = Array.from(byTeacher.values()).map((entry) => ({
    ...entry,
    subjects: Array.from(entry.subjects.values()),
  }));

  return (
    <div className="class-detail-students-tab">
      {rows.length === 0 ? (
        <p className="class-detail-empty-text">No teachers assigned to this class yet.</p>
      ) : (
        <div className="class-detail-table-scroll">
        <table className="class-detail-students-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Subjects Taught (this class)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="class-detail-students-row"
                onClick={() => navigate(`/academics/teachers/${r.id}`)}
              >
                <td>{r.name}</td>
                <td>{r.subjects.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

export function ClassDetailPage() {
  // Only Admin3 owns class management, same restriction Class.page.jsx
  // (the list this page is reached from) already carries.
  useRestrictTo("Admin3");

  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "overview";
  const setActiveTab = (key) => setSearchParams({ tab: key });

  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classStats, setClassStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchClass = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/classes/${id}`);
      setCls(res.data?.data || null);
    } catch (err) {
      toast.error("Failed to load class.");
      setCls(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  useEffect(() => {
    setStatsLoading(true);
    api
      .get(`/classes/${id}/stats`)
      .then((res) => setClassStats(res.data?.data || null))
      .catch(() => setClassStats(null))
      .finally(() => setStatsLoading(false));
  }, [id]);

  useEffect(() => {
    api
      .get("/teachers")
      .then((res) => {
        const list = res.data?.data || [];
        setTeachers(
          list.map((t, i) => ({ value: t.id, label: t.name || t.username || `Teacher ${i}` }))
        );
      })
      .catch(() => toast.error("Failed to load teachers."));

    fetch(`${subBaseURL}/specialties`, { headers: headers() })
      .then((res) => res.json())
      .then((list) => setDepartments(list.map((d) => ({ value: d.id, label: d.name }))))
      .catch(() => toast.error("Failed to load departments."));
  }, []);

  const openEdit = () => {
    if (!cls) return;
    setForm(classToForm(cls));
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateClassForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    if (!confirmOrientationNameMismatch(form)) return;
    try {
      setEditLoading(true);
      await api.patch(`/classes/${form.id}`, transformClassForm(form));
      toast.success("Class updated successfully.");
      setEditModalOpen(false);
      fetchClass();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to update class."
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await api.delete(`/classes/${id}`);
      toast.success("Class deleted successfully.");
      navigate("/academics/classes");
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Delete failed."
      );
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  // ClassSubject carries an academic_year_id, so the same (class, subject,
  // teacher) can legitimately have more than one row — e.g. the same
  // teacher taught the same subject to this class across two years. That's
  // real history worth keeping in the database, but showing it as two
  // identical-looking rows in a per-class subject/teacher list just reads
  // as a duplicate bug. Dedupe by subject id once here, at the source, so
  // the stat card count, the Subjects tab, and the Teachers tab all agree
  // instead of each needing its own ad hoc fix.
  const rawClassSubjects = cls?.classSubjects || [];
  const classSubjectsList = Array.from(
    new Map(rawClassSubjects.map((cs) => [cs.subject_id, cs])).values()
  );
  const uniqueTeacherCount = new Set(
    classSubjectsList.map((cs) => cs.teacher_id).filter(Boolean)
  ).size;

  // Department deliberately isn't a card here: it's a name, not a count,
  // and stretching text like "Health Care Engineering" to fill the same
  // slot as a big bold number looked broken. It's already shown properly
  // in the Overview tab's info group instead.
  const statsData = [
    { title: "Total Students", value: classStats?.total_students ?? 0, icon: FaUserGraduate, tone: "neutral" },
    { title: "Male", value: classStats?.male ?? 0, icon: FaMale, tone: "pending" },
    { title: "Female", value: classStats?.female ?? 0, icon: FaFemale, tone: "gold" },
    { title: "Subjects", value: classSubjectsList.length, icon: FaLayerGroup, tone: "good" },
    { title: "Teachers", value: uniqueTeacherCount, icon: FaChalkboardTeacher, tone: "warn" },
  ];

  if (loading) {
    return (
      <SideTop>
        <div className="class-page class-detail-page">
          <div className="class-detail-skeleton">
            <div className="skeleton-line wide" />
            <div className="skeleton-block short" />
          </div>
        </div>
      </SideTop>
    );
  }

  // Standalone, first thing on the page, above the title — same spot on
  // every marks-module detail page. Real browser-history back, not a
  // hardcoded destination — a hardcoded Link to /academics/classes sent
  // you there even when you'd actually arrived from somewhere else (e.g.
  // a teacher's or subject's detail page), same bug already fixed on
  // StudentDetailPage's back button.
  const backButton = (
    <div className="vt-back-row">
      <Button variant="ghost" icon={<FaArrowLeft />} onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </div>
  );

  if (!cls) {
    return (
      <SideTop>
        <div className="class-page class-detail-page">
          {backButton}
          <p>Class not found.</p>
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="class-page class-detail-page">
        {backButton}

        <div className="class-details-card">
          <header className="class-details-header class-details-header--solo">
            <div className="class-details-title-wrapper">
              <h2 className="class-details-title">
                {cls.department?.name} {cls.name}
              </h2>
              <span className={`class-status-badge ${cls.suspended ? "suspended" : "active"}`}>
                {cls.suspended ? "Suspended" : "Active"}
              </span>
            </div>
            <div className="class-detail-header-actions">
              {/* Edit / Delete used to be two coloured buttons here (a solid
                  red Delete beside a tinted Edit); they now sit behind the
                  same kebab the table rows use. */}
              <ActionMenu
                title={cls.name}
                items={[
                  { key: "edit", label: "Edit class", icon: <FaEdit />, onClick: openEdit },
                  { key: "delete", label: "Delete class", icon: <FaTrash />, danger: true, onClick: () => setDeleteConfirmOpen(true) },
                ]}
              />
            </div>
          </header>
        </div>

        <Stats data={statsData} loading={statsLoading} skeletonCount={5} />

        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

        <div className="class-detail-tab-panel">
          {activeTab === "overview" && (
            <div className="class-details-card">
              <section className="class-details-body">
                <div className="class-info-group">
                  <div className="class-info-item">
                    <span className="class-info-label">Department</span>
                    <span className="class-info-value">{cls.department?.name || "N/A"}</span>
                  </div>
                  <div className="class-info-item">
                    <span className="class-info-label">Class Master</span>
                    <span className="class-info-value">
                      {cls.classMaster?.name || cls.classMaster?.username || "N/A"}
                    </span>
                  </div>
                  <div className="class-info-item">
                    <span className="class-info-label">Orientation Class</span>
                    <span className="class-info-value">{cls.is_orientation ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="class-fee-group">
                  <h4 className="class-fee-title">Fees Overview</h4>
                  <div className="class-fee-list">
                    {[
                      ["Registration Fee", cls.registration_fee],
                      ["Bus Fee", cls.bus_fee],
                      ["Internship Fee", cls.internship_fee],
                      ["Remedial Fee", cls.remedial_fee],
                      ["Tuition Fee", cls.tuition_fee],
                      ["PTA Fee", cls.pta_fee],
                    ].map(([label, value]) => (
                      <div className="class-fee-item" key={label}>
                        <span>{label}</span>
                        <span className="class-fee-value">
                          {value ? Number(value).toLocaleString("fr-CM") : "N/A"}
                        </span>
                      </div>
                    ))}
                    <div className="class-fee-item class-fee-total">
                      <span>Total Fee</span>
                      <span className="class-fee-value">
                        {cls.total_fee ? `${Number(cls.total_fee).toLocaleString("fr-CM")} FCFA` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "students" && <StudentsTab classItem={cls} />}

          {activeTab === "subjects" && <SubjectsTab classSubjects={classSubjectsList} />}

          {activeTab === "teachers" && <TeachersTab classSubjects={classSubjectsList} />}

          {activeTab === "class-master" && (
            <div className="class-details-card">
              <ClassMasterHistoryModal classItem={cls} teachersOptions={teachers} />
            </div>
          )}
        </div>

        <ClassFormModal
          mode="edit"
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          form={form}
          formErrors={formErrors}
          onChange={handleUpdateForm}
          onSubmit={handleEditSubmit}
          departments={departments}
          teachers={teachers}
          loading={editLoading}
        />

        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title="Confirm Delete"
        >
          <div className="datatable-delete-content">
            <p className="delete-resource-text">
              Are you sure you want to delete <strong>{cls.name}</strong>? This cannot be undone.
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
      </div>
    </SideTop>
  );
}

export default ClassDetailPage;
