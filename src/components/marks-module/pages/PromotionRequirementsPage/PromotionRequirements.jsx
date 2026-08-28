import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaCheck, FaCopy, FaLayerGroup, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Select from "react-select";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api, { headers, subBaseURL } from "../../utils/api";
import DataTable from "../../components/DataTable/DataTable.component";
import Modal from "../../components/Modal/Modal.component";
import { CustomInput, SubmitBtn } from "../../components/Inputs/CustumInputs";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import "./PromotionRequirements.styles.css";

const emptyForm = {
  academic_year_id: null,
  class_id: null,
  min_average: "",
  pass_mark: "10",
  min_professional_subjects_passed: "0",
  compulsory_general_subject_ids: [],
  compulsory_professional_subject_ids: [],
  promotion_mode: "single",
  decision_mode: "automatic",
};

export const PromotionRequirementsPage = () => {
  useRestrictTo("Admin3");

  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [classSubjectIds, setClassSubjectIds] = useState(new Set());

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [configuredFilter, setConfiguredFilter] = useState("all"); // all | configured | not_configured

  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalClass, setModalClass] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Selecting a year does real work (a scoped refetch), so the loading
  // skeleton it triggers reflects something actually happening, not just
  // a cosmetic delay.
  useEffect(() => {
    if (!selectedYear) {
      setRequirements([]);
      return;
    }
    fetchRequirements(selectedYear);
  }, [selectedYear]);

  // Department is a pure client-side filter over data already in memory,
  // but the admin still needs visible confirmation the table responded to
  // their choice, so we pulse the loading skeleton briefly.
  useEffect(() => {
    if (!selectedYear) return;
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 250);
    return () => clearTimeout(timer);
  }, [selectedDepartment, configuredFilter]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [yearsRes, deptRes, classesRes, subjectsRes] = await Promise.all([
        api.get("/academic-years"),
        fetch(`${subBaseURL}/specialties`, { headers: headers() }),
        api.get("/classes"),
        api.get("/subjects"),
      ]);

      setAcademicYears(yearsRes?.data?.data || []);
      setDepartments(await deptRes.json());
      setClasses(classesRes?.data?.data || []);
      setSubjects(subjectsRes?.data?.data || []);
    } catch (err) {
      console.error("Error loading promotion requirements data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequirements = async (yearId) => {
    setIsFiltering(true);
    try {
      const res = await api.get(
        `/promotion-requirements?academic_year_id=${yearId}`
      );
      setRequirements(res?.data?.data || []);
    } catch (err) {
      console.error("Error fetching promotion requirements:", err);
      toast.error("Failed to load promotion requirements for this year");
    } finally {
      setIsFiltering(false);
    }
  };

  const departmentFilteredClasses = classes.filter((cls) =>
    selectedDepartment
      ? Number(cls.department_id) === Number(selectedDepartment)
      : true
  );

  const getRequirementForClass = (classId) =>
    requirements.find(
      (r) =>
        Number(r.class_id) === Number(classId) &&
        Number(r.academic_year_id) === Number(selectedYear)
    );

  const allTableData = departmentFilteredClasses.map((cls) => {
    const req = getRequirementForClass(cls.id);
    const department = departments.find(
      (d) => Number(d.id) === Number(cls.department_id)
    );
    const compulsoryCount = req
      ? (req.compulsory_general_subject_ids?.length || 0) +
        (req.compulsory_professional_subject_ids?.length || 0)
      : 0;

    const tags = [];
    if (req?.promotion_mode === "split") tags.push("splits into departments");
    if (req?.decision_mode === "manual") tags.push("manual (national exam)");

    return {
      id: cls.id,
      name: cls.name,
      department: department?.name || "N/A",
      status: req
        ? `Min avg ${req.min_average} · ${compulsoryCount} compulsory subject(s)${
            tags.length ? ` · ${tags.join(", ")}` : ""
          }`
        : "Not configured",
      configured: !!req,
    };
  });

  const configuredCount = allTableData.filter((r) => r.configured).length;
  const notConfiguredCount = allTableData.length - configuredCount;

  const tableData = allTableData.filter((r) => {
    if (configuredFilter === "configured") return r.configured;
    if (configuredFilter === "not_configured") return !r.configured;
    return true;
  });

  const tableColumns = [
    { label: "Class", accessor: "name" },
    { label: "Department", accessor: "department" },
    { label: "Requirements", accessor: "status", sortable: false },
  ];

  const openEditor = async (row, copyFrom = null) => {
    if (!selectedYear) {
      toast.error("Select an academic year first");
      return;
    }
    const classData = classes.find((c) => c.id === row.id);
    setModalClass(classData);

    try {
      const res = await api.get(`/class-subjects?class_id=${row.id}`);
      const ids = new Set(
        (res?.data?.data || []).map((cs) => cs.subject_id)
      );
      setClassSubjectIds(ids);
    } catch (err) {
      console.error("Failed to load class curriculum:", err);
      setClassSubjectIds(new Set());
    }

    // Orientation classes fan out into multiple departments by definition —
    // promotion_mode is pinned to "split" for as long as the class is
    // flagged is_orientation, never carried over from a copy or a stale
    // saved value. The backend enforces this too, this is just so the
    // form already reflects reality the moment the modal opens.
    const isOrientationClass = !!classData?.is_orientation;

    const source = copyFrom || getRequirementForClass(row.id);
    if (source) {
      setForm({
        academic_year_id: selectedYear,
        class_id: row.id,
        min_average: String(source.min_average ?? ""),
        pass_mark: String(source.pass_mark ?? "10"),
        min_professional_subjects_passed: String(
          source.min_professional_subjects_passed ?? "0"
        ),
        // Numeric fields carry over on copy, but subject picks never do,
        // since a copied id from another class's curriculum is almost
        // always meaningless here. The admin re-picks deliberately.
        compulsory_general_subject_ids: copyFrom
          ? []
          : source.compulsory_general_subject_ids || [],
        compulsory_professional_subject_ids: copyFrom
          ? []
          : source.compulsory_professional_subject_ids || [],
        // Structural flags about this specific class, not the criteria
        // magnitude, so like the subject picks these don't carry over when
        // copying settings into a different class.
        promotion_mode: isOrientationClass
          ? "split"
          : copyFrom
          ? "single"
          : source.promotion_mode || "single",
        decision_mode: copyFrom ? "automatic" : source.decision_mode || "automatic",
      });
    } else {
      setForm({
        ...emptyForm,
        academic_year_id: selectedYear,
        class_id: row.id,
        promotion_mode: isOrientationClass ? "split" : emptyForm.promotion_mode,
      });
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalClass(null);
    setForm(emptyForm);
  };

  const toggleSubject = (field, subjectId) => {
    setForm((prev) => {
      const current = prev[field];
      const next = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId];
      return { ...prev, [field]: next };
    });
  };

  const validate = () => {
    if (!form.min_average || Number(form.min_average) < 0 || Number(form.min_average) > 20) {
      toast.error("Minimum promotion average must be between 0 and 20");
      return false;
    }
    if (Number(form.pass_mark) < 0 || Number(form.pass_mark) > 20) {
      toast.error("Pass mark must be between 0 and 20");
      return false;
    }
    if (Number(form.min_professional_subjects_passed) < 0) {
      toast.error("Minimum professional subjects passed cannot be negative");
      return false;
    }
    const professionalSubjectCount = classCurriculumSubjects("professional").length;
    if (Number(form.min_professional_subjects_passed) > professionalSubjectCount) {
      toast.error(
        `This class only teaches ${professionalSubjectCount} Professional subject(s), so the minimum required to pass cannot be higher than that`
      );
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post("/promotion-requirements/save", {
        academic_year_id: form.academic_year_id,
        class_id: form.class_id,
        min_average: Number(form.min_average),
        pass_mark: Number(form.pass_mark),
        min_professional_subjects_passed: Number(
          form.min_professional_subjects_passed
        ),
        compulsory_general_subject_ids: form.compulsory_general_subject_ids,
        compulsory_professional_subject_ids:
          form.compulsory_professional_subject_ids,
        promotion_mode: form.promotion_mode,
        decision_mode: form.decision_mode,
      });
      toast.success("Promotion requirements saved");
      closeModal();
      fetchRequirements(selectedYear);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.details ||
          "Failed to save promotion requirements"
      );
    } finally {
      setSaving(false);
    }
  };

  const classCurriculumSubjects = (category) =>
    subjects.filter(
      (s) => s.category === category && classSubjectIds.has(s.id)
    );

  if (isLoading) {
    return (
      <div className="promo-req-page">
        <div className="promo-req-skeleton">
          <div className="skeleton-line wide" />
          <div className="skeleton-line" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  return (
      <div className="promo-req-page">
        <PageHeader title="Promotion Requirements" />

        <div className="promo-req-info-card">
          <p>
            Configure the minimum average, compulsory subjects, and minimum
            Professional subject count each class needs for automatic
            promotion. Requirements are set per academic year and per class.
          </p>
        </div>

        <div className="promo-req-filters">
          <div className="promo-req-filter-group">
            <label className="promo-req-filter-label">
              Academic Year <span className="required">*</span>
            </label>
            <Select
              placeholder="Select Academic Year"
              options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
              value={
                selectedYear
                  ? {
                      value: selectedYear,
                      label: academicYears.find((y) => y.id === selectedYear)?.name,
                    }
                  : null
              }
              onChange={(opt) => setSelectedYear(opt?.value || null)}
              isClearable
              classNamePrefix="select"
            />
          </div>
          <div className="promo-req-filter-group">
            <label className="promo-req-filter-label">Filter by Department</label>
            <Select
              placeholder="All Departments"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              value={
                selectedDepartment
                  ? {
                      value: selectedDepartment,
                      label: departments.find((d) => d.id === selectedDepartment)?.name,
                    }
                  : null
              }
              onChange={(opt) => setSelectedDepartment(opt?.value || null)}
              isClearable
              classNamePrefix="select"
            />
          </div>
        </div>

        {!selectedYear ? (
          <EmptyState
            title="Select an academic year"
            subtitle="Choose a year above to view and configure promotion requirements."
          />
        ) : (
          <>
            <div className="promo-req-summary-cards">
              <button
                type="button"
                className={`promo-req-summary-card ${
                  configuredFilter === "all" ? "active" : ""
                }`}
                onClick={() => setConfiguredFilter("all")}
              >
                <FaLayerGroup className="promo-req-summary-icon" />
                <span className="promo-req-summary-value">{allTableData.length}</span>
                <span className="promo-req-summary-label">Total Classes</span>
              </button>
              <button
                type="button"
                className={`promo-req-summary-card good ${
                  configuredFilter === "configured" ? "active" : ""
                }`}
                onClick={() => setConfiguredFilter("configured")}
              >
                <FaCheckCircle className="promo-req-summary-icon" />
                <span className="promo-req-summary-value">{configuredCount}</span>
                <span className="promo-req-summary-label">Done</span>
              </button>
              <button
                type="button"
                className={`promo-req-summary-card warn ${
                  configuredFilter === "not_configured" ? "active" : ""
                }`}
                onClick={() => setConfiguredFilter("not_configured")}
              >
                <FaTimesCircle className="promo-req-summary-icon" />
                <span className="promo-req-summary-value">{notConfiguredCount}</span>
                <span className="promo-req-summary-label">Left To Do</span>
              </button>
            </div>

            <div className="promo-req-table-container">
            <DataTable
              columns={tableColumns}
              data={tableData}
              loading={isLoading || isFiltering}
              limit={10}
              onEdit={(row) => openEditor(row)}
              onDelete={() => {}}
              deleteRoles={[]}
              userRole="Admin3"
              editRoles={["Admin3"]}
              extraActions={[
                {
                  icon: <FaCopy />,
                  title: "Copy from another class",
                  roles: ["Admin3"],
                  onClick: (row) => {
                    const configuredRow = allTableData.find(
                      (r) => r.configured && r.id !== row.id
                    );
                    if (!configuredRow) {
                      toast.error("No other configured class to copy from yet");
                      return;
                    }
                    openEditor(row, getRequirementForClass(configuredRow.id));
                  },
                },
              ]}
            />
            </div>
          </>
        )}

        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={modalClass ? `Promotion Requirements for ${modalClass.name}` : ""}
        >
          <form
            className="promo-req-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="promo-req-mode-section">
              <label
                className={`promo-req-mode-toggle ${
                  modalClass?.is_orientation ? "promo-req-mode-locked" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.promotion_mode === "split"}
                  disabled={!!modalClass?.is_orientation}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      promotion_mode: e.target.checked ? "split" : "single",
                    }))
                  }
                />
                This class can promote students into different classes or
                departments (e.g. Orientation classes that split into
                Electrical, Building, Mechanics, etc.)
              </label>
              {modalClass?.is_orientation && (
                <p className="promo-req-mode-locked-note">
                  Checked and locked, {modalClass.name} is an Orientation
                  class. To change this, turn off "Orientation class" on the
                  class itself first (Classes page).
                </p>
              )}
              {form.promotion_mode === "split" && (
                <p className="promo-req-mode-warning">
                  When a promotion run reaches this class, the same-department
                  restriction is waived and the admin must assign each
                  promoted student's destination class by hand. Only enable
                  this for classes that genuinely fan out into different
                  departments, misconfiguring it lets students scatter into
                  the wrong department by accident.
                </p>
              )}

              <label className="promo-req-mode-toggle">
                <input
                  type="checkbox"
                  checked={form.decision_mode === "manual"}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      decision_mode: e.target.checked ? "manual" : "automatic",
                    }))
                  }
                />
                This class's real result comes from a national exam (GCE,
                ITVEE, etc.) not tracked in this system
              </label>
              {form.decision_mode === "manual" && (
                <p className="promo-req-mode-warning">
                  The criteria below become a recommendation only, based on
                  whatever internal marks exist. When a promotion run reaches
                  this class, an admin must select who is promoted by hand
                  instead of it being computed automatically.
                </p>
              )}
            </div>

            <div className="promo-req-form-row">
              <CustomInput
                label="Minimum Promotion Average"
                type="number"
                required
                value={form.min_average}
                onChange={(_, val) => setForm((p) => ({ ...p, min_average: val }))}
                placeholder="e.g. 12"
                name="min_average"
              />
              <CustomInput
                label="Subject Pass Mark"
                type="number"
                value={form.pass_mark}
                onChange={(_, val) => setForm((p) => ({ ...p, pass_mark: val }))}
                placeholder="10"
                name="pass_mark"
              />
              <div>
                <CustomInput
                  label="Min. Professional Subjects Passed"
                  type="number"
                  value={form.min_professional_subjects_passed}
                  onChange={(_, val) =>
                    setForm((p) => ({ ...p, min_professional_subjects_passed: val }))
                  }
                  placeholder="0"
                  name="min_professional_subjects_passed"
                />
                <p className="promo-req-field-hint">
                  This class teaches {classCurriculumSubjects("professional").length}{" "}
                  Professional subject(s)
                </p>
              </div>
            </div>

            <SubjectChipGroup
              title="Compulsory General Subjects"
              subjects={classCurriculumSubjects("general")}
              selectedIds={form.compulsory_general_subject_ids}
              onToggle={(id) => toggleSubject("compulsory_general_subject_ids", id)}
            />

            <SubjectChipGroup
              title="Compulsory Professional Subjects"
              subjects={classCurriculumSubjects("professional")}
              selectedIds={form.compulsory_professional_subject_ids}
              onToggle={(id) =>
                toggleSubject("compulsory_professional_subject_ids", id)
              }
            />

            <SubmitBtn title={saving ? "Saving..." : "Save Requirements"} />
          </form>
        </Modal>
      </div>
  );
};

const SubjectChipGroup = ({ title, subjects, selectedIds, onToggle }) => (
  <div className="promo-req-chip-group">
    <h4 className="promo-req-chip-title">{title}</h4>
    {subjects.length === 0 ? (
      <p className="promo-req-chip-empty">
        No subjects of this category are taught in this class yet.
      </p>
    ) : (
      <div className="promo-req-chips">
        {subjects.map((s) => {
          const active = selectedIds.includes(s.id);
          return (
            <button
              type="button"
              key={s.id}
              className={`promo-req-chip ${active ? "active" : ""}`}
              onClick={() => onToggle(s.id)}
            >
              {active && <FaCheck className="promo-req-chip-check" />}
              {s.name}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default PromotionRequirementsPage;
