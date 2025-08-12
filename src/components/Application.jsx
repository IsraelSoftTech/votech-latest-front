import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import DisciplineSideTop from './DisciplineSideTop';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaFileUpload, FaDownload } from 'react-icons/fa';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import './Application.css';

export default function Application({ authUser }) {
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true); // Start with loading true
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
  const [authLoading, setAuthLoading] = useState(true); // New state for auth loading

  // Derive current user from prop or session storage
  const currentUser = authUser || JSON.parse(sessionStorage.getItem('authUser') || 'null');

  const isAdmin1 = currentUser?.role === 'Admin1';
  const isAdmin4 = currentUser?.role === 'Admin4';
  const canManageApplications = isAdmin1 || isAdmin4;
  const canSubmitApplication = true; // All users including admins can submit applications
  const canEditApplications = isAdmin4; // Only Admin4 can edit applications
  const canApproveApplications = isAdmin4; // Only Admin4 can approve applications

  // Handle auth user loading
  useEffect(() => {
    const checkAuthUser = async () => {
      try {
        console.log('Application: Checking auth user...', { authUser });
        // If authUser is passed as prop, use it
        if (authUser) {
          console.log('Application: Auth user provided as prop:', authUser);
          setAuthLoading(false);
          return;
        }
        
        // Otherwise, try to get from sessionStorage
        const storedUser = sessionStorage.getItem('authUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('Application: Auth user found in sessionStorage:', parsedUser);
          // Update the authUser by calling the parent or using a callback
          // For now, we'll work with the stored user
          setAuthLoading(false);
        } else {
          console.log('Application: No auth user found, redirecting to login');
          // No user found, redirect to login
          window.location.href = '/signin';
        }
      } catch (error) {
        console.error('Application: Error checking auth user:', error);
        setAuthLoading(false);
      }
    };

    checkAuthUser();
  }, [authUser]);

  // Fetch data when auth is ready
  useEffect(() => {
    if (authLoading) {
      console.log('Application: Auth still loading, skipping data fetch');
      return; // Don't fetch if still loading auth
    }
    
    // currentUser already derived above
    console.log('Application: Auth ready, fetching data for user:', currentUser);
    
    if (!currentUser) {
      console.log('Application: No current user, setting loading to false');
      setLoading(false);
      return;
    }
    
    // Fetch all data in parallel
    const fetchAllData = async () => {
      try {
        console.log('Application: Starting to fetch all data...');
        setLoading(true);
        await Promise.all([
          fetchApplications(),
          fetchUserApplication(),
          fetchSubjects(),
          fetchClasses()
        ]);
        console.log('Application: All data fetched successfully');
      } catch (error) {
        console.error('Application: Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [authLoading, authUser]);

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
    }
  };

  const fetchUserApplication = async () => {
    const currentUser = authUser || JSON.parse(sessionStorage.getItem('authUser') || 'null');
    if (!currentUser) return;
    
    try {
      const application = await api.getUserApplication(currentUser.id);
      setUserApplication(application);
    } catch (error) {
      console.error('Error fetching user application:', error);
      if (error.message.includes('Session expired')) {
        alert('Your session has expired. Please login again.');
        window.location.href = '/signin';
      } else if (!error.message.includes('404')) {
        console.error('Failed to fetch user application:', error);
      }
      // Set to null if there's an error (including 404)
      setUserApplication(null);
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
    
    // Check if user already has an application (only for new submissions, not edits)
    if (!editingId && userApplication) {
      alert('You have already submitted an application. You cannot submit multiple applications.');
      return;
    }
    
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
        setSuccessMessage('success');
      } else {
        response = await api.submitApplication(formDataToSend);
        console.log('Application submitted successfully');
        setSuccessMessage('success');
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
      await Promise.all([
        fetchApplications(),
        fetchUserApplication()
      ]);
      
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
      await Promise.all([
        fetchApplications(),
        fetchUserApplication()
      ]);
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
      await fetchApplications();
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
    if (canEditApplications) return true; // Admin4
    const currentUser = authUser || JSON.parse(sessionStorage.getItem('authUser') || 'null');
    if (!currentUser) return false;
    if (currentUser.role === 'Admin1') return false; // Admin1 is view-only
    return application.applicant_id === currentUser.id && application.status === 'pending';
  };

  const canDeleteApplication = (application) => {
    if (canEditApplications) return true; // Admin4
    const currentUser = authUser || JSON.parse(sessionStorage.getItem('authUser') || 'null');
    if (!currentUser) return false;
    if (currentUser.role === 'Admin1') return false; // Admin1 is view-only
    return application.applicant_id === currentUser.id && application.status === 'pending';
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
    <div className="application-form-overlay app-form-overlay">
      <div className="application-form-modal app-form-modal">
        <div className="form-header app-form-header">
          <h3 className="app-form-title">{editingId ? 'Edit Application' : 'Submit Application'}</h3>
          <button 
            className="close-btn app-close-btn" 
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
        
        <form onSubmit={handleSubmit} className="application-form app-form-unique">
          <div className="form-group app-form-group">
            <label className="app-form-label">Full Name *</label>
            <input
              type="text"
              name="applicant_name"
              value={formData.applicant_name}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
              className="app-form-input"
            />
          </div>

          <div className="form-group app-form-group">
            <label className="app-form-label">Class(es) *</label>
            {isAdmin4 ? (
              <div className="classes-checkbox-container app-classes-container">
                {classes.map((cls) => (
                  <label key={cls.id} className="class-checkbox app-class-checkbox">
                    <input
                      type="checkbox"
                      name="class"
                      value={cls.name}
                      checked={selectedClasses.includes(cls.name)}
                      onChange={handleInputChange}
                      className="app-checkbox-input"
                    />
                    <span className="checkbox-label app-checkbox-label">{cls.name}</span>
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
                className="app-form-input app-form-input-disabled"
              />
            )}
          </div>

          <div className="form-group app-form-group">
            <label className="app-form-label">Subject(s) *</label>
            <div className="subjects-checkbox-container app-subjects-container">
              {subjects.map((subject) => (
                <label key={subject.id} className="subject-checkbox app-subject-checkbox">
                  <input
                    type="checkbox"
                    name="subject"
                    value={subject.name}
                    checked={selectedSubjects.includes(subject.name)}
                    onChange={handleInputChange}
                    className="app-checkbox-input"
                  />
                  <span className="checkbox-label app-checkbox-label">{subject.name}</span>
                </label>
              ))}
            </div>
            {selectedSubjects.length === 0 && (
              <small className="form-help app-form-help">Please select at least one subject</small>
            )}
          </div>

          <div className="form-group app-form-group">
            <label className="app-form-label">Contact *</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              required
              placeholder="Phone number or email"
              className="app-form-input"
            />
          </div>

          <div className="form-group app-form-group">
            <label className="app-form-label">Certificate (PDF or Image)</label>
            <div className="file-upload app-file-upload">
              <input
                type="file"
                name="certificate"
                onChange={handleInputChange}
                accept=".pdf,.jpg,.jpeg,.png"
                id="certificate-upload"
                className="app-file-input"
              />
              <label htmlFor="certificate-upload" className="file-upload-label app-file-upload-label">
                <FaFileUpload /> Choose File
              </label>
              {formData.certificate && (
                <span className="file-name app-file-name">{formData.certificate.name}</span>
              )}
            </div>
          </div>

          <div className="form-actions app-form-actions">
            <button 
              type="button" 
              className="btn-secondary app-btn-secondary"
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
            <button type="submit" className="btn-primary app-btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : (editingId ? 'Update' : 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderApplicationsTable = () => {
    // Check if current user has already applied using userApplication state
    const currentUserHasApplied = !!userApplication;
    
    return (
      <div className="applications-table-container app-table-container">
        <div className="table-header app-table-header">
          <h2 className="app-table-title">
            {isAdmin1 ? 'All Applications (View & Apply)' : 
             isAdmin4 ? 'Applications Management (View & Apply)' : 
             'Applications'}
          </h2>
          {canSubmitApplication && !currentUserHasApplied && (
            <button 
              className="btn-primary apply-btn app-apply-btn"
              onClick={() => setShowForm(true)}
            >
              <FaPlus /> Apply
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading app-loading">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="no-applications app-no-applications">
            {isAdmin1 ? 'No applications have been submitted yet. You can be the first to apply!' : 
             isAdmin4 ? 'No applications found. You can be the first to apply!' : 
             (userApplication ? 'No other applications found.' : 'You haven\'t submitted any applications yet.')}
          </div>
        ) : (
          <div className="table-responsive app-table-responsive">
            <table className="applications-table app-table">
              <thead className="app-table-head">
                <tr className="app-table-row">
                  <th className="app-table-header-cell">Name of Applicant</th>
                  <th className="app-table-header-cell">Class(es)</th>
                  <th className="app-table-header-cell">Subject(s)</th>
                  <th className="app-table-header-cell">Contact</th>
                  <th className="app-table-header-cell">Certificate</th>
                  <th className="app-table-header-cell">Status</th>
                  <th className="app-table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {applications.map((app) => (
                  <tr key={app.id} className="app-table-row">
                    <td className="app-table-cell">{app.applicant_name}</td>
                    <td className="app-table-cell">{app.classes}</td>
                    <td className="app-table-cell">{app.subjects}</td>
                    <td className="app-table-cell">{app.contact}</td>
                    <td className="app-table-cell">
                      {app.certificate_url ? (
                        <a 
                          href={app.certificate_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="certificate-link app-certificate-link"
                        >
                          <FaDownload /> View
                        </a>
                      ) : (
                        <span className="no-certificate app-no-certificate">No certificate</span>
                      )}
                    </td>
                    <td className="app-table-cell">{getStatusBadge(app.status)}</td>
                    <td className="app-table-cell app-actions">
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
  };

  const renderUserApplication = () => {
    if (!userApplication) return null;

    return (
      <div className="user-application-section app-user-section">
        <div className="section-header app-section-header">
          <h3 className="app-section-title">My Submitted Application</h3>
          <div className="application-status app-status">
            Status: {getStatusBadge(userApplication.status)}
          </div>
        </div>
        
        <div className="user-application-card app-user-card">
          <div className="application-details app-details">
            <div className="detail-row app-detail-row">
              <div className="detail-label app-detail-label">Applicant Name:</div>
              <div className="detail-value app-detail-value">{userApplication.applicant_name}</div>
            </div>
            <div className="detail-row app-detail-row">
              <div className="detail-label app-detail-label">Class(es):</div>
              <div className="detail-value app-detail-value">
                {userApplication.classes || 'Pending assignment by Admin4'}
              </div>
            </div>
            <div className="detail-row app-detail-row">
              <div className="detail-label app-detail-label">Subject(s):</div>
              <div className="detail-value app-detail-value">{userApplication.subjects}</div>
            </div>
            <div className="detail-row app-detail-row">
              <div className="detail-label app-detail-label">Contact:</div>
              <div className="detail-value app-detail-value">{userApplication.contact}</div>
            </div>
            <div className="detail-row app-detail-row">
              <div className="detail-label app-detail-label">Certificate:</div>
              <div className="detail-value app-detail-value">
                {userApplication.certificate_url ? (
                  <a 
                    href={userApplication.certificate_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="certificate-link app-certificate-link"
                  >
                    <FaDownload /> View Certificate
                  </a>
                ) : (
                  <span className="no-certificate app-no-certificate">No certificate uploaded</span>
                )}
              </div>
            </div>
            <div className="detail-row app-detail-row">
              <div className="detail-label app-detail-label">Submitted:</div>
              <div className="detail-value app-detail-value">
                {new Date(userApplication.submitted_at).toLocaleDateString()}
              </div>
            </div>
            {userApplication.reviewed_at && (
              <div className="detail-row app-detail-row">
                <div className="detail-label app-detail-label">Reviewed:</div>
                <div className="detail-value app-detail-value">
                  {new Date(userApplication.reviewed_at).toLocaleDateString()}
                  {userApplication.reviewer_name && (
                    <span className="reviewer-info app-reviewer-info"> by {userApplication.reviewer_name}</span>
                  )}
                </div>
              </div>
            )}
            {userApplication.admin_comment && (
              <div className="detail-row app-detail-row">
                <div className="detail-label app-detail-label">Admin Comment:</div>
                <div className="detail-value admin-comment app-admin-comment">
                  {userApplication.admin_comment}
                </div>
              </div>
            )}
          </div>
          
          <div className="application-actions app-user-actions">
            {canEditApplication(userApplication) && (
              <button 
                className="action-btn edit app-user-action-btn app-user-edit-btn"
                onClick={() => handleEdit(userApplication)}
                title="Edit Application"
              >
                <FaEdit /> Edit
              </button>
            )}
            {canDeleteApplication(userApplication) && (
              <button 
                className="action-btn delete app-user-action-btn app-user-delete-btn"
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
      <SuccessMessage message={successMessage} />
    );
  };

  const renderExistingApplicationMessage = () => {
    if (!userApplication) return null;

    return (
      <div className="existing-application-message">
        <div className="message-content">
          <h3>Application Already Submitted</h3>
          <p>You have already submitted an application. You cannot submit multiple applications.</p>
          <div className="application-summary">
            <p><strong>Status:</strong> {getStatusBadge(userApplication.status)}</p>
            <p><strong>Submitted:</strong> {new Date(userApplication.submitted_at).toLocaleDateString()}</p>
            {userApplication.status === 'rejected' && (
              <p><strong>Note:</strong> If your application was rejected, you can contact Admin4 for more information.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const applicationContent = (
    <div className="application-container app-container">
      {renderSuccessMessage()}
      {renderExistingApplicationMessage()}
      {/* Show user's own application first if they have submitted one */}
      {userApplication && renderUserApplication()}
      
      {/* Show general applications table */}
      {renderApplicationsTable()}
      
      {/* Show form modal */}
      {showForm && renderApplicationForm()}
    </div>
  );

  // Show loading state if auth is still loading
  if (authLoading) {
    return (
      <div className="application-container app-container">
        <div className="loading app-loading">Loading user information...</div>
      </div>
    );
  }

  // currentUser already derived above
  
  // Show loading state if data is still loading
  if (loading) {
    return (
      <div className="application-container app-container">
        <div className="loading app-loading">Loading applications...</div>
      </div>
    );
  }

  // Use DisciplineSideTop for Discipline users, SideTop for others
  if (currentUser?.role === 'Discipline') {
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