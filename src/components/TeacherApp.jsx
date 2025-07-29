import React, { useState, useEffect } from 'react';
import './TeacherApp.css';
import { FaCheck, FaTimes, FaClipboardList, FaWindowClose, FaEdit, FaTrash } from 'react-icons/fa';
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
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherRecord, setTeacherRecord] = useState(null);
  const [showSubjectsDropdown, setShowSubjectsDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [userApplications, setUserApplications] = useState([]);
  const [editingApplication, setEditingApplication] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => setSubjects([]));
    fetchTeacherRecord();
    // Fetch all applications for this user
    api.getAllTeachers().then(all => {
      console.log('All teachers from API:', all);
      console.log('Current authUser:', authUser);
      
      let userApps = [];
      // Try multiple ways to match the user
      if (authUser?.id) {
        userApps = all.filter(t => t.user_id === authUser.id);
        console.log('Found by user_id:', userApps);
      }
      if (userApps.length === 0 && authUser?.contact) {
        userApps = all.filter(t => t.contact === authUser.contact);
        console.log('Found by contact:', userApps);
      }
      if (userApps.length === 0 && authUser?.name) {
        userApps = all.filter(t => t.full_name === authUser.name);
        console.log('Found by name:', userApps);
      }
      if (userApps.length === 0 && authUser?.username) {
        userApps = all.filter(t => t.full_name?.toLowerCase().includes(authUser.username.toLowerCase()) || 
                                   t.contact?.toLowerCase().includes(authUser.username.toLowerCase()));
        console.log('Found by username:', userApps);
      }
      
      console.log('Final userApps:', userApps);
      setUserApplications(userApps);
    }).catch(err => {
      console.error('Error fetching teachers:', err);
    });
    const handler = () => fetchTeacherRecord();
    window.addEventListener('teacher-status-updated', handler);
    return () => window.removeEventListener('teacher-status-updated', handler);
  }, [authUser]);

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
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('full_name', form.full_name);
      formData.append('sex', form.sex);
      formData.append('id_card', form.id_card);
      formData.append('dob', form.dob);
      formData.append('pob', form.pob);
      formData.append('subjects', Array.isArray(form.subjects) ? form.subjects.join(',') : form.subjects);
      formData.append('classes', form.classes);
      formData.append('contact', form.contact);
      
      // Add file if selected
      const fileInput = document.querySelector('input[name="qualification_certificate"]');
      if (fileInput && fileInput.files[0]) {
        formData.append('qualification_certificate', fileInput.files[0]);
      }
      
      console.log('Submitting form:', form);
      
      let result;
      if (isEditing && editingApplication) {
        // Editing existing application
        result = await api.editTeacherApplication(editingApplication.id, formData);
        console.log('Edit result:', result);
        setSuccess('Application updated successfully!');
      } else {
        // Submitting new application
        result = await api.submitTeacherApplication(formData);
        console.log('Submission result:', result);
        setSuccess('Application submitted!');
      }
      
      setShowSuccess(true);
      fetchTeacherRecord();
      
      // Refresh user applications to include the new submission
      setTimeout(() => {
        api.getAllTeachers().then(all => {
          console.log('Refreshing applications after submission. All teachers:', all);
          let userApps = [];
          if (authUser?.id) {
            userApps = all.filter(t => t.user_id === authUser.id);
          }
          if (userApps.length === 0 && authUser?.contact) {
            userApps = all.filter(t => t.contact === authUser.contact);
          }
          if (userApps.length === 0 && authUser?.name) {
            userApps = all.filter(t => t.full_name === authUser.name);
          }
          if (userApps.length === 0 && authUser?.username) {
            userApps = all.filter(t => t.full_name?.toLowerCase().includes(authUser.username.toLowerCase()) || 
                                       t.contact?.toLowerCase().includes(authUser.username.toLowerCase()));
          }
          console.log('Updated userApps after submission:', userApps);
          setUserApplications(userApps);
        });
      }, 1000); // Wait 1 second for backend to process
      
      // Clear form fields and reset editing state
      setForm({
        full_name: '',
        sex: '',
        id_card: '',
        dob: '',
        pob: '',
        subjects: [],
        classes: '',
        contact: ''
      });
      setEditingApplication(null);
      setIsEditing(false);
      
      // Clear file input
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Close form after 3 seconds
      setTimeout(() => {
        setShowForm(false);
        setShowSuccess(false);
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'You have already submitted your application');
    }
    setRegistering(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingApplication(null);
    setIsEditing(false);
    setForm({
      full_name: '',
      sex: '',
      id_card: '',
      dob: '',
      pob: '',
      subjects: [],
      classes: '',
      contact: ''
    });
    setError('');
  };

  let statusColor = '#e53e3e', statusIcon = <FaTimes />, statusTitle = 'Not Approved';
  if (teacherRecord && teacherRecord.status === 'approved') {
    statusColor = '#22bb33';
    statusIcon = <FaCheck />;
    statusTitle = 'Approved';
  }

  const applicationExists = !!teacherRecord;

  // Determine status: if multiple, show the most recent (by created_at or last in array)
  const latestApp = userApplications.length > 0 ? userApplications[userApplications.length - 1] : null;
  const status = latestApp ? latestApp.status : 'Not yet submitted';

  return (
    <div className="teacher-app-container" style={{ maxWidth: '100%', padding: 0, width: '100%', overflow: 'hidden' }}>
      {/* Cards at the top styled like Admin.jsx, with different backgrounds */}
      <div className="dashboard-cards" style={{ margin: '32px 0 24px 0', flexWrap: 'wrap', width: '100%' }}>
        <div className="card teachers" style={{ minWidth: 180, minHeight: 110, flex: 1 }}>
          <div className="icon"><FaClipboardList /></div>
          <div className="count">{userApplications.length}</div>
          <div className="desc">Total Submitted Applications</div>
        </div>
        <div className={`card fees`} style={{ minWidth: 180, minHeight: 110, flex: 1 }}>
          <div className="icon">
            {status === 'approved' ? <FaCheck style={{ color: '#22bb33' }} /> : status === 'pending' ? <FaClipboardList style={{ color: '#ff9800' }} /> : status === 'rejected' ? <FaTimes style={{ color: '#e53e3e' }} /> : <FaClipboardList style={{ color: '#888' }} />}
          </div>
          <div className="count" style={{ textTransform: 'capitalize' }}>{status}</div>
          <div className="desc">Application Status</div>
        </div>
      </div>
      
      {/* Show only Apply button if form is hidden */}
      {!showForm && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, width: '100%' }}>
          <button className="signup-btn" style={{ minWidth: 160 }} onClick={() => setShowForm(true)}>Apply</button>
        </div>
      )}
      
      {/* Applications Table - Always visible below Apply button */}
      <div style={{ marginBottom: 24, width: '100%' }}>
        <h3 style={{ color: '#204080', fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>Your Submitted Applications</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 16, fontStyle: 'italic' }}>
          Note: Only applications with "pending" status can be edited or deleted.
        </p>
        <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7f8fa', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(32,64,128,0.07)', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#204080', color: '#fff' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>#</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Full Name</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Sex</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>ID Card</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Date of Birth</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Place of Birth</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Subjects</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Date</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userApplications.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ padding: 20, textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                    No applications submitted yet. Click "Apply" to submit your first application.
                  </td>
                </tr>
              ) : (
                userApplications.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12 }}>{index + 1}</td>
                    <td style={{ padding: 12 }}>{app.full_name || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{app.sex || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{app.id_card || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{app.dob || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{app.pob || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{app.subjects || 'N/A'}</td>
                    <td style={{ padding: 12 }}>{app.contact || 'N/A'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        background: app.status === 'approved' ? '#22bb33' : app.status === 'pending' ? '#ff9800' : '#e53e3e'
                      }}>
                        {app.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: 12 }}>
                      {app.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingApplication(app);
                              setIsEditing(true);
                              setForm({
                                full_name: app.full_name || '',
                                sex: app.sex || '',
                                id_card: app.id_card || '',
                                dob: app.dob || '',
                                pob: app.pob || '',
                                subjects: app.subjects ? app.subjects.split(',').map(s => s.trim()) : [],
                                classes: app.classes || '',
                                contact: app.contact || ''
                              });
                              setShowForm(true);
                              setError('');
                            }}
                            style={{ 
                              background: '#007bff', 
                              border: 'none', 
                              color: '#fff', 
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Edit Application"
                          >
                            <FaEdit size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApplicationToDelete(app);
                              setShowDeleteModal(true);
                            }}
                            style={{ 
                              background: '#dc3545', 
                              border: 'none', 
                              color: '#fff', 
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Delete Application"
                          >
                            <FaTrash size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Show the form only if showForm is true */}
      {showForm && (
        <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
          <button
            type="button"
            onClick={handleCloseForm}
            style={{ position: 'absolute', top: -12, right: -12, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', zIndex: 2 }}
            title="Close"
          >
            <FaWindowClose />
          </button>
          {applicationExists && !isEditing ? (
            <>
              <div style={{ margin: '0 0 18px 0', color: '#204080', fontWeight: 600, fontSize: 18, textAlign: 'center' }}>
                Application Already submitted.
              </div>
              <div style={{ marginTop: 12 }}>
                <h3 style={{ color: '#204080', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Your Application Information</h3>
                <div style={{ overflowX: 'auto', width: '100%' }}>
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
              </div>
            </>
          ) : (
            <form id="teacher-app-form" className="teacher-app-form" onSubmit={handleRegister} style={{ width: '100%' }} encType="multipart/form-data">
              <h3 style={{ color: '#204080', fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
                {isEditing ? 'Edit Application' : 'Submit New Application'}
              </h3>
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
              
              {/* Qualification Certificate Field */}
              <div style={{ marginTop: 20 }}>
                <label className="input-label">Qualification Certificate *</label>
                <div style={{ marginTop: 8 }}>
                  <input 
                    type="file" 
                    name="qualification_certificate" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const fileSize = file.size / 1024 / 1024; // Size in MB
                        if (fileSize > 5) {
                          setError('File size must be less than 5MB');
                          e.target.value = '';
                          return;
                        }
                        setError('');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                    required={!isEditing}
                  />
                  <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Accepted formats: PDF, JPG, JPEG, PNG (Max size: 5MB)
                    {isEditing && editingApplication?.certificate_url && (
                      <span style={{ display: 'block', marginTop: 4 }}>
                        Current certificate: <a href={editingApplication.certificate_url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>View current certificate</a>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {error && <div className="error-message" style={{ textAlign: 'center', marginBottom: 12 }}>{error}</div>}
              {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}
              <button type="submit" className="signup-btn" disabled={registering}>
                {registering ? 'Processing...' : (isEditing ? 'Update Application' : 'Submit Application')}
              </button>
            </form>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 24, color: '#dc3545', marginBottom: 16 }}>
              <FaTrash />
            </div>
            <h3 style={{ color: '#204080', marginBottom: 12, fontSize: 18 }}>
              Delete Application
            </h3>
            <p style={{ color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
              Are you sure you want to delete this application? This action cannot be undone.
            </p>
            {applicationToDelete && (
              <div style={{ 
                background: '#f8f9fa', 
                padding: 12, 
                borderRadius: 4, 
                marginBottom: 24,
                textAlign: 'left',
                fontSize: 14
              }}>
                <div><strong>Name:</strong> {applicationToDelete.full_name}</div>
                <div><strong>Contact:</strong> {applicationToDelete.contact}</div>
                <div><strong>Subjects:</strong> {applicationToDelete.subjects}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#666',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (applicationToDelete) {
                    api.deleteTeacherApplication(applicationToDelete.id).then(() => {
                      setUserApplications(prev => prev.filter(a => a.id !== applicationToDelete.id));
                      setSuccess('Application deleted successfully!');
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 3000);
                      setShowDeleteModal(false);
                      setApplicationToDelete(null);
                    }).catch(err => {
                      console.error('Error deleting application:', err);
                      setError('Failed to delete application.');
                      setTimeout(() => setError(''), 3000);
                      setShowDeleteModal(false);
                      setApplicationToDelete(null);
                    });
                  }
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: '#dc3545',
                  color: '#fff',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 