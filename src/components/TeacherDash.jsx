import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SideTop from './SideTop';
import './TeacherDash.css';
import { FaBook, FaUserGraduate, FaClipboardList, FaChartBar, FaCheck, FaTimes, FaArrowLeft } from 'react-icons/fa';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';
import TeacherApp from './TeacherApp';

export default function TeacherDash({ initialTab }) {
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'Dashboard');
  const [form, setForm] = useState({
    full_name: '',
    sex: '',
    id_card: '',
    dob: '',
    pob: '',
    subjects: [],
    classes: '', // read-only
    contact: ''
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [teacherRecord, setTeacherRecord] = useState(null);
  const [showSubjectsDropdown, setShowSubjectsDropdown] = useState(false);

  // Fetch subjects and teacher record
  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => setSubjects([]));
    fetchTeacherRecord();
  }, []);

  // Listen to URL changes to update activeTab
  useEffect(() => {
    if (location.pathname === '/teacher-application') {
      setActiveTab('Application');
    } else if (location.pathname === '/teacher-dashboard') {
      setActiveTab('Dashboard');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const fetchTeacherRecord = async () => {
    try {
      const all = await api.getAllTeachers();
      // Find teacher record for this user (by username or full_name)
      const rec = all.find(t => t.contact === authUser?.contact || t.full_name === authUser?.name);
      setTeacherRecord(rec);
      if (rec) {
        setForm({
          full_name: rec.full_name,
          sex: rec.sex,
          id_card: rec.id_card,
          dob: rec.dob,
          pob: rec.pob,
          subjects: rec.subjects ? rec.subjects.split(',') : [],
          classes: rec.classes,
          contact: rec.contact
        });
      }
    } catch {}
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'subjects') {
      setForm(f => {
        const arr = Array.isArray(f.subjects) ? f.subjects : (f.subjects ? f.subjects.split(',') : []);
        return {
          ...f,
          subjects: checked ? [...arr, value] : arr.filter(s => s !== value)
        };
      });
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    try {
      const submitForm = {
        ...form,
        subjects: Array.isArray(form.subjects) ? form.subjects.join(',') : form.subjects,
        classes: form.classes // not editable here
      };
      await api.submitTeacherApplication(submitForm);
      setSuccess('Application submitted!');
      fetchTeacherRecord();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    }
    setRegistering(false);
    setTimeout(() => setSuccess(''), 1200);
  };

  // Status indicator logic
  let statusColor = '#e53e3e', statusIcon = <FaTimes />, statusTitle = 'Not Approved';
  if (teacherRecord && teacherRecord.status === 'approved') {
    statusColor = '#22bb33';
    statusIcon = <FaCheck />;
    statusTitle = 'Approved';
  }

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
      {activeTab === 'Application' && (
        <TeacherApp authUser={authUser} />
      )}
    </SideTop>
  );
} 