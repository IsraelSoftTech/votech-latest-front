import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import Modal from "../../components/Modal/Modal.component";
import Stats from "../../components/Stats/Stats.component";
import AssignCourseModal from "../../components/AssignCourseModal/AssignCourseModal.component";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import {
  CustomDropdown,
  CustomInput,
  SubmitBtn,
} from "../../components/Inputs/CustumInputs";
import { motion } from "framer-motion";

const SUBJECT_COLUMNS = [
  { label: "S/N", accessor: "sn" },
  { label: "Name", accessor: "name" },
  { label: "Code", accessor: "code" },
  { label: "Coefficient", accessor: "coefficient" },
  { label: "Category", accessor: "category" },
  { label: "Classes", accessor: "className" },
  { label: "Teachers", accessor: "teacherName" },
  { label: "Assigned", accessor: "isAssigned" },
  { label: "Departments", accessor: "department" },
];

const INITIAL_FORM_STATE = {
  category: "",
  code: "",
  coefficient: 0,
  name: "",
};

export const SubjectPage = () => {
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
  const [selectedRow, setSelectedRow] = useState(null);
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
  const [finishedLoading, setFinishedLoading] = useState(false);

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

  useEffect(() => {
    if (!isLoading) {
      // delay slightly to let table finish its animation
      const timer = setTimeout(() => {
        setFinishedLoading(true);
      }, 500); // adjust delay to match your table's loading animation

      return () => clearTimeout(timer);
    } else {
      setFinishedLoading(false);
    }
  }, [isLoading]);

  if (!user) return <div>Unauthorized access</div>;

  // Row click handlers
  const handleRowClick = (row) => setSelectedRow(row);
  const closeModal = () => setSelectedRow(null);

  // Modal open/close helpers
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

  const createSubject = async () => {
    try {
      setCreateLoading(true);
      await api.post("/subjects", {
        ...form,
        coefficient: Number(form.coefficient),
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
      await api.patch(`/subjects/${form.id}`, {
        ...form,
        coefficient: Number(form.coefficient),
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
      icon: <FaUserPlus color="#204080" />,
      title: "Assign Class & Teacher",
      onClick: (row) => {
        setAssignSubject(row);
        setAssignModalOpen(true);
      },
      roles: ["Admin3"],
    },
    {
      icon: <FaFileAlt color="#204080" />,
      title: "Fill in marks",
      onClick: (row) => navigate(`/academics/mark-upload/${row.id}`),
    },
  ];

  return (
    <SideTop>
      <div style={{ padding: "20px" }}>
        <h2 className="page-title">
          {user.role === "Admin3" ? "All Subjects" : "Subjects Assigned to You"}
        </h2>
        {user.role === "Admin3" && <Stats data={data} />}
        {user.role === "Admin3" && (
          <button className="btn btn-create" onClick={openCreateModal}>
            Create Subject
          </button>
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

      <Modal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        title="Create Subject"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
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
          <SubmitBtn
            title={createLoading ? "Creating Subject..." : "Create Subject"}
            disabled={createLoading}
          />
        </form>
      </Modal>

      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title="Edit Academic Subject"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
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
          <SubmitBtn
            title={editLoading ? "Saving changes..." : "Save Changes"}
            disabled={editLoading}
          />
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedRow}
        onClose={closeModal}
        title="Subject Details"
      >
        {selectedRow && (
          <div className="subject-details">
            <h2>{selectedRow.name}</h2>
            <div className="details-grid">
              <span className="label">Code:</span>
              <span>{selectedRow.code || "N/A"}</span>
              <span className="label">Coefficient:</span>
              <span>{selectedRow.coefficient ?? "N/A"}</span>
              <span className="label">Category:</span>
              <span className="text-capitalize">
                {selectedRow.category || "N/A"}
              </span>
              <span className="label">Assigned:</span>
              <span>{selectedRow.isAssigned}</span>
              <span className="label">Classes:</span>
              <span>{selectedRow.className || "None"}</span>
              <span className="label">Teachers:</span>
              <span>{selectedRow.teacherName || "None"}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={assignModalOpen}
        onClose={closeAssignModal}
        title={`Assign ${assignSubject?.name || "Subject"} (${
          assignSubject?.code || ""
        }) To Classes and Teachers`}
      >
        <AssignCourseModal
          departmentsOptions={departments}
          classesOptions={classes}
          teachersOptions={teachers}
          subject={assignSubject}
          onUpdate={fetchSubjects}
        />
      </Modal>
    </SideTop>
  );
};

function NoSubjectsAssigned() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "linear-gradient(135deg, #f8f9fa, #e9ecef)",
        padding: "30px 20px",
        borderRadius: "12px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        maxWidth: "500px",
        margin: "50px auto",
        color: "#495057",
      }}
    >
      <FaExclamationCircle
        size={50}
        color="#f03e3e"
        style={{ marginBottom: "15px" }}
      />
      <h2 style={{ marginBottom: "10px" }}>No Subjects Assigned</h2>
      <p style={{ fontSize: "16px", lineHeight: "1.5" }}>
        Sorry, you have no subjects assigned to you at the moment. <br />
        If you expected to have subjects, please contact system admins or apply
        to be assigned a subject.
      </p>
    </motion.div>
  );
}
