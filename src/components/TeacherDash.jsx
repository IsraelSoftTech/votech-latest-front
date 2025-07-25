import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import './TeacherDash.css';
import { FaBook, FaUserGraduate, FaClipboardList, FaChartBar, FaCheck, FaTimes } from 'react-icons/fa';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';

export default function TeacherDash() {
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Apply');
  const [form, setForm] = useState({
    full_name: '',
    sex: '',
    id_card: '',
    dob: '',
    pob: '',
    subjects: [],
    classes: '', // read-only
    contact: ''
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [teacherRecord, setTeacherRecord] = useState(null);
  const [showSubjectsDropdown, setShowSubjectsDropdown] = useState(false);

  // Fetch subjects and teacher record
  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => setSubjects([]));
    fetchTeacherRecord();
  }, []);

  const fetchTeacherRecord = async () => {
    try {
      const all = await api.getAllTeachers();
      // Find teacher record for this user (by username or full_name)
      const rec = all.find(t => t.contact === authUser?.contact || t.full_name === authUser?.name);
      setTeacherRecord(rec);
      if (rec) {
        setForm({
          full_name: rec.full_name,
          sex: rec.sex,
          id_card: rec.id_card,
          dob: rec.dob,
          pob: rec.pob,
          subjects: rec.subjects ? rec.subjects.split(',') : [],
          classes: rec.classes,
          contact: rec.contact
        });
      }
    } catch {}
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'subjects') {
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
        subjects: Array.isArray(form.subjects) ? form.subjects.join(',') : form.subjects,
        classes: form.classes // not editable here
      };
      await api.submitTeacherApplication(submitForm);
      setSuccess('Application submitted!');
      fetchTeacherRecord();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    }
    setRegistering(false);
    setTimeout(() => setSuccess(''), 1200);
  };

  // Status indicator logic
  let statusColor = '#e53e3e', statusIcon = <FaTimes />, statusTitle = 'Not Approved';
  if (teacherRecord && teacherRecord.status === 'approved') {
    statusColor = '#22bb33';
    statusIcon = <FaCheck />;
    statusTitle = 'Approved';
  }

  return (
    <SideTop>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 18, marginTop: 8 }}>
        <span title={statusTitle} style={{ width: 22, height: 22, borderRadius: '50%', background: statusColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginRight: 10 }}>{statusIcon}</span>
        <span style={{ color: '#204080', fontWeight: 600, fontSize: 16, marginRight: 10 }}>Status</span>
        <button
          style={{ background: 'none', border: 'none', color: '#204080', fontWeight: 600, fontSize: 17, cursor: 'pointer', position: 'relative', padding: '4px 12px', borderRadius: 6 }}
          onClick={() => setUserMenuOpen(v => !v)}
        >
          {/* {username} */}
          Apply
        </button>
      </div>
      {userMenuOpen && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setUserMenuOpen(false)}>
          <div className="modal-content" style={{ minWidth: 340, maxWidth: 420, margin: '80px auto 0 auto' }} onClick={e => e.stopPropagation()}>
            <form className="student-modal-form" onSubmit={handleRegister}>
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
                  <input className="input-field" type="date" name="dob" value={form.dob} onChange={handleFormChange} required />
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
                      <button type="button" style={{ marginLeft: 6, fontSize: '0.7em', padding: '0 4px', height: 22, width: 18, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowSubjectsDropdown(v => !v)} tabIndex={-1}>▼</button>
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
                  <input className="input-field" type="text" name="classes" value={form.classes} readOnly placeholder="Assigned by Admin" style={{ background: '#f7f8fa', color: '#888' }} />
                  <label className="input-label">Contact *</label>
                  <input className="input-field" type="text" name="contact" value={form.contact} onChange={handleFormChange} placeholder="Enter Contact" required />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <SuccessMessage message={success} />}
              <button type="submit" className="signup-btn" disabled={registering}>{registering ? 'Registering...' : 'Register'}</button>
            </form>
          </div>
        </div>
      )}
      <div className="teacher-dashboard-cards">
        <div className="teacher-card teacher-card-classes">
          <div className="teacher-card-icon"><FaBook /></div>
          <div className="teacher-card-title">3</div>
          <div className="teacher-card-desc">My Classes</div>
        </div>
        <div className="teacher-card teacher-card-students">
          <div className="teacher-card-icon"><FaUserGraduate /></div>
          <div className="teacher-card-title">156</div>
          <div className="teacher-card-desc">Total Students</div>
        </div>
        <div className="teacher-card teacher-card-attendance">
          <div className="teacher-card-icon"><FaClipboardList /></div>
          <div className="teacher-card-title">96%</div>
          <div className="teacher-card-desc">Class Attendance</div>
        </div>
        <div className="teacher-card teacher-card-grades">
          <div className="teacher-card-icon"><FaChartBar /></div>
          <div className="teacher-card-title">24</div>
          <div className="teacher-card-desc">Pending Grades</div>
        </div>
      </div>
      <div className="teacher-dashboard-main">
        <div className="teacher-schedule">
          <div className="teacher-section-title">Today's Schedule</div>
          <div className="teacher-schedule-list">
            <div className="teacher-schedule-item">
              <div className="teacher-schedule-task">Process New Registration</div>
              <div className="teacher-schedule-meta">9:00 AM <span>CL1</span></div>
            </div>
            <div className="teacher-schedule-item">
              <div className="teacher-schedule-task">Staff Attendance Review</div>
              <div className="teacher-schedule-meta">11:00 AM <span>CL2</span></div>
            </div>
            <div className="teacher-schedule-item">
              <div className="teacher-schedule-task">Fee Collection Report</div>
              <div className="teacher-schedule-meta">2:00 PM <span>Orientation</span></div>
            </div>
            <div className="teacher-schedule-item">
              <div className="teacher-schedule-task">Visitor Appointments</div>
              <div className="teacher-schedule-meta">4:00 PM <span>Diploma Class</span></div>
            </div>
          </div>
        </div>
        <div className="teacher-performance">
          <div className="teacher-section-title">Class Performance</div>
          <div className="teacher-performance-list">
            <div className="teacher-performance-item">
              <div className="teacher-performance-class">Orientation <span>Mathematics</span></div>
              <div className="teacher-performance-score">78% <span className="teacher-performance-up">+5%</span></div>
            </div>
            <div className="teacher-performance-item">
              <div className="teacher-performance-class">CL2 <span>Physics</span></div>
              <div className="teacher-performance-score">82% <span className="teacher-performance-up">+2%</span></div>
            </div>
            <div className="teacher-performance-item">
              <div className="teacher-performance-class">CL1 <span>Chemistry</span></div>
              <div className="teacher-performance-score">75% <span className="teacher-performance-down">-3%</span></div>
            </div>
          </div>
        </div>
      </div>
    </SideTop>
  );
} 