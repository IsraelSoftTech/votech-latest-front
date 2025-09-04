import React, { useState, useEffect } from 'react';
import './AdminHODs.css';
import SideTop from './SideTop';
import SuccessMessage from './SuccessMessage';
import { FaUserTie, FaPlus, FaEdit, FaTrash, FaEye, FaBan, FaCheck, FaUsers, FaBook, FaBuilding } from 'react-icons/fa';
import api from '../services/api';

function AdminHODs() {
  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHod, setEditingHod] = useState(null);
  const [stats, setStats] = useState({ total_hods: 0, suspended_hods: 0, active_hods: 0 });
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    department_name: '',
    hod_user_id: '',
    subject_id: '',
    teacher_ids: []
  });

  useEffect(() => {
    console.log('AdminHODs component mounted');
    console.log('Initial state - users:', users, 'subjects:', subjects, 'hods:', hods);
    fetchData();
  }, []);
  
  // Monitor data changes
  useEffect(() => {
    console.log('Data updated - users:', users.length, 'subjects:', subjects.length, 'hods:', hods.length);
  }, [users, subjects, hods]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data...');
      
      // Initialize with empty arrays to prevent map errors
      setHods([]);
      setStats({ total_hods: 0, suspended_hods: 0, active_hods: 0 });
      setUsers([]);
      setSubjects([]);
      
      const [hodsData, statsData, usersData, subjectsData] = await Promise.all([
        api.getHODs().catch(err => {
          console.error('Error fetching HODs:', err);
          return [];
        }),
        api.getHODStats().catch(err => {
          console.error('Error fetching stats:', err);
          return { total_hods: 0, suspended_hods: 0, active_hods: 0 };
        }),
        api.getUsers().catch(err => {
          console.error('Error fetching users:', err);
          return [];
        }),
        api.getSubjects().catch(err => {
          console.error('Error fetching subjects:', err);
          return [];
        })
      ]);
      
      console.log('Fetched HODs data:', hodsData);
      console.log('Fetched stats data:', statsData);
      console.log('Fetched users data:', usersData);
      console.log('Fetched subjects data:', subjectsData);
      
      // Ensure we always have arrays/objects
      setHods(Array.isArray(hodsData) ? hodsData : []);
      setStats(statsData && typeof statsData === 'object' ? statsData : { total_hods: 0, suspended_hods: 0, active_hods: 0 });
      setUsers(Array.isArray(usersData) ? usersData : []);
      // Subjects API returns { ok, status, data }. Support both shapes just in case.
      setSubjects(
        Array.isArray(subjectsData?.data)
          ? subjectsData.data
          : (Array.isArray(subjectsData) ? subjectsData : [])
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't show alert, just log the error
      console.log('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHOD = async (e) => {
    e.preventDefault();
    try {
      const newHod = await api.createHOD(formData);
      setHods([newHod, ...hods]);
      setShowCreateModal(false);
      resetForm();
      fetchData(); // Refresh stats
      setSuccessMsg('HOD created successfully!');
    } catch (error) {
      console.error('Error creating HOD:', error);
      alert('Error creating HOD: ' + error.message);
    }
  };

  const handleUpdateHOD = async (e) => {
    e.preventDefault();
    try {
      const updatedHod = await api.updateHOD(editingHod.id, formData);
      setHods(hods.map(hod => hod.id === updatedHod.id ? updatedHod : hod));
      setShowEditModal(false);
      setEditingHod(null);
      resetForm();
      fetchData(); // Refresh stats
    } catch (error) {
      console.error('Error updating HOD:', error);
      alert('Error updating HOD: ' + error.message);
    }
  };

  const handleDeleteHOD = async (id) => {
    if (window.confirm('Are you sure you want to delete this HOD?')) {
      try {
        await api.deleteHOD(id);
        setHods(hods.filter(hod => hod.id !== id));
        fetchData(); // Refresh stats
      } catch (error) {
        console.error('Error deleting HOD:', error);
        alert('Error deleting HOD: ' + error.message);
      }
    }
  };

  const handleToggleSuspension = async (id) => {
    try {
      const updatedHod = await api.toggleHODSuspension(id);
      setHods(hods.map(hod => hod.id === updatedHod.id ? updatedHod : hod));
      fetchData(); // Refresh stats
    } catch (error) {
      console.error('Error toggling suspension:', error);
      alert('Error updating HOD status: ' + error.message);
    }
  };

  const openEditModal = (hod) => {
    setEditingHod(hod);
    setFormData({
      department_name: hod.department_name,
      hod_user_id: hod.hod_user_id,
      subject_id: hod.subject_id,
      teacher_ids: hod.teachers ? hod.teachers.map(t => t.id) : []
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      department_name: '',
      hod_user_id: '',
      subject_id: '',
      teacher_ids: []
    });
  };

  const handleTeacherToggle = (teacherId) => {
    setFormData(prev => ({
      ...prev,
      teacher_ids: prev.teacher_ids.includes(teacherId)
        ? prev.teacher_ids.filter(id => id !== teacherId)
        : [...prev.teacher_ids, teacherId]
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <SideTop>
      <div className="admin-hods-container">
        {successMsg && (
          <SuccessMessage message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {/* Header */}
        <div className="admin-hods-header">
          <h1>HODs Management</h1>
          <button 
            className="admin-hods-create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> Create HOD
          </button>
        </div>
        
        

        {/* Stats Cards */}
        <div className="admin-hods-stats-cards">
          <div className="admin-hods-stat-card admin-hods-total">
            <div className="admin-hods-stat-icon">
              <FaUserTie />
            </div>
            <div className="admin-hods-stat-content">
              <h3>{stats.total_hods}</h3>
              <p>Total HODs</p>
            </div>
          </div>
          
          <div className="admin-hods-stat-card admin-hods-suspended">
            <div className="admin-hods-stat-icon">
              <FaBan />
            </div>
            <div className="admin-hods-stat-content">
              <h3>{stats.suspended_hods}</h3>
              <p>Suspended HODs</p>
            </div>
          </div>
          
          <div className="admin-hods-stat-card admin-hods-active">
            <div className="admin-hods-stat-icon">
              <FaCheck />
            </div>
            <div className="admin-hods-stat-content">
              <h3>{stats.active_hods}</h3>
              <p>Active HODs</p>
            </div>
          </div>
        </div>

        {/* HODs Table */}
        <div className="admin-hods-table-container">
          <h2>Department Heads</h2>
          {loading ? (
            <div className="admin-hods-loading">Loading...</div>
          ) : (
            <div className="admin-hods-table">
              <div className="admin-hods-table-header">
                <div className="admin-hods-header-cell">Department</div>
                <div className="admin-hods-header-cell">HOD</div>
                <div className="admin-hods-header-cell">Subject</div>
                <div className="admin-hods-header-cell">Teachers</div>
                <div className="admin-hods-header-cell">Status</div>
                <div className="admin-hods-header-cell">Created</div>
                <div className="admin-hods-header-cell">Actions</div>
              </div>
              
              {hods.length === 0 ? (
                <div className="admin-hods-no-data">No HODs found</div>
              ) : (
                hods.map(hod => (
                  <div key={hod.id} className={`admin-hods-table-row ${hod.suspended ? 'admin-hods-suspended' : ''}`}>
                    <div className="admin-hods-table-cell">
                      <FaBuilding className="admin-hods-cell-icon" />
                      <span>{hod.department_name}</span>
                    </div>
                    
                    <div className="admin-hods-table-cell">
                      <FaUserTie className="admin-hods-cell-icon" />
                      <div>
                        <div className="admin-hods-user-name">{hod.hod_user_name}</div>
                        <div className="admin-hods-user-username">@{hod.hod_username}</div>
                      </div>
                    </div>
                    
                    <div className="admin-hods-table-cell">
                      <FaBook className="admin-hods-cell-icon" />
                      <div>
                        <div className="admin-hods-subject-name">{hod.subject_name}</div>
                        <div className="admin-hods-subject-code">{hod.subject_code}</div>
                      </div>
                    </div>
                    
                    <div className="admin-hods-table-cell">
                      <FaUsers className="admin-hods-cell-icon" />
                      <span>{hod.teacher_count || 0} teachers</span>
                    </div>
                    
                    <div className="admin-hods-table-cell">
                      <span className={`admin-hods-status-badge ${hod.suspended ? 'admin-hods-suspended' : 'admin-hods-active'}`}>
                        {hod.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                    
                    <div className="admin-hods-table-cell">
                      {formatDate(hod.created_at)}
                    </div>
                    
                    <div className="admin-hods-table-cell admin-hods-actions">
                      <button 
                        className="admin-hods-action-btn admin-hods-edit"
                        onClick={() => openEditModal(hod)}
                        title="Edit HOD"
                      >
                        <FaEdit />
                      </button>
                      
                      <button 
                        className={`admin-hods-action-btn ${hod.suspended ? 'admin-hods-activate' : 'admin-hods-suspend'}`}
                        onClick={() => handleToggleSuspension(hod.id)}
                        title={hod.suspended ? 'Activate HOD' : 'Suspend HOD'}
                      >
                        {hod.suspended ? <FaCheck /> : <FaBan />}
                      </button>
                      
                      <button 
                        className="admin-hods-action-btn admin-hods-delete"
                        onClick={() => handleDeleteHOD(hod.id)}
                        title="Delete HOD"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Create HOD Modal */}
        {showCreateModal && (
          <div className="admin-hods-modal-overlay">
            <div className="admin-hods-modal">
              <div className="admin-hods-modal-header">
                <h2>Create New HOD</h2>
                <button 
                  className="admin-hods-close-btn"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateHOD}>
                <div className="admin-hods-form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    value={formData.department_name}
                    onChange={(e) => setFormData({...formData, department_name: e.target.value})}
                    placeholder="Enter department name"
                    required
                  />
                </div>
                
                <div className="admin-hods-form-group">
                  <label>Select HOD *</label>
                  <select
                    value={formData.hod_user_id}
                    onChange={(e) => setFormData({...formData, hod_user_id: e.target.value})}
                    required
                  >
                    <option value="">Select a staff member</option>
                    {Array.isArray(users) && users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.username}) - {user.role}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="admin-hods-form-group">
                  <label>HOD of Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                    required
                  >
                    <option value="">Select a subject</option>
                    {Array.isArray(subjects) && subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="admin-hods-form-group">
                  <label>Teachers of the Subject</label>
                  <div className="admin-hods-teachers-selection">
                    {Array.isArray(users) && users.map(user => (
                      <label key={user.id} className="admin-hods-teacher-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.teacher_ids.includes(user.id)}
                          onChange={() => handleTeacherToggle(user.id)}
                        />
                        <span className="admin-hods-checkmark"></span>
                        <div className="admin-hods-teacher-info">
                          <div className="admin-hods-teacher-name">{user.name}</div>
                          <div className="admin-hods-teacher-username">@{user.username}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="admin-hods-modal-actions">
                  <button type="button" onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-hods-submit-btn">
                    Create HOD
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit HOD Modal */}
        {showEditModal && editingHod && (
          <div className="admin-hods-modal-overlay">
            <div className="admin-hods-modal">
              <div className="admin-hods-modal-header">
                <h2>Edit HOD</h2>
                <button 
                  className="admin-hods-close-btn"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingHod(null);
                    resetForm();
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdateHOD}>
                <div className="admin-hods-form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    value={formData.department_name}
                    onChange={(e) => setFormData({...formData, department_name: e.target.value})}
                    placeholder="Enter department name"
                    required
                  />
                </div>
                
                <div className="admin-hods-form-group">
                  <label>Select HOD *</label>
                  <select
                    value={formData.hod_user_id}
                    onChange={(e) => setFormData({...formData, hod_user_id: e.target.value})}
                    required
                  >
                    <option value="">Select a staff member</option>
                    {Array.isArray(users) && users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.username}) - {user.role}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="admin-hods-form-group">
                  <label>HOD of Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                    required
                  >
                    <option value="">Select a subject</option>
                    {Array.isArray(subjects) && subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="admin-hods-form-group">
                  <label>Teachers of the Subject</label>
                  <div className="admin-hods-teachers-selection">
                    {Array.isArray(users) && users.map(user => (
                      <label key={user.id} className="admin-hods-teacher-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.teacher_ids.includes(user.id)}
                          onChange={() => handleTeacherToggle(user.id)}
                        />
                        <span className="admin-hods-checkmark"></span>
                        <div className="admin-hods-teacher-info">
                          <div className="admin-hods-teacher-name">{user.name}</div>
                          <div className="admin-hods-teacher-username">@{user.username}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="admin-hods-modal-actions">
                  <button type="button" onClick={() => {
                    setShowEditModal(false);
                    setEditingHod(null);
                    resetForm();
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-hods-submit-btn">
                    Update HOD
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

export default AdminHODs;
