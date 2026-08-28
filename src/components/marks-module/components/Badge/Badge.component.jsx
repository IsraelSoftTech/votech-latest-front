import React from "react";
import "./Badge.styles.css";

// One pill for every marks-module status/grade indicator, replacing the
// ~12 separately-defined pill CSS blocks (one per page) that all drew the
// same shape with slightly different colors. `tone` picks the color;
// `grade` is a convenience for the six report-card bands specifically
// (Excellent/V.Good/Good/Fairly Good/Average/Weak), since those already
// have fixed, established colors elsewhere (reportCardPdfGenerator.js)
// that must stay in sync rather than drift.
// Prefixed "grade-" so a grade of "Good" (navy) never collides with the
// unrelated status tone "good" (green, e.g. a completed session).
const GRADE_TONE = {
  excellent: "grade-excellent",
  "v.good": "grade-vgood",
  good: "grade-good",
  "fairly good": "grade-fairlygood",
  average: "grade-average",
  weak: "grade-weak",
};

export function Badge({ children, tone = "neutral", grade }) {
  const resolvedTone = grade ? GRADE_TONE[String(grade).toLowerCase()] || "neutral" : tone;
  return <span className={`vt-badge vt-badge-${resolvedTone}`}>{children}</span>;
}

export default Badge;
