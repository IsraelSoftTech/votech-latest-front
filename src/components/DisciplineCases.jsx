import React, { useEffect, useState } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import './DisciplineCases.css';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

export default function DisciplineCases() {
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
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
      const [casesData, studentsData, classesData] = await Promise.all([
        api.getDisciplineCases(),
        api.getDisciplineStudents(),
        api.getDisciplineClasses()
      ]);
      setCases(casesData);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleRecordCase = async () => {
    if (!selectedStudent || !selectedClass || !caseDescription.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await api.createDisciplineCase({
        student_id: selectedStudent,
        class_id: selectedClass,
        case_description: caseDescription.trim()
      });
      
      setSuccessMessage('Discipline case recorded successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset form and close modal
      setSelectedStudent('');
      setSelectedClass('');
      setCaseDescription('');
      setShowRecordModal(false);
      
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
          <p>Record and manage student disciplinary cases</p>
        </div>
        <div className="dc-actions">
          <button 
            className="dc-primary-btn"
            onClick={() => setShowRecordModal(true)}
            disabled={loading}
          >
            <FaPlus /> Record Case
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
                  <th>Student</th>
                  <th>Class</th>
                  <th>Case Description</th>
                  <th>Status</th>
                  <th>Recorded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem, index) => (
                  <tr key={caseItem.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="student-info">
                        <div className="student-name">{caseItem.student_name}</div>
                        <div className="student-sex">{caseItem.student_sex}</div>
                      </div>
                    </td>
                    <td>{caseItem.class_name}</td>
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
            <div className="dc-modal-body">
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
              
              <div className="dc-form-group">
                <label>Case Description</label>
                <textarea
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  className="dc-textarea"
                  placeholder="Describe the disciplinary case in detail..."
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
                disabled={loading || !selectedStudent || !selectedClass || !caseDescription.trim()}
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