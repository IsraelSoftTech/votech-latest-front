import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SideTop from './SideTop';
import './PsycoDash.css';
import { FaBrain, FaClipboardList, FaBook, FaChartBar, FaEnvelope, FaUserFriends, FaCalendarAlt, FaChartLine, FaFileAlt, FaPenFancy } from 'react-icons/fa';
import api from '../services/api';

export default function PsycoDash({ initialTab }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));

  // Real data state
  const [cases, setCases] = useState([]);
  const [sessionsToday, setSessionsToday] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [messages, setMessages] = useState([]);
  const [caseStats, setCaseStats] = useState([]);

  // Dashboard cards
  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [studentsCounseled, setStudentsCounseled] = useState(0);
  const [todaysSessionsCount, setTodaysSessionsCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);

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

  // Fetch all dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get all cases
        const allCases = await api.getCases();
        setCases(allCases);
        setActiveCasesCount(Array.isArray(allCases) ? allCases.filter(c => c.status === 'active' || c.status === 'pending').length : 0);
        // 2. Students counseled (unique student count)
        setStudentsCounseled(Array.isArray(allCases) ? new Set(allCases.map(c => c.student_id)).size : 0);
        // 3. Success rate (resolved/total)
        const resolved = Array.isArray(allCases) ? allCases.filter(c => c.status === 'resolved' || c.status === 'closed').length : 0;
        setSuccessRate(Array.isArray(allCases) && allCases.length > 0 ? Math.round((resolved / allCases.length) * 100) : 0);
        // 4. Today's sessions
        let todaySessions = [];
        const today = new Date();
        for (const c of allCases) {
          const sessions = await api.getCaseSessions(c.id);
          todaySessions = todaySessions.concat(sessions.filter(s => {
            const d = new Date(s.session_date);
            return d.toDateString() === today.toDateString();
          }));
        }
        setSessionsToday(todaySessions);
        setTodaysSessionsCount(todaySessions.length);
        // 5. Case stats (group by issue_type)
        const statsMap = {};
        for (const c of allCases) {
          if (!c.issue_type) continue;
          statsMap[c.issue_type] = (statsMap[c.issue_type] || 0) + 1;
        }
        setCaseStats(Object.entries(statsMap).map(([type, count]) => ({ type, count })));
        // 6. Lesson plans
        const plans = await api.getMyLessonPlans();
        setLessonPlans(Array.isArray(plans) ? plans : []);
        // 7. Messages
        if (authUser && authUser.id) {
          const msgs = await api.getMessages(authUser.id);
          setMessages(Array.isArray(msgs) ? msgs : []);
        }
      } catch (error) {
        setCases([]);
        setActiveCasesCount(0);
        setStudentsCounseled(0);
        setSuccessRate(0);
        setSessionsToday([]);
        setTodaysSessionsCount(0);
        setCaseStats([]);
        setLessonPlans([]);
        setMessages([]);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  return (
    <SideTop>
      {activeTab === 'Dashboard' && (
        <>
          <div className="psycho-dashboard-cards">
            <div className="psycho-card psycho-card-cases">
              <div className="psycho-card-icon"><FaClipboardList /></div>
              <div className="psycho-card-title">{activeCasesCount}</div>
              <div className="psycho-card-desc">Active Cases</div>
            </div>
            <div className="psycho-card psycho-card-students">
              <div className="psycho-card-icon"><FaUserFriends /></div>
              <div className="psycho-card-title">{studentsCounseled}</div>
              <div className="psycho-card-desc">Students Counseled</div>
            </div>
            <div className="psycho-card psycho-card-sessions">
              <div className="psycho-card-icon"><FaCalendarAlt /></div>
              <div className="psycho-card-title">{todaysSessionsCount}</div>
              <div className="psycho-card-desc">Today's Sessions</div>
            </div>
            <div className="psycho-card psycho-card-progress">
              <div className="psycho-card-icon"><FaChartLine /></div>
              <div className="psycho-card-title">{successRate}%</div>
              <div className="psycho-card-desc">Success Rate</div>
            </div>
          </div>
          <div className="psycho-dashboard-main">
            <div className="psycho-schedule">
              <div className="psycho-section-title">Today's Counseling Sessions</div>
              <div className="psycho-schedule-list">
                {sessionsToday.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 16 }}>No sessions scheduled for today.</div>
                ) : sessionsToday.map((s, idx) => (
                  <div className="psycho-schedule-item" key={s.id || idx}>
                    <div className="psycho-schedule-task">{s.session_type} - {s.student_name || s.case_title || 'Unknown'}</div>
                    <div className="psycho-schedule-meta">{s.session_time} <span>{s.session_notes || s.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="psycho-stats">
              <div className="psycho-section-title">Case Statistics</div>
              <div className="psycho-stats-list">
                {caseStats.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 16 }}>No case statistics available.</div>
                ) : caseStats.map((stat, idx) => (
                  <div className="psycho-stats-item" key={stat.type || idx}>
                    <div className="psycho-stats-category">{stat.type} <span>{Math.round((stat.count / cases.length) * 100)}%</span></div>
                    <div className="psycho-stats-progress">
                      <div className="psycho-stats-bar" style={{ width: `${Math.round((stat.count / cases.length) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'Cases' && (
        <div className="psycho-content-section">
          <div className="psycho-section-title">Counseling Cases</div>
          <div className="psycho-cases-redirect">
            <p>Click the button below to manage your counseling cases.</p>
            <button 
              className="psycho-btn psycho-btn-primary"
              onClick={() => window.location.href = '/psycho-cases'}
            >
              Manage Cases
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Lesson Plan' && (
        <div className="psycho-content-section">
          <div className="psycho-section-title">Lesson Plans</div>
          <div className="psycho-lesson-plans">
            {lessonPlans.length === 0 ? (
              <div style={{ color: '#888', fontSize: 16 }}>No lesson plans found.</div>
            ) : lessonPlans.map((plan, idx) => (
              <div className="psycho-lesson-plan-card" key={plan.id || idx}>
                <div className="psycho-lesson-plan-header">
                  <h3>{plan.title}</h3>
                  <span className={`psycho-lesson-plan-status ${plan.status}`}>{plan.status}</span>
                </div>
                <div className="psycho-lesson-plan-details">
                  <p><strong>Period:</strong> {plan.period_type}</p>
                  <p><strong>Target Classes:</strong> {plan.class_name || 'N/A'}</p>
                  <p><strong>Topics:</strong> {plan.objectives || plan.content || 'N/A'}</p>
                  <p><strong>Submitted:</strong> {plan.submitted_at ? new Date(plan.submitted_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="psycho-lesson-plan-actions">
                  <button className="psycho-btn psycho-btn-primary">View Plan</button>
                  <button className="psycho-btn psycho-btn-secondary">Edit</button>
                </div>
              </div>
            ))}
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
              {messages.length === 0 ? (
                <div style={{ color: '#888', fontSize: 16 }}>No messages found.</div>
              ) : messages.map((msg, idx) => (
                <div className="psycho-message-item" key={msg.id || idx}>
                  <div className="psycho-message-avatar">{msg.sender_name ? msg.sender_name.split(' ').map(n => n[0]).join('') : 'U'}</div>
                  <div className="psycho-message-content">
                    <div className="psycho-message-header">
                      <h4>{msg.sender_name || msg.sender_username || 'Unknown'}</h4>
                      <span className="psycho-message-time">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 