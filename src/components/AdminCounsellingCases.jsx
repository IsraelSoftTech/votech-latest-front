import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminCounsellingCases.css';
import { FaUser, FaBook, FaCalendarAlt, FaClock, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaSpinner, FaEye, FaFileAlt, FaEnvelope } from 'react-icons/fa';

export default function AdminCounsellingCases() {
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseSessions, setCaseSessions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesData, studentsData, classesData, adminsData] = await Promise.all([
        api.getCases(),
        api.getStudentsForCases(),
        api.getClassesForCases(),
        api.getAdminsForReports()
      ]);
      
      console.log('=== COUNSELLING CASES DEBUG ===');
      console.log('Raw cases data:', casesData);
      console.log('Raw students data:', studentsData);
      console.log('Raw classes data:', classesData);
      
      if (casesData && casesData.length > 0) {
        console.log('First case structure:', casesData[0]);
        console.log('First case keys:', Object.keys(casesData[0]));
        console.log('First case values:', Object.values(casesData[0]));
        
        // Log specific fields we're looking for
        const firstCase = casesData[0];
        console.log('🔍 Field Analysis:');
        console.log('Student ID field:', firstCase.student_id, 'Student field:', firstCase.student, 'Student name field:', firstCase.student_name);
        console.log('Class ID field:', firstCase.class_id, 'Class field:', firstCase.class, 'Class name field:', firstCase.class_name);
        console.log('Date field:', firstCase.created_at, 'Date field:', firstCase.date, 'Recorded date field:', firstCase.recorded_date);
        console.log('Description field:', firstCase.issue_description, 'Description field:', firstCase.description, 'Issue field:', firstCase.issue);
      }
      
      setCases(casesData || []);
      setStudents(studentsData || []);
      setClasses(classesData || []);
      setAdmins(adminsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setCases([]);
      setStudents([]);
      setClasses([]);
      setAdmins([]);
    }
    setLoading(false);
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <FaExclamationTriangle className="priority-icon high" />;
      case 'medium':
        return <FaClock className="priority-icon medium" />;
      case 'low':
        return <FaCheckCircle className="priority-icon low" />;
      default:
        return <FaTimesCircle className="priority-icon default" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewCase = async (caseItem) => {
    setSelectedCase(caseItem);
    setShowCaseModal(true);
    
    // Load case sessions
    try {
      const sessions = await api.getCaseSessions(caseItem.id);
      setCaseSessions(sessions);
    } catch (error) {
      console.error('Error loading case sessions:', error);
      setCaseSessions([]);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Loading counselling cases...</p>
      </div>
    );
  }

  return (
    <div className="admin-counselling-container">
      <div className="page-header">
        <h1>Counselling Cases</h1>
        <p>View all recorded counselling cases in the system</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">
            <FaFileAlt />
          </div>
          <div className="stat-content">
            <h3>{cases.length}</h3>
            <p>Total Cases</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <FaClock />
          </div>
          <div className="stat-content">
            <h3>{cases.filter(c => c.status === 'open').length}</h3>
            <p>Open Cases</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon resolved">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{cases.filter(c => c.status === 'closed').length}</h3>
            <p>Closed Cases</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon high">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <h3>{cases.filter(c => c.priority === 'high').length}</h3>
            <p>High Priority</p>
          </div>
        </div>
      </div>

      <div className="cases-table-container">
        <div className="table-header">
          <h2>Case Records</h2>
        </div>
        
        {cases.length === 0 ? (
          <div className="no-cases">
            <FaFileAlt />
            <p>No counselling cases recorded yet.</p>
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="case-card" onClick={() => handleViewCase(caseItem)}>
                <div className="case-header">
                  <div className="case-priority">
                    {getPriorityIcon(caseItem.priority)}
                    <span 
                      className="priority-text"
                      style={{ color: getPriorityColor(caseItem.priority) }}
                    >
                      {caseItem.priority?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="case-date">
                    <FaCalendarAlt />
                    <span>{formatDate(caseItem.created_at)}</span>
                  </div>
                </div>
                
                <div className="case-content">
                  <div className="case-info">
                    <div className="info-item">
                      <FaUser />
                      <span>{caseItem.student_name || caseItem.student || getStudentName(caseItem.student_id) || 'No Student'}</span>
                    </div>
                    <div className="info-item">
                      <FaBook />
                      <span>{caseItem.class_name || caseItem.class || getClassName(caseItem.class_id) || 'No Class'}</span>
                    </div>
                    <div className="info-item">
                      <FaEnvelope />
                      <span>{caseItem.issue_type || 'General'}</span>
                    </div>
                  </div>
                  
                  <div className="case-description">
                    <p>{caseItem.issue_description || caseItem.description || caseItem.issue || 'No description available'}</p>
                  </div>
                  
                  {caseItem.notes && (
                    <div className="case-notes">
                      <strong>Notes:</strong>
                      <p>{caseItem.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Case Detail Modal */}
      {showCaseModal && selectedCase && (
        <div className="modal-overlay" onClick={() => setShowCaseModal(false)}>
          <div className="case-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Case Details</h2>
              <button 
                className="close-button"
                onClick={() => setShowCaseModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="detail-section">
                <h3>Case Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Priority:</label>
                    <span className="priority-badge" style={{ backgroundColor: getPriorityColor(selectedCase.priority) }}>
                      {selectedCase.priority?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`status-badge ${selectedCase.status}`}>
                      {selectedCase.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Student:</label>
                    <span>{selectedCase.student_name || selectedCase.student || getStudentName(selectedCase.student_id) || 'No Student'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Class:</label>
                    <span>{selectedCase.class_name || selectedCase.class || getClassName(selectedCase.class_id) || 'No Class'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Issue Type:</label>
                    <span>{selectedCase.issue_type || 'General'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created:</label>
                    <span>{formatDate(selectedCase.created_at || selectedCase.date || selectedCase.recorded_date)}</span>
                  </div>
                  {(selectedCase.updated_at || selectedCase.modified_date) && (
                    <div className="detail-item">
                      <label>Last Updated:</label>
                      <span>{formatDate(selectedCase.updated_at || selectedCase.modified_date)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="detail-section">
                <h3>Issue Description</h3>
                <div className="description-box">
                  <p>{selectedCase.issue_description || selectedCase.description || selectedCase.issue || 'No description available'}</p>
                </div>
              </div>
              
              {selectedCase.notes && (
                <div className="detail-section">
                  <h3>Additional Notes</h3>
                  <div className="description-box">
                    <p>{selectedCase.notes}</p>
                  </div>
                </div>
              )}

              {caseSessions.length > 0 && (
                <div className="detail-section">
                  <h3>Counselling Sessions ({caseSessions.length})</h3>
                  <div className="sessions-list">
                    {caseSessions.map((session, index) => (
                      <div key={session.id || index} className="session-item">
                        <div className="session-header">
                          <div className="session-type">
                            <FaEye />
                            <span>{session.session_type || 'General Session'}</span>
                          </div>
                          <div className="session-date">
                            {formatDate(session.session_date)}
                          </div>
                        </div>
                        <div className="session-notes">
                          <p>{session.session_notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 