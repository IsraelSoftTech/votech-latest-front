import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './AdminDisciplineCases.css';
import { FaExclamationTriangle, FaCalendarAlt, FaUser, FaBook, FaClock, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

export default function AdminDisciplineCases() {
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseModal, setShowCaseModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesData, studentsData, classesData] = await Promise.all([
        api.getDisciplineCases(),
        api.getDisciplineStudents(),
        api.getDisciplineClasses()
      ]);
      
      console.log('=== DISCIPLINE CASES DEBUG ===');
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
        console.log('Status:', firstCase.status, 'Type:', typeof firstCase.status);
        console.log('Student ID field:', firstCase.student_id, 'Student field:', firstCase.student, 'StudentId field:', firstCase.studentId, 'User ID field:', firstCase.user_id);
        console.log('Class ID field:', firstCase.class_id, 'Class field:', firstCase.class, 'ClassId field:', firstCase.classId, 'Course ID field:', firstCase.course_id);
        console.log('Date field:', firstCase.created_at, 'Date field:', firstCase.date, 'Recorded date field:', firstCase.recorded_date, 'Timestamp field:', firstCase.timestamp, 'Created date field:', firstCase.created_date);
        console.log('Description field:', firstCase.case_description, 'Description field:', firstCase.description, 'Offense field:', firstCase.offense, 'Reason field:', firstCase.reason, 'Details field:', firstCase.details);
      }
      
      if (studentsData && studentsData.length > 0) {
        console.log('First student structure:', studentsData[0]);
        console.log('First student keys:', Object.keys(studentsData[0]));
        console.log('First student values:', Object.values(studentsData[0]));
        
        // Log specific fields we're looking for
        const firstStudent = studentsData[0];
        console.log('👤 Student Field Analysis:');
        console.log('ID field:', firstStudent.id, 'Student ID field:', firstStudent.student_id, 'User ID field:', firstStudent.user_id);
        console.log('Name field:', firstStudent.full_name, 'Name field:', firstStudent.name, 'Student name field:', firstStudent.student_name, 'First+Last:', firstStudent.first_name + ' ' + firstStudent.last_name);
      }
      
      if (classesData && classesData.length > 0) {
        console.log('First class structure:', classesData[0]);
        console.log('First class keys:', Object.keys(classesData[0]));
        console.log('First class values:', Object.values(classesData[0]));
        
        // Log specific fields we're looking for
        const firstClass = classesData[0];
        console.log('🏫 Class Field Analysis:');
        console.log('ID field:', firstClass.id, 'Class ID field:', firstClass.class_id, 'Course ID field:', firstClass.course_id);
        console.log('Name field:', firstClass.name, 'Class name field:', firstClass.class_name, 'Course name field:', firstClass.course_name, 'Title field:', firstClass.title);
      }
      
      setCases(casesData || []);
      setStudents(studentsData || []);
      setClasses(classesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setCases([]);
      setStudents([]);
      setClasses([]);
    }
    setLoading(false);
  };

  const getStudentName = (studentId) => {
    console.log('🔍 Looking for student with ID:', studentId);
    console.log('📚 Available students:', students);
    
    if (!studentId) {
      console.log('❌ No student ID provided');
      return 'No Student ID';
    }
    
    // Try multiple possible field names
    const student = students.find(s => 
      s.id === studentId || 
      s.student_id === studentId || 
      s.user_id === studentId ||
      s.studentId === studentId
    );
    
    if (student) {
      console.log('✅ Found student:', student);
      const name = student.full_name || student.name || student.student_name || student.first_name + ' ' + student.last_name;
      console.log('📝 Using name:', name);
      return name;
    } else {
      console.log('❌ Student not found for ID:', studentId);
      return 'Unknown Student';
    }
  };

  const getClassName = (classId) => {
    console.log('🔍 Looking for class with ID:', classId);
    console.log('🏫 Available classes:', classes);
    
    if (!classId) {
      console.log('❌ No class ID provided');
      return 'No Class ID';
    }
    
    // Try multiple possible field names
    const classItem = classes.find(c => 
      c.id === classId || 
      c.class_id === classId || 
      c.course_id === classId ||
      c.classId === classId
    );
    
    if (classItem) {
      console.log('✅ Found class:', classItem);
      const name = classItem.name || classItem.class_name || classItem.course_name || classItem.title;
      console.log('📝 Using name:', name);
      return name;
    } else {
      console.log('❌ Class not found for ID:', classId);
      return 'Unknown Class';
    }
  };

  const getStatusIcon = (status) => {
    console.log('Processing status:', status);
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'resolved':
        return <FaCheckCircle className="status-icon resolved" />;
      case 'pending':
      case 'pending':
        return <FaClock className="status-icon pending" />;
      case 'escalated':
      case 'escalated':
        return <FaExclamationTriangle className="status-icon escalated" />;
      case 'not resolved':
      case 'not_resolved':
      case 'unresolved':
        return <FaTimesCircle className="status-icon default" />;
      default:
        return <FaTimesCircle className="status-icon default" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'resolved':
        return '#28a745';
      case 'pending':
      case 'pending':
        return '#ffc107';
      case 'escalated':
      case 'escalated':
        return '#dc3545';
      case 'not resolved':
      case 'not_resolved':
      case 'unresolved':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'UNKNOWN';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'resolved':
        return 'RESOLVED';
      case 'pending':
        return 'PENDING';
      case 'escalated':
        return 'ESCALATED';
      case 'not resolved':
      case 'not_resolved':
      case 'unresolved':
        return 'NOT RESOLVED';
      default:
        return status.toUpperCase();
    }
  };

  const formatDate = (dateString) => {
    console.log('📅 Formatting date:', dateString);
    
    if (!dateString || dateString === 'N/A' || dateString === 'null' || dateString === 'undefined') {
      console.log('❌ No valid date provided');
      return 'N/A';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('❌ Invalid date format:', dateString);
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log('✅ Date formatted successfully:', formatted);
      return formatted;
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      return 'Date Error';
    }
  };

  const handleViewCase = (caseItem) => {
    setSelectedCase(caseItem);
    setShowCaseModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Loading disciplinary cases...</p>
      </div>
    );
  }

  return (
    <div className="admin-discipline-container">
      <div className="page-header">
        <h1>Disciplinary Cases</h1>
        <p>View all recorded disciplinary cases in the system</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">
            <FaExclamationTriangle />
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
            <h3>{cases.filter(c => c.status === 'pending').length}</h3>
            <p>Pending Cases</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon resolved">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{cases.filter(c => c.status === 'resolved').length}</h3>
            <p>Resolved Cases</p>
          </div>
        </div>
      </div>

      <div className="cases-table-container">
        <div className="table-header">
          <h2>Case Records</h2>
        </div>
        
        {cases.length === 0 ? (
          <div className="no-cases">
            <FaExclamationTriangle />
            <p>No disciplinary cases recorded yet.</p>
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="case-card" onClick={() => handleViewCase(caseItem)}>
                <div className="case-header">
                  <div className="case-status">
                    {getStatusIcon(caseItem.status)}
                    <span 
                      className="status-text"
                      style={{ color: getStatusColor(caseItem.status) }}
                    >
                      {getStatusText(caseItem.status)}
                    </span>
                  </div>
                  <div className="case-date">
                    <FaCalendarAlt />
                    <span>{formatDate(caseItem.recorded_at || caseItem.created_at || caseItem.date || caseItem.timestamp || caseItem.created_date)}</span>
                  </div>
                </div>
                
                <div className="case-content">
                  <div className="case-info">
                    <div className="info-item">
                      <FaUser />
                      <span>{caseItem.student_name || caseItem.student_id || caseItem.student || caseItem.studentId || caseItem.user_id || 'No Student'}</span>
                    </div>
                    <div className="info-item">
                      <FaBook />
                      <span>{caseItem.class_name || caseItem.class_id || caseItem.class || caseItem.classId || caseItem.course_id || 'No Class'}</span>
                    </div>
                  </div>
                  
                  <div className="case-description">
                    <p>{caseItem.case_description || caseItem.description || caseItem.offense || caseItem.reason || caseItem.details || 'No description available'}</p>
                  </div>
                  
                  {caseItem.resolution_notes && (
                    <div className="resolution-notes">
                      <strong>Resolution:</strong>
                      <p>{caseItem.resolution_notes}</p>
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
                    <label>Status:</label>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedCase.status) }}>
                      {getStatusText(selectedCase.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Student:</label>
                    <span>{selectedCase.student_name || selectedCase.student_id || selectedCase.student || selectedCase.studentId || selectedCase.user_id || 'No Student'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Class:</label>
                    <span>{selectedCase.class_name || selectedCase.class_id || selectedCase.class || selectedCase.classId || selectedCase.course_id || 'No Class'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Recorded:</label>
                    <span>{formatDate(selectedCase.recorded_at || selectedCase.created_at || selectedCase.date || selectedCase.timestamp || selectedCase.created_date)}</span>
                  </div>
                  {(selectedCase.resolved_at || selectedCase.updated_at || selectedCase.modified_date || selectedCase.updated_date) && (
                    <div className="detail-item">
                      <label>Resolved:</label>
                      <span>{formatDate(selectedCase.resolved_at || selectedCase.updated_at || selectedCase.modified_date || selectedCase.updated_date)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="detail-section">
                <h3>Case Description</h3>
                <div className="description-box">
                  <p>{selectedCase.case_description || selectedCase.description || selectedCase.offense || selectedCase.reason || selectedCase.details || 'No description available'}</p>
                </div>
              </div>
              
              {selectedCase.resolution_notes && (
                <div className="detail-section">
                  <h3>Resolution Notes</h3>
                  <div className="description-box">
                    <p>{selectedCase.resolution_notes}</p>
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