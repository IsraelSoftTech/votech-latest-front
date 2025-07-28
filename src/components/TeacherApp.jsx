import React, { useState, useEffect } from 'react';
import './TeacherApp.css';
import { FaCheck, FaTimes } from 'react-icons/fa';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';

export default function TeacherApp({ authUser }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    contact: '',
    email: '',
    specialty: '',
    experience: '',
    education: '',
    skills: '',
    availability: '',
    motivation: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [teacherRecord, setTeacherRecord] = useState(null);
  const [showSubjectsDropdown, setShowSubjectsDropdown] = useState(false);

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => setSubjects([]));
    fetchTeacherRecord();
    const handler = () => fetchTeacherRecord();
    window.addEventListener('teacher-status-updated', handler);
    return () => window.removeEventListener('teacher-status-updated', handler);
  }, []);

  const fetchTeacherRecord = async () => {
    try {
      const all = await api.getAllTeachers();
      console.log('All teachers:', all, 'Auth user:', authUser);
      let rec = null;
      if (authUser?.id) {
        rec = all.find(t => t.user_id === authUser.id);
      }
      if (!rec) {
        rec = all.find(t => t.contact === authUser?.contact || t.full_name === authUser?.name);
      }
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
    } catch (err) {
      console.error('Error fetching teacher record:', err);
    }
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
        classes: form.classes
      };
      await api.submitTeacherApplication(submitForm);
      setSuccess('Application submitted!');
      setShowSuccess(true);
      fetchTeacherRecord();
    } catch (err) {
      setError(err.message || 'You have already submitted your application');
    }
    setRegistering(false);
  };

  let statusColor = '#e53e3e', statusIcon = <FaTimes />, statusTitle = 'Not Approved';
  if (teacherRecord && teacherRecord.status === 'approved') {
    statusColor = '#22bb33';
    statusIcon = <FaCheck />;
    statusTitle = 'Approved';
  }

  const applicationExists = !!teacherRecord;

  return (
    <div className="teacher-app-container">
      {applicationExists && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '7px 22px',
              borderRadius: 18,
              fontWeight: 700,
              fontSize: 16,
              background: teacherRecord.status === 'approved' ? '#22bb33' : teacherRecord.status === 'pending' ? '#ff9800' : '#e53e3e',
              color: '#fff',
              letterSpacing: 1,
              boxShadow: '0 2px 8px rgba(32,64,128,0.07)',
              textTransform: 'capitalize',
            }}
          >
            {teacherRecord.status === 'approved' && 'Approved'}
            {teacherRecord.status === 'pending' && 'Pending Approval'}
            {teacherRecord.status === 'rejected' && 'Rejected'}
          </span>
        </div>
      )}
      {applicationExists ? (
        <>
          <div style={{ margin: '0 0 18px 0', color: '#204080', fontWeight: 600, fontSize: 18, textAlign: 'center' }}>
            Application Already submitted.
          </div>
          <div style={{ marginTop: 12 }}>
            <h3 style={{ color: '#204080', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Your Application Information</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7f8fa', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(32,64,128,0.07)' }}>
              <tbody>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Full Name</td><td style={{ padding: 8 }}>{teacherRecord.full_name}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Sex</td><td style={{ padding: 8 }}>{teacherRecord.sex}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>ID Card Number</td><td style={{ padding: 8 }}>{teacherRecord.id_card}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Date of Birth</td><td style={{ padding: 8 }}>{teacherRecord.dob}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Place of Birth</td><td style={{ padding: 8 }}>{teacherRecord.pob}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Subject(s)</td><td style={{ padding: 8 }}>{teacherRecord.subjects}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Class(es) Taught</td><td style={{ padding: 8 }}>{teacherRecord.classes}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Contact</td><td style={{ padding: 8 }}>{teacherRecord.contact}</td></tr>
                <tr><td style={{ fontWeight: 500, padding: 8 }}>Status</td><td style={{ padding: 8, color: teacherRecord.status === 'approved' ? '#22bb33' : '#e53e3e', fontWeight: 600 }}>{teacherRecord.status}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <form id="teacher-app-form" className="teacher-app-form" onSubmit={handleRegister}>
          <div className="teacher-app-form-grid">
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
          {error && <div className="error-message" style={{ textAlign: 'center', marginBottom: 12 }}>{error}</div>}
          {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}
          <button type="submit" className="signup-btn" disabled={registering}>{registering ? 'Registering...' : 'Register'}</button>
        </form>
      )}
    </div>
  );
} 