import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaLock, FaPlus, FaCopy, FaEdit } from "react-icons/fa";
import Select from "react-select";
import SideTop from "../../../SideTop";
import api, { headers, subBaseURL } from "../../utils/api";
import DataTable from "../../components/DataTable/DataTable.component";
import Modal from "../../components/Modal/Modal.component";
import { CustomInput, SubmitBtn } from "../../components/Inputs/CustumInputs";
import "./AcademicBands.styles.css";

export const AcademicBandsPage = () => {
  const isReadOnly =
    JSON.parse(sessionStorage.getItem("authUser") || "{}").role === "Admin1";

  // Data states
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [bandsData, setBandsData] = useState([]);

  // Filter states
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
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
      const [yearsRes, deptRes, classesRes, bandsRes] = await Promise.all([
        api.get("/academic-years"),
        fetch(`${subBaseURL}/specialties`, { headers: headers() }),
        api.get("/classes"),
        api.get("/academic-bands"),
      ]);

      setAcademicYears(yearsRes?.data?.data || []);
      setDepartments(await deptRes.json());
      setClasses(classesRes?.data?.data || []);
      setBandsData(bandsRes?.data?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
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
        (!selectedYear || band.academic_year_id === selectedYear)
    );
  };

  // Prepare table data
  const tableData = filteredClasses.map((cls) => {
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
      academic_year_id: selectedYear,
      department_id: classData.department_id,
      class_id: selectedClassDetails.id,
      bands: [{ band_min: "", band_max: "", comment: "" }],
    });

    closeDetailsModal();
    setModalOpen(true);
  };

  // Handle edit button
  const handleEdit = (row) => {
    if (!selectedYear) {
      toast.error("Please select an academic year first");
      return;
    }

    const classData = classes.find((c) => c.id === row.id);
    const existingBands = getBandsForClass(row.id);

    setModalMode("edit");
    setForm({
      academic_year_id: selectedYear,
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
    if (!selectedYear) {
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
      academic_year_id: selectedYear,
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
    if (!selectedYear) {
      toast.error("Please select an academic year first to create bands");
      return;
    }

    setModalMode("create");
    setForm({
      academic_year_id: selectedYear,
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

  return (
    <SideTop>
      <div className="academic-bands-refactored">
        {/* Header */}
        <div className="bands-header">
          <div className="bands-header-left">
            <h1 className="bands-title">Academic Performance Bands</h1>
            {isReadOnly && (
              <span className="bands-readonly-badge">
                <FaLock /> Read Only
              </span>
            )}
          </div>
          {!isReadOnly && (
            <button
              className="bands-create-btn bands-create-desktop"
              onClick={handleCreateNew}
              disabled={!selectedYear}
            >
              <FaPlus />
              <span>Create Bands</span>
            </button>
          )}
        </div>

        {/* Info Card */}
        <div className="bands-info-card">
          <p>
            Academic performance bands define grade ranges and their
            corresponding performance levels for each class. Select an academic
            year to view and manage bands.
          </p>
        </div>

        {/* Filters */}
        <div className="bands-filters">
          <div className="bands-filter-group">
            <label className="bands-filter-label">
              Academic Year <span className="required">*</span>
            </label>
            <Select
              placeholder="Select Academic Year"
              options={academicYears.map((y) => ({
                value: y.id,
                label: y.name,
              }))}
              value={
                selectedYear
                  ? {
                      value: selectedYear,
                      label: academicYears.find((y) => y.id === selectedYear)
                        ?.name,
                    }
                  : null
              }
              onChange={(opt) => setSelectedYear(opt?.value || null)}
              isClearable
              className="bands-select"
              classNamePrefix="select"
            />
          </div>

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
        </div>

        {/* Instructions */}
        {!selectedYear && (
          <div className="bands-empty-state">
            <div className="empty-state-icon">
              <FaCopy color="#20408" className="facopy-2" />
            </div>
            <h3>Get Started</h3>
            <p>Select an academic year above to view and manage bands</p>
          </div>
        )}

        {/* Table */}
        {selectedYear && (
          <div className="bands-table-container">
            <DataTable
              columns={tableColumns}
              data={tableData}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={() => {}} // No delete functionality
              loading={isLoading}
              limit={10}
              editRoles={isReadOnly ? [] : ["Admin", "Admin2"]}
              deleteRoles={[]} // Hide delete button
              extraActions={
                isReadOnly
                  ? []
                  : [
                      {
                        icon: <FaCopy color="#20408" className="facopy-2" />,
                        title: "Copy Bands",
                        onClick: handleCopy,
                      },
                    ]
              }
            />
          </div>
        )}

        {/* Mobile FAB */}
        {!isReadOnly && selectedYear && (
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
                <div className="bands-detail-item">
                  <span className="bands-detail-label">Class:</span>
                  <span className="bands-detail-value">
                    {selectedClassDetails.name}
                  </span>
                </div>
                <div className="bands-detail-item">
                  <span className="bands-detail-label">Department:</span>
                  <span className="bands-detail-value">
                    {selectedClassDetails.department}
                  </span>
                </div>
                <div className="bands-detail-item">
                  <span className="bands-detail-label">Academic Year:</span>
                  <span className="bands-detail-value">
                    {academicYears.find((y) => y.id === selectedYear)?.name ||
                      "N/A"}
                  </span>
                </div>
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

                  {!isReadOnly && (
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
                        <FaCopy color="#20408" /> Copy to Another Class
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bands-details-empty">
                  <div className="bands-details-empty-icon">
                    {" "}
                    <FaCopy color="#20408" className="facopy-2" />
                  </div>
                  <h4>No Academic Bands Available</h4>
                  <p>
                    This class doesn't have any performance bands configured
                    yet.
                  </p>
                  {!isReadOnly && (
                    <button
                      className="bands-details-btn bands-details-btn-create"
                      onClick={handleCreateFromDetails}
                    >
                      <FaPlus /> Create Bands
                    </button>
                  )}
                </div>
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
                  academicYears.find((y) => y.id === form.academic_year_id)
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
