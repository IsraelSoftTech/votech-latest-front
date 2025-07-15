import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaChevronLeft } from 'react-icons/fa';
import './AdminClass.css';

const mockPrograms = [
  { id: 1, name: 'ICT', abbreviation: 'ICT', classes: [1, 2] },
  { id: 2, name: 'Business', abbreviation: 'BUS', classes: [2] },
];
const mockClasses = [
  { id: 1, name: 'Form 1' },
  { id: 2, name: 'Form 2' },
  { id: 3, name: 'Form 3' },
  { id: 4, name: 'Form 4' },
];

export default function Programs({ onBack }) {
  const [programs, setPrograms] = useState(mockPrograms);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', abbreviation: '', classes: [] });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleCheckbox = (pid, cid) => {
    setPrograms(ps => ps.map(p =>
      p.id === pid
        ? { ...p, classes: p.classes.includes(cid) ? p.classes.filter(c => c !== cid) : [...p.classes, cid] }
        : p
    ));
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({ name: p.name, abbreviation: p.abbreviation, classes: p.classes });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setPrograms(ps => ps.filter(p => p.id !== id));
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'classes') {
      setForm(f => ({
        ...f,
        classes: checked ? [...f.classes, +value] : f.classes.filter(c => c !== +value)
      }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name || !form.abbreviation || form.classes.length === 0) {
      setError('All fields are required.');
      return;
    }
    if (editId) {
      setPrograms(ps => ps.map(p => p.id === editId ? { ...p, ...form } : p));
    } else {
      setPrograms(ps => [...ps, { ...form, id: Date.now() }]);
    }
    setShowModal(false);
    setEditId(null);
    setForm({ name: '', abbreviation: '', classes: [] });
    setSuccess('Program saved!');
    setTimeout(() => setSuccess(''), 1200);
  };

  return (
    <div className="programs-section" style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        {onBack && <button className="back-btn" onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 20, color: '#204080', cursor: 'pointer' }}><FaChevronLeft /></button>}
        <h2 style={{ margin: 0, flex: 1 }}>Programs</h2>
        <button className="add-class-btn" onClick={() => { setShowModal(true); setEditId(null); setForm({ name: '', abbreviation: '', classes: [] }); }}><FaPlus /> Add Program</button>
      </div>
      <div className="dashboard-cards" style={{ marginBottom: 24 }}>
        <div className="card classes" style={{ minWidth: 200, flex: 1 }}>
          <div className="icon"><FaPlus /></div>
          <div className="count">{programs.length}</div>
          <div className="desc">Total Programs</div>
        </div>
      </div>
      <div className="class-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="class-table">
          <thead>
            <tr>
              <th>Program Name</th>
              <th>Abbreviation</th>
              <th>Assign to Classes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {programs.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.abbreviation}</td>
                <td style={{ minWidth: 180 }}>
                  {mockClasses.map(c => (
                    <label key={c.id} style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={p.classes.includes(c.id)}
                        onChange={() => handleCheckbox(p.id, c.id)}
                        style={{ marginRight: 4 }}
                      />
                      {c.name}
                    </label>
                  ))}
                </td>
                <td>
                  <button className="action-btn edit" onClick={() => handleEdit(p)}><FaEdit /></button>
                  <button className="action-btn delete" onClick={() => handleDelete(p.id)}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            <form className="student-modal-form" onSubmit={handleSubmit}>
              <h2 className="form-title">{editId ? 'Edit Program' : 'Add Program'}</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Program Name *</label>
                  <input className="input-field" type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter Program Name" required />
                  <label className="input-label">Abbreviation *</label>
                  <input className="input-field" type="text" name="abbreviation" value={form.abbreviation} onChange={handleFormChange} placeholder="Enter Abbreviation" required />
                  <label className="input-label">Class(s) *</label>
                  <div style={{ marginBottom: 8 }}>
                    {mockClasses.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#204080', fontWeight: 500, marginBottom: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          name="classes"
                          value={c.id}
                          checked={form.classes.includes(c.id)}
                          onChange={handleFormChange}
                          style={{ accentColor: '#204080' }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              <button type="submit" className="signup-btn">{editId ? 'Save Changes' : 'Create Program'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 