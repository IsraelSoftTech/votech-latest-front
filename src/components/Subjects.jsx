import React, { useState, useEffect } from 'react';
import './AdminTeacher.css';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import SideTop from './SideTop';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editingId, setEditingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchSubjects(); }, []);
  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      setSubjects(res);
    } catch (err) {
      setError('Failed to fetch subjects');
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateSubject(editingId, form);
        setSuccess('Subject updated!');
      } else {
        await api.createSubject(form);
        setSuccess('Subject created!');
      }
      setShowModal(false);
      setForm({ name: '', code: '' });
      setEditingId(null);
      fetchSubjects();
    } catch (err) {
      setError('Failed to save subject');
    }
    setTimeout(() => setSuccess(''), 1200);
  };

  const handleEdit = s => {
    setForm({ name: s.name, code: s.code });
    setEditingId(s.id);
    setShowModal(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await api.deleteSubject(id);
      fetchSubjects();
    } catch (err) {
      setError('Failed to delete subject');
    }
  };

  return (
    <SideTop>
      <div className="dashboard-cards">
        <div className="card teachers">
          <div className="count">{subjects.length}</div>
          <div className="desc">Total Subjects</div>
        </div>
        <div className="card discipline">
          <div className="count">{subjects.filter(s => !s.assigned).length}</div>
          <div className="desc">Unassigned Subjects</div>
        </div>
      </div>
      <div className="teacher-section">
        <div className="teacher-header-row">
          <button className="add-teacher-btn" onClick={() => { setShowModal(true); setEditingId(null); setForm({ name: '', code: '' }); }}><FaPlus /> Create Subject</button>
        </div>
        <div className="teacher-table-wrapper">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.id || i}>
                  <td>{typeof s.name === 'string' ? s.name : 'Unknown Subject'}</td>
                  <td>{s.code}</td>
                  <td className="actions">
                    <button className="action-btn edit" onClick={() => handleEdit(s)}><FaEdit /></button>
                    <button className="action-btn delete" onClick={() => handleDelete(s.id)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            <form className="student-modal-form" onSubmit={handleRegister}>
              <h2 className="form-title">{editingId ? 'Edit Subject' : 'Create Subject'}</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Name of Subject *</label>
                  <input className="input-field" type="text" name="name" value={typeof form.name === 'string' ? form.name : ''} onChange={handleFormChange} placeholder="Enter Subject Name" required />
                </div>
                <div>
                  <label className="input-label">Subject Code *</label>
                  <input className="input-field" type="text" name="code" value={form.code} onChange={handleFormChange} placeholder="Enter Subject Code" required />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <SuccessMessage message={success} />}
              <button type="submit" className="signup-btn">{editingId ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </SideTop>
  );
} 