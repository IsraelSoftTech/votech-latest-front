import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Teachers.css';
import logo from '../assets/logo.png';
import { useNavigation } from '../context/NavigationContext';
import { MdDashboard, MdLogout, MdPeople, MdSchool, MdWork, MdPerson, MdAdd, MdEdit, MdDelete, MdSearch, MdMenu, MdClose, MdCheckCircle, MdAttachMoney, MdBadge, MdCheck, MdClose as MdReject } from 'react-icons/md';
import ApiService from '../services/api';
import { useYear } from '../context/YearContext';

function Teachers() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear } = useYear();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    teacher_name: '',
    subjects: '',
    id_card: '',
    classes_taught: '',
    salary_amount: ''
  });

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          regularNavigate('/');
          return;
        }

        await fetchTeachers(selectedYear);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [regularNavigate, selectedYear]);

  const fetchTeachers = async (year) => {
    try {
      setLoading(true);
      const data = await ApiService.getTeachers(year);
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
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

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setFormData({
      teacher_name: '',
      subjects: '',
      id_card: '',
      classes_taught: '',
      salary_amount: ''
    });
    setShowModal(true);
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacher_name: teacher.teacher_name,
      subjects: teacher.subjects,
      id_card: teacher.id_card || '',
      classes_taught: teacher.classes_taught || '',
      salary_amount: teacher.salary_amount
    });
    setShowModal(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await ApiService.deleteTeacher(teacherId);
        await fetchTeachers(selectedYear);
        setShowSuccess(true);
        setSuccessMessage('Teacher deleted successfully!');
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      } catch (error) {
        console.error('Error deleting teacher:', error);
        setError(error.message);
      }
    }
  };

  const handleApproveTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to approve this teacher?')) {
      try {
        await ApiService.updateTeacherStatus(teacherId, 'approved');
        await fetchTeachers(selectedYear);
        setShowSuccess(true);
        setSuccessMessage('Teacher approved successfully!');
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      } catch (error) {
        console.error('Error approving teacher:', error);
        setError(error.message);
      }
    }
  };

  const handleRejectTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to reject this teacher?')) {
      try {
        await ApiService.updateTeacherStatus(teacherId, 'rejected');
        await fetchTeachers(selectedYear);
        setShowSuccess(true);
        setSuccessMessage('Teacher rejected successfully!');
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      } catch (error) {
        console.error('Error rejecting teacher:', error);
        setError(error.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send all the form data
      const teacherData = {
        teacher_name: formData.teacher_name,
        subjects: formData.subjects,
        id_card: formData.id_card,
        classes_taught: formData.classes_taught,
        salary_amount: formData.salary_amount
      };

      if (editingTeacher) {
        await ApiService.updateTeacher(editingTeacher.id, teacherData);
        setSuccessMessage('Teacher updated successfully!');
      } else {
        await ApiService.createTeacher(teacherData);
        setSuccessMessage('Teacher created successfully!');
      }
      setShowModal(false);
      setEditingTeacher(null);
      // Reset form data
      setFormData({
        teacher_name: '',
        subjects: '',
        id_card: '',
        classes_taught: '',
        salary_amount: ''
      });
      // Refresh the teachers list
      await fetchTeachers(selectedYear);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving teacher:', error);
      setError(error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subjects.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.id_card && teacher.id_card.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="teachers-page-wrapper">
        <div className="teachers-container">
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
            <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
              <MdWork className="nav-icon" />
              <span>Vocational</span>
            </div>
            <div className="nav-item active">
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
              <p>Loading teachers...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teachers-page-wrapper">
      <div className="teachers-container">
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
          <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
            <MdWork className="nav-icon" />
            <span>Vocational</span>
          </div>
          <div className="nav-item active">
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
            <h1>Teacher Management</h1>
            <button className="add-button" onClick={handleAddTeacher}>
              <MdAdd />
              Add Teacher
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="search-section">
            <div className="search-box">
              <MdSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search teachers by name, subjects, or ID card..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="teachers-table-container">
            <table className="teachers-table">
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Subjects</th>
                  <th>ID Card</th>
                  <th>Classes Taught</th>
                  <th>Salary Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="teacher-row">
                    <td className="teacher-name">{teacher.teacher_name}</td>
                    <td>{teacher.subjects}</td>
                    <td>{teacher.id_card || '-'}</td>
                    <td>{teacher.classes_taught || '-'}</td>
                    <td className="salary-amount">{new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'XAF',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(parseFloat(teacher.salary_amount))}</td>
                    <td className={`status-cell status-${teacher.status}`}>
                      <span className={`status-badge status-${teacher.status}`}>
                        {teacher.status === 'pending' ? 'PENDING' : 
                         teacher.status === 'approved' ? 'APPROVED' : 'REJECTED'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditTeacher(teacher)}
                        title="Edit Teacher"
                        aria-label="Edit Teacher"
                      >
                        <MdEdit />
                      </button>
                      {teacher.status === 'pending' && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleApproveTeacher(teacher.id)}
                            title="Approve Teacher"
                            aria-label="Approve Teacher"
                          >
                            <MdCheck />
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleRejectTeacher(teacher.id)}
                            title="Reject Teacher"
                            aria-label="Reject Teacher"
                          >
                            <MdReject />
                          </button>
                        </>
                      )}
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        title="Delete Teacher"
                        aria-label="Delete Teacher"
                      >
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredTeachers.length === 0 && !loading && (
              <div className="empty-table">
                <MdPerson className="empty-icon" />
                <h3>No Teachers Found</h3>
                <p>Start by adding your first teacher using the "Add Teacher" button above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="teacher-form">
                <div className="form-group">
                  <label htmlFor="teacher_name">Teacher Name *</label>
                  <input
                    type="text"
                    id="teacher_name"
                    name="teacher_name"
                    value={formData.teacher_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subjects">Subjects *</label>
                  <textarea
                    id="subjects"
                    name="subjects"
                    value={formData.subjects}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter subjects taught (e.g., Mathematics, Physics, Chemistry)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="id_card">ID Card</label>
                  <input
                    type="text"
                    id="id_card"
                    name="id_card"
                    value={formData.id_card}
                    onChange={handleInputChange}
                    placeholder="Teacher ID card number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="classes_taught">Classes Taught</label>
                  <textarea
                    id="classes_taught"
                    name="classes_taught"
                    value={formData.classes_taught}
                    onChange={handleInputChange}
                    placeholder="Enter classes taught (e.g., Class 10A, Class 11B)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="salary_amount">Salary Amount *</label>
                  <input
                    type="number"
                    id="salary_amount"
                    name="salary_amount"
                    value={formData.salary_amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
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
    </div>
  );
}

export default Teachers; 