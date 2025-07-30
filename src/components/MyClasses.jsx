import React, { useState, useEffect } from 'react';
import './MyClasses.css';
import { FaBook, FaUserGraduate, FaClipboardList } from 'react-icons/fa';
import api from '../services/api';
import SideTop from './SideTop';

export default function MyClasses({ authUser }) {
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchAssignedClasses();
  }, [authUser]);

  const fetchAssignedClasses = async () => {
    try {
      setLoading(true);
      setError('');

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
          studentCount: studentsInClass.length
        };
      });

      setAssignedClasses(classesWithStudentCounts);
      setTotalStudents(classesWithStudentCounts.reduce((total, cls) => total + cls.studentCount, 0));
      
    } catch (err) {
      console.error('Error fetching assigned classes:', err);
      setError('Failed to load assigned classes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SideTop>
        <div className="my-classes-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your classes...</p>
          </div>
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="my-classes-container">
        <div className="my-classes-header">
          <h1>My Classes</h1>
          <p>View your assigned classes and student information</p>
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
            {error}
          </div>
        )}

        <div className="classes-table-container">
          <div className="table-header">
            <h2>Assigned Classes</h2>
            {assignedClasses.length === 0 && (
              <p className="no-classes-message">
                You haven't been assigned to any classes yet. Contact your administrator.
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
            <p>You haven't been assigned to any classes yet. Please contact your administrator to get assigned to classes.</p>
          </div>
        )}
      </div>
    </SideTop>
  );
}
