import React, { useState, useEffect } from 'react';
import './DiscClass.css';
import { FaBook, FaUserGraduate, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import DisciplineSideTop from './DisciplineSideTop';

export default function DiscClass({ authUser }) {
  console.log('DiscClass component rendered with authUser:', authUser);
  
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [userApplication, setUserApplication] = useState(null);

  useEffect(() => {
    if (authUser) {
      fetchUserClasses();
    }
  }, [authUser]);

  const fetchUserClasses = async () => {
    try {
      setLoading(true);
      setError('');

      // First, get the user's application to see what classes they were assigned
      let userApp = null;
      try {
        userApp = await api.getUserApplication(authUser.id);
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
          // Get all classes and students to calculate counts
          const [allClasses, allStudents] = await Promise.all([
            api.getClasses(),
            api.getAllStudents()
          ]);

          const classesWithStudentCounts = assignedClassNames.map(className => {
            const classRecord = allClasses.find(c => c.name === className);
            const studentsInClass = allStudents.filter(s => s.class_id === classRecord?.id);
            
            return {
              id: classRecord?.id,
              name: className,
              studentCount: studentsInClass.length,
              classRecord: classRecord
            };
          });

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
        if (authUser?.id) {
          teacherRecord = allTeachers.find(t => t.user_id === authUser.id);
        }
        if (!teacherRecord && authUser?.contact) {
          teacherRecord = allTeachers.find(t => t.contact === authUser.contact);
        }
        if (!teacherRecord && authUser?.name) {
          teacherRecord = allTeachers.find(t => t.full_name === authUser.name);
        }
        if (!teacherRecord && authUser?.username) {
          teacherRecord = allTeachers.find(t => 
            t.full_name?.toLowerCase().includes(authUser.username.toLowerCase()) || 
            t.contact?.toLowerCase().includes(authUser.username.toLowerCase())
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
        const allStudents = await api.getAllStudents();

        const classesWithStudentCounts = assignedClassNames.map(className => {
          const classRecord = allClasses.find(c => c.name === className);
          const studentsInClass = allStudents.filter(s => s.class_id === classRecord?.id);
          
          return {
            id: classRecord?.id,
            name: className,
            studentCount: studentsInClass.length,
            classRecord: classRecord
          };
        });

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

  if (loading) {
    return (
      <DisciplineSideTop>
        <div className="disc-class-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your classes...</p>
          </div>
        </div>
      </DisciplineSideTop>
    );
  }

  return (
    <DisciplineSideTop>
      <div className="disc-class-container">
        <div className="disc-class-header">
          <h1>My Classes</h1>
          <p>View your assigned classes and student information</p>
          {getApplicationStatus()}
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

        {!loading && assignedClasses.length === 0 && !error && (
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
    </DisciplineSideTop>
  );
} 