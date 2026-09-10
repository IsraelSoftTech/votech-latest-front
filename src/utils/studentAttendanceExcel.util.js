import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SCHOOL = "VOTECH S7 ACADEMY";
const REPORT_TITLE = "Student Attendance Report";

const ASH = {
  title: "FF000000",
  text: "FF000000",
  muted: "FF000000",
  headerFill: "FFE6E6E6",
  headerText: "FF000000",
  border: "FFC8C8C8",
  alt: "FFF4F4F4",
  white: "FFFFFFFF",
};

const ASH_RGB = {
  title: [0, 0, 0],
  text: [0, 0, 0],
  muted: [0, 0, 0],
  headerFill: [230, 230, 230],
  headerText: [0, 0, 0],
  border: [200, 200, 200],
  alt: [244, 244, 244],
  line: [210, 210, 210],
};

const TABLE_HEADERS = [
  "S/N",
  "Date",
  "Student",
  "Student ID",
  "Class",
  "Check-in",
  "Check-out",
  "Status",
  "Late (min)",
];

const thin = (color = ASH.border) => ({
  top: { style: "thin", color: { argb: color } },
  left: { style: "thin", color: { argb: color } },
  bottom: { style: "thin", color: { argb: color } },
  right: { style: "thin", color: { argb: color } },
});

function formatStatus(status) {
  if (!status || status === "—") return "—";
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatReportDate(value) {
  if (value == null || value === "" || value === "—") return "—";
  const raw = value instanceof Date ? value : String(value).trim();
  if (typeof raw === "string" && !raw.includes("T") && !/^\d{4}-\d{2}-\d{2}$/.test(raw) && Number.isNaN(Date.parse(raw))) {
    return raw;
  }
  let d;
  if (raw instanceof Date) {
    d = raw;
  } else {
    const day = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
    d = day && !String(raw).includes("T") ? new Date(`${day[1]}T12:00:00`) : new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Douala",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function metaLine({ from, to, classLabel, yearName }) {
  return [from && to ? `${from} to ${to}` : "", classLabel, yearName]
    .filter(Boolean)
    .join("  ·  ");
}

function summaryPairs(summary = {}) {
  const pairs = [
    ["Present", summary.total_present ?? 0],
    ["On time", summary.on_time ?? 0],
    ["Late", summary.late ?? 0],
    ["Checked out", summary.checked_out ?? 0],
  ];
  if (summary.absent != null) {
    pairs.push(["Absent slots", summary.absent]);
  }
  return pairs;
}

function tableBody(rows) {
  return rows.map((row, i) => [
    i + 1,
    formatReportDate(row.date_display && !String(row.date_display).includes("T") ? row.date_display : row.date),
    row.full_name || "—",
    row.student_id || "—",
    row.class_name || "—",
    row.check_in || "—",
    row.check_out || "—",
    formatStatus(row.status),
    row.minutes_late || "—",
  ]);
}

function fileStub(from, to) {
  const safeFrom = String(from || "start").replace(/[/:]/g, "-");
  const safeTo = String(to || "end").replace(/[/:]/g, "-");
  return `VOTECH_Student_Attendance_${safeFrom}_to_${safeTo}`;
}

function triggerXlsxDownload(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function metricSpans(count, lastCol) {
  const spans = [];
  let cursor = 1;
  for (let i = 0; i < count; i += 1) {
    const remainingCols = lastCol - cursor + 1;
    const remainingItems = count - i;
    const extra = remainingCols % remainingItems;
    const width = Math.floor(remainingCols / remainingItems) + (extra ? 1 : 0);
    spans.push([cursor, cursor + width - 1]);
    cursor += width;
  }
  return spans;
}

function styleRange(sheet, r1, c1, r2, c2, styles) {
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const cell = sheet.getCell(r, c);
      if (styles.font) cell.font = styles.font;
      if (styles.fill) cell.fill = styles.fill;
      if (styles.alignment) cell.alignment = styles.alignment;
      if (styles.border) cell.border = styles.border;
    }
  }
}

function mergeBlock(sheet, r1, c1, r2, c2, value, styles) {
  styleRange(sheet, r1, c1, r2, c2, styles);
  if (c1 !== c2 || r1 !== r2) sheet.mergeCells(r1, c1, r2, c2);
  sheet.getCell(r1, c1).value = value;
}

export async function downloadStudentAttendanceExcel({
  rows = [],
  summary = {},
  from,
  to,
  classLabel = "All classes",
  yearName = "",
}) {
  const mod = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = mod.default || mod;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL;
  workbook.created = new Date();

  const lastCol = 9;
  const headerRow = 9;
  const center = { vertical: "middle", horizontal: "center", wrapText: false };

  const sheet = workbook.addWorksheet("Attendance Report", {
    views: [{ state: "frozen", ySplit: headerRow, showGridLines: false, zoomScale: 110 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: false,
      printTitlesRow: `${headerRow}:${headerRow}`,
      margins: {
        left: 0.45,
        right: 0.45,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.25,
      },
    },
  });

  [8, 16, 32, 20, 26, 14, 14, 14, 12].forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  mergeBlock(sheet, 1, 1, 1, lastCol, SCHOOL, {
    font: { name: "Calibri", size: 16, bold: true, color: { argb: ASH.title } },
    alignment: center,
  });
  sheet.getRow(1).height = 24;

  mergeBlock(sheet, 2, 1, 2, lastCol, REPORT_TITLE, {
    font: { name: "Calibri", size: 13, bold: true, color: { argb: ASH.text } },
    alignment: center,
  });
  sheet.getRow(2).height = 20;

  mergeBlock(sheet, 3, 1, 3, lastCol, metaLine({ from, to, classLabel, yearName }), {
    font: { name: "Calibri", size: 10, color: { argb: ASH.muted } },
    alignment: center,
  });
  sheet.getRow(3).height = 18;

  mergeBlock(sheet, 4, 1, 4, lastCol, `Generated ${new Date().toLocaleString()}`, {
    font: { name: "Calibri", size: 9, italic: true, color: { argb: ASH.muted } },
    alignment: center,
    border: { bottom: { style: "medium", color: { argb: ASH.border } } },
  });
  sheet.getRow(4).height = 16;
  sheet.getRow(5).height = 10;

  const pairs = summaryPairs(summary);
  const spans = metricSpans(pairs.length, lastCol);
  pairs.forEach((pair, i) => {
    const [c1, c2] = spans[i];
    mergeBlock(sheet, 6, c1, 6, c2, String(pair[0]).toUpperCase(), {
      font: { name: "Calibri", size: 9, bold: true, color: { argb: ASH.headerText } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: ASH.headerFill } },
      alignment: center,
      border: thin(),
    });
    mergeBlock(sheet, 7, c1, 7, c2, pair[1], {
      font: { name: "Calibri", size: 14, bold: true, color: { argb: ASH.title } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: ASH.white } },
      alignment: center,
      border: thin(),
    });
  });
  sheet.getRow(6).height = 18;
  sheet.getRow(7).height = 24;
  sheet.getRow(8).height = 10;

  TABLE_HEADERS.forEach((label, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = label;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: ASH.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ASH.headerFill } };
    cell.alignment = center;
    cell.border = thin();
  });
  sheet.getRow(headerRow).height = 22;

  const leftCols = new Set([3]);
  tableBody(rows).forEach((values, i) => {
    const r = headerRow + 1 + i;
    sheet.getRow(r).height = 22;
    values.forEach((value, col) => {
      const cell = sheet.getCell(r, col + 1);
      cell.value = value;
      cell.font = { name: "Calibri", size: 10, color: { argb: ASH.text } };
      cell.alignment = {
        vertical: "middle",
        horizontal: leftCols.has(col + 1) ? "left" : "center",
        wrapText: false,
      };
      cell.border = thin();
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ASH.alt } };
      }
    });
  });

  const lastDataRow = headerRow + Math.max(rows.length, 1);
  sheet.pageSetup.printArea = `A1:I${lastDataRow}`;
  sheet.headerFooter.oddFooter = `&L${SCHOOL}&C${REPORT_TITLE}&RPage &P of &N`;

  const buffer = await workbook.xlsx.writeBuffer();
  triggerXlsxDownload(buffer, `${fileStub(from, to)}.xlsx`);
}

