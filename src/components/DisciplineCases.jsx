import React, { useEffect, useState } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import './DisciplineCases.css';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

export default function DisciplineCases() {
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [caseStats, setCaseStats] = useState([]);
  const [showStats, setShowStats] = useState(false);
  
  // Get current user info
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin = authUser?.role?.startsWith('Admin');
  
  // Form state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'teachers'
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  
  // Status update state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading discipline data...');
      
      // Load data one by one to debug any issues
      try {
        const casesData = await api.getDisciplineCases();
        console.log('✓ Discipline cases data loaded:', casesData);
        setCases(casesData);
      } catch (error) {
        console.error('✗ Error loading cases:', error);
      }
      
      try {
        const studentsData = await api.getDisciplineStudents();
        console.log('✓ Discipline students data loaded:', studentsData);
        setStudents(studentsData);
      } catch (error) {
        console.error('✗ Error loading students:', error);
      }
      
      try {
        const classesData = await api.getDisciplineClasses();
        console.log('✓ Discipline classes data loaded:', classesData);
        setClasses(classesData);
      } catch (error) {
        console.error('✗ Error loading classes:', error);
      }
      
      try {
        const teachersData = await api.getDisciplineTeachers();
        console.log('✓ Discipline teachers data loaded:', teachersData);
        setTeachers(teachersData);
      } catch (error) {
        console.error('✗ Error loading teachers:', error);
      }
      
      // Load case statistics for Admin users
      if (isAdmin) {
        try {
          const statsData = await api.getDisciplineCaseStats();
          setCaseStats(statsData);
        } catch (error) {
          console.error('Error loading case statistics:', error);
        }
      }
    } catch (error) {
      console.error('Error in loadData:', error);
    }
    setLoading(false);
  };

  const handleRecordCase = async () => {
    if (activeTab === 'students') {
      if (!selectedStudent || !selectedClass || !caseDescription.trim()) {
        alert('Please fill in all fields for student case');
        return;
      }
    } else {
      if (!selectedTeacher || !caseDescription.trim()) {
        alert('Please fill in all fields for teacher case');
        return;
      }
    }

    setLoading(true);
    try {
      const caseData = activeTab === 'students' 
        ? {
            student_id: selectedStudent,
            class_id: selectedClass,
            case_description: caseDescription.trim(),
            case_type: 'student'
          }
        : {
            teacher_id: selectedTeacher,
            case_description: caseDescription.trim(),
            case_type: 'teacher'
          };

      await api.createDisciplineCase(caseData);
      
      setSuccessMessage(`Discipline case for ${activeTab === 'students' ? 'student' : 'teacher'} recorded successfully`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset form and close modal
      setSelectedStudent('');
      setSelectedTeacher('');
      setSelectedClass('');
      setCaseDescription('');
      setShowRecordModal(false);
      setActiveTab('students');
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error recording case:', error);
      alert('Failed to record case. Please try again.');
    }
    setLoading(false);
  };

  const handleStatusUpdate = async () => {
    if (!editingCase || !newStatus) return;

    setLoading(true);
    try {
      await api.updateDisciplineCaseStatus(editingCase.id, {
        status: newStatus,
        resolution_notes: resolutionNotes.trim() || null
      });
      
      setSuccessMessage('Case status updated successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset and close modal
      setEditingCase(null);
      setNewStatus('');
      setResolutionNotes('');
      setShowStatusModal(false);
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
    setLoading(false);
  };

  const handleDeleteCase = async (caseId) => {
    if (!confirm('Are you sure you want to delete this case?')) return;

    setLoading(true);
    try {
      await api.deleteDisciplineCase(caseId);
      setSuccessMessage('Case deleted successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      loadData();
    } catch (error) {
      console.error('Error deleting case:', error);
      alert('Failed to delete case. Please try again.');
    }
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL discipline cases? This action cannot be undone.')) return;

    setLoading(true);
    try {
      await api.deleteAllDisciplineCases();
      setSuccessMessage('All cases deleted successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowDeleteConfirm(false);
      loadData();
    } catch (error) {
      console.error('Error deleting all cases:', error);
      alert('Failed to delete all cases. Please try again.');
    }
    setLoading(false);
  };

  const openStatusModal = (caseItem) => {
    setEditingCase(caseItem);
    setNewStatus(caseItem.status);
    setResolutionNotes(caseItem.resolution_notes || '');
    setShowStatusModal(true);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset form fields when switching tabs
    setSelectedStudent('');
    setSelectedTeacher('');
    setSelectedClass('');
    setCaseDescription('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`status-badge ${status === 'resolved' ? 'resolved' : 'not-resolved'}`}>
        {status === 'resolved' ? <FaCheck /> : <FaExclamationTriangle />}
        {status === 'resolved' ? 'Resolved' : 'Not Resolved'}
      </span>
    );
  };

  return (
    <div className="discipline-cases-container">
      {showSuccess && <SuccessMessage message={successMessage} />}

      <div className="dc-header">
        <div className="dc-title-section">
          <h1>Disciplinary Cases Management</h1>
          <p>Record and manage student and teacher disciplinary cases</p>
        </div>
        <div className="dc-actions">
          {isAdmin && (
            <button 
              className="dc-ghost-btn"
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? 'Hide' : 'Show'} Statistics
            </button>
          )}
          <button 
            className="dc-primary-btn"
            onClick={() => {
              setActiveTab('students');
              setShowRecordModal(true);
            }}
            disabled={loading}
          >
            <FaPlus /> Record Student Case
          </button>
          <button 
            className="dc-primary-btn"
            onClick={() => {
              setActiveTab('teachers');
              setShowRecordModal(true);
            }}
            disabled={loading}
          >
            <FaPlus /> Record Teacher Case
          </button>
          <button 
            className="dc-danger-btn"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading || cases.length === 0}
          >
            <FaTrash /> Delete All
          </button>
        </div>
      </div>

      <div className="dc-stats">
        <div className="dc-stat-card">
          <div className="stat-number">{cases.length}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="dc-stat-card">
          <div className="stat-number">{cases.filter(c => c.status === 'resolved').length}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="dc-stat-card">
          <div className="stat-number">{cases.filter(c => c.status === 'not resolved').length}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>
      
      {/* Debug Information */}
      <div className="dc-debug-info" style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '5px', fontSize: '12px'}}>
        <strong>Debug Info:</strong> Students: {students.length} | Classes: {classes.length} | Teachers: {teachers.length} | Cases: {cases.length} | 
        Current User Role: {authUser?.role} | Is Admin: {isAdmin ? 'Yes' : 'No'}
      </div>

      {/* Admin Statistics Overview */}
      {isAdmin && showStats && caseStats.length > 0 && (
        <div className="dc-admin-stats">
          <h3>Cases by User (Admin Overview)</h3>
          <div className="dc-stats-grid">
            {caseStats.map((stat, index) => (
              <div key={index} className="dc-stat-item">
                <div className="stat-user">
                  <strong>{stat.recorded_by_name || stat.recorded_by_username}</strong>
                  <span className="stat-role">({stat.recorded_by_role})</span>
                </div>
                <div className="stat-numbers">
                  <span className="stat-total">{stat.total_cases}</span>
                  <span className="stat-resolved">{stat.resolved_cases}</span>
                  <span className="stat-pending">{stat.pending_cases}</span>
                </div>
                <div className="stat-labels">
                  <span>Total</span>
                  <span>Resolved</span>
                  <span>Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dc-content">
        {loading ? (
          <div className="dc-loading">Loading...</div>
        ) : cases.length === 0 ? (
          <div className="dc-empty">
            <FaExclamationTriangle />
            <h3>No Cases Recorded</h3>
            <p>Start by recording a new disciplinary case</p>
          </div>
        ) : (
          <div className="dc-table-wrapper">
            <table className="dc-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Type</th>
                  <th>Person</th>
                  <th>Class</th>
                  <th>Case Description</th>
                  <th>Status</th>
                  <th>Recorded</th>
                  <th>Recorded By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem, index) => (
                  <tr key={caseItem.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className={`case-type-badge ${caseItem.case_type || 'student'}`}>
                        {caseItem.case_type === 'teacher' ? 'Teacher' : 'Student'}
                      </span>
                    </td>
                    <td>
                      {caseItem.case_type === 'teacher' ? (
                        <div className="teacher-info">
                          <div className="teacher-name">{caseItem.teacher_name}</div>
                          <div className="teacher-role">{caseItem.teacher_role}</div>
                        </div>
                      ) : (
                        <div className="student-info">
                          <div className="student-name">{caseItem.student_name}</div>
                          <div className="student-sex">{caseItem.student_sex}</div>
                        </div>
                      )}
                    </td>
                    <td>{caseItem.class_name || 'N/A'}</td>
                    <td className="case-description">
                      <div className="description-text">{caseItem.case_description}</div>
                      {caseItem.resolution_notes && (
                        <div className="resolution-notes">
                          <strong>Resolution:</strong> {caseItem.resolution_notes}
                        </div>
                      )}
                    </td>
                    <td>{getStatusBadge(caseItem.status)}</td>
                    <td>
                      <div className="date-info">
                        <div>Recorded: {formatDate(caseItem.recorded_at)}</div>
                        {caseItem.resolved_at && (
                          <div>Resolved: {formatDate(caseItem.resolved_at)}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="recorded-by-info">
                        <div className="recorded-by-name">{caseItem.recorded_by_name || caseItem.recorded_by_username}</div>
                        <div className="recorded-by-role">{caseItem.recorded_by_role}</div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="dc-action-btn edit"
                          onClick={() => openStatusModal(caseItem)}
                          title="Update Status"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="dc-action-btn delete"
                          onClick={() => handleDeleteCase(caseItem.id)}
                          title="Delete Case"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Case Modal */}
      {showRecordModal && (
        <div className="dc-modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="dc-modal" onClick={e => e.stopPropagation()}>
            <div className="dc-modal-header">
              <h2>Record New Disciplinary Case</h2>
              <button 
                className="dc-modal-close"
                onClick={() => setShowRecordModal(false)}
              >
                ×
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="dc-modal-tabs">
              <button 
                className={`dc-tab ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => handleTabChange('students')}
              >
                Student Cases
              </button>
              <button 
                className={`dc-tab ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => handleTabChange('teachers')}
              >
                Teacher Cases
              </button>
            </div>
            
            <div className="dc-modal-body">
              {activeTab === 'students' ? (
                <>
                  <div className="dc-form-group">
                    <label>Student Name</label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="dc-select"
                    >
                      <option value="">-- Select Student --</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} - {student.class_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="dc-form-group">
                    <label>Class</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="dc-select"
                    >
                      <option value="">-- Select Class --</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="dc-form-group">
                  <label>Teacher Name</label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="dc-select"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name || teacher.username} - {teacher.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="dc-form-group">
                <label>Case Description</label>
                <textarea
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  className="dc-textarea"
                  placeholder={`Describe the disciplinary case for ${activeTab === 'students' ? 'student' : 'teacher'} in detail...`}
                  rows={4}
                />
              </div>
            </div>
            <div className="dc-modal-footer">
              <button 
                className="dc-ghost-btn"
                onClick={() => setShowRecordModal(false)}
              >
                Cancel
              </button>
              <button 
                className="dc-primary-btn"
                onClick={handleRecordCase}
                disabled={loading || 
                  (activeTab === 'students' ? (!selectedStudent || !selectedClass) : !selectedTeacher) || 
                  !caseDescription.trim()}
              >
                {loading ? 'Recording...' : 'Record Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && editingCase && (
        <div className="dc-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="dc-modal" onClick={e => e.stopPropagation()}>
            <div className="dc-modal-header">
              <h2>Update Case Status</h2>
              <button 
                className="dc-modal-close"
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <div className="dc-modal-body">
              <div className="dc-form-group">
                <label>Current Status</label>
                <div className="current-status">
                  {getStatusBadge(editingCase.status)}
                </div>
              </div>
              
              <div className="dc-form-group">
                <label>New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="dc-select"
                >
                  <option value="not resolved">Not Resolved</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              {newStatus === 'resolved' && (
                <div className="dc-form-group">
                  <label>Resolution Notes</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="dc-textarea"
                    placeholder="Add notes about how the case was resolved..."
                    rows={3}
                  />
                </div>
              )}
            </div>
            <div className="dc-modal-footer">
              <button 
                className="dc-ghost-btn"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </button>
              <button 
                className="dc-primary-btn"
                onClick={handleStatusUpdate}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="dc-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="dc-modal" onClick={e => e.stopPropagation()}>
            <div className="dc-modal-header">
              <h2>Confirm Delete All</h2>
              <button 
                className="dc-modal-close"
                onClick={() => setShowDeleteConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="dc-modal-body">
              <div className="dc-warning">
                <FaExclamationTriangle />
                <p>Are you sure you want to delete ALL discipline cases?</p>
                <p><strong>This action cannot be undone.</strong></p>
                <p>Total cases to delete: <strong>{cases.length}</strong></p>
              </div>
            </div>
            <div className="dc-modal-footer">
              <button 
                className="dc-ghost-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="dc-danger-btn"
                onClick={handleDeleteAll}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete All Cases'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 