import React, { useState } from 'react';
import './AdminClass.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaTimes, FaBook, FaEdit, FaTrash, FaChevronDown, FaMoneyBill, FaChevronRight } from 'react-icons/fa';
import logo from '../assets/logo.png';
import Programs from './Programs.jsx';
import Finance from './Finance.jsx';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaClipboardList /> },
  { label: 'Exam/Marks', icon: <FaClipboardList /> },
  { label: 'Lesson Plans', icon: <FaClipboardList /> },
];

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

const subjects = Array.from({length: 15}, (_, i) => `Subject ${i+1}`);

const classes = [
  { name: 'Form 1', fee: '100,000' },
  { name: 'Form 2', fee: '110,000' },
  { name: 'Form 3', fee: '120,000' },
  { name: 'Form 4', fee: '130,000' },
  { name: 'Form 5', fee: '140,000' },
  { name: 'Lower Sixth', fee: '150,000' },
  { name: 'Upper Sixth', fee: '160,000' },
  { name: 'Science 1', fee: '170,000' },
  { name: 'Science 2', fee: '180,000' },
  { name: 'Commercial', fee: '190,000' },
];

function AdminClass() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    className: '',
    subjects: [],
    fee: ''
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
  const [showProgramsDropdown, setShowProgramsDropdown] = useState(false);
  const [showPrograms, setShowPrograms] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const navigate = useNavigate();

  // For closing dropdown on outside click
  React.useEffect(() => {
    if (!subjectsDropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('.subjects-dropdown')) {
        setSubjectsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [subjectsDropdownOpen]);

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'subjects') {
      setForm(f => ({
        ...f,
        subjects: checked ? [...f.subjects, value] : f.subjects.filter(s => s !== value)
      }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleRegister = e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    setTimeout(() => {
      setRegistering(false);
      setSuccess('Class created!');
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setForm({ className: '', subjects: [], fee: '' });
      }, 1200);
    }, 1200);
  };

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
            if (item.path && window.location.pathname === item.path) isActive = true;
            // Classes menu with always-visible React dropdown icon and perfect alignment
            if (item.label === 'Classes') {
              return [
                <div
                  key={item.label}
                  className={`menu-item${isActive ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); setShowProgramsDropdown(v => !v); }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 24px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 12 }}>
                    <span className="icon">{item.icon}</span>
                    <span className="label">{item.label}</span>
                  </span>
                  <span className="dropdown-icon" style={{ color: '#F59E0B', marginLeft: 8 }}>
                    {showProgramsDropdown ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                </div>,
                showProgramsDropdown && (
                  <div
                    key="Programs"
                    className={`menu-item submenu-item-programs${showPrograms ? ' active' : ''}`}
                    style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}
                    onClick={e => { e.stopPropagation(); setShowPrograms(true); setShowProgramsDropdown(false); }}
                  >
                    <span className="icon"><FaClipboardList /></span>
                    <span className="label">Programs</span>
                  </div>
                )
              ];
            }
            // Finances menu with always-visible React dropdown icon and perfect alignment
            if (item.label === 'Finances') {
              return (
                <div
                  className={`menu-item${isActive ? ' active' : ''}`}
                  key={item.label}
                  onClick={() => {
                    if (item.path) navigate(item.path);
                  }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 24px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 12 }}>
                    <span className="icon">{item.icon}</span>
                    <span className="label">{item.label}</span>
                  </span>
                  <span className="dropdown-icon" style={{ color: '#F59E0B', marginLeft: 8 }}>
                    <FaChevronRight />
                  </span>
                </div>
              );
            }
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
        {showFinance ? (
          <Finance />
        ) : showPrograms ? (
          <Programs onBack={() => setShowPrograms(false)} />
        ) : (
          <>
            <div className="dashboard-cards">
              <div className="card classes">
                <div className="icon"><FaBook /></div>
                <div className="count">{classes.length}</div>
                <div className="desc">Total Classes</div>
              </div>
              <div className="card suspended">
                <div className="icon"><FaClipboardList /></div>
                <div className="count">2</div>
                <div className="desc">Suspended Classes</div>
              </div>
            </div>
            <div className="class-section">
              <div className="class-header-row">
                <button className="add-class-btn" onClick={() => setShowModal(true)}><FaPlus /> Create Class</button>
              </div>
              <div className="class-table-wrapper" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                <table className="class-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Total Fee</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td>{c.fee}</td>
                        <td className="actions">
                          <button className="action-btn edit"><FaEdit /></button>
                          <button className="action-btn delete"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            <form className="student-modal-form" onSubmit={handleRegister}>
              <h2 className="form-title">Create Class</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Name of Class *</label>
                  <input className="input-field" type="text" name="className" value={form.className} onChange={handleFormChange} placeholder="Enter Class Name" required />
                  <label className="input-label">Subjects *</label>
                  <div className="subjects-dropdown" style={{ position: 'relative', marginBottom: 16 }}>
                    <div
                      className="input-field"
                      style={{ cursor: 'pointer', minHeight: 44, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}
                      onClick={() => setSubjectsDropdownOpen(v => !v)}
                      tabIndex={0}
                    >
                      {form.subjects.length === 0 ? (
                        <span style={{ color: '#888' }}>Select subjects</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {form.subjects.map(subj => (
                            <span key={subj} style={{ background: '#eaf3ff', color: '#204080', borderRadius: 4, padding: '2px 8px', fontSize: 13 }}>{subj}</span>
                          ))}
                        </div>
                      )}
                      <span style={{ marginLeft: 'auto', color: '#888', fontSize: 18, pointerEvents: 'none' }}>▼</span>
                    </div>
                    {subjectsDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        zIndex: 10,
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        boxShadow: '0 2px 8px rgba(32,64,128,0.08)',
                        minWidth: 220,
                        maxHeight: 220,
                        overflowY: 'auto',
                        padding: 10
                      }}>
                        {subjects.map((subj, i) => (
                          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#204080', fontWeight: 500, marginBottom: 4, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              name="subjects"
                              value={subj}
                              checked={form.subjects.includes(subj)}
                              onChange={handleFormChange}
                              style={{ accentColor: '#204080' }}
                            />
                            {subj}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="input-label">Total Fee *</label>
                  <input className="input-field" type="text" name="fee" value={form.fee} onChange={handleFormChange} placeholder="Enter Total Fee" required />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              <button type="submit" className="signup-btn" disabled={registering}>{registering ? 'Creating...' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClass; 