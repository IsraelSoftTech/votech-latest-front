import React, { useEffect, useMemo, useState } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import { FaEdit, FaTrash } from 'react-icons/fa';

export default function TeacherCases({ noLayoutWrapper = false }) {
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState({ teacher_id: '', case_name: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const authUser = JSON.parse(sessionStorage.getItem('authUser') || 'null');

  const canWrite = ['Discipline', 'Psychosocialist', 'Psycho'].includes(authUser?.role);

  useEffect(() => {
    const load = async () => {
      try {
        const [allUsers, all] = await Promise.all([
          api.getAllUsersForChat().catch(() => []),
          api.getTeacherDisciplineCases().catch(() => []),
        ]);
        setUsers(Array.isArray(allUsers) ? allUsers : []);
        setCases(Array.isArray(all) ? all : []);
        setError('');
      } catch (e) {
        console.error('Init load failed', e);
        setError('Failed to load data');
      }
      setListLoading(false);
    };
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!form.teacher_id || !form.case_name) return alert('Teacher and Case name are required');
    try {
      setLoading(true);
      const payload = { user_id: form.teacher_id, case_description: form.description || form.case_name };
      const created = await api.createTeacherDisciplineCase(payload);
      setCases(prev => [created, ...prev]);
      setForm({ teacher_id: '', case_name: '', description: '' });
      setSuccess('Recorded successfully');
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      console.error('Create teacher case failed', e);
      setError(e?.message || 'Failed to record case');
      setTimeout(() => setError(''), 2500);
    } finally {
      setLoading(false);
    }
  };

  const removeCase = async (id) => {
    if (!canWrite) return;
    if (!window.confirm('Delete this case?')) return;
    try {
      await api.deleteTeacherDisciplineCase(id);
      setCases(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error('Delete case failed', e);
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setForm({ teacher_id: String(c.teacher_id || ''), case_name: c.case_name || c.case_description || '', description: c.description || c.case_description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!canWrite || !editId) return;
    try {
      setLoading(true);
      const payload = { user_id: form.teacher_id, case_description: form.description || form.case_name };
      const updated = await api.updateTeacherDisciplineCaseStatus(editId, payload);
      setCases(prev => prev.map(c => (c.id === editId ? { ...c, ...updated } : c)));
      setEditId(null);
      setForm({ teacher_id: '', case_name: '', description: '' });
      setSuccess('Updated successfully');
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      console.error('Update teacher case failed', e);
      setError(e?.message || 'Failed to update case');
      setTimeout(() => setError(''), 2500);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = useMemo(() => {
    if (!query) return cases;
    const q = query.toLowerCase();
    return cases.filter(c =>
      String(c.teacher_name || c.teacher_username || '').toLowerCase().includes(q) ||
      String(c.case_name || '').toLowerCase().includes(q) ||
      String(c.description || '').toLowerCase().includes(q)
    );
  }, [cases, query]);

  const content = (
    <div style={{ padding: 16 }}>
        <style>{`
          .tc-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
          .tc-header { padding: 14px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 800; font-size: 18px; }
          .tc-body { padding: 16px; }
          .tc-row { display: flex; flex-wrap: wrap; gap: 12px; }
          .tc-col { flex: 1 1 240px; min-width: 220px; }
          .tc-input, .tc-select, .tc-textarea { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .tc-textarea { resize: vertical; }
          .tc-btn { padding: 10px 14px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
          .tc-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
          .tc-table { width: 100%; border-collapse: collapse; }
          .tc-table th, .tc-table td { border: 1px solid #e5e7eb; padding: 10px; font-size: 14px; }
          .tc-actions { display: flex; gap: 8px; }
          .tc-badge { padding: 4px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-weight: 600; font-size: 12px; }
        `}</style>

        <div className="tc-card" style={{ marginBottom: 16 }}>
          <div className="tc-header">Teachers' Cases</div>
          <div className="tc-body">
            <div className="tc-row" style={{ justifyContent: 'space-between' }}>
              <div className="tc-col" style={{ maxWidth: 360 }}>
                <input className="tc-input" placeholder="Search by teacher, case or description" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <div className="tc-col" style={{ maxWidth: 200, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span className="tc-badge">{filteredCases.length} record(s)</span>
              </div>
            </div>
          </div>
        </div>

        {canWrite && (
          <div className="tc-card" style={{ marginBottom: 16 }}>
            <div className="tc-header">Record a Case</div>
            <div className="tc-body">
              {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
              {success && <div style={{ color: '#065f46', marginBottom: 8 }}>{success}</div>}
              <form onSubmit={submit}>
                <div className="tc-row">
                  <div className="tc-col">
                    <label>Teacher</label>
                    <select className="tc-select" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}>
                      <option value="">Select teacher</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="tc-col">
                    <label>Case name</label>
                    <input className="tc-input" value={form.case_name} onChange={e => setForm({ ...form, case_name: e.target.value })} placeholder="Case title" />
                  </div>
                </div>
                <div className="tc-row" style={{ marginTop: 8 }}>
                  <div className="tc-col" style={{ flex: '1 1 100%' }}>
                    <label>Description</label>
                    <textarea className="tc-textarea" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details" />
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {editId ? (
                    <>
                      <button className="tc-btn primary" onClick={saveEdit} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                      <button className="tc-btn" type="button" onClick={() => { setEditId(null); setForm({ teacher_id: '', case_name: '', description: '' }); }}>Cancel</button>
                    </>
                  ) : (
                    <button className="tc-btn primary" disabled={loading}>{loading ? 'Saving...' : 'Record Case'}</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="tc-card">
          <div className="tc-header">All Recorded Cases</div>
          <div className="tc-body" style={{ overflowX: 'auto' }}>
            {listLoading ? (
              <div style={{ padding: 12, color: '#6b7280' }}>Loading...</div>
            ) : (
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Teacher</th>
                    <th>Case</th>
                    <th>Description</th>
                    <th>Recorded</th>
                    {canWrite ? (<th>Actions</th>) : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c, idx) => (
                    <tr key={c.id}>
                      <td>{idx + 1}</td>
                      <td>{c.teacher_name || c.teacher_username || c.teacher_id}</td>
                      <td>{c.case_name || c.case_description}</td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{c.description || c.case_description}</td>
                      <td>{c.created_at ? new Date(c.created_at).toLocaleString() : (c.recorded_at ? new Date(c.recorded_at).toLocaleString() : '')}</td>
                      {canWrite ? (
                        <td>
                          <div className="tc-actions">
                            <button className="tc-btn" title="Edit" onClick={() => startEdit(c)}>
                              <FaEdit />
                            </button>
                            <button className="tc-btn" title="Delete" onClick={() => removeCase(c.id)}>
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {filteredCases.length === 0 && (
                    <tr><td colSpan={canWrite ? 6 : 5} style={{ padding: 12, color: '#6b7280' }}>No records</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
  );

  return noLayoutWrapper ? content : <SideTop>{content}</SideTop>;
}


