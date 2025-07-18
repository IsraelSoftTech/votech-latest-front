import React, { useState } from 'react';
import './AdminTeacher.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaTimes, FaBook, FaMoneyBill, FaFileAlt, FaChartBar, FaPenFancy, FaEdit, FaTrash, FaEnvelope, FaIdCard } from 'react-icons/fa';
import logo from '../assets/logo.png';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt /> },
  { label: 'Students', icon: <FaUserGraduate /> },
  { label: 'Teachers', icon: <FaChalkboardTeacher /> },
  { label: 'Classes', icon: <FaBook /> },
  { label: 'Messages', icon: <FaEnvelope /> },
  { label: 'ID Cards', icon: <FaIdCard /> },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill /> },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy /> },
];

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

const teachers = [
  { name: 'Jane Doe', sex: 'F', id: 'T12345', contact: '678900001' },
  { name: 'John Smith', sex: 'M', id: 'T54321', contact: '678900002' },
  { name: 'Mary Johnson', sex: 'F', id: 'T11111', contact: '678900003' },
  { name: 'James Brown', sex: 'M', id: 'T22222', contact: '678900004' },
  { name: 'Patricia Miller', sex: 'F', id: 'T33333', contact: '678900005' },
  { name: 'Robert Wilson', sex: 'M', id: 'T44444', contact: '678900006' },
  { name: 'Linda Moore', sex: 'F', id: 'T55555', contact: '678900007' },
  { name: 'Michael Taylor', sex: 'M', id: 'T66666', contact: '678900008' },
  { name: 'Barbara Anderson', sex: 'F', id: 'T77777', contact: '678900009' },
  { name: 'William Thomas', sex: 'M', id: 'T88888', contact: '678900010' },
  { name: 'Elizabeth Jackson', sex: 'F', id: 'T99999', contact: '678900011' },
  { name: 'David White', sex: 'M', id: 'T10101', contact: '678900012' },
  { name: 'Susan Harris', sex: 'F', id: 'T20202', contact: '678900013' },
  { name: 'Richard Martin', sex: 'M', id: 'T30303', contact: '678900014' },
  { name: 'Jessica Thompson', sex: 'F', id: 'T40404', contact: '678900015' },
];

function AdminTeacher() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    sex: '',
    idCard: '',
    dob: '',
    pob: '',
    subjects: '',
    classes: '',
    contact: ''
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleRegister = e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    setTimeout(() => {
      setRegistering(false);
      setSuccess('Teacher registered!');
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setForm({ fullName: '', sex: '', idCard: '', dob: '', pob: '', subjects: '', classes: '', contact: '' });
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
            if (item.label === 'Dashboard' && window.location.pathname === '/admin') isActive = true;
            if (item.label === 'Students' && window.location.pathname === '/admin-student') isActive = true;
            if (item.label === 'Teachers' && window.location.pathname === '/admin-teacher') isActive = true;
            if (item.label === 'Classes' && window.location.pathname === '/admin-class') isActive = true;
            if (item.label === 'Finances' && window.location.pathname === '/admin-finance') isActive = true;
            return (
              <div
                className={`menu-item${isActive ? ' active' : ''}`}
                key={item.label}
                onClick={() => {
                  if (item.label === 'Dashboard') navigate('/admin');
                  else if (item.label === 'Students') navigate('/admin-student');
                  else if (item.label === 'Teachers') navigate('/admin-teacher');
                  else if (item.label === 'Classes') navigate('/admin-class');
                  else if (item.label === 'Finances') navigate('/admin-finance');
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
          </div>
          <div className="admin-actions">
            <span className="icon notification"><span className="badge">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg></span>
            <span className="icon message"><span className="badge orange">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span className="admin-name">Admin1</span>
          </div>
        </header>
        <div className="dashboard-cards">
          <div className="card teachers">
            <div className="icon"><FaChalkboardTeacher /></div>
            <div className="count">{teachers.length}</div>
            <div className="desc">Total Teachers</div>
          </div>
          <div className="card discipline">
            <div className="icon"><FaClipboardList /></div>
            <div className="count">3</div>
            <div className="desc">Discipline Cases</div>
          </div>
        </div>
        <div className="teacher-section">
          <div className="teacher-header-row">
            <button className="add-teacher-btn" onClick={() => setShowModal(true)}><FaPlus /> Add Teacher</button>
          </div>
          <div className="teacher-table-wrapper" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Sex</th>
                  <th>ID Card number</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={i}>
                    <td>{t.name}</td>
                    <td>{t.sex}</td>
                    <td>{t.id}</td>
                    <td>{t.contact}</td>
                    <td className="actions">
                      <button className="action-btn edit"><FaPlus style={{visibility:'hidden'}} /><FaBars style={{visibility:'hidden'}} /><FaTimes style={{visibility:'hidden'}} /><FaUserGraduate style={{visibility:'hidden'}} /><FaChalkboardTeacher style={{visibility:'hidden'}} /><FaClipboardList style={{visibility:'hidden'}} /><FaTachometerAlt style={{visibility:'hidden'}} /><FaSignOutAlt style={{visibility:'hidden'}} /><FaEdit /></button>
                      <button className="action-btn delete"><FaTrash /></button>
                    </td>
                  </tr>
                ))}
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
              <h2 className="form-title">Register Teacher</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Full Name *</label>
                  <input className="input-field" type="text" name="fullName" value={form.fullName} onChange={handleFormChange} placeholder="Enter Full Name" required />
                  <label className="input-label">Sex *</label>
                  <select className="input-field" name="sex" value={form.sex} onChange={handleFormChange} required>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  <label className="input-label">ID Card Number *</label>
                  <input className="input-field" type="text" name="idCard" value={form.idCard} onChange={handleFormChange} placeholder="Enter ID Card Number" required />
                  <label className="input-label">Date of Birth *</label>
                  <input className="input-field" type="date" name="dob" value={form.dob} onChange={handleFormChange} required />
                </div>
                <div>
                  <label className="input-label">Place of Birth *</label>
                  <input className="input-field" type="text" name="pob" value={form.pob} onChange={handleFormChange} placeholder="Enter Place of Birth" required />
                  <label className="input-label">Subject(s) *</label>
                  <input className="input-field" type="text" name="subjects" value={form.subjects} onChange={handleFormChange} placeholder="Enter Subject(s)" required />
                  <label className="input-label">Class(s) Taught *</label>
                  <input className="input-field" type="text" name="classes" value={form.classes} onChange={handleFormChange} placeholder="Enter Class(s) Taught" required />
                  <label className="input-label">Contact *</label>
                  <input className="input-field" type="text" name="contact" value={form.contact} onChange={handleFormChange} placeholder="Enter Contact" required />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              <button type="submit" className="signup-btn" disabled={registering}>{registering ? 'Registering...' : 'Register'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTeacher; 