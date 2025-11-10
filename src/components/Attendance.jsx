import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import './Attendance.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png';

export default function Attendance() {
  const [summary, setSummary] = useState({ students: { present: 0, absent: 0 } });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // id -> 'present' | 'absent'
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [todaySessions, setTodaySessions] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Export state
  const [showExportClassModal, setShowExportClassModal] = useState(false);
  const [showExportDateModal, setShowExportDateModal] = useState(false);
  const [exportClassId, setExportClassId] = useState('');
  const [exportDate, setExportDate] = useState('');
  const [exportReport, setExportReport] = useState(null);
  const exportRef = useRef();
  const getInitialRole = () => {
    const stored = sessionStorage.getItem('authUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed?.role || '';
      } catch (error) {
        console.error('Failed to parse authUser role:', error);
      }
    }
    return '';
  };
  const [userRole, setUserRole] = useState(getInitialRole);

  useEffect(() => {
    const stored = sessionStorage.getItem('authUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserRole(parsed?.role || '');
      } catch (error) {
        console.error('Failed to parse authUser role:', error);
      }
    }
  }, []);

  const canManageAttendance = ['Discipline', 'Admin1', 'Admin3'].includes(userRole);
  const canExportAttendance = canManageAttendance || ['Admin4'].includes(userRole);

  useEffect(() => {
    console.log('Loading initial attendance data...');
    const loadData = async () => {
      try {
        const [summaryData, classesData, sessionsData] = await Promise.all([
          api.getTodayAttendanceSummary(),
          api.getClasses(),
          api.getTodaySessions()
        ]);
        console.log('Initial data loaded:', {
          summary: summaryData,
          classes: classesData.length,
          sessions: sessionsData
        });
        setSummary(summaryData);
        setClasses(classesData);
        setTodaySessions(sessionsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadData();
  }, []);

  // Add a refresh function for debugging
  const refreshData = async () => {
    console.log('Manually refreshing data...');
    try {
      const [summaryData, sessionsData] = await Promise.all([
        api.getTodayAttendanceSummary(),
        api.getTodaySessions()
      ]);
      console.log('Refreshed data:', { summary: summaryData, sessions: sessionsData });
      setSummary(summaryData);
      setTodaySessions(sessionsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Debug function to get all sessions
  const debugAllSessions = async () => {
    console.log('Debug: Getting all sessions...');
    try {
      const allSessions = await api.getAllSessions();
      console.log('Debug: All sessions:', allSessions);
      alert(`Found ${allSessions.length} total sessions. Check console for details.`);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      alert('Error getting all sessions. Check console for details.');
    }
  };

  // Debug function to check stored dates
  const debugDates = async () => {
    console.log('Debug: Checking stored dates...');
    try {
      const dates = await api.debugDates();
      console.log('Debug: Stored dates:', dates);
      alert(`Found ${dates.length} sessions with dates. Check console for details.`);
    } catch (error) {
      console.error('Error getting dates:', error);
      alert('Error getting dates. Check console for details.');
    }
  };

  const totalStudentToday = useMemo(() => summary.students.present + summary.students.absent, [summary]);

  const openTakeAttendance = () => {
    if (!canManageAttendance) return;
    setSelectedClass('');
    setSelectedDate('');
    setSelectedTime('');
    setStudents([]);
    setAttendance({});
    setSessionId(null);
    setShowSheet(false);
    setShowClassModal(true);
  };

  const openExport = () => {
    setExportClassId('');
    setExportDate('');
    setExportReport(null);
    setShowExportClassModal(true);
  };

  const proceedExportClass = () => {
    setShowExportClassModal(false);
    setShowExportDateModal(true);
  };

  const proceedExportDate = async () => {
    if (!exportClassId) return;
    if (!exportDate) return;
    setLoading(true);
    try {
      console.log('Exporting attendance:', { type: 'student', classId: exportClassId, date: exportDate });
      const report = await api.exportAttendance({ type: 'student', classId: exportClassId, date: exportDate });
      console.log('Export report received:', report);
      setExportReport(report);
      setShowExportDateModal(false);
    } catch (e) {
      console.error('Error exporting attendance:', e);
    }
    setLoading(false);
  };

  const downloadExportPdf = async () => {
    if (!exportRef.current || !exportReport) return;
    const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgWidth = 297; // landscape A4 width
    const pageHeight = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    const fileName = `attendance_report_student_${exportReport.date}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const proceedClass = () => {
    if (!canManageAttendance) return;
    setShowClassModal(false);
    setShowDateTimeModal(true);
  };

  const proceedDateTime = async () => {
    if (!canManageAttendance) return;
    if (!selectedClass) return;
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      // Create date in local timezone to avoid timezone shifting
      const localDate = `${selectedDate}T${selectedTime}:00`;
      console.log('Creating session with local time:', localDate);
      const session = await api.startAttendanceSession({ type: 'student', class_id: selectedClass, session_time: localDate });
      console.log('Session created:', session);
      setSessionId(session.id);
      
      const list = await api.getAttendanceStudents(selectedClass);
      setStudents(list);
      setAttendance({});
      setShowDateTimeModal(false);
      setShowSheet(true);
      
      // Refresh summary and sessions after creating new session
      console.log('Refreshing data after session creation...');
      const [summaryData, sessionsData] = await Promise.all([
        api.getTodayAttendanceSummary(),
        api.getTodaySessions()
      ]);
      console.log('Updated summary:', summaryData);
      console.log('Updated sessions:', sessionsData);
      setSummary(summaryData);
      setTodaySessions(sessionsData);
    } catch (e) {
      console.error('Error creating session:', e);
    }
    setLoading(false);
  };

  const mark = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!canManageAttendance) return;
    if (!sessionId) return;
    const records = students.map(s => ({
      student_id: s.id, 
      status: attendance[s.id] || 'absent'
    }));
    console.log('Saving attendance:', { sessionId, records });
    setLoading(true);
    try {
      await api.saveAttendanceBulk(sessionId, records);
      console.log('Attendance saved successfully');
      setShowSheet(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      
      // Refresh data
      console.log('Refreshing summary and sessions...');
      const [summaryData, sessionsData] = await Promise.all([
        api.getTodayAttendanceSummary(),
        api.getTodaySessions()
      ]);
      console.log('New summary:', summaryData);
      console.log('New sessions:', sessionsData);
      setSummary(summaryData);
      setTodaySessions(sessionsData);
    } catch (e) {
      console.error('Error saving attendance:', e);
    }
    setLoading(false);
  };

  const confirmDeleteAll = () => {
    if (!canManageAttendance) return;
    setShowDeleteConfirm(true);
  };

  const deleteAllAttendance = async () => {
    if (!canManageAttendance) return;
    setShowDeleteConfirm(false);
    setLoading(true);
    try {
      await api.deleteAllAttendance();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      api.getTodayAttendanceSummary().then(setSummary).catch(() => {});
      api.getTodaySessions().then(setTodaySessions).catch(() => {});
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="attendance-container">
      {showSuccess && <SuccessMessage message="Operation successful" />}

      <div className="attendance-cards">
        <div className="attendance-card">
          <div className="title">Recent Student Attendance</div>
          <div className="stats">
            <span className="present">Present: {summary.students.present}</span>
            <span className="absent">Absent: {summary.students.absent}</span>
          </div>
          <div className="total">Total: {totalStudentToday}</div>
        </div>
      </div>

      <div className="actions-row" style={{ gap: 8 }}>
        {canManageAttendance && (
          <button className="att-primary-btn" onClick={openTakeAttendance}>Take Attendance</button>
        )}
        {canExportAttendance && (
          <button className="att-primary-btn" onClick={openExport}>Export</button>
        )}
        {canManageAttendance && (
          <button className="att-ghost-btn" onClick={confirmDeleteAll}>Delete All</button>
        )}
      </div>

      {exportReport && (
        <div className="att-sheet">
          <div className="att-report" ref={exportRef}>
            <div className="att-report-header">
              <div className="att-report-logo">
                <img src={logo} alt="VOTECH(S7) Logo" />
              </div>
              <div className="att-report-title-group">
                <h1>VOTECH(S7) ACADEMY</h1>
                <h2>ATTENDANCE REPORT</h2>
                <h3>Class: {exportReport.className} | Date: {exportReport.date}</h3>
              </div>
            </div>
            <div className="att-report-meta">
              <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
              <p><strong>Total Sessions:</strong> {exportReport.sessions.length} | <strong>Total Students:</strong> {exportReport.rows.length}</p>
            </div>
            <div className="att-table-wrapper">
              <table className="att-table">
                  <thead>
                    <tr>
                    <th>Names</th>
                    <th>Sex</th>
                    {exportReport.sessions.map((t, i) => (
                      <th key={i} title={`Session ${i + 1}: ${t}`}>{t}</th>
                    ))}
                    <th>Total P</th>
                    <th>Total A</th>
                    </tr>
                  </thead>
                  <tbody>
                  {exportReport.rows.map(r => (
                    <tr key={r.id}>
                      <td>{r.full_name}</td>
                      <td>{r.sex}</td>
                      {r.statuses.map((st, idx) => (
                        <td key={idx} className={st === 'P' ? 'present-cell' : st === 'A' ? 'absent-cell' : ''}>{st}</td>
                      ))}
                      <td className="total-present">{r.total_present}</td>
                      <td className="total-absent">{r.total_absent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
          <div className="att-sheet-actions">
            <button className="att-primary-btn" onClick={downloadExportPdf}>Download PDF</button>
          </div>
        </div>
      )}

      {todaySessions.length > 0 && (
        <div className="att-sessions-table">
          <h3>Recent Attendance Sessions</h3>
          <div className="att-table-wrapper">
            <table className="att-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Type</th>
                  <th>Class</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {todaySessions.map((s, idx) => {
                  const dt = new Date(s.session_time);
                  const dateStr = dt.toLocaleDateString();
                  const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td>Student</td>
                      <td>{s.class_name || ''}</td>
                      <td>{dateStr}</td>
                      <td>{timeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canManageAttendance && showClassModal && (
        <div className="att-modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>
            <h2>Select Class</h2>
            <select className="att-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="att-modal-actions">
              <button className="att-ghost-btn" onClick={() => setShowClassModal(false)}>Cancel</button>
              <button className="att-primary-btn" disabled={!selectedClass} onClick={proceedClass}>Next</button>
            </div>
          </div>
        </div>
      )}

      {canManageAttendance && showDateTimeModal && (
        <div className="att-modal-overlay" onClick={() => setShowDateTimeModal(false)}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>
            <h2>Select Date & Time</h2>
            <div className="att-grid-2">
              <div className="att-input-group">
                <label>Date</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className="att-input-group">
                <label>Time</label>
                <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} />
              </div>
            </div>
            <div className="att-modal-actions">
              <button className="att-ghost-btn" onClick={() => setShowDateTimeModal(false)}>Cancel</button>
              <button className="att-primary-btn" disabled={loading || !selectedDate || !selectedTime || !selectedClass} onClick={proceedDateTime}>
                {loading ? 'Starting...' : 'Mark Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canManageAttendance && showSheet && (
        <div className="att-sheet">
          <div className="att-sheet-header">
            <h3>Mark Attendance</h3>
          </div>
          <div className="att-table-wrapper">
            <table className="att-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Names</th>
                  <th>Sex</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id}>
                    <td>{idx + 1}</td>
                    <td>{s.full_name}</td>
                    <td>{s.sex}</td>
                    <td>
                      <div className="att-pa-buttons">
                      <button
                          className={`att-pa-btn present ${attendance[s.id] === 'present' ? 'active' : ''}`}
                          onClick={() => mark(s.id, 'present')}
                        >P</button>
                      <button
                          className={`att-pa-btn absent ${attendance[s.id] === 'absent' ? 'active' : ''}`}
                          onClick={() => mark(s.id, 'absent')}
                        >A</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="att-sheet-actions">
            <button className="att-primary-btn" onClick={saveAttendance} disabled={loading}>
              {loading ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {canManageAttendance && showDeleteConfirm && (
        <div className="att-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete All</h2>
            <p style={{ margin: '16px 0', color: '#374151' }}>
              Are you sure you want to delete all attendance records? This action cannot be undone.
            </p>
            <div className="att-modal-actions">
              <button className="att-ghost-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="att-primary-btn" onClick={deleteAllAttendance} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete All'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modals */}
      {canExportAttendance && showExportClassModal && (
        <div className="att-modal-overlay" onClick={() => setShowExportClassModal(false)}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>
            <h2>Select Class</h2>
            <select className="att-select" value={exportClassId} onChange={(e) => setExportClassId(e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
            <div className="att-modal-actions">
              <button className="att-ghost-btn" onClick={() => setShowExportClassModal(false)}>Cancel</button>
              <button className="att-primary-btn" disabled={!exportClassId} onClick={proceedExportClass}>Next</button>
            </div>
          </div>
        </div>
      )}

      {canExportAttendance && showExportDateModal && (
        <div className="att-modal-overlay" onClick={() => setShowExportDateModal(false)}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>
            <h2>Select Date</h2>
            <div className="att-input-group">
              <label>Date</label>
              <input type="date" value={exportDate} onChange={e => setExportDate(e.target.value)} />
            </div>
            <div className="att-modal-actions">
              <button className="att-ghost-btn" onClick={() => setShowExportDateModal(false)}>Cancel</button>
              <button className="att-primary-btn" disabled={loading || !exportDate || !exportClassId} onClick={proceedExportDate}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}