import React, { useState, useEffect } from 'react';
import './AdminTeacher.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaClipboardList, FaTachometerAlt, FaSignOutAlt, FaPlus, FaTimes, FaBook, FaMoneyBill, FaFileAlt, FaChartBar, FaPenFancy, FaEdit, FaTrash, FaEnvelope, FaIdCard, FaCog, FaSpinner, FaEye } from 'react-icons/fa';
import logo from '../assets/logo.png';
import SuccessMessage from './SuccessMessage';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import SideTop from './SideTop';
import api from '../services/api';

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

export default function AdminTeacher() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    sex: '',
    id_card: '',
    dob: '',
    pob: '',
    subjects: '',
    classes: '',
    contact: ''
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin1 = authUser?.role === 'Admin1';
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showSubjectsDropdown, setShowSubjectsDropdown] = useState(false);
  const [showClassesDropdown, setShowClassesDropdown] = useState(false);
  const [approveStates, setApproveStates] = useState({});
  const [approveLoading, setApproveLoading] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const canApprove = authUser?.role === 'Admin3';
  const [disapproveId, setDisapproveId] = useState(null);
  const [disapproveLoading, setDisapproveLoading] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Fetch teachers from backend
  useEffect(() => {
    fetchTeachers();
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    // Sync approveStates with teachers list (local only)
    setApproveStates(Object.fromEntries(teachers.map(t => [t.id, t.status])));
  }, [teachers]);

  const fetchTeachers = async () => {
    try {
      const res = await api.getAllTeachers();
      setTeachers(res);
    } catch (err) {
      setError('Failed to fetch teachers');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.getClasses();
      setClasses(res);
    } catch (err) {}
  };
  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      setSubjects(res);
    } catch (err) {}
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'classes') {
      setForm(f => {
        const arr = Array.isArray(f.classes) ? f.classes : (f.classes ? f.classes.split(',') : []);
        return {
          ...f,
          classes: checked ? [...arr, value] : arr.filter(c => c !== value)
        };
      });
    } else if (name === 'subjects') {
      setForm(f => {
        const arr = Array.isArray(f.subjects) ? f.subjects : (f.subjects ? f.subjects.split(',') : []);
        return {
          ...f,
          subjects: checked ? [...arr, value] : arr.filter(s => s !== value)
        };
      });
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    try {
      const submitForm = {
        ...form,
        classes: Array.isArray(form.classes) ? form.classes.join(',') : form.classes,
        subjects: Array.isArray(form.subjects) ? form.subjects.join(',') : form.subjects
      };
      if (editingId) {
        await api.updateTeacher(editingId, submitForm);
        setSuccess('Teacher updated!');
      } else {
        await api.addTeacher(submitForm);
        setSuccess('Teacher registered!');
      }
      setShowModal(false);
      setForm({ full_name: '', sex: '', id_card: '', dob: '', pob: '', subjects: '', classes: '', contact: '' });
      setEditingId(null);
      fetchTeachers();
    } catch (err) {
      setError('Failed to save teacher');
    }
    setRegistering(false);
    setTimeout(() => setSuccess(''), 1200);
  };

  const handleEdit = t => {
    setForm({ ...t });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleDelete = async id => {
    setDeleteId(id);
  };
  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteTeacher(deleteId);
      setDeleteId(null);
      fetchTeachers();
    } catch (err) {
      setError('Failed to delete teacher');
    }
    setDeleteLoading(false);
  };
  const cancelDelete = () => {
    setDeleteId(null);
  };

  const handleToggleApprove = id => {
    setApproveStates(prev => ({
      ...prev,
      [id]: prev[id] === 'approved' ? 'pending' : 'approved'
    }));
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCertificate(null);
  };

  return (
    <SideTop>
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
          {/* Removed Add Teacher button */}
        </div>
        <div className="teacher-table-wrapper" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Sex</th>
                <th>ID Card number</th>
                <th>Date of Birth</th>
                <th>Place of Birth</th>
                <th>Subject(s)</th>
                <th>Class(es) Taught</th>
                <th>Contact</th>
                <th>Certificate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.id || i}>
                  <td>{t.full_name}</td>
                  <td>{t.sex}</td>
                  <td>{t.id_card}</td>
                  <td>{t.dob ? new Date(t.dob).toLocaleDateString() : ''}</td>
                  <td>{t.pob}</td>
                  <td>{t.subjects}</td>
                  <td>{t.classes ? t.classes.split(',').filter(c => c.trim() !== 'undefined').join(', ') : ''}</td>
                  <td>{t.contact}</td>
                  <td>
                    {t.certificate_url ? (
                      <button className="action-btn view-certificate" title="View Certificate" onClick={() => handleViewCertificate(t)}><FaEye /></button>
                    ) : (
                      <span style={{ color: '#999', fontSize: '12px' }}>No certificate</span>
                    )}
                  </td>
                  <td className="actions">
                    <div className="action-buttons-container">
                      <button className="action-btn edit" disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Edit'} onClick={() => handleEdit(t)}><FaEdit /></button>
                      <button className="action-btn delete" disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Delete'} onClick={() => handleDelete(t.id)}><FaTrash /></button>
                      <span
                        className="approve-badge"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: t.status === 'approved' ? '#22bb33' : '#e53e3e',
                          color: '#fff',
                          fontWeight: 500,
                          fontSize: '0.85rem',
                          cursor: approveLoading[t.id] || !canApprove ? 'not-allowed' : 'pointer',
                          opacity: approveLoading[t.id] || !canApprove ? 0.6 : 1,
                          transition: 'background 0.18s',
                          userSelect: 'none',
                          border: 'none',
                          outline: 'none',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                        title={canApprove ? '' : 'Only Admin3 can approve'}
                        onClick={async () => {
                          if (!canApprove) {
                            setError('Only Admin3 can approve teachers.');
                            return;
                          }
                          if (approveLoading[t.id]) return;
                          if (t.status === 'approved') {
                            setDisapproveId(t.id);
                            return;
                          }
                          setApproveLoading(prev => ({ ...prev, [t.id]: true }));
                          setError('');
                          try {
                            await api.approveTeacher(t.id, 'approved');
                            setSuccess('Approved!');
                            window.dispatchEvent(new Event('teacher-status-updated'));
                            fetchTeachers();
                          } catch (err) {
                            setError('Failed to update status');
                          }
                          setApproveLoading(prev => ({ ...prev, [t.id]: false }));
                        }}
                      >
                        {approveLoading[t.id] ? <FaSpinner className="fa-spin" style={{ marginRight: 4 }} /> : null}
                        {t.status === 'approved' ? 'Approved' : 'Approve'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            <form className="student-modal-form" onSubmit={handleRegister}>
              <h2 className="form-title">Edit Teacher</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Full Name *</label>
                  <input className="input-field" type="text" name="full_name" value={form.full_name} onChange={handleFormChange} placeholder="Enter Full Name" required />
                  <label className="input-label">Sex *</label>
                  <select className="input-field" name="sex" value={form.sex} onChange={handleFormChange} required>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  <label className="input-label">ID Card Number *</label>
                  <input className="input-field" type="text" name="id_card" value={form.id_card} onChange={handleFormChange} placeholder="Enter ID Card Number" required />
                  <label className="input-label">Date of Birth *</label>
                  <input className="input-field" type="date" name="dob" value={form.dob ? form.dob.slice(0,10) : ''} onChange={handleFormChange} required />
                </div>
                <div>
                  <label className="input-label">Place of Birth *</label>
                  <input className="input-field" type="text" name="pob" value={form.pob} onChange={handleFormChange} placeholder="Enter Place of Birth" required />
                  <label className="input-label">Subject(s) *</label>
                  <div className="dropdown-multiselect" style={{ position: 'relative' }}>
                    <div className="dropdown-input" style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        className="input-field"
                        type="text"
                        name="subjects"
                        value={Array.isArray(form.subjects) ? form.subjects.join(', ') : (form.subjects || '')}
                        readOnly
                        placeholder="Select Subject(s)"
                        onClick={() => setShowSubjectsDropdown(v => !v)}
                        style={{ cursor: 'pointer', background: '#f7f8fa' }}
                      />
                      <button type="button" style={{ marginLeft: 6 }} onClick={() => setShowSubjectsDropdown(v => !v)} tabIndex={-1}>▼</button>
                    </div>
                    {showSubjectsDropdown && (
                      <div className="dropdown-list" style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 2px 8px rgba(32,64,128,0.07)', padding: 8, minWidth: 180, maxHeight: 180, overflowY: 'auto' }}>
                        {subjects.map(s => (
                          <label key={s.id} style={{ display: 'block', marginBottom: 4 }}>
                            <input type="checkbox" name="subjects" value={s.name} checked={Array.isArray(form.subjects) ? form.subjects.includes(s.name) : (form.subjects || '').split(',').includes(s.name)} onChange={handleFormChange} /> {s.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="input-label">Class(es) Taught *</label>
                  <div className="dropdown-multiselect" style={{ position: 'relative' }}>
                    <div className="dropdown-input" style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        className="input-field"
                        type="text"
                        name="classes"
                        value={Array.isArray(form.classes) ? form.classes.join(', ') : (form.classes || '')}
                        readOnly
                        placeholder="Select Class(es)"
                        onClick={() => setShowClassesDropdown(v => !v)}
                        style={{ cursor: 'pointer', background: '#f7f8fa' }}
                      />
                      <button type="button" style={{ marginLeft: 6 }} onClick={() => setShowClassesDropdown(v => !v)} tabIndex={-1}>▼</button>
                    </div>
                    {showClassesDropdown && (
                      <div className="dropdown-list" style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 2px 8px rgba(32,64,128,0.07)', padding: 8, minWidth: 180, maxHeight: 180, overflowY: 'auto' }}>
                        {classes.map(c => (
                          <label key={c.id} style={{ display: 'block', marginBottom: 4 }}>
                            <input type="checkbox" name="classes" value={c.name} checked={Array.isArray(form.classes) ? form.classes.includes(c.name) : (form.classes || '').split(',').includes(c.name)} onChange={handleFormChange} /> {c.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="input-label">Contact *</label>
                  <input className="input-field" type="text" name="contact" value={form.contact} onChange={handleFormChange} placeholder="Enter Contact" required />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <SuccessMessage message={success} />}
              <button type="submit" className="signup-btn" disabled={registering || isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : (editingId ? 'Update' : 'Register')}>{registering ? (editingId ? 'Updating...' : 'Registering...') : (editingId ? 'Update' : 'Register')}</button>
            </form>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={cancelDelete}><FaTimes /></button>
            <div style={{ padding: '18px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 18 }}>Are you sure you want to delete this teacher?</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
                <button className="signup-btn" style={{ background: '#e53e3e', minWidth: 90 }} onClick={confirmDelete} disabled={deleteLoading}>
                  {deleteLoading ? <FaSpinner className="fa-spin" style={{ marginRight: 6 }} /> : null} Delete
                </button>
                <button className="signup-btn" style={{ background: '#204080', minWidth: 90 }} onClick={cancelDelete} disabled={deleteLoading}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {disapproveId && (
        <div className="modal-overlay" onClick={() => setDisapproveId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDisapproveId(null)}><FaTimes /></button>
            <div style={{ padding: '18px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 18 }}>Do you want to disapprove?</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
                <button className="signup-btn" style={{ background: '#e53e3e', minWidth: 90 }}
                  onClick={async () => {
                    setDisapproveLoading(true);
                    setError('');
                    try {
                      await api.approveTeacher(disapproveId, 'pending');
                      setSuccess('Disapproved!');
                      setDisapproveId(null);
                      window.dispatchEvent(new Event('teacher-status-updated'));
                      fetchTeachers();
                    } catch (err) {
                      setError('Failed to update status');
                    }
                    setDisapproveLoading(false);
                  }}
                  disabled={disapproveLoading}
                >
                  {disapproveLoading ? <FaSpinner className="fa-spin" style={{ marginRight: 6 }} /> : null} Yes
                </button>
                <button className="signup-btn" style={{ background: '#204080', minWidth: 90 }} onClick={() => setDisapproveId(null)} disabled={disapproveLoading}>No</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCertificateModal && selectedCertificate && (
        <div className="modal-overlay" onClick={closeCertificateModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto', height: 'auto' }}>
            <button className="modal-close" onClick={closeCertificateModal}><FaTimes /></button>
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <h3 style={{ color: '#204080', marginBottom: 16, fontSize: 20 }}>
                Certificate - {selectedCertificate.full_name}
              </h3>
              <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#f8f9fa', minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {selectedCertificate.certificate_url ? (
                  (() => {
                    const fileExtension = selectedCertificate.certificate_url.split('.').pop()?.toLowerCase();
                    const certificateUrl = selectedCertificate.certificate_url.startsWith('http') 
                      ? selectedCertificate.certificate_url 
                      : `http://localhost:5000${selectedCertificate.certificate_url}`;
                    
                    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                      // Display image
                      return (
                        <img 
                          src={certificateUrl}
                          alt="Certificate"
                          style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      );
                    } else if (fileExtension === 'pdf') {
                      // Display PDF
                      return (
                        <iframe
                          src={certificateUrl}
                          title="Certificate PDF"
                          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 4 }}
                        />
                      );
                    } else {
                      // Fallback for unknown file types
                      return (
                        <div style={{ padding: 20, textAlign: 'center' }}>
                          <FaFileAlt style={{ fontSize: 48, color: '#666', marginBottom: 16 }} />
                          <p style={{ color: '#666', marginBottom: 16 }}>
                            Certificate file: {selectedCertificate.certificate_url.split('/').pop()}
                          </p>
                          <a 
                            href={certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-block', padding: '10px 20px', background: '#204080', color: '#fff', textDecoration: 'none', borderRadius: 4, fontWeight: 500, transition: 'background 0.18s' }}
                          >
                            Download Certificate
                          </a>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <FaFileAlt style={{ fontSize: 48, color: '#666', marginBottom: 16 }} />
                    <p style={{ color: '#666' }}>No certificate available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 