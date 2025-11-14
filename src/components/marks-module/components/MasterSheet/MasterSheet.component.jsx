import React, { useMemo, useState, useEffect } from "react";
import "./mastersheet.css";
import { FaDownload, FaChevronDown, FaChevronUp } from "react-icons/fa";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import "pdfmake/build/vfs_fonts";

pdfMake.vfs =
  pdfFonts?.pdfMake?.vfs ||
  pdfFonts?.vfs ||
  (typeof window !== "undefined" && window.pdfMake?.vfs) ||
  pdfMake.vfs;

// Brand + table colors
const BRAND_BLUE = "#204080";
const BRAND_GOLD = "#c9a96e";
const HEADER_BG1 = "#eaf0fb";
const HEADER_BG2 = "#f1f4fb";
const COEF_BG = "#fbf6ea";
const ZEBRA_BG = "#fbfcff";

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

export default function MasterSheet({ data = [], term = "annual" }) {
  const isMobile = useIsMobile();
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [expandedStudent, setExpandedStudent] = useState(null);

  const prepared = useMemo(() => prepare(data, term), [data, term]);

  const computedStats = useMemo(
    () => computeClassStats(prepared?.students || [], term),
    [prepared?.students, term]
  );

  if (!prepared) {
    return (
      <div className="ms-wrapper">
        <div className="ms-card">
          <div>No data available.</div>
        </div>
      </div>
    );
  }

  const {
    metadata,
    subjects,
    students,
    subjectSubcolumns,
    totalsColumns,
    administration,
  } = prepared;

  const termLabel =
    term === "term1"
      ? "First Term"
      : term === "term2"
      ? "Second Term"
      : term === "term3"
      ? "Third Term"
      : "Annual";

  const allSubjects = useMemo(
    () => [...subjects.general, ...subjects.professional],
    [subjects]
  );

  const handleDownloadPDF = async () => {
    try {
      setPdfGenerating(true);
      setPdfProgress({ current: 0, total: students.length });

      const docDefinition = await buildDocDefinitionSequentialLandscapeNoRepeat(
        prepared,
        term,
        computedStats,
        (curr, total) => setPdfProgress({ current: curr, total })
      );

      const fileName = [
        "Master-Sheet",
        prepared.metadata?.departmentName || "Dept",
        prepared.metadata?.className || "Class",
        prepared.metadata?.academicYear || "Year",
        term === "term1"
          ? "T1"
          : term === "term2"
          ? "T2"
          : term === "term3"
          ? "T3"
          : "Annual",
      ]
        .filter(Boolean)
        .join("_")
        .replace(/\s+/g, "-");

      pdfMake.createPdf(docDefinition).download(`${fileName}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("PDF generation failed. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const toggleStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  return (
    <div className="ms-wrapper">
      <div className="ms-controls no-print">
        <div className="ms-controls-left">
          <strong className="ms-controls-title">
            Master Sheet — {termLabel}
          </strong>
        </div>
        <div className="ms-controls-right">
          {pdfGenerating && (
            <div className="ms-pdf-status">
              Generating PDF… {pdfProgress.current}/{pdfProgress.total} rows —
              grab a coffee ☕
            </div>
          )}
          <button
            className="ms-btn"
            onClick={handleDownloadPDF}
            disabled={pdfGenerating}
          >
            <FaDownload />
            <span className="ms-btn-text">
              {pdfGenerating ? "Working…" : "Download PDF"}
            </span>
          </button>
        </div>
      </div>

      <div className="ms-card">
        <header className="ms-header">
          <h1 className="ms-top-head">Master Sheet</h1>
          <div className="ms-meta">
            <div className="ms-meta-row">
              <span>School: {metadata.schoolName}</span>
              <span>Department: {metadata.departmentName}</span>
              <span>Class: {metadata.className}</span>
              <span>Academic Year: {metadata.academicYear}</span>
              <span>View: {termLabel}</span>
            </div>
          </div>
        </header>

        {/* Desktop table */}
        {!isMobile && (
          <div className="ms-table-wrapper">
            <table className="ms-table">
              <thead>
                <tr>
                  <th className="ms-sticky-col" colSpan={3}>
                    Student Info
                  </th>
                  {subjects.general.length > 0 && (
                    <th
                      className="ms-group"
                      colSpan={
                        subjects.general.length * subjectSubcolumns.length
                      }
                    >
                      General Subjects
                    </th>
                  )}
                  {subjects.professional.length > 0 && (
                    <th
                      className="ms-group"
                      colSpan={
                        subjects.professional.length * subjectSubcolumns.length
                      }
                    >
                      Professional Subjects
                    </th>
                  )}
                  {totalsColumns.length > 0 && (
                    <th className="ms-group" colSpan={totalsColumns.length}>
                      Totals
                    </th>
                  )}
                </tr>

                <tr>
                  <th className="ms-sticky-col">S/N</th>
                  <th className="ms-sticky-col">Student ID</th>
                  <th className="ms-sticky-col">Student Name</th>

                  {subjects.general.map((s) => (
                    <th
                      key={`g-${s.code}`}
                      className="ms-subject"
                      colSpan={subjectSubcolumns.length}
                    >
                      {s.code} — {s.title}
                    </th>
                  ))}
                  {subjects.professional.map((s) => (
                    <th
                      key={`p-${s.code}`}
                      className="ms-subject"
                      colSpan={subjectSubcolumns.length}
                    >
                      {s.code} — {s.title}
                    </th>
                  ))}

                  {totalsColumns.map((c) => (
                    <th key={`totals-${c.key}`} className="ms-subject">
                      {c.label}
                    </th>
                  ))}
                </tr>

                <tr>
                  <th className="ms-sticky-col" />
                  <th className="ms-sticky-col" />
                  <th className="ms-sticky-col" />

                  {[...allSubjects].map((s, idx) =>
                    subjectSubcolumns.map((sub) => (
                      <th
                        key={`${s.code}-${sub.key}-${idx}`}
                        className={`ms-subcol ${
                          sub.key === "coef" ? "ms-coef" : ""
                        }`}
                      >
                        {sub.label}
                      </th>
                    ))
                  )}

                  {totalsColumns.map((c) => (
                    <th key={`sub-${c.key}`} className="ms-subcol">
                      {c.short || c.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {prepared.students.map((st, rowIdx) => (
                  <tr key={st.studentId || rowIdx} className="ms-row">
                    <td className="ms-sticky-col">{rowIdx + 1}</td>
                    <td className="ms-sticky-col">{st.studentId}</td>
                    <td className="ms-sticky-col ms-name">{st.name}</td>

                    {[...allSubjects].map((s) => {
                      const subjScores = st.subjects[s.code] || null;
                      return subjectSubcolumns.map((sub, si, arr) => {
                        const val = getSubjectValue(subjScores, sub.key);
                        return (
                          <td
                            key={`${st.studentId}-${s.code}-${sub.key}`}
                            className={`ms-cell ${
                              sub.key === "coef" ? "ms-coef" : ""
                            } ${si === arr.length - 1 ? "ms-block-end" : ""}`}
                          >
                            {fmt(val)}
                          </td>
                        );
                      });
                    })}

                    {totalsColumns.map((c) => (
                      <td
                        key={`${st.studentId}-tot-${c.key}`}
                        className="ms-cell"
                      >
                        {fmt(getTotalsValue(st, c.key, term))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile card layout */}
        {isMobile && (
          <div className="ms-mobile-container">
            {prepared.students.map((st, rowIdx) => {
              const isExpanded = expandedStudent === st.studentId;
              return (
                <div key={st.studentId || rowIdx} className="ms-mobile-card">
                  {/* Card header - always visible */}
                  <div
                    className="ms-mobile-card-header"
                    onClick={() => toggleStudent(st.studentId)}
                  >
                    <div className="ms-mobile-student-info">
                      <div className="ms-mobile-sn">{rowIdx + 1}</div>
                      <div className="ms-mobile-student-details">
                        <div className="ms-mobile-student-name">{st.name}</div>
                        <div className="ms-mobile-student-id">
                          ID: {st.studentId}
                        </div>
                      </div>
                    </div>
                    <button className="ms-mobile-expand-btn">
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>

                  {/* Quick stats - always visible */}
                  <div className="ms-mobile-quick-stats">
                    {totalsColumns.map((c) => (
                      <div key={c.key} className="ms-mobile-stat">
                        <span className="ms-mobile-stat-label">{c.label}</span>
                        <span className="ms-mobile-stat-value">
                          {fmt(getTotalsValue(st, c.key, term))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Expandable subject details */}
                  {isExpanded && (
                    <div className="ms-mobile-card-body">
                      {/* General Subjects */}
                      {subjects.general.length > 0 && (
                        <div className="ms-mobile-subject-group">
                          <h4 className="ms-mobile-group-title">
                            General Subjects
                          </h4>
                          {subjects.general.map((s) => {
                            const subjScores = st.subjects[s.code] || null;
                            return (
                              <div
                                key={s.code}
                                className="ms-mobile-subject-card"
                              >
                                <div className="ms-mobile-subject-header">
                                  {s.code} — {s.title}
                                </div>
                                <div className="ms-mobile-subject-scores">
                                  {subjectSubcolumns.map((sub) => (
                                    <div
                                      key={sub.key}
                                      className={`ms-mobile-score-item ${
                                        sub.key === "coef" ? "coef" : ""
                                      }`}
                                    >
                                      <span className="ms-mobile-score-label">
                                        {sub.label}
                                      </span>
                                      <span className="ms-mobile-score-value">
                                        {fmt(
                                          getSubjectValue(subjScores, sub.key)
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Professional Subjects */}
                      {subjects.professional.length > 0 && (
                        <div className="ms-mobile-subject-group">
                          <h4 className="ms-mobile-group-title">
                            Professional Subjects
                          </h4>
                          {subjects.professional.map((s) => {
                            const subjScores = st.subjects[s.code] || null;
                            return (
                              <div
                                key={s.code}
                                className="ms-mobile-subject-card"
                              >
                                <div className="ms-mobile-subject-header">
                                  {s.code} — {s.title}
                                </div>
                                <div className="ms-mobile-subject-scores">
                                  {subjectSubcolumns.map((sub) => (
                                    <div
                                      key={sub.key}
                                      className={`ms-mobile-score-item ${
                                        sub.key === "coef" ? "coef" : ""
                                      }`}
                                    >
                                      <span className="ms-mobile-score-label">
                                        {sub.label}
                                      </span>
                                      <span className="ms-mobile-score-value">
                                        {fmt(
                                          getSubjectValue(subjScores, sub.key)
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics and signatures */}
        {(computedStats || administration) && (
          <section className="ms-footer">
            {computedStats && (
              <div className="ms-stats">
                <div>Class Average: {fmt(computedStats.classAverage)}</div>
                <div>Highest Average: {fmt(computedStats.highestAverage)}</div>
                <div>Lowest Average: {fmt(computedStats.lowestAverage)}</div>
              </div>
            )}
            {administration && (
              <div className="ms-signatures">
                <div className="ms-sign">
                  <div className="ms-sign-role">Class Master</div>
                  <div className="ms-sign-name">
                    {administration.classMaster?.toUpperCase() || "—"}
                  </div>
                </div>
                <div className="ms-sign">
                  <div className="ms-sign-role">Principal</div>
                  <div className="ms-sign-name">
                    {administration.principal?.toUpperCase() || "—"}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/* ===================== All the PDF and helper functions remain the same ===================== */

function buildDocDefinitionSequentialLandscapeNoRepeat(
  prepared,
  selectedTerm,
  stats,
  onProgress
) {
  return new Promise((resolve) => {
    const {
      metadata,
      subjects,
      students,
      subjectSubcolumns,
      totalsColumns,
      administration,
    } = prepared;

    const typedSubjects = [
      ...(subjects.general || []).map((s) => ({ ...s, _type: "general" })),
      ...(subjects.professional || []).map((s) => ({
        ...s,
        _type: "professional",
      })),
    ];

    const flatCols = [];
    (typedSubjects || []).forEach((s) => {
      (subjectSubcolumns || []).forEach((sub) => {
        flatCols.push({
          code: s.code,
          title: s.title,
          type: s._type,
          subKey: sub.key,
          subLabel: sub.label,
        });
      });
    });

    const MAX_SUBCOLS_FIRST = 20;
    const MAX_SUBCOLS_MIDDLE = 34;
    const MAX_SUBCOLS_LAST = Math.max(16, 30 - (totalsColumns?.length || 0));

    const chunks = [];
    if (!flatCols.length) {
      chunks.push([]);
    } else {
      let start = 0;
      const firstTake = Math.min(MAX_SUBCOLS_FIRST, flatCols.length);
      chunks.push(flatCols.slice(start, start + firstTake));
      start += firstTake;

      while (start < flatCols.length) {
        const remaining = flatCols.length - start;
        const isLast = remaining <= MAX_SUBCOLS_LAST;
        const take = isLast
          ? remaining
          : Math.min(MAX_SUBCOLS_MIDDLE, remaining);
        chunks.push(flatCols.slice(start, start + take));
        start += take;
      }
    }

    const lastIdx = Math.max(0, chunks.length - 1);
    const slices = chunks.map((cols, idx) => ({
      cols,
      includeLeft: idx === 0,
      includeTotals: idx === lastIdx && (totalsColumns?.length || 0) > 0,
    }));

    const headersBySlice = slices.map((slice) =>
      buildHeaderRowsForSlice(
        slice.cols,
        slice.includeLeft,
        slice.includeTotals,
        totalsColumns
      )
    );

    const bodyRowsBySlice = slices.map(() => []);
    const totalRows = students.length;
    const ROW_BATCH = 200;
    let idx = 0;

    const processBatch = () => {
      const end = Math.min(idx + ROW_BATCH, totalRows);

      for (let i = idx; i < end; i++) {
        const st = students[i];

        slices.forEach((slice, sIdx) => {
          const row = [];

          if (slice.includeLeft) {
            row.push({
              text: String(i + 1),
              alignment: "center",
              noWrap: true,
              color: "#000",
            });
            row.push({
              text: String(st.studentId),
              alignment: "center",
              noWrap: true,
              color: "#000",
            });
            row.push({
              text: st.name,
              alignment: "left",
              noWrap: true,
              color: "#000",
            });
          }

          slice.cols.forEach((col) => {
            const subjScores = st.subjects?.[col.code] || {};
            const raw = getSubjectRaw(subjScores, col.subKey);
            const color = valueColor(col.subKey, raw);
            const cell = {
              text: fmt(raw),
              alignment: "center",
              noWrap: true,
              color,
            };
            if (String(col.subKey).toLowerCase() === "coef") {
              cell.fillColor = COEF_BG;
            }
            row.push(cell);
          });

          if (slice.includeTotals) {
            (totalsColumns || []).forEach((c) => {
              const raw = getTotalsRaw(st, c.key, selectedTerm);
              const color = valueColor(c.key, raw);
              row.push({
                text: fmt(raw),
                alignment: "center",
                noWrap: true,
                color,
              });
            });
          }

          bodyRowsBySlice[sIdx].push(row);
        });
      }

      onProgress?.(end, totalRows);
      idx = end;

      if (idx < totalRows) {
        setTimeout(processBatch, 0);
      } else {
        const termLabel =
          selectedTerm === "term1"
            ? "First Term"
            : selectedTerm === "term2"
            ? "Second Term"
            : selectedTerm === "term3"
            ? "Third Term"
            : "Annual";

        const content = [];

        content.push({
          text: `Master Sheet — ${termLabel}`,
          alignment: "center",
          bold: true,
          color: BRAND_BLUE,
          fontSize: 14,
          margin: [0, 0, 0, 4],
        });

        content.push({
          columns: [
            {
              text: `School: ${prepared.metadata.schoolName}`,
              bold: true,
              fontSize: 12,
            },
            {
              text: `Department: ${prepared.metadata.departmentName}`,
              bold: true,
              fontSize: 12,
              color: BRAND_BLUE,
              alignment: "center",
            },
            {
              text: `Class: ${prepared.metadata.className}`,
              bold: true,
              fontSize: 12,
              color: BRAND_BLUE,
              alignment: "center",
            },
            {
              text: `Academic Year: ${prepared.metadata.academicYear}`,
              bold: true,
              fontSize: 12,
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 6],
        });

        const layoutForSlice = (slice) => {
          const leftCount = slice.includeLeft ? 3 : 0;
          const groupBreaks = new Set();
          if (slice.includeTotals)
            groupBreaks.add(leftCount + slice.cols.length);
          let span = 0;
          for (let i = 0; i < slice.cols.length; i++) {
            span++;
            const next = slice.cols[i + 1];
            if (!next || next.code !== slice.cols[i].code) {
              groupBreaks.add(leftCount + span);
            }
          }
          return {
            fillColor: (rowIndex) => {
              if (rowIndex === 0) return HEADER_BG1;
              if (rowIndex === 1) return HEADER_BG1;
              if (rowIndex === 2) return HEADER_BG2;
              return (rowIndex - 3) % 2 === 0 ? ZEBRA_BG : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: (i) => (groupBreaks.has(i) ? 2 : 0.5),
            hLineColor: () => "#000",
            vLineColor: (i) => (groupBreaks.has(i) ? BRAND_GOLD : "#000"),
            paddingTop: () => 1,
            paddingBottom: () => 1,
            paddingLeft: () => 1,
            paddingRight: () => 1,
          };
        };

        const computeWidths = (slice) => {
          const widths = [];
          if (slice.includeLeft) widths.push("auto", "auto", "auto");
          for (let k = 0; k < slice.cols.length; k++) widths.push("*");
          if (slice.includeTotals) {
            for (let t = 0; t < (totalsColumns?.length || 0); t++)
              widths.push("auto");
          }
          if (!widths.includes("*")) widths[widths.length - 1] = "*";
          return widths;
        };

        slices.forEach((slice, sIdx) => {
          const [groupRow, codeRow, subRow] = headersBySlice[sIdx];
          const widths = computeWidths(slice);
          content.push({
            pageBreak: sIdx > 0 ? "before" : undefined,
            margin: [0, 0, 0, 0],
            table: {
              headerRows: 3,
              widths,
              body: [groupRow, codeRow, subRow, ...bodyRowsBySlice[sIdx]],
            },
            layout: layoutForSlice(slice),
          });
        });

        if (stats) {
          content.push({
            margin: [0, 4, 0, 0],
            table: {
              widths: ["*", "*", "*"],
              body: [
                [
                  {
                    text: `Class Average: ${fmt(stats.classAverage)}`,
                    alignment: "left",
                    bold: true,
                  },
                  {
                    text: `Highest: ${fmt(stats.highestAverage)}`,
                    alignment: "center",
                  },
                  {
                    text: `Lowest: ${fmt(stats.lowestAverage)}`,
                    alignment: "right",
                  },
                ],
              ],
            },
            layout: "noBorders",
          });
        }
        if (administration) {
          content.push({
            margin: [0, 8, 0, 0],
            table: {
              widths: ["*", "*"],
              body: [
                [
                  {
                    text: "Class Master",
                    bold: true,
                    alignment: "center",
                    color: BRAND_BLUE,
                  },
                  {
                    text: "Principal",
                    bold: true,
                    alignment: "center",
                    color: BRAND_BLUE,
                  },
                ],
                [
                  {
                    text: administration.classMaster?.toUpperCase() || "—",
                    margin: [0, 12, 0, 0],
                    alignment: "center",
                    decoration: "overline",
                  },
                  {
                    text: administration.principal?.toUpperCase() || "—",
                    margin: [0, 12, 0, 0],
                    alignment: "center",
                    decoration: "overline",
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
          });
        }

        const docDefinition = {
          compress: true,
          pageSize: { width: 841.89, height: 595.28 },
          pageOrientation: "landscape",
          pageMargins: [6, 6, 6, 6],
          defaultStyle: { fontSize: 8.5, lineHeight: 1.12 },
          content,
          styles: {
            thCenter: { bold: true, alignment: "center" },
            thSmall: { bold: true, fontSize: 8, alignment: "center" },
          },
        };

        resolve(docDefinition);
      }
    };

    setTimeout(processBatch, 0);
  });
}

function buildHeaderRowsForSlice(
  chunkCols,
  includeLeft,
  includeTotals,
  totalsColumns
) {
  const row0 = [];
  const row1 = [];
  const row2 = [];

  const leftCount = includeLeft ? 3 : 0;
  const genSpan = chunkCols.filter((c) => c.type === "general").length;
  const proSpan = chunkCols.filter((c) => c.type === "professional").length;
  const totSpan = includeTotals ? totalsColumns?.length || 0 : 0;

  const pushGroup = (text, span) => {
    row0.push({
      text,
      style: "thCenter",
      fillColor: HEADER_BG1,
      colSpan: span,
    });
    for (let i = 1; i < span; i++)
      row0.push({ text: "", fillColor: HEADER_BG1 });
  };

  if (leftCount > 0) pushGroup("Student Info", leftCount);
  if (genSpan > 0) pushGroup("General Subjects", genSpan);
  if (proSpan > 0) pushGroup("Professional Courses", proSpan);
  if (totSpan > 0) pushGroup("Totals", totSpan);

  if (includeLeft) {
    row1.push({ text: "S/N", style: "thCenter", fillColor: HEADER_BG1 });
    row1.push({ text: "Student ID", style: "thCenter", fillColor: HEADER_BG1 });
    row1.push({
      text: "Student Name",
      style: "thCenter",
      fillColor: HEADER_BG1,
    });
  }

  let i = 0;
  while (i < chunkCols.length) {
    const subj = chunkCols[i];
    let span = 1;
    i++;
    while (i < chunkCols.length && chunkCols[i].code === subj.code) {
      span++;
      i++;
    }
    row1.push({
      text: `${subj.code} — ${subj.title}`,
      style: "thCenter",
      fillColor: HEADER_BG1,
      colSpan: span,
    });
    for (let k = 1; k < span; k++)
      row1.push({ text: "", fillColor: HEADER_BG1 });
  }

  if (includeTotals && totalsColumns?.length) {
    totalsColumns.forEach((c) => {
      row1.push({ text: c.label, style: "thCenter", fillColor: HEADER_BG1 });
    });
  }

  if (includeLeft) {
    row2.push(
      { text: "", fillColor: HEADER_BG2 },
      { text: "", fillColor: HEADER_BG2 },
      { text: "", fillColor: HEADER_BG2 }
    );
  }
  chunkCols.forEach((col) => {
    row2.push({
      text: col.subLabel,
      style: "thSmall",
      alignment: "center",
      fillColor: HEADER_BG2,
    });
  });
  if (includeTotals && totalsColumns?.length) {
    for (let t = 0; t < totalsColumns.length; t++) {
      row2.push({ text: "", fillColor: HEADER_BG2 });
    }
  }

  return [row0, row1, row2];
}

function getSubjectValue(subjScores, key) {
  return getSubjectRaw(subjScores, key);
}
function getTotalsValue(student, key, term) {
  return getTotalsRaw(student, key, term);
}

function getSubjectRaw(subjScores, key) {
  if (!subjScores) return "";
  if (key === "coef") return subjScores.coef ?? "";
  if (key === "finalAvg") {
    const direct =
      subjScores.finalAvg ??
      subjScores.finalCumulativeAverage ??
      subjScores.annualAvg;
    if (isNum(direct)) return Number(direct);
    const avg = averageOf([
      subjScores.term1Avg,
      subjScores.term2Avg,
      subjScores.term3Avg,
    ]);
    return isNum(avg) ? Number(avg) : "";
  }
  return subjScores[key] ?? "";
}

function getTotalsRaw(st, key, term) {
  if (st.termTotals) {
    if (key === "rank") {
      if (term === "term1") return st.termTotals.term1?.rank ?? "";
      if (term === "term2") return st.termTotals.term2?.rank ?? "";
      if (term === "term3") return st.termTotals.term3?.rank ?? "";
      return st.termTotals.annual?.rank ?? "";
    }
    const k = key.toLowerCase();
    if (k.includes("annual")) return st.termTotals.annual?.average ?? "";
    if (k.includes("term1")) return st.termTotals.term1?.average ?? "";
    if (k.includes("term2")) return st.termTotals.term2?.average ?? "";
    if (k.includes("term3")) return st.termTotals.term3?.average ?? "";
  }
  if (st.totals && st.totals[term]) return st.totals[term][key] ?? "";
  return "";
}

function valueColor(key, raw) {
  const k = (key || "").toLowerCase();
  const isMarkOrAvg =
    k.startsWith("seq") ||
    k.includes("avg") ||
    k.includes("average") ||
    k === "finalavg" ||
    k === "termavg";
  if (!isMarkOrAvg) return "#000";
  const n = parseFloat(raw);
  if (isNaN(n)) return "#000";
  return n < 10 ? "#b91c1c" : "#000";
}

function averageOf(values = []) {
  const nums = (values || [])
    .map((v) => (typeof v === "number" ? v : parseFloat(v)))
    .filter((v) => !isNaN(v));
  if (!nums.length) return "";
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.round(avg * 10) / 10;
}
function isNum(n) {
  const v = typeof n === "number" ? n : parseFloat(n);
  return !isNaN(v);
}
function fmt(v) {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : parseFloat(v);
  if (isNaN(n)) return String(v);
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}

function computeClassStats(students = [], term = "annual") {
  const values = students
    .map((st) => {
      const tt = st.termTotals || {};
      if (term === "term1") return parseFloat(tt.term1?.average);
      if (term === "term2") return parseFloat(tt.term2?.average);
      if (term === "term3") return parseFloat(tt.term3?.average);
      return parseFloat(tt.annual?.average);
    })
    .filter((n) => typeof n === "number" && !isNaN(n));

  if (!values.length) {
    return {
      classAverage: "",
      highestAverage: "",
      lowestAverage: "",
      count: 0,
    };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const classAverage = Math.round((sum / values.length) * 10) / 10;
  const highestAverage = Math.max(...values);
  const lowestAverage = Math.min(...values);
  return { classAverage, highestAverage, lowestAverage, count: values.length };
}

function prepare(payload, term) {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const firstRC = payload[0] || {};
  const studentMeta = firstRC.student || {};

  const schoolName = payload.schoolName || studentMeta.schoolName || "School";
  const departmentName =
    studentMeta.option || studentMeta.department || "Department";
  const className = studentMeta.class || "Class";
  const academicYear = studentMeta.academicYear || "—";

  const toDef = (s) => ({ code: s.code, title: s.title, coef: s.coef });
  const generalDefs = (firstRC.generalSubjects || []).map(toDef);
  const professionalDefs = (firstRC.professionalSubjects || []).map(toDef);

  const students = payload.map((rc) => {
    const subjMap = {};
    (rc.generalSubjects || []).forEach((s) => {
      subjMap[s.code] = { ...(s.scores || {}), coef: s.coef, title: s.title };
    });
    (rc.professionalSubjects || []).forEach((s) => {
      subjMap[s.code] = { ...(s.scores || {}), coef: s.coef, title: s.title };
    });
    const tt = rc.termTotals || {};
    return {
      studentId:
        rc.student?.registrationNumber ||
        rc.student?.student_id ||
        rc.student?.id ||
        "",
      name: rc.student?.full_name || rc.student?.name || "",
      subjects: subjMap,
      termTotals: {
        term1: { average: tt.term1?.average ?? "", rank: tt.term1?.rank ?? "" },
        term2: { average: tt.term2?.average ?? "", rank: tt.term2?.rank ?? "" },
        term3: { average: tt.term3?.average ?? "", rank: tt.term3?.rank ?? "" },
        annual: {
          average:
            tt.annual?.average ??
            averageOf([
              tt.term1?.average,
              tt.term2?.average,
              tt.term3?.average,
            ]),
          rank: tt.annual?.rank ?? "",
        },
      },
    };
  });

  const subjectSubcolumns = getSubjectSubcolumns(term);
  const totalsColumns = getTotalsColumns(term);

  return {
    metadata: { schoolName, departmentName, className, academicYear },
    subjects: { general: generalDefs, professional: professionalDefs },
    students,
    subjectSubcolumns,
    totalsColumns,
    classStatistics: firstRC.classStatistics || null,
    administration: firstRC.administration || null,
  };
}

function getSubjectSubcolumns(term) {
  if (term === "term1")
    return [
      { key: "seq1", label: "S1" },
      { key: "seq2", label: "S2" },
      { key: "term1Avg", label: "T1 Avg" },
      { key: "coef", label: "Coef" },
    ];
  if (term === "term2")
    return [
      { key: "seq3", label: "S3" },
      { key: "seq4", label: "S4" },
      { key: "term2Avg", label: "T2 Avg" },
      { key: "coef", label: "Coef" },
    ];
  if (term === "term3")
    return [
      { key: "seq5", label: "S5" },
      { key: "seq6", label: "S6" },
      { key: "term3Avg", label: "T3 Avg" },
      { key: "coef", label: "Coef" },
    ];
  return [
    { key: "seq1", label: "S1" },
    { key: "seq2", label: "S2" },
    { key: "term1Avg", label: "T1 Avg" },
    { key: "seq3", label: "S3" },
    { key: "seq4", label: "S4" },
    { key: "term2Avg", label: "T2 Avg" },
    { key: "seq5", label: "S5" },
    { key: "seq6", label: "S6" },
    { key: "term3Avg", label: "T3 Avg" },
    { key: "finalAvg", label: "Final Avg" },
    { key: "coef", label: "Coef" },
  ];
}

function getTotalsColumns(term) {
  if (term === "term1")
    return [
      { key: "term1Avg", label: "1st Term Avg" },
      { key: "rank", label: "Rank" },
    ];
  if (term === "term2")
    return [
      { key: "term2Avg", label: "2nd Term Avg" },
      { key: "rank", label: "Rank" },
    ];
  if (term === "term3")
    return [
      { key: "term3Avg", label: "3rd Term Avg" },
      { key: "rank", label: "Rank" },
    ];
  return [
    { key: "term1Avg", label: "1st Term Avg" },
    { key: "term2Avg", label: "2nd Term Avg" },
    { key: "term3Avg", label: "3rd Term Avg" },
    { key: "annualAvg", label: "Annual Avg" },
    { key: "rank", label: "Rank" },
  ];
}
