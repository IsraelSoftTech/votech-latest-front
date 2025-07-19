import React, { useState } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaMoneyBillWave, FaMoneyCheckAlt, FaUserTie, FaChevronDown, FaChartPie, FaBoxes, FaFileInvoiceDollar } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReactDOM from 'react-dom';
import { FaCog } from 'react-icons/fa';
import SideTop from './SideTop';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
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
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SideTop>
      {/* Place the main content of Finance here, excluding sidebar/topbar */}
      <div className="dashboard-cards">
        <div className="card paid">
          <div className="icon"><FaMoneyBillWave /></div>
          <div className="count">XAF2,000,000</div>
          <div className="desc">Total Fee Paid</div>
        </div>
        <div className="card owed">
          <div className="icon"><FaMoneyCheckAlt /></div>
          <div className="count">XAF500,000</div>
          <div className="desc">Total Fee Owed</div>
        </div>
        <div className="card salary">
          <div className="icon"><FaUserTie /></div>
          <div className="count">XAF800,000</div>
          <div className="desc">Total Salary Paid This Month</div>
        </div>
      </div>
      <div className="finance-metrics">
        <h3>Fee & Salary Payment Rate</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={feeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#204080" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#204080" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 8]} tickCount={9} />
            <Tooltip />
            <Area type="monotone" dataKey="fee" stroke="#204080" fillOpacity={1} fill="url(#colorFee)" />
            <Area type="monotone" dataKey="salary" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSalary)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SideTop>
  );
} 