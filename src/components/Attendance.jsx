import React, { useState, useEffect } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import SideTop from './SideTop';
import { FaTrash, FaExclamationCircle, FaPrint, FaChevronRight } from 'react-icons/fa';
import './Attendance.css';

export default function Attendance() {
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
  const [printStep, setPrintStep] = useState(0); // 0: none, 1: class, 2: period, 3: stats
  const [printClass, setPrintClass] = useState('');
  const [printPeriod, setPrintPeriod] = useState('daily');
  const [printDate, setPrintDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [printWeek, setPrintWeek] = useState('');
  const [printData, setPrintData] = useState(null);
  const [printSessionTimes, setPrintSessionTimes] = useState([]);
  const [printLoading, setPrintLoading] = useState(false);

  useEffect(() => {
    api.getTodayAttendanceSummary().then(setSummary).catch(() => {});
    api.getAttendanceClasses().then(setClasses).catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!selectedClass) return setError('Please select a class');
    setLoading(true);
    setError('');
    try {
      const sessionData = await api.startAttendanceSession(selectedClass);
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

  // Print Attendance logic (step-by-step modals)
  const handlePrintAttendance = () => {
    setPrintStep(1);
    setPrintClass('');
    setPrintPeriod('daily');
    setPrintDate(new Date().toISOString().slice(0, 10));
    setPrintWeek('');
    setPrintData(null);
    setPrintSessionTimes([]);
  };

  // Step 2: After class selected
  const handleSelectPrintClass = () => {
    if (printClass) setPrintStep(2);
  };

  // Step 3: After period/date selected, fetch real data
  const handleSelectPrintPeriod = async () => {
    setPrintLoading(true);
    setPrintData(null);
    setPrintSessionTimes([]);
    let studentsList = [];
    let sessionTimes = [];
    let records = [];
    if (printClass) {
      studentsList = await api.getAttendanceStudents(printClass);
      if (printPeriod === 'daily') {
        // Fetch all sessions for the class and date
        const sessions = await api.getAttendanceSessions(printClass, printDate);
        sessionTimes = sessions.map(s => {
          const d = new Date(s.session_time);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        // For each student, get their attendance for each session
        records = studentsList.map((s, idx) => {
          let attendance = {};
          sessions.forEach(sess => {
            const d = new Date(sess.session_time);
            const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const rec = sess.records.find(r => r.student_id === s.id);
            attendance[time] = rec ? (rec.status === 'present' ? 'P' : 'A') : '';
          });
          return {
            sn: idx + 1,
            name: s.full_name,
            studentId: s.student_id,
            attendance
          };
        });
      } else {
        // Weekly: fetch all sessions for the week, sum P/A for each student
        const weekSessions = await api.getAttendanceSessionsWeekly(printClass, printWeek);
        records = studentsList.map((s, idx) => {
          let totalP = 0, totalA = 0;
          weekSessions.forEach(sess => {
            const rec = sess.records.find(r => r.student_id === s.id);
            if (rec?.status === 'present') totalP++;
            else if (rec?.status === 'absent') totalA++;
          });
          return {
            sn: idx + 1,
            name: s.full_name,
            studentId: s.student_id,
            attendance: { P: totalP, A: totalA }
          };
        });
      }
    }
    setPrintData(records);
    setPrintSessionTimes(sessionTimes);
    setPrintLoading(false);
    setPrintStep(3);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <SideTop>
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
            <span className="text-btn take-attendance-btn" onClick={() => setStep('select-class')}>Take Attendance</span>
            <button className="text-btn print-attendance-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#204080', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }} onClick={handlePrintAttendance}>
              <FaPrint style={{ fontSize: 17 }} /> Print Attendance
            </button>
          </div>
          {/* Print Attendance Step 1: Select Class */}
          {printStep === 1 && (
            <div className="print-attendance-modal">
              <div className="print-attendance-form">
                <h3>Select Class</h3>
                <select value={printClass} onChange={e => setPrintClass(e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="text-btn" style={{ marginTop: 16, color: '#204080', fontWeight: 600, fontSize: 15, background: '#eaf3ff', border: '1px solid #bfc8e2', borderRadius: 6, padding: '6px 18px', cursor: 'pointer' }} onClick={handleSelectPrintClass} disabled={!printClass}>
                  Next <FaChevronRight style={{ marginLeft: 6 }} />
                </button>
                <button className="text-btn" style={{ color: '#e53e3e', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }} onClick={() => setPrintStep(0)}>Cancel</button>
              </div>
            </div>
          )}
          {/* Print Attendance Step 2: Select Period */}
          {printStep === 2 && (
            <div className="print-attendance-modal">
              <div className="print-attendance-form">
                <h3>Select Period</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                  <label>Period:</label>
                  <select value={printPeriod} onChange={e => setPrintPeriod(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  {printPeriod === 'daily' ? (
                    <input type="date" value={printDate} onChange={e => setPrintDate(e.target.value)} />
                  ) : (
                    <input type="week" value={printWeek} onChange={e => setPrintWeek(e.target.value)} />
                  )}
                  <button className="text-btn" style={{ color: '#204080', fontWeight: 600, fontSize: 15, background: '#eaf3ff', border: '1px solid #bfc8e2', borderRadius: 6, padding: '6px 18px', cursor: 'pointer' }} onClick={handleSelectPrintPeriod} disabled={printLoading}>
                    {printLoading ? 'Loading...' : 'Show Statistics'}
                  </button>
                  <button className="text-btn" style={{ color: '#e53e3e', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setPrintStep(0)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          {/* Print Attendance Step 3: Show Statistics and Print */}
          {printStep === 3 && (
            <div className="print-attendance-modal">
              <div className="print-attendance-form">
                <h3>Attendance Statistics</h3>
                <div className="printable-area">
                  <div className="print-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 22, color: '#204080', letterSpacing: 1 }}>VOTECH(S7) ACADEMY</div>
                      <div style={{ fontWeight: 600, fontSize: 18, color: '#204080', marginTop: 2 }}>{printPeriod === 'daily' ? 'Attendance Record for ' + (classes.find(c => c.id === Number(printClass))?.name || '') + ' - ' + printDate : 'Attendance Record for ' + (classes.find(c => c.id === Number(printClass))?.name || '') + ' (Weekly)'}</div>
                    </div>
                    <img src={require('../assets/logo.png')} alt="logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                  </div>
                  <table className="attendance-table print-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Full Name</th>
                        <th>Student ID</th>
                        {printPeriod === 'daily' && printSessionTimes.map(time => (
                          <th key={time} style={{ minWidth: 80 }}> {time} </th>
                        ))}
                        {printPeriod === 'weekly' && (
                          <>
                            <th>Total P</th>
                            <th>Total A</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {printData && printData.map((row, idx) => (
                        <tr key={row.studentId}>
                          <td>{row.sn}</td>
                          <td>{row.name}</td>
                          <td>{row.studentId}</td>
                          {printPeriod === 'daily' && printSessionTimes.map(time => (
                            <td key={time}>{row.attendance[time]}</td>
                          ))}
                          {printPeriod === 'weekly' && (
                            <>
                              <td>{row.attendance.P}</td>
                              <td>{row.attendance.A}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-btn" style={{ marginTop: 18, color: '#204080', fontWeight: 600, fontSize: 16, background: '#eaf3ff', border: '1px solid #bfc8e2', borderRadius: 6, padding: '8px 28px', cursor: 'pointer' }} onClick={handlePrint}>
                    <FaPrint style={{ fontSize: 18, marginRight: 8 }} /> Print
                  </button>
                  <button className="text-btn" style={{ color: '#e53e3e', fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 16 }} onClick={() => setPrintStep(0)}>Close</button>
                </div>
              </div>
            </div>
          )}
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
      {step === 'select-class' && (
        <div className="attendance-select-class">
          <label>Select Class:</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">-- Select --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="text-btn start-session-btn" onClick={handleStart} style={{marginRight: 12, marginTop: 8, display: 'inline-block'}}>{loading ? 'Starting...' : 'Start'}</span>
          <span className="text-btn cancel-btn" onClick={() => setStep('summary')}>Cancel</span>
          {error && <div className="attendance-error">{error}</div>}
        </div>
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
    </SideTop>
  );
}