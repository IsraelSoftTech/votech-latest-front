import React, { useState, useEffect, useRef } from 'react';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SideTop from './SideTop';
import api from '../services/api';
import logo from '../assets/logo.png';
import './ReportFinances.css';

const SCHOOL_NAME = 'VOTECH S7 ACADEMY';
const PDF_MARGIN = 14;
const PDF_BRAND = [32, 64, 128];
const PDF_ROW_HEAD_BG = [232, 238, 246];
const PDF_TOTAL_BG = [240, 244, 248];
const PDF_BORDER = [210, 210, 210];

function formatPdfNum(n) {
  return n === '' || n == null
    ? ''
    : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
}

function cellStyle(fillColor, extra = {}) {
  return { fillColor, ...extra };
}

function brandRowStyle(extra = {}) {
  return { fillColor: PDF_BRAND, textColor: [255, 255, 255], fontStyle: 'bold', ...extra };
}

const BASE_TABLE_STYLES = {
  theme: 'grid',
  styles: {
    font: 'helvetica',
    fontSize: 9,
    cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
    overflow: 'linebreak',
    valign: 'middle',
    lineColor: PDF_BORDER,
    lineWidth: 0.15,
    textColor: [33, 33, 33],
    minCellHeight: 9,
  },
  headStyles: {
    fillColor: PDF_BRAND,
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 9,
    halign: 'center',
    valign: 'middle',
    cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    lineColor: PDF_BRAND,
    lineWidth: 0.15,
  },
  showHead: 'everyPage',
  rowPageBreak: 'avoid',
  margin: { left: PDF_MARGIN, right: PDF_MARGIN, top: PDF_MARGIN, bottom: 16 },
};

const DETAIL_TABLE_COLUMN_STYLES = {
  0: { cellWidth: 24, halign: 'center', overflow: 'hidden' },
  1: { cellWidth: 24, halign: 'center' },
  2: { cellWidth: 104, halign: 'left' },
  3: { cellWidth: 38, halign: 'right' },
  4: { cellWidth: 38, halign: 'center' },
  5: { cellWidth: 39, halign: 'right' },
};

const STATEMENT_COLUMN_STYLES = {
  0: { cellWidth: 183, halign: 'left' },
  1: { cellWidth: 82, halign: 'right' },
};

function detailRowsToBody(rows) {
  return rows.map((row) => {
    if (row.isHeader) {
      const bg = cellStyle(PDF_ROW_HEAD_BG);
      return [
        { content: '', styles: bg },
        { content: '', styles: bg },
        { content: row.heading || '', colSpan: 4, styles: { ...bg, fontStyle: 'bold', halign: 'left' } },
      ];
    }
    if (row.isTotal) {
      const bg = cellStyle(PDF_TOTAL_BG, { fontStyle: 'bold' });
      return [
        { content: '', styles: bg },
        { content: '', styles: bg },
        { content: 'TOTAL', styles: { ...bg, halign: 'left' } },
        { content: '', styles: bg },
        { content: '', styles: bg },
        { content: formatPdfNum(row.subTotal), styles: { ...bg, halign: 'right' } },
      ];
    }
    if (row.isGrandTotal) {
      const bg = brandRowStyle();
      return [
        { content: '', styles: bg },
        { content: '', styles: bg },
        { content: row.heading || '', colSpan: 3, styles: { ...bg, halign: 'left' } },
        { content: formatPdfNum(row.subTotal), styles: { ...bg, halign: 'right' } },
      ];
    }
    return [
      String(row.sn ?? ''),
      row.date || '',
      row.heading || '',
      formatPdfNum(row.amount),
      String(row.supportDoc || ''),
      formatPdfNum(row.subTotal),
    ];
  });
}

async function initLandscapeReportPdf(reportTitle) {
  const logoData = await getLogoBase64();
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const y = margin;

  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y - 2, 15, 15);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...PDF_BRAND);
  doc.text(SCHOOL_NAME, margin + 20, y + 5);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(reportTitle, pageWidth / 2, y + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, y + 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  return { doc, pageWidth, pageHeight, margin, startY: y + 22 };
}

function drawPdfPageFooters(doc, pageWidth, pageHeight) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
}

