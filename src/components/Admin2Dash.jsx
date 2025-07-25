import React, { useEffect, useState } from 'react';
import SideTop from './SideTop';
import { FaUserGraduate, FaChalkboardTeacher, FaBoxes } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const COLORS = ['#204080', '#388e3c', '#f59e0b'];

export default function Admin2Dash() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.getStudents().then(setStudents).catch(() => setStudents([]));
    api.getAllTeachers().then(setTeachers).catch(() => setTeachers([]));
    // Try to fetch inventory, fallback to empty if not implemented
    if (api.getInventory) {
      api.getInventory().then(setInventory).catch(() => setInventory([]));
    } else {
      setInventory([]);
    }
  }, []);

  const data = [
    { name: 'Students', value: students.length },
    { name: 'Teachers', value: teachers.length },
    { name: 'Inventory', value: inventory.length },
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
          <div className="count" style={{ fontSize: 22 }}>{teachers.length}</div>
          <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Total Teachers</div>
        </div>
        <div className="card inventory">
          <div className="icon"><FaBoxes /></div>
          <div className="count" style={{ fontSize: 22 }}>{inventory.length}</div>
          <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Total Inventory Records</div>
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