import React, { useEffect, useState } from 'react';
import DisciplineSideTop from './DisciplineSideTop';
import './Admin.css'; // For card/table styling
import './DisciplineSideTop.css';
import { FaExclamationTriangle, FaUserGraduate, FaClipboardList, FaFileAlt } from 'react-icons/fa';
import api from '../services/api';

// Mock data for demonstration (replace with discipline-specific API calls)
const urgentCases = [
  { name: 'John Paul', type: 'Student', class: 'Form 1', case: 'Caught Fighting' },
  { name: 'Ngoh Peter', type: 'Teacher', class: '-', case: 'Absent' },
  { name: 'Jong Tome', type: 'Student', class: 'Form 2', case: 'Late coming' },
];
const attendanceMonitoring = [
  { name: 'Orientation', present: 28, total: 30, rate: 99.3 },
  { name: 'CL1', present: 25, total: 28, rate: 89 },
  { name: 'CL2', present: 32, total: 35, rate: 91 },
  { name: 'ITVE', present: 22, total: 30, rate: 73 },
];

export default function DisciplineDashboard() {
  // These would be fetched from discipline-specific endpoints
  const [activeCases, setActiveCases] = useState(5);
  const [studentsMonitored, setStudentsMonitored] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(94);
  const [reportsThisMonth, setReportsThisMonth] = useState(12);

  useEffect(() => {
    // Fetch total students from API
    api.getStudents().then(students => {
      setStudentsMonitored(Array.isArray(students) ? students.length : 0);
    }).catch(() => setStudentsMonitored(0));
  }, []);

  return (
    <DisciplineSideTop>
      <div className="dashboard-cards">
        <div className="card students" style={{ background: '#22b6ff', color: '#fff' }}>
          <div className="icon"><FaExclamationTriangle style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activeCases}</div>
          <div className="desc">Active Cases</div>
        </div>
        <div className="card" style={{ background: '#0b2e4e', color: '#fff' }}>
          <div className="icon"><FaUserGraduate style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{studentsMonitored.toLocaleString()}</div>
          <div className="desc">Students Monitored</div>
        </div>
        <div className="card" style={{ background: '#0e7c3a', color: '#fff' }}>
          <div className="icon"><FaClipboardList style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{attendanceRate}%</div>
          <div className="desc">Attendance Rate</div>
        </div>
        <div className="card" style={{ background: '#0b3a4e', color: '#fff' }}>
          <div className="icon"><FaFileAlt style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{reportsThisMonth}</div>
          <div className="desc">Reports This Month</div>
        </div>
      </div>
      <div className="dashboard-section" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#204080', marginBottom: 16 }}>Urgent Disciplinary Cases</div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Class</th>
                  <th>Case</th>
                </tr>
              </thead>
              <tbody>
                {urgentCases.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td>{row.class}</td>
                    <td>{row.case}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#204080', marginBottom: 16 }}>Attendance Monitoring</div>
          <div className="table-scroll" style={{ overflowX: 'auto', minWidth: 0 }}>
            {attendanceMonitoring.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx !== attendanceMonitoring.length - 1 ? '1px solid #e5e7eb' : 'none', minWidth: 400 }}>
                <div style={{ fontWeight: 500 }}>{row.name}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{row.present}/{row.total} present</div>
                <div style={{ fontWeight: 600, color: row.rate >= 90 ? '#0e7c3a' : row.rate >= 80 ? '#f59e0b' : '#e53e3e' }}>{row.rate}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DisciplineSideTop>
  );
} 