function renderDetailReportTable(doc, rows, reportTitle, startY, pageWidth) {
  autoTable(doc, {
    ...BASE_TABLE_STYLES,
    head: [['S/N', 'DATE', 'HEADING', 'AMOUNT (XAF)', 'SUPPORT DOC', 'SUB TOTAL']],
    body: detailRowsToBody(rows),
    startY,
    columnStyles: DETAIL_TABLE_COLUMN_STYLES,
    tableWidth: pageWidth - PDF_MARGIN * 2,
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_BRAND);
        doc.text(reportTitle, pageWidth / 2, 10, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
    },
  });
}

function buildStatementSectionBody(categories, amounts, totalLabel, totalValue) {
  const rows = categories.map((cat) => [cat, formatPdfNum(amounts[cat])]);
  const bg = cellStyle(PDF_TOTAL_BG, { fontStyle: 'bold' });
  rows.push([
    { content: totalLabel, styles: { ...bg, halign: 'left' } },
    { content: formatPdfNum(totalValue), styles: { ...bg, halign: 'right' } },
  ]);
  return rows;
}

function renderFinancialStatementPdf(doc, data, startY, pageWidth, margin) {
  const {
    incomeCategories,
    expenditureCategories,
    incomeAmounts,
    expenditureAmounts,
    totalIncome,
    totalExpenditure,
    netProfitLoss,
  } = data;

  const sectionGap = 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  const addSection = (sectionTitle, headLabels, body) => {
    let y = doc.lastAutoTable?.finalY != null ? doc.lastAutoTable.finalY + sectionGap : startY;
    if (y > pageHeight - 36) {
      doc.addPage();
      y = margin + 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
    doc.text(sectionTitle, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    autoTable(doc, {
      ...BASE_TABLE_STYLES,
      head: [headLabels],
      body,
      startY: y,
      columnStyles: STATEMENT_COLUMN_STYLES,
      tableWidth: pageWidth - margin * 2,
      headStyles: {
        ...BASE_TABLE_STYLES.headStyles,
        0: { halign: 'left' },
        1: { halign: 'right' },
      },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1 && (hookData.cursor?.y ?? 0) <= margin + 14) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
          doc.text('FINANCIAL STATEMENT', pageWidth / 2, 10, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      },
    });
  };

  addSection(
    'Income',
    ['Income Category', 'Amount (XAF)'],
    buildStatementSectionBody(incomeCategories, incomeAmounts, 'TOTAL INCOME', totalIncome)
  );

  addSection(
    'Expenditure',
    ['Expenditure Category', 'Amount (XAF)'],
    buildStatementSectionBody(
      expenditureCategories,
      expenditureAmounts,
      'TOTAL EXPENDITURE',
      totalExpenditure
    )
  );

  addSection('Financial Summary', ['Financial Summary', 'Amount (XAF)'], [
    ['Total Income', formatPdfNum(totalIncome)],
    ['Total Expenditure', formatPdfNum(totalExpenditure)],
    [
      { content: 'NET PROFIT/LOSS', styles: brandRowStyle({ halign: 'left' }) },
      { content: formatPdfNum(netProfitLoss), styles: brandRowStyle({ halign: 'right' }) },
    ],
  ]);
}

function getLogoBase64() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    const logoUrl = typeof logo === 'string'
      ? (logo.startsWith('http') ? logo : `${window.location.origin}${logo.startsWith('/') ? logo : '/' + logo}`)
      : logo;
    img.src = logoUrl;
  });
}

