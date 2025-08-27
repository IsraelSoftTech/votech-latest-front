import "./AssignCourseModal.styles.css";
import React, { useState, useEffect } from "react";
import Select from "react-select";
import PropTypes from "prop-types";
import api from "../../utils/api";
import { toast } from "react-toastify";

export default function AssignCourseModal({
  departmentsOptions,
  classesOptions,
  teachersOptions,
  subject,
  onUpdate,
}) {
  const [step, setStep] = useState(1);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!subject) return;

    const fetchExistingSubjectClasses = async () => {
      try {
        const res = await api.get(`/class-subjects?subject_id=${subject.id}`);
        const existing = res.data.data || [];

        // Prefill departments
        const deptIds = [
          ...new Set(existing.map((item) => item.department_id)),
        ];
        const prefilledDepartments = departmentsOptions.filter((dep) =>
          deptIds.includes(dep.value)
        );

        // Prefill classes only in those departments & in DB records
        const prefilledClasses = classesOptions.filter(
          (cls) =>
            cls.department?.id &&
            deptIds.includes(cls.department.id) &&
            existing.some((item) => item.class_id === cls.value)
        );

        // Prefill teacher assignments
        const prefilledTeachers = {};
        existing.forEach((item) => {
          const teacherOption = teachersOptions.find(
            (t) => t.value === item.teacher_id
          );
          if (teacherOption) {
            prefilledTeachers[item.class_id] = teacherOption;
          }
        });

        setSelectedDepartments(prefilledDepartments);
        setSelectedClasses(prefilledClasses);
        setTeacherAssignments(prefilledTeachers);
      } catch (err) {
        toast.error(err?.response?.data?.details || "Error fetching classes.");
        console.error(err);
      }
    };

    fetchExistingSubjectClasses();
    setStep(1);
  }, [subject, departmentsOptions, classesOptions, teachersOptions]);

  const handleAssignTeacher = (classId, teacher) => {
    setTeacherAssignments((prev) => ({
      ...prev,
      [classId]: teacher,
    }));
  };

  const handleSave = async () => {
    if (!subject) {
      toast.error("No subject selected");
      return;
    }
    const payload = [];

    for (const cls of selectedClasses) {
      const teacher = teacherAssignments[cls.value];
      if (!teacher) {
        toast.error(`Please assign a teacher for class ${cls.label}`);
        return;
      }
      payload.push({
        class_id: Number(cls.value),
        subject_id: Number(subject.id),
        department_id: Number(cls.department?.id || 0),
        teacher_id: Number(teacher.value),
      });
    }

    try {
      setIsSubmitting(true);
      await api.post("/class-subjects/save", payload);
      toast.success("Assignments saved successfully!");
      onUpdate?.();
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error saving assignments.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Null-safe filtered classes
  const filteredClasses =
    selectedDepartments.length > 0
      ? classesOptions.filter(
          (cls) =>
            (cls.department?.id &&
              selectedDepartments.some(
                (dep) => dep.value === cls.department.id
              )) ||
            selectedClasses.some((sc) => sc.value === cls.value)
        )
      : classesOptions;

  const handleUnassign = async () => {
    if (!subject) {
      toast.error("No subject selected to unassign.");
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to completely unassign the subject "${subject.name}" from all classes? This cannot be undone.`
    );
    if (!confirm) return;

    try {
      setIsSubmitting(true);
      await api.post("/class-subjects/unassign", { subject_id: subject.id });
      toast.success(
        `Subject "${subject.name}" has been unassigned from all classes.`
      );

      // Clear selections in the modal
      setSelectedDepartments([]);
      setSelectedClasses([]);
      setTeacherAssignments({});

      onUpdate?.(); // Refresh parent data if needed
      setStep(1); // Go back to first step
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error unassigning subject.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="assign-course-modal">
      {/* Stepper */}
      <div className="stepper">
        {["Departments", "Classes", "Teachers", "Review"].map((label, i) => (
          <div key={i} className={`step ${step === i + 1 ? "active" : ""}`}>
            {label}
          </div>
        ))}
      </div>

      {/* Step 1 - Departments */}
      {step === 1 && (
        <>
          <div className="step-content">
            <label>Select Departments</label>
            <Select
              isMulti
              options={departmentsOptions}
              value={selectedDepartments}
              onChange={setSelectedDepartments}
              placeholder="Search and select departments..."
              className="dropdown"
            />
          </div>
        </>
      )}

      {/* Step 2 - Classes */}
      {step === 2 && (
        <div className="step-content">
          <label>Select Classes</label>
          <Select
            isMulti
            options={filteredClasses}
            value={selectedClasses}
            onChange={setSelectedClasses}
            placeholder="Search and select classes..."
            className="dropdown"
          />
        </div>
      )}

      {/* Step 3 - Teachers */}
      {step === 3 && (
        <div className="step-content">
          {selectedClasses.length === 0 ? (
            <p className="info-text">Please select classes first.</p>
          ) : (
            selectedClasses.map((cls) => (
              <div key={cls.value} className="class-teacher-assign">
                <h4>{cls.label}</h4>
                <div className="subject-teacher">
                  <label>{subject?.name || "Subject"}</label>
                  <Select
                    options={teachersOptions}
                    value={teacherAssignments[cls.value] || null}
                    onChange={(teacher) =>
                      handleAssignTeacher(cls.value, teacher)
                    }
                    placeholder={`Assign teacher to ${
                      subject?.name || "subject"
                    }...`}
                    className="dropdown"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Step 4 - Review */}
      {step === 4 && (
        <div className="step-content review">
          <h4>Review Assignments</h4>
          <p>
            <strong>Departments:</strong>{" "}
            {selectedDepartments.map((d) => d.label).join(", ") || "None"}
          </p>
          <p>
            <strong>Classes:</strong>{" "}
            {selectedClasses.map((c) => c.label).join(", ") || "None"}
          </p>
          {selectedClasses.map((cls) => (
            <p key={cls.value}>
              <strong>
                {cls.label} - {subject?.name || "Subject"}:
              </strong>{" "}
              {teacherAssignments[cls.value]?.label || "No teacher assigned"}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="modal-footer">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="btn-secondary">
            Back
          </button>
        )}
        {step < 4 && (
          <button
            onClick={() => setStep(step + 1)}
            className="btn-primary"
            disabled={
              (step === 1 && selectedDepartments.length === 0) ||
              (step === 2 && selectedClasses.length === 0) ||
              (step === 3 &&
                selectedClasses.some((cls) => !teacherAssignments[cls.value]))
            }
          >
            Next
          </button>
        )}
        {step === 4 && (
          <button
            onClick={handleSave}
            className="btn-success"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        )}
        <button
          className="btn btn-danger-assign"
          onClick={handleUnassign}
          title="Completely unassign this subject from all classes/teachers"
        >
          Unassign Completely
        </button>
      </div>
    </div>
  );
}

AssignCourseModal.propTypes = {
  departmentsOptions: PropTypes.array.isRequired,
  classesOptions: PropTypes.array.isRequired,
  teachersOptions: PropTypes.array.isRequired,
  subject: PropTypes.object,
  onUpdate: PropTypes.func,
};
