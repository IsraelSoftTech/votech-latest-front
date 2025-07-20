import React, { useEffect, useState } from 'react';
import './Users.css';
import SideTop from './SideTop';
import api from '../services/api';
import { FaEdit, FaTrash, FaBan, FaCheckCircle } from 'react-icons/fa';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', contact: '', password: '', role: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [warning, setWarning] = useState({ show: false, type: '', user: null });

  // Get user role
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin1 = authUser?.role === 'Admin1';

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAllUsers();
      setUsers(res);
    } catch (err) {
      setError('Failed to fetch users.');
    }
    setLoading(false);
  }

  function handleEdit(user) {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      username: user.username,
      contact: user.contact,
      password: '',
      role: user.role
    });
    setModalOpen(true);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      await api.updateUser(editUser.id, editForm);
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert('Failed to update user.');
    }
  }

  function handleDelete(user) {
    setWarning({ show: true, type: 'delete', user });
  }
  function handleSuspend(user) {
    setWarning({ show: true, type: 'suspend', user });
  }
  async function confirmWarning() {
    if (!warning.user) return;
    if (warning.type === 'delete') {
      try {
        await api.deleteUser(warning.user.id);
        setWarning({ show: false, type: '', user: null });
        fetchUsers();
      } catch (err) {
        alert('Failed to delete user.');
      }
    } else if (warning.type === 'suspend') {
      try {
        await api.suspendUser(warning.user.id);
        setWarning({ show: false, type: '', user: null });
        fetchUsers();
      } catch (err) {
        alert('Failed to suspend user.');
      }
    }
  }
  function cancelWarning() {
    setWarning({ show: false, type: '', user: null });
  }

  const totalUsers = users.length;
  const suspendedUsers = users.filter(u => u.suspended).length;

  return (
    <SideTop>
      <div className="users-main-content">
        <div className="users-dashboard-cards">
          <div className="users-card">
            <div className="users-card-title">Total Users</div>
            <div className="users-card-value">{totalUsers}</div>
          </div>
          <div className="users-card">
            <div className="users-card-title">Suspended Users</div>
            <div className="users-card-value">{suspendedUsers}</div>
          </div>
        </div>
        <div className="users-table-container">
          <h2>All Users</h2>
          {loading ? <div>Loading...</div> : error ? <div className="error-message">{error}</div> : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Password</th>
                  <th>Account Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className={user.suspended ? 'suspended' : ''}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.contact}</td>
                    <td>••••••••</td>
                    <td>{user.role}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="users-action-btn"
                        aria-label="Edit"
                        data-tooltip={isAdmin1 ? 'Not allowed for Admin1' : 'Edit'}
                        onClick={() => handleEdit(user)}
                        type="button"
                        disabled={isAdmin1}
                        style={isAdmin1 ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="users-action-btn suspend"
                        aria-label={user.suspended ? 'Unsuspend' : 'Suspend'}
                        data-tooltip={isAdmin1 ? 'Not allowed for Admin1' : (user.suspended ? 'Unsuspend' : 'Suspend')}
                        onClick={() => handleSuspend(user)}
                        type="button"
                        disabled={isAdmin1}
                        style={isAdmin1 ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                      >
                        {user.suspended ? <FaCheckCircle /> : <FaBan />}
                      </button>
                      <button
                        className="users-action-btn delete"
                        aria-label="Delete"
                        data-tooltip={isAdmin1 ? 'Not allowed for Admin1' : 'Delete'}
                        onClick={() => handleDelete(user)}
                        type="button"
                        disabled={isAdmin1}
                        style={isAdmin1 ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {modalOpen && (
          <div className="users-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="users-modal" onClick={e => e.stopPropagation()}>
              <h3>Edit User</h3>
              <form onSubmit={handleEditSubmit} className="users-edit-form">
                <label>Name</label>
                <input name="name" value={editForm.name} onChange={handleEditChange} />
                <label>Username</label>
                <input name="username" value={editForm.username} onChange={handleEditChange} />
                <label>Phone</label>
                <input name="contact" value={editForm.contact} onChange={handleEditChange} />
                <label>Password</label>
                <input name="password" value={editForm.password} onChange={handleEditChange} type="password" />
                <label>Account Type</label>
                <input name="role" value={editForm.role} onChange={handleEditChange} />
                <div className="users-edit-actions">
                  <button type="submit" className="users-action-btn" disabled={isAdmin1} style={isAdmin1 ? { cursor: 'not-allowed', opacity: 0.6 } : {}}>{isAdmin1 ? 'Not allowed for Admin1' : 'Save'}</button>
                  <button type="button" className="users-action-btn" onClick={() => setModalOpen(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {warning.show && (
          <div className="users-modal-overlay" onClick={cancelWarning}>
            <div className="users-warning-modal" onClick={e => e.stopPropagation()}>
              <h4>{warning.type === 'delete' ? 'Delete User' : warning.type === 'suspend' ? (warning.user?.suspended ? 'Unsuspend User' : 'Suspend User') : ''}</h4>
              <p>
                {warning.type === 'delete' && 'Are you sure you want to delete this user? This action cannot be undone.'}
                {warning.type === 'suspend' && (warning.user?.suspended ? 'Are you sure you want to unsuspend this user?' : 'Are you sure you want to suspend this user?')}
              </p>
              <div className="users-warning-actions">
                <button className="users-warning-btn" onClick={confirmWarning} disabled={isAdmin1} style={isAdmin1 ? { cursor: 'not-allowed', opacity: 0.6 } : {}}>{warning.type === 'delete' ? 'Delete' : warning.user?.suspended ? 'Unsuspend' : 'Suspend'}</button>
                <button className="users-warning-btn cancel" onClick={cancelWarning}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 