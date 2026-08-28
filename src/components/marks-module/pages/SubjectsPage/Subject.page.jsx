import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBook,
  FaCheckCircle,
  FaTimesCircle,
  FaUserPlus,
  FaFileAlt,
  FaExclamationCircle,
} from "react-icons/fa";

import SideTop from "../../../SideTop";
import "./Subject.styles.css";
import api, { subBaseURL, headers } from "../../utils/api";
import DataTable from "../../components/DataTable/DataTable.component";
import Stats from "../../components/Stats/Stats.component";
import AssignCourseModal from "../../components/AssignCourseModal/AssignCourseModal.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import Modal from "../../components/Modal/Modal.component";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import {
  CustomDropdown,
  CustomInput,
  SubmitBtn,
} from "../../components/Inputs/CustumInputs";
import { motion } from "framer-motion";

// A subject can be taught in 30+ classes, whose names already carry their
// department's name (e.g. "Civil Engineering Certification Level Two CE"),
// so the joined string DataTable searches against can run to hundreds of
// characters. Table cells show a short "first few + N more" preview only,
// search still matches the full underlying string, the full list lives on
// the subject's own detail page (opened by clicking the row).
const summarizeList = (joined, max = 2) => {
  if (!joined || joined === "None") return joined;
  const items = joined.split(", ");
  if (items.length <= max) return joined;
  return `${items.slice(0, max).join(", ")} +${items.length - max} more`;
};

const SUBJECT_COLUMNS = [
  { label: "S/N", accessor: "sn" },
  { label: "Name", accessor: "name" },
  { label: "Code", accessor: "code" },
  { label: "Coefficient", accessor: "coefficient" },
  { label: "Category", accessor: "category" },
  {
    label: "Classes",
    accessor: "className",
    render: (row) => summarizeList(row.className),
  },
  {
    label: "Teachers",
    accessor: "teacherName",
    render: (row) => summarizeList(row.teacherName),
  },
  { label: "Assigned", accessor: "isAssigned" },
  {
    label: "Departments",
    accessor: "department",
    render: (row) => summarizeList(row.department),
  },
];

const INITIAL_FORM_STATE = {
  category: "",
  code: "",
  coefficient: 0,
  name: "",
  orientationDepartmentName: "",
};

