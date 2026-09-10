// Shared by ClassPage (create) and ClassDetailPage (edit) — both drive the
// same ClassFormModal, so the validation/submit-shaping rules that go with
// it live in one place instead of drifting between two copies.

export function transformClassForm(form) {
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

export function validateClassForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.department_id) errors.department_id = "Department is required.";
  if (!form.class_master_id)
    errors.class_master_id = "Class master is required.";
  if (form.suspended === "" || form.suspended == null)
    errors.suspended = "Class status (suspended or active) is required";
  return errors;
}

// A class whose name says "orientation" but isn't flagged as one would
// silently never trigger the six-choice registration flow or the
// promotion restriction — a soft nudge here, not a hard block, since a
// class named e.g. "Orientation Committee" legitimately isn't one.
export function confirmOrientationNameMismatch(form) {
  if (form.is_orientation) return true;
  if (!form.name?.toLowerCase().includes("orientation")) return true;
  return window.confirm(
    `"${form.name}" looks like an orientation class, but "Orientation class" isn't checked. Continue without it?`
  );
}

export const EMPTY_CLASS_FORM = {
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
  suspended: "Active",
  is_orientation: false,
};

// Fresh single-class API record -> form shape. Never build this from an
// already-formatted table row (see ClassPage.handleEdit for why: fees get
// .toLocaleString()'d for display, and Number("50,000") is NaN).
export function classToForm(cls) {
  return {
    id: cls.id,
    name: cls.name,
    department_id: cls.department_id,
    class_master_id: cls.class_master_id,
    registration_fee: cls.registration_fee,
    bus_fee: cls.bus_fee,
    internship_fee: cls.internship_fee,
    remedial_fee: cls.remedial_fee,
    tuition_fee: cls.tuition_fee,
    pta_fee: cls.pta_fee,
    total_fee: cls.total_fee,
    suspended: cls.suspended ? "Suspended" : "Active",
    is_orientation: !!cls.is_orientation,
  };
}
