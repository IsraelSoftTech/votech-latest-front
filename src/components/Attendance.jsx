import React, { useState, useEffect } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import { FaTrash, FaExclamationCircle, FaPrint, FaChevronRight, FaTimes, FaClock } from 'react-icons/fa';
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
  // Remove all print attendance state and handlers
  // Remove all print attendance modals and UI
  // Only leave the Print Attendance button, but make it inactive
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
        sn: idx + 1,
        class: classes.find(c => c.id === Number(selectedClass))?.name || '',
        name: s.full_name,
        studentId: s.student_id,
        date: new Date().toLocaleDateString(),
        id: s.id
      }));
      setLastAbsent(absentStudents);
      setTimeout(() => setShowSuccess(false), 2500);
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
    setShowDeleteAllConfirm(false);
    try {
      await api.deleteAllAttendance();
      setShowSuccess(true);
      setSummary({ present: 0, absent: 0 });
      setLastAbsent([]);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (e) {
      setError('Failed to delete all attendance records.');
    }
  };

  // Remove all print attendance logic (step-by-step modals)
  // Remove all print attendance handlers
  // Remove all print attendance UI

  return (
    <>
      {showSuccess && <SuccessMessage message="Attendance submitted successfully!" />}
      {step === 'summary' && (
        <>
          <h2>Attendance</h2>
          <div className="attendance-cards">
            <div className="attendance-card absent">
              <div className="attendance-card-title">Total Absent Today</div>
              <div className="attendance-card-value">{summary.absent}</div>
            </div>
            <div className="attendance-card present">
              <div className="attendance-card-title">Total Present Today</div>
              <div className="attendance-card-value">{summary.present}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="text-btn take-attendance-btn" onClick={openTakeAttendance}>Take Attendance</span>
            <span style={{ color: '#204080', fontWeight: 600, fontSize: 15 }}>Print Attendance</span>
            <button className="text-btn delete-all-btn" style={{ color: '#e53e3e', fontWeight: 600, fontSize: 15, background: 'none', border: '1px solid #e53e3e', borderRadius: 6, padding: '6px 18px', cursor: 'pointer' }} onClick={handleDeleteAllAttendance}>
              Delete All
            </button>
          </div>
          {showDeleteAllConfirm && (
            <div className="delete-all-modal">
              <div className="delete-all-box">
                <div style={{ fontWeight: 600, fontSize: 17, color: '#e53e3e', marginBottom: 12 }}>Delete All Attendance Records?</div>
                <div style={{ marginBottom: 18, color: '#444' }}>Are you sure you want to delete <b>ALL</b> attendance records? This cannot be undone.</div>
                {summary.present === 0 && summary.absent === 0 ? (
                  <>
                    <button
                      onClick={() => setShowDeleteAllConfirm(false)}
                      className="delete-all-close"
                      aria-label="Close"
                    >
                      <FaTimes />
                    </button>
                    <div style={{ color: '#204080', fontWeight: 600, fontSize: 16, margin: '18px 0' }}>No attendance to delete</div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
                    <button className="text-btn" style={{ background: '#e53e3e', color: '#b91c1c', borderRadius: 6, padding: '8px 24px', fontWeight: 600, border: 'none' }} onClick={confirmDeleteAllAttendance}>Yes, Delete All</button>
                    <button className="text-btn" style={{ background: '#eaf3ff', color: '#204080', borderRadius: 6, padding: '8px 24px', fontWeight: 600, border: 'none' }} onClick={() => setShowDeleteAllConfirm(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Modal for class selection */}
          {showClassModal && (
            <div className="print-attendance-modal">
              <div className="print-attendance-form">
                <h3>Select Class</h3>
                <select value={selectedClass} onChange={e => handleClassSelect(e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="text-btn" style={{ marginTop: 16, color: '#e53e3e', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowClassModal(false)}>Cancel</button>
              </div>
            </div>
          )}
          {/* Modal for time selection */}
          {showTimeModal && (
            <div className="print-attendance-modal">
              <div className="print-attendance-form">
                <h3>Select Time</h3>
                <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} style={{marginBottom: 8}} />
                <button className="text-btn" style={{ marginTop: 16, color: '#204080', fontWeight: 600, fontSize: 15, background: '#eaf3ff', border: '1px solid #bfc8e2', borderRadius: 6, padding: '6px 18px', cursor: 'pointer' }} onClick={() => handleTimeSelect(selectedTime)} disabled={!selectedTime}>Next <FaChevronRight style={{ marginLeft: 6 }} /></button>
                <button className="text-btn" style={{ color: '#e53e3e', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowTimeModal(false)}>Cancel</button>
              </div>
            </div>
          )}
          {/* Print Attendance Step 1: Select Class */}
          {/* Print Attendance Step 2: Select Period */}
          {/* Print Attendance Step 3: Show Statistics and Print */}
          {lastAbsent.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="absence-table-header-row">
                <h3 style={{ margin: 0 }}>Recently Marked Absent</h3>
                <button className="text-btn report-absence-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#204080', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <FaExclamationCircle style={{ fontSize: 17 }} /> Report Absence
                </button>
              </div>
              <div className="absence-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Class</th>
                      <th>Name</th>
                      <th>Student ID</th>
                      <th>Date of Absence</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastAbsent.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>{s.class}</td>
                        <td>{s.name}</td>
                        <td>{s.studentId}</td>
                        <td>{s.date}</td>
                        <td>
                          <button className="text-btn delete-absent-btn" style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => handleDeleteAbsent(s.id)} title="Delete">
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
        <div className="attendance-table-section">
          <h3>Class Attendance</h3>
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
                  <td>
                    <span
                      className={`text-btn status-btn present${attendance[student.id] === 'present' ? ' selected' : ''}`}
                      onClick={() => handleMark(student.id, 'present')}
                      style={{marginRight: 8}}
                    >P</span>
                    <span
                      className={`text-btn status-btn absent${attendance[student.id] === 'absent' ? ' selected' : ''}`}
                      onClick={() => handleMark(student.id, 'absent')}
                    >A</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="text-btn submit-attendance-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      )}
    </>
  );
}