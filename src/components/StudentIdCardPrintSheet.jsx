import React from "react";
import StudentIdCardPrint from "./StudentIdCardPrint";
import "./StudentIdCardPrint.css";

/** A4 print layout — up to 10 landscape ID cards per page (2 × 5). */
export function StudentIdCardPrintSheet({
  students = [],
  settings = null,
  photoMap = {},
  layout = "grid",
}) {
  if (!students.length) return null;

  return (
    <div className={`sid-print-sheet sid-print-sheet--${layout}`}>
      {students.map((student, index) => {
        const id = student.student_db_id || student.id;
        const breakAfter =
          layout === "grid" &&
          (index + 1) % 10 === 0 &&
          index !== students.length - 1;

        return (
          <div
            key={id}
            className={`sid-print-slot${breakAfter ? " sid-print-slot--page-break" : ""}`}
          >
            <StudentIdCardPrint
              student={student}
              settings={settings}
              photoSrc={photoMap[id]}
              forPrint
            />
          </div>
        );
      })}
    </div>
  );
}

export default StudentIdCardPrintSheet;
