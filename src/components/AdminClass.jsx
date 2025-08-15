import React, { useState, useEffect } from 'react';
import './AdminClass.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaTimes, FaBook, FaEdit, FaTrash, FaChevronDown, FaMoneyBill, FaChevronRight, FaEnvelope, FaIdCard } from 'react-icons/fa';
import logo from '../assets/logo.png';
import ReactDOM from 'react-dom';
import { FaCog } from 'react-icons/fa';

import Finance from './Finance.jsx';
import Specialty from './Specialty.jsx';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import SideTop from './SideTop';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Staff', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
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

export default function AdminClass() {
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin1 = authUser?.role === 'Admin1';

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
      setSuccess('success');
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

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  const askDelete = (c) => {
    if (isAdmin1) return;
    setDeleteId(c.id);
    setDeleteTargetName(typeof c.name === 'string' ? c.name : 'this class');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.deleteClass(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setDeleteTargetName('');
      await fetchClasses();
    } catch (e) {
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SideTop>
      {/* Place the main content of AdminClass here, excluding sidebar/topbar */}
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
          <button className="add-class-btn" onClick={() => setShowModal(true)} disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Create Class'}><FaPlus /> Create Class</button>
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
                    <td>{typeof c.name === 'string' ? c.name : 'Unknown Class'}</td>
                    <td>{c.registration_fee}</td>
                    <td>{c.bus_fee}</td>
                    <td>{c.internship_fee}</td>
                    <td>{c.remedial_fee}</td>
                    <td>{c.tuition_fee}</td>
                    <td>{c.pta_fee}</td>
                    <td>{c.total_fee}</td>
                    <td className="actions">
                      <button className="action-btn edit" title={isAdmin1 ? 'Not allowed for Admin1' : 'Edit'} onClick={() => handleEdit(c)} disabled={isAdmin1}><FaEdit /></button>
                      <button className="action-btn delete" title={isAdmin1 ? 'Not allowed for Admin1' : 'Delete'} onClick={() => askDelete(c)} disabled={isAdmin1}><FaTrash /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            <form className="student-modal-form" onSubmit={handleRegister}>
              <h2 className="form-title">Create Class</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Name of Class *</label>
                  <input className="input-field" type="text" name="name" value={typeof form.name === 'string' ? form.name : ''} onChange={handleFormChange} placeholder="Enter Class Name" required />
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
              <button type="submit" className="signup-btn" disabled={registering || isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : (editId ? 'Update' : 'Create')}>{registering ? (editId ? 'Updating...' : 'Creating...') : (editId ? 'Update' : 'Create')}</button>
            </form>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete {deleteTargetName}?</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>Cancel</button>
              <button className="modal-btn confirm" onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 