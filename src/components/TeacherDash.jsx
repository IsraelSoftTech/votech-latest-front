import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SideTop from './SideTop';
import './TeacherDash.css';
import { FaBook, FaUserGraduate, FaClipboardList, FaChartBar } from 'react-icons/fa';

export default function TeacherDash({ initialTab }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));

  // Listen to URL changes to update activeTab
  useEffect(() => {
    if (location.pathname === '/teacher-dashboard') {
      setActiveTab('Dashboard');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <SideTop>
      {activeTab === 'Dashboard' && (
        <>
          {/* ... existing dashboard cards and content ... */}
          <div className="teacher-dashboard-cards">
            <div className="teacher-card teacher-card-classes">
              <div className="teacher-card-icon"><FaBook /></div>
              <div className="teacher-card-title">3</div>
              <div className="teacher-card-desc">My Classes</div>
            </div>
            <div className="teacher-card teacher-card-students">
              <div className="teacher-card-icon"><FaUserGraduate /></div>
              <div className="teacher-card-title">156</div>
              <div className="teacher-card-desc">Total Students</div>
            </div>
            <div className="teacher-card teacher-card-attendance">
              <div className="teacher-card-icon"><FaClipboardList /></div>
              <div className="teacher-card-title">96%</div>
              <div className="teacher-card-desc">Class Attendance</div>
            </div>
            <div className="teacher-card teacher-card-grades">
              <div className="teacher-card-icon"><FaChartBar /></div>
              <div className="teacher-card-title">24</div>
              <div className="teacher-card-desc">Pending Grades</div>
            </div>
          </div>
          <div className="teacher-dashboard-main">
            <div className="teacher-schedule">
              <div className="teacher-section-title">Today's Schedule</div>
              <div className="teacher-schedule-list">
                <div className="teacher-schedule-item">
                  <div className="teacher-schedule-task">Process New Registration</div>
                  <div className="teacher-schedule-meta">9:00 AM <span>CL1</span></div>
                </div>
                <div className="teacher-schedule-item">
                  <div className="teacher-schedule-task">Staff Attendance Review</div>
                  <div className="teacher-schedule-meta">11:00 AM <span>CL2</span></div>
                </div>
                <div className="teacher-schedule-item">
                  <div className="teacher-schedule-task">Fee Collection Report</div>
                  <div className="teacher-schedule-meta">2:00 PM <span>Orientation</span></div>
                </div>
                <div className="teacher-schedule-item">
                  <div className="teacher-schedule-task">Visitor Appointments</div>
                  <div className="teacher-schedule-meta">4:00 PM <span>Diploma Class</span></div>
                </div>
              </div>
            </div>
            <div className="teacher-performance">
              <div className="teacher-section-title">Class Performance</div>
              <div className="teacher-performance-list">
                <div className="teacher-performance-item">
                  <div className="teacher-performance-class">Orientation <span>Mathematics</span></div>
                  <div className="teacher-performance-score">78% <span className="teacher-performance-up">+5%</span></div>
                </div>
                <div className="teacher-performance-item">
                  <div className="teacher-performance-class">CL2 <span>Physics</span></div>
                  <div className="teacher-performance-score">82% <span className="teacher-performance-up">+2%</span></div>
                </div>
                <div className="teacher-performance-item">
                  <div className="teacher-performance-class">CL1 <span>Chemistry</span></div>
                  <div className="teacher-performance-score">75% <span className="teacher-performance-down">-3%</span></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </SideTop>
  );
} 