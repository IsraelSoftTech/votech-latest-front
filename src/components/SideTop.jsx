import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaChevronDown, FaEnvelope, FaIdCard, FaCog, FaFileInvoiceDollar, FaBoxes, FaCreditCard, FaUserTie, FaChartPie } from 'react-icons/fa';
import logo from '../assets/logo.png';
import ReactDOM from 'react-dom';
import './SideTop.css';
import api from '../services/api';

export default function SideTop({ children, hasUnread }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [visibleMenuCount, setVisibleMenuCount] = useState(window.innerWidth <= 700 ? 10 : 11);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

  let menuItems = [
    { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
    { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
    { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
    { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
    { label: 'Departments', icon: <FaClipboardList />, path: '/admin-specialty' },
    { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
    { label: 'ID Cards', icon: <FaIdCard />, path: '/admin-idcards' },
    { label: 'Subjects', icon: <FaBook />, path: '/admin-subjects' },
    { label: 'Reports', icon: <FaFileAlt /> },
    { label: 'Lesson Plans', icon: <FaPenFancy />, path: '/admin-lesson-plans' },
  ];

  if (authUser?.role === 'Admin2') {
    menuItems = [
      { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
      { label: 'Financial Summary', icon: <FaMoneyBill />, path: '/admin-finance' },
      { label: 'Fee', icon: <FaCreditCard />, path: '/admin-fee' },
      { label: 'Salary', icon: <FaFileInvoiceDollar />, path: '/admin-salary' },
      { label: 'Inventory', icon: <FaBoxes />, path: '/admin-inventory' },
      { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
      { label: 'Exam/Marks', icon: <FaChartBar /> },
      { label: 'Lesson Plans', icon: <FaPenFancy />, path: '/admin-lesson-plans' },
    ];
  } else if (authUser?.role === 'Discipline') {
    // Remove Finance, Exam/Marks, Display Users, add Attendance
    menuItems = menuItems.filter(item => !['Finances', 'Exam/Marks'].includes(item.label));
    menuItems.splice(5, 0, { label: 'Attendance', icon: <FaClipboardList />, path: '/admin-attendance' });
  } else {
    // For other roles, add Finance, Exam/Marks, and Attendance only for Discipline
    menuItems.splice(8, 0, { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance',
      submenu: [
        { label: 'Fee Payment', icon: <FaCreditCard />, path: '/admin-fee' },
        { label: 'Salary,Invoice', icon: <FaFileInvoiceDollar />, path: '/admin-salary' },
        { label: 'Inventory', icon: <FaBoxes />, path: '/admin-inventory' },
      ]
    });
    menuItems.splice(10, 0, { label: 'Exam/Marks', icon: <FaChartBar /> });
  }

  useEffect(() => {
    function handleResize() {
      setVisibleMenuCount(window.innerWidth <= 700 ? 10 : 11);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automatically expand parent menu if a submenu route is active
  useEffect(() => {
    // If on /admin-fee, expand Finances and do not activate Dashboard
    if (location.pathname.startsWith('/admin-fee')) {
      setExpandedMenu('Finances');
    } else {
      const activeSubmenu = menuItems.find(item => item.submenu && item.submenu.some(sub => location.pathname.startsWith(sub.path)));
      if (activeSubmenu) {
        setExpandedMenu(activeSubmenu.label);
      }
    }
  }, [location.pathname]);

  // Only show Finances for Admin2
  const filteredMenuItems = menuItems.filter(item => {
    if (item.label === 'Finances') {
      return authUser?.role === 'Admin2';
    }
    return true;
  });
  const showSeeMore = filteredMenuItems.length > visibleMenuCount;
  const visibleMenuItems = menuExpanded ? filteredMenuItems : filteredMenuItems.slice(0, visibleMenuCount);

  // Determine if user is a teacher
  const isTeacher = authUser?.role === 'Teacher';
  const [teacherStatus, setTeacherStatus] = useState(null);

  useEffect(() => {
    if (isTeacher) {
      (async () => {
        try {
          const all = await api.getAllTeachers();
          let rec = null;
          if (authUser?.id) {
            rec = all.find(t => t.user_id === authUser.id);
          }
          if (!rec) {
            rec = all.find(t => t.contact === authUser?.contact || t.full_name === authUser?.name);
          }
          setTeacherStatus(rec?.status || 'pending');
        } catch (err) {
          setTeacherStatus('pending');
        }
      })();
    }
  }, [isTeacher, authUser]);

  // Teacher menu items (from deleted TeacherSideTop)
  const teacherMenuItems = [
    { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/teacher-dashboard' },
    { label: 'Messages', icon: <FaEnvelope />, path: '/teacher-messages' },
    { label: 'My Classes', icon: <FaBook />, path: '/teacher-classes' },
    { label: 'Students', icon: <FaUserGraduate />, path: '/teacher-students' },
    { label: 'Marks', icon: <FaChartBar />, path: '/teacher-marks' },
    { label: 'Attendance', icon: <FaClipboardList />, path: '/teacher-attendance' },
    { label: 'Lesson Plans', icon: <FaPenFancy />, path: '/teacher-lesson-plans' },
    { label: 'Reports', icon: <FaFileAlt />, path: '/teacher-reports' },
  ];

  // Dean/Admin4 menu items (from provided image)
  const deanMenuItems = [
    { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/dean' },
    { label: 'Messages', icon: <FaEnvelope />, path: '/dean-messages' },
    { label: 'Events', icon: <FaClipboardList />, path: '/dean-events' },
    { label: 'Staff Management', icon: <FaUserTie />, path: '/dean-staff' },
    { label: 'Inventory', icon: <FaBoxes />, path: '/dean-inventory' },
    { label: 'Academic Planning', icon: <FaBook />, path: '/dean-academic' },
    { label: 'Timetables', icon: <FaClipboardList />, path: '/dean-timetables' },
  ];

  // Use correct menu for each role
  let menuToShow = visibleMenuItems;
  if (isTeacher) menuToShow = teacherMenuItems;
  if (authUser?.role === 'Admin4') menuToShow = deanMenuItems;

  return (
    <div className="admin-container">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="logo" className="sidebar-logo" />
          <span className="logo-text">VOTECH</span>
        </div>
        <nav className="menu">
          {menuToShow.map(item => (
            <div
              key={item.label}
              className={`menu-item${location.pathname === item.path ? ' active' : ''}`}
              onClick={() => item.path && navigate(item.path)}
              style={{ position: 'relative' }}
            >
              <span className="icon">{item.icon}</span>
              {item.label === 'Messages' && hasUnread && (
                <span style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, background: '#e53e3e', borderRadius: '50%', display: 'inline-block' }}></span>
              )}
              <span>{item.label}</span>
            </div>
          ))}
          {/* Display Users tab for Admin3 only */}
          {!isTeacher && authUser?.role === 'Admin3' && (
            <div
              className={`menu-item${location.pathname === '/admin-users' ? ' active' : ''}`}
              onClick={() => navigate('/admin-users')}
              style={{ position: 'relative' }}
            >
              <span className="icon"><FaUserGraduate /></span>
              <span className="label">Display Users</span>
            </div>
          )}
          {!isTeacher && showSeeMore && !expandedMenu && (
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
              {isTeacher && (
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  marginLeft: 8,
                  background: teacherStatus === 'approved' ? '#22bb33' : '#e53e3e',
                  border: '1.5px solid #fff',
                  boxShadow: '0 1px 4px rgba(32,64,128,0.10)',
                  verticalAlign: 'middle',
                }} title={teacherStatus === 'approved' ? 'Application Approved' : 'Application Pending'} />
              )}
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