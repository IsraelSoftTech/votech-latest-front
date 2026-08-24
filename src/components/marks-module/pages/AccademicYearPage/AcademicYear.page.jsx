import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import SideTop from "../../../SideTop";
import DataTable from "../../components/DataTable/DataTable.component";
import "./AcademicYear.styles.css";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
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
  FaExclamationTriangle,
  FaExchangeAlt,
  FaUnlockAlt,
} from "react-icons/fa";

// The backend puts the actual reason in response.data.message (see
// error.controller.js), .details is never sent by anything in this app,
// keeping it here too only as a harmless extra fallback in case that
// changes. err?.message is the last resort, a generic axios/network string.
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.details ||
  err?.message ||
  fallback;

const GRANT_DURATIONS = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "14 days", hours: 336 },
  { label: "30 days", hours: 720 },
];

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
  const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");
  const role = authUser.role;
  const isReadOnly = role === "Admin1";
  const isAdmin1 = role === "Admin1";
  const isAdmin3 = role === "Admin3";

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
  });
  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [stats, setStats] = useState([]);

  // Year switch flow (Admin3 only)
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [switchForm, setSwitchForm] = useState({
    target_year_id: null,
    password: "",
    confirm_non_default: false,
  });
  const [switchLoading, setSwitchLoading] = useState(false);

  // Access grants (Admin1 only)
  const [grants, setGrants] = useState([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [admin3Users, setAdmin3Users] = useState([]);
  const [grantForm, setGrantForm] = useState({
    academic_year_id: null,
    is_global: false,
    admin3_user_ids: [],
    reason: "",
    duration_hours: GRANT_DURATIONS[1].hours,
    password: "",
  });
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokePassword, setRevokePassword] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Popup shown (in addition to the toast) whenever a blocking/destructive
  // action fails, so the reason is impossible to miss, not just a toast
  // that can be scrolled past or dismissed before it's read.
  const [actionError, setActionError] = useState(null); // { title, message }
  const showActionError = (title, err, fallback) => {
    const message = getErrorMessage(err, fallback);
    toast.error(message);
    setActionError({ title, message });
  };

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
      toast.error(getErrorMessage(err, "Failed to load academic years."));
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
      toast.error(getErrorMessage(err, "Error fetching statistics"));
      setStats([]);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchStats();
  }, []);

  const fetchGrants = async () => {
    try {
      setGrantsLoading(true);
      const res = await api.get("/academic-year-grants");
      setGrants(res?.data?.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load access grants."));
      setGrants([]);
    } finally {
      setGrantsLoading(false);
    }
  };

  const fetchAdmin3Users = async () => {
    try {
      const res = await fetch(`${subBaseURL}/users`, { headers: headers() });
      const list = await res.json();
      setAdmin3Users(
        Array.isArray(list) ? list.filter((u) => u.role === "Admin3") : []
      );
    } catch (err) {
      toast.error("Failed to load Admin3 users.");
    }
  };

  useEffect(() => {
    if (isAdmin1) {
      fetchGrants();
      fetchAdmin3Users();
    }
  }, [isAdmin1]);

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
      toast.error(getErrorMessage(err, "Failed to create academic year."));
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
      toast.error(getErrorMessage(err, "Failed to update academic year."));
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
    editYear();
  };

  // Open edit modal
  const handleEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
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
      showActionError(
        `Can't Delete "${row.name}"`,
        err,
        "Delete failed."
      );
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

  // ─── Year switch ─────────────────────────────────────────────────────

  const fetchChecklist = async () => {
    try {
      setChecklistLoading(true);
      const res = await api.get("/academic-years/switch-checklist");
      const d = res?.data?.data;
      setChecklist(d);
      setSwitchForm((prev) => ({
        ...prev,
        target_year_id: d?.default_next_year?.id || null,
        confirm_non_default: false,
      }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load the year switch checklist."));
    } finally {
      setChecklistLoading(false);
    }
  };

  const openSwitchModal = () => {
    setSwitchForm({ target_year_id: null, password: "", confirm_non_default: false });
    setSwitchModalOpen(true);
    fetchChecklist();
  };
  const closeSwitchModal = () => {
    setSwitchModalOpen(false);
    setChecklist(null);
  };

  const switchTargetOptions = checklist
    ? [checklist.default_next_year, ...(checklist.other_years || [])]
        .filter(Boolean)
        .map((y) => ({ value: y.id, label: y.name }))
    : [];

  const isNonDefaultTarget =
    checklist?.default_next_year &&
    switchForm.target_year_id &&
    switchForm.target_year_id !== checklist.default_next_year.id;

  const switchBlocked =
    !!checklist &&
    (checklist.promotion_run_in_progress ||
      (checklist.blocking_classes || []).length > 0);

  const handleSwitchSubmit = async (e) => {
    e.preventDefault();
    if (!switchForm.target_year_id) {
      toast.error("Choose which academic year to switch to.");
      return;
    }
    if (isNonDefaultTarget && !switchForm.confirm_non_default) {
      toast.error("Confirm that skipping the suggested next year is intentional.");
      return;
    }
    if (!switchForm.password) {
      toast.error("Enter your password to confirm this action.");
      return;
    }
    try {
      setSwitchLoading(true);
      await api.post("/academic-years/switch", switchForm);
      toast.success("Academic year switched successfully.");
      closeSwitchModal();
      fetchAcademicYears();
      fetchStats();
    } catch (err) {
      showActionError("Can't Switch Academic Year", err, "Failed to switch academic year.");
    } finally {
      setSwitchLoading(false);
    }
  };

  // ─── Access grants ───────────────────────────────────────────────────

  const openGrantModal = () => {
    setGrantForm({
      academic_year_id: null,
      is_global: false,
      admin3_user_ids: [],
      reason: "",
      duration_hours: GRANT_DURATIONS[1].hours,
      password: "",
    });
    setGrantModalOpen(true);
  };
  const closeGrantModal = () => setGrantModalOpen(false);

  const grantableYears = data.filter((y) => y.status !== "active");

  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!grantForm.academic_year_id) {
      toast.error("Choose which academic year to grant access to.");
      return;
    }
    if (!grantForm.is_global && grantForm.admin3_user_ids.length === 0) {
      toast.error(
        "Choose at least one Admin3 user, or grant access to all of them."
      );
      return;
    }
    if (!grantForm.password) {
      toast.error("Enter your password to confirm this action.");
      return;
    }
    try {
      setGrantLoading(true);
      const expires_at = new Date(
        Date.now() + grantForm.duration_hours * 60 * 60 * 1000
      ).toISOString();
      await api.post("/academic-year-grants", {
        academic_year_id: grantForm.academic_year_id,
        is_global: grantForm.is_global,
        admin3_user_ids: grantForm.admin3_user_ids,
        reason: grantForm.reason,
        expires_at,
        password: grantForm.password,
      });
      toast.success("Access grant created.");
      closeGrantModal();
      fetchGrants();
    } catch (err) {
      showActionError("Can't Grant Access", err, "Failed to create the access grant.");
    } finally {
      setGrantLoading(false);
    }
  };

  const openRevokeConfirm = (row) => {
    setRevokeTarget(row);
    setRevokePassword("");
  };
  const closeRevokeConfirm = () => {
    setRevokeTarget(null);
    setRevokePassword("");
  };

  const handleRevoke = async () => {
    if (!revokePassword) {
      toast.error("Enter your password to confirm this action.");
      return;
    }
    try {
      setRevokeLoading(true);
      await api.post(`/academic-year-grants/${revokeTarget.id}/revoke`, {
        password: revokePassword,
      });
      toast.success("Access grant revoked.");
      closeRevokeConfirm();
      fetchGrants();
    } catch (err) {
      showActionError("Can't Revoke Access", err, "Failed to revoke the access grant.");
    } finally {
      setRevokeLoading(false);
    }
  };

  const grantsData = grants.map((g, i) => ({ ...g, sn: i + 1 }));

  const grantColumns = [
    { label: "S/N", accessor: "sn" },
    {
      label: "Academic Year",
      accessor: "year_name",
      render: (row) => row.academic_year?.name || "Unknown year",
    },
    {
      label: "Scope",
      accessor: "scope",
      render: (row) =>
        row.is_global
          ? "All Admin3 users"
          : `${(row.admin3_user_ids || []).length} named user(s)`,
    },
    {
      label: "Granted By",
      accessor: "grantor_name",
      render: (row) => row.grantor?.name || row.grantor?.username || "Unknown",
    },
    {
      label: "Expires",
      accessor: "expires_at",
      render: (row) => new Date(row.expires_at).toLocaleString(),
    },
    {
      label: "Status",
      accessor: "grant_status",
      render: (row) => {
        if (row.revoked_at)
          return <span className="academic-status-archived">Revoked</span>;
        if (new Date(row.expires_at) <= new Date())
          return <span className="academic-status-archived">Expired</span>;
        return <span className="academic-status-active">Live</span>;
      },
    },
    { label: "Reason", accessor: "reason" },
  ];

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

        <div className="academic-toolbar">
          {!isReadOnly && (
            <button className="academic-btn-create" onClick={openCreateModal}>
              Create Academic Year
            </button>
          )}
          {isAdmin3 && (
            <button className="academic-btn-secondary" onClick={openSwitchModal}>
              <FaExchangeAlt /> Switch Academic Year
            </button>
          )}
        </div>

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
          userRole={role}
        />

        {isAdmin1 && (
          <div className="academic-grants-section">
            <div className="academic-toolbar">
              <h3 className="academic-section-title">
                <FaUnlockAlt /> Archived Year Access Grants
              </h3>
              <button className="academic-btn-secondary" onClick={openGrantModal}>
                Grant Access
              </button>
            </div>
            <p className="academic-section-hint">
              A grant lets a chosen Admin3 user, or all Admin3 users, edit one
              archived academic year for a limited time, without changing
              which year is currently active for everyone else.
            </p>
            <DataTable
              columns={grantColumns}
              data={grantsData}
              loading={grantsLoading}
              limit={10}
              editRoles={[]}
              deleteRoles={[]}
              userRole={role}
              extraActions={[
                {
                  icon: <FaTimes />,
                  title: "Revoke",
                  onClick: openRevokeConfirm,
                  isVisible: (row) =>
                    !row.revoked_at && new Date(row.expires_at) > new Date(),
                },
              ]}
            />
          </div>
        )}

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
            <p className="academic-section-hint">
              The first academic year ever created becomes the active year
              automatically. Every year after that starts archived, use
              "Switch Academic Year" to make it active when it's time.
            </p>
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

            <SubmitBtn
              title={editLoading ? "Saving changes..." : "Save Changes"}
              disabled={editLoading}
            />
          </form>
        </AcademicYearModal>

        {/* Switch Academic Year Modal */}
        <AcademicYearModal
          isOpen={switchModalOpen}
          onClose={closeSwitchModal}
          title="Switch Academic Year"
        >
          {checklistLoading && (
            <p className="academic-section-hint">Loading checklist...</p>
          )}

          {!checklistLoading && checklist && !checklist.active_year && (
            <p className="academic-section-hint">
              No academic year has been created yet. Create the first one
              before switching.
            </p>
          )}

          {!checklistLoading && checklist && checklist.active_year && (
            <form onSubmit={handleSwitchSubmit} className="academic-modal-form">
              <div className="academic-warning-banner">
                <FaExclamationTriangle />
                <div>
                  <strong>This changes what everyone sees.</strong> Once you
                  switch, every user immediately starts working in the new
                  year. This cannot be undone by switching back, the old
                  year becomes read-only unless you grant access to it.
                </div>
              </div>

              <p className="academic-section-hint">
                Currently active: <strong>{checklist.active_year.name}</strong>
              </p>

              {checklist.promotion_run_in_progress && (
                <div className="academic-blocking-banner">
                  <FaExclamationTriangle /> A promotion run is currently in
                  progress. You cannot switch years until it finishes.
                </div>
              )}

              {(checklist.blocking_classes || []).length > 0 && (
                <div className="academic-blocking-banner">
                  <FaExclamationTriangle /> These classes still have students
                  who have not been promoted out of{" "}
                  {checklist.active_year.name}:{" "}
                  {checklist.blocking_classes.map((c) => c.name).join(", ")}.
                  Run or finish their promotion first.
                </div>
              )}

              {switchTargetOptions.length === 0 ? (
                <p className="academic-section-hint">
                  No later academic year exists yet. Create one first.
                </p>
              ) : (
                <>
                  <div className="ci-wrapper">
                    <label className="ci-label">
                      Switch to <span className="ci-required">*</span>
                    </label>
                    <Select
                      classNamePrefix="select"
                      options={switchTargetOptions}
                      value={
                        switchTargetOptions.find(
                          (o) => o.value === switchForm.target_year_id
                        ) || null
                      }
                      onChange={(opt) =>
                        setSwitchForm((prev) => ({
                          ...prev,
                          target_year_id: opt?.value || null,
                          confirm_non_default: false,
                        }))
                      }
                    />
                  </div>

                  {isNonDefaultTarget && (
                    <div className="academic-blocking-banner">
                      <FaExclamationTriangle /> This skips over{" "}
                      {checklist.default_next_year.name}, which would
                      normally come next.
                      <label className="academic-confirm-checkbox">
                        <input
                          type="checkbox"
                          checked={switchForm.confirm_non_default}
                          onChange={(e) =>
                            setSwitchForm((prev) => ({
                              ...prev,
                              confirm_non_default: e.target.checked,
                            }))
                          }
                        />
                        I understand and want to skip ahead anyway
                      </label>
                    </div>
                  )}

                  <CustomInput
                    label="Confirm your password"
                    type="password"
                    name="password"
                    value={switchForm.password}
                    required
                    onChange={(name, value) =>
                      setSwitchForm((prev) => ({ ...prev, password: value }))
                    }
                    onClear={() =>
                      setSwitchForm((prev) => ({ ...prev, password: "" }))
                    }
                  />

                  <SubmitBtn
                    title={switchLoading ? "Switching..." : "Switch Academic Year"}
                    disabled={switchLoading || switchBlocked}
                  />
                </>
              )}
            </form>
          )}
        </AcademicYearModal>

        {/* Grant Access Modal */}
        <AcademicYearModal
          isOpen={grantModalOpen}
          onClose={closeGrantModal}
          title="Grant Archived Year Access"
        >
          <form onSubmit={handleGrantSubmit} className="academic-modal-form">
            <div className="academic-warning-banner">
              <FaExclamationTriangle />
              <div>
                This temporarily unlocks write access to one archived year
                for the people you choose. It does not change the active
                year for anyone else.
              </div>
            </div>

            <div className="ci-wrapper">
              <label className="ci-label">
                Academic Year <span className="ci-required">*</span>
              </label>
              <Select
                classNamePrefix="select"
                placeholder="Select an archived year"
                options={grantableYears.map((y) => ({
                  value: y.id,
                  label: `${y.name} (${y.status})`,
                }))}
                value={
                  grantForm.academic_year_id
                    ? {
                        value: grantForm.academic_year_id,
                        label: grantableYears.find(
                          (y) => y.id === grantForm.academic_year_id
                        )?.name,
                      }
                    : null
                }
                onChange={(opt) =>
                  setGrantForm((prev) => ({
                    ...prev,
                    academic_year_id: opt?.value || null,
                  }))
                }
              />
            </div>

            <label className="academic-confirm-checkbox">
              <input
                type="checkbox"
                checked={grantForm.is_global}
                onChange={(e) =>
                  setGrantForm((prev) => ({
                    ...prev,
                    is_global: e.target.checked,
                    admin3_user_ids: e.target.checked ? [] : prev.admin3_user_ids,
                  }))
                }
              />
              Grant to all Admin3 users
            </label>

            {!grantForm.is_global && (
              <div className="ci-wrapper">
                <label className="ci-label">
                  Named Admin3 Users <span className="ci-required">*</span>
                </label>
                <Select
                  classNamePrefix="select"
                  isMulti
                  placeholder="Select one or more users"
                  options={admin3Users.map((u) => ({
                    value: u.id,
                    label: u.name || u.username,
                  }))}
                  value={admin3Users
                    .filter((u) => grantForm.admin3_user_ids.includes(u.id))
                    .map((u) => ({ value: u.id, label: u.name || u.username }))}
                  onChange={(opts) =>
                    setGrantForm((prev) => ({
                      ...prev,
                      admin3_user_ids: (opts || []).map((o) => o.value),
                    }))
                  }
                />
              </div>
            )}

            <CustomDropdown
              label="Expires In"
              required
              options={GRANT_DURATIONS.map((d) => d.label)}
              value={
                GRANT_DURATIONS.find((d) => d.hours === grantForm.duration_hours)
                  ?.label
              }
              name="duration_hours"
              onClear={() => {}}
              onChange={(name, value) => {
                const found = GRANT_DURATIONS.find((d) => d.label === value);
                setGrantForm((prev) => ({
                  ...prev,
                  duration_hours: found ? found.hours : prev.duration_hours,
                }));
              }}
            />

            <CustomInput
              label="Reason"
              name="reason"
              value={grantForm.reason}
              placeholder="Why this access is needed (kept in the audit trail)"
              onChange={(name, value) =>
                setGrantForm((prev) => ({ ...prev, reason: value }))
              }
              onClear={() => setGrantForm((prev) => ({ ...prev, reason: "" }))}
            />

            <CustomInput
              label="Confirm your password"
              type="password"
              name="password"
              value={grantForm.password}
              required
              onChange={(name, value) =>
                setGrantForm((prev) => ({ ...prev, password: value }))
              }
              onClear={() => setGrantForm((prev) => ({ ...prev, password: "" }))}
            />

            <SubmitBtn
              title={grantLoading ? "Granting..." : "Grant Access"}
              disabled={grantLoading}
            />
          </form>
        </AcademicYearModal>

        {/* Revoke Confirm Modal */}
        <AcademicYearModal
          isOpen={!!revokeTarget}
          onClose={closeRevokeConfirm}
          title="Revoke Access Grant"
        >
          {revokeTarget && (
            <div className="academic-confirm-content">
              <p className="academic-confirm-text">
                Revoke {revokeTarget.is_global ? "the global" : "this"} grant
                to <strong>{revokeTarget.academic_year?.name}</strong>? Anyone
                currently using it will lose write access immediately.
              </p>
              <CustomInput
                label="Confirm your password"
                type="password"
                name="revokePassword"
                value={revokePassword}
                required
                onChange={(name, value) => setRevokePassword(value)}
                onClear={() => setRevokePassword("")}
              />
              <div className="academic-confirm-buttons">
                <button
                  className="academic-btn-cancel"
                  type="button"
                  onClick={closeRevokeConfirm}
                >
                  Cancel
                </button>
                <button
                  className="academic-btn-confirm"
                  type="button"
                  disabled={revokeLoading}
                  onClick={handleRevoke}
                >
                  {revokeLoading ? "Revoking..." : "Yes, Revoke"}
                </button>
              </div>
            </div>
          )}
        </AcademicYearModal>

        {/* Action Error Popup, shown alongside the toast whenever a
            blocking/destructive action fails, since a toast alone can be
            missed, especially once a confirm modal has already closed. */}
        <AcademicYearModal
          isOpen={!!actionError}
          onClose={() => setActionError(null)}
          title={actionError?.title || "Action Failed"}
        >
          {actionError && (
            <div className="academic-confirm-content">
              <div className="academic-warning-banner">
                <FaExclamationTriangle />
                <div>{actionError.message}</div>
              </div>
              <div className="academic-confirm-buttons">
                <button
                  className="academic-btn-confirm"
                  type="button"
                  onClick={() => setActionError(null)}
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </AcademicYearModal>
      </div>
    </SideTop>
  );
};
