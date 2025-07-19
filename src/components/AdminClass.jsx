import React, { useState, useEffect } from 'react';
import './AdminClass.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaTimes, FaBook, FaEdit, FaTrash, FaChevronDown, FaMoneyBill, FaChevronRight, FaEnvelope, FaIdCard } from 'react-icons/fa';
import logo from '../assets/logo.png';

import Finance from './Finance.jsx';
import Specialty from './Specialty.jsx';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
  { label: 'ID Cards', icon: <FaIdCard />, path: '/admin-idcards' },
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
  const [classes, setClasses] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    registration_fee: '',
    bus_fee: '',
    internship_fee: '',
    remedial_fee: '',
    tuition_fee: '',
    pta_fee: '',
    total_fee: ''
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
  const [showClass, setShowClass] = useState(true); // default to class management
  const [showSpecialty, setShowSpecialty] = useState(false);
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

  // Fetch classes on mount
  useEffect(() => { fetchClasses(); }, []);
  async function fetchClasses() {
    const data = await api.getClasses();
    setClasses(data);
  }

  // Auto-sum total_fee when any fee field changes
  useEffect(() => {
    const sum = [
      form.registration_fee,
      form.bus_fee,
      form.internship_fee,
      form.remedial_fee,
      form.tuition_fee,
      form.pta_fee
    ].map(f => parseInt(f || 0, 10)).reduce((a, b) => a + b, 0);
    setForm(f => ({ ...f, total_fee: sum ? sum.toString() : '' }));
  }, [form.registration_fee, form.bus_fee, form.internship_fee, form.remedial_fee, form.tuition_fee, form.pta_fee]);

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

  // Handle create/edit
  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    try {
      if (editId) {
        await api.updateClass(editId, form);
      } else {
        await api.createClass(form);
      }
      setRegistering(false);
      setSuccess(editId ? 'Class updated!' : 'Class created!');
      fetchClasses();
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setForm({ name: '', registration_fee: '', bus_fee: '', internship_fee: '', remedial_fee: '', tuition_fee: '', pta_fee: '', total_fee: '' });
        setEditId(null);
      }, 1200);
    } catch (err) {
      setError('Failed to save class.');
      setRegistering(false);
    }
  };

  // Handle edit
  const handleEdit = c => {
    setEditId(c.id);
    setForm({
      name: c.name || '',
      registration_fee: c.registration_fee || '',
      bus_fee: c.bus_fee || '',
      internship_fee: c.internship_fee || '',
      remedial_fee: c.remedial_fee || '',
      tuition_fee: c.tuition_fee || '',
      pta_fee: c.pta_fee || '',
      total_fee: c.total_fee || ''
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async id => {
    await api.deleteClass(id);
    fetchClasses();
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
                  className={`menu-item${(showClass && !showSpecialty) ? ' active' : ''}`}
                  onClick={() => { setShowClass(true); setShowSpecialty(false); }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 24px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 12 }}>
                    <span className="icon">{item.icon}</span>
                    <span className="label">Class</span>
                  </span>
                </div>,
                <div
                  key="Specialty"
                  className={`menu-item${window.location.pathname === '/admin-specialty' ? ' active' : ''}`}
                  style={{ paddingLeft: 44, fontSize: '0.97rem', color: '#F59E0B', background: 'none', cursor: 'pointer', transition: 'all 0.2s', margin: '2px 12px', padding: '8px 20px 8px 44px', display: 'flex', alignItems: 'center', gap: 14 }}
                  onClick={() => { navigate('/admin-specialty'); }}
                >
                  <span className="icon"><FaClipboardList /></span>
                  <span className="label">Specialty</span>
                </div>
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
                  if (item.label === 'ID Cards') navigate('/admin-idcards');
                  else if (item.path) navigate(item.path);
                }}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 24px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 12 }}>
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </span>
                {item.label === 'Messages' && (
                  <span style={{ position: 'absolute', right: 18, top: 16, width: 9, height: 9, background: '#e53e3e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 1px 4px rgba(32,64,128,0.13)' }}></span>
                )}
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
            {/* Removed year-select */}
          </div>
          <div className="admin-actions">
            <span className="icon notification"><span className="badge">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg></span>
            <span className="icon message"><span className="badge orange">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span className="admin-name">Admin1</span>
          </div>
        </header>
        <div className="dashboard-cards">
          <div className="card classes">
            <div className="icon"><FaBook /></div>
            <div className="count">{classes.length}</div>
            <div className="desc">Total Classes</div>
          </div>
          <div className="card suspended">
            <div className="icon"><FaClipboardList /></div>
            <div className="count">{classes.filter(c => c.suspended).length}</div>
            <div className="desc">Suspended Classes</div>
          </div>
        </div>
        <div className="class-section">
          <div className="class-header-row">
            <button className="add-class-btn" onClick={() => setShowModal(true)}><FaPlus /> Create Class</button>
          </div>
          <div className="class-table-wrapper">
            <table className="class-table">
              <thead>
                <tr>
                  <th>Class name</th>
                  <th>Registration fee (XAF)</th>
                  <th>Bus fee (XAF)</th>
                  <th>Internship fee (XAF)</th>
                  <th>Remedial classes fee (XAF)</th>
                  <th>Tuition fee (XAF)</th>
                  <th>PTA fee (XAF)</th>
                  <th>Total fee (XAF)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center' }}>No classes found.</td></tr>
                ) : (
                  classes.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.registration_fee}</td>
                      <td>{c.bus_fee}</td>
                      <td>{c.internship_fee}</td>
                      <td>{c.remedial_fee}</td>
                      <td>{c.tuition_fee}</td>
                      <td>{c.pta_fee}</td>
                      <td>{c.total_fee}</td>
                      <td className="actions">
                        <button className="action-btn edit" title="Edit" onClick={() => handleEdit(c)}><FaEdit /></button>
                        <button className="action-btn delete" title="Delete" onClick={() => handleDelete(c.id)}><FaTrash /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                  <input className="input-field" type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter Class Name" required />
                  <label className="input-label">Registration Fee (XAF)</label>
                  <input className="input-field" type="number" name="registration_fee" value={form.registration_fee} onChange={handleFormChange} />
                  <label className="input-label">Bus Fee (XAF)</label>
                  <input className="input-field" type="number" name="bus_fee" value={form.bus_fee} onChange={handleFormChange} />
                  <label className="input-label">Internship Fee (XAF)</label>
                  <input className="input-field" type="number" name="internship_fee" value={form.internship_fee} onChange={handleFormChange} />
                  <label className="input-label">Remedial Classes Fee (XAF)</label>
                  <input className="input-field" type="number" name="remedial_fee" value={form.remedial_fee} onChange={handleFormChange} />
                  <label className="input-label">Tuition Fee (XAF)</label>
                  <input className="input-field" type="number" name="tuition_fee" value={form.tuition_fee} onChange={handleFormChange} />
                  <label className="input-label">PTA Fee (XAF)</label>
                  <input className="input-field" type="number" name="pta_fee" value={form.pta_fee} onChange={handleFormChange} />
                  <label className="input-label">Total Fee (XAF)</label>
                  <input className="input-field" type="number" name="total_fee" value={form.total_fee} readOnly />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <SuccessMessage message={success} />}
              <button type="submit" className="signup-btn" disabled={registering}>{registering ? 'Creating...' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClass; 