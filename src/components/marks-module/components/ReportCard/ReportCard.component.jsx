import React, { useLayoutEffect } from "react";
import "./ReportCard.css";
import logo from "../../../../assets/logo.png";

const sampleData = {
  student: {
    name: "NKONGHO LUA DANIEL",
    registrationNumber: "VSA/2024/001",
    dateOfBirth: "15 March 2008",
    class: "LEVEL 2 MECHANICAL ENGINEERING",
    option: "MECHANICAL ENGINEERING",
    academicYear: "2023-2024",
    term: "THIRD TERM", // FIRST TERM, SECOND TERM, THIRD TERM
  },

  // Sequences data structure
  sequences: {
    seq1: { name: "Sequence 1", weight: 1 },
    seq2: { name: "Sequence 2", weight: 1 },
    seq3: { name: "Sequence 3", weight: 1 },
    seq4: { name: "Sequence 4", weight: 1 },
    seq5: { name: "Sequence 5", weight: 1 },
    seq6: { name: "Sequence 6", weight: 1 },
  },

  generalSubjects: [
    {
      code: "MTH",
      title: "MATHEMATICS",
      coef: 5,
      teacher: "NJEMA PAUL",
      scores: {
        seq1: 16,
        seq2: 18,
        seq3: 15,
        seq4: 17,
        seq5: 16,
        seq6: 19,
        term1Avg: 17.0,
        term2Avg: 16.0,
        term3Avg: 17.5,
        finalAvg: 16.8,
      },
    },
    {
      code: "ENG",
      title: "ENGLISH LANGUAGE",
      coef: 5,
      teacher: "MBAH GRACE",
      scores: {
        seq1: 15,
        seq2: 16,
        seq3: 14,
        seq4: 15,
        seq5: 17,
        seq6: 16,
        term1Avg: 15.5,
        term2Avg: 14.5,
        term3Avg: 16.5,
        finalAvg: 15.5,
      },
    },
    {
      code: "FRE",
      title: "FRENCH LANGUAGE",
      coef: 4,
      teacher: "TABI MARIE",
      scores: {
        seq1: 12,
        seq2: 13,
        seq3: 11,
        seq4: 12,
        seq5: 14,
        seq6: 13,
        term1Avg: 12.5,
        term2Avg: 11.5,
        term3Avg: 13.5,
        finalAvg: 12.5,
      },
    },
    {
      code: "COM",
      title: "COMMERCE",
      coef: 3,
      teacher: "CHIEF EXAMINER",
      scores: {
        seq1: 0,
        seq2: 15,
        seq3: 8,
        seq4: 2,
        seq5: 9,
        seq6: 12,
        term1Avg: 9.5,
        term2Avg: 10.5,
        term3Avg: 9.5,
        finalAvg: 2.5,
      },
    },
    {
      code: "ECO",
      title: "ECONOMICS",
      coef: 3,
      teacher: "FOMBA JOHN",
      scores: {
        seq1: 13,
        seq2: 14,
        seq3: 12,
        seq4: 13,
        seq5: 15,
        seq6: 14,
        term1Avg: 13.5,
        term2Avg: 12.5,
        term3Avg: 14.5,
        finalAvg: 13.5,
      },
    },
  ],

  professionalSubjects: [
    {
      code: "MED",
      title: "MECHANICAL DRAWING",
      coef: 8,
      teacher: "ENG. TABI",
      scores: {
        seq1: 15,
        seq2: 16,
        seq3: 14,
        seq4: 15,
        seq5: 17,
        seq6: 16,
        term1Avg: 15.5,
        term2Avg: 14.5,
        term3Avg: 16.5,
        finalAvg: 15.5,
      },
    },
    {
      code: "ELT",
      title: "ELECTRICAL TECHNOLOGY",
      coef: 6,
      teacher: "TECH. MBAH",
      scores: {
        seq1: 14,
        seq2: 15,
        seq3: 13,
        seq4: 14,
        seq5: 16,
        seq6: 15,
        term1Avg: 14.5,
        term2Avg: 13.5,
        term3Avg: 15.5,
        finalAvg: 14.5,
      },
    },
    {
      code: "WRP",
      title: "WORKSHOP PRACTICE",
      coef: 7,
      teacher: "TECH. FOMBA",
      scores: {
        seq1: 16,
        seq2: 17,
        seq3: 15,
        seq4: 16,
        seq5: 18,
        seq6: 17,
        term1Avg: 16.5,
        term2Avg: 15.5,
        term3Avg: 17.5,
        finalAvg: 16.5,
      },
    },
    {
      code: "SHW",
      title: "SHEET METAL WORKS",
      coef: 5,
      teacher: "TECH. GRACE",
      scores: {
        seq1: 13,
        seq2: 14,
        seq3: 12,
        seq4: 13,
        seq5: 15,
        seq6: 14,
        term1Avg: 13.5,
        term2Avg: 12.5,
        term3Avg: 14.5,
        finalAvg: 13.5,
      },
    },
    {
      code: "ENS",
      title: "ENGINEERING SCIENCE",
      coef: 6,
      teacher: "ENG. PAUL",
      scores: {
        seq1: 15,
        seq2: 16,
        seq3: 14,
        seq4: 15,
        seq5: 17,
        seq6: 16,
        term1Avg: 15.5,
        term2Avg: 14.5,
        term3Avg: 16.5,
        finalAvg: 15.5,
      },
    },
    {
      code: "ICT",
      title: "INFORMATION TECHNOLOGY",
      coef: 4,
      teacher: "TECH. MARIE",
      scores: {
        seq1: 17,
        seq2: 18,
        seq3: 16,
        seq4: 17,
        seq5: 19,
        seq6: 18,
        term1Avg: 17.5,
        term2Avg: 16.5,
        term3Avg: 18.5,
        finalAvg: 17.5,
      },
    },
    {
      code: "PRT",
      title: "PRACTICALS",
      coef: 10,
      teacher: "WORKSHOP TEAM",
      scores: {
        seq1: 18,
        seq2: 19,
        seq3: 17,
        seq4: 18,
        seq5: 19,
        seq6: 18,
        term1Avg: 18.5,
        term2Avg: 17.5,
        term3Avg: 18.5,
        finalAvg: 18.2,
      },
    },
  ],

  // Calculated totals and averages
  termTotals: {
    term1: { total: 892, average: 15.2, rank: 2, outOf: 25 },
    term2: { total: 856, average: 14.6, rank: 3, outOf: 25 },
    term3: { total: 924, average: 15.8, rank: 1, outOf: 25 },
    annual: { total: 891, average: 15.2, rank: 2, outOf: 25 },
  },

  classStatistics: {
    classAverage: 12.8,
    highestAverage: 16.2,
    lowestAverage: 8.4,
  },

  conduct: {
    attendanceDays: 65,
    totalDays: 68,
    timesLate: 2,
    disciplinaryActions: 0,
  },

  administration: {
    classMaster: "NDICHIA GLIEM",
    principal: "Dr. ACADEMIC DIRECTOR",
    nextTermStarts: "September 2024",
    decision: "PROMOTED",
  },
};

