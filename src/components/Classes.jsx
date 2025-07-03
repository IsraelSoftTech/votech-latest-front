import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import { useYear } from '../context/YearContext';
import { MdSchool, MdAdd, MdEdit, MdDelete, MdLogout, MdDashboard, MdPeople, MdWork, MdPerson, MdMenu, MdClose, MdCheckCircle, MdAttachMoney, MdBadge } from 'react-icons/md';
import ApiService from '../services/api';
import logo from '../assets/logo.png';
import './Classes.css';

function Classes() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear, years } = useYear();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    registration_fee: '',
    tuition_fee: '',
    vocational_fee: '',
    sport_wear_fee: '',
    health_sanitation_fee: '',
    number_of_installments: '1',
    year: selectedYear
  });

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          regularNavigate('/');
          return;
        }

        setLoading(true);
        await fetchClasses(selectedYear);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
        regularNavigate('/');
      }
    };

    fetchUserAndData();
  }, [regularNavigate, selectedYear]);

  const fetchClasses = async (year) => {
    try {
      const data = await ApiService.getClasses(year);
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      regularNavigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      regularNavigate('/');
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
      const submitData = {
        ...formData,
        registration_fee: parseFloat(formData.registration_fee) || 0,
        tuition_fee: parseFloat(formData.tuition_fee) || 0,
        vocational_fee: parseFloat(formData.vocational_fee) || 0,
        sport_wear_fee: parseFloat(formData.sport_wear_fee) || 0,
        health_sanitation_fee: parseFloat(formData.health_sanitation_fee) || 0,
        number_of_installments: parseInt(formData.number_of_installments) || 1,
        year: formData.year || selectedYear
      };

      if (editingClass) {
        await ApiService.updateClass(editingClass.id, submitData);
        setSuccessMessage('Class updated successfully!');
      } else {
        await ApiService.createClass(submitData);
        setSuccessMessage('Class created successfully!');
      }
      
      setShowModal(false);
      setEditingClass(null);
      resetForm();
      await fetchClasses(selectedYear);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving class:', error);
      setError(error.message);
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name || '',
      registration_fee: classItem.registration_fee || '',
      tuition_fee: classItem.tuition_fee || '',
      vocational_fee: classItem.vocational_fee || '',
      sport_wear_fee: classItem.sport_wear_fee || '',
      health_sanitation_fee: classItem.health_sanitation_fee || '',
      number_of_installments: classItem.number_of_installments || '1',
      year: classItem.year || selectedYear
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await ApiService.deleteClass(id);
        await fetchClasses(selectedYear);
        setShowSuccess(true);
        setSuccessMessage('Class deleted successfully!');
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      } catch (error) {
        console.error('Error deleting class:', error);
        setError(error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      registration_fee: '',
      tuition_fee: '',
      vocational_fee: '',
      sport_wear_fee: '',
      health_sanitation_fee: '',
      number_of_installments: '1',
      year: selectedYear
    });
  };

  const openAddModal = () => {
    setEditingClass(null);
    resetForm();
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="classes-container">
        {/* Hamburger menu for mobile */}
        <button className="hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={handleSidebarClose}></div>}
        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="logo-section">
            <img src={logo} alt="MPASAT Logo" className="logo" />
            <h1>MPASAT</h1>
            {/* Close button for mobile */}
            <button className="sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/dashboard')}>
            <MdDashboard className="nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/students')}>
            <MdPeople className="nav-icon" />
            <span>Students</span>
          </div>
          <div className="nav-item active">
            <MdSchool className="nav-icon" />
            <span>Classes</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
            <MdWork className="nav-icon" />
            <span>Vocational</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}>
            <MdPerson className="nav-icon" />
            <span>Teachers</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/fees')}>
            <MdAttachMoney className="nav-icon" />
            <span>Fees</span>
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/id-cards')}>
            <MdBadge className="nav-icon" />
            <span>ID Cards</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <MdLogout className="nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="classes-container">
      {/* Hamburger menu for mobile */}
      <button className="hamburger-menu" onClick={handleSidebarToggle}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={handleSidebarClose}></div>}
      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="logo-section">
          <img src={logo} alt="MPASAT Logo" className="logo" />
          <h1>MPASAT</h1>
          {/* Close button for mobile */}
          <button className="sidebar-close" onClick={handleSidebarClose}>
            <MdClose />
          </button>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/dashboard')}>
          <MdDashboard className="nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/students')}>
          <MdPeople className="nav-icon" />
          <span>Students</span>
        </div>
        <div className="nav-item active">
          <MdSchool className="nav-icon" />
          <span>Classes</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
          <MdWork className="nav-icon" />
          <span>Vocational</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}>
          <MdPerson className="nav-icon" />
          <span>Teachers</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/fees')}>
          <MdAttachMoney className="nav-icon" />
          <span>Fees</span>
        </div>
        <div className="nav-item" onClick={() => navigateWithLoader('/id-cards')}>
          <MdBadge className="nav-icon" />
          <span>ID Cards</span>
        </div>
        <div className="nav-item" onClick={handleLogout}>
          <MdLogout className="nav-icon" />
          <span>Logout</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1>Class Management</h1>
          <button className="add-button" onClick={openAddModal}>
            <MdAdd />
            Add Class
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showSuccess && (
          <div className="success-message">
            <MdCheckCircle className="success-icon" />
            {successMessage}
          </div>
        )}

        <div className="classes-table-container">
          <table className="classes-table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Registration Fee</th>
                <th>Tuition Fee</th>
                <th>Vocational Fee</th>
                <th>Sport Wear Fee</th>
                <th>Health & Sanitation Fee</th>
                <th>Total Fees</th>
                <th>Installments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem) => (
                <tr key={classItem.id} className="class-row">
                  <td className="class-name">{classItem.name}</td>
                  <td>{formatCurrency(classItem.registration_fee)}</td>
                  <td>{formatCurrency(classItem.tuition_fee)}</td>
                  <td>{formatCurrency(classItem.vocational_fee)}</td>
                  <td>{formatCurrency(classItem.sport_wear_fee)}</td>
                  <td>{formatCurrency(classItem.health_sanitation_fee)}</td>
                  <td className="total-fees">{formatCurrency(
                    (parseFloat(classItem.registration_fee) || 0) + 
                    (parseFloat(classItem.tuition_fee) || 0) + 
                    (parseFloat(classItem.vocational_fee) || 0) + 
                    (parseFloat(classItem.sport_wear_fee) || 0) + 
                    (parseFloat(classItem.health_sanitation_fee) || 0)
                  )}</td>
                  <td>{classItem.number_of_installments}</td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(classItem)}
                      title="Edit Class"
                    >
                      <MdEdit />
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(classItem.id)}
                      title="Delete Class"
                    >
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {classes.length === 0 && !loading && (
            <div className="empty-table">
              <MdSchool className="empty-icon" />
              <h3>No Classes Found</h3>
              <p>Start by adding your first class using the "Add Class" button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="class-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Class Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Form 1A, Class 6B"
                  />
                </div>
                <div className="form-group">
                  <label>Number of Installments *</label>
                  <input
                    type="number"
                    name="number_of_installments"
                    value={formData.number_of_installments}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max="12"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registration Fee (XAF)</label>
                  <input
                    type="number"
                    name="registration_fee"
                    value={formData.registration_fee}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Tuition Fee (XAF)</label>
                  <input
                    type="number"
                    name="tuition_fee"
                    value={formData.tuition_fee}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vocational Fee (XAF)</label>
                  <input
                    type="number"
                    name="vocational_fee"
                    value={formData.vocational_fee}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Sport Wear Fee (XAF)</label>
                  <input
                    type="number"
                    name="sport_wear_fee"
                    value={formData.sport_wear_fee}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Health & Sanitation Fee (XAF)</label>
                  <input
                    type="number"
                    name="health_sanitation_fee"
                    value={formData.health_sanitation_fee}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <div className="total-preview">
                    <strong>Total: {formatCurrency(
                      (parseFloat(formData.registration_fee) || 0) +
                      (parseFloat(formData.tuition_fee) || 0) +
                      (parseFloat(formData.vocational_fee) || 0) +
                      (parseFloat(formData.sport_wear_fee) || 0) +
                      (parseFloat(formData.health_sanitation_fee) || 0)
                    )}</strong>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Year *</label>
                  <select name="year" value={formData.year} onChange={handleInputChange} required>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                >
                  {editingClass ? 'Update' : 'Save'} Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classes; 