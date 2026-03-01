import React, { useState, useEffect, useRef } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import logo from '../assets/logo.png';
import './ReportFinances.css';

const SCHOOL_NAME = 'VOTECH S7 ACADEMY';

function buildIncomeRows(items, feeTotalPaid) {
  const rows = [];
  let itemSn = 1;
  let grandTotal = 0;

  // Fee - first income head (from Fee component)
  rows.push({
    sn: '',
    date: '',
    heading: 'Fee',
    amount: '',
    supportDoc: '',
    subTotal: '',
    isHeader: true,
  });
  rows.push({
    sn: itemSn++,
    date: '',
    heading: 'Total fee paid',
    amount: feeTotalPaid,
    supportDoc: '',
    subTotal: feeTotalPaid,
    isHeader: false,
    isItem: true,
  });
  rows.push({
    sn: '',
    date: '',
    heading: 'TOTAL',
    amount: '',
    supportDoc: '',
    subTotal: feeTotalPaid,
    isHeader: false,
    isTotal: true,
  });
  grandTotal += feeTotalPaid;

  // Inventory income items grouped by head
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
      const amt = (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
      headTotal += amt;
      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      rows.push({
        sn: itemSn++,
        date: dateStr,
        heading: item.item_name,
        amount: amt,
        supportDoc: item.item_id || String(item.id),
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

function buildExpenditureRows(items, salaryTotalCurrentMonth) {
  const rows = [];
  let itemSn = 1;
  let grandTotal = 0;

  // Salary - first expenditure head (from Salary component, current month)
  rows.push({
    sn: '',
    date: '',
    heading: 'Salary',
    amount: '',
    supportDoc: '',
    subTotal: '',
    isHeader: true,
  });
  rows.push({
    sn: itemSn++,
    date: '',
    heading: 'Total salary paid for current month',
    amount: salaryTotalCurrentMonth,
    supportDoc: 'Salary for this month',
    subTotal: salaryTotalCurrentMonth,
    isHeader: false,
    isItem: true,
  });
  rows.push({
    sn: '',
    date: '',
    heading: 'TOTAL',
    amount: '',
    supportDoc: '',
    subTotal: salaryTotalCurrentMonth,
    isHeader: false,
    isTotal: true,
  });
  grandTotal += salaryTotalCurrentMonth;

  // Inventory expenditure items grouped by head
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
      const amt = (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
      headTotal += amt;
      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      rows.push({
        sn: itemSn++,
        date: dateStr,
        heading: item.item_name,
        amount: amt,
        supportDoc: item.item_id || String(item.id),
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

function buildFinancialStatementData(items, feeTotalPaid, salaryTotalCurrentMonth) {
  const incomeItems = items.filter((i) => i.category === 'income');
  const expenditureItems = items.filter((i) => i.category === 'expenditure');

  // Income: Fee + heads from inventory (same structure as Income tab)
  const incomeCategories = ['Fee'];
  const incomeAmounts = { Fee: feeTotalPaid };
  const incomeByHead = {};
  incomeItems.forEach((item) => {
    const headName = item.head_name || 'Uncategorized';
    if (!incomeByHead[headName]) incomeByHead[headName] = 0;
    incomeByHead[headName] += (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
  });
  Object.keys(incomeByHead)
    .sort()
    .forEach((name) => {
      incomeCategories.push(name);
      incomeAmounts[name] = incomeByHead[name];
    });

  // Expenditure: Salary + heads from inventory (same structure as Expenditure tab)
  const expenditureCategories = ['Salary'];
  const expenditureAmounts = { Salary: salaryTotalCurrentMonth };
  const expenditureByHead = {};
  expenditureItems.forEach((item) => {
    const headName = item.head_name || 'Uncategorized';
    if (!expenditureByHead[headName]) expenditureByHead[headName] = 0;
    expenditureByHead[headName] += (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
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
              <tr>
                <td colSpan={6} className="rf-empty">No records</td>
              </tr>
            ) : rows.map((row, idx) => (
              <tr
                key={idx}
                className={
                  row.isHeader ? 'rf-row-header' : row.isTotal ? 'rf-row-total' : row.isGrandTotal ? 'rf-row-grand' : ''
                }
              >
                <td>{row.sn}</td>
                <td>{row.date}</td>
                <td className="rf-heading-cell">{row.heading}</td>
                <td className="rf-amount-cell">{formatNum(row.amount)}</td>
                <td>{row.supportDoc}</td>
                <td className="rf-amount-cell">{formatNum(row.subTotal)}</td>
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
  const [feeTotalPaid, setFeeTotalPaid] = useState(0);
  const [salaryTotalCurrentMonth, setSalaryTotalCurrentMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('income');
  const statementRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [inventoryData, feeTotals, paidSalaries] = await Promise.all([
          api.getReportInventory(),
          api.getFeeTotalsSummary().catch(() => ({ totalPaid: 0 })),
          api.getPaidSalaries().catch(() => []),
        ]);
        setItems(Array.isArray(inventoryData) ? inventoryData : []);
        setFeeTotalPaid(Number(feeTotals?.totalPaid) || 0);
        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const curYear = now.getFullYear();
        const salaryTotal = (Array.isArray(paidSalaries) ? paidSalaries : [])
          .filter((s) => Number(s.month) === curMonth && Number(s.year) === curYear)
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        setSalaryTotalCurrentMonth(salaryTotal);
      } catch {
        setItems([]);
        setFeeTotalPaid(0);
        setSalaryTotalCurrentMonth(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const incomeRows = buildIncomeRows(items, feeTotalPaid);
  const expenditureRows = buildExpenditureRows(items, salaryTotalCurrentMonth);
  const statementData = buildFinancialStatementData(items, feeTotalPaid, salaryTotalCurrentMonth);

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
      imgs.forEach(function(img) { if (src) img.src = src; });
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
        setTimeout(function() { window.close(); }, 1500);
      }, 250);
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
            <button type="button" className="rf-print-btn rf-print-btn-top" onClick={handlePrintStatement}>
              Print
            </button>
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
            {activeTab === 'income' && <ReportTable title="Income" rows={incomeRows} />}
            {activeTab === 'expenditure' && <ReportTable title="Expenditure" rows={expenditureRows} />}
          </>
        )}
      </div>
    </SideTop>
  );
}
