import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYear } from '../context/YearContext';
import ApiService from '../services/api';
import './UserReg.css';
import logo from '../assets/logo.png';
import { MdDashboard, MdLogout, MdPeople, MdMenu, MdClose, MdEdit, MdDelete } from 'react-icons/md';
import { useNavigation } from '../context/NavigationContext';

function UserReg() {
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear } = useYear();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [vocationals, setVocationals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [hasRegisteredStudent, setHasRegisteredStudent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [formData, setFormData] = useState({
    registration_date: '',
    full_name: '',
    sex: 'Male',
    date_of_birth: '',
    place_of_birth: '',
    father_name: '',
    mother_name: '',
    previous_class: '',
    next_class: '',
    previous_average: '',
    guardian_contact: '',
    student_picture: null,
    vocational_training: '',
    class_id: ''
  });

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const authUser = sessionStorage.getItem('authUser');
        if (!authUser) {
          navigate('/');
          return;
        }
        const user = JSON.parse(authUser);
        setUserRole(user.role);
        setLoading(true);
        await Promise.all([
          fetchStudents(selectedYear),
          fetchClasses(selectedYear),
          fetchVocationals(selectedYear)
        ]);
      } catch (error) {
        setError(error.message);
        setLoading(false);
        navigate('/');
      }
    };
    fetchUserAndData();
  }, [navigate, selectedYear]);

  const fetchStudents = async (year) => {
    try {
      const data = await ApiService.getStudents(year);
      setStudents(data);
      // Check if user has already registered a student (for student role)
      const authUser = sessionStorage.getItem('authUser');
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user.role === 'student') {
          setHasRegisteredStudent(data.length > 0);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (year) => {
    try {
      const data = await ApiService.getClasses(year);
      setClasses(data);
    } catch (error) {
      // ignore
    }
  };

  const fetchVocationals = async (year) => {
    try {
      const data = await ApiService.getVocational(year);
      setVocationals(data);
    } catch (error) {
      // ignore
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
    
    // Check if student has already registered and this is a new registration
    if (userRole === 'student' && hasRegisteredStudent && !editingStudent) {
      setError('You have already registered yourself as a student. Students can only register once.');
      return;
    }
    
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'student_picture' && formData[key]) {
          submitData.append(key, formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });
      if (editingStudent) {
        await ApiService.updateStudent(editingStudent.id, submitData);
        setSuccessMessage('Student updated successfully!');
      } else {
        await ApiService.createStudent(submitData);
        setSuccessMessage('Student added successfully!');
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setShowModal(false);
      setEditingStudent(null);
      resetForm();
      setError(null);
      await fetchStudents(selectedYear);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      registration_date: student.registration_date || '',
      full_name: student.full_name || '',
      sex: student.sex || 'Male',
      date_of_birth: student.date_of_birth || '',
      place_of_birth: student.place_of_birth || '',
      father_name: student.father_name || '',
      mother_name: student.mother_name || '',
      previous_class: student.previous_class || '',
      next_class: student.next_class || '',
      previous_average: student.previous_average || '',
      guardian_contact: student.guardian_contact || '',
      student_picture: null,
      vocational_training: student.vocational_training || '',
      class_id: student.class_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await ApiService.deleteStudent(id);
        await fetchStudents(selectedYear);
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    
    try {
      await ApiService.deleteStudent(studentToDelete.id);
      setSuccessMessage('Student deleted successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      await fetchStudents(selectedYear);
    } catch (error) {
      setError(error.message);
    } finally {
      setShowDeleteConfirm(false);
      setStudentToDelete(null);
    }
  };

  const handleDeleteAllClick = () => {
    setShowDeleteAllConfirm(true);
  };

  const handleDeleteAllConfirm = async () => {
    try {
      const result = await ApiService.deleteAllStudents();
      setSuccessMessage(`${result.count} students deleted successfully!`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      await fetchStudents(selectedYear);
    } catch (error) {
      setError(error.message);
    } finally {
      setShowDeleteAllConfirm(false);
    }
  };

  const resetForm = () => {
    setFormData({
      registration_date: '',
      full_name: '',
      sex: 'Male',
      date_of_birth: '',
      place_of_birth: '',
      father_name: '',
      mother_name: '',
      previous_class: '',
      next_class: '',
      previous_average: '',
      guardian_contact: '',
      student_picture: null,
      vocational_training: '',
      class_id: ''
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

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="userreg-dashboard-container">
        <button className="userreg-hamburger-menu" onClick={handleSidebarToggle}>
          <MdMenu />
        </button>
        {sidebarOpen && <div className="userreg-sidebar-overlay" onClick={handleSidebarClose}></div>}
        <div className={`userreg-sidebar${sidebarOpen ? ' open' : ''}`}>  
          <div className="userreg-logo-section">
            <img src={logo} alt="MPASAT Logo" className="userreg-logo" />
            <h1>MPASAT</h1>
            <button className="userreg-sidebar-close" onClick={handleSidebarClose}>
              <MdClose />
            </button>
          </div>
          <div className="userreg-nav-item" onClick={() => navigateWithLoader('/user-dashboard')}>
            <MdDashboard className="userreg-nav-icon" />
            <span>Dashboard</span>
          </div>
          <div className="userreg-nav-item active">
            <MdPeople className="userreg-nav-icon" />
            <span>Register</span>
          </div>
          <div className="userreg-nav-item" onClick={handleLogout}>
            <MdLogout className="userreg-nav-icon" />
            <span>Logout</span>
          </div>
        </div>
        <div className="userreg-main-content">
          <div className="userreg-loading-container">
            <div className="userreg-loading-spinner"></div>
            <p>Loading registration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="userreg-dashboard-container">
      {/* Hamburger menu for mobile */}
      <button className="userreg-hamburger-menu" onClick={handleSidebarToggle}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="userreg-sidebar-overlay" onClick={handleSidebarClose}></div>}
      {/* Sidebar */}
      <div className={`userreg-sidebar${sidebarOpen ? ' open' : ''}`}>  
        <div className="userreg-logo-section">
          <img src={logo} alt="MPASAT Logo" className="userreg-logo" />
          <h1>MPASAT</h1>
          <button className="userreg-sidebar-close" onClick={handleSidebarClose}>
            <MdClose />
          </button>
        </div>
        <div className="userreg-nav-item" onClick={() => navigateWithLoader('/user-dashboard')}>
          <MdDashboard className="userreg-nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="userreg-nav-item active">
          <MdPeople className="userreg-nav-icon" />
          <span>Register</span>
        </div>
        <div className="userreg-nav-item" onClick={handleLogout}>
          <MdLogout className="userreg-nav-icon" />
          <span>Logout</span>
        </div>
      </div>
      {/* Main Content */}
      <div className="userreg-main-content">
        <div className="userreg-header">
          <h1>
            {userRole === 'student' ? 'Student Registration' : 'Register Students'}
          </h1>
          {userRole === 'student' ? (
            <div className="userreg-student-info">
              {hasRegisteredStudent ? (
                <div className="userreg-already-registered">
                  <p>✅ You have already registered yourself as a student.</p>
                  <p>Students can only register once.</p>
                </div>
              ) : (
                <button className="userreg-add-btn" onClick={() => { 
                  if (userRole === 'student' && hasRegisteredStudent) {
                    setError('You have already registered yourself as a student. Students can only register once.');
                    return;
                  }
                  setEditingStudent(null); 
                  resetForm(); 
                  setShowModal(true); 
                }}>
                  Register Myself
                </button>
              )}
            </div>
          ) : (
            <div className="userreg-header-buttons">
              <button className="userreg-add-btn" onClick={() => { setEditingStudent(null); resetForm(); setShowModal(true); }}>
                Add Student
              </button>
              {userRole === 'admin' && students.length > 0 && (
                <button className="userreg-delete-all-btn" onClick={handleDeleteAllClick}>
                  Delete All Students
                </button>
              )}
            </div>
          )}
        </div>
        {error && <div className="userreg-error">{error}</div>}
        {userRole === 'student' && !hasRegisteredStudent && (
          <div className="userreg-info-box">
            <p>📝 <strong>Student Registration:</strong> You can only register yourself once. Make sure all information is correct before submitting.</p>
          </div>
        )}
        {userRole === 'parent' && (
          <div className="userreg-info-box">
            <p>👨‍👩‍👧‍👦 <strong>Parent Registration:</strong> You can register multiple students (your children). Each student will have their own record.</p>
          </div>
        )}
        <div className="userreg-table-wrapper">
          <table className="userreg-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Sex</th>
                <th>Date of Birth</th>
                <th>Place of Birth</th>
                <th>Father's Name</th>
                <th>Mother's Name</th>
                <th>Previous Class</th>
                <th>Next Class</th>
                <th>Previous Average</th>
                <th>Guardian Contact</th>
                <th>Vocational Training</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="userreg-student-row">
                  <td>{student.full_name}</td>
                  <td>{student.sex}</td>
                  <td>{formatDateDMmmYYYY(student.date_of_birth)}</td>
                  <td>{student.place_of_birth}</td>
                  <td>{student.father_name}</td>
                  <td>{student.mother_name}</td>
                  <td>{student.previous_class || '-'}</td>
                  <td>{student.next_class || '-'}</td>
                  <td>{student.previous_average || '-'}</td>
                  <td>{student.guardian_contact}</td>
                  <td>{student.vocational_training || '-'}</td>
                  <td className="userreg-actions">
                    <button className="userreg-action-icon edit" onClick={() => handleEdit(student)} title="Edit Student">
                      <MdEdit />
                    </button>
                    <button className="userreg-action-icon delete" onClick={() => handleDeleteClick(student)} title="Delete Student">
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && !loading && (
            <div className="userreg-empty-table">
              <h3>No Students Found</h3>
              {userRole === 'student' ? (
                <p>You haven't registered yourself as a student yet. Click "Register Myself" to get started.</p>
              ) : (
                <p>Start by adding your first student using the "Add Student" button above.</p>
              )}
            </div>
          )}
        </div>
        {/* Modal */}
        {showModal && (
          <div className="userreg-modal-overlay">
            <div className="userreg-modal">
              <div className="userreg-modal-header">
                <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
                <button className="userreg-close-btn" onClick={() => { 
                  setShowModal(false); 
                  setError(null); 
                }}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="student-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Class *</label>
                    <select
                      name="class_id"
                      value={formData.class_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a class</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Registration Date *</label>
                    <input
                      type="date"
                      name="registration_date"
                      value={formData.registration_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sex *</label>
                    <select
                      name="sex"
                      value={formData.sex}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Place of Birth *</label>
                    <input
                      type="text"
                      name="place_of_birth"
                      value={formData.place_of_birth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Father's Name *</label>
                    <input
                      type="text"
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mother's Name *</label>
                    <input
                      type="text"
                      name="mother_name"
                      value={formData.mother_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Previous Class</label>
                    <input
                      type="text"
                      name="previous_class"
                      value={formData.previous_class}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Next Class</label>
                    <select
                      name="next_class"
                      value={formData.next_class}
                      onChange={handleInputChange}
                    >
                      <option value="">Select a class</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.name}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Previous Average</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      name="previous_average"
                      value={formData.previous_average}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Guardian Contact *</label>
                    <input
                      type="tel"
                      name="guardian_contact"
                      value={formData.guardian_contact}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Student Picture</label>
                    <input
                      type="file"
                      name="student_picture"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setFormData(prev => ({
                          ...prev,
                          student_picture: file
                        }));
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Vocational Training</label>
                    <select
                      name="vocational_training"
                      value={formData.vocational_training}
                      onChange={handleInputChange}
                    >
                      <option value="">Select vocational training</option>
                      {vocationals.map((vocational) => (
                        <option key={vocational.id} value={vocational.title}>
                          {vocational.title}
                        </option>
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
                    {editingStudent ? 'Update' : 'Save'} Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Success Message */}
        {showSuccess && (
          <div className="userreg-success-message">
            <span>{successMessage}</span>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="userreg-modal-overlay">
            <div className="userreg-confirm-modal">
              <div className="userreg-confirm-header">
                <h3>Confirm Delete</h3>
              </div>
              <div className="userreg-confirm-body">
                <p>Are you sure you want to delete student <strong>"{studentToDelete?.full_name}"</strong>?</p>
                <p>This action cannot be undone.</p>
              </div>
              <div className="userreg-confirm-actions">
                <button 
                  className="userreg-cancel-btn"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setStudentToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="userreg-delete-confirm-btn"
                  onClick={handleDeleteConfirm}
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteAllConfirm && (
          <div className="userreg-modal-overlay">
            <div className="userreg-confirm-modal">
              <div className="userreg-confirm-header">
                <h3>Confirm Delete All</h3>
              </div>
              <div className="userreg-confirm-body">
                <p>Are you sure you want to delete <strong>ALL {students.length} students</strong>?</p>
                <p>This action cannot be undone and will permanently remove all student records.</p>
              </div>
              <div className="userreg-confirm-actions">
                <button 
                  className="userreg-cancel-btn"
                  onClick={() => setShowDeleteAllConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="userreg-delete-all-confirm-btn"
                  onClick={handleDeleteAllConfirm}
                >
                  Delete All Students
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateDMmmYYYY(dateStr) {
  if (!dateStr) return '';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default UserReg; 