export function downloadStudentAttendancePdf({
  rows = [],
  summary = {},
  from,
  to,
  classLabel = "All classes",
  yearName = "",
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  const mid = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...ASH_RGB.title);
  doc.text(SCHOOL, mid, 14, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...ASH_RGB.text);
  doc.text(REPORT_TITLE, mid, 21, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ASH_RGB.muted);
  doc.text(metaLine({ from, to, classLabel, yearName }), mid, 27, { align: "center" });
  doc.text(`Generated ${new Date().toLocaleString()}`, mid, 32, { align: "center" });

  doc.setDrawColor(...ASH_RGB.line);
  doc.setLineWidth(0.3);
  doc.line(margin, 35, pageWidth - margin, 35);

  const pairs = summaryPairs(summary);
  const boxGap = 3.5;
  const boxH = 16;
  const boxW = Math.min(46, (pageWidth - margin * 2 - boxGap * (pairs.length - 1)) / pairs.length);
  const boxY = 38;
  const boxesWidth = pairs.length * boxW + Math.max(0, pairs.length - 1) * boxGap;
  const boxesStart = (pageWidth - boxesWidth) / 2;
  pairs.forEach((pair, i) => {
    const x = boxesStart + i * (boxW + boxGap);
    doc.setFillColor(...ASH_RGB.headerFill);
    doc.setDrawColor(...ASH_RGB.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, boxY, boxW, boxH, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...ASH_RGB.headerText);
    doc.text(String(pair[0]).toUpperCase(), x + boxW / 2, boxY + 5.5, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(...ASH_RGB.title);
    doc.text(String(pair[1]), x + boxW / 2, boxY + 12.5, { align: "center" });
  });

  autoTable(doc, {
    startY: boxY + boxH + 6,
    head: [TABLE_HEADERS],
    body: tableBody(rows),
    theme: "grid",
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin, right: margin, bottom: 14 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: ASH_RGB.text,
      lineColor: ASH_RGB.border,
      lineWidth: 0.2,
      cellPadding: 2.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: ASH_RGB.headerFill,
      textColor: ASH_RGB.headerText,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: ASH_RGB.alt },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { cellWidth: 28 },
      3: { cellWidth: 26 },
      4: { cellWidth: 32 },
      5: { halign: "center", cellWidth: 24 },
      6: { halign: "center", cellWidth: 24 },
      7: { halign: "center", cellWidth: 24 },
      8: { halign: "center", cellWidth: 20 },
    },
    didDrawPage: (data) => {
      const y = doc.internal.pageSize.getHeight() - 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...ASH_RGB.muted);
      doc.text(SCHOOL, margin, y);
      doc.text(REPORT_TITLE, pageWidth / 2, y, { align: "center" });
      doc.text(`Page ${data.pageNumber}`, pageWidth - margin, y, { align: "right" });
    },
  });

  doc.save(`${fileStub(from, to)}.pdf`);
}
