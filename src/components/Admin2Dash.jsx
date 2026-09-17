import React, { useEffect, useState } from 'react';
import SideTop from './SideTop';
import { FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const COLORS = ['#204080', '#388e3c'];

export default function Admin2Dash() {
  const [students, setStudents] = useState([]);
  const [staffCount, setStaffCount] = useState(0);

  useEffect(() => {
    api.getStudents().then(setStudents).catch(() => setStudents([]));
    api
      .getAllUsers()
      .then((users) => {
        const list = Array.isArray(users) ? users : [];
        setStaffCount(list.filter((u) => !u.suspended).length);
      })
      .catch(() => setStaffCount(0));
  }, []);

  const data = [
    { name: 'Students', value: students.length },
    { name: 'Staff', value: staffCount },
  ];

  return (
    <SideTop>
      <div className="dashboard-cards">
        <div className="card students" style={{ padding: '24px 18px 18px 18px' }}>
          <div className="icon"><FaUserGraduate /></div>
          <div className="count" style={{ fontSize: 22 }}>{students.length}</div>
          <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Total Students</div>
        </div>
        <div className="card teachers">
          <div className="icon"><FaChalkboardTeacher /></div>
          <div className="count" style={{ fontSize: 22 }}>{staffCount}</div>
          <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Total Staff</div>
        </div>
      </div>
      <div className="dashboard-section" style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ marginBottom: 16, fontWeight: 600, color: '#204080' }}>Summary Analysis</h3>
        <ResponsiveContainer width="100%" height={300} minWidth={320}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </SideTop>
  );
}