export default function ReportCard({
  data = sampleData,
  grading,
  disableAutoScale = false,
}) {
  // Default grading (fallback)
  const defaultGrading = [
    { band_min: 18, band_max: 20, comment: "Excellent" },
    { band_min: 16, band_max: 17.99, comment: "V.Good" },
    { band_min: 14, band_max: 15.99, comment: "Good" },
    { band_min: 12, band_max: 13.99, comment: "Fairly Good" },
    { band_min: 10, band_max: 11.99, comment: "Average" },
    { band_min: 0, band_max: 9.99, comment: "Weak" },
  ];

  // Normalize comments to map to color classes more flexibly
  const getRemarkClass = (remark) => {
    const norm = String(remark || "")
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();

    const map = {
      excellent: "remark-excellent",
      "v good": "remark-vgood",
      "very good": "remark-vgood",
      good: "remark-good",
      "fairly good": "remark-fairly-good",
      average: "remark-average",
      weak: "remark-weak",
    };

    return map[norm] || "";
  };

  // Grading to render in the scale (prop or default), sorted high→low
  const gradingScale = (
    Array.isArray(grading) && grading.length ? grading : defaultGrading
  )
    .slice()
    .sort((a, b) => b.band_min - a.band_min);

  const formatNum = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(1));
  const formatRange = (min, max) => `${formatNum(min)}-${formatNum(max)}`;

  // Helper function to get remark based on average
  const getRemark = (average) => {
    // if grading is provided & not empty, use it
    if (grading && Array.isArray(grading) && grading.length > 0) {
      const band = grading.find(
        (g) => average >= g.band_min && average <= g.band_max
      );
      return band ? band.comment : "No Remark";
    }

    // --- fallback default grading ---
    if (average >= 18) return "Excellent";
    if (average >= 16) return "V.Good";
    if (average >= 14) return "Good";
    if (average >= 12) return "Fairly Good";
    if (average >= 10) return "Average";
    return "Weak";
  };

  // Calculate what to show based on current term
  const getCurrentTermData = () => {
    const term = data.student.term;

    if (term === "FIRST TERM") {
      return {
        showColumns: ["seq1", "seq2", "termAvg"],
        columnHeaders: ["SEQ 1", "SEQ 2", "TERM AVG"],
        calculateTermAvg: (subject) =>
          (subject.scores.seq1 + subject.scores.seq2) / 2,
      };
    } else if (term === "SECOND TERM") {
      return {
        showColumns: ["seq3", "seq4", "termAvg", "term1Avg", "yearAvg"],
        columnHeaders: ["SEQ 3", "SEQ 4", "TERM AVG", "T1 AVG", "TOTAL AVG"],
        calculateTermAvg: (subject) =>
          (subject.scores.seq3 + subject.scores.seq4) / 2,
        calculateYearAvg: (subject) =>
          (subject.scores.term1Avg + subject.scores.term2Avg) / 2,
      };
    } else {
      // THIRD TERM
      return {
        showColumns: [
          "seq5",
          "seq6",
          "termAvg",
          "term1Avg",
          "term2Avg",
          "finalAvg",
        ],
        columnHeaders: [
          "SEQ 5",
          "SEQ 6",
          "TERM AVG",
          "T1 AVG",
          "T2 AVG",
          "FINAL AVG",
        ],
        calculateTermAvg: (subject) =>
          (subject.scores.seq5 + subject.scores.seq6) / 2,
        calculateYearAvg: (subject) =>
          (subject.scores.term1Avg +
            subject.scores.term2Avg +
            subject.scores.term3Avg) /
          3,
        calculateFinalAvg: (subject) => subject.scores.finalAvg,
      };
    }
  };

  const termData = getCurrentTermData();

  // Cumulative average (to date): T1 only in term 1, T1+T2 in term 2, T1+T2+T3 in term 3
  const getCumulativeAverageToDate = () => {
    const term = data.student.term;
    const t1 = data.termTotals?.term1?.average;
    const t2 = data.termTotals?.term2?.average;
    const t3 = data.termTotals?.term3?.average;

    if (term === "FIRST TERM") {
      return typeof t1 === "number" ? Number(t1.toFixed(1)) : null;
    }

    if (term === "SECOND TERM") {
      const avgs = [t1, t2].filter((v) => typeof v === "number");
      if (!avgs.length) return null;
      return Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1));
    }

    // THIRD TERM
    const avgs = [t1, t2, t3].filter((v) => typeof v === "number");
    if (!avgs.length) return null;
    return Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1));
  };

  const renderSubjectRow = (subject, index) => {
    const termAvg = termData.calculateTermAvg(subject);
    const remark = getRemark(termAvg);

    const renderNumCell = (value, type, key) => {
      const num = Number(value);
      const formatted = type === "avg" ? num.toFixed(1) : num;
      const baseClass = type === "avg" ? "avg-cell" : "score-cell";
      return (
        <td key={key} className={`${baseClass} ${num < 10 ? "low-score" : ""}`}>
          {formatted}
        </td>
      );
    };

    return (
      <tr key={index} className="subject-row">
        <td className="code-cell">{subject.code}</td>
        <td className="subject-cell">{subject.title}</td>

        {termData.showColumns.map((col, colIndex) => {
          if (col === "termAvg") {
            return renderNumCell(termAvg, "avg", colIndex);
          } else if (col === "yearAvg" && termData.calculateYearAvg) {
            return renderNumCell(
              termData.calculateYearAvg(subject),
              "avg",
              colIndex
            );
          } else if (col === "finalAvg" && termData.calculateFinalAvg) {
            return renderNumCell(
              termData.calculateFinalAvg(subject),
              "avg",
              colIndex
            );
          } else if (["term1Avg", "term2Avg", "term3Avg"].includes(col)) {
            return renderNumCell(subject.scores[col], "avg", colIndex);
          } else {
            // sequence scores
            return renderNumCell(subject.scores[col], "score", colIndex);
          }
        })}

        <td className="coef-cell">{subject.coef}</td>
        <td className="total-cell">{(termAvg * subject.coef).toFixed(1)}</td>
        <td className="remark-cell">
          <span className={getRemarkClass(remark)}>{remark}</span>
        </td>
        <td className="teacher-cell">{subject.teacher}</td>
      </tr>
    );
  };

  React.useLayoutEffect(() => {
    if (disableAutoScale) return;

    const mmToPx = (mm) => (mm / 25.4) * 96; // 96 CSS px per inch

    const setScale = () => {
      const el = document.getElementById("reportCard");
      if (!el) return;

      // Reset scale first to get natural dimensions
      document.documentElement.style.setProperty("--print-scale", "1");

      const marginMm = 10; // MUST match --page-margin-mm and @page margin
      const printableHeightPx = mmToPx(297 - marginMm * 2); // A4 height minus margins

      // Multiple measurement attempts for accuracy
      const measure = () => {
        // Force layout recalculation
        el.offsetHeight;

        const rect = el.getBoundingClientRect();
        const naturalHeight = Math.max(
          rect.height,
          el.scrollHeight,
          el.offsetHeight
        );

        let scale = printableHeightPx / naturalHeight;
        if (!isFinite(scale) || scale <= 0) scale = 1;

        // Add small buffer to ensure content fits
        scale = Math.min(0.98, scale); // Max 98% to ensure fit with small buffer

        // Minimum scale to maintain readability
        scale = Math.max(0.4, scale);

        document.documentElement.style.setProperty(
          "--print-scale",
          String(scale)
        );
      };

      // Multiple timing strategies for different browsers
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          setTimeout(measure, 10);
          setTimeout(measure, 50);
          setTimeout(measure, 100);
        });
      } else {
        setTimeout(measure, 10);
        setTimeout(measure, 50);
        setTimeout(measure, 100);
      }
    };

    const beforePrint = () => {
      // Multiple scaling attempts for reliability
      setScale();
      setTimeout(setScale, 10);
    };

    const afterPrint = () => {
      document.documentElement.style.setProperty("--print-scale", "1");
    };

    // Standard print event listeners
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);

    // Chrome print preview media query
    const printMediaQuery = window.matchMedia("print");
    const handlePrintChange = (e) => {
      if (e.matches) {
        beforePrint();
      } else {
        afterPrint();
      }
    };

    if (printMediaQuery.addEventListener) {
      printMediaQuery.addEventListener("change", handlePrintChange);
    } else if (printMediaQuery.addListener) {
      printMediaQuery.addListener(handlePrintChange);
    }

    // Initial scaling on component mount
    setTimeout(setScale, 100);

    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      if (printMediaQuery.removeEventListener) {
        printMediaQuery.removeEventListener("change", handlePrintChange);
      } else if (printMediaQuery.removeListener) {
        printMediaQuery.removeListener(handlePrintChange);
      }
    };
  }, [disableAutoScale]);

  return (
    <div className="report-card-container">
      <div className="report-card" id="reportCard">
        {/* Header */}
        <div className="document-header">
          <div className="header-content">
            <div className="left-section">
              <div className="republic-text">RÉPUBLIQUE DU CAMEROUN</div>
              <div className="motto">PAIX - TRAVAIL - PATRIE</div>
              <div className="ministry">
                MINISTÈRE DE L&apos;EMPLOI ET DE LA FORMATION PROFESSIONNELLE
              </div>
              <div className="department">
                DIRECTION DE L&apos;ENSEIGNEMENT PRIVÉ
              </div>
              <div className="school-name-header">VOTECH S7 ACADEMY</div>
              <div className="location">AZIRE - MANKON</div>
            </div>

            <div className="center-emblem">
              <img src={logo} alt="" className="report-card-logo" />
              <div className="center-text">
                <div className="igniting-text">
                  IGNITING &apos;&apos;Preneurs
                </div>
                <div className="center-motto">
                  Motto: Welfare, Productivity, Self Actualization
                </div>
              </div>
            </div>

            <div className="right-section">
              <div className="republic-text">REPUBLIC OF CAMEROON</div>
              <div className="motto">PEACE - WORK - FATHERLAND</div>
              <div className="ministry">
                MINISTRY OF EMPLOYMENT AND VOCATIONAL TRAINING
              </div>
              <div className="department">
                DEPARTMENT OF PRIVATE VOCATIONAL INSTITUTE
              </div>
              <div className="school-name-header">VOTECH S7 ACADEMY</div>
              <div className="location">AZIRE - MANKON</div>
            </div>
          </div>

          <div className="document-title">
            <h1>ACADEMIC REPORT CARD</h1>
            <div className="term-info">
              {data.student.term} • {data.student.academicYear}
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div className="student-info">
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Student Name:</td>
                <td className="value">{data.student.name}</td>
                <td className="label">Class:</td>
                <td className="value">{data.student.class}</td>
              </tr>
              <tr>
                <td className="label">Registration No:</td>
                <td className="value">{data.student.registrationNumber}</td>
                <td className="label">Specialty:</td>
                <td className="value">{data.student.option}</td>
              </tr>
              <tr>
                <td className="label">Date of Birth:</td>
                <td className="value">{data.student.dateOfBirth}</td>
                <td className="label">Academic Year:</td>
                <td className="value">{data.student.academicYear}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* General Subjects */}
        <div className="subjects-section">
          <div className="section-header">
            <h3>GENERAL SUBJECTS</h3>
          </div>
          <table className="subjects-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>SUBJECT TITLE</th>
                {termData.columnHeaders.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
                <th>COEF</th>
                <th>TOTAL</th>
                <th>REMARK</th>
                <th>TEACHER</th>
              </tr>
            </thead>
            <tbody>
              {data.generalSubjects.map((subject, index) =>
                renderSubjectRow(subject, index)
              )}
              {/* General Subjects Subtotal */}
              <tr className="subtotal-row">
                <td
                  colSpan={termData.columnHeaders.length + 3}
                  className="subtotal-label"
                >
                  SUB TOTAL:
                </td>
                {(() => {
                  const { totalWeighted, totalCoef } =
                    data.generalSubjects.reduce(
                      (acc, subject) => {
                        const avg = parseFloat(
                          termData.calculateTermAvg(subject)
                        );
                        acc.totalWeighted += avg * subject.coef;
                        acc.totalCoef += subject.coef;
                        return acc;
                      },
                      { totalWeighted: 0, totalCoef: 0 }
                    );

                  const avg = totalWeighted / totalCoef; // subtotal average
                  const remark = getRemark(avg);

                  return (
                    <>
                      <td className="subtotal-value">
                        {totalWeighted.toFixed(0)}
                      </td>
                      <td className="subtotal-remark">
                        <span className={getRemarkClass(remark)}>{remark}</span>
                      </td>
                      <td></td>
                    </>
                  );
                })()}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Professional Subjects */}
        <div className="subjects-section">
          <div className="section-header">
            <h3>PROFESSIONAL SUBJECTS</h3>
          </div>
          <table className="subjects-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>SUBJECT TITLE</th>
                {termData.columnHeaders.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
                <th>COEF</th>
                <th>TOTAL</th>
                <th>REMARK</th>
                <th>TEACHER</th>
              </tr>
            </thead>
            <tbody>
              {data.professionalSubjects.map((subject, index) =>
                renderSubjectRow(subject, index)
              )}
              {/* Professional Subjects Subtotal */}
              <tr className="subtotal-row">
                <td
                  colSpan={termData.columnHeaders.length + 3}
                  className="subtotal-label"
                >
                  SUB TOTAL:
                </td>
                {(() => {
                  const { totalWeighted, totalCoef } =
                    data.professionalSubjects.reduce(
                      (acc, subject) => {
                        const avg = parseFloat(
                          termData.calculateTermAvg(subject)
                        );
                        acc.totalWeighted += avg * subject.coef;
                        acc.totalCoef += subject.coef;
                        return acc;
                      },
                      { totalWeighted: 0, totalCoef: 0 }
                    );

                  const avg = totalWeighted / totalCoef;
                  const remark = getRemark(avg);

                  return (
                    <>
                      <td className="subtotal-value">
                        {totalWeighted.toFixed(0)}
                      </td>
                      <td className="subtotal-remark">
                        <span className={getRemarkClass(remark)}>{remark}</span>
                      </td>
                      <td></td>
                    </>
                  );
                })()}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Performance Summary */}
        <div className="performance-summary">
          {(() => {
            const termKey =
              data.student.term === "FIRST TERM"
                ? "term1"
                : data.student.term === "SECOND TERM"
                ? "term2"
                : "term3";
            const t = data.termTotals[termKey];

            const cumulativeAvg = getCumulativeAverageToDate();
            const countedLabel =
              data.student.term === "FIRST TERM"
                ? "T1"
                : data.student.term === "SECOND TERM"
                ? "T1 + T2"
                : "T1 + T2 + T3";

            return (
              <table className="summary-table">
                <tbody>
                  <tr>
                    <td className="summary-label">GRAND TOTAL:</td>
                    <td className="summary-value">{Math.round(t.total)}</td>
                    <td className="summary-label">STUDENT AVERAGE:</td>
                    <td className="summary-value">{t.average}/20</td>
                  </tr>
                  <tr>
                    <td className="summary-label">CLASS AVERAGE:</td>
                    <td className="summary-value">
                      {data.classStatistics.classAverage}/20
                    </td>
                    <td className="summary-label">CLASS RANK:</td>
                    <td className="summary-value">
                      {t.rank}° of {t.outOf}
                    </td>
                  </tr>
                  <tr>
                    <td className="summary-label">
                      CUMULATIVE AVERAGE ({countedLabel}):
                    </td>
                    <td className="summary-value">
                      {cumulativeAvg !== null ? `${cumulativeAvg}/20` : "N/A"}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* Bottom Section */}
        <div className="bottom-section">
          <div className="left-column">
            <div className="conduct-section">
              <h4>CONDUCT & ATTENDANCE</h4>
              <table className="conduct-table">
                <tbody>
                  <tr>
                    <td>Days Present:</td>
                    <td>
                      {data.conduct.attendanceDays}/{data.conduct.totalDays}
                    </td>
                  </tr>
                  <tr>
                    <td>Times Late:</td>
                    <td>{data.conduct.timesLate}</td>
                  </tr>
                  <tr>
                    <td>Disciplinary Actions:</td>
                    <td>{data.conduct.disciplinaryActions}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="center-column">
            <div className="grading-scale">
              <h4>GRADING SCALE</h4>
              <table className="scale-table">
                <tbody>
                  {gradingScale.map((g, i) => (
                    <tr key={i}>
                      <td>{formatRange(g.band_min, g.band_max)}:</td>
                      <td>
                        <span className={getRemarkClass(g.comment)}>
                          {g.comment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="right-column">
            <div className="admin-section">
              <h4>ADMINISTRATION</h4>
              <table className="admin-table">
                <tbody>
                  <tr>
                    <td>Class Master:</td>
                    <td>{data.administration.classMaster?.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td>Decision:</td>
                    <td>
                      <span className="remark-good">
                        {data.administration.decision}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Next Term:</td>
                    <td>{data.administration.nextTermStarts}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-title">CLASS MASTER</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.administration.classMaster?.toUpperCase()}
            </div>
            <div className="signature-date">Date & Signature</div>
          </div>

          <div className="signature-box">
            <div className="signature-title">PRINCIPAL</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.administration.principal?.toUpperCase()}
            </div>
            <div className="signature-date">Date, Signature & Seal</div>
          </div>

          <div className="signature-box">
            <div className="signature-title">PARENT/GUARDIAN</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.administration.parents?.toUpperCase()}
            </div>
            <div className="signature-date">Date & Signature</div>
          </div>
        </div>
      </div>

      <span className="footer-text">
        © {new Date().getFullYear()} Izzy Tech Team – Official Document | Votech
        (S7) Academy
      </span>
    </div>
  );
}
