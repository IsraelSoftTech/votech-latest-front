import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import { useYear } from '../context/YearContext';
import { MdWork, MdAdd, MdEdit, MdDelete, MdLogout, MdDashboard, MdPeople, MdSchool, MdPerson, MdMenu, MdClose, MdCheckCircle, MdAttachMoney, MdBadge } from 'react-icons/md';
import ApiService from '../services/api';
import logo from '../assets/logo.png';
import './Vocational.css';

function Vocational() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear, years } = useYear();
  const [vocational, setVocational] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingVocational, setEditingVocational] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    picture1: null,
    picture2: null,
    picture3: null,
    picture4: null,
    year: selectedYear
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          regularNavigate('/');
          return;
        }

        setLoading(true);
        await fetchVocational(selectedYear);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
        regularNavigate('/');
      }
    };

    fetchUserAndData();
  }, [regularNavigate, selectedYear]);

  const fetchVocational = async (year) => {
    try {
      const data = await ApiService.getVocational(year);
      setVocational(data);
    } catch (error) {
      console.error('Error fetching vocational departments:', error);
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
      const submitData = new FormData();
      
      // Append all form data to FormData
      Object.keys(formData).forEach(key => {
        if (key.startsWith('picture') && formData[key]) {
          submitData.append(key, formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      if (!submitData.has('year')) submitData.append('year', formData.year || selectedYear);

      if (editingVocational) {
        await ApiService.updateVocational(editingVocational.id, submitData);
        setSuccessMessage('Vocational department updated successfully!');
      } else {
        await ApiService.createVocational(submitData);
        setSuccessMessage('Vocational department created successfully!');
      }
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      
      setShowModal(false);
      setEditingVocational(null);
      resetForm();
      await fetchVocational(selectedYear);
    } catch (error) {
      console.error('Error saving vocational department:', error);
      setError(error.message);
    }
  };

  const handleEdit = (vocationalItem) => {
    setEditingVocational(vocationalItem);
    setFormData({
      title: vocationalItem.title || '',
      description: vocationalItem.description || '',
      picture1: vocationalItem.picture1 || null,
      picture2: vocationalItem.picture2 || null,
      picture3: vocationalItem.picture3 || null,
      picture4: vocationalItem.picture4 || null,
      year: vocationalItem.year || selectedYear
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vocational department?')) {
      try {
        await ApiService.deleteVocational(id);
        await fetchVocational(selectedYear);
        setShowSuccess(true);
        setSuccessMessage('Vocational department deleted successfully!');
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      } catch (error) {
        console.error('Error deleting vocational department:', error);
        setError(error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      picture1: null,
      picture2: null,
      picture3: null,
      picture4: null,
      year: selectedYear
    });
  };

  const openAddModal = () => {
    setEditingVocational(null);
    resetForm();
    setShowModal(true);
  };

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="vocational-container">
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
          <div className="nav-item" onClick={() => navigateWithLoader('/classes')}>
            <MdSchool className="nav-icon" />
            <span>Classes</span>
          </div>
          <div className="nav-item active">
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
            <p>Loading vocational departments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vocational-container">
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
        <div className="nav-item" onClick={() => navigateWithLoader('/classes')}>
          <MdSchool className="nav-icon" />
          <span>Classes</span>
        </div>
        <div className="nav-item active">
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
          <h1>Vocational Training Management</h1>
          <button className="add-button" onClick={openAddModal}>
            <MdAdd />
            Add Department
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="vocational-table-container">
          <table className="vocational-table">
            <thead>
              <tr>
                <th>Department Title</th>
                <th>Description</th>
                <th>Pictures</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vocational.map((vocationalItem) => (
                <tr key={vocationalItem.id} className="vocational-row">
                  <td className="vocational-title">{vocationalItem.title}</td>
                  <td className="vocational-description">
                    {vocationalItem.description ? (
                      vocationalItem.description.length > 100 
                        ? `${vocationalItem.description.substring(0, 100)}...` 
                        : vocationalItem.description
                    ) : (
                      <span className="no-description">No description</span>
                    )}
                  </td>
                  <td className="vocational-pictures">
                    <div className="pictures-count">
                      {[
                        vocationalItem.picture1,
                        vocationalItem.picture2,
                        vocationalItem.picture3,
                        vocationalItem.picture4
                      ].filter(pic => pic).length} / 4 pictures
                    </div>
                  </td>
                  <td className="vocational-date">
                    {new Date(vocationalItem.created_at).toLocaleDateString()}
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(vocationalItem)}
                      title="Edit Department"
                    >
                      <MdEdit />
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(vocationalItem.id)}
                      title="Delete Department"
                    >
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {vocational.length === 0 && !loading && (
            <div className="empty-table">
              <MdWork className="empty-icon" />
              <h3>No Vocational Departments Found</h3>
              <p>Start by adding your first vocational training department using the "Add Department" button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingVocational ? 'Edit Department' : 'Add New Department'}</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="vocational-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Department Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Computer Science, Carpentry, etc."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Describe the vocational training department..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Picture 1</label>
                  <input
                    type="file"
                    name="picture1"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setFormData(prev => ({
                        ...prev,
                        picture1: file
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Picture 2</label>
                  <input
                    type="file"
                    name="picture2"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setFormData(prev => ({
                        ...prev,
                        picture2: file
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Picture 3</label>
                  <input
                    type="file"
                    name="picture3"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setFormData(prev => ({
                        ...prev,
                        picture3: file
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Picture 4</label>
                  <input
                    type="file"
                    name="picture4"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setFormData(prev => ({
                        ...prev,
                        picture4: file
                      }));
                    }}
                  />
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
                  {editingVocational ? 'Update' : 'Save'} Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="success-message">
          <MdCheckCircle className="success-icon" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}

export default Vocational; 