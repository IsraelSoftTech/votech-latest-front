import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYear } from '../context/YearContext';
import ApiService from '../services/api';
import './TeacherDash.css';
import logo from '../assets/logo.png';
import { MdDashboard, MdLogout, MdPeople, MdMenu, MdClose, MdRefresh, MdReceipt } from 'react-icons/md';
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

function TeacherDash() {
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear, setSelectedYear, years, loading: yearLoading } = useYear();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [stats, setStats] = useState({ teachers: 0 });
  const [teacherStatus, setTeacherStatus] = useState('pending');
  const [previousStatus, setPreviousStatus] = useState(null);
  const [showStatusNotification, setShowStatusNotification] = useState(false);
  const [statusNotification, setStatusNotification] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

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
        // Fetch teachers registered by this user for the selected year
        const teachers = await ApiService.getTeachers(selectedYear);
        setStats({ teachers: teachers.length });
        
        // Get the latest teacher status (most recent registration)
        if (teachers.length > 0) {
          const latestTeacher = teachers[0]; // Most recent
          const currentStatus = latestTeacher.status;
          
          // Check for status changes
          if (previousStatus && previousStatus !== currentStatus) {
            setStatusNotification(`Your registration status has changed to: ${currentStatus.toUpperCase()}`);
            setShowStatusNotification(true);
            setTimeout(() => setShowStatusNotification(false), 5000);
          }
          setPreviousStatus(currentStatus);
          setTeacherStatus(currentStatus);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndData();

    // Set up polling for real-time updates every 30 seconds
    const pollingInterval = setInterval(async () => {
      try {
        const teachers = await ApiService.getTeachers(selectedYear);
        setStats({ teachers: teachers.length });
        
        if (teachers.length > 0) {
          const latestTeacher = teachers[0];
          const currentStatus = latestTeacher.status;
          
          // Check for status changes
          if (previousStatus && previousStatus !== currentStatus) {
            setStatusNotification(`Your registration status has changed to: ${currentStatus.toUpperCase()}`);
            setShowStatusNotification(true);
            setTimeout(() => setShowStatusNotification(false), 5000);
          }
          setPreviousStatus(currentStatus);
          setTeacherStatus(currentStatus);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 30000); // 30 seconds

    // Refresh data when window comes into focus
    const handleFocus = async () => {
      try {
        const teachers = await ApiService.getTeachers(selectedYear);
        setStats({ teachers: teachers.length });
        
        if (teachers.length > 0) {
          const latestTeacher = teachers[0];
          const currentStatus = latestTeacher.status;
          
          // Check for status changes
          if (previousStatus && previousStatus !== currentStatus) {
            setStatusNotification(`Your registration status has changed to: ${currentStatus.toUpperCase()}`);
            setShowStatusNotification(true);
            setTimeout(() => setShowStatusNotification(false), 5000);
          }
          setPreviousStatus(currentStatus);
          setTeacherStatus(currentStatus);
        }
      } catch (err) {
        console.error('Focus refresh error:', err);
      }
    };

    window.addEventListener('focus', handleFocus);

    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', handleResize);
    };
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

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const teachers = await ApiService.getTeachers(selectedYear);
      setStats({ teachers: teachers.length });
      
      if (teachers.length > 0) {
        const latestTeacher = teachers[0];
        const currentStatus = latestTeacher.status;
        
        // Check for status changes
        if (previousStatus && previousStatus !== currentStatus) {
          setStatusNotification(`Your registration status has changed to: ${currentStatus.toUpperCase()}`);
          setShowStatusNotification(true);
          setTimeout(() => setShowStatusNotification(false), 5000);
        }
        setPreviousStatus(currentStatus);
        setTeacherStatus(currentStatus);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="teacherdash-dashboard-container">
        <button className="teacherdash-hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {sidebarOpen && <div className="teacherdash-sidebar-overlay" onClick={handleSidebarClose}></div>}
        <div className={`teacherdash-sidebar${sidebarOpen ? ' open' : ''}`}>  
          <div className="teacherdash-logo-section">
            <img src={logo} alt="MPASAT Logo" className="teacherdash-logo" />
            <h1>MPASAT</h1>
            <button className="teacherdash-sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="teacherdash-nav-item active">
            <MdDashboard className="teacherdash-nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="teacherdash-nav-item" onClick={() => navigateWithLoader('/teacher-registration')}>
            <MdPeople className="teacherdash-nav-icon" />
            <span>Register</span>
          </div>
          <div className="teacherdash-nav-item" onClick={() => navigateWithLoader('/user-fees')}>
            <MdReceipt className="teacherdash-nav-icon" />
            <span>My Fees</span>
          </div>
          <div className="teacherdash-nav-item" onClick={handleLogout}>
            <MdLogout className="teacherdash-nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="teacherdash-main-content">
          <div className="teacherdash-loading-container">
            <div className="teacherdash-loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacherdash-dashboard-container">
      {/* Hamburger menu for mobile */}
      <button className="teacherdash-hamburger-menu" onClick={handleSidebarToggle}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="teacherdash-sidebar-overlay" onClick={handleSidebarClose}></div>}
      {/* Sidebar */}
      <div className={`teacherdash-sidebar${sidebarOpen ? ' open' : ''}`}>  
        <div className="teacherdash-logo-section">
          <img src={logo} alt="MPASAT Logo" className="teacherdash-logo" />
          <h1>MPASAT</h1>
          <button className="teacherdash-sidebar-close" onClick={handleSidebarClose}>
            <MdClose />
          </button>
        </div>
        <div className="teacherdash-nav-item active">
          <MdDashboard className="teacherdash-nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="teacherdash-nav-item" onClick={() => navigateWithLoader('/teacher-registration')}>
          <MdPeople className="teacherdash-nav-icon" />
          <span>Register</span>
        </div>
        <div className="teacherdash-nav-item" onClick={() => navigateWithLoader('/user-fees')}>
          <MdReceipt className="teacherdash-nav-icon" />
          <span>My Fees</span>
        </div>
        <div className="teacherdash-nav-item" onClick={handleLogout}>
          <MdLogout className="teacherdash-nav-icon" />
          <span>Logout</span>
        </div>
      </div>
      {/* Main Content */}
      <div className="teacherdash-main-content">
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
        <div className="teacherdash-user-avatar">
          {userInitials || username.charAt(0).toUpperCase()}
        </div>
        <div className="teacherdash-dashboard-content">
          <div className="teacherdash-header">
            <h1>My Dashboard</h1>
            <button className="teacherdash-refresh-btn" onClick={handleRefresh} title="Refresh Status">
              <MdRefresh />
            </button>
          </div>
          {/* Single Stat Card: Teacher Registration Status */}
          <div className="teacherdash-single-stat-card-wrapper">
            <div className="teacherdash-single-stat-card">
              <span className="teacherdash-single-stat-icon">
                <MdPeople />
              </span>
              <span className="teacherdash-single-stat-label">REGISTRATION STATUS</span>
              <span className={`teacherdash-single-stat-value teacherdash-status-${teacherStatus}`}>
                {teacherStatus === 'pending' ? 'PENDING' : 
                 teacherStatus === 'approved' ? 'APPROVED' : 'REJECTED'}
              </span>
            </div>
          </div>
          {error && <div className="teacherdash-error">{error}</div>}
          {showStatusNotification && (
            <div className="teacherdash-status-notification">
              {statusNotification}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDash; 