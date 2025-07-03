import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dash.css';
import logo from '../assets/logo.png';
import { useNavigation } from '../context/NavigationContext';
import { MdDashboard, MdLogout, MdPeople, MdSchool, MdWork, MdPerson, MdMenu, MdClose, MdAttachMoney, MdBadge } from 'react-icons/md';
import ApiService from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useYear } from '../context/YearContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Dash() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear, setSelectedYear, years, loading: yearLoading } = useYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    vocational: 0,
    teachers: 0,
    parents: 0 // Placeholder for parents
  });
  const [yearlyTotalFees, setYearlyTotalFees] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, classes, vocational, teachers] = await Promise.all([
          ApiService.getStudents(selectedYear),
          ApiService.getClasses(selectedYear),
          ApiService.getVocational(selectedYear),
          ApiService.getTeachers(selectedYear)
        ]);
        setStats({
          students: students.length,
          classes: classes.length,
          vocational: vocational.length,
          teachers: teachers.length,
          parents: 0
        });
        // Fetch yearly total fees for selected year
        const { total } = await ApiService.getYearlyTotalFees(selectedYear);
        setYearlyTotalFees(total);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    const fetchUserAndData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          regularNavigate('/');
          return;
        }
        const user = JSON.parse(authUser);
        setUsername(user.username);
        setUserInitials(user.initials);
        setLoading(true);
        await fetchStats();
      } catch (error) {
        setError(error.message);
        setLoading(false);
        regularNavigate('/');
      }
    };
    fetchUserAndData();
  }, [regularNavigate, selectedYear]);

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      regularNavigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      regularNavigate('/');
    }
  };

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  // Card data for rendering
  const cardData = [
    {
      label: 'STUDENTS',
      value: stats.students,
      icon: <MdPeople />, // faded background icon
      className: 'students-card',
    },
    {
      label: 'TEACHERS',
      value: stats.teachers,
      icon: <MdPerson />, // faded background icon
      className: 'teachers-card',
    },
    {
      label: 'CLASSES',
      value: stats.classes,
      icon: <MdSchool />, // faded background icon
      className: 'classes-card',
    },
    {
      label: 'VOCATIONAL',
      value: stats.vocational,
      icon: <MdWork />, // faded background icon
      className: 'vocational-card',
    },
    {
      label: 'TOTAL FEES PAID (YEAR)',
      value: yearlyTotalFees === null ? 'Loading...' : yearlyTotalFees.toLocaleString('en-US', { style: 'currency', currency: 'XAF', minimumFractionDigits: 2 }),
      icon: <MdAttachMoney />,
      className: 'fees-card',
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        {/* Hamburger menu for mobile */}
        <button className="hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={handleSidebarClose}></div>}
        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="logo-section">
            <img src={logo} alt="MPASAT Logo" className="logo" />
            <h1>MPASAT</h1>
            {/* Close button for mobile */}
            <button className="sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="nav-item active">
            <MdDashboard className="nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/students')}>
            <MdPeople className="nav-icon" />
            <span>Students</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/classes')}>
            <MdSchool className="nav-icon" />
            <span>Classes</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
            <MdWork className="nav-icon" />
            <span>Vocational</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}>
            <MdPerson className="nav-icon" />
            <span>Teachers</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/fees')}>
            <MdAttachMoney className="nav-icon" />
            <span>Fees</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/id-cards')}>
            <MdBadge className="nav-icon" />
            <span>ID Cards</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <MdLogout className="nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        {/* Hamburger menu for mobile */}
        <button className="hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={handleSidebarClose}></div>}
        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="logo-section">
            <img src={logo} alt="MPASAT Logo" className="logo" />
            <h1>MPASAT</h1>
            {/* Close button for mobile */}
            <button className="sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="nav-item active">
            <MdDashboard className="nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/students')}>
            <MdPeople className="nav-icon" />
            <span>Students</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/classes')}>
            <MdSchool className="nav-icon" />
            <span>Classes</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
            <MdWork className="nav-icon" />
            <span>Vocational</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}>
            <MdPerson className="nav-icon" />
            <span>Teachers</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/fees')}>
            <MdAttachMoney className="nav-icon" />
            <span>Fees</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/id-cards')}>
            <MdBadge className="nav-icon" />
            <span>ID Cards</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <MdLogout className="nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="main-content">
          <div className="error-container">
            <p>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Hamburger menu for mobile */}
      <button className="hamburger-menu" onClick={handleSidebarToggle}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={handleSidebarClose}></div>}
      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="logo-section">
          <img src={logo} alt="MPASAT Logo" className="logo" />
          <h1>MPASAT</h1>
          {/* Close button for mobile */}
          <button className="sidebar-close" onClick={handleSidebarClose}>
            <MdClose />
          </button>
        </div>
        <div className="nav-item active">
          <MdDashboard className="nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/students')}>
          <MdPeople className="nav-icon" />
          <span>Students</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/classes')}>
          <MdSchool className="nav-icon" />
          <span>Classes</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
          <MdWork className="nav-icon" />
          <span>Vocational</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}>
          <MdPerson className="nav-icon" />
          <span>Teachers</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/fees')}>
          <MdAttachMoney className="nav-icon" />
          <span>Fees</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/id-cards')}>
          <MdBadge className="nav-icon" />
          <span>ID Cards</span>
        </div>
        <div className="nav-item" onClick={handleLogout}>
          <MdLogout className="nav-icon" />
          <span>Logout</span>
        </div>
      </div>
      {/* Main Content */}
      <div className="main-content">
        {/* Year Switcher Dropdown */}
        <div style={{ position: 'absolute', top: 30, right: 100, zIndex: 11 }}>
          <select
            value={selectedYear || ''}
            onChange={e => setSelectedYear(Number(e.target.value))}
            disabled={yearLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #14296a',
              fontWeight: 600,
              fontSize: 16,
              background: '#fff',
              color: '#14296a',
              minWidth: 90,
              outline: 'none',
              cursor: yearLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(20,41,106,0.08)'
            }}
          >
            <option value="" disabled>Select Year</option>
            {years && years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {/* Profile circle positioned at top right */}
        <div className="user-avatar">
          {userInitials || username.charAt(0).toUpperCase()}
        </div>
        
        <div className="dashboard-content">
          <div className="header">
            <h1>Dashboard</h1>
          </div>
          <div className="stats-row">
            {cardData.map((card, idx) => (
              <div className={`stat-card2 ${card.className}`} key={card.label}>
                <span className="card-label">{card.label}</span>
                <span className="card-value">{card.value}<span className="plus">+</span></span>
                <span className="card-bg-icon">{card.icon}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dash; 