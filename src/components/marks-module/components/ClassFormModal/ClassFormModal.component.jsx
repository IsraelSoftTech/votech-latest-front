import React from "react";
import PropTypes from "prop-types";
import Select from "react-select";
import Modal from "../Modal/Modal.component";
import {
  CustomInput,
  CustomDropdown,
  SubmitBtn,
} from "../Inputs/CustumInputs";
// Reuses ClassPage's stylesheet rather than duplicating the ~60 lines of
// class-modal-form/class-fees-grid/etc. rules, this is the exact same form
// ClassPage used to render twice inline (once for create, once for edit),
// now used from there and from ClassDetailPage.
import "../../pages/ClassPage/Class.styles.css";

const FEE_FIELDS = [
  { key: "registration_fee", label: "Registration Fee" },
  { key: "bus_fee", label: "Bus Fee" },
  { key: "internship_fee", label: "Internship Fee" },
  { key: "remedial_fee", label: "Remedial Fee" },
  { key: "tuition_fee", label: "Tuition Fee" },
  { key: "pta_fee", label: "PTA Fee" },
];

export function ClassFormModal({
  mode = "create",
  isOpen,
  onClose,
  form,
  formErrors,
  onChange,
  onSubmit,
  departments,
  teachers,
  loading,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Class" : "Create Class"}
    >
      <form onSubmit={onSubmit} className="class-modal-form">
        <CustomInput
          label="Name"
          type="text"
          value={form.name}
          onChange={onChange}
          name="name"
          error={formErrors.name}
        />

        <div className="class-form-group">
          <label className="class-form-label">Department</label>
          <Select
            options={departments}
            value={departments.find((d) => d.value === form.department_id)}
            onChange={(selected) =>
              onChange("department_id", selected?.value || null)
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
              onChange("class_master_id", selected?.value || null)
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

        <div className="class-form-group class-checkbox-group">
          <label className="class-checkbox-label">
            <input
              type="checkbox"
              checked={!!form.is_orientation}
              onChange={(e) => onChange("is_orientation", e.target.checked)}
            />
            This is an Orientation class (Form One)
          </label>
          <p className="class-checkbox-hint">
            Registration will capture six ranked department choices for
            students in this class, and promotion will only offer classes in
            a student's chosen departments as destinations.
          </p>
        </div>

        <div className="class-fees-section">
          <h4 className="class-section-title">Fee Structure</h4>
          <div className="class-fees-grid">
            {FEE_FIELDS.map((fee) => (
              <CustomInput
                key={fee.key}
                label={fee.label}
                value={
                  form[fee.key] != null
                    ? String(form[fee.key]).replace(/\s+/g, "")
                    : ""
                }
                onChange={onChange}
                name={fee.key}
                type="number"
              />
            ))}
          </div>
        </div>

        <CustomDropdown
          label="Status"
          options={["Active", "Suspended"]}
          value={form.suspended || "Active"}
          onChange={onChange}
          name="suspended"
        />

        <SubmitBtn
          title={loading ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save" : "Create"}
          disabled={loading}
        />
      </form>
    </Modal>
  );
}

ClassFormModal.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  form: PropTypes.object.isRequired,
  formErrors: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  departments: PropTypes.array.isRequired,
  teachers: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

export default ClassFormModal;
