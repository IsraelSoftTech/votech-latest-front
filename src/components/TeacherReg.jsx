import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYear } from '../context/YearContext';
import ApiService from '../services/api';
import './TeacherReg.css';
import logo from '../assets/logo.png';
import { MdDashboard, MdLogout, MdPeople, MdMenu, MdClose, MdEdit, MdDelete, MdRefresh } from 'react-icons/md';
import { useNavigation } from '../context/NavigationContext';

function TeacherReg() {
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear } = useYear();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasRegisteredTeacher, setHasRegisteredTeacher] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);
  const [showStatusNotification, setShowStatusNotification] = useState(false);
  const [statusNotification, setStatusNotification] = useState('');
  const [formData, setFormData] = useState({
    teacher_name: '',
    subjects: '',
    id_card: ''
  });

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          navigate('/');
          return;
        }
        setLoading(true);
        await fetchTeachers(selectedYear);
      } catch (error) {
        setError(error.message);
        setLoading(false);
        navigate('/');
      }
    };
    fetchUserAndData();

    // Set up polling for real-time updates every 30 seconds
    const pollingInterval = setInterval(() => {
      fetchTeachers(selectedYear);
    }, 30000); // 30 seconds

    // Refresh data when window comes into focus
    const handleFocus = () => {
      fetchTeachers(selectedYear);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate, selectedYear]);

  const fetchTeachers = async (year) => {
    try {
      const data = await ApiService.getTeachers(year);
      setTeachers(data);
      // Check if user has already registered a teacher
      setHasRegisteredTeacher(data.length > 0);
      
      // Check for status changes
      if (data.length > 0) {
        const currentStatus = data[0].status;
        if (previousStatus && previousStatus !== currentStatus) {
          setStatusNotification(`Your teacher registration status has changed to: ${currentStatus.toUpperCase()}`);
          setShowStatusNotification(true);
          setTimeout(() => setShowStatusNotification(false), 5000);
        }
        setPreviousStatus(currentStatus);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        await ApiService.updateTeacher(editingTeacher.id, formData);
        setSuccessMessage('Teacher updated successfully!');
      } else {
        await ApiService.createTeacher(formData);
        setSuccessMessage('Teacher added successfully!');
        setHasRegisteredTeacher(true);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setShowModal(false);
      setEditingTeacher(null);
      resetForm();
      await fetchTeachers(selectedYear);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacher_name: teacher.teacher_name || '',
      subjects: teacher.subjects || '',
      id_card: teacher.id_card || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await ApiService.deleteTeacher(id);
        await fetchTeachers(selectedYear);
        setHasRegisteredTeacher(false);
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      teacher_name: '',
      subjects: '',
      id_card: ''
    });
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      navigateWithLoader('/');
    } catch (error) {
      navigateWithLoader('/');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchTeachers(selectedYear);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="teacherreg-dashboard-container">
        <button className="teacherreg-hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {sidebarOpen && <div className="teacherreg-sidebar-overlay" onClick={handleSidebarClose}></div>}
        <div className={`teacherreg-sidebar${sidebarOpen ? ' open' : ''}`}>  
          <div className="teacherreg-logo-section">
            <img src={logo} alt="MPASAT Logo" className="teacherreg-logo" />
            <h1>MPASAT</h1>
            <button className="teacherreg-sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="teacherreg-nav-item" onClick={() => navigateWithLoader('/teacher-dashboard')}>
            <MdDashboard className="teacherreg-nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="teacherreg-nav-item active">
            <MdPeople className="teacherreg-nav-icon" />
            <span>Register</span>
          </div>
          <div className="teacherreg-nav-item" onClick={handleLogout}>
            <MdLogout className="teacherreg-nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="teacherreg-main-content">
          <div className="teacherreg-loading-container">
            <div className="teacherreg-loading-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacherreg-dashboard-container">
      {/* Hamburger menu for mobile */}
      <button className="teacherreg-hamburger-menu" onClick={handleSidebarToggle}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="teacherreg-sidebar-overlay" onClick={handleSidebarClose}></div>}
      {/* Sidebar */}
      <div className={`teacherreg-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="teacherreg-logo-section">
          <img src={logo} alt="MPASAT Logo" className="teacherreg-logo" />
          <h1>MPASAT</h1>
          <button className="teacherreg-sidebar-close" onClick={handleSidebarClose}>
            <MdClose />
          </button>
        </div>
        <div className="teacherreg-nav-item" onClick={() => navigateWithLoader('/teacher-dashboard')}>
          <MdDashboard className="teacherreg-nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="teacherreg-nav-item active">
          <MdPeople className="teacherreg-nav-icon" />
          <span>Register</span>
        </div>
        <div className="teacherreg-nav-item" onClick={handleLogout}>
          <MdLogout className="teacherreg-nav-icon" />
          <span>Logout</span>
        </div>
      </div>
      {/* Main Content */}
      <div className="teacherreg-main-content">
        <div className="teacherreg-header">
          <h1>Teacher Registration</h1>
          <div className="teacherreg-header-actions">
            <button className="teacherreg-refresh-btn" onClick={handleRefresh} title="Refresh Data">
              <MdRefresh />
            </button>
            {!hasRegisteredTeacher ? (
              <button className="teacherreg-add-button" onClick={() => {
                setEditingTeacher(null);
                resetForm();
                setShowModal(true);
              }}>
                Add Teacher
              </button>
            ) : (
              <div className="teacherreg-registered-status">
                <span className="teacherreg-status-text">✓ Teacher Already Registered</span>
              </div>
            )}
          </div>
        </div>
        {error && <div className="teacherreg-error">{error}</div>}
        {showSuccess && (
          <div className="teacherreg-success-message">
            {successMessage}
          </div>
        )}
        {showStatusNotification && (
          <div className="teacherreg-status-notification">
            {statusNotification}
          </div>
        )}
        {hasRegisteredTeacher && (
          <div className="teacherreg-info-message">
            <p>You have already registered a teacher. You can only register one teacher per account.</p>
          </div>
        )}
        {/* Teachers Table */}
        <div className="teacherreg-table-container">
          <table className="teacherreg-table">
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Subjects</th>
                <th>ID Card</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.teacher_name}</td>
                  <td>{teacher.subjects}</td>
                  <td>{teacher.id_card || '-'}</td>
                  <td className={`status-cell status-${teacher.status}`}>
                    <span className={`status-badge status-${teacher.status}`}>
                      {teacher.status === 'pending' ? 'PENDING' : 
                       teacher.status === 'approved' ? 'APPROVED' : 'REJECTED'}
                    </span>
                  </td>
                  <td>
                    <button className="teacherreg-edit-btn" onClick={() => handleEdit(teacher)}>
                      <MdEdit />
                    </button>
                    <button className="teacherreg-delete-btn" onClick={() => handleDelete(teacher.id)}>
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {teachers.length === 0 && (
            <div className="teacherreg-empty-state">
              <p>No teachers registered yet. Click "Add Teacher" to get started.</p>
            </div>
          )}
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="teacherreg-modal-overlay">
          <div className="teacherreg-modal">
            <div className="teacherreg-modal-header">
              <h2>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button className="teacherreg-modal-close" onClick={() => setShowModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="teacherreg-form">
              <div className="teacherreg-form-group">
                <label>Teacher Name *</label>
                <input
                  type="text"
                  name="teacher_name"
                  value={formData.teacher_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter teacher name"
                />
              </div>
              <div className="teacherreg-form-group">
                <label>Subjects *</label>
                <input
                  type="text"
                  name="subjects"
                  value={formData.subjects}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter subjects taught"
                />
              </div>
              <div className="teacherreg-form-group">
                <label>ID Card</label>
                <input
                  type="text"
                  name="id_card"
                  value={formData.id_card}
                  onChange={handleInputChange}
                  placeholder="Enter ID card number"
                />
              </div>
              <div className="teacherreg-form-actions">
                <button type="button" className="teacherreg-cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="teacherreg-save-btn">
                  {editingTeacher ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherReg; 