function buildIncomeRows(items) {
  const rows = [];
  let itemSn = 1;
  let grandTotal = 0;

  // Inventory income items grouped by head (Fee, Salary, etc. are created as heads and entered manually)
  const filtered = items.filter((i) => i.category === 'income');
  const byHead = {};
  filtered.forEach((item) => {
    const headId = item.head_id ?? 'uncat';
    const headName = item.head_name || 'Uncategorized';
    if (!byHead[headId]) byHead[headId] = { name: headName, items: [] };
    byHead[headId].items.push(item);
  });
  const headEntries = Object.values(byHead).sort((a, b) => a.name.localeCompare(b.name));

  headEntries.forEach(({ name, items: headItems }) => {
    let headTotal = 0;
    rows.push({
      sn: '',
      date: '',
      heading: name,
      amount: '',
      supportDoc: '',
      subTotal: '',
      isHeader: true,
    });
    headItems.forEach((item) => {
      const amt = item.amount != null ? Number(item.amount) : (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
      headTotal += amt;
      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      rows.push({
        sn: itemSn++,
        date: dateStr,
        heading: item.item_name,
        amount: amt,
        supportDoc: item.support_doc || item.item_id || String(item.id),
        subTotal: amt,
        isHeader: false,
        isItem: true,
      });
    });
    rows.push({
      sn: '',
      date: '',
      heading: 'TOTAL',
      amount: '',
      supportDoc: '',
      subTotal: headTotal,
      isHeader: false,
      isTotal: true,
    });
    grandTotal += headTotal;
  });

  rows.push({
    sn: '',
    date: '',
    heading: 'GRAND TOTAL INCOME',
    amount: '',
    supportDoc: '',
    subTotal: grandTotal,
    isHeader: false,
    isGrandTotal: true,
  });

  return rows;
}

function buildExpenditureRows(items) {
  const rows = [];
  let itemSn = 1;
  let grandTotal = 0;

  // Inventory expenditure items grouped by head (Fee, Salary, etc. are created as heads and entered manually)
  const filtered = items.filter((i) => i.category === 'expenditure');
  const byHead = {};
  filtered.forEach((item) => {
    const headId = item.head_id ?? 'uncat';
    const headName = item.head_name || 'Uncategorized';
    if (!byHead[headId]) byHead[headId] = { name: headName, items: [] };
    byHead[headId].items.push(item);
  });
  const headEntries = Object.values(byHead).sort((a, b) => a.name.localeCompare(b.name));

  headEntries.forEach(({ name, items: headItems }) => {
    let headTotal = 0;
    rows.push({
      sn: '',
      date: '',
      heading: name,
      amount: '',
      supportDoc: '',
      subTotal: '',
      isHeader: true,
    });
    headItems.forEach((item) => {
      const amt = item.amount != null ? Number(item.amount) : (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
      headTotal += amt;
      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      rows.push({
        sn: itemSn++,
        date: dateStr,
        heading: item.item_name,
        amount: amt,
        supportDoc: item.support_doc || item.item_id || String(item.id),
        subTotal: amt,
        isHeader: false,
        isItem: true,
      });
    });
    rows.push({
      sn: '',
      date: '',
      heading: 'TOTAL',
      amount: '',
      supportDoc: '',
      subTotal: headTotal,
      isHeader: false,
      isTotal: true,
    });
    grandTotal += headTotal;
  });

  rows.push({
    sn: '',
    date: '',
    heading: 'GRAND TOTAL EXPENDITURE',
    amount: '',
    supportDoc: '',
    subTotal: grandTotal,
    isHeader: false,
    isGrandTotal: true,
  });

  return rows;
}

function buildFinancialStatementData(items) {
  const incomeItems = items.filter((i) => i.category === 'income');
  const expenditureItems = items.filter((i) => i.category === 'expenditure');

  // Income: heads from inventory (Fee, Salary, etc. created as heads and entered manually)
  const incomeCategories = [];
  const incomeAmounts = {};
  const incomeByHead = {};
  incomeItems.forEach((item) => {
    const headName = item.head_name || 'Uncategorized';
    if (!incomeByHead[headName]) incomeByHead[headName] = 0;
    incomeByHead[headName] += item.amount != null ? Number(item.amount) : (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
  });
  Object.keys(incomeByHead)
    .sort()
    .forEach((name) => {
      incomeCategories.push(name);
      incomeAmounts[name] = incomeByHead[name];
    });

  // Expenditure: heads from inventory (Fee, Salary, etc. created as heads and entered manually)
  const expenditureCategories = [];
  const expenditureAmounts = {};
  const expenditureByHead = {};
  expenditureItems.forEach((item) => {
    const headName = item.head_name || 'Uncategorized';
    if (!expenditureByHead[headName]) expenditureByHead[headName] = 0;
    expenditureByHead[headName] += item.amount != null ? Number(item.amount) : (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
  });
  Object.keys(expenditureByHead)
    .sort()
    .forEach((name) => {
      expenditureCategories.push(name);
      expenditureAmounts[name] = expenditureByHead[name];
    });

  const totalIncome = Object.values(incomeAmounts).reduce((a, b) => a + b, 0);
  const totalExpenditure = Object.values(expenditureAmounts).reduce((a, b) => a + b, 0);
  const netProfitLoss = totalIncome - totalExpenditure;

  return {
    incomeCategories,
    expenditureCategories,
    incomeAmounts,
    expenditureAmounts,
    totalIncome,
    totalExpenditure,
    netProfitLoss,
  };
}

function ReportTable({ title, rows }) {
  const formatNum = (n) =>
    n === '' || n == null
      ? ''
      : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

  return (
    <div className="rf-report-section">
      <h2 className="rf-report-title">{title}</h2>
      <div className="rf-table-wrap">
        <table className="rf-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>DATE</th>
              <th>HEADING</th>
              <th>AMOUNT</th>
              <th>SUPPORT DOC Number</th>
              <th>SUB TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="rf-empty-row">
                <td colSpan={6} className="rf-empty">No records</td>
              </tr>
            ) : rows.map((row, idx) => (
              <tr
                key={idx}
                className={
                  row.isHeader ? 'rf-row-header' : row.isTotal ? 'rf-row-total' : row.isGrandTotal ? 'rf-row-grand' : ''
                }
              >
                <td data-label="SN">{row.sn}</td>
                <td data-label="Date">{row.date}</td>
                <td className="rf-heading-cell" data-label="Heading">{row.heading}</td>
                <td className="rf-amount-cell" data-label="Amount">{formatNum(row.amount)}</td>
                <td data-label="Support Doc">{row.supportDoc}</td>
                <td className="rf-amount-cell" data-label="Sub Total">{formatNum(row.subTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialStatement({ data, onPrint }) {
  const ref = useRef(null);
  const formatNum = (n) =>
    n === '' || n == null
      ? ''
      : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

  const {
    incomeCategories,
    expenditureCategories,
    incomeAmounts,
    expenditureAmounts,
    totalIncome,
    totalExpenditure,
    netProfitLoss,
  } = data;

  return (
    <div ref={ref} className="rf-statement-root">
      <div className="rf-statement-header">
        <img src={logo} alt="School Logo" className="rf-statement-logo" />
        <h1 className="rf-statement-school-name">{SCHOOL_NAME}</h1>
      </div>
      <h2 className="rf-statement-title">FINANCIAL STATEMENT</h2>

      <div className="rf-statement-section">
        <table className="rf-statement-table">
          <thead>
            <tr>
              <th>Income Category</th>
              <th>Amount (XAF)</th>
            </tr>
          </thead>
          <tbody>
            {incomeCategories.map((cat) => (
              <tr key={cat}>
                <td>{cat}</td>
                <td className="rf-statement-amount">{formatNum(incomeAmounts[cat])}</td>
              </tr>
            ))}
            <tr className="rf-statement-total-row">
              <td><strong>TOTAL INCOME</strong></td>
              <td className="rf-statement-amount"><strong>{formatNum(totalIncome)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rf-statement-section">
        <table className="rf-statement-table">
          <thead>
            <tr>
              <th>Expenditure Category</th>
              <th>Amount (XAF)</th>
            </tr>
          </thead>
          <tbody>
            {expenditureCategories.map((cat) => (
              <tr key={cat}>
                <td>{cat}</td>
                <td className="rf-statement-amount">{formatNum(expenditureAmounts[cat])}</td>
              </tr>
            ))}
            <tr className="rf-statement-total-row">
              <td><strong>TOTAL EXPENDITURE</strong></td>
              <td className="rf-statement-amount"><strong>{formatNum(totalExpenditure)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rf-statement-section">
        <table className="rf-statement-table">
          <thead>
            <tr>
              <th>Financial Summary</th>
              <th>Amount (XAF)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Income</td>
              <td className="rf-statement-amount">{formatNum(totalIncome)}</td>
            </tr>
            <tr>
              <td>Total Expenditure</td>
              <td className="rf-statement-amount">{formatNum(totalExpenditure)}</td>
            </tr>
            <tr className="rf-statement-net-row">
              <td><strong>NET PROFIT/LOSS</strong></td>
              <td className="rf-statement-amount"><strong>{formatNum(netProfitLoss)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportFinances() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('income');
  const statementRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const inventoryData = await api.getReportInventory();
        setItems(Array.isArray(inventoryData) ? inventoryData : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const incomeRows = buildIncomeRows(items);
  const expenditureRows = buildExpenditureRows(items);
  const statementData = buildFinancialStatementData(items);

  const saveFinanceReportPdf = async (reportTitle, renderContent, filename) => {
    try {
      const { doc, pageWidth, pageHeight, margin, startY } = await initLandscapeReportPdf(reportTitle);
      renderContent(doc, { pageWidth, pageHeight, margin, startY });
      drawPdfPageFooters(doc, pageWidth, pageHeight);
      doc.save(filename);
    } catch (error) {
      console.error(`Error generating ${reportTitle} PDF:`, error);
      alert(`Error generating PDF: ${error.message}. Please try again.`);
    }
  };

  const handleDownloadIncomePDF = () =>
    saveFinanceReportPdf(
      'INCOME REPORT',
      (doc, { pageWidth, startY }) => renderDetailReportTable(doc, incomeRows, 'INCOME REPORT', startY, pageWidth),
      `Income-Report-${new Date().toISOString().slice(0, 10)}.pdf`
    );

  const handleDownloadExpenditurePDF = () =>
    saveFinanceReportPdf(
      'EXPENDITURE REPORT',
      (doc, { pageWidth, startY }) =>
        renderDetailReportTable(doc, expenditureRows, 'EXPENDITURE REPORT', startY, pageWidth),
      `Expenditure-Report-${new Date().toISOString().slice(0, 10)}.pdf`
    );

  const handleDownloadPDF = () =>
    saveFinanceReportPdf(
      'FINANCIAL STATEMENT',
      (doc, { pageWidth, margin, startY }) =>
        renderFinancialStatementPdf(doc, statementData, startY, pageWidth, margin),
      `Financial-Statement-${new Date().toISOString().slice(0, 10)}.pdf`
    );

  const handlePrintStatement = () => {
    const logoImg = statementRef.current?.querySelector('.rf-statement-logo');
    const logoSrc = logoImg?.src || '';

    const formatNum = (n) =>
      n === '' || n == null ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const {
      incomeCategories,
      expenditureCategories,
      incomeAmounts,
      expenditureAmounts,
      totalIncome,
      totalExpenditure,
      netProfitLoss,
    } = statementData;

    const incomeRowsHtml = incomeCategories
      .map((cat) => `<tr><td>${esc(cat)}</td><td class="fs-amt">${esc(formatNum(incomeAmounts[cat]))}</td></tr>`)
      .join('');
    const expenditureRowsHtml = expenditureCategories
      .map((cat) => `<tr><td>${esc(cat)}</td><td class="fs-amt">${esc(formatNum(expenditureAmounts[cat]))}</td></tr>`)
      .join('');

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Financial Statement - ${esc(SCHOOL_NAME)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background: #fff; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 landscape; margin: 12mm; }
    .fs-page { max-width: 297mm; margin: 0 auto; }
    .fs-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #204080; }
    .fs-logo { width: 64px; height: 64px; object-fit: contain; }
    .fs-school-name { font-size: 22pt; font-weight: 700; color: #204080; }
    .fs-title { font-size: 18pt; font-weight: 700; text-align: center; margin-bottom: 24px; color: #204080; }
    .fs-section { margin-bottom: 28px; }
    .fs-table { width: 100%; border-collapse: collapse; border: 1px solid #d2d2d2; margin-bottom: 0; }
    .fs-table th, .fs-table td { border: 1px solid #d2d2d2; padding: 10px 14px; text-align: left; }
    .fs-table th { background: #204080; color: #fff; font-weight: 600; font-size: 11pt; }
    .fs-table td { font-size: 10pt; }
    .fs-amt { text-align: right; font-variant-numeric: tabular-nums; }
    .fs-total-row td { font-weight: 700; background: #e8eef6; border-top: 2px solid #333; padding: 12px 14px; }
    .fs-net-row td { font-weight: 700; background: #204080; color: #fff; border-top: 3px solid #333; padding: 14px; font-size: 11pt; }
    .fs-summary .fs-net-row td { background: #204080; color: #fff; }
  </style>
</head>
<body>
  <div class="fs-page">
    <div class="fs-header">
      <img src="" alt="Logo" class="fs-logo" />
      <div class="fs-school-name">${esc(SCHOOL_NAME)}</div>
    </div>
    <h1 class="fs-title">FINANCIAL STATEMENT</h1>

    <div class="fs-section">
      <table class="fs-table">
        <thead><tr><th>Income Category</th><th>Amount (XAF)</th></tr></thead>
        <tbody>${incomeRowsHtml}
          <tr class="fs-total-row"><td><strong>TOTAL INCOME</strong></td><td class="fs-amt"><strong>${esc(formatNum(totalIncome))}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <div class="fs-section">
      <table class="fs-table">
        <thead><tr><th>Expenditure Category</th><th>Amount (XAF)</th></tr></thead>
        <tbody>${expenditureRowsHtml}
          <tr class="fs-total-row"><td><strong>TOTAL EXPENDITURE</strong></td><td class="fs-amt"><strong>${esc(formatNum(totalExpenditure))}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <div class="fs-section fs-summary">
      <table class="fs-table">
        <thead><tr><th>Financial Summary</th><th>Amount (XAF)</th></tr></thead>
        <tbody>
          <tr><td>Total Income</td><td class="fs-amt">${esc(formatNum(totalIncome))}</td></tr>
          <tr><td>Total Expenditure</td><td class="fs-amt">${esc(formatNum(totalExpenditure))}</td></tr>
          <tr class="fs-net-row"><td><strong>NET PROFIT/LOSS</strong></td><td class="fs-amt"><strong>${esc(formatNum(netProfitLoss))}</strong></td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <script>
    (function() {
      var src = ${JSON.stringify(logoSrc || '')};
      var imgs = document.querySelectorAll('.fs-logo');
      if (imgs && imgs.forEach) imgs.forEach(function(img) { if (src) img.src = src; });
      var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      var delay = isMobile ? 800 : 350;
      setTimeout(function() {
        requestAnimationFrame(function() {
          window.print();
          window.onafterprint = function() { window.close(); };
          setTimeout(function() { window.close(); }, 2000);
        });
      }, delay);
    })();
  <\/script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow pop-ups to print the Financial Statement.');
      return;
    }
    printWin.document.write(printHtml);
    printWin.document.close();
  };

  return (
    <SideTop>
      <div className="rf-root">
        <div className="rf-print-header">
          <img src={logo} alt="VOTECH Logo" className="rf-print-logo" />
          <span className="rf-print-school">VOTECH S7 ACADEMY</span>
        </div>
        <div className="rf-page-header">
          <h1 className="rf-page-title">Finances Report</h1>
          {activeTab === 'statement' && (
            <div className="rf-statement-actions">
              <button type="button" className="rf-download-pdf-btn rf-print-btn-top" onClick={handleDownloadPDF}>
                <FaDownload /> Download PDF
              </button>
              <button type="button" className="rf-print-btn rf-print-btn-top" onClick={handlePrintStatement}>
                Print
              </button>
            </div>
          )}
        </div>
        <div className="rf-tabs">
          <button
            type="button"
            className={`rf-tab ${activeTab === 'income' ? 'rf-tab-active' : ''}`}
            onClick={() => setActiveTab('income')}
          >
            Income
          </button>
          <button
            type="button"
            className={`rf-tab ${activeTab === 'expenditure' ? 'rf-tab-active' : ''}`}
            onClick={() => setActiveTab('expenditure')}
          >
            Expenditure
          </button>
          <button
            type="button"
            className={`rf-tab ${activeTab === 'statement' ? 'rf-tab-active' : ''}`}
            onClick={() => setActiveTab('statement')}
          >
            Financial Statement
          </button>
        </div>
        {loading ? (
          <div className="rf-loading">Loading...</div>
        ) : activeTab === 'statement' ? (
          <div ref={statementRef}>
            <FinancialStatement data={statementData} onPrint={handlePrintStatement} />
          </div>
        ) : (
          <>
            {activeTab === 'income' && (
              <>
                <div className="rf-report-actions">
                  <button type="button" className="rf-download-pdf-btn" onClick={handleDownloadIncomePDF}>
                    <FaDownload /> Generate Income Report (PDF)
                  </button>
                </div>
                <ReportTable title="Income" rows={incomeRows} />
              </>
            )}
            {activeTab === 'expenditure' && (
              <>
                <div className="rf-report-actions">
                  <button type="button" className="rf-download-pdf-btn" onClick={handleDownloadExpenditurePDF}>
                    <FaDownload /> Generate Expenditure Report (PDF)
                  </button>
                </div>
                <ReportTable title="Expenditure" rows={expenditureRows} />
              </>
            )}
          </>
        )}
      </div>
    </SideTop>
  );
}
