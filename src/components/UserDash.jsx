import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYear } from '../context/YearContext';
import ApiService from '../services/api';
import './UserDash.css';
import logo from '../assets/logo.png';
import { MdDashboard, MdLogout, MdPeople, MdMenu, MdClose, MdReceipt } from 'react-icons/md';
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
  const [userRole, setUserRole] = useState('');
  const [stats, setStats] = useState({ students: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [studentRegistration, setStudentRegistration] = useState(null);
  const [childrenCount, setChildrenCount] = useState(0);

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
        setUserRole(user.role);
        setUserInitials(user.initials || user.username.charAt(0).toUpperCase());
        setLoading(true);
        
        console.log('Fetching data for user:', user.username, 'role:', user.role, 'year:', selectedYear);
        
        if (user.role === 'student') {
          // For students: check if they have registered themselves
          const students = await ApiService.getStudents(selectedYear);
          console.log('Student registration check - found students:', students);
          setStudentRegistration(students.length > 0 ? students[0] : null);
          setStats({ students: students.length > 0 ? 1 : 0 });
        } else if (user.role === 'parent') {
          // For parents: count all children they've registered
          const children = await ApiService.getStudents(selectedYear);
          console.log('Parent children count - found children:', children);
          setChildrenCount(children.length);
          setStats({ students: children.length });
        } else {
          // For other roles (admin, teacher)
          const students = await ApiService.getStudents(selectedYear);
          setStats({ students: students.length });
        }
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndData();
    
    // Add focus event listener to refresh data when user returns to dashboard
    const handleFocus = () => {
      console.log('Window focused, refreshing dashboard data...');
      fetchUserAndData();
    };
    
    window.addEventListener('focus', handleFocus);
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    
    return () => {
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

  // Function to manually refresh dashboard data
  const refreshDashboard = async () => {
    try {
      console.log('Manual refresh triggered...');
      const authUser = sessionStorage.getItem('authUser');
      const user = JSON.parse(authUser);
      
      if (user.role === 'student') {
        const students = await ApiService.getStudents(selectedYear);
        setStudentRegistration(students.length > 0 ? students[0] : null);
        setStats({ students: students.length > 0 ? 1 : 0 });
      } else if (user.role === 'parent') {
        const children = await ApiService.getStudents(selectedYear);
        setChildrenCount(children.length);
        setStats({ students: children.length });
      }
    } catch (err) {
      console.error('Error in manual refresh:', err);
      setError(err.message);
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
          <div className="userdash-nav-item" onClick={() => navigateWithLoader('/user-fees')}>
            <MdReceipt className="userdash-nav-icon" />
            <span>My Fees</span>
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
        <div className="userdash-nav-item" onClick={() => navigateWithLoader('/user-fees')}>
          <MdReceipt className="userdash-nav-icon" />
          <span>My Fees</span>
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
            <h1>
              {userRole === 'student' ? 'Student Dashboard' : 
               userRole === 'parent' ? 'Parent Dashboard' : 'User Dashboard'}
            </h1>
            <button 
              onClick={refreshDashboard}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #14296a',
                background: '#14296a',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              🔄 Refresh Count
            </button>
          </div>
          {/* Role-specific cards */}
          {userRole === 'student' && (
            <div className="userdash-single-stat-card-wrapper">
              <div className="userdash-single-stat-card">
                <span className="userdash-single-stat-icon">
                  <MdPeople />
                </span>
                <span className="userdash-single-stat-label">
                  MY REGISTRATION STATUS
                </span>
                <span className="userdash-single-stat-value">
                  {studentRegistration ? '✅ REGISTERED' : '❌ NOT REGISTERED'}
                </span>
                {studentRegistration && (
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#16a34a' }}>
                    Registered as: {studentRegistration.full_name}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {userRole === 'parent' && (
            <div className="userdash-single-stat-card-wrapper">
              <div className="userdash-single-stat-card" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                <span className="userdash-single-stat-icon" style={{ color: '#fff' }}>
                  <MdPeople />
                </span>
                <span className="userdash-single-stat-label" style={{ color: '#fff' }}>
                  CHILDREN REGISTERED
                </span>
                <span className="userdash-single-stat-value" style={{ color: '#fff', fontSize: '3rem' }}>
                  {childrenCount}
                </span>
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#fff' }}>
                  {childrenCount === 0 ? 'No children registered yet' : 
                   childrenCount === 1 ? '1 child registered' : 
                   `${childrenCount} children registered`}
                </div>
              </div>
            </div>
          )}
          
          {userRole !== 'student' && userRole !== 'parent' && (
            <div className="userdash-single-stat-card-wrapper">
              <div className="userdash-single-stat-card">
                <span className="userdash-single-stat-icon">
                  <MdPeople />
                </span>
                <span className="userdash-single-stat-label">
                  STUDENTS REGISTERED
                </span>
                <span className="userdash-single-stat-value">{stats.students}</span>
              </div>
            </div>
          )}
          
          {/* Role-based info message */}
          {userRole === 'student' && (
            <div className="userdash-info-box">
              <p>📝 <strong>Student Account:</strong> You can only register yourself once. Your registration status is shown above.</p>
            </div>
          )}
          {userRole === 'parent' && (
            <div className="userdash-info-box">
              <p>👨‍👩‍👧‍👦 <strong>Parent Account:</strong> You can register multiple children. The count above shows how many children you've registered.</p>
            </div>
          )}
          {/* All metric/stat card and analytics chart sections removed as requested */}
          {error && <div className="userdash-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default UserDash;
