import React, { useState, useEffect, useRef } from 'react';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import SideTop from './SideTop';
import api from '../services/api';
import logo from '../assets/logo.png';
import './ReportFinances.css';

const SCHOOL_NAME = 'VOTECH S7 ACADEMY';

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
              <th>SN</th>
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

  const handleDownloadIncomePDF = () => {
    const formatNum = (n) =>
      n === '' || n == null ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;
    doc.setFontSize(18);
    doc.setTextColor(32, 64, 128);
    doc.text(SCHOOL_NAME, 20, y);
    y += 12;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('INCOME REPORT', 105, y, { align: 'center' });
    y += 18;
    doc.setFontSize(10);
    doc.text('SN', 20, y);
    doc.text('Date', 35, y);
    doc.text('Heading', 55, y);
    doc.text('Amount (XAF)', 170, y);
    y += 8;
    doc.line(20, y, 190, y);
    y += 8;
    incomeRows.forEach((row) => {
      if (row.isHeader) {
        doc.setFont('helvetica', 'bold');
        doc.text(row.heading || '', 25, y);
        doc.setFont('helvetica', 'normal');
      } else if (row.isTotal) {
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', 55, y);
        doc.text(formatNum(row.subTotal), 170, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      } else if (row.isGrandTotal) {
        doc.setFont('helvetica', 'bold');
        doc.text('GRAND TOTAL INCOME', 55, y);
        doc.text(formatNum(row.subTotal), 170, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      } else if (row.isItem) {
        doc.text(String(row.sn || ''), 20, y);
        doc.text(row.date || '', 35, y);
        doc.text(row.heading || '', 55, y);
        doc.text(formatNum(row.amount), 170, y, { align: 'right' });
      }
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`Income-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownloadExpenditurePDF = () => {
    const formatNum = (n) =>
      n === '' || n == null ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;
    doc.setFontSize(18);
    doc.setTextColor(32, 64, 128);
    doc.text(SCHOOL_NAME, 20, y);
    y += 12;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('EXPENDITURE REPORT', 105, y, { align: 'center' });
    y += 18;
    doc.setFontSize(10);
    doc.text('SN', 20, y);
    doc.text('Date', 35, y);
    doc.text('Heading', 55, y);
    doc.text('Amount (XAF)', 170, y);
    y += 8;
    doc.line(20, y, 190, y);
    y += 8;
    expenditureRows.forEach((row) => {
      if (row.isHeader) {
        doc.setFont('helvetica', 'bold');
        doc.text(row.heading || '', 25, y);
        doc.setFont('helvetica', 'normal');
      } else if (row.isTotal) {
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', 55, y);
        doc.text(formatNum(row.subTotal), 170, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      } else if (row.isGrandTotal) {
        doc.setFont('helvetica', 'bold');
        doc.text('GRAND TOTAL EXPENDITURE', 55, y);
        doc.text(formatNum(row.subTotal), 170, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      } else if (row.isItem) {
        doc.text(String(row.sn || ''), 20, y);
        doc.text(row.date || '', 35, y);
        doc.text(row.heading || '', 55, y);
        doc.text(formatNum(row.amount), 170, y, { align: 'right' });
      }
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`Expenditure-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownloadPDF = () => {
    const formatNum = (n) =>
      n === '' || n == null ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
    const {
      incomeCategories,
      expenditureCategories,
      incomeAmounts,
      expenditureAmounts,
      totalIncome,
      totalExpenditure,
      netProfitLoss,
    } = statementData;

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(32, 64, 128);
    doc.text(SCHOOL_NAME, 20, y);
    y += 12;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('FINANCIAL STATEMENT', 105, y, { align: 'center' });
    y += 18;

    doc.setFontSize(10);
    doc.text('Income Category', 20, y);
    doc.text('Amount (XAF)', 170, y);
    y += 8;
    doc.setDrawColor(0, 0, 0);
    doc.line(20, y, 190, y);
    y += 8;

    incomeCategories.forEach((cat) => {
      doc.text(cat, 25, y);
      doc.text(formatNum(incomeAmounts[cat]), 170, y, { align: 'right' });
      y += 7;
    });
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL INCOME', 25, y);
    doc.text(formatNum(totalIncome), 170, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 12;

    doc.text('Expenditure Category', 20, y);
    doc.text('Amount (XAF)', 170, y);
    y += 8;
    doc.line(20, y, 190, y);
    y += 8;

    expenditureCategories.forEach((cat) => {
      doc.text(cat, 25, y);
      doc.text(formatNum(expenditureAmounts[cat]), 170, y, { align: 'right' });
      y += 7;
    });
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL EXPENDITURE', 25, y);
    doc.text(formatNum(totalExpenditure), 170, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 12;

    doc.setFillColor(32, 64, 128);
    doc.rect(20, y - 4, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PROFIT/LOSS', 25, y + 3);
    doc.text(formatNum(netProfitLoss), 170, y + 3, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    const filename = `Financial-Statement-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

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
    @page { size: A4 portrait; margin: 15mm; }
    .fs-page { max-width: 210mm; margin: 0 auto; }
    .fs-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #204080; }
    .fs-logo { width: 64px; height: 64px; object-fit: contain; }
    .fs-school-name { font-size: 22pt; font-weight: 700; color: #204080; }
    .fs-title { font-size: 18pt; font-weight: 700; text-align: center; margin-bottom: 24px; color: #204080; }
    .fs-section { margin-bottom: 28px; }
    .fs-table { width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 0; }
    .fs-table th, .fs-table td { border: 1px solid #333; padding: 10px 14px; text-align: left; }
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
