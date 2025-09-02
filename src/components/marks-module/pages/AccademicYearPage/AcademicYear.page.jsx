import React, { useState, useEffect } from "react";
import SideTop from "../../../SideTop";
import DataTable from "../../components/DataTable/DataTable.component";
import Modal from "../../components/Modal/Modal.component";
import "./AcademicYear.styles.css";
import { toast } from "react-toastify";
import api from "../../utils/api";
import {
  CustomDatePicker,
  CustomDropdown,
  CustomInput,
  SubmitBtn,
} from "../../components/Inputs/CustumInputs";
import Stats from "../../components/Stats/Stats.component";
import { FaCalendarAlt, FaCalendarCheck, FaLock } from "react-icons/fa";


export const AcademicYear = () => {
  const isReadOnly = JSON.parse(sessionStorage.getItem('authUser') || '{}').role === 'Admin1';
  
  const columns = [
    { label: "S/N", accessor: "sn" },
    { label: "Name", accessor: "name" },
    { label: "Start Date", accessor: "start_date" },
    { label: "End Date", accessor: "end_date" },
    { label: "Status", accessor: "status" },
  ];

  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create/Edit modal & form
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [stats, setStats] = useState([]);

  // Confirm modal for "set active" scenario (works for create and edit)
  const [confirmActiveOpen, setConfirmActiveOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Helpers
  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" })); // clear error on change
  };

  const resetForm = () => {
    setForm({
      name: "",
      start_date: "",
      end_date: "",
      status: "active",
    });
    setFormErrors({});
  };

  const fetchAcademicYears = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/academic-years");

      const list = res?.data?.data;
      if (Array.isArray(list)) {
        const formatted = list.map((el, index) => ({
          ...el,
          sn: index + 1,
          start_date: el?.start_date
            ? new Date(el.start_date).toISOString().split("T")[0]
            : "",
          end_date: el?.end_date
            ? new Date(el.end_date).toISOString().split("T")[0]
            : "",
        }));
        setData(formatted);
      } else {
        setData([]);
      }
    } catch (err) {
      const message = err?.response?.data?.details || err?.message || "Failed to load academic years.";
      toast.error(message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/content/academic-years");
      const icons = [FaCalendarCheck, FaCalendarAlt];

      const stats = res?.data?.data?.stats;
      const safeStats = Array.isArray(stats)
        ? stats.map((d, i) => ({ ...d, icon: icons[i] }))
        : [];
      setStats(safeStats);
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error fetching statistics");
      setStats([]);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchStats();
  }, []);

  // Validation
  const validateForm = () => {
    const errors = {};

    // if (!form.name.trim()) errors.name = "Academic year name is required.";
    if (!form.start_date) errors.start_date = "Start date is required.";
    if (!form.end_date) errors.end_date = "End date is required.";

    if (
      form.start_date &&
      form.end_date &&
      new Date(form.start_date) >= new Date(form.end_date)
    ) {
      errors.start_date = "Start date must be before end date.";
    }

    if (!form.status) errors.status = "Status is required.";

    return errors;
  };

  // Create year request
  const createYear = async () => {
    try {
      setCreateLoading(true);
      await api.post("/academic-years", form);
      toast.success("Academic year created successfully.");
      closeCreateModal();
      fetchAcademicYears();
    } catch (err) {
      // console.log(err.response.data.details);
      const serverError =
        err.response.data.details || "Failed to create academic year.";
      toast.error(serverError);
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit year request
  const editYear = async () => {
    try {
      setEditLoading(true);
      await api.patch(`/academic-years/${form.id}`, form);
      toast.success("Academic year updated successfully.");
      closeEditModal();
      fetchAcademicYears();
    } catch (err) {
      console.log(err);
      const serverError =
        err.response?.data?.message || "Failed to update academic year.";
      toast.error(serverError);
    } finally {
      setEditLoading(false);
    }
  };

  // Create submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    if (form.status === "active" && data.some((y) => y.status === "active")) {
      setPendingAction(() => createYear);
      setConfirmActiveOpen(true);
      return;
    }

    createYear();
  };

  // Edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    if (
      form.status === "active" &&
      data.some((y) => y.status === "active" && y.id !== form.id)
    ) {
      setPendingAction(() => editYear);
      setConfirmActiveOpen(true);
      return;
    }

    editYear();
  };

  // Open edit modal with prefilled form
  const handleEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  // Delete
  const handleDelete = async (row) => {
    try {
      await api.delete(`/academic-years/${row.id}`);
      toast.success("Academic year deleted successfully");
      fetchAcademicYears();
    } catch (err) {
      toast.error(err.response.data.details || "Delete failed.");
    }
  };

  // Row click for details modal
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
        <h2 className="page-title">
          Academic Years
          {isReadOnly && (
            <span className="read-only-badge">
              <FaLock /> Read Only
            </span>
          )}
        </h2>

        <Stats data={stats} />

        {/* Create Button - Hidden for Admin1 */}
        {!isReadOnly && (
          <button className="btn btn-create" onClick={openCreateModal}>
            Create Academic Year
          </button>
        )}

        <DataTable
          columns={columns}
          data={data}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={handleRowClick}
          loading={isLoading}
          limit={10}
          warnDelete={() => {
            toast.warn(
              "Warning: Deleting this academic year may cause issues because students, marks, and other data are linked to it. Consider archiving instead to preserve data integrity."
            );
          }}
          filterCategories={["active"]}
          editRoles={["Admin3"]}
          deleteRoles={["Admin3"]}
          userRole={JSON.parse(sessionStorage.getItem('authUser') || '{}').role}
        />

        {/* Details Modal */}
        <Modal
          isOpen={!!selectedRow}
          onClose={closeModal}
          title="Academic Year Details"
        >
          {selectedRow && (
            <div className="academic-year-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedRow.name}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Start Date:</span>
                <span className="detail-value">{selectedRow.start_date}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">End Date:</span>
                <span className="detail-value">{selectedRow.end_date}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span
                  className={`detail-value status-${selectedRow.status.toLowerCase()}`}
                >
                  {selectedRow.status}
                </span>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={closeCreateModal}
          title="Create Academic Year"
        >
          <form onSubmit={handleCreateSubmit} className="modal-form">
            {/* <CustomInput
              label="Name"
              type="text"
              value={form.name}
              placeholder="e.g 2025/2026 Academic Year"
              name="name"
              required
              onChange={handleUpdateForm}
              error={formErrors.name}
              onClear={() => handleUpdateForm("name", "")}
            /> */}

            <CustomDatePicker
              label="Start Date"
              value={form.start_date}
              name="start_date"
              required
              onClear={() => handleUpdateForm("start_date", "")}
              onChange={handleUpdateForm}
              error={formErrors.start_date}
            />

            <CustomDatePicker
              label="End Date"
              value={form.end_date}
              required
              name="end_date"
              onClear={() => handleUpdateForm("end_date", "")}
              onChange={handleUpdateForm}
              error={formErrors.end_date}
            />

            <CustomDropdown
              label="Status"
              value={form.status}
              required
              options={["active", "archived"]}
              name="status"
              onClear={() => handleUpdateForm("status", "")}
              onChange={handleUpdateForm}
              error={formErrors.status}
            />

            <SubmitBtn
              title={
                createLoading
                  ? "Creating Academic Year..."
                  : "Create Academic Year"
              }
              disabled={createLoading}
            />
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={closeEditModal}
          title="Edit Academic Year"
        >
          <form onSubmit={handleEditSubmit} className="modal-form">
            {/* <CustomInput
              label="Name"
              type="text"
              value={form.name}
              placeholder="e.g 2025/2026 Academic Year"
              name="name"
              required
              onChange={handleUpdateForm}
              error={formErrors.name}
              onClear={() => handleUpdateForm("name", "")}
            /> */}

            <CustomDatePicker
              label="Start Date"
              value={form.start_date}
              name="start_date"
              required
              onClear={() => handleUpdateForm("start_date", "")}
              onChange={handleUpdateForm}
              error={formErrors.start_date}
            />

            <CustomDatePicker
              label="End Date"
              value={form.end_date}
              required
              name="end_date"
              onClear={() => handleUpdateForm("end_date", "")}
              onChange={handleUpdateForm}
              error={formErrors.end_date}
            />

            <CustomDropdown
              label="Status"
              value={form.status}
              required
              options={["active", "archived"]}
              name="status"
              onClear={() => handleUpdateForm("status", "")}
              onChange={handleUpdateForm}
              error={formErrors.status}
            />

            <SubmitBtn
              title={editLoading ? "Saving changes..." : "Save Changes"}
              disabled={editLoading}
            />
          </form>
        </Modal>

        {/* Confirm Active Modal */}
        <Modal
          isOpen={confirmActiveOpen}
          onClose={() => setConfirmActiveOpen(false)}
          title="Set as Active?"
        >
          <p style={{ marginBottom: "1rem" }}>
            There’s already an active academic year. Do you want to set this one
            as active instead?
          </p>
          <div className="set-active-prompt-btn">
            <button
              className="btn btn-cancel"
              onClick={() => setConfirmActiveOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-confirm"
              onClick={() => {
                if (pendingAction) pendingAction();
                setConfirmActiveOpen(false);
              }}
            >
              Yes
            </button>
          </div>
        </Modal>
      </div>
    </SideTop>
  );
};
