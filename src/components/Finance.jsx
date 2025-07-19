import React, { useState } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaMoneyBillWave, FaMoneyCheckAlt, FaUserTie, FaChevronDown, FaChartPie, FaBoxes, FaFileInvoiceDollar } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="admin-container">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="logo" className="sidebar-logo" />
          <span className="logo-text">VOTECH</span>
        </div>
        <nav className="menu">
          {menuItems.map((item, idx) => {
            let isActive = false;
            if (item.path && location.pathname === item.path) isActive = true;
            if (item.label === 'Finances') {
              return [
                <div key={item.label} className={`menu-item${isActive ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); setShowFinanceDropdown(v => !v); }}
                  style={{ position: 'relative' }}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                  <FaChevronDown style={{ marginLeft: 8, fontSize: 12 }} />
                </div>,
                showFinanceDropdown && (
                  <>
                    <div key="Fee" className="menu-item submenu-item-finance" style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="icon"><FaMoneyBill /></span>
                      <span className="label">Fee</span>
                    </div>
                    <div key="Salaries" className="menu-item submenu-item-finance" style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="icon"><FaUserTie /></span>
                      <span className="label">Salaries</span>
                    </div>
                    <div key="IncomeExpenditure" className="menu-item submenu-item-finance" style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="icon"><FaChartPie /></span>
                      <span className="label">Income & Expenditure</span>
                    </div>
                    <div key="MaterialsInventory" className="menu-item submenu-item-finance" style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="icon"><FaBoxes /></span>
                      <span className="label">Materials & Inventory</span>
                    </div>
                    <div key="FinancialReporting" className="menu-item submenu-item-finance" style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="icon"><FaFileInvoiceDollar /></span>
                      <span className="label">Financial Reporting</span>
                    </div>
                  </>
                )
              ];
            }
            return (
              <div
                className={`menu-item${item.label === 'ID Cards' ? location.pathname === '/admin-idcards' : location.pathname === item.path ? ' active' : ''}`}
                key={item.label}
                onClick={() => {
                  if (item.label === 'ID Cards') navigate('/admin-idcards');
                  else if (item.path) navigate(item.path);
                }}
                style={{ position: 'relative' }}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </div>
            );
          })}
        </nav>
        <button className="logout-btn" onClick={() => navigate('/signin')}>
          <FaSignOutAlt className="logout-icon" />
          <span>Logout</span>
        </button>
      </aside>
      <div className="main-content">
        <header className="admin-header">
          <div className="admin-header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <select className="year-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="admin-actions">
            <span className="icon notification"><span className="badge">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg></span>
            <span className="icon message"><span className="badge orange">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span className="admin-name">Admin1</span>
          </div>
        </header>
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
      </div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
} 