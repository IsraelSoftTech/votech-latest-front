import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaChevronDown, FaEnvelope, FaIdCard, FaCog } from 'react-icons/fa';
import logo from '../assets/logo.png';
import ReactDOM from 'react-dom';
import './SideTop.css';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Departments', icon: <FaClipboardList />, path: '/admin-specialty' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
  { label: 'ID Cards', icon: <FaIdCard />, path: '/admin-idcards' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy />, path: '/admin-lesson-plans' },
];

export default function SideTop({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [visibleMenuCount, setVisibleMenuCount] = useState(window.innerWidth <= 700 ? 10 : 11);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

  useEffect(() => {
    function handleResize() {
      setVisibleMenuCount(window.innerWidth <= 700 ? 10 : 11);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showSeeMore = menuItems.length > visibleMenuCount;
  const visibleMenuItems = menuExpanded ? menuItems : menuItems.slice(0, visibleMenuCount);

  return (
    <div className="admin-container">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="logo" className="sidebar-logo" />
          <span className="logo-text">VOTECH</span>
        </div>
        <nav className="menu">
          {visibleMenuItems.map((item, idx) => {
            // Hide 'Finances' tab unless Admin1 or Admin2
            if (item.label === 'Finances' && !(authUser?.role === 'Admin1' || authUser?.role === 'Admin2')) {
              return null;
            }
            let isActive = false;
            if (item.path && location.pathname === item.path) isActive = true;
            return (
              <div
                className={`menu-item${isActive ? ' active' : ''}`}
                key={item.label}
                onClick={() => {
                  if (item.label === 'ID Cards') navigate('/admin-idcards');
                  else if (item.path) navigate(item.path);
                }}
                style={{ position: 'relative' }}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
                {item.label === 'Messages' && (
                  <span style={{ position: 'absolute', right: 18, top: 16, width: 9, height: 9, background: '#e53e3e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 1px 4px rgba(32,64,128,0.13)' }}></span>
                )}
              </div>
            );
          })}
          {/* Display Users tab for Admin3 only */}
          {authUser?.role === 'Admin3' && (
            <div
              className={`menu-item${location.pathname === '/admin-users' ? ' active' : ''}`}
              onClick={() => navigate('/admin-users')}
              style={{ position: 'relative' }}
            >
              <span className="icon"><FaUserGraduate /></span>
              <span className="label">Display Users</span>
            </div>
          )}
          {showSeeMore && (
            <button
              className="menu-item see-more-btn"
              style={{ background: '#4669b3', color: '#fff', margin: '8px 12px', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem', padding: '12px 0' }}
              onClick={() => setMenuExpanded(v => !v)}
            >
              {menuExpanded ? 'See Less' : 'See More...'}
            </button>
          )}
        </nav>
      </aside>
      <div className="main-content" style={{ paddingTop: 32, minHeight: 'calc(100vh - 0px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <header className="admin-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100, width: '100%' }}>
          <div className="admin-header-left" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={logo} alt="logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              <span style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: 1.5, color: '#204080' }}>VOTECH</span>
            </div>
          </div>
          <div className="admin-actions">
            <button
              style={{ background: 'none', border: 'none', color: '#204080', fontWeight: 600, fontSize: 17, cursor: 'pointer', position: 'relative', padding: '4px 12px', borderRadius: 6 }}
              onClick={() => setUserMenuOpen(v => !v)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 180)}
            >
              {username}
            </button>
            {userMenuOpen && ReactDOM.createPortal(
              <div style={{ position: 'fixed', top: 64, right: 24, background: '#fff', borderRadius: 10, boxShadow: '0 4px 24px rgba(32,64,128,0.13)', minWidth: 160, zIndex: 99999, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'stretch', overflow: 'visible' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#204080', fontWeight: 500, fontSize: 16, padding: '10px 18px', cursor: 'pointer', borderRadius: 0, textAlign: 'left' }}>
                  <FaCog style={{ fontSize: 17 }} /> Settings
                </button>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#e53e3e', fontWeight: 500, fontSize: 16, padding: '10px 18px', cursor: 'pointer', borderRadius: 0, textAlign: 'left' }}
                  onClick={() => {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('authUser');
                    window.location.href = '/signin';
                  }}
                >
                  <FaSignOutAlt style={{ fontSize: 17 }} /> Logout
                </button>
              </div>, document.body
            )}
          </div>
        </header>
        <div style={{ marginTop: 32 }}>{children}</div>
      </div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
} 