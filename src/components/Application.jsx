import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import DisciplineSideTop from './DisciplineSideTop';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaFileUpload, FaDownload } from 'react-icons/fa';
import api from '../services/api';
import './Application.css';

export default function Application({ authUser }) {
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    applicant_name: '',
    classes: '',
    subjects: '',
    contact: '',
    certificate: null
  });
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [userApplication, setUserApplication] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);

  const isAdmin1 = authUser?.role === 'Admin1';
  const isAdmin4 = authUser?.role === 'Admin4';
  const canManageApplications = isAdmin1 || isAdmin4;
  const canSubmitApplication = !canManageApplications;
  const canEditApplications = isAdmin4; // Only Admin4 can edit applications
  const canApproveApplications = isAdmin4; // Only Admin4 can approve applications

  useEffect(() => {
    if (canManageApplications) {
      fetchApplications();
    } else {
      fetchUserApplication();
    }
    fetchSubjects();
    fetchClasses();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.getSubjects();
      setSubjects(response);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.getClasses();
      setClasses(response);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.getApplications();
      setApplications(response);
    } catch (error) {
      console.error('Error fetching applications:', error);
      if (error.message.includes('Session expired')) {
        alert('Your session has expired. Please login again.');
        window.location.href = '/signin';
      } else {
        console.error('Failed to fetch applications:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserApplication = async () => {
    try {
      const application = await api.getUserApplication(authUser.id);
      setUserApplication(application);
    } catch (error) {
      console.error('Error fetching user application:', error);
      if (error.message.includes('Session expired')) {
        alert('Your session has expired. Please login again.');
        window.location.href = '/signin';
      } else if (!error.message.includes('404')) {
        console.error('Failed to fetch user application:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    
    if (files) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else if (type === 'checkbox') {
      // Handle checkbox selection for subjects
      if (name === 'subject') {
        const subjectValue = value;
        setSelectedSubjects(prev => {
          const newSelectedSubjects = checked 
            ? [...prev, subjectValue]
            : prev.filter(subject => subject !== subjectValue);
          
          // Update formData subjects field with the new selection
          setFormData(formDataPrev => ({
            ...formDataPrev,
            subjects: newSelectedSubjects.join(', ')
          }));
          
          return newSelectedSubjects;
        });
      } else if (name === 'class') {
        // Handle checkbox selection for classes (Admin4 only)
        const classValue = value;
        setSelectedClasses(prev => {
          const newSelectedClasses = checked 
            ? [...prev, classValue]
            : prev.filter(cls => cls !== classValue);
          
          // Update formData classes field with the new selection
          setFormData(formDataPrev => ({
            ...formDataPrev,
            classes: newSelectedClasses.join(', ')
          }));
          
          return newSelectedClasses;
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started', formData);
    
    // Clear any previous success message
    setSuccessMessage('');
    
    // Validate that at least one subject is selected
    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject');
      return;
    }
    
    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('applicant_name', formData.applicant_name);
      formDataToSend.append('classes', formData.classes);
      formDataToSend.append('subjects', formData.subjects);
      formDataToSend.append('contact', formData.contact);
      if (formData.certificate) {
        formDataToSend.append('certificate', formData.certificate);
      }

      console.log('Sending form data:', {
        applicant_name: formData.applicant_name,
        classes: formData.classes,
        subjects: formData.subjects,
        contact: formData.contact,
        hasCertificate: !!formData.certificate
      });

      // Log FormData contents
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`FormData ${key}:`, value);
      }

      let response;
      if (editingId) {
        response = await api.updateApplication(editingId, formDataToSend);
        console.log('Application updated successfully');
        setSuccessMessage('Application updated successfully!');
      } else {
        response = await api.submitApplication(formDataToSend);
        console.log('Application submitted successfully');
        setSuccessMessage('Application submitted successfully!');
      }

      // Reset form
      setShowForm(false);
      setFormData({
        applicant_name: '',
        classes: '',
        subjects: '',
        contact: '',
        certificate: null
      });
      setSelectedSubjects([]);
      setSelectedClasses([]);
      setEditingId(null);
      
      // Refresh data
      await fetchApplications();
      if (canSubmitApplication) {
        await fetchUserApplication();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('Error submitting application:', error);
      // Only show authentication error for actual session expiration
      if (error.message.includes('Session expired')) {
        alert('Your session has expired. Please login again.');
        // Redirect to login page
        window.location.href = '/signin';
      } else {
        alert(`Error submitting application: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (application) => {
    const subjectsArray = application.subjects ? application.subjects.split(', ').filter(s => s.trim()) : [];
    setSelectedSubjects(subjectsArray);
    const classesArray = application.classes ? application.classes.split(', ').filter(c => c.trim()) : [];
    setSelectedClasses(classesArray);
    setFormData({
      applicant_name: application.applicant_name,
      classes: application.classes,
      subjects: application.subjects,
      contact: application.contact,
      certificate: null
    });
    setEditingId(application.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    
    try {
      await api.deleteApplication(id);
      fetchApplications();
      if (canSubmitApplication) {
        fetchUserApplication();
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      if (error.message.includes('Session expired')) {
        alert('Your session has expired. Please login again.');
        window.location.href = '/signin';
      } else {
        alert('Error deleting application. Please try again.');
      }
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.updateApplicationStatus(id, status);
      fetchApplications();
    } catch (error) {
      console.error('Error updating application status:', error);
      if (error.message.includes('Session expired')) {
        alert('Your session has expired. Please login again.');
        window.location.href = '/signin';
      } else {
        alert('Error updating application status. Please try again.');
      }
    }
  };

  const canEditApplication = (application) => {
    if (canEditApplications) return true;
    return application.applicant_id === authUser.id && application.status === 'pending';
  };

  const canDeleteApplication = (application) => {
    if (canEditApplications) return true;
    return application.applicant_id === authUser.id && application.status === 'pending';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: 'Pending' },
      approved: { color: 'green', text: 'Approved' },
      rejected: { color: 'red', text: 'Rejected' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.color}`}>{config.text}</span>;
  };

  const renderApplicationForm = () => (
    <div className="application-form-overlay">
      <div className="application-form-modal">
        <div className="form-header">
          <h3>{editingId ? 'Edit Application' : 'Submit Application'}</h3>
          <button 
            className="close-btn" 
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({
                applicant_name: '',
                classes: '',
                subjects: '',
                contact: '',
                certificate: null
              });
              setSelectedSubjects([]);
              setSelectedClasses([]);
            }}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="application-form">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="applicant_name"
              value={formData.applicant_name}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label>Class(es) *</label>
            {isAdmin4 ? (
              <div className="classes-checkbox-container">
                {classes.map((cls) => (
                  <label key={cls.id} className="class-checkbox">
                    <input
                      type="checkbox"
                      name="class"
                      value={cls.name}
                      checked={selectedClasses.includes(cls.name)}
                      onChange={handleInputChange}
                    />
                    <span className="checkbox-label">{cls.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                name="classes"
                value={formData.classes}
                onChange={handleInputChange}
                required
                placeholder="Class(es) will be assigned by Admin4"
                disabled
              />
            )}
          </div>

          <div className="form-group">
            <label>Subject(s) *</label>
            <div className="subjects-checkbox-container">
              {subjects.map((subject) => (
                <label key={subject.id} className="subject-checkbox">
                  <input
                    type="checkbox"
                    name="subject"
                    value={subject.name}
                    checked={selectedSubjects.includes(subject.name)}
                    onChange={handleInputChange}
                  />
                  <span className="checkbox-label">{subject.name}</span>
                </label>
              ))}
            </div>
            {selectedSubjects.length === 0 && (
              <small className="form-help">Please select at least one subject</small>
            )}
          </div>

          <div className="form-group">
            <label>Contact *</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              required
              placeholder="Phone number or email"
            />
          </div>

          <div className="form-group">
            <label>Certificate (PDF or Image)</label>
            <div className="file-upload">
              <input
                type="file"
                name="certificate"
                onChange={handleInputChange}
                accept=".pdf,.jpg,.jpeg,.png"
                id="certificate-upload"
              />
              <label htmlFor="certificate-upload" className="file-upload-label">
                <FaFileUpload /> Choose File
              </label>
              {formData.certificate && (
                <span className="file-name">{formData.certificate.name}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                  applicant_name: '',
                  classes: '',
                  subjects: '',
                  contact: '',
                  certificate: null
                });
                setSelectedSubjects([]);
                setSelectedClasses([]);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : (editingId ? 'Update' : 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderApplicationsTable = () => (
    <div className="applications-table-container">
      <div className="table-header">
        <h2>
          {isAdmin1 ? 'Submitted Applications (View Only)' : 
           isAdmin4 ? 'Applications Management' : 
           'Applications'}
        </h2>
        {canSubmitApplication && !userApplication && (
          <button 
            className="btn-primary apply-btn"
            onClick={() => setShowForm(true)}
          >
            <FaPlus /> Apply
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="no-applications">
          {isAdmin1 ? 'No applications have been submitted yet.' : 
           isAdmin4 ? 'No applications found.' : 
           (userApplication ? 'No other applications found.' : 'You haven\'t submitted any applications yet.')}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Name of Applicant</th>
                <th>Class(es)</th>
                <th>Subject(s)</th>
                <th>Contact</th>
                <th>Certificate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.applicant_name}</td>
                  <td>{app.classes}</td>
                  <td>{app.subjects}</td>
                  <td>{app.contact}</td>
                  <td>
                    {app.certificate_url ? (
                      <a 
                        href={app.certificate_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="certificate-link"
                      >
                        <FaDownload /> View
                      </a>
                    ) : (
                      <span className="no-certificate">No certificate</span>
                    )}
                  </td>
                  <td>{getStatusBadge(app.status)}</td>
                  <td className="app-actions">
                    {canEditApplication(app) && (
                      <button 
                        className="app-action-btn edit"
                        onClick={() => handleEdit(app)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                    )}
                    {canDeleteApplication(app) && (
                      <button 
                        className="app-action-btn delete"
                        onClick={() => handleDelete(app.id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    )}
                    {canApproveApplications && (
                      <>
                        {app.status === 'pending' && (
                          <>
                            <button 
                              className="app-action-btn approve"
                              onClick={() => handleStatusUpdate(app.id, 'approved')}
                              title="Approve"
                            >
                              <FaCheck />
                            </button>
                            <button 
                              className="app-action-btn reject"
                              onClick={() => handleStatusUpdate(app.id, 'rejected')}
                              title="Reject"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                        {app.status === 'rejected' && (
                          <button 
                            className="app-action-btn approve"
                            onClick={() => handleStatusUpdate(app.id, 'pending')}
                            title="Remove Rejection"
                          >
                            <FaCheck />
                          </button>
                        )}
                        {app.status === 'approved' && (
                          <button 
                            className="app-action-btn reject"
                            onClick={() => handleStatusUpdate(app.id, 'pending')}
                            title="Remove Approval"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderUserApplication = () => {
    if (!userApplication) return null;

    return (
      <div className="user-application-section">
        <div className="section-header">
          <h3>My Submitted Application</h3>
          <div className="application-status">
            Status: {getStatusBadge(userApplication.status)}
          </div>
        </div>
        
        <div className="user-application-card">
          <div className="application-details">
            <div className="detail-row">
              <div className="detail-label">Applicant Name:</div>
              <div className="detail-value">{userApplication.applicant_name}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Class(es):</div>
              <div className="detail-value">
                {userApplication.classes || 'Pending assignment by Admin4'}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Subject(s):</div>
              <div className="detail-value">{userApplication.subjects}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Contact:</div>
              <div className="detail-value">{userApplication.contact}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Certificate:</div>
              <div className="detail-value">
                {userApplication.certificate_url ? (
                  <a 
                    href={userApplication.certificate_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="certificate-link"
                  >
                    <FaDownload /> View Certificate
                  </a>
                ) : (
                  <span className="no-certificate">No certificate uploaded</span>
                )}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Submitted:</div>
              <div className="detail-value">
                {new Date(userApplication.submitted_at).toLocaleDateString()}
              </div>
            </div>
            {userApplication.reviewed_at && (
              <div className="detail-row">
                <div className="detail-label">Reviewed:</div>
                <div className="detail-value">
                  {new Date(userApplication.reviewed_at).toLocaleDateString()}
                  {userApplication.reviewer_name && (
                    <span className="reviewer-info"> by {userApplication.reviewer_name}</span>
                  )}
                </div>
              </div>
            )}
            {userApplication.admin_comment && (
              <div className="detail-row">
                <div className="detail-label">Admin Comment:</div>
                <div className="detail-value admin-comment">
                  {userApplication.admin_comment}
                </div>
              </div>
            )}
          </div>
          
          <div className="application-actions">
            {canEditApplication(userApplication) && (
              <button 
                className="action-btn edit"
                onClick={() => handleEdit(userApplication)}
                title="Edit Application"
              >
                <FaEdit /> Edit
              </button>
            )}
            {canDeleteApplication(userApplication) && (
              <button 
                className="action-btn delete"
                onClick={() => handleDelete(userApplication.id)}
                title="Delete Application"
              >
                <FaTrash /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessMessage = () => {
    if (!successMessage) return null;
    
    return (
      <div className="success-message">
        <div className="success-content">
          <span className="success-icon">✓</span>
          <span className="success-text">{successMessage}</span>
        </div>
      </div>
    );
  };

  const applicationContent = (
    <div className="application-container">
      {renderSuccessMessage()}
      {/* Show user's own application first if they have submitted one */}
      {userApplication && renderUserApplication()}
      
      {/* Show general applications table */}
      {renderApplicationsTable()}
      
      {/* Show form modal */}
      {showForm && renderApplicationForm()}
    </div>
  );

  // Use DisciplineSideTop for Discipline users, SideTop for others
  if (authUser?.role === 'Discipline') {
    return (
      <DisciplineSideTop>
        {applicationContent}
      </DisciplineSideTop>
    );
  }

  return (
    <SideTop>
      {applicationContent}
    </SideTop>
  );
} 