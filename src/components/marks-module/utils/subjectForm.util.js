// Shared between SubjectsPage (create/edit modals) and SubjectDetailPage
// (edit modal), so the two never drift on validation the way a copy-pasted
// version would.

export const EMPTY_SUBJECT_FORM = {
  category: "",
  code: "",
  coefficient: 0,
  name: "",
  orientationDepartmentName: "",
};

// Accepts either shape: SubjectsPage's own flattened list row
// (orientationDepartmentName as a plain string, or "None") or the raw API
// object SubjectDetailPage fetches straight from GET /subjects/:id
// (orientationDepartment as a nested {name} object, or null).
export function subjectToForm(row) {
  const rawName =
    row.orientationDepartmentName !== undefined
      ? row.orientationDepartmentName
      : row.orientationDepartment?.name;

  return {
    id: row.id,
    name: row.name,
    coefficient: row.coefficient,
    code: row.code,
    category: row.category,
    orientationDepartmentName: !rawName || rawName === "None" ? "" : rawName,
  };
}

export function validateSubjectForm(form) {
  const errors = {};

  if (!form.name?.trim()) errors.name = "Subject name is required.";
  else if (!/^[a-zA-Z0-9\s\-\+\&\.\,\(\)]+$/.test(form.name)) {
    errors.name =
      "Subject name may only include letters, numbers, spaces, and basic symbols (- + & . , ( )).";
  }

  if (!form.code?.trim()) errors.code = "Subject code is required.";
  else if (!/^[a-zA-Z0-9]+$/.test(form.code))
    errors.code = "Subject code may only include letters and numbers.";

  const coef = Number(form.coefficient);
  if (form.coefficient === "" || form.coefficient === null)
    errors.coefficient = "Coefficient is required.";
  else if (isNaN(coef)) errors.coefficient = "Coefficient must be a number.";
  else if (coef < 1) errors.coefficient = "Coefficient cannot be less than 1.";
  else if (coef > 10) errors.coefficient = "Coefficient cannot be greater than 10.";

  if (!form.category?.trim()) errors.category = "Category is required.";

  return errors;
}

// The form stores a department NAME (matching every other CustomDropdown
// field), resolved to the id the API actually wants right before sending.
export function resolveOrientationDepartmentId(departments, name) {
  return departments.find((d) => d.label === name)?.value ?? null;
}

export function subjectFormToPayload(form, departments) {
  const { orientationDepartmentName, ...rest } = form;
  return {
    ...rest,
    coefficient: Number(form.coefficient),
    orientation_department_id: resolveOrientationDepartmentId(departments, orientationDepartmentName),
  };
}
