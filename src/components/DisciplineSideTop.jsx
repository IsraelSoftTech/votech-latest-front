import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DisciplineSideTop.css';
import logo from '../assets/logo.png';
import { FaTachometerAlt, FaEnvelope, FaUserGraduate, FaClipboardList, FaGavel, FaFileAlt, FaComments, FaShieldAlt, FaCog, FaBars, FaSignOutAlt } from 'react-icons/fa';
import ReactDOM from 'react-dom';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/discipline' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/discipline-messages' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/discipline-students' },
  { label: 'Attendance', icon: <FaClipboardList />, path: '/attendance' },
  { label: 'Disciplinary Cases', icon: <FaGavel />, path: '/discipline-cases' },
  { label: 'Reports', icon: <FaFileAlt />, path: '/discipline-reports' },
  { label: 'Counseling Records', icon: <FaComments />, path: '/discipline-counseling' },
  { label: 'Security Incidents', icon: <FaShieldAlt />, path: '/discipline-security' },
  { label: 'Settings', icon: <FaCog />, path: '/discipline-settings' },
];

export default function DisciplineSideTop({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

  return (
    <div className="discipline-container">
      <aside className={`discipline-sidebar${sidebarOpen ? ' open' : ''}`}> 
        <div className="discipline-logo">
          <img src={logo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', marginRight: 8 }} />
          <span className="logo-text">VOTECH</span>
        </div>
        <nav className="discipline-menu">
          {menuItems.map(item => (
            <div
              key={item.label}
              className={`discipline-menu-item${location.pathname === item.path ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>
      <div className="discipline-main">
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
