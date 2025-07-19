import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaBook, FaChevronRight, FaMoneyBill } from 'react-icons/fa';
import logo from '../assets/logo.png';
import './AdminClass.css';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';

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

export default function Specialty({ isActiveSpecialty, onBack }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [specialties, setSpecialties] = useState([]); // Start empty
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', abbreviation: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);

  // Fetch specialties and classes on mount
  useEffect(() => {
    fetchClasses();
    fetchSpecialties();
  }, []);
  async function fetchSpecialties() {
    const data = await api.getSpecialties();
    setSpecialties(data);
  }
  async function fetchClasses() {
    const data = await api.getClasses();
    setClasses(data);
  }

  // On edit, fetch classes and set checked
  const handleEdit = async (s) => {
    setEditId(s.id);
    setForm({ name: s.name, abbreviation: s.abbreviation });
    await fetchClasses();
    // Fetch assigned classes from backend
    const assigned = await api.getClassesForSpecialty(s.id);
    setAssignedClasses(assigned.map(id => Number(id)));
    setShowModal(true);
  };

  // Add assignedClasses state
  const [assignedClasses, setAssignedClasses] = useState([]);

  const handleDelete = async (id) => {
    await api.deleteSpecialty(id);
    fetchSpecialties();
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // On submit, handle create or update
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Name is required.'); return; }
    try {
      if (editId) {
        await api.updateSpecialty(editId, form);
        await api.assignClassesToSpecialty(editId, assignedClasses.map(id => Number(id)));
      } else {
        await api.createSpecialty(form);
      }
      setShowModal(false);
      setEditId(null);
      setForm({ name: '', abbreviation: '' });
      setAssignedClasses([]);
      await fetchSpecialties(); // Always refresh after save
      setSuccess('Specialty saved!');
      setTimeout(() => setSuccess(''), 1200);
    } catch (err) {
      setError('Failed to save.');
    }
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
            if (item.label === 'Classes') {
              return [
                <div
                  key={item.label}
                  className={`menu-item`}
                  onClick={() => { navigate('/admin-class'); }}
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
                  onClick={() => {}} // Already on Specialty
                >
                  <span className="icon"><FaClipboardList /></span>
                  <span className="label">Specialty</span>
                </div>
              ];
            }
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
        {/* Full specialty and class assignment UI and logic restored here */}
        <div className="programs-section" style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <h2 style={{ margin: 0, flex: 1 }}>Specialties</h2>
            <button className="add-class-btn" onClick={() => { setShowModal(true); setEditId(null); setForm({ name: '', abbreviation: '' }); }}><FaPlus /> Add Specialty</button>
          </div>
          <div className="dashboard-cards" style={{ marginBottom: 24 }}>
            <div className="card classes" style={{ minWidth: 200, flex: 1 }}>
              <div className="icon"><FaPlus /></div>
              <div className="count">{specialties.length}</div>
              <div className="desc">Total Specialties</div>
            </div>
          </div>
          <div className="class-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="class-table">
              <thead>
                <tr>
                  <th>Specialty Name</th>
                  <th>Abbreviation</th>
                  <th>Classes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {specialties.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.abbreviation}</td>
                    <td>
                      <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                        {classes.filter(c => s.class_ids && s.class_ids.includes(c.id)).map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <input type="checkbox" checked={true} disabled /> {c.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="action-btn edit" onClick={() => handleEdit(s)}><FaEdit /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(s.id)}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
                <form className="student-modal-form" onSubmit={handleSubmit}>
                  <h2 className="form-title">{editId ? 'Edit Specialty' : 'Add Specialty'}</h2>
                  <div className="modal-form-grid">
                    <div>
                      <label className="input-label">Specialty Name *</label>
                      <input className="input-field" type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter Specialty Name" required />
                      <label className="input-label">Abbreviation *</label>
                      <input className="input-field" type="text" name="abbreviation" value={form.abbreviation} onChange={handleFormChange} placeholder="Enter Abbreviation" required />
                    </div>
                    {editId && (
                      <div>
                        <label className="input-label">Assign to Classes</label>
                        <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                          {classes.map(c => (
                            <label key={c.id} style={{ display: 'block', fontWeight: 500, color: '#204080', marginBottom: 4 }}>
                              <input
                                type="checkbox"
                                checked={assignedClasses.includes(c.id)}
                                onChange={e => {
                                  if (e.target.checked) setAssignedClasses(prev => [...prev, c.id]);
                                  else setAssignedClasses(prev => prev.filter(id => id !== c.id));
                                }}
                              /> {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <button type="submit" className="signup-btn">{editId ? 'Update' : 'Save'}</button>
                </form>
              </div>
            </div>
          )}
          {success && <SuccessMessage message={success} />}
        </div>
      </div>
    </div>
  );
} 