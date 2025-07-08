import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import { useYear } from '../context/YearContext';
import { MdPeople, MdAdd, MdEdit, MdDelete, MdLogout, MdDashboard, MdSchool, MdWork, MdPerson, MdMenu, MdClose, MdCheckCircle, MdUpload, MdPrint, MdAttachMoney, MdBadge } from 'react-icons/md';
import ApiService from '../services/api';
import logo from '../assets/logo.png';
import './Students.css';

function Students() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear } = useYear();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [vocationals, setVocationals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClassForPrint, setSelectedClassForPrint] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showApproveAllConfirm, setShowApproveAllConfirm] = useState(false);
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
    vocational_training: ''
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
        await Promise.all([
          fetchStudents(selectedYear),
          fetchClasses(selectedYear),
          fetchVocationals(selectedYear)
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
        regularNavigate('/');
      }
    };

    fetchUserAndData();
  }, [regularNavigate, selectedYear]);

  const fetchStudents = async (year) => {
    try {
      const data = await ApiService.getStudents(year);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
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
      console.error('Error fetching classes:', error);
    }
  };

  const fetchVocationals = async (year) => {
    try {
      const data = await ApiService.getVocational(year);
      setVocationals(data);
    } catch (error) {
      console.error('Error fetching vocationals:', error);
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
        if (key === 'student_picture' && formData[key]) {
          submitData.append(key, formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      if (editingStudent) {
        await ApiService.updateStudent(editingStudent.id, submitData);
      } else {
        await ApiService.createStudent(submitData);
      }
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      
      setShowModal(false);
      setEditingStudent(null);
      resetForm();
      await fetchStudents(selectedYear);
    } catch (error) {
      console.error('Error saving student:', error);
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
      vocational_training: student.vocational_training || ''
    });
    setShowModal(true);
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
      console.error('Error deleting student:', error);
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
      console.error('Error deleting all students:', error);
      setError(error.message);
    } finally {
      setShowDeleteAllConfirm(false);
    }
  };

  const handleApproveAllClick = () => {
    setShowApproveAllConfirm(true);
  };

  const handleApproveAllConfirm = async () => {
    try {
      const result = await ApiService.approveAllStudents();
      setSuccessMessage(result.message);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      await fetchStudents(selectedYear);
    } catch (error) {
      console.error('Error approving all students:', error);
      setError(error.message);
    } finally {
      setShowApproveAllConfirm(false);
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
      vocational_training: ''
    });
  };

  const openAddModal = () => {
    setEditingStudent(null);
    resetForm();
    setShowModal(true);
  };

  // Function to generate matricule
  const generateMatricule = (fullName, guardianContact) => {
    const nameParts = fullName.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1] || '';
    const guardianName = guardianContact.trim().split(' ')[0] || '';
    
    const lastTwoOfName = lastName.slice(-2).toUpperCase();
    const firstTwoOfGuardian = guardianName.slice(0, 2).toUpperCase();
    const lastTwoOfContact = guardianContact.slice(-2);
    
    return `MPA${lastTwoOfName}${firstTwoOfGuardian}${lastTwoOfContact}`;
  };

  // Function to handle Excel file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid Excel file (.xlsx)');
    }
  };

  // Function to process Excel file and upload students
  const handleUploadStudents = async () => {
    if (!selectedFile) {
      alert('Please select an Excel file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      await ApiService.uploadStudents(formData);
      
      setShowSuccess(true);
      setSuccessMessage('Students uploaded successfully!');
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      
      setShowUploadModal(false);
      setSelectedFile(null);
      await fetchStudents(selectedYear);
    } catch (error) {
      console.error('Error uploading students:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Helper to format date as d-MMM-yyyy
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

  // Function to print class list
  const handlePrintClassList = () => {
    if (!selectedClassForPrint) {
      alert('Please select a class first');
      return;
    }

    const studentsInClass = students
      .filter(student => student.next_class === selectedClassForPrint)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Class List - ${selectedClassForPrint}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .school-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .school-subtitle {
            font-size: 14px;
            margin-bottom: 20px;
          }
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 10px;
            display: block;
          }
          .class-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .matricule {
            font-weight: bold;
            color: #14296a;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logo}" alt="MPASAT Logo" class="logo">
          <div class="school-title">MBAKWA PHOSPHATE ACADEMY OF SCIENCE, ARTS AND TECHNOLOGY</div>
          <div class="school-subtitle">ST.LOUIS JUNIOR ACADEMY (MPASAT), MILE 3 NKWEN</div>
        </div>
        
        <div class="class-title">Class List for ${selectedClassForPrint}</div>
        
        <table>
          <thead>
            <tr>
              <th>SN</th>
              <th>MATRICULE</th>
              <th>FULL NAMES</th>
              <th>SEX</th>
              <th>DATE OF BIRTH</th>
              <th>GUARDIAN'S CONTACT</th>
            </tr>
          </thead>
          <tbody>
            ${studentsInClass.map((student, index) => {
              const matricule = generateMatricule(student.full_name, student.guardian_contact);
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td class="matricule">${matricule}</td>
                  <td>${student.full_name}</td>
                  <td>${student.sex}</td>
                  <td>${formatDateDMmmYYYY(student.date_of_birth)}</td>
                  <td>${student.guardian_contact}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px;">
          <p>Total Students: ${studentsInClass.length}</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #14296a; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Print Class List
        </button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Sidebar for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="students-container">
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
          <div className="nav-item active">
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
            <p>Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="students-container">
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
        <div className="nav-item active">
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
          <h1>Student Management</h1>
          <div className="header-buttons">
            <button className="add-button" onClick={openAddModal}>
              <MdAdd />
              Add Student
            </button>
            <button className="approve-all-button" onClick={handleApproveAllClick}>
              <MdCheckCircle />
              Approve All
            </button>
            <button className="delete-all-button" onClick={handleDeleteAllClick}>
              <MdDelete />
              Delete All
            </button>
            <button className="upload-button" onClick={() => setShowUploadModal(true)}>
              <MdUpload />
              Upload Students
            </button>
            <button className="print-button" onClick={() => setShowPrintModal(true)}>
              <MdPrint />
              Print
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="students-table-container">
          <table className="students-table">
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
                <tr key={student.id} className="student-row">
                  <td className="student-name">{student.full_name}</td>
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
                  <td className="actions">
                    <div className={`status-dot ${student.status || 'pending'}`}></div>
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(student)}
                      title="Edit Student"
                    >
                      <MdEdit />
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDeleteClick(student)}
                      title="Delete Student"
                    >
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {students.length === 0 && !loading && (
            <div className="empty-table">
              <MdPeople className="empty-icon" />
              <h3>No Students Found</h3>
              <p>Start by adding your first student using the "Add Student" button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="student-form">
              <div className="form-row">
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

      {/* Upload Students Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Upload Students from Excel</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="upload-instructions">
                <h3>Excel File Format:</h3>
                <p>Please ensure your Excel file has the following columns:</p>
                <ul>
                  <li><strong>Column A:</strong> Full Name</li>
                  <li><strong>Column B:</strong> Sex (Male/Female)</li>
                  <li><strong>Column C:</strong> Date of Birth (YYYY-MM-DD)</li>
                  <li><strong>Column D:</strong> Place of Birth</li>
                  <li><strong>Column E:</strong> Mother's Name</li>
                  <li><strong>Column F:</strong> Previous Class</li>
                  <li><strong>Column G:</strong> Next Class</li>
                  <li><strong>Column H:</strong> Previous Average</li>
                  <li><strong>Column I:</strong> Guardian's Contact</li>
                  <li><strong>Column J:</strong> Vocational Training</li>
                </ul>
                <p><strong>Note:</strong> The first row should contain headers. Student pictures are not included in bulk upload.</p>
              </div>
              
              <div className="file-upload-section">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                {selectedFile && (
                  <div className="selected-file">
                    <p>Selected file: {selectedFile.name}</p>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="save-btn"
                  onClick={handleUploadStudents}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Students'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Print Class List</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowPrintModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="print-instructions">
                <h3>Select Class to Print:</h3>
                <p>Choose a class to generate and print the class list with student details.</p>
              </div>
              
              <div className="class-selection">
                <label>Class:</label>
                <select
                  value={selectedClassForPrint}
                  onChange={(e) => setSelectedClassForPrint(e.target.value)}
                  className="class-select"
                >
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.name}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedClassForPrint && (
                <div className="class-info">
                  <p>Students in {selectedClassForPrint}: {
                    students.filter(student => student.next_class === selectedClassForPrint).length
                  }</p>
                </div>
              )}
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setShowPrintModal(false);
                    setSelectedClassForPrint('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="save-btn"
                  onClick={handlePrintClassList}
                  disabled={!selectedClassForPrint}
                >
                  Print Class List
                </button>
              </div>
            </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete student <strong>"{studentToDelete?.full_name}"</strong>?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStudentToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="delete-confirm-btn"
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
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header">
              <h3>Confirm Delete All</h3>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete <strong>ALL {students.length} students</strong>?</p>
              <p>This action cannot be undone and will permanently remove all student records.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowDeleteAllConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="delete-all-confirm-btn"
                onClick={handleDeleteAllConfirm}
              >
                Delete All Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve All Confirmation Modal */}
      {showApproveAllConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header">
              <h3>Confirm Approve All</h3>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to approve all pending students?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowApproveAllConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="approve-all-confirm-btn"
                onClick={handleApproveAllConfirm}
              >
                Approve All Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students; 