import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaBook, FaChevronRight, FaMoneyBill } from 'react-icons/fa';
import logo from '../assets/logo.png';
import './AdminClass.css';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import SideTop from './SideTop';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Staff', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaClipboardList /> },
  { label: 'Exam/Marks', icon: <FaClipboardList /> },
  { label: 'Lesson Plans', icon: <FaClipboardList /> },
];

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

export default function Specialty(props) {
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
  const location = useLocation();

  // Add isAdmin1 logic
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin1 = authUser?.role === 'Admin1';

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
    <SideTop>
      {/* Place the main content of Specialty here, excluding sidebar/topbar */}
      <div className="programs-section" style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, flex: 1 }}>Specialties</h2>
          <button className="add-class-btn" onClick={() => { setShowModal(true); setEditId(null); setForm({ name: '', abbreviation: '' }); }} disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Add Specialty'}><FaPlus /> Add Specialty</button>
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
                  <td>{typeof s.name === 'string' ? s.name : 'Unknown Specialty'}</td>
                  <td>{s.abbreviation}</td>
                  <td>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                      {classes.filter(c => s.class_ids && s.class_ids.includes(c.id)).map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <input type="checkbox" checked={true} disabled /> {typeof c.name === 'string' ? c.name : 'Unknown Class'}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="action-btn edit" onClick={() => handleEdit(s)} disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Edit'}><FaEdit /></button>
                    <button className="action-btn delete" onClick={() => handleDelete(s.id)} disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Delete'}><FaTrash /></button>
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
                    <input className="input-field" type="text" name="name" value={typeof form.name === 'string' ? form.name : ''} onChange={handleFormChange} placeholder="Enter Specialty Name" required />
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
                              disabled={isAdmin1}
                            /> {typeof c.name === 'string' ? c.name : 'Unknown Class'}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="signup-btn" disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : (editId ? 'Update' : 'Save')}>{editId ? 'Update' : 'Save'}</button>
              </form>
            </div>
          </div>
        )}
        {success && <SuccessMessage message={success} />}
      </div>
    </SideTop>
  );
} 