export const SubjectPage = ({ noLayoutWrapper = false }) => {
  const user = useRestrictTo(
    "Admin1",
    "Admin2",
    "Admin3",
    "Admin4",
    "Teacher",
    "Discipline",
    "Psychosocialist"
  );

  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [filters, setFilters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSubject, setAssignSubject] = useState(null);

  const hasFetchedRef = useRef(false);

  const handleUpdateForm = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
    setFormErrors({});
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!form.name?.trim()) errors.name = "Subject name is required.";
    else if (!/^[a-zA-Z0-9\s\-\+\&\.\,\(\)]+$/.test(form.name)) {
      errors.name =
        "Subject name may only include letters, numbers, spaces, and basic symbols (- + & . , ( )).";
    }

    if (!form.code?.trim()) errors.code = "Subject code is required.";
    else if (!/^[a-zA-Z0-9]+$/.test(form.code))
      errors.code = "Subject code may only include letters and numbers.";

    const coef = Number(form.coefficient);
    if (form.coefficient === "" || form.coefficient === null)
      errors.coefficient = "Coefficient is required.";
    else if (isNaN(coef)) errors.coefficient = "Coefficient must be a number.";
    else if (coef < 1)
      errors.coefficient = "Coefficient cannot be less than 1.";
    else if (coef > 10)
      errors.coefficient = "Coefficient cannot be greater than 10.";

    if (!form.category?.trim()) errors.category = "Category is required.";

    return errors;
  }, [form]);

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const subjectsRes =
        user.role === "Admin3"
          ? await api.get("/subjects")
          : await api.get(`/subjects/filtered?id=${user.id}`);
      const subFilters = new Set();

      const subjectData = !subjectsRes.data.data
        ? []
        : subjectsRes.data.data.map((subject, index) => {
            const classNames = [];
            const teacherNames = [];
            const departmentNames = [];
            const teacherSet = new Set();
            const classSet = new Set();
            const deptSet = new Set();

            subFilters.add(subject.category);

            subject.classSubjects?.forEach((cs) => {
              const fullClassName = `${cs.department?.name || ""} ${
                cs.class?.name || ""
              }`.trim();
              if (fullClassName && !classSet.has(fullClassName)) {
                classSet.add(fullClassName);
                classNames.push(fullClassName);
              }
              if (cs.teacher) {
                const teacherIdentifier =
                  cs.teacher.name || cs.teacher.username;
                if (teacherIdentifier && !teacherSet.has(teacherIdentifier)) {
                  teacherSet.add(teacherIdentifier);
                  teacherNames.push(teacherIdentifier);
                }
              }

              if (cs.department?.name && !deptSet.has(cs.department.name)) {
                deptSet.add(cs.department.name);
                departmentNames.push(cs.department.name);
                subFilters.add(cs.department.name);
              }
            });

            return {
              id: subject.id,
              sn: index + 1,
              name: subject.name,
              code: subject.code,
              coefficient: subject.coefficient,
              category: subject.category,
              className: classNames.join(", ") || "None",
              teacherName: teacherNames.join(", ") || "None",
              isAssigned: subject.classSubjects?.length > 0 ? "Yes" : "No",
              department: departmentNames.join(", ") || "None",
              orientationDepartmentName: subject.orientationDepartment?.name || "None",
            };
          });

      setFilters(Array.from(subFilters));
      setSubjects(subjectData);
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Error fetching subjects."
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch(`${subBaseURL}/specialties`, {
        headers: headers(),
      });
      const data = (await res.json()).map((dep) => ({
        value: dep.id,
        label: dep.name,
      }));
      setDepartments(data);
    } catch (err) {
      toast.error("Error fetching departments.");
      console.error(err);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get("/classes");
      const classesWithDeptId = !res.data.data
        ? []
        : res.data.data.map((el) => ({ ...el, label: el.name, value: el.id }));
      setClasses(classesWithDeptId);
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error fetching classes.");
      console.error(err);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await api.get("/teachers");
      const data = !res.data.data
        ? []
        : res.data.data.map((teach, index) => ({
            value: teach.id,
            label: teach.name || teach.username || `Teacher ${index}`,
          }));
      setTeachers(data);
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error fetching teachers.");
      console.error(err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (user?.role !== "Admin3") return;
    try {
      const res = await api.get("/content/subjects");
      const icons = [FaBook, FaCheckCircle, FaTimesCircle];
      const statsData = res.data.data.stats.map((data, index) => ({
        ...data,
        icon: icons[index],
      }));
      setData(statsData);
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error fetching statistics");
      console.error(err);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchSubjects();
    fetchDepartments();
    fetchClasses();
    fetchTeachers();
    if (user.role === "Admin3") fetchStats();
  }, [
    user,
    fetchSubjects,
    fetchDepartments,
    fetchClasses,
    fetchTeachers,
    fetchStats,
  ]);

  if (!user) return <div>Unauthorized access</div>;

  const departmentNameOptions = departments.map((d) => d.label);

  const handleRowClick = (row) => navigate(`/academics/subjects/${row.id}`);

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };
  const closeCreateModal = () => {
    resetForm();
    setCreateModalOpen(false);
  };
  const closeEditModal = () => {
    resetForm();
    setEditModalOpen(false);
  };
  const closeAssignModal = () => {
    setAssignSubject(null);
    setAssignModalOpen(false);
  };

  // The dropdown stores a department NAME (matching this form's existing
  // CustomDropdown fields, e.g. category), resolved to the id the API
  // actually wants right before sending — keeps this consistent with the
  // rest of the form instead of introducing a differently-shaped select
  // just for this one field.
  const resolveOrientationDepartmentId = (name) =>
    departments.find((d) => d.label === name)?.value ?? null;

  const createSubject = async () => {
    try {
      setCreateLoading(true);
      const { orientationDepartmentName, ...rest } = form;
      await api.post("/subjects", {
        ...rest,
        coefficient: Number(form.coefficient),
        orientation_department_id: resolveOrientationDepartmentId(orientationDepartmentName),
      });
      toast.success("Subject Created successfully.");
      closeCreateModal();
      fetchSubjects();
      if (user.role === "Admin3") fetchStats();
    } catch (err) {
      console.log("error", err);
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to create subject."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    createSubject();
  };

  const editSubject = async () => {
    try {
      setEditLoading(true);
      const { orientationDepartmentName, ...rest } = form;
      await api.patch(`/subjects/${form.id}`, {
        ...rest,
        coefficient: Number(form.coefficient),
        orientation_department_id: resolveOrientationDepartmentId(orientationDepartmentName),
      });
      toast.success("Subject updated successfully.");
      closeEditModal();
      fetchSubjects();
      if (user.role === "Admin3") fetchStats();
    } catch (err) {
      console.log("error", err);
      toast.error(err.response?.data?.message || "Failed to update subject.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    editSubject();
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name,
      coefficient: row.coefficient,
      code: row.code,
      category: row.category,
      orientationDepartmentName:
        row.orientationDepartmentName === "None" ? "" : row.orientationDepartmentName,
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleDelete = async (row) => {
    try {
      await api.delete(`/subjects/${row.id}`);
      toast.success("Subject deleted successfully");
      fetchSubjects();
      if (user.role === "Admin3") fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Delete failed."
      );
    }
  };

  const extraActions = [
    {
      // No hardcoded color here — the icon must inherit from the button's
      // own CSS (.vt-row-action-extra / :hover) so it switches to white
      // on hover along with the background. A hardcoded inline color
      // previously pinned the icon to the same navy as the hover
      // background, making it disappear on hover.
      icon: <FaUserPlus />,
      title: "Assign Class & Teacher",
      onClick: (row) => {
        setAssignSubject(row);
        setAssignModalOpen(true);
      },
      roles: ["Admin3"],
    },
    {
      icon: <FaFileAlt />,
      title: "Fill in marks",
      onClick: (row) => navigate(`/academics/mark-upload/${row.id}`),
    },
  ];

  const content = (
    <>
      <div className="subject-page-container">
        <PageHeader
          title={
            user.role === "Admin3"
              ? "All Subjects To Mr Vitalis"
              : "Subjects Assigned to You"
          }
          actions={
            user.role === "Admin3" && (
              <button className="btn btn-create" onClick={openCreateModal}>
                Create Subject
              </button>
            )
          }
        />
        {user.role === "Admin3" && (
          <Stats data={data} loading={isLoading} skeletonCount={3} />
        )}
        {isLoading || subjects.length > 0 ? (
          <DataTable
            columns={SUBJECT_COLUMNS}
            data={subjects}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRowClick={handleRowClick}
            loading={isLoading}
            limit={10}
            warnDelete={() => {
              toast.warn(
                "Warning: Deleting this subject may cause issues because students, marks, and other data are linked to it."
              );
            }}
            filterCategories={filters}
            extraActions={extraActions}
            editRoles={["Admin3"]}
            deleteRoles={["Admin3"]}
            userRole={user.role}
          />
        ) : (
          <NoSubjectsAssigned />
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        title="Create Subject"
      >
        <form onSubmit={handleCreateSubmit} className="subject-modal-form">
          <CustomInput
            label="Name"
            value={form.name}
            placeholder="e.g Mathematics I"
            name="name"
            required
            onChange={handleUpdateForm}
            error={formErrors.name}
            onClear={() => handleUpdateForm("name", "")}
          />
          <CustomInput
            label="Code"
            value={form.code}
            placeholder="e.g MATH I"
            name="code"
            required
            onChange={handleUpdateForm}
            error={formErrors.code}
            onClear={() => handleUpdateForm("code", "")}
          />
          <CustomInput
            label="Coefficient"
            type="number"
            value={form.coefficient}
            placeholder="e.g 4"
            name="coefficient"
            required
            onChange={handleUpdateForm}
            error={formErrors.coefficient}
            onClear={() => handleUpdateForm("coefficient", "")}
          />
          <CustomDropdown
            label="Category"
            value={form.category}
            required
            options={["general", "professional", "practical"]}
            name="category"
            onClear={() => handleUpdateForm("category", "")}
            onChange={handleUpdateForm}
            error={formErrors.category}
          />
          <CustomDropdown
            label="Orientation Placement Department"
            value={form.orientationDepartmentName}
            options={departmentNameOptions}
            name="orientationDepartmentName"
            onClear={() => handleUpdateForm("orientationDepartmentName", "")}
            onChange={handleUpdateForm}
          />
          <SubmitBtn
            title={createLoading ? "Creating Subject..." : "Create Subject"}
            disabled={createLoading}
          />
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title="Edit Academic Subject"
      >
        <form onSubmit={handleEditSubmit} className="subject-modal-form">
          <CustomInput
            label="Name"
            value={form.name}
            placeholder="e.g Mathematics I"
            name="name"
            required
            onChange={handleUpdateForm}
            error={formErrors.name}
            onClear={() => handleUpdateForm("name", "")}
          />
          <CustomInput
            label="Code"
            value={form.code}
            placeholder="e.g MATH I"
            name="code"
            required
            onChange={handleUpdateForm}
            error={formErrors.code}
            onClear={() => handleUpdateForm("code", "")}
          />
          <CustomInput
            label="Coefficient"
            type="number"
            value={form.coefficient}
            placeholder="e.g 4"
            name="coefficient"
            required
            onChange={handleUpdateForm}
            error={formErrors.coefficient}
            onClear={() => handleUpdateForm("coefficient", "")}
          />
          <CustomDropdown
            label="Category"
            value={form.category}
            required
            options={["general", "professional"]}
            name="category"
            onClear={() => handleUpdateForm("category", "")}
            onChange={handleUpdateForm}
            error={formErrors.category}
          />
          <CustomDropdown
            label="Orientation Placement Department"
            value={form.orientationDepartmentName}
            options={departmentNameOptions}
            name="orientationDepartmentName"
            onClear={() => handleUpdateForm("orientationDepartmentName", "")}
            onChange={handleUpdateForm}
          />
          <SubmitBtn
            title={editLoading ? "Saving changes..." : "Save Changes"}
            disabled={editLoading}
          />
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={closeAssignModal}
        title={`Assign ${assignSubject?.name || "Subject"}`}
      >
        <AssignCourseModal
          departmentsOptions={departments}
          classesOptions={classes}
          teachersOptions={teachers}
          subject={assignSubject}
          onUpdate={fetchSubjects}
        />
      </Modal>
    </>
  );

  return noLayoutWrapper ? content : <SideTop>{content}</SideTop>;
};

function NoSubjectsAssigned() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <EmptyState
        icon={<FaExclamationCircle />}
        title="No Subjects Assigned"
        subtitle="Sorry, you have no subjects assigned to you at the moment. If you expected to have subjects, please contact system admins or apply to be assigned a subject."
      />
    </motion.div>
  );
}
