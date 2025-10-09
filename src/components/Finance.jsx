import React, { useState } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaMoneyBillWave, FaMoneyCheckAlt, FaChevronDown, FaChartPie, FaBoxes, FaFileInvoiceDollar } from 'react-icons/fa';
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
    async function fetchTotalsAndChart() {
      setLoadingTotals(true);
      try {
        const students = await api.getStudents();
        const classes = await api.getClasses();
        // Build a map of classId -> class total_fee
        const classMap = {};
        classes.forEach(cls => {
          classMap[cls.id] = parseFloat(cls.total_fee) || 0;
        });
        let paidSum = 0;
        let overallFee = 0;
        // For chart: aggregate by date
        const dateMap = {};
        const feeStatsArr = await Promise.all(students.map(async student => {
          try {
            const stats = await api.getStudentFeeStats(student.id);
            return { student, stats };
          } catch (e) {
            return { student, stats: null };
          }
        }));
        for (const { student, stats } of feeStatsArr) {
          const classTotalFee = classMap[student.class_id] || 0;
          overallFee += classTotalFee;
          let paid = 0;
          let paidDate = student.created_at ? student.created_at.slice(0, 10) : null;
          if (stats && stats.balance) {
            const sumBalance = Object.values(stats.balance).reduce((a, b) => a + (b || 0), 0);
            paid = classTotalFee - sumBalance;
          }
          paidSum += paid;
          // For chart: group by registration date
          if (paidDate) {
            if (!dateMap[paidDate]) dateMap[paidDate] = { date: paidDate, paid: 0, owed: 0 };
            dateMap[paidDate].paid += paid;
            dateMap[paidDate].owed += (classTotalFee - paid);
          }
        }
        setTotalPaid(paidSum);
        setTotalOwed(overallFee - paidSum);
        // Prepare chart data sorted by date
        const chartData = Object.values(dateMap)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(d => ({
            date: d.date,
            paid: d.paid,
            owed: d.owed
          }));
        setFeeChartData(chartData);
      } catch (e) {
        setTotalPaid(0);
        setTotalOwed(0);
        setFeeChartData([]);
      }
      setLoadingTotals(false);
    }
    fetchTotalsAndChart();
  }, []);

  return (
    <SideTop>
      {/* Place the main content of Finance here, excluding sidebar/topbar */}
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