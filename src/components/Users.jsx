import React, { useEffect, useState } from 'react';
import './Users.css';
import SideTop from './SideTop';
import api from '../services/api';
import { FaEdit, FaTrash, FaBan, FaCheckCircle, FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', contact: '', password: '', role: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [warning, setWarning] = useState({ show: false, type: '', user: null });
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    gender: '',
    role: '',
    password: '',
    repeatPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');

  // Get user role
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin1 = authUser?.role === 'Admin1';
  const isAdmin3 = authUser?.role === 'Admin3';

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

  // Create User functionality
  function handleCreateUserChange(e) {
    const { name, value } = e.target;
    setCreateForm(f => ({ ...f, [name]: value }));
  }

  async function handleCreateUserSubmit(e) {
    e.preventDefault();
    setCreateError('');
    if (!createForm.username || !createForm.password || !createForm.role) {
      setCreateError('Please fill all required fields.');
      return;
    }
    if (createForm.password !== createForm.repeatPassword) {
      setCreateError('Passwords do not match.');
      return;
    }
    setCreateLoading(true);
    try {
      await api.createAccount({
        username: createForm.username,
        contact: createForm.phone,
        password: createForm.password,
        role: createForm.role,
        name: createForm.name,
        email: createForm.email,
        gender: createForm.gender,
      });
      setCreateSuccess('User created successfully!');
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        username: '',
        gender: '',
        role: '',
        password: '',
        repeatPassword: ''
      });
      setTimeout(() => {
        setCreateSuccess('');
        setCreateUserModal(false);
        fetchUsers(); // Refresh the users list
      }, 2000);
    } catch (err) {
      setCreateError('Failed to create user. Try another username.');
    }
    setCreateLoading(false);
  }

  function openCreateUserModal() {
    setCreateUserModal(true);
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      username: '',
      gender: '',
      role: '',
      password: '',
      repeatPassword: ''
    });
    setCreateError('');
    setCreateSuccess('');
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>All Users</h2>
            {isAdmin3 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="users-create-btn" 
                  onClick={openCreateUserModal}
                  style={{
                    backgroundColor: '#204080',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <FaPlus />
                  Create Users
                </button>
              </div>
            )}
          </div>
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
                    <td>{typeof user.name === 'string' ? user.name : 'Unknown User'}</td>
                    <td>{user.username}</td>
                    <td>{user.contact}</td>
                    <td>••••••••</td>
                    <td>{user.role}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      {/* Only show edit for Admin3, else show all actions */}
                      {user.role === 'Admin3' ? (
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
                      ) : (
                        <>
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
                        </>
                      )}
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
                <input name="name" value={typeof editForm.name === 'string' ? editForm.name : ''} onChange={handleEditChange} />
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
        
        {/* Create User Modal */}
        {createUserModal && (
          <div className="users-modal-overlay" onClick={() => setCreateUserModal(false)}>
            <div className="users-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Create New User</h3>
                <button 
                  type="button" 
                  onClick={() => setCreateUserModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
                >
                  ×
                </button>
              </div>
              
              {createSuccess && (
                <div style={{ 
                  backgroundColor: '#d4edda', 
                  color: '#155724', 
                  padding: '10px', 
                  borderRadius: '5px', 
                  marginBottom: '15px',
                  border: '1px solid #c3e6cb'
                }}>
                  {createSuccess}
                </div>
              )}
              
              {createError && (
                <div style={{ 
                  backgroundColor: '#f8d7da', 
                  color: '#721c24', 
                  padding: '10px', 
                  borderRadius: '5px', 
                  marginBottom: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {createError}
                </div>
              )}
              
              <form onSubmit={handleCreateUserSubmit} className="users-edit-form">
                <label>Full Name *</label>
                <input 
                  name="name" 
                  value={createForm.name} 
                  onChange={handleCreateUserChange} 
                  placeholder="Enter Full Name"
                  required
                />
                
                <label>Email *</label>
                <input 
                  name="email" 
                  type="email"
                  value={createForm.email} 
                  onChange={handleCreateUserChange} 
                  placeholder="Enter Email"
                  required
                />
                
                <label>Phone Number *</label>
                <input 
                  name="phone" 
                  type="tel"
                  value={createForm.phone} 
                  onChange={handleCreateUserChange} 
                  placeholder="Enter Phone Number"
                  required
                />
                
                <label>Username *</label>
                <input 
                  name="username" 
                  value={createForm.username} 
                  onChange={handleCreateUserChange} 
                  placeholder="Enter Username"
                  required
                />
                
                <label>Gender *</label>
                <select
                  name="gender"
                  value={createForm.gender}
                  onChange={handleCreateUserChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                
                <label>Role *</label>
                <select
                  name="role"
                  value={createForm.role}
                  onChange={handleCreateUserChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="Admin1">Admin1</option>
                  <option value="Admin2">Admin2</option>
                  <option value="Admin3">Admin3</option>
                  <option value="Admin4">Admin4</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Discipline">Discipline</option>
                  <option value="Psychosocialist">Psychosocialist</option>
                </select>
                
                <label>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password} 
                    onChange={handleCreateUserChange} 
                    placeholder="Enter Password"
                    required
                  />
                  <span 
                    style={{ 
                      position: 'absolute', 
                      right: '10px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      cursor: 'pointer',
                      color: '#666'
                    }}
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                
                <label>Repeat Password *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    name="repeatPassword" 
                    type={showRepeatPassword ? 'text' : 'password'}
                    value={createForm.repeatPassword} 
                    onChange={handleCreateUserChange} 
                    placeholder="Repeat password"
                    required
                  />
                  <span 
                    style={{ 
                      position: 'absolute', 
                      right: '10px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      cursor: 'pointer',
                      color: '#666'
                    }}
                    onClick={() => setShowRepeatPassword(v => !v)}
                  >
                    {showRepeatPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                
                <div className="users-edit-actions">
                  <button 
                    type="submit" 
                    className="users-action-btn" 
                    disabled={createLoading}
                    style={{ 
                      backgroundColor: createLoading ? '#ccc' : '#204080',
                      color: 'white',
                      cursor: createLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {createLoading ? 'Creating...' : 'Create User'}
                  </button>
                  <button 
                    type="button" 
                    className="users-action-btn" 
                    onClick={() => setCreateUserModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 