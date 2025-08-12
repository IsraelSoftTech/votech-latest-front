import React, { useState, useEffect } from 'react';
import './MyClasses.css';
import { FaBook, FaUserGraduate, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import SideTop from './SideTop';

export default function MyClasses({ authUser }) {
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [userApplication, setUserApplication] = useState(null);
  const currentUser = authUser || JSON.parse(sessionStorage.getItem('authUser') || 'null');

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserClasses(currentUser);
    } else {
      setAssignedClasses([]);
      setTotalStudents(0);
      setLoading(false);
    }
  }, [currentUser?.id]);

  const fetchUserClasses = async (user) => {
    try {
      setLoading(true);
      setError('');

      // First, get the user's application to see what classes they were assigned
      let userApp = null;
      try {
        userApp = await api.getUserApplication(user.id);
        setUserApplication(userApp);
      } catch (err) {
        console.log('No application found for user');
        setUserApplication(null);
      }

      // If user has an application with assigned classes, use those
      if (userApp && userApp.classes && userApp.status === 'approved') {
        const assignedClassNames = userApp.classes
          .split(',')
          .map(c => c.trim())
          .filter(c => c && c !== 'undefined' && c !== '');

        if (assignedClassNames.length > 0) {
          // Get all classes to resolve class IDs
          const allClasses = await api.getClasses();

          const normalized = (s) => (s || '').toString().trim().toLowerCase();
          const classRecords = assignedClassNames.map(name => ({
            name,
            record: allClasses.find(c => normalized(c.name) === normalized(name)) || null
          }));
          const fetches = classRecords.map(async ({ name, record }) => {
            if (!record?.id) {
              return { id: null, name, studentCount: 0, classRecord: record };
            }
            const students = await api.getStudentsByClass(record.id).catch(() => []);
            return { id: record.id, name, studentCount: Array.isArray(students) ? students.length : 0, classRecord: record };
          });
          const classesWithStudentCounts = await Promise.all(fetches);

          setAssignedClasses(classesWithStudentCounts);
          setTotalStudents(classesWithStudentCounts.reduce((total, cls) => total + cls.studentCount, 0));
        } else {
          setAssignedClasses([]);
          setTotalStudents(0);
        }
      } else {
        // Fallback to old method: check teachers table
      const allTeachers = await api.getAllTeachers();
      
      let teacherRecord = null;
      if (user?.id) {
        teacherRecord = allTeachers.find(t => t.user_id === user.id);
      }
      if (!teacherRecord && user?.contact) {
        teacherRecord = allTeachers.find(t => t.contact === user.contact);
      }
      if (!teacherRecord && user?.name) {
        teacherRecord = allTeachers.find(t => t.full_name === user.name);
      }
      if (!teacherRecord && user?.username) {
        teacherRecord = allTeachers.find(t => 
          t.full_name?.toLowerCase().includes(user.username.toLowerCase()) || 
          t.contact?.toLowerCase().includes(user.username.toLowerCase())
        );
      }

      if (!teacherRecord) {
        setAssignedClasses([]);
        setTotalStudents(0);
        setLoading(false);
        return;
      }

      const assignedClassNames = teacherRecord.classes 
        ? teacherRecord.classes.split(',').map(c => c.trim()).filter(c => c && c !== 'undefined')
        : [];

      if (assignedClassNames.length === 0) {
        setAssignedClasses([]);
        setTotalStudents(0);
        setLoading(false);
        return;
      }

      const allClasses = await api.getClasses();

      const normalized = (s) => (s || '').toString().trim().toLowerCase();
      const classRecords = assignedClassNames.map(name => ({
        name,
        record: allClasses.find(c => normalized(c.name) === normalized(name)) || null
      }));
      const fetches = classRecords.map(async ({ name, record }) => {
        if (!record?.id) {
          return { id: null, name, studentCount: 0, classRecord: record };
        }
        const students = await api.getStudentsByClass(record.id).catch(() => []);
        return { id: record.id, name, studentCount: Array.isArray(students) ? students.length : 0, classRecord: record };
      });
      const classesWithStudentCounts = await Promise.all(fetches);

      setAssignedClasses(classesWithStudentCounts);
      setTotalStudents(classesWithStudentCounts.reduce((total, cls) => total + cls.studentCount, 0));
      }
      
    } catch (err) {
      console.error('Error fetching assigned classes:', err);
      setError('Failed to load assigned classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getApplicationStatus = () => {
    if (!userApplication) return null;
    
    const statusConfig = {
      pending: { color: 'orange', text: 'Pending Approval' },
      approved: { color: 'green', text: 'Approved' },
      rejected: { color: 'red', text: 'Rejected' }
    };
    
    const config = statusConfig[userApplication.status] || statusConfig.pending;
    return (
      <div className="application-status">
        <span className={`status-badge ${config.color}`}>
          Application Status: {config.text}
        </span>
      </div>
    );
  };

  // Do not block UI with loading; render content immediately

  return (
    <SideTop>
      <div className="my-classes-container">
        <div className="my-classes-header">
          <h1>My Classes</h1>
          <p>View your assigned classes and student information</p>
          {getApplicationStatus()}
          {loading && (
            <div className="loading-inline">
              <div className="loading-spinner small"></div>
              <span>Loading your classes...</span>
            </div>
          )}
        </div>

        <div className="dashboard-cards">
          <div className="card total-classes">
            <div className="icon">
              <FaBook />
            </div>
            <div className="count">{assignedClasses.length}</div>
            <div className="desc">Total Classes Assigned</div>
          </div>
          
          <div className="card total-students">
            <div className="icon">
              <FaUserGraduate />
            </div>
            <div className="count">{totalStudents}</div>
            <div className="desc">Total Students</div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <FaExclamationTriangle className="error-icon" />
            {error}
          </div>
        )}

        <div className="classes-table-container">
          <div className="table-header">
            <h2>Assigned Classes</h2>
            {assignedClasses.length === 0 && (
              <p className="no-classes-message">
                {userApplication ? 
                  (userApplication.status === 'pending' ? 
                    'Your application is pending approval. Classes will be assigned once approved.' :
                    userApplication.status === 'rejected' ? 
                    'Your application was rejected. Please contact the administrator.' :
                    'No classes have been assigned to you yet. Contact your administrator.'
                  ) :
                  'You haven\'t submitted an application yet. Please submit an application first.'
                }
              </p>
            )}
          </div>

          {assignedClasses.length > 0 && (
            <div className="table-wrapper">
              <table className="classes-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name of Class</th>
                    <th>Number of Students</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedClasses.map((cls, index) => (
                    <tr key={cls.id || index}>
                      <td>{index + 1}</td>
                      <td className="class-name">{typeof cls.name === 'string' ? cls.name : 'Unknown Class'}</td>
                      <td className="student-count">
                        <span className="count-badge">{cls.studentCount}</span>
                        <span className="student-text">
                          {cls.studentCount === 1 ? 'student' : 'students'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {assignedClasses.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">
              <FaClipboardList />
            </div>
            <h3>No Classes Assigned</h3>
            <p>
              {userApplication ? 
                (userApplication.status === 'pending' ? 
                  'Your application is currently under review. You will be assigned to classes once your application is approved.' :
                  userApplication.status === 'rejected' ? 
                  'Your application was not approved. Please contact the administrator for more information.' :
                  'You haven\'t been assigned to any classes yet. Please contact your administrator to get assigned to classes.'
                ) :
                'You haven\'t submitted an application yet. Please submit an application to be assigned to classes.'
              }
            </p>
            {!userApplication && (
              <button 
                className="submit-application-btn"
                onClick={() => window.location.href = '/application'}
              >
                Submit Application
              </button>
            )}
          </div>
        )}
      </div>
    </SideTop>
  );
}
