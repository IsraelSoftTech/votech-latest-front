import React from "react";
import PropTypes from "prop-types";
import Modal from "../Modal/Modal.component";
import {
  CustomDropdown,
  CustomInput,
  SubmitBtn,
} from "../Inputs/CustumInputs";
// Reuses SubjectsPage's stylesheet (.subject-modal-form) rather than
// duplicating it, this is the exact same form SubjectsPage used to render
// twice inline (once for create, once for edit), now used from there and
// from SubjectDetailPage.
import "../../pages/SubjectsPage/Subject.styles.css";

export function SubjectFormModal({
  mode = "create",
  isOpen,
  onClose,
  form,
  formErrors,
  onChange,
  onSubmit,
  departmentNameOptions,
  loading,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Academic Subject" : "Create Subject"}
    >
      <form onSubmit={onSubmit} className="subject-modal-form">
        <CustomInput
          label="Name"
          value={form.name}
          placeholder="e.g Mathematics I"
          name="name"
          required
          onChange={onChange}
          error={formErrors.name}
          onClear={() => onChange("name", "")}
        />
        <CustomInput
          label="Code"
          value={form.code}
          placeholder="e.g MATH I"
          name="code"
          required
          onChange={onChange}
          error={formErrors.code}
          onClear={() => onChange("code", "")}
        />
        <CustomInput
          label="Coefficient"
          type="number"
          value={form.coefficient}
          placeholder="e.g 4"
          name="coefficient"
          required
          onChange={onChange}
          error={formErrors.coefficient}
          onClear={() => onChange("coefficient", "")}
        />
        <CustomDropdown
          label="Category"
          value={form.category}
          required
          options={["general", "professional", "practical"]}
          name="category"
          onClear={() => onChange("category", "")}
          onChange={onChange}
          error={formErrors.category}
        />
        <CustomDropdown
          label="Orientation Placement Department"
          value={form.orientationDepartmentName}
          options={departmentNameOptions}
          name="orientationDepartmentName"
          onClear={() => onChange("orientationDepartmentName", "")}
          onChange={onChange}
        />
        <SubmitBtn
          title={
            loading
              ? mode === "edit"
                ? "Saving changes..."
                : "Creating Subject..."
              : mode === "edit"
              ? "Save Changes"
              : "Create Subject"
          }
          disabled={loading}
        />
      </form>
    </Modal>
  );
}

SubjectFormModal.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  form: PropTypes.object.isRequired,
  formErrors: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  departmentNameOptions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

export default SubjectFormModal;
