import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SideTop from './SideTop';
import './PsycoDash.css';
import { FaBrain, FaClipboardList, FaBook, FaChartBar, FaEnvelope, FaUserFriends, FaCalendarAlt, FaChartLine, FaFileAlt, FaPenFancy } from 'react-icons/fa';

export default function PsycoDash({ initialTab }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));

  // Listen to URL changes to update activeTab
  useEffect(() => {
    if (location.pathname === '/psycho-dashboard') {
      setActiveTab('Dashboard');
    } else if (location.pathname === '/psycho-cases') {
      setActiveTab('Cases');
    } else if (location.pathname === '/psycho-reports') {
      setActiveTab('Reports');
    } else if (location.pathname === '/psycho-messages') {
      setActiveTab('Messages');
    } else if (location.pathname === '/psychosocialist-lesson-plans') {
      setActiveTab('Lesson Plan');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <SideTop>
      {activeTab === 'Dashboard' && (
        <>
          <div className="psycho-dashboard-cards">
            <div className="psycho-card psycho-card-cases">
              <div className="psycho-card-icon"><FaClipboardList /></div>
              <div className="psycho-card-title">12</div>
              <div className="psycho-card-desc">Active Cases</div>
            </div>
            <div className="psycho-card psycho-card-students">
              <div className="psycho-card-icon"><FaUserFriends /></div>
              <div className="psycho-card-title">45</div>
              <div className="psycho-card-desc">Students Counseled</div>
            </div>
            <div className="psycho-card psycho-card-sessions">
              <div className="psycho-card-icon"><FaCalendarAlt /></div>
              <div className="psycho-card-title">8</div>
              <div className="psycho-card-desc">Today's Sessions</div>
            </div>
            <div className="psycho-card psycho-card-progress">
              <div className="psycho-card-icon"><FaChartLine /></div>
              <div className="psycho-card-title">78%</div>
              <div className="psycho-card-desc">Success Rate</div>
            </div>
          </div>
          <div className="psycho-dashboard-main">
            <div className="psycho-schedule">
              <div className="psycho-section-title">Today's Counseling Sessions</div>
              <div className="psycho-schedule-list">
                <div className="psycho-schedule-item">
                  <div className="psycho-schedule-task">Student Counseling - John Doe</div>
                  <div className="psycho-schedule-meta">9:00 AM <span>Academic Stress</span></div>
                </div>
                <div className="psycho-schedule-item">
                  <div className="psycho-schedule-task">Group Therapy Session</div>
                  <div className="psycho-schedule-meta">11:00 AM <span>Peer Pressure</span></div>
                </div>
                <div className="psycho-schedule-item">
                  <div className="psycho-schedule-task">Parent Consultation</div>
                  <div className="psycho-schedule-meta">2:00 PM <span>Behavioral Issues</span></div>
                </div>
                <div className="psycho-schedule-item">
                  <div className="psycho-schedule-task">Follow-up Session</div>
                  <div className="psycho-schedule-meta">4:00 PM <span>Anxiety Management</span></div>
                </div>
              </div>
            </div>
            <div className="psycho-stats">
              <div className="psycho-section-title">Case Statistics</div>
              <div className="psycho-stats-list">
                <div className="psycho-stats-item">
                  <div className="psycho-stats-category">Academic Stress <span>35%</span></div>
                  <div className="psycho-stats-progress">
                    <div className="psycho-stats-bar" style={{ width: '35%' }}></div>
                  </div>
                </div>
                <div className="psycho-stats-item">
                  <div className="psycho-stats-category">Peer Pressure <span>25%</span></div>
                  <div className="psycho-stats-progress">
                    <div className="psycho-stats-bar" style={{ width: '25%' }}></div>
                  </div>
                </div>
                <div className="psycho-stats-item">
                  <div className="psycho-stats-category">Family Issues <span>20%</span></div>
                  <div className="psycho-stats-progress">
                    <div className="psycho-stats-bar" style={{ width: '20%' }}></div>
                  </div>
                </div>
                <div className="psycho-stats-item">
                  <div className="psycho-stats-category">Anxiety/Depression <span>20%</span></div>
                  <div className="psycho-stats-progress">
                    <div className="psycho-stats-bar" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'Cases' && (
        <div className="psycho-content-section">
          <div className="psycho-section-title">Counseling Cases</div>
          <div className="psycho-cases-grid">
            <div className="psycho-case-card">
              <div className="psycho-case-header">
                <h3>Case #001 - John Doe</h3>
                <span className="psycho-case-status active">Active</span>
              </div>
              <div className="psycho-case-details">
                <p><strong>Issue:</strong> Academic Stress & Performance Anxiety</p>
                <p><strong>Student ID:</strong> STU2024001</p>
                <p><strong>Class:</strong> CL2</p>
                <p><strong>Started:</strong> March 15, 2024</p>
                <p><strong>Sessions:</strong> 5 completed, 3 scheduled</p>
              </div>
              <div className="psycho-case-actions">
                <button className="psycho-btn psycho-btn-primary">View Details</button>
                <button className="psycho-btn psycho-btn-secondary">Schedule Session</button>
              </div>
            </div>

            <div className="psycho-case-card">
              <div className="psycho-case-header">
                <h3>Case #002 - Sarah Smith</h3>
                <span className="psycho-case-status resolved">Resolved</span>
              </div>
              <div className="psycho-case-details">
                <p><strong>Issue:</strong> Peer Pressure & Social Anxiety</p>
                <p><strong>Student ID:</strong> STU2024002</p>
                <p><strong>Class:</strong> CL1</p>
                <p><strong>Started:</strong> February 20, 2024</p>
                <p><strong>Sessions:</strong> 8 completed, 0 scheduled</p>
              </div>
              <div className="psycho-case-actions">
                <button className="psycho-btn psycho-btn-primary">View Details</button>
                <button className="psycho-btn psycho-btn-secondary">Follow-up</button>
              </div>
            </div>

            <div className="psycho-case-card">
              <div className="psycho-case-header">
                <h3>Case #003 - Mike Johnson</h3>
                <span className="psycho-case-status pending">Pending</span>
              </div>
              <div className="psycho-case-details">
                <p><strong>Issue:</strong> Family Issues & Emotional Distress</p>
                <p><strong>Student ID:</strong> STU2024003</p>
                <p><strong>Class:</strong> CL3</p>
                <p><strong>Started:</strong> April 1, 2024</p>
                <p><strong>Sessions:</strong> 2 completed, 1 scheduled</p>
              </div>
              <div className="psycho-case-actions">
                <button className="psycho-btn psycho-btn-primary">View Details</button>
                <button className="psycho-btn psycho-btn-secondary">Schedule Session</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Lesson Plan' && (
        <div className="psycho-content-section">
          <div className="psycho-section-title">Lesson Plans</div>
          <div className="psycho-lesson-plans">
            <div className="psycho-lesson-plan-card">
              <div className="psycho-lesson-plan-header">
                <h3>Mental Health Awareness Week</h3>
                <span className="psycho-lesson-plan-status approved">Approved</span>
              </div>
              <div className="psycho-lesson-plan-details">
                <p><strong>Period:</strong> Weekly</p>
                <p><strong>Target Classes:</strong> All Classes</p>
                <p><strong>Topics:</strong> Stress Management, Coping Strategies, Mental Health Awareness</p>
                <p><strong>Submitted:</strong> March 10, 2024</p>
              </div>
              <div className="psycho-lesson-plan-actions">
                <button className="psycho-btn psycho-btn-primary">View Plan</button>
                <button className="psycho-btn psycho-btn-secondary">Edit</button>
              </div>
            </div>

            <div className="psycho-lesson-plan-card">
              <div className="psycho-lesson-plan-header">
                <h3>Peer Pressure Workshop</h3>
                <span className="psycho-lesson-plan-status pending">Pending</span>
              </div>
              <div className="psycho-lesson-plan-details">
                <p><strong>Period:</strong> Monthly</p>
                <p><strong>Target Classes:</strong> CL1, CL2</p>
                <p><strong>Topics:</strong> Peer Pressure, Decision Making, Self-Confidence</p>
                <p><strong>Submitted:</strong> April 5, 2024</p>
              </div>
              <div className="psycho-lesson-plan-actions">
                <button className="psycho-btn psycho-btn-primary">View Plan</button>
                <button className="psycho-btn psycho-btn-secondary">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Reports' && (
        <div className="psycho-content-section">
          <div className="psycho-section-title">Reports</div>
          <div className="psycho-reports-grid">
            <div className="psycho-report-card">
              <div className="psycho-report-icon"><FaChartBar /></div>
              <h3>Monthly Counseling Report</h3>
              <p>Comprehensive report of all counseling sessions and case progress for the current month.</p>
              <button className="psycho-btn psycho-btn-primary">Generate Report</button>
            </div>

            <div className="psycho-report-card">
              <div className="psycho-report-icon"><FaChartLine /></div>
              <h3>Case Progress Report</h3>
              <p>Detailed analysis of student progress and success rates across different counseling cases.</p>
              <button className="psycho-btn psycho-btn-primary">Generate Report</button>
            </div>

            <div className="psycho-report-card">
              <div className="psycho-report-icon"><FaUserFriends /></div>
              <h3>Student Wellness Report</h3>
              <p>Overall student mental health and wellness statistics for the academic year.</p>
              <button className="psycho-btn psycho-btn-primary">Generate Report</button>
            </div>

            <div className="psycho-report-card">
              <div className="psycho-report-icon"><FaCalendarAlt /></div>
              <h3>Session Schedule Report</h3>
              <p>Upcoming counseling sessions and appointment scheduling analysis.</p>
              <button className="psycho-btn psycho-btn-primary">Generate Report</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Messages' && (
        <div className="psycho-content-section">
          <div className="psycho-section-title">Messages</div>
          <div className="psycho-messages-container">
            <div className="psycho-message-list">
              <div className="psycho-message-item">
                <div className="psycho-message-avatar">JD</div>
                <div className="psycho-message-content">
                  <div className="psycho-message-header">
                    <h4>John Doe</h4>
                    <span className="psycho-message-time">2 hours ago</span>
                  </div>
                  <p>Hello, I'd like to schedule a follow-up session for next week.</p>
                </div>
              </div>

              <div className="psycho-message-item">
                <div className="psycho-message-avatar">SS</div>
                <div className="psycho-message-content">
                  <div className="psycho-message-header">
                    <h4>Sarah Smith</h4>
                    <span className="psycho-message-time">1 day ago</span>
                  </div>
                  <p>Thank you for the counseling sessions. I'm feeling much better now.</p>
                </div>
              </div>

              <div className="psycho-message-item">
                <div className="psycho-message-avatar">MJ</div>
                <div className="psycho-message-content">
                  <div className="psycho-message-header">
                    <h4>Mike Johnson</h4>
                    <span className="psycho-message-time">3 days ago</span>
                  </div>
                  <p>Can we discuss the family situation during our next session?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 