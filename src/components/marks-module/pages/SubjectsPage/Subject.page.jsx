import SideTop from "../../../SideTop";
import "./Subject.styles.css";
import api from "../../utils/api";
import { toast } from "react-toastify";
import React, { useState, useEffect } from "react";
import DataTable from "../../components/DataTable/DataTable.component";
import Modal from "../../components/Modal/Modal.component";
import {
  CustomDropdown,
  CustomInput,
  SubmitBtn,
} from "../../components/Inputs/CustumInputs";

export const SubjectPage = () => {
  const columns = [
    { label: "S/N", accessor: "sn" },
    { label: "Name", accessor: "name" },
    { label: "Code", accessor: "code" },
    { label: "Coefficient", accessor: "coefficient" },
    { label: "Category", accessor: "category" },
    { label: "Class", accessor: "className" },
    { label: "Teacher", accessor: "teacherName" },
    { label: "Assigned", accessor: "isAssigned" },
  ];

  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: "",
    code: "",
    coefficient: 0,
    name: "",
    updatedAt: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  //utilities
  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetForm = () => {
    setForm({
      category: "",
      code: "",
      coefficient: 0,
      name: "",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!form.name?.trim()) {
      errors.name = "Subject name is required.";
    } else if (!/^[a-zA-Z0-9\s]+$/.test(form.name)) {
      errors.name = "Subject name may only include letters and numbers.";
    }

    if (!form.code?.trim()) {
      errors.code = "Subject code is required.";
    } else if (!/^[a-zA-Z0-9]+$/.test(form.code)) {
      errors.code = "Subject code may only include letters and numbers.";
    }

    const coef = Number(form.coefficient);
    if (!form.coefficient && form.coefficient !== 0) {
      errors.coefficient = "Coefficient is required.";
    } else if (isNaN(coef)) {
      errors.coefficient = "Coefficient must be a number.";
    } else if (coef < 1) {
      errors.coefficient = "Coefficient cannot be less than 1.";
    } else if (coef > 10) {
      errors.coefficient = "Coefficient cannot be greater than 10.";
    }

    if (!form.category?.trim()) {
      errors.category = "Category is required.";
    }

    return errors;
  };

  const createSubject = async () => {
    try {
      setCreateLoading(true);
      form.coefficient = Number(form.coefficient);
      await api.post("/subjects", form);
      toast.success("Subject Created successfully.");
      closeCreateModal();
      fetchSubjects();
    } catch (err) {
      // console.log(err.response.data.details);
      const serverError =
        err.response.data.details || "Failed to create academic year.";
      toast.error(serverError);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    createSubject();
  };

  const editSubject = async () => {
    try {
      setEditLoading(true);
      form.coefficient = Number(form.coefficient);
      await api.patch(`/subjects/${form.id}`, form);
      toast.success("Subject updated successfully.");
      closeEditModal();
      fetchSubjects();
    } catch (err) {
      console.log(err);
      const serverError =
        err.response?.data?.message || "Failed to update subject.";
      toast.error(serverError);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
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
    } catch (err) {
      toast.error(err.response.data.details || "Delete failed.");
    }
  };

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const subjectsRes = await api.get("/subjects");
      const classSubjectRes = await api.get("/class-subjects");

      // console.log(subjectsRes.data.data);

      const subjectData = !subjectsRes.data.data
        ? []
        : subjectsRes.data.data.map((subject, index) => {
            const isAssigned = subject.classSubjects.some(
              (cs) => cs.teacher !== null || cs.class !== null
            )
              ? "Yes"
              : "No";

            const firstCS = subject.classSubjects[0] || {};
            const className = firstCS.class?.name || "";
            const teacherName = firstCS.teacher?.name || "";

            return {
              ...subject,
              sn: index + 1,
              isAssigned,
              className,
              teacherName,
            };
          });
      console.log(subjectData);
      setSubjects(subjectData);
      setClassSubjects(classSubjectRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data.details || "Error fetching subjects.");
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleRowClick = (row) => setSelectedRow(row);
  const closeModal = () => setSelectedRow(null);

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

  return (
    <SideTop>
      <div style={{ padding: "20px" }}>
        <h2 className="page-title">Subjects</h2>

        <button className="btn btn-create" onClick={openCreateModal}>
          Create Subject
        </button>

        <DataTable
          columns={columns}
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
          filterCategories={["active"]}
        />
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        title="Create Subject"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
          <CustomInput
            label="Name"
            type="text"
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
            type="text"
            value={form.code}
            placeholder="e.g MATH I"
            name="code"
            required
            onChange={handleUpdateForm}
            error={formErrors.name}
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
            error={formErrors.name}
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title="Edit Academic Subject"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
          <CustomInput
            label="Name"
            type="text"
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
            type="text"
            value={form.code}
            placeholder="e.g MATH I"
            name="code"
            required
            onChange={handleUpdateForm}
            error={formErrors.name}
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
            error={formErrors.name}
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

      {/* Details Modal */}
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

              <span className="label">Class:</span>
              <span>
                {selectedRow.classSubjects.length > 0
                  ? selectedRow.classSubjects
                      .map((cs) => cs.class?.name)
                      .filter(Boolean)
                      .join(", ")
                  : "None"}
              </span>

              <span className="label">Teacher:</span>
              <span>
                {selectedRow.classSubjects.length > 0
                  ? selectedRow.classSubjects
                      .map((cs) => cs.teacher?.name)
                      .filter(Boolean)
                      .join(", ")
                  : "None"}
              </span>

              <span className="label">Created At:</span>
              <span>{new Date(selectedRow.createdAt).toLocaleString()}</span>

              <span className="label">Updated At:</span>
              <span>{new Date(selectedRow.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>
    </SideTop>
  );
};
