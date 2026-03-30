import React, { useState } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaMoneyBillWave, FaMoneyCheckAlt, FaChevronDown, FaChartPie, FaBoxes, FaFileInvoiceDollar, FaPrint } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReactDOM from 'react-dom';
import { FaCog } from 'react-icons/fa';
import SideTop from './SideTop';
import api from '../services/api';
import { useEffect } from 'react';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Staff', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy /> },
];

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

const feeData = [
  { date: 'Jul 8', fee: 0, salary: 0 },
  { date: 'Jul 9', fee: 0, salary: 0 },
  { date: 'Jul 10', fee: 0, salary: 0 },
  { date: 'Jul 11', fee: 0, salary: 0 },
  { date: 'Jul 12', fee: 1, salary: 0.5 },
  { date: 'Jul 13', fee: 3, salary: 2 },
  { date: 'Jul 14', fee: 1, salary: 1 },
  { date: 'Jul 15', fee: 2, salary: 1.5 },
  { date: 'Jul 16', fee: 4, salary: 2.5 },
  { date: 'Jul 17', fee: 3, salary: 2 },
  { date: 'Jul 18', fee: 2, salary: 1 },
];

export default function Finance() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showFinanceDropdown, setShowFinanceDropdown] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [feeChartData, setFeeChartData] = useState([]);
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Load cards immediately with fast API - don't block on slow chart
    (async () => {
      setLoadingTotals(true);
      try {
        const { totalPaid: paid, totalOwed: owed } = await api.getFeeTotalsSummary();
        setTotalPaid(paid);
        setTotalOwed(owed);
      } catch (e) {
        setTotalPaid(0);
        setTotalOwed(0);
      }
      setLoadingTotals(false);
    })();

    // Chart loads in background (slower - many API calls)
    (async () => {
      try {
        const students = await api.getStudents();
        const feeStatsArr = await Promise.all(students.map(async student => {
          try {
            const stats = await api.getStudentFeeStats(student.id);
            return { student, stats };
          } catch (e) {
            return { student, stats: null };
          }
        }));
        const dateMap = {};
        const feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
        for (const { student, stats } of feeStatsArr) {
          let classTotalFee = 0;
          let paid = 0;
          if (stats?.student && stats?.balance) {
            feeTypes.forEach(type => {
              const expected = parseFloat(stats.student[type.toLowerCase() + '_fee']) || 0;
              const balance = stats.balance[type] || 0;
              classTotalFee += expected;
              paid += Math.max(0, expected - balance);
            });
          }
          const paidDate = student.created_at ? student.created_at.slice(0, 10) : null;
          if (paidDate) {
            if (!dateMap[paidDate]) dateMap[paidDate] = { date: paidDate, paid: 0, owed: 0 };
            dateMap[paidDate].paid += paid;
            dateMap[paidDate].owed += (classTotalFee - paid);
          }
        }
        const chartData = Object.values(dateMap)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(d => ({ date: d.date, paid: d.paid, owed: d.owed }));
        setFeeChartData(chartData);
      } catch (e) {
        setFeeChartData([]);
      }
    })();
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
        let cardPaid = totalPaid;
        let cardOwed = totalOwed;
        let classData;
        if (loadingTotals) {
          const [totals, data] = await Promise.all([api.getFeeTotalsSummary(), api.getFeeSummaryByClass()]);
          cardPaid = totals.totalPaid;
          cardOwed = totals.totalOwed;
          classData = data;
        } else {
          classData = await api.getFeeSummaryByClass();
        }
        const totalExpected = (cardPaid || 0) + (cardOwed || 0);
        const classes = classData?.classes || [];
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
  <\/script>
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
      {/* Place the main content of Finance here, excluding sidebar/topbar */}
      <div className="finance-cards-row">
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
        <button className="finance-print-summary-btn" onClick={handlePrintFeeSummary} title="Print All Fee Summary by Class">
          <FaPrint /> Print Summary
        </button>
      </div>
      <div className="finance-metrics">
        <h3>Fee Paid and Fee Owed Rate</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={feeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#204080" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#204080" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOwed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#e53e3e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="paid" stroke="#204080" fillOpacity={1} fill="url(#colorPaid)" name="Fee Paid" />
            <Area type="monotone" dataKey="owed" stroke="#e53e3e" fillOpacity={1} fill="url(#colorOwed)" name="Fee Owed" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SideTop>
  );
} 