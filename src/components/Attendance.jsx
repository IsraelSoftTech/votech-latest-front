import React, { useState, useEffect } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import { FaTrash, FaExclamationCircle, FaPrint, FaChevronRight, FaTimes, FaClock, FaPlus } from 'react-icons/fa';
import './Attendance.css';
import { useNavigate } from 'react-router-dom';

export default function Attendance() {
  const navigate = useNavigate();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  if (!authUser || authUser.role !== 'Discipline') {
    // Optionally, redirect to dashboard or show nothing
    return null;
  }
  const [summary, setSummary] = useState({ present: 0, absent: 0 });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [session, setSession] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('summary'); // summary | select-class | take-attendance
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAbsent, setLastAbsent] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  useEffect(() => {
    api.getTodayAttendanceSummary().then(setSummary).catch(() => {});
    api.getAttendanceClasses().then(setClasses).catch(() => {});
  }, []);

  // Modal flow for taking attendance
  const openTakeAttendance = () => {
    setShowClassModal(true);
    setSelectedClass('');
    setSelectedTime('');
  };
  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setShowClassModal(false);
    setShowTimeModal(true);
  };
  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setShowTimeModal(false);
    handleStart();
  };

  // Update handleStart to not show class/time selection UI, just start session
  const handleStart = async () => {
    if (!selectedClass) return setError('Please select a class');
    if (!selectedTime) return setError('Please select a time');
    setLoading(true);
    setError('');
    try {
      const today = new Date();
      const [hours, minutes] = selectedTime.split(':');
      today.setHours(Number(hours), Number(minutes), 0, 0);
      const sessionData = await api.startAttendanceSession(selectedClass, today.toISOString());
      setSession(sessionData);
      const studentsList = await api.getAttendanceStudents(selectedClass);
      setStudents(studentsList);
      setAttendance({});
      setStep('take-attendance');
    } catch (e) {
      setError(e.message || 'Failed to start attendance');
    }
    setLoading(false);
  };

  const handleMark = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      for (const student of students) {
        const status = attendance[student.id];
        if (status) {
          await api.markAttendance(session.id, student.id, status);
        }
      }
      setStep('summary');
      api.getTodayAttendanceSummary().then(setSummary);
      setSelectedClass('');
      setSession(null);
      setStudents([]);
      setAttendance({});
      setShowSuccess(true);
      // Prepare lastAbsent table data
      const absentStudents = students.filter(s => attendance[s.id] === 'absent').map((s, idx) => ({
        id: s.id,
        name: s.full_name,
        studentId: s.student_id,
        class: classes.find(c => c.id === selectedClass)?.name || 'Unknown Class',
        date: new Date().toLocaleDateString()
      }));
      setLastAbsent(absentStudents);
    } catch (e) {
      setError(e.message || 'Failed to submit attendance');
    }
    setLoading(false);
  };

  const handleDeleteAbsent = (studentId) => {
    setLastAbsent(prev => prev.filter(s => s.id !== studentId));
  };

  const handleDeleteAllAttendance = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAllAttendance = async () => {
    setLoading(true);
    try {
      await api.deleteAllAttendance();
      setSummary({ present: 0, absent: 0 });
      setLastAbsent([]);
      setShowDeleteAllConfirm(false);
      setShowSuccess(true);
    } catch (e) {
      setError('Failed to delete attendance records');
    }
    setLoading(false);
  };

  return (
    <div className="attendance-container">
      {/* Success/Error Messages */}
      {showSuccess && <SuccessMessage message="Attendance submitted successfully!" />}
      {error && <div className="error-message">{error}</div>}

      {/* Dashboard Cards */}
      <div className="attendance-cards">
        <div className="attendance-card">
          <div className="count">{summary.absent}</div>
          <div className="desc">Total Absent Today</div>
        </div>
        <div className="attendance-card">
          <div className="count">{summary.present}</div>
          <div className="desc">Total Present Today</div>
        </div>
        <div className="attendance-card">
          <div className="count">{summary.present + summary.absent}</div>
          <div className="desc">Total Students</div>
        </div>
      </div>

      {/* Header */}
      <div className="attendance-header">
        <h2>Attendance Management</h2>
        <div className="attendance-actions">
          <button className="attendance-btn primary" onClick={openTakeAttendance}>
            <FaPlus /> Take Attendance
          </button>
          <button className="attendance-btn secondary" disabled>
            <FaPrint /> Print Attendance
          </button>
          <button className="attendance-btn danger" onClick={handleDeleteAllAttendance}>
            <FaTrash /> Delete All
          </button>
        </div>
      </div>

      {step === 'summary' && (
        <>
          {/* Recently Marked Absent Table */}
          {lastAbsent.length > 0 && (
            <div className="attendance-section">
              <div className="attendance-section-header">
                <h3>Recently Marked Absent</h3>
                <button className="attendance-report-btn">
                  <FaExclamationCircle /> Report Absence
                </button>
              </div>
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Class</th>
                      <th>Name</th>
                      <th>Student ID</th>
                      <th>Date of Absence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastAbsent.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>{s.class}</td>
                        <td>{typeof s.name === 'string' ? s.name : 'Unknown Student'}</td>
                        <td>{s.studentId}</td>
                        <td>{s.date}</td>
                        <td className="actions">
                          <button 
                            className="action-btn delete" 
                            onClick={() => handleDeleteAbsent(s.id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'take-attendance' && (
        <div className="attendance-section">
          <div className="attendance-section-header">
            <h3>Class Attendance</h3>
          </div>
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Full Name</th>
                  <th>Student ID</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.id}>
                    <td>{idx + 1}</td>
                    <td>{student.full_name}</td>
                    <td>{student.student_id}</td>
                    <td>{new Date().toLocaleDateString()}</td>
                    <td className="attendance-status">
                      <button
                        className={`status-btn present ${attendance[student.id] === 'present' ? 'selected' : ''}`}
                        onClick={() => handleMark(student.id, 'present')}
                      >
                        Present
                      </button>
                      <button
                        className={`status-btn absent ${attendance[student.id] === 'absent' ? 'selected' : ''}`}
                        onClick={() => handleMark(student.id, 'absent')}
                      >
                        Absent
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="attendance-submit">
            <button 
              className="attendance-submit-btn" 
              onClick={handleSubmit} 
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="attendance-modal-overlay" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="attendance-modal-content" onClick={e => e.stopPropagation()}>
            <button className="attendance-modal-close" onClick={() => setShowDeleteAllConfirm(false)}>×</button>
            <h2 className="attendance-form-title">Delete All Attendance Records?</h2>
            <p className="attendance-form-subtitle">
              Are you sure you want to delete <strong>ALL</strong> attendance records? This cannot be undone.
            </p>
            {summary.present === 0 && summary.absent === 0 ? (
              <div className="attendance-no-data">No attendance to delete</div>
            ) : (
              <div className="attendance-form-actions">
                <button 
                  className="attendance-cancel-btn" 
                  onClick={() => setShowDeleteAllConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="attendance-delete-btn" 
                  onClick={confirmDeleteAllAttendance}
                >
                  Yes, Delete All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Class Selection Modal */}
      {showClassModal && (
        <div className="attendance-modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="attendance-modal-content" onClick={e => e.stopPropagation()}>
            <button className="attendance-modal-close" onClick={() => setShowClassModal(false)}>×</button>
            <h2 className="attendance-form-title">Select Class</h2>
            <div className="attendance-form-grid">
              <div className="attendance-input-group">
                <label className="attendance-input-label">Class</label>
                <select 
                  className="attendance-select" 
                  value={selectedClass} 
                  onChange={e => handleClassSelect(e.target.value)}
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {typeof c.name === 'string' ? c.name : 'Unknown Class'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="attendance-form-actions">
              <button 
                className="attendance-cancel-btn" 
                onClick={() => setShowClassModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Selection Modal */}
      {showTimeModal && (
        <div className="attendance-modal-overlay" onClick={() => setShowTimeModal(false)}>
          <div className="attendance-modal-content" onClick={e => e.stopPropagation()}>
            <button className="attendance-modal-close" onClick={() => setShowTimeModal(false)}>×</button>
            <h2 className="attendance-form-title">Select Time</h2>
            <div className="attendance-form-grid">
              <div className="attendance-input-group">
                <label className="attendance-input-label">Time</label>
                <input 
                  type="time" 
                  className="attendance-input-field"
                  value={selectedTime} 
                  onChange={e => setSelectedTime(e.target.value)} 
                />
              </div>
            </div>
            <div className="attendance-form-actions">
              <button 
                className="attendance-cancel-btn" 
                onClick={() => setShowTimeModal(false)}
              >
                Cancel
              </button>
              <button 
                className="attendance-submit-btn" 
                onClick={() => handleTimeSelect(selectedTime)} 
                disabled={!selectedTime}
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}