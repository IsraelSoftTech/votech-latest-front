import React, { useState } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaChevronDown, FaMoneyCheckAlt, FaUserTie, FaChartPie, FaBoxes, FaFileInvoiceDollar } from 'react-icons/fa';
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

const enrolmentData = [
  { date: 'March', value: 2 },
  { date: 'April', value: 4 },
  { date: 'May', value: 37 },
  { date: 'June', value: 5 },
  { date: 'July', value: 12 },
  { date: 'August', value: 18 },
  { date: 'September', value: 25 },
  { date: 'October', value: 9 },
];

function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
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
            return (
              <div
                className={`menu-item${isActive ? ' active' : ''}`}
                key={item.label}
                onClick={() => {
                  if (item.path) navigate(item.path);
                }}
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
          <div className="card students">
            <div className="icon"><FaUserGraduate /></div>
            <div className="count">2000</div>
            <div className="desc">Registered Students</div>
          </div>
          <div className="card teachers">
            <div className="icon"><FaChalkboardTeacher /></div>
            <div className="count">47</div>
            <div className="desc">Registered Teachers</div>
          </div>
          <div className="card fees">
            <div className="icon"><FaMoneyBill /></div>
            <div className="count">2000000 XAF</div>
            <div className="desc">Total Fee Paid</div>
          </div>
        </div>
        <div className="dashboard-section">
          <div className="enrolment-chart">
            <div className="section-title">Students enrolment</div>
            <div className="chart-placeholder">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={enrolmentData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="enrolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4eaaff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4eaaff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 40]} tickCount={9} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#4eaaff" fillOpacity={1} fill="url(#enrolGrad)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="enrolment-info">50 enrolment this month</div>
            </div>
          </div>
         
          <div className="disciplinary-table">
            <div className="section-title">Urgent Disciplinary Cases</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Class</th>
                    <th>Case</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>John Paul</td>
                    <td>Student</td>
                    <td>Form 1</td>
                    <td>Caught fighting</td>
                  </tr>
                  <tr>
                    <td>Ngah Peter</td>
                    <td>Teacher</td>
                    <td>-</td>
                    <td>Absenteeism</td>
                  </tr>
                  <tr>
                    <td>Jung Tome</td>
                    <td>Student</td>
                    <td>Form 2</td>
                    <td>Late</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

export default Admin; 