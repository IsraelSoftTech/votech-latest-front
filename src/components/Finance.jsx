import React, { useState, useEffect } from 'react';
import './Admin.css';
import './Finance.css';
import { FaMoneyBillWave, FaMoneyCheckAlt, FaPrint } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import SideTop from './SideTop';
import api from '../services/api';

const PLACEHOLDER_CHART = [{ date: '—', paid: 0, owed: 0 }];

export default function Finance() {
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [feeChartData, setFeeChartData] = useState(PLACEHOLDER_CHART);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTotals(true);
      try {
        const data = await api.getFeeTotalsSummary();
        if (cancelled) return;
        const paid = data.totalPaid || 0;
        const owed = data.totalOwed || 0;
        setTotalPaid(paid);
        setTotalOwed(owed);
        const chart = Array.isArray(data.chart) && data.chart.length
          ? data.chart
          : [{ date: 'Current', paid, owed }];
        setFeeChartData(chart);
      } catch (e) {
        if (cancelled) return;
        setTotalPaid(0);
        setTotalOwed(0);
        setFeeChartData(PLACEHOLDER_CHART);
      }
      if (!cancelled) setLoadingTotals(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePrintFeeSummary = () => {
    const w = window.open('', '_blank');
    if (!w) {
      alert('Please allow pop-ups to print the summary.');
      return;
    }
    const formatCurrency = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) + ' XAF';
    const logoSrc = logo ? (String(logo).startsWith('http') ? logo : window.location.origin + (String(logo).startsWith('/') ? logo : '/' + logo)) : '';
    const schoolName = 'VOTECH (S7) ACADEMY';
    const loadingDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>All Fee Summary</title></head><body style="font-family:Arial;padding:40px;text-align:center;"><p>Loading fee summary...</p></body></html>`;
    w.document.write(loadingDoc);
    w.document.close();

    (async () => {
      try {
        const classData = await api.getFeeSummaryByClass();
        const classes = classData?.classes || [];
        // Total the printed rows rather than the dashboard cards, so the
        // OVERALL TOTAL always reconciles with the table above it.
        const sumOf = (key) => classes.reduce((sum, c) => sum + (Number(c[key]) || 0), 0);
        const totalExpected = sumOf('total_expected');
        const cardPaid = sumOf('total_paid');
        const cardOwed = sumOf('total_owed');
        const rows = classes.map((c, i) => `
          <tr>
            <td style="border: 1px solid #333; padding: 8px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #333; padding: 8px;">${(c.class_name || '').replace(/</g, '&lt;')}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(c.total_expected || 0)}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(c.total_paid || 0)}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(c.total_owed || 0)}</td>
          </tr>
        `).join('');
        const printDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>All Fee Summary - ${schoolName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-header { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1e3a8a; }
    .print-logo { width: 70px; height: 70px; object-fit: contain; }
    .print-school { flex: 1; }
    .print-school h1 { font-size: 24px; color: #1e3a8a; margin-bottom: 4px; }
    .print-title { font-size: 18px; font-weight: 600; color: #333; }
    .print-date { font-size: 12px; color: #666; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1e3a8a; color: #fff; padding: 12px 8px; text-align: left; font-weight: 600; }
    th:first-child { text-align: center; }
    th:nth-child(n+3) { text-align: right; }
    .total-row { background: #e8eef7; font-weight: 700; }
    .total-row td { padding: 12px 8px; border: 2px solid #1e3a8a; }
  </style>
</head>
<body>
  <div class="print-header">
    <img src="${logoSrc}" alt="Logo" class="print-logo" />
    <div class="print-school">
      <h1>${schoolName}</h1>
      <div class="print-title">All Fee Summary</div>
      <div class="print-date">Generated: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">#</th>
        <th>Class</th>
        <th>Total Expected (XAF)</th>
        <th>Total Paid (XAF)</th>
        <th>Total Owed (XAF)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2" style="text-align: right; font-weight: 700;">OVERALL TOTAL</td>
        <td style="text-align: right;">${formatCurrency(totalExpected)}</td>
        <td style="text-align: right;">${formatCurrency(cardPaid)}</td>
        <td style="text-align: right;">${formatCurrency(cardOwed)}</td>
      </tr>
    </tbody>
  </table>
  <script>
    (function() {
      var imgs = document.querySelectorAll('.print-logo');
      imgs.forEach(function(img) { img.src = ${JSON.stringify(logoSrc)}; });
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
        setTimeout(function() { window.close(); }, 1000);
      }, 200);
    })();
  </${'script'}>
</body>
</html>`;
        w.document.open();
        w.document.write(printDoc);
        w.document.close();
      } catch (err) {
        console.error('Print fee summary error:', err);
        w.document.body.innerHTML = '<p style="padding:40px;color:red;">Failed to load fee summary.</p>';
      }
    })();
  };

  return (
    <SideTop>
      <div className="finance-cards-row">
        <button className="finance-print-summary-btn" onClick={handlePrintFeeSummary} title="Print All Fee Summary by Class">
          <FaPrint /> Print Summary
        </button>
        <div className="dashboard-cards">
          <div className="card paid">
            <div className="icon"><FaMoneyBillWave /></div>
            <div className="count">{loadingTotals ? '...' : totalPaid.toLocaleString()} XAF</div>
            <div className="desc">Total Fee Paid</div>
          </div>
          <div className="card owed">
            <div className="icon"><FaMoneyCheckAlt /></div>
            <div className="count">{loadingTotals ? '...' : totalOwed.toLocaleString()} XAF</div>
            <div className="desc">Total Fee Owed</div>
          </div>
        </div>
      </div>
      <div className="finance-metrics">
        <h3>Fee Paid and Fee Owed Rate</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={feeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="paid" stroke="#204080" fill="#204080" fillOpacity={0.35} name="Fee Paid" />
            <Area type="monotone" dataKey="owed" stroke="#e53e3e" fill="#e53e3e" fillOpacity={0.35} name="Fee Owed" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SideTop>
  );
}
