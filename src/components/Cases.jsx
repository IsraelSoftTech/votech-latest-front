import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideTop from './SideTop';
import api from '../services/api';
import { FaPlus, FaEye, FaEdit, FaTrash, FaCalendarAlt, FaFileAlt, FaEnvelope, FaClock, FaUser, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import './Cases.css';
import SuccessMessage from './SuccessMessage';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({
    student_id: '',
    class_id: '',
    issue_type: '',
    issue_description: '',
    priority: 'medium',
    notes: ''
  });

  const [sessionData, setSessionData] = useState({
    session_date: '',
    session_time: '',
    session_type: '',
    session_notes: ''
  });

  const [reportData, setReportData] = useState({
    report_type: 'progress',
    report_content: '',
    sent_to: ''
  });

  useEffect(() => {
    fetchCases();
    fetchDropdownData();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.getCases();
      setCases(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch cases');
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      console.log('Fetching dropdown data...');
      const [studentsData, classesData, adminsData] = await Promise.all([
        api.getStudentsForCases(),
        api.getClassesForCases(),
        api.getAdminsForReports()
      ]);
      console.log('Students data:', studentsData);
      console.log('Classes data:', classesData);
      console.log('Admins data:', adminsData);
      setStudents(studentsData);
      setClasses(classesData);
      setAdmins(adminsData);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const fetchCaseSessions = async (caseId) => {
    try {
      const data = await api.getCaseSessions(caseId);
      setSessions(data);
    } catch (err) {
      console.error('Error fetching case sessions:', err);
    }
  };

  const handleAddCase = async (e) => {
    e.preventDefault();
    try {
      await api.createCase(formData);
      setShowAddModal(false);
      setFormData({
        student_id: '',
        class_id: '',
        issue_type: '',
        issue_description: '',
        priority: 'medium',
        notes: ''
      });
      fetchCases();
    } catch (err) {
      setError('Failed to create case');
      console.error('Error creating case:', err);
    }
  };

  const handleUpdateCase = async (e) => {
    e.preventDefault();
    try {
      await api.updateCase(selectedCase.id, formData);
      setShowEditModal(false);
      setSelectedCase(null);
      setFormData({
        student_id: '',
        class_id: '',
        issue_type: '',
        issue_description: '',
        priority: 'medium',
        notes: ''
      });
      fetchCases();
    } catch (err) {
      setError('Failed to update case');
      console.error('Error updating case:', err);
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      try {
        await api.deleteCase(caseId);
        fetchCases();
      } catch (err) {
        setError('Failed to delete case');
        console.error('Error deleting case:', err);
      }
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await api.createCaseSession(selectedCase.id, sessionData);
      setShowSessionModal(false);
      setSessionData({
        session_date: '',
        session_time: '',
        session_type: '',
        session_notes: ''
      });
      fetchCaseSessions(selectedCase.id);
      fetchCases(); // Refresh cases to update session counts
    } catch (err) {
      setError('Failed to create session');
      console.error('Error creating session:', err);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    try {
      const response = await api.sendCaseReport(selectedCase.id, reportData);
      setShowReportModal(false);
      setReportData({
        report_type: 'progress',
        report_content: '',
        sent_to: ''
      });
      setSelectedCase(null);
      
      // Show standardized success toast
      setSuccess('success');
      
      // Navigate to messages to show the sent report
      navigate('/psycho-messages');
    } catch (err) {
      setError('Failed to send report');
      console.error('Error sending report:', err);
    }
  };

  const openViewModal = async (caseItem) => {
    setSelectedCase(caseItem);
    await fetchCaseSessions(caseItem.id);
    setShowViewModal(true);
  };

  const openEditModal = (caseItem) => {
    setSelectedCase(caseItem);
    setFormData({
      student_id: caseItem.student_id || '',
      class_id: caseItem.class_id || '',
      issue_type: caseItem.issue_type || '',
      issue_description: caseItem.issue_description || '',
      priority: caseItem.priority || 'medium',
      notes: caseItem.notes || ''
    });
    setShowEditModal(true);
  };

  const openSessionModal = (caseItem) => {
    setSelectedCase(caseItem);
    setShowSessionModal(true);
  };

  const openReportModal = (caseItem) => {
    setSelectedCase(caseItem);
    setShowReportModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#e53e3e';
      case 'pending': return '#d69e2e';
      case 'resolved': return '#38a169';
      case 'closed': return '#718096';
      default: return '#718096';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#e53e3e';
      case 'high': return '#dd6b20';
      case 'medium': return '#d69e2e';
      case 'low': return '#38a169';
      default: return '#d69e2e';
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.student_id === studentId);
    return student ? student.full_name : 'Unknown Student';
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'Unknown Class';
  };

  const getAdminName = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    return admin ? admin.name : 'Unknown Admin';
  };

  if (loading) {
    return (
      <SideTop>
        <div className="cases-loading">
          <FaSpinner className="spinner" />
          <p>Loading cases...</p>
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="cases-container">
        <div className="cases-header">
          <h1>Counseling Cases</h1>
          <button 
            className="add-case-btn"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus /> Add Case
          </button>
        </div>

        {success && (
          <SuccessMessage
            message={success}
            onClose={() => setSuccess('')}
          />
        )}

        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <div className="cases-grid">
          {cases.map((caseItem) => (
            <div key={caseItem.id} className="case-card">
              <div className="case-header">
                <h3>{caseItem.case_number} - {getStudentName(caseItem.student_id)}</h3>
                <div className="case-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(caseItem.status) }}
                  >
                    {caseItem.status}
                  </span>
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(caseItem.priority) }}
                  >
                    {caseItem.priority}
                  </span>
                </div>
              </div>
              
              <div className="case-details">
                <p><strong>Issue:</strong> {caseItem.issue_type}</p>
                <p><strong>Student ID:</strong> {caseItem.student_id}</p>
                <p><strong>Class:</strong> {getClassName(caseItem.class_id)}</p>
                <p><strong>Started:</strong> {new Date(caseItem.started_date).toLocaleDateString()}</p>
                <p><strong>Sessions:</strong> {caseItem.sessions_completed} completed, {caseItem.sessions_scheduled} scheduled</p>
                {caseItem.notes && <p><strong>Notes:</strong> {caseItem.notes}</p>}
              </div>

              <div className="case-actions">
                <button 
                  className="action-btn view-btn"
                  onClick={() => openViewModal(caseItem)}
                >
                  <FaEye /> View
                </button>
                <button 
                  className="action-btn edit-btn"
                  onClick={() => openEditModal(caseItem)}
                >
                  <FaEdit /> Edit
                </button>
                <button 
                  className="action-btn session-btn"
                  onClick={() => openSessionModal(caseItem)}
                >
                  <FaCalendarAlt /> Session
                </button>
                <button 
                  className="action-btn report-btn"
                  onClick={() => openReportModal(caseItem)}
                >
                  <FaFileAlt /> Report
                </button>
                <button 
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteCase(caseItem.id)}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {cases.length === 0 && !loading && (
          <div className="no-cases">
            <FaUser />
            <h3>No cases found</h3>
            <p>Start by creating your first counseling case.</p>
            <button 
              className="add-case-btn"
              onClick={() => setShowAddModal(true)}
            >
              <FaPlus /> Add Your First Case
            </button>
          </div>
        )}
      </div>

      {/* Add Case Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Case</h2>
              <button onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddCase}>
              <div className="form-group">
                <label>Student *</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.full_name} - {student.student_id} ({student.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Class</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                >
                  <option value="">Select Class</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Issue Type *</label>
                <input
                  type="text"
                  value={formData.issue_type}
                  onChange={(e) => setFormData({...formData, issue_type: e.target.value})}
                  placeholder="e.g., Academic Stress, Peer Pressure"
                  required
                />
              </div>

              <div className="form-group">
                <label>Issue Description *</label>
                <textarea
                  value={formData.issue_description}
                  onChange={(e) => setFormData({...formData, issue_description: e.target.value})}
                  placeholder="Describe the issue in detail..."
                  required
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit">Create Case</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Case Modal */}
      {showViewModal && selectedCase && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h2>Case Details: {selectedCase.case_number}</h2>
              <button onClick={() => setShowViewModal(false)}>&times;</button>
            </div>
            <div className="case-view-content">
              <div className="case-info">
                <h3>Case Information</h3>
                <div className="info-grid">
                  <div><strong>Case Number:</strong> {selectedCase.case_number}</div>
                  <div><strong>Student:</strong> {getStudentName(selectedCase.student_id)}</div>
                  <div><strong>Student ID:</strong> {selectedCase.student_id}</div>
                  <div><strong>Class:</strong> {getClassName(selectedCase.class_id)}</div>
                  <div><strong>Issue Type:</strong> {selectedCase.issue_type}</div>
                  <div><strong>Status:</strong> 
                    <span className="status-badge" style={{backgroundColor: getStatusColor(selectedCase.status)}}>
                      {selectedCase.status}
                    </span>
                  </div>
                  <div><strong>Priority:</strong> 
                    <span className="priority-badge" style={{backgroundColor: getPriorityColor(selectedCase.priority)}}>
                      {selectedCase.priority}
                    </span>
                  </div>
                  <div><strong>Started Date:</strong> {new Date(selectedCase.started_date).toLocaleDateString()}</div>
                  {selectedCase.resolved_date && (
                    <div><strong>Resolved Date:</strong> {new Date(selectedCase.resolved_date).toLocaleDateString()}</div>
                  )}
                  <div><strong>Sessions:</strong> {selectedCase.sessions_completed} completed, {selectedCase.sessions_scheduled} scheduled</div>
                </div>
                
                <div className="issue-description">
                  <h4>Issue Description</h4>
                  <p>{selectedCase.issue_description}</p>
                </div>

                {selectedCase.notes && (
                  <div className="case-notes">
                    <h4>Notes</h4>
                    <p>{selectedCase.notes}</p>
                  </div>
                )}
              </div>

              <div className="case-sessions">
                <h3>Sessions</h3>
                {sessions.length > 0 ? (
                  <div className="sessions-list">
                    {sessions.map(session => (
                      <div key={session.id} className="session-item">
                        <div className="session-header">
                          <span className="session-date">
                            {new Date(session.session_date).toLocaleDateString()}
                          </span>
                          <span className="session-time">{session.session_time}</span>
                          <span className={`session-status ${session.status}`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="session-details">
                          <p><strong>Type:</strong> {session.session_type}</p>
                          {session.session_notes && (
                            <p><strong>Notes:</strong> {session.session_notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No sessions scheduled yet.</p>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Case Modal */}
      {showEditModal && selectedCase && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Case: {selectedCase.case_number}</h2>
              <button onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateCase}>
              <div className="form-group">
                <label>Issue Type *</label>
                <input
                  type="text"
                  value={formData.issue_type}
                  onChange={(e) => setFormData({...formData, issue_type: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Issue Description *</label>
                <textarea
                  value={formData.issue_description}
                  onChange={(e) => setFormData({...formData, issue_description: e.target.value})}
                  required
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || selectedCase.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Update Case</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && selectedCase && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Schedule Session: {selectedCase.case_number}</h2>
              <button onClick={() => setShowSessionModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label>Session Date *</label>
                <input
                  type="date"
                  value={sessionData.session_date}
                  onChange={(e) => setSessionData({...sessionData, session_date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Session Time *</label>
                <input
                  type="time"
                  value={sessionData.session_time}
                  onChange={(e) => setSessionData({...sessionData, session_time: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Session Type *</label>
                <select
                  value={sessionData.session_type}
                  onChange={(e) => setSessionData({...sessionData, session_type: e.target.value})}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Initial Consultation">Initial Consultation</option>
                  <option value="Follow-up Session">Follow-up Session</option>
                  <option value="Group Therapy">Group Therapy</option>
                  <option value="Family Session">Family Session</option>
                  <option value="Crisis Intervention">Crisis Intervention</option>
                  <option value="Assessment">Assessment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Session Notes</label>
                <textarea
                  value={sessionData.session_notes}
                  onChange={(e) => setSessionData({...sessionData, session_notes: e.target.value})}
                  placeholder="Session notes..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowSessionModal(false)}>
                  Cancel
                </button>
                <button type="submit">Schedule Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedCase && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Send Report: {selectedCase.case_number}</h2>
              <button onClick={() => setShowReportModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSendReport}>
              <div className="form-group">
                <label>Report Type</label>
                <select
                  value={reportData.report_type}
                  onChange={(e) => setReportData({...reportData, report_type: e.target.value})}
                >
                  <option value="progress">Progress Report</option>
                  <option value="assessment">Assessment Report</option>
                  <option value="final">Final Report</option>
                  <option value="crisis">Crisis Report</option>
                </select>
              </div>

              <div className="form-group">
                <label>Send To (Admin1 Only) *</label>
                <select
                  value={reportData.sent_to}
                  onChange={(e) => setReportData({...reportData, sent_to: e.target.value})}
                  required
                >
                  <option value="">Select Admin1 User</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} ({admin.username}) - {admin.role}
                    </option>
                  ))}
                </select>
                <small style={{color: '#666', fontSize: '12px'}}>
                  Only Admin1 users can receive case reports. A comprehensive text report will be sent with all case details.
                </small>
              </div>

              <div className="form-group">
                <label>Report Content *</label>
                <textarea
                  value={reportData.report_content}
                  onChange={(e) => setReportData({...reportData, report_content: e.target.value})}
                  placeholder="Write your detailed report here. This will be included in the comprehensive report along with all case details, sessions, and student information..."
                  required
                  rows="6"
                />
                <small style={{color: '#666', fontSize: '12px'}}>
                  This content will be added to the comprehensive text report that includes all case details, sessions, and student information.
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowReportModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  <FaEnvelope /> Send Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SideTop>
  );
} 