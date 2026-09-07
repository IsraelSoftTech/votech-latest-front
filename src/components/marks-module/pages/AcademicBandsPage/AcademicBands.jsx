import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaLock, FaPlus, FaCopy, FaEdit, FaLayerGroup, FaCheckCircle, FaBan } from "react-icons/fa";
import Select from "react-select";
import SideTop from "../../../SideTop";
import api, { headers, subBaseURL } from "../../utils/api";
import DataTable from "../../components/DataTable/DataTable.component";
import Modal from "../../components/Modal/Modal.component";
import { CustomInput, SubmitBtn } from "../../components/Inputs/CustumInputs";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { DetailGrid, DetailRow } from "../../components/DetailGrid/DetailGrid.component";
import Stats from "../../components/Stats/Stats.component";
import { useYearScope } from "../../../../hooks/useYearScope";
import { YearScopeBanner } from "../../components/YearScopeBanner/YearScopeBanner.component";
import "./AcademicBands.styles.css";

const BANDS_FILTER_OPTIONS = [
  { value: "all", label: "All Classes" },
  { value: "set", label: "Bands Set" },
  { value: "not_set", label: "Bands Not Set" },
];

export const AcademicBandsPage = () => {
  const role = JSON.parse(sessionStorage.getItem("authUser") || "{}").role;

  // Bands are the most sensitive academics data on this page (they drive
  // pass/fail decisions), Admin3-only to edit regardless of year, same
  // restriction the backend now enforces in academicBand.route.js. Editing
  // is further narrowed by yearScope.isEditable below: even Admin3 can't
  // edit an archived year without a live grant for it.
  const isAdmin3 = role === "Admin3";
  const yearScope = useYearScope();
  const canEdit = isAdmin3 && yearScope.isEditable;

  // Data states
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [bandsData, setBandsData] = useState([]);

  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [bandsStatusFilter, setBandsStatusFilter] = useState("all");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit' or 'copy'
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);

  // Form state
  const [form, setForm] = useState({
    academic_year_id: null,
    department_id: null,
    class_id: null,
    bands: [{ band_min: "", band_max: "", comment: "" }],
  });

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, classesRes, bandsRes] = await Promise.all([
        fetch(`${subBaseURL}/specialties`, { headers: headers() }),
        api.get("/classes"),
        api.get("/academic-bands"),
      ]);

      setDepartments(await deptRes.json());
      setClasses(classesRes?.data?.data || []);
      setBandsData(bandsRes?.data?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
      setInitialLoading(false);
    }
  };

  // Filter classes by selected year and department
  const filteredClasses = classes.filter((cls) => {
    if (selectedDepartment && cls.department_id !== selectedDepartment) {
      return false;
    }
    return true;
  });

  // Get bands for a specific class
  const getBandsForClass = (classId) => {
    return bandsData.filter(
      (band) =>
        band.class_id === classId &&
        (!yearScope.selectedYearId || band.academic_year_id === yearScope.selectedYearId)
    );
  };

  // Prepare table data
  const tableDataAll = filteredClasses.map((cls) => {
    const classBands = getBandsForClass(cls.id);
    const department = departments.find((d) => d.id === cls.department_id);

    return {
      id: cls.id,
      name: cls.name,
      department: department?.name || "N/A",
      bandsCount: classBands.length,
      hasBands: classBands.length > 0,
      bands: classBands,
    };
  });

  const tableData = tableDataAll.filter((row) => {
    if (bandsStatusFilter === "set") return row.hasBands;
    if (bandsStatusFilter === "not_set") return !row.hasBands;
    return true;
  });

  // Cards: scoped to the selected year (same set tableDataAll is built
  // from), independent of the set/not-set filter above so the cards keep
  // showing the whole picture even while the table itself is filtered down.
  const bandsSetCount = tableDataAll.filter((row) => row.hasBands).length;
  const bandsNotSetCount = tableDataAll.length - bandsSetCount;
  const totalBands = tableDataAll.reduce((sum, row) => sum + row.bandsCount, 0);
  const stats = [
    { title: "Number of Bands", value: totalBands, icon: FaLayerGroup },
    { title: "Bands Set", value: bandsSetCount, icon: FaCheckCircle },
    { title: "Bands Not Set", value: bandsNotSetCount, icon: FaBan },
  ];

  const tableColumns = [
    { label: "Class Name", accessor: "name" },
    { label: "Department", accessor: "department" },
    {
      label: "Academic Bands",
      accessor: "bandsCount",
      render: (row) =>
        row.hasBands ? `${row.bandsCount} band(s)` : "No bands configured",
    },
  ];

  // Handle row click - show bands details modal
  const handleRowClick = (row) => {
    setSelectedClassDetails(row);
    setDetailsModalOpen(true);
  };

  // Close details modal
  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedClassDetails(null);
  };

  // Create bands from details modal
  const handleCreateFromDetails = () => {
    if (!selectedClassDetails) return;

    const classData = classes.find((c) => c.id === selectedClassDetails.id);

    setModalMode("create");
    setForm({
      academic_year_id: yearScope.selectedYearId,
      department_id: classData.department_id,
      class_id: selectedClassDetails.id,
      bands: [{ band_min: "", band_max: "", comment: "" }],
    });

    closeDetailsModal();
    setModalOpen(true);
  };

  // Handle edit button
  const handleEdit = (row) => {
    if (!yearScope.selectedYearId) {
      toast.error("Please select an academic year first");
      return;
    }

    const classData = classes.find((c) => c.id === row.id);
    const existingBands = getBandsForClass(row.id);

    setModalMode("edit");
    setForm({
      academic_year_id: yearScope.selectedYearId,
      department_id: classData.department_id,
      class_id: row.id,
      bands:
        existingBands.length > 0
          ? existingBands.map((b) => ({
              id: b.id,
              band_min: b.band_min,
              band_max: b.band_max,
              comment: b.comment,
            }))
          : [{ band_min: "", band_max: "", comment: "" }],
    });
    setModalOpen(true);
  };

  // Handle copy bands
  const handleCopy = (row) => {
    if (!yearScope.selectedYearId) {
      toast.error("Please select an academic year first");
      return;
    }

    const existingBands = getBandsForClass(row.id);

    if (existingBands.length === 0) {
      toast.error("No bands to copy from this class");
      return;
    }

    setModalMode("copy");
    setForm({
      academic_year_id: yearScope.selectedYearId,
      department_id: null, // User must select
      class_id: null, // User must select
      bands: existingBands.map((b) => ({
        band_min: b.band_min,
        band_max: b.band_max,
        comment: b.comment,
      })),
    });
    setModalOpen(true);
    toast.info("Bands copied! Now select the department and class to apply to");
  };

  // Handle create new
  const handleCreateNew = () => {
    if (!yearScope.selectedYearId) {
      toast.error("Please select an academic year first to create bands");
      return;
    }

    setModalMode("create");
    setForm({
      academic_year_id: yearScope.selectedYearId,
      department_id: selectedDepartment || null,
      class_id: null,
      bands: [{ band_min: "", band_max: "", comment: "" }],
    });
    setModalOpen(true);
    toast.info("Select department and class, then configure the bands");
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setForm({
      academic_year_id: null,
      department_id: null,
      class_id: null,
      bands: [{ band_min: "", band_max: "", comment: "" }],
    });
  };

  // Handle band field change
  const handleBandChange = (index, key, value) => {
    setForm((prev) => {
      const newBands = [...prev.bands];
      if (key === "comment") {
        newBands[index][key] = value;
      } else {
        newBands[index][key] =
          value === "" || value === null || value === undefined
            ? ""
            : Number(value);
      }
      return { ...prev, bands: newBands };
    });
  };

  // Add band row
  const addBandRow = () => {
    setForm((prev) => ({
      ...prev,
      bands: [...prev.bands, { band_min: "", band_max: "", comment: "" }],
    }));
  };

  // Remove band row
  const removeBandRow = (index) => {
    if (form.bands.length === 1) {
      toast.error("At least one band is required");
      return;
    }
    setForm((prev) => {
      const newBands = [...prev.bands];
      newBands.splice(index, 1);
      return { ...prev, bands: newBands };
    });
  };

  // Validate form
  const validateForm = () => {
    if (!form.academic_year_id) {
      toast.error("Academic year is required");
      return false;
    }
    if (!form.department_id) {
      toast.error("Please select a department");
      return false;
    }
    if (!form.class_id) {
      toast.error("Please select a class");
      return false;
    }

    for (let i = 0; i < form.bands.length; i++) {
      const band = form.bands[i];
      if (band.band_min === "" || band.band_min === null) {
        toast.error(`Band ${i + 1}: Minimum value is required`);
        return false;
      }
      if (band.band_max === "" || band.band_max === null) {
        toast.error(`Band ${i + 1}: Maximum value is required`);
        return false;
      }
      if (!band.comment || band.comment.trim() === "") {
        toast.error(`Band ${i + 1}: Comment is required`);
        return false;
      }
      if (Number(band.band_max) < Number(band.band_min)) {
        toast.error(`Band ${i + 1}: Maximum cannot be less than minimum`);
        return false;
      }
    }

    return true;
  };

  // Save bands
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await api.post("/academic-bands/save", form);
      toast.success(
        `Academic bands ${
          modalMode === "edit" ? "updated" : "created"
        } successfully`
      );
      closeModal();
      fetchInitialData();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.details?.message ||
          err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to save bands"
      );
    } finally {
      setSaving(false);
    }
  };

  // Get form-available classes
  const formAvailableClasses = form.department_id
    ? classes.filter((c) => c.department_id === form.department_id)
    : [];

  if (initialLoading || yearScope.loading) {
    return (
      <SideTop>
        <div className="academic-bands-refactored">
          <div className="bands-skeleton">
            <div className="skeleton-line wide" />
            <Stats data={[]} loading skeletonCount={3} />
            <div className="skeleton-line" />
            <div className="skeleton-block" />
          </div>
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="academic-bands-refactored">
        {/* Header */}
        <PageHeader
          title="Academic Performance Bands"
          subtitle={
            !canEdit ? (
              <span className="bands-readonly-badge">
                <FaLock /> Read Only
              </span>
            ) : null
          }
          actions={
            canEdit && (
              <button
                className="bands-create-btn bands-create-desktop"
                onClick={handleCreateNew}
                disabled={!yearScope.selectedYearId}
              >
                <FaPlus />
                <span>Create Bands</span>
              </button>
            )
          }
        />

        {/* Info Card */}
        <div className="bands-info-card">
          <p>
            Academic performance bands define grade ranges and their
            corresponding performance levels for each class. Select an academic
            year to view and manage bands.
          </p>
        </div>

        {/* Stats */}
        <Stats data={stats} loading={isLoading} skeletonCount={3} />

        {/* Year scope: same banner + picker every year-aware page/modal in
            this module uses, keeps the "editable this year, read-only that
            year, unless Admin3 has a grant" rule consistent everywhere
            instead of each page re-deriving its own version of it. */}
        <YearScopeBanner yearScope={yearScope} className="bands-year-scope" />

        {/* Filters */}
        <div className="bands-filters">
          <div className="bands-filter-group">
            <label className="bands-filter-label">Filter by Department</label>
            <Select
              placeholder="All Departments"
              options={departments.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              value={
                selectedDepartment
                  ? {
                      value: selectedDepartment,
                      label: departments.find(
                        (d) => d.id === selectedDepartment
                      )?.name,
                    }
                  : null
              }
              onChange={(opt) => setSelectedDepartment(opt?.value || null)}
              isClearable
              className="bands-select"
              classNamePrefix="select"
            />
          </div>

          <div className="bands-filter-group">
            <label className="bands-filter-label">Filter by Bands Status</label>
            <Select
              options={BANDS_FILTER_OPTIONS}
              value={BANDS_FILTER_OPTIONS.find((o) => o.value === bandsStatusFilter)}
              onChange={(opt) => setBandsStatusFilter(opt?.value || "all")}
              className="bands-select"
              classNamePrefix="select"
            />
          </div>
        </div>

        {/* Instructions */}
        {!yearScope.selectedYearId && (
          <EmptyState
            icon={<FaCopy className="facopy-2" />}
            title="Get Started"
            subtitle="Select an academic year above to view and manage bands"
          />
        )}

        {/* Table */}
        {yearScope.selectedYearId && (
          <div className="bands-table-container">
            <DataTable
              columns={tableColumns}
              data={tableData}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={() => {}} // No delete functionality
              loading={isLoading}
              limit={10}
              editRoles={canEdit ? ["Admin3"] : []}
              deleteRoles={[]} // Hide delete button
              extraActions={
                !canEdit
                  ? []
                  : [
                      {
                        icon: <FaCopy className="facopy-2" />,
                        title: "Copy Bands",
                        onClick: handleCopy,
                      },
                    ]
              }
            />
          </div>
        )}

        {/* Mobile FAB */}
        {canEdit && yearScope.selectedYearId && (
          <button
            className="bands-create-btn bands-create-mobile-fab"
            onClick={handleCreateNew}
            aria-label="Create Academic Bands"
          >
            <FaPlus />
          </button>
        )}

        {/* Details Modal */}
        <Modal
          isOpen={detailsModalOpen}
          onClose={closeDetailsModal}
          title={
            selectedClassDetails
              ? `Academic Bands - ${selectedClassDetails.name}`
              : "Academic Bands"
          }
        >
          {selectedClassDetails && (
            <div className="bands-details-modal">
              <div className="bands-details-info">
                <DetailGrid>
                  <DetailRow label="Class" value={selectedClassDetails.name} />
                  <DetailRow
                    label="Department"
                    value={selectedClassDetails.department}
                  />
                  <DetailRow
                    label="Academic Year"
                    value={
                      yearScope.years.find((y) => y.id === yearScope.selectedYearId)?.name ||
                      "N/A"
                    }
                  />
                </DetailGrid>
              </div>

              {selectedClassDetails.hasBands ? (
                <div className="bands-details-table-wrapper">
                  <h4 className="bands-details-subtitle">Performance Bands</h4>
                  <div className="bands-details-table">
                    <div className="bands-details-table-header">
                      <div className="bands-details-col">Min</div>
                      <div className="bands-details-col">Max</div>
                      <div className="bands-details-col-wide">
                        Performance Level
                      </div>
                    </div>
                    {selectedClassDetails.bands.map((band, idx) => (
                      <div key={idx} className="bands-details-table-row">
                        <div className="bands-details-col" data-label="Min:">
                          {band.band_min}
                        </div>
                        <div className="bands-details-col" data-label="Max:">
                          {band.band_max}
                        </div>
                        <div
                          className="bands-details-col-wide"
                          data-label="Performance Level:"
                        >
                          {band.comment}
                        </div>
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="bands-details-actions">
                      <button
                        className="bands-details-btn bands-details-btn-edit"
                        onClick={() => {
                          handleEdit(selectedClassDetails);
                          closeDetailsModal();
                        }}
                      >
                        <FaEdit /> Edit Bands
                      </button>
                      <button
                        className="bands-details-btn bands-details-btn-copy"
                        onClick={() => {
                          handleCopy(selectedClassDetails);
                          closeDetailsModal();
                        }}
                      >
                        <FaCopy /> Copy to Another Class
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={<FaCopy className="facopy-2" />}
                  title="No Academic Bands Available"
                  subtitle="This class doesn't have any performance bands configured yet."
                  action={
                    canEdit && (
                      <button
                        className="bands-details-btn bands-details-btn-create"
                        onClick={handleCreateFromDetails}
                      >
                        <FaPlus /> Create Bands
                      </button>
                    )
                  }
                />
              )}
            </div>
          )}
        </Modal>

        {/* Form Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={
            modalMode === "copy"
              ? "Copy Bands to Another Class"
              : modalMode === "edit"
              ? "Edit Academic Bands"
              : "Create Academic Bands"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="bands-modal-form"
          >
            {/* Academic Year - Read only */}
            <div className="bands-form-group">
              <label className="bands-form-label">
                Academic Year <span className="required">*</span>
              </label>
              <input
                type="text"
                className="bands-readonly-input"
                value={
                  yearScope.years.find((y) => y.id === form.academic_year_id)
                    ?.name || ""
                }
                readOnly
              />
            </div>

            {/* Department */}
            <div className="bands-form-group">
              <label className="bands-form-label">
                Department <span className="required">*</span>
              </label>
              <Select
                placeholder="Select Department"
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                value={
                  form.department_id
                    ? {
                        value: form.department_id,
                        label: departments.find(
                          (d) => d.id === form.department_id
                        )?.name,
                      }
                    : null
                }
                onChange={(opt) =>
                  setForm((prev) => ({
                    ...prev,
                    department_id: opt?.value || null,
                    class_id: null, // Reset class when department changes
                  }))
                }
                className="bands-select"
                classNamePrefix="select"
                isDisabled={modalMode === "edit"}
              />
            </div>

            {/* Class */}
            <div className="bands-form-group">
              <label className="bands-form-label">
                Class <span className="required">*</span>
              </label>
              <Select
                placeholder="Select Class"
                options={formAvailableClasses.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                value={
                  form.class_id
                    ? {
                        value: form.class_id,
                        label: classes.find((c) => c.id === form.class_id)
                          ?.name,
                      }
                    : null
                }
                onChange={(opt) =>
                  setForm((prev) => ({
                    ...prev,
                    class_id: opt?.value || null,
                  }))
                }
                className="bands-select"
                classNamePrefix="select"
                isDisabled={
                  !form.department_id ||
                  formAvailableClasses.length === 0 ||
                  modalMode === "edit"
                }
              />
            </div>

            {/* Bands */}
            <div className="bands-section">
              <div className="bands-section-header">
                <h4>Performance Bands</h4>
                <button
                  type="button"
                  className="bands-add-btn"
                  onClick={addBandRow}
                >
                  <FaPlus /> Add Band
                </button>
              </div>

              {form.bands.map((band, idx) => (
                <div key={idx} className="band-row">
                  <div className="band-row-header">
                    <span className="band-number">Band {idx + 1}</span>
                    {form.bands.length > 1 && (
                      <button
                        type="button"
                        className="band-remove-btn"
                        onClick={() => removeBandRow(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="band-fields">
                    <CustomInput
                      label="Min"
                      type="number"
                      step="0.1"
                      value={band.band_min}
                      onChange={(_, val) =>
                        handleBandChange(idx, "band_min", val)
                      }
                      placeholder="0.0"
                      name={`band_min_${idx}`}
                    />

                    <CustomInput
                      label="Max"
                      type="number"
                      step="0.1"
                      value={band.band_max}
                      onChange={(_, val) =>
                        handleBandChange(idx, "band_max", val)
                      }
                      placeholder="10.0"
                      name={`band_max_${idx}`}
                    />

                    <CustomInput
                      label="Performance Level"
                      type="text"
                      value={band.comment}
                      onChange={(_, val) =>
                        handleBandChange(idx, "comment", val)
                      }
                      placeholder="e.g., Excellent, Good, Fair"
                      name={`comment_${idx}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <SubmitBtn
              title={saving ? "Saving..." : "Save Bands"}
              disabled={saving}
            />
          </form>
        </Modal>
      </div>
    </SideTop>
  );
};
