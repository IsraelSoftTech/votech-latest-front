import React, { useEffect, useState } from 'react';
import DisciplineSideTop from './DisciplineSideTop';
import './DisciplineSideTop.css';
import { FaExclamationTriangle, FaUserGraduate, FaClipboardList, FaFileAlt } from 'react-icons/fa';
import api from '../services/api';

export default function DisciplineDashboard() {
  const [activeCases, setActiveCases] = useState(0);
  const [studentsMonitored, setStudentsMonitored] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [reportsThisMonth, setReportsThisMonth] = useState(0);
  const [recentCases, setRecentCases] = useState([]);

  useEffect(() => {
    // Fetch all dashboard data in parallel
    const fetchData = async () => {
      try {
        // 1. Get all discipline cases
        const cases = await api.getDisciplineCases();
        setActiveCases(Array.isArray(cases) ? cases.filter(c => c.status === 'not resolved').length : 0);
        // 2. Reports this month
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        setReportsThisMonth(Array.isArray(cases) ? cases.filter(c => {
          const d = new Date(c.recorded_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).length : 0);
        // 3. Get all students
        const students = await api.getAllStudents();
        setStudentsMonitored(Array.isArray(students) ? students.length : 0);
        // 4. Get attendance summary
        const summary = await api.getTodayAttendanceSummary();
        const total = (summary.students.present + summary.students.absent) || 0;
        setAttendanceRate(total > 0 ? Math.round((summary.students.present / total) * 100) : 0);
        // 5. Recent discipline cases (last 5)
        const sortedCases = Array.isArray(cases) ? cases
          .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
          .slice(0, 5) : [];
        setRecentCases(sortedCases);
      } catch (error) {
        setActiveCases(0);
        setStudentsMonitored(0);
        setAttendanceRate(0);
        setReportsThisMonth(0);
        setRecentCases([]);
      }
    };
    fetchData();
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
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, fontSize: 20, color: '#204080', marginBottom: 16 }}>Recent Discipline Cases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentCases.length === 0 ? (
              <div style={{ color: '#888', fontSize: 16 }}>No discipline cases found.</div>
            ) : recentCases.map((case_, idx) => (
              <div key={case_.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: idx % 2 === 0 ? '#f7f8fa' : '#fff', borderRadius: 8, padding: '12px 16px', fontSize: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#204080' }}>{case_.student_name || 'Unknown Student'}</div>
                  <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>{case_.class_name || 'Unknown Class'}</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{case_.case_description}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontSize: 12, 
                    fontWeight: 600,
                    background: case_.status === 'resolved' ? '#d4edda' : '#f8d7da',
                    color: case_.status === 'resolved' ? '#155724' : '#721c24'
                  }}>
                    {case_.status === 'resolved' ? 'Resolved' : 'Not Resolved'}
                  </span>
                  <div style={{ color: '#888', fontSize: 12 }}>
                    {case_.recorded_at ? new Date(case_.recorded_at).toLocaleDateString() : 'Unknown Date'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DisciplineSideTop>
  );
} 