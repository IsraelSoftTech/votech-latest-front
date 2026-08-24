import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import { FaCamera } from "react-icons/fa";
import Modal from "../Modal/Modal.component";
import api from "../../utils/api";
import "./StudentFormModal.styles.css";

const selectPortalProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
  styles: { menuPortal: (base) => ({ ...base, zIndex: 10000 }) },
};

const EMPTY_FORM = {
  full_name: "",
  sex: "",
  date_of_birth: "",
  place_of_birth: "",
  father_name: "",
  mother_name: "",
  class_id: null,
  academic_year_id: null,
  specialty_id: null,
  guardian_contact: "",
  mother_contact: "",
  status: "active",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
];

const SEX_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];

// Handles both create and edit — six ranked department choices appear
// only when the selected class is flagged is_orientation, required and
// duplicate-blocked here client-side (each rank's options exclude
// whatever the other five ranks already picked, so a duplicate can't
// even be selected, not just rejected after the fact), and re-validated
// server-side regardless since client-side alone is never trusted.
export const StudentFormModal = ({
  isOpen,
  onClose,
  student,
  classes,
  departments,
  academicYears,
  onSaved,
}) => {
  const isEdit = Boolean(student?.id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [choices, setChoices] = useState([null, null, null, null, null, null]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (student) {
      setForm({
        full_name: student.full_name || "",
        sex: student.sex || "",
        date_of_birth: student.date_of_birth ? student.date_of_birth.slice(0, 10) : "",
        place_of_birth: student.place_of_birth || "",
        father_name: student.father_name || "",
        mother_name: student.mother_name || "",
        class_id: student.class_id || null,
        academic_year_id: student.academic_year_id || null,
        specialty_id: student.specialty_id || null,
        guardian_contact: student.guardian_contact || "",
        mother_contact: student.mother_contact || "",
        status: student.status || "active",
      });
      const sortedChoices = [...(student.department_choices || [])].sort((a, b) => a.rank - b.rank);
      const next = [null, null, null, null, null, null];
      sortedChoices.forEach((c) => {
        if (c.rank >= 1 && c.rank <= 6) next[c.rank - 1] = c.department_id;
      });
      setChoices(next);
      setPhotoPreview(student.photo_url || null);
    } else {
      setForm(EMPTY_FORM);
      setChoices([null, null, null, null, null, null]);
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [isOpen, student]);

  const selectedClass = classes.find((c) => c.id === form.class_id) || null;
  const isOrientation = Boolean(selectedClass?.is_orientation);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );
  const academicYearOptions = useMemo(
    () => academicYears.map((y) => ({ value: y.id, label: y.name })),
    [academicYears]
  );

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateChoice = (rankIdx, departmentId) => {
    setChoices((prev) => {
      const next = [...prev];
      next[rankIdx] = departmentId;
      return next;
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.full_name || !form.sex || !form.date_of_birth || !form.place_of_birth) {
      toast.error("Full name, sex, date of birth, and place of birth are required.");
      return;
    }
    if (!form.class_id || !form.academic_year_id) {
      toast.error("Class and academic year are required.");
      return;
    }
    if (isOrientation && choices.some((c) => !c)) {
      toast.error("All six ranked department choices are required for an orientation class.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) fd.append(key, value);
      });
      if (isOrientation) {
        fd.append("department_choices", JSON.stringify(choices));
      }
      if (photoFile) fd.append("photo", photoFile);

      // The shared `api` instance defaults to Content-Type: application/json
      // (see marks-module/utils/api.js). Overriding it to undefined here
      // forces axios to let the browser set multipart/form-data with the
      // real boundary itself — leaving the json default in place would
      // send a FormData body with the wrong header and multer would fail
      // to parse it server-side.
      const multipartConfig = { headers: { "Content-Type": undefined } };
      if (isEdit) {
        await api.patch(`/students/${student.id}`, fd, multipartConfig);
        toast.success("Student updated.");
      } else {
        await api.post("/students", fd, multipartConfig);
        toast.success("Student registered.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.response?.data?.details || "Failed to save student."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Student" : "Register Student"} size="large">
      <form className="sfm-form" onSubmit={handleSubmit}>
        <div className="sfm-photo-row">
          <div className="sfm-photo-preview">
            {photoPreview ? (
              <img src={photoPreview} alt="Student" />
            ) : (
              <FaCamera className="sfm-photo-placeholder-icon" />
            )}
          </div>
          <label className="sfm-photo-btn">
            {photoPreview ? "Change Photo" : "Upload Photo"}
            <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </label>
        </div>

        <div className="sfm-grid">
          <div className="sfm-field">
            <label>Full Name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
            />
          </div>
          <div className="sfm-field">
            <label>Sex *</label>
            <Select
              options={SEX_OPTIONS}
              value={SEX_OPTIONS.find((o) => o.value === form.sex) || null}
              onChange={(opt) => updateField("sex", opt?.value || "")}
              placeholder="Select"
              classNamePrefix="sfm-select"
              {...selectPortalProps}
            />
          </div>
          <div className="sfm-field">
            <label>Date of Birth *</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => updateField("date_of_birth", e.target.value)}
            />
          </div>
          <div className="sfm-field">
            <label>Place of Birth *</label>
            <input
              type="text"
              value={form.place_of_birth}
              onChange={(e) => updateField("place_of_birth", e.target.value)}
            />
          </div>
          <div className="sfm-field">
            <label>Father's Name</label>
            <input
              type="text"
              value={form.father_name}
              onChange={(e) => updateField("father_name", e.target.value)}
            />
          </div>
          <div className="sfm-field">
            <label>Father's / Guardian's Contact</label>
            <input
              type="text"
              value={form.guardian_contact}
              onChange={(e) => updateField("guardian_contact", e.target.value)}
            />
          </div>
          <div className="sfm-field">
            <label>Mother's Name</label>
            <input
              type="text"
              value={form.mother_name}
              onChange={(e) => updateField("mother_name", e.target.value)}
            />
          </div>
          <div className="sfm-field">
            <label>Mother's Contact</label>
            <input
              type="text"
              value={form.mother_contact}
              onChange={(e) => updateField("mother_contact", e.target.value)}
            />
          </div>

          <div className="sfm-field">
            <label>Academic Year *</label>
            <Select
              options={academicYearOptions}
              value={academicYearOptions.find((o) => o.value === form.academic_year_id) || null}
              onChange={(opt) => updateField("academic_year_id", opt?.value || null)}
              classNamePrefix="sfm-select"
              {...selectPortalProps}
            />
          </div>
          <div className="sfm-field">
            <label>Department (fee schedule)</label>
            <Select
              options={departmentOptions}
              value={departmentOptions.find((o) => o.value === form.specialty_id) || null}
              onChange={(opt) => updateField("specialty_id", opt?.value || null)}
              isClearable
              classNamePrefix="sfm-select"
              {...selectPortalProps}
            />
          </div>
          <div className="sfm-field">
            <label>Class *</label>
            <Select
              options={classOptions}
              value={classOptions.find((o) => o.value === form.class_id) || null}
              onChange={(opt) => updateField("class_id", opt?.value || null)}
              classNamePrefix="sfm-select"
              {...selectPortalProps}
            />
          </div>
          <div className="sfm-field">
            <label>Status</label>
            <Select
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find((o) => o.value === form.status)}
              onChange={(opt) => updateField("status", opt?.value || "active")}
              classNamePrefix="sfm-select"
              {...selectPortalProps}
            />
          </div>
        </div>

        {isOrientation && (
          <div className="sfm-choices-section">
            <h4>Orientation — Six Ranked Department Choices</h4>
            <p className="sfm-choices-hint">
              All six are required. Once ranked, this student can only be promoted into a class
              within one of these six departments.
            </p>
            <div className="sfm-choices-grid">
              {choices.map((chosenId, idx) => {
                const takenElsewhere = choices.filter((_, i) => i !== idx);
                const options = departmentOptions.filter((o) => !takenElsewhere.includes(o.value));
                return (
                  <div className="sfm-field" key={idx}>
                    <label>Choice {idx + 1}</label>
                    <Select
                      options={options}
                      value={departmentOptions.find((o) => o.value === chosenId) || null}
                      onChange={(opt) => updateChoice(idx, opt?.value || null)}
                      placeholder={`Rank ${idx + 1}`}
                      classNamePrefix="sfm-select"
                      {...selectPortalProps}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="sfm-actions">
          <button type="button" className="sfm-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="sfm-submit-btn" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Register Student"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentFormModal;
