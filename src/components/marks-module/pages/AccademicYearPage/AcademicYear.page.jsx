import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import Modal from "../../components/Modal/Modal.component";
import { DetailGrid, DetailRow } from "../../components/DetailGrid/DetailGrid.component";
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


export const AcademicYear = () => {
  const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");
  const role = authUser.role;
  const isReadOnly = role === "Admin1";
  const isAdmin1 = role === "Admin1";
  const isAdmin3 = role === "Admin3";
  const navigate = useNavigate();

  const columns = [
    { label: "S/N", accessor: "sn" },
    { label: "Name", accessor: "name" },
    { label: "Start Date", accessor: "start_date" },
    { label: "End Date", accessor: "end_date" },
    { label: "Status", accessor: "status" },
  ];

  const [data, setData] = useState([]);
  // const [selectedRow, setSelectedRow] = useState(null); // retired with the details modal
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
  // Stat cards are derived from the same list the table renders (not a
  // second /content endpoint), so the two can never disagree, e.g. when a
  // count included rows the table did not show.
  const stats = useMemo(
    () => [
      { title: "Number of Academic Years", value: data.length, icon: FaCalendarCheck },
      {
        title: "Archived Academic Years",
        value: data.filter((y) => y.status === "archived").length,
        icon: FaCalendarAlt,
      },
    ],
    [data]
  );

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

  // Carrying values into the new year is no longer a separate Admin1
  // action — it is a step of the Admin3 switch-year flow below, asked as a
  // plain question once the switch has been confirmed. See
  // handleSwitchSubmit / confirmSwitch.
  const [carryForwardPrompt, setCarryForwardPrompt] = useState(null);
  const [carryForwardResult, setCarryForwardResult] = useState(null);

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

  // Retired 2026-09-12: stats are derived from `data` above.
  // const fetchStats = async () => {
  //   try {
  //     const res = await api.get("/content/academic-years");
  //     const icons = [FaCalendarCheck, FaCalendarAlt];
  // 
  //     const stats = res?.data?.data?.stats;
  //     const safeStats = Array.isArray(stats)
  //       ? stats.map((d, i) => ({ ...d, icon: icons[i] }))
  //       : [];
  //     setStats(safeStats);
  //   } catch (err) {
  //     toast.error(getErrorMessage(err, "Error fetching statistics"));
  //     setStats([]);
  //   }
  // };

  useEffect(() => {
    fetchAcademicYears();
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
    } catch (err) {
      showActionError(
        `Can't Delete "${row.name}"`,
        err,
        "Delete failed."
      );
    }
  };

  // Row click
  // Row click opens the year's detail page (stats, coverage, activity log,
  // grants), the old in-place details modal is retired below.
  const handleRowClick = (row) => navigate(`/academics/academic-years/${row.id}`);
  // const closeModal = () => setSelectedRow(null); // retired with the details modal

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

    // A brand new year starts with none of the setup the school already
    // did this year, so ask before switching rather than leaving them to
    // discover it empty. Carry-forward copies FROM the year that is active
    // right now, so it has to run before the switch, not after.
    const targetYear = switchTargetOptions.find(
      (o) => o.value === switchForm.target_year_id
    );
    setCarryForwardPrompt({
      targetYearId: switchForm.target_year_id,
      targetYearName: targetYear?.label || "the new year",
    });
  };

  // Runs the switch itself, optionally carrying this year's values into
  // the new year first. Both calls reuse the password already entered on
  // the switch form, so the admin confirms once, not twice.
  const runSwitch = async ({ carryForward }) => {
    setCarryForwardPrompt(null);
    setCarryForwardResult(null);

    try {
      setSwitchLoading(true);

      if (carryForward) {
        const res = await api.post("/academic-years/carry-forward", {
          target_year_id: switchForm.target_year_id,
          password: switchForm.password,
        });
        setCarryForwardResult(res?.data?.data || null);
      }

      await api.post("/academic-years/switch", switchForm);
      toast.success(
        carryForward
          ? "Values carried over and academic year switched successfully."
          : "Academic year switched successfully."
      );
      closeSwitchModal();
      fetchAcademicYears();
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

  const activeYear = data.find((y) => y.status === "active") || null;

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
        <PageHeader
          title="Academic Years"
          subtitle={
            isReadOnly ? (
              <span className="academic-read-only-badge">
                <FaLock /> Read Only
              </span>
            ) : null
          }
        />

        <Stats data={stats} loading={isLoading} skeletonCount={2} />

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

        {/* Carrying values into a new year used to be a standalone Admin1
            action here. It now belongs to whoever moves the school into
            that year, so it is asked as a step of the Admin3 switch-year
            flow instead — see the confirmation below the switch modal. */}

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

        {/* Details Modal, retired 2026-09-12 in favour of the detail page
            (AcademicYearDetail.page.jsx), see handleRowClick.
        <Modal
          isOpen={!!selectedRow}
          onClose={closeModal}
          title="Academic Year Details"
        >
          {selectedRow && (
            <DetailGrid>
              <DetailRow label="Name" value={selectedRow.name} />
              <DetailRow label="Start Date" value={selectedRow.start_date} />
              <DetailRow label="End Date" value={selectedRow.end_date} />
              <DetailRow
                label="Status"
                value={
                  <span
                    className={`academic-status-${selectedRow.status.toLowerCase()}`}
                  >
                    {selectedRow.status}
                  </span>
                }
              />
            </DetailGrid>
          )}
        </Modal>
        */}

        {/* Create Modal */}
        <Modal
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
        </Modal>

        {/* Edit Modal */}
        <Modal
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
        </Modal>

        {/* Switch Academic Year Modal */}
        <Modal
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
                    title={switchLoading ? "Switching..." : "Continue"}
                    disabled={switchLoading || switchBlocked}
                  />
                </>
              )}
            </form>
          )}
        </Modal>

        {/* Grant Access Modal */}
        <Modal
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
        </Modal>

        {/* Carry-forward question, asked as the last step of switching
            year. Everything listed here is year-scoped, so without it the
            new year starts blank and all of it has to be set up again by
            hand. Answering either way still performs the switch. */}
        <Modal
          isOpen={!!carryForwardPrompt}
          onClose={() => !switchLoading && setCarryForwardPrompt(null)}
          title="Carry Over Your Setup"
        >
          {carryForwardPrompt && (
            <div className="academic-confirm-content">
              <p className="academic-confirm-text">
                Hey {authUser?.name || authUser?.username || "there"}, would you
                like to carry over your current values to{" "}
                <strong>{carryForwardPrompt.targetYearName}</strong>?
              </p>

              <DetailGrid>
                <DetailRow label="Subject coefficients and categories" value="Yes" />
                <DetailRow label="Class names and departments" value="Yes" />
                <DetailRow label="Class masters" value="Yes" />
                <DetailRow label="Subject and teacher assignments" value="Yes" />
                <DetailRow label="Grading bands and comments" value="Yes" />
                <DetailRow label="School name and principal" value="Yes" />
              </DetailGrid>

              <p className="academic-section-hint">
                If you say yes, all of it is copied into the new year so you can
                edit it there as things change. Nothing in{" "}
                {activeYear?.name || "the current year"} is altered. If you say
                no, the new year starts empty and you will need to set each of
                these up again yourself.
              </p>

              <div className="academic-confirm-buttons">
                <button
                  className="academic-btn-cancel"
                  type="button"
                  onClick={() => runSwitch({ carryForward: false })}
                  disabled={switchLoading}
                >
                  No, start fresh
                </button>
                <button
                  className="academic-btn-confirm"
                  type="button"
                  onClick={() => runSwitch({ carryForward: true })}
                  disabled={switchLoading}
                >
                  {switchLoading ? "Working..." : "Yes, carry them over"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* What actually got copied, shown after the switch completes so
            the counts aren't lost behind the closing switch modal. */}
        <Modal
          isOpen={!!carryForwardResult}
          onClose={() => setCarryForwardResult(null)}
          title="Values Carried Over"
        >
          {carryForwardResult && (
            <div className="academic-confirm-content">
              <p className="academic-confirm-text">
                Carried <strong>{carryForwardResult.source_year?.name}</strong>{" "}
                forward into{" "}
                <strong>{carryForwardResult.target_year?.name}</strong>:
              </p>
              <DetailGrid>
                <DetailRow
                  label="Subject/teacher assignments created"
                  value={carryForwardResult.class_subjects_created}
                />
                <DetailRow
                  label="Class master assignments created"
                  value={carryForwardResult.class_master_assignments_created}
                />
                <DetailRow
                  label="Subject coefficients/categories created"
                  value={carryForwardResult.subject_year_settings_created}
                />
                <DetailRow
                  label="Class names/departments created"
                  value={carryForwardResult.class_year_settings_created}
                />
                <DetailRow
                  label="Grading bands created"
                  value={carryForwardResult.academic_bands_created}
                />
                <DetailRow
                  label="School name/principal created"
                  value={carryForwardResult.school_setting_years_created}
                />
              </DetailGrid>
              <div className="academic-confirm-buttons">
                <button
                  className="academic-btn-confirm"
                  type="button"
                  onClick={() => setCarryForwardResult(null)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Revoke Confirm Modal */}
        <Modal
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
        </Modal>

        {/* Action Error Popup, shown alongside the toast whenever a
            blocking/destructive action fails, since a toast alone can be
            missed, especially once a confirm modal has already closed. */}
        <Modal
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
        </Modal>
      </div>
    </SideTop>
  );
};
