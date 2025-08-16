import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SideTop from './SideTop';
import './TeacherDash.css';
import { FaBook, FaUserGraduate } from 'react-icons/fa';
import api from '../services/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TeacherDash({ initialTab }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));

  useEffect(() => {
    if (location.pathname === '/teacher-dashboard') {
      setActiveTab('Dashboard');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch teacher assigned classes and total students using SAME logic as MyClasses
  useEffect(() => {
    const fetchUserClasses = async (user) => {
      try {
        setLoading(true);
        // First, get the user's application to see what classes they were assigned
        let userApp = null;
        try {
          userApp = await api.getUserApplication(user.id);
        } catch (err) {
          userApp = null;
        }

        if (userApp && userApp.classes && userApp.status === 'approved') {
          const assignedClassNames = userApp.classes
            .split(',')
            .map(c => c.trim())
            .filter(c => c && c !== 'undefined' && c !== '');

          if (assignedClassNames.length > 0) {
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
            setLoading(false);
            return;
          }
        }

        // Fallback to teachers table if no approved application with classes
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
      } catch (err) {
        setAssignedClasses([]);
        setTotalStudents(0);
      } finally {
        setLoading(false);
      }
    };

    if (authUser?.id) {
      fetchUserClasses(authUser);
    } else {
      setAssignedClasses([]);
      setTotalStudents(0);
      setLoading(false);
    }
  }, [authUser?.id]);

  const pieData = useMemo(() => ([
    { name: 'My Classes', value: assignedClasses.length },
    { name: 'Total Students', value: totalStudents }
  ]), [assignedClasses.length, totalStudents]);
  const COLORS = ['#204080', '#388e3c'];

  return (
    <SideTop>
      {activeTab === 'Dashboard' && (
        <>
          {/* Show only two cards: My Classes and Total Students */}
          <div className="teacher-dashboard-cards">
            <div className="teacher-card teacher-card-classes">
              <div className="teacher-card-icon"><FaBook /></div>
              <div className="teacher-card-title">{loading ? '...' : assignedClasses.length}</div>
              <div className="teacher-card-desc">My Classes</div>
            </div>
            <div className="teacher-card teacher-card-students">
              <div className="teacher-card-icon"><FaUserGraduate /></div>
              <div className="teacher-card-title">{loading ? '...' : totalStudents}</div>
              <div className="teacher-card-desc">Total Students</div>
            </div>
          </div>

          {/* Pie Chart: Classes vs Students */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.08)', padding: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 600, color: '#204080', marginBottom: 8 }}>Overview</div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => v} />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </SideTop>
  );
} 