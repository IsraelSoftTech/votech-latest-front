import React, { useEffect, useState } from 'react';
import './DeanManager.css';
import api from '../services/api';
import SideTop from './SideTop';

export default function DeanManager() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllTeachers().then(data => {
      setTeachers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const assigned = teachers.filter(t => t.classes && t.classes.trim() !== '');
  const unassigned = teachers.filter(t => !t.classes || t.classes.trim() === '');

  return (
    <SideTop>
      <div className="dean-manager-container">
        <h2>Staff Management</h2>
        <div className="dean-manager-cards">
          <div className="dean-card assigned">
            <div className="dean-card-title">Assigned Teachers</div>
            <div className="dean-card-value">{assigned.length}</div>
          </div>
          <div className="dean-card unassigned">
            <div className="dean-card-title">Unassigned Teachers</div>
            <div className="dean-card-value">{unassigned.length}</div>
          </div>
        </div>
        <div className="dean-manager-table-wrapper">
          <table className="dean-manager-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Sex</th>
                <th>ID Card</th>
                <th>Date of Birth</th>
                <th>Place of Birth</th>
                <th>Subjects</th>
                <th>Assigned Classes</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{textAlign:'center'}}>Loading...</td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan="10" style={{textAlign:'center'}}>No teachers found.</td></tr>
              ) : teachers.map((t, idx) => (
                <tr key={t.id}>
                  <td>{idx + 1}</td>
                  <td>{t.full_name}</td>
                  <td>{t.sex}</td>
                  <td>{t.id_card}</td>
                  <td>{t.dob}</td>
                  <td>{t.pob}</td>
                  <td>{t.subjects}</td>
                  <td>{t.classes}</td>
                  <td>{t.contact}</td>
                  <td className={t.status === 'approved' ? 'status-approved' : t.status === 'pending' ? 'status-pending' : 'status-rejected'}>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SideTop>
  );
} 