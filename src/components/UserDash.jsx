import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYear } from '../context/YearContext';
import ApiService from '../services/api';
import './UserDash.css';
import logo from '../assets/logo.png';
import { MdDashboard, MdLogout, MdPeople, MdMenu, MdClose } from 'react-icons/md';
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
import { useNavigation } from '../context/NavigationContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function UserDash() {
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear, setSelectedYear, years, loading: yearLoading } = useYear();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [stats, setStats] = useState({ students: 0 });

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          navigate('/');
          return;
        }
        const user = JSON.parse(authUser);
        setUsername(user.username);
        setUserInitials(user.initials || user.username.charAt(0).toUpperCase());
        setLoading(true);
        // Only fetch students registered by this user for the selected year
        const students = await ApiService.getStudents(selectedYear);
        setStats({ students: students.length });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndData();
  }, [navigate, selectedYear]);

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      navigateWithLoader('/');
    } catch (error) {
      navigateWithLoader('/');
    }
  };

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="userdash-dashboard-container">
        <button className="userdash-hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {sidebarOpen && <div className="userdash-sidebar-overlay" onClick={handleSidebarClose}></div>}
        <div className={`userdash-sidebar${sidebarOpen ? ' open' : ''}`}>  
          <div className="userdash-logo-section">
            <img src={logo} alt="MPASAT Logo" className="userdash-logo" />
            <h1>MPASAT</h1>
            <button className="userdash-sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="userdash-nav-item active">
            <MdDashboard className="userdash-nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="userdash-nav-item" onClick={() => navigateWithLoader('/user-registration')}>
            <MdPeople className="userdash-nav-icon" />
            <span>Register</span>
          </div>
          <div className="userdash-nav-item" onClick={handleLogout}>
            <MdLogout className="userdash-nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="userdash-main-content">
          <div className="userdash-loading-container">
            <div className="userdash-loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="userdash-dashboard-container">
      {/* Hamburger menu for mobile */}
      <button className="userdash-hamburger-menu" onClick={handleSidebarToggle}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="userdash-sidebar-overlay" onClick={handleSidebarClose}></div>}
      {/* Sidebar */}
      <div className={`userdash-sidebar${sidebarOpen ? ' open' : ''}`}>  
        <div className="userdash-logo-section">
          <img src={logo} alt="MPASAT Logo" className="userdash-logo" />
          <h1>MPASAT</h1>
          <button className="userdash-sidebar-close" onClick={handleSidebarClose}>
            <MdClose />
          </button>
        </div>
        <div className="userdash-nav-item active">
          <MdDashboard className="userdash-nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="userdash-nav-item" onClick={() => navigateWithLoader('/user-registration')}>
          <MdPeople className="userdash-nav-icon" />
          <span>Register</span>
        </div>
        <div className="userdash-nav-item" onClick={handleLogout}>
          <MdLogout className="userdash-nav-icon" />
          <span>Logout</span>
        </div>
      </div>
      {/* Main Content */}
      <div className="userdash-main-content">
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
        <div className="userdash-user-avatar">
          {userInitials || username.charAt(0).toUpperCase()}
        </div>
        <div className="userdash-dashboard-content">
          <div className="userdash-header">
            <h1>User Dashboard</h1>
          </div>
          {/* Single Stat Card: Students Registered by User */}
          <div className="userdash-single-stat-card-wrapper">
            <div className="userdash-single-stat-card">
              <span className="userdash-single-stat-icon">
                <MdPeople />
              </span>
              <span className="userdash-single-stat-label">STUDENTS REGISTERED</span>
              <span className="userdash-single-stat-value">{stats.students}</span>
            </div>
          </div>
          {/* All metric/stat card and analytics chart sections removed as requested */}
          {error && <div className="userdash-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default UserDash;
