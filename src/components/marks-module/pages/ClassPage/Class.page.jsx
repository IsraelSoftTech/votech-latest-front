import "./Class.styles.css";
import React, { useState, useEffect, useRef } from "react";
import SideTop from "../../../SideTop";
import DataTable from "../../components/DataTable/DataTable.component";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import {
  CustomDropdown,
  CustomInput,
  SubmitBtn,
} from "../../components/Inputs/CustumInputs";
import Stats from "../../components/Stats/Stats.component";
import {
  FaBan,
  FaCheckCircle,
  FaLayerGroup,
  FaPlus,
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

// Class Modal Component (Desktop & Mobile)
const ClassModal = ({ isOpen, onClose, title, children }) => {
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
      className={`class-modal-overlay ${isMobile ? "mobile" : "desktop"}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`class-modal-container ${isMobile ? "mobile" : "desktop"}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle - mobile only */}
        {isMobile && (
          <div className="class-modal-drag-handle">
            <div className="class-drag-bar"></div>
          </div>
        )}

        {/* Header */}
        <div className="class-modal-header">
          <h2 className="class-modal-title">{title}</h2>
          <button
            className="class-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="class-modal-body">{children}</div>
      </div>
    </div>
  );
};

export const ClassPage = () => {
  const capitalizeWords = (str) =>
    str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  const columns = [
    { label: "S/N", accessor: "sn" },
    { label: "Name", accessor: "name" },
    { label: "Department", accessor: "department" },
    { label: "Class Master", accessor: "classMaster" },
    { label: "Status", accessor: "suspended" },
    { label: "Tuition Fee", accessor: "tuition_fee" },
    { label: "PTA Fee", accessor: "pta_fee" },
    { label: "Total Fee", accessor: "total_fee" },
  ];

  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState([]);
  const [stats, setStats] = useState([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    department_id: null,
    class_master_id: null,
    registration_fee: "",
    bus_fee: "",
    internship_fee: "",
    remedial_fee: "",
    tuition_fee: "",
    pta_fee: "",
    total_fee: "",
    suspended: "",
  });

  function transformClassForm(form) {
    const result = { ...form };
    const feeFields = [
      "registration_fee",
      "bus_fee",
      "internship_fee",
      "remedial_fee",
      "tuition_fee",
      "pta_fee",
    ];

    feeFields.forEach((field) => {
      const value = Number(result[field]);
      result[field] = Number.isNaN(value) || value < 0 ? 0 : value;
    });

    result.total_fee = feeFields.reduce((sum, field) => sum + result[field], 0);

    if (typeof result.suspended === "string") {
      result.suspended = result.suspended.toLowerCase() === "suspended";
    }

    return result;
  }

  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Helpers
  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      department_id: null,
      class_master_id: null,
      registration_fee: "",
      bus_fee: "",
      internship_fee: "",
      remedial_fee: "",
      tuition_fee: "",
      pta_fee: "",
      total_fee: "",
      suspended: "",
    });
    setFormErrors({});
  };

  // Fetch initial data
  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const subFilters = new Set();
      const res = await api.get("/classes");
      if (res.data?.data) {
        const formatted = res.data.data.map((el, index) => {
          subFilters.add(el.department?.name);
          return {
            ...el,
            sn: index + 1,
            department: el.department?.name || "-",
            classMaster: el.classMaster
              ? el.classMaster?.name || el.classMaster.username
              : "-",
            suspended: el.suspended ? "Suspended" : "Active",
            registration_fee: el.registration_fee
              ? Number(el.registration_fee).toLocaleString("fr-CM")
              : "-",
            bus_fee: el.bus_fee
              ? Number(el.bus_fee).toLocaleString("fr-CM")
              : "-",
            internship_fee: el.internship_fee
              ? Number(el.internship_fee).toLocaleString("fr-CM")
              : "-",
            remedial_fee: el.remedial_fee
              ? Number(el.remedial_fee).toLocaleString("fr-CM")
              : "-",
            tuition_fee: el.tuition_fee
              ? Number(el.tuition_fee).toLocaleString("fr-CM")
              : "-",
            pta_fee: el.pta_fee
              ? Number(el.pta_fee).toLocaleString("fr-CM")
              : "-",
            total_fee: el.total_fee
              ? Number(el.total_fee).toLocaleString("fr-CM")
              : "-",
          };
        });
        const actualFilters = [];

        subFilters.forEach((filter) => {
          actualFilters.push(filter);
        });
        setFilters(actualFilters);
        setData(formatted);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to load academic years."
      );
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get("/teachers");

      const data = !res.data.data
        ? []
        : res.data.data.map((teach, index) => {
            return {
              value: teach.id,
              label: teach.name || teach.username || `Teacher ${index}`,
            };
          });

      setTeachers(data);
    } catch (err) {
      toast.error(err?.response?.data.details || "Error fetching classes.");
      console.log(err);
    }
  };

  const fetchDepartments = async () => {
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
      console.log(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/content/classes");
      const icons = [FaLayerGroup, FaCheckCircle, FaBan];

      res.data.data.stats.forEach((data, index) => {
        data.icon = icons[index];
      });
      setStats(res.data.data.stats);
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error fetching statistics");
      console.log(err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchDepartments();
    fetchTeachers();
    fetchStats();
  }, []);

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.department_id) errors.department_id = "Department is required.";
    if (!form.class_master_id)
      errors.class_master_id = "Class master is required.";
    if (form.suspended === "" || form.suspended == null)
      errors.suspended = "Class status (suspended or active) is required";
    return errors;
  };

  // CRUD Requests
  const createClass = async () => {
    try {
      setCreateLoading(true);
      await api.post("/classes", transformClassForm(form));
      toast.success("Class created successfully.");
      closeCreateModal();
      fetchClasses();
      fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to create class."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const editClass = async () => {
    try {
      setEditLoading(true);
      await api.patch(`/classes/${form.id}`, transformClassForm(form));
      toast.success("Class updated successfully.");
      closeEditModal();
      fetchClasses();
      fetchStats();
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

  const deleteClass = async (row) => {
    try {
      await api.delete(`/classes/${row.id}`);
      toast.success("Class deleted successfully.");
      fetchClasses();
      fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Delete failed."
      );
    }
  };

  // Form handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    createClass();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    editClass();
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name,
      department_id: row.department_id,
      class_master_id: row.class_master_id,
      registration_fee: row.registration_fee,
      bus_fee: row.bus_fee,
      internship_fee: row.internship_fee,
      remedial_fee: row.remedial_fee,
      tuition_fee: row.tuition_fee,
      pta_fee: row.pta_fee,
      total_fee: row.total_fee,
      suspended: row.suspended === "Suspended",
    });
    setEditModalOpen(true);
  };

  const closeCreateModal = () => {
    resetForm();
    setCreateModalOpen(false);
  };

  const closeEditModal = () => {
    resetForm();
    setEditModalOpen(false);
  };

  const handleRowClick = (row) => setSelectedRow(row);
  const closeModal = () => setSelectedRow(null);

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  return (
    <SideTop>
      <div className="class-page">
        <div className="class-page-header">
          <h2 className="class-page-title">Classes</h2>
          <button
            className="class-btn-create class-btn-desktop"
            onClick={openCreateModal}
          >
            <FaPlus />
            <span>Create Class</span>
          </button>
        </div>

        <Stats data={stats} />

        {/* Mobile FAB */}
        <button
          className="class-btn-create class-btn-mobile-fab"
          onClick={openCreateModal}
          aria-label="Create Class"
        >
          <FaPlus />
        </button>

        <div className="class-table-container">
          <DataTable
            columns={columns}
            data={data}
            onEdit={handleEdit}
            onDelete={deleteClass}
            loading={isLoading}
            limit={12}
            onRowClick={handleRowClick}
            warnDelete={() => {}}
            filterCategories={filters}
          />
        </div>

        {/* Create Modal */}
        <ClassModal
          isOpen={createModalOpen}
          onClose={closeCreateModal}
          title="Create Class"
        >
          <form onSubmit={handleCreateSubmit} className="class-modal-form">
            <CustomInput
              label="Name"
              type="text"
              value={form.name}
              onChange={handleUpdateForm}
              name="name"
              error={formErrors.name}
            />

            <div className="class-form-group">
              <label className="class-form-label">Department</label>
              <Select
                options={departments}
                value={departments.find((d) => d.value === form.department_id)}
                onChange={(selected) =>
                  handleUpdateForm("department_id", selected?.value || null)
                }
                isSearchable
                placeholder="Select Department"
                className="class-react-select"
                classNamePrefix="class-select"
              />
              {formErrors.department_id && (
                <p className="class-form-error">{formErrors.department_id}</p>
              )}
            </div>

            <div className="class-form-group">
              <label className="class-form-label">Class Master</label>
              <Select
                options={teachers}
                value={teachers.find((t) => t.value === form.class_master_id)}
                onChange={(selected) =>
                  handleUpdateForm("class_master_id", selected?.value || null)
                }
                isSearchable
                placeholder="Select Class Master"
                className="class-react-select"
                classNamePrefix="class-select"
              />
              {formErrors.class_master_id && (
                <p className="class-form-error">{formErrors.class_master_id}</p>
              )}
            </div>

            {/* Fees */}
            <div className="class-fees-section">
              <h4 className="class-section-title">Fee Structure</h4>
              <div className="class-fees-grid">
                {[
                  { key: "registration_fee", label: "Registration Fee" },
                  { key: "bus_fee", label: "Bus Fee" },
                  { key: "internship_fee", label: "Internship Fee" },
                  { key: "remedial_fee", label: "Remedial Fee" },
                  { key: "tuition_fee", label: "Tuition Fee" },
                  { key: "pta_fee", label: "PTA Fee" },
                ].map((fee) => (
                  <CustomInput
                    key={fee.key}
                    label={fee.label}
                    value={form[fee.key]}
                    onChange={handleUpdateForm}
                    name={fee.key}
                    type="number"
                  />
                ))}
              </div>
            </div>

            <CustomDropdown
              label={"Status"}
              options={["Active", "Suspended"]}
              value={form.suspended}
              onChange={handleUpdateForm}
              name={"suspended"}
            />

            <SubmitBtn
              title={createLoading ? "Creating..." : "Create"}
              disabled={createLoading}
            />
          </form>
        </ClassModal>

        {/* Edit Modal */}
        <ClassModal
          isOpen={editModalOpen}
          onClose={closeEditModal}
          title="Edit Class"
        >
          <form onSubmit={handleEditSubmit} className="class-modal-form">
            <CustomInput
              label="Name"
              type="text"
              value={form.name}
              onChange={handleUpdateForm}
              name="name"
              error={formErrors.name}
            />

            <div className="class-form-group">
              <label className="class-form-label">Department</label>
              <Select
                options={departments}
                value={departments.find((d) => d.value === form.department_id)}
                onChange={(selected) =>
                  handleUpdateForm("department_id", selected?.value || null)
                }
                isSearchable
                placeholder="Select Department"
                className="class-react-select"
                classNamePrefix="class-select"
              />
              {formErrors.department_id && (
                <p className="class-form-error">{formErrors.department_id}</p>
              )}
            </div>

            <div className="class-form-group">
              <label className="class-form-label">Class Master</label>
              <Select
                options={teachers}
                value={teachers.find((t) => t.value === form.class_master_id)}
                onChange={(selected) =>
                  handleUpdateForm("class_master_id", selected?.value || null)
                }
                isSearchable
                placeholder="Select Class Master"
                className="class-react-select"
                classNamePrefix="class-select"
              />
              {formErrors.class_master_id && (
                <p className="class-form-error">{formErrors.class_master_id}</p>
              )}
            </div>

            <div className="class-fees-section">
              <h4 className="class-section-title">Fee Structure</h4>
              <div className="class-fees-grid">
                {[
                  "registration_fee",
                  "bus_fee",
                  "internship_fee",
                  "remedial_fee",
                  "tuition_fee",
                  "pta_fee",
                ].map((fee) => (
                  <CustomInput
                    key={fee}
                    label={capitalizeWords(fee)}
                    value={
                      form[fee] != null
                        ? String(form[fee]).replace(/\s+/g, "")
                        : ""
                    }
                    onChange={handleUpdateForm}
                    name={fee}
                    type="number"
                  />
                ))}
              </div>
            </div>

            <CustomDropdown
              label={"Status"}
              options={["Active", "Suspended"]}
              value={form.suspended !== "Suspended" ? "Active" : "Suspended"}
              onChange={handleUpdateForm}
              name={"suspended"}
            />

            <SubmitBtn
              title={editLoading ? "Saving..." : "Save"}
              disabled={editLoading}
            />
          </form>
        </ClassModal>

        {/* Details Modal */}
        <ClassModal
          isOpen={!!selectedRow}
          onClose={closeModal}
          title="Class Details"
        >
          {selectedRow && (
            <div className="class-details-card">
              <header className="class-details-header">
                <div className="class-details-title-wrapper">
                  <h2 className="class-details-title">
                    {selectedRow.department} {selectedRow.name}
                  </h2>
                  <span
                    className={`class-status-badge ${
                      selectedRow.suspended === "Suspended"
                        ? "suspended"
                        : "active"
                    }`}
                  >
                    {selectedRow.suspended === "Suspended"
                      ? "Suspended"
                      : "Active"}
                  </span>
                </div>
              </header>

              <section className="class-details-body">
                <div className="class-info-group">
                  <div className="class-info-item">
                    <span className="class-info-label">Department</span>
                    <span className="class-info-value">
                      {selectedRow.department}
                    </span>
                  </div>
                  <div className="class-info-item">
                    <span className="class-info-label">Class Master</span>
                    <span className="class-info-value">
                      {selectedRow.classMaster}
                    </span>
                  </div>
                </div>

                <div className="class-fee-group">
                  <h4 className="class-fee-title">Fees Overview</h4>
                  <div className="class-fee-list">
                    <div className="class-fee-item">
                      <span>Registration Fee</span>
                      <span className="class-fee-value">
                        {selectedRow.registration_fee || "N/A"}
                      </span>
                    </div>
                    <div className="class-fee-item">
                      <span>Bus Fee</span>
                      <span className="class-fee-value">
                        {selectedRow.bus_fee || "N/A"}
                      </span>
                    </div>
                    <div className="class-fee-item">
                      <span>Internship Fee</span>
                      <span className="class-fee-value">
                        {selectedRow.internship_fee || "N/A"}
                      </span>
                    </div>
                    <div className="class-fee-item">
                      <span>Remedial Fee</span>
                      <span className="class-fee-value">
                        {selectedRow.remedial_fee || "N/A"}
                      </span>
                    </div>
                    <div className="class-fee-item">
                      <span>Tuition Fee</span>
                      <span className="class-fee-value">
                        {selectedRow.tuition_fee || "N/A"}
                      </span>
                    </div>
                    <div className="class-fee-item">
                      <span>PTA Fee</span>
                      <span className="class-fee-value">
                        {selectedRow.pta_fee || "N/A"}
                      </span>
                    </div>
                    <div className="class-fee-item class-fee-total">
                      <span>Total Fee</span>
                      <span className="class-fee-value">
                        {`${selectedRow.total_fee} FCFA` || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </ClassModal>
      </div>
    </SideTop>
  );
};
