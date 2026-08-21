import React, { useEffect, useState } from 'react';
import DisciplineSideTop from './DisciplineSideTop';
import './DisciplineSideTop.css';
import './Admin.css';
import { FaExclamationTriangle, FaUserGraduate, FaClipboardList, FaFileAlt } from 'react-icons/fa';
import api from '../services/api';

export default function DisciplineDashboard() {
  const [activeCases, setActiveCases] = useState(0);
  const [studentsMonitored, setStudentsMonitored] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [reportsThisMonth, setReportsThisMonth] = useState(0);
  const [recentCases, setRecentCases] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cases = await api.getDisciplineCases();
        setActiveCases(Array.isArray(cases) ? cases.filter(c => c.status === 'not resolved').length : 0);

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        setReportsThisMonth(Array.isArray(cases) ? cases.filter(c => {
          const d = new Date(c.recorded_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).length : 0);

        const students = await api.getAllStudents();
        setStudentsMonitored(Array.isArray(students) ? students.length : 0);

        setAttendanceRate(0);

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
      <div className="dashboard-cards">
        <div className="card students">
          <div className="icon"><FaExclamationTriangle /></div>
          <div className="count">{activeCases}</div>
          <div className="desc">Active Cases</div>
        </div>
        <div className="card teachers">
          <div className="icon"><FaUserGraduate /></div>
          <div className="count">{studentsMonitored.toLocaleString()}</div>
          <div className="desc">Students Monitored</div>
        </div>
        <div className="card fees">
          <div className="icon"><FaClipboardList /></div>
          <div className="count">{attendanceRate}%</div>
          <div className="desc">Attendance Rate</div>
        </div>
        <div className="card reports">
          <div className="icon"><FaFileAlt /></div>
          <div className="count">{reportsThisMonth}</div>
          <div className="desc">Reports This Month</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="disciplinary-table discipline-dashboard-panel">
          <h3 className="discipline-dashboard-heading">Recent Discipline Cases</h3>
          {recentCases.length === 0 ? (
            <p className="enrolment-info">No discipline cases found.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((case_) => (
                    <tr key={case_.id || `${case_.student_name}-${case_.recorded_at}`}>
                      <td>{case_.student_name || 'Unknown Student'}</td>
                      <td>{case_.class_name || 'N/A'}</td>
                      <td>{case_.case_description}</td>
                      <td>
                        <span className={`disc-case-status ${case_.status === 'resolved' ? 'resolved' : 'open'}`}>
                          {case_.status === 'resolved' ? 'Resolved' : 'Not Resolved'}
                        </span>
                      </td>
                      <td>
                        {case_.recorded_at
                          ? new Date(case_.recorded_at).toLocaleDateString()
                          : 'Unknown Date'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DisciplineSideTop>
  );
}
