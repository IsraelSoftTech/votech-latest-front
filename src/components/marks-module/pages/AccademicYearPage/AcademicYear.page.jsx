import React, { useState, useEffect, useRef } from "react";
import SideTop from "../../../SideTop";
import DataTable from "../../components/DataTable/DataTable.component";
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
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaLock,
  FaTimes,
} from "react-icons/fa";

// Custom hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

// Academic Year Modal Component (Desktop & Mobile)
const AcademicYearModal = ({ isOpen, onClose, title, children }) => {
  const isMobile = useIsMobile();
  const modalRef = useRef(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Touch handlers for mobile swipe to dismiss
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging) return;
    const touchY = e.touches[0].clientY;
    const diff = touchY - startY;

    if (diff > 0) {
      setCurrentY(diff);
      if (modalRef.current) {
        modalRef.current.style.transform = `translateY(${diff}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);

    if (currentY > 150) {
      onClose();
    }

    if (modalRef.current) {
      modalRef.current.style.transform = "";
    }
    setCurrentY(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`academic-modal-overlay ${isMobile ? "mobile" : "desktop"}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`academic-modal-container ${
          isMobile ? "mobile" : "desktop"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle - mobile only */}
        {isMobile && (
          <div className="academic-modal-drag-handle">
            <div className="academic-drag-bar"></div>
          </div>
        )}

        {/* Header */}
        <div className="academic-modal-header">
          <h2 className="academic-modal-title">{title}</h2>
          <button
            className="academic-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="academic-modal-body">{children}</div>
      </div>
    </div>
  );
};

export const AcademicYear = () => {
  const isReadOnly =
    JSON.parse(sessionStorage.getItem("authUser") || "{}").role === "Admin1";

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

  // Confirm modal for "set active" scenario
  const [confirmActiveOpen, setConfirmActiveOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Helpers
  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
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
      console.log(err);
      const message =
        err.response?.data?.details ||
        err?.message ||
        "Failed to load academic years.";
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
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Error fetching statistics"
      );
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
      fetchStats();
    } catch (err) {
      const serverError =
        err.response?.data?.message || "Failed to create academic year.";
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
      fetchStats();
    } catch (err) {
      console.log(err);
      const serverError =
        err.response?.data?.details ||
        err.response?.data?.message ||
        "Failed to update academic year.";
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

  // Open edit modal
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
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.details || "Delete failed.");
    }
  };

  // Row click
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
      <div className="academic-year-page">
        <h2 className="academic-page-title">
          Academic Years
          {isReadOnly && (
            <span className="academic-read-only-badge">
              <FaLock /> Read Only
            </span>
          )}
        </h2>

        <Stats data={stats} />

        {!isReadOnly && (
          <button className="academic-btn-create" onClick={openCreateModal}>
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
              "Warning: Deleting this academic year may cause issues because students, marks, and other data are linked to it."
            );
          }}
          filterCategories={["active"]}
          editRoles={["Admin3"]}
          deleteRoles={["Admin3"]}
          userRole={JSON.parse(sessionStorage.getItem("authUser") || "{}").role}
        />

        {/* Details Modal */}
        <AcademicYearModal
          isOpen={!!selectedRow}
          onClose={closeModal}
          title="Academic Year Details"
        >
          {selectedRow && (
            <div className="academic-year-details">
              <div className="academic-detail-item">
                <span className="academic-detail-label">Name</span>
                <span className="academic-detail-value">
                  {selectedRow.name}
                </span>
              </div>

              <div className="academic-detail-item">
                <span className="academic-detail-label">Start Date</span>
                <span className="academic-detail-value">
                  {selectedRow.start_date}
                </span>
              </div>

              <div className="academic-detail-item">
                <span className="academic-detail-label">End Date</span>
                <span className="academic-detail-value">
                  {selectedRow.end_date}
                </span>
              </div>

              <div className="academic-detail-item">
                <span className="academic-detail-label">Status</span>
                <span
                  className={`academic-detail-value academic-status-${selectedRow.status.toLowerCase()}`}
                >
                  {selectedRow.status}
                </span>
              </div>
            </div>
          )}
        </AcademicYearModal>

        {/* Create Modal */}
        <AcademicYearModal
          isOpen={createModalOpen}
          onClose={closeCreateModal}
          title="Create Academic Year"
        >
          <form onSubmit={handleCreateSubmit} className="academic-modal-form">
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
        </AcademicYearModal>

        {/* Edit Modal */}
        <AcademicYearModal
          isOpen={editModalOpen}
          onClose={closeEditModal}
          title="Edit Academic Year"
        >
          <form onSubmit={handleEditSubmit} className="academic-modal-form">
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
        </AcademicYearModal>

        {/* Confirm Active Modal */}
        <AcademicYearModal
          isOpen={confirmActiveOpen}
          onClose={() => setConfirmActiveOpen(false)}
          title="Set as Active?"
        >
          <div className="academic-confirm-content">
            <p className="academic-confirm-text">
              There's already an active academic year. Do you want to set this
              one as active instead?
            </p>
            <div className="academic-confirm-buttons">
              <button
                className="academic-btn-cancel"
                onClick={() => setConfirmActiveOpen(false)}
              >
                Cancel
              </button>
              <button
                className="academic-btn-confirm"
                onClick={() => {
                  if (pendingAction) pendingAction();
                  setConfirmActiveOpen(false);
                }}
              >
                Yes, Set Active
              </button>
            </div>
          </div>
        </AcademicYearModal>
      </div>
    </SideTop>
  );
};
