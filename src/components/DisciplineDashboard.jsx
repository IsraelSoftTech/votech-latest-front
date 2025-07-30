import React, { useEffect, useState } from 'react';
import DisciplineSideTop from './DisciplineSideTop';
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
      <div className="ds-dashboard-cards" style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div className="ds-card ds-card-students" style={{ background: '#22b6ff', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
          <div className="ds-icon" style={{ fontSize: 36, marginBottom: 8 }}><FaExclamationTriangle style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activeCases}</div>
          <div className="ds-desc">Active Cases</div>
        </div>
        <div className="ds-card" style={{ background: '#0b2e4e', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
          <div className="ds-icon" style={{ fontSize: 36, marginBottom: 8 }}><FaUserGraduate style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{studentsMonitored.toLocaleString()}</div>
          <div className="ds-desc">Students Monitored</div>
        </div>
        <div className="ds-card" style={{ background: '#0e7c3a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
          <div className="ds-icon" style={{ fontSize: 36, marginBottom: 8 }}><FaClipboardList style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{attendanceRate}%</div>
          <div className="ds-desc">Attendance Rate</div>
        </div>
        <div className="ds-card" style={{ background: '#0b3a4e', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
          <div className="ds-icon" style={{ fontSize: 36, marginBottom: 8 }}><FaFileAlt style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{reportsThisMonth}</div>
          <div className="ds-desc">Reports This Month</div>
        </div>
      </div>
      <div className="ds-dashboard-section" style={{ display: 'flex', gap: 24, flexWrap: 'nowrap' }}>
        {/* Urgent Disciplinary Cases section removed */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, fontSize: 20, color: '#204080', marginBottom: 16 }}>Attendance Monitoring</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attendanceMonitoring.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: idx % 2 === 0 ? '#f7f8fa' : '#fff', borderRadius: 8, padding: '12px 16px', fontSize: 16 }}>
                <div style={{ fontWeight: 500 }}>{typeof row.name === 'string' ? row.name : 'Unknown'}
                  <div style={{ color: '#888', fontSize: 13 }}>{row.present}/{row.total} present</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: row.rate >= 90 ? '#0e7c3a' : row.rate >= 80 ? '#f59e0b' : '#e53e3e' }}>{row.rate}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DisciplineSideTop>
  );
} 