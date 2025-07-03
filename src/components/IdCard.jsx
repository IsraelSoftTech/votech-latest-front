import React, { useEffect, useState } from 'react';
import './IdCard.css';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import logo from '../assets/logo.png';
import { MdDashboard, MdLogout, MdPeople, MdSchool, MdWork, MdPerson, MdAttachMoney, MdCreditCard, MdPrint, MdMenu, MdClose } from 'react-icons/md';
import ApiService from '../services/api';

const generateMatricule = (fullName, guardianContact) => {
  const nameParts = (fullName || '').trim().split(' ');
  const lastName = nameParts[nameParts.length - 1] || '';
  const guardianParts = (guardianContact || '').trim().split(' ');
  const guardianName = guardianParts[0] || '';
  
  const lastTwoOfName = lastName.slice(-2).toUpperCase();
  const firstTwoOfGuardian = guardianName.slice(0, 2).toUpperCase();
  const lastTwoOfContact = (guardianContact || '').slice(-2);
  
  return `MPA${lastTwoOfName}${firstTwoOfGuardian}${lastTwoOfContact}`;
};

const IdCardTemplate = ({ student }) => {
  const serverBaseUrl = 'http://localhost:5000';
  const studentPictureUrl = student.student_picture 
    ? `${serverBaseUrl}${student.student_picture}` 
    : null;
    
  const matricule = generateMatricule(student.full_name, student.guardian_contact);

  return (
    <div className="id-card-wrapper">
      <div className="id-card">
        {/* Watermark */}
        <img src={logo} alt="Watermark" className="idcard-watermark" />
        <div className="id-card-header">
          <img src={logo} alt="School Logo" className="id-card-logo" />
          <div className="school-details">
            <h2>MBKAWA PHOSPHATE ACADEMY OF SCIENCE, ARTS AND TECHNOLOGY</h2>
            <h3>ST. LOUIS JUNIOR ACADEMY</h3>
          </div>
        </div>
        <div className="id-card-body">
          <div className="student-picture-container">
            {studentPictureUrl ? (
              <img src={studentPictureUrl} alt={`${student.full_name}`} className="student-picture" />
            ) : (
              <div className="no-picture">NO PICTURE</div>
            )}
          </div>
          <div className="student-info">
            <p className="student-name">{student.full_name}</p>
            <div className="info-grid">
              <p><strong>Sex:</strong> {student.sex}</p>
              <p><strong>Class:</strong> {student.next_class}</p>
              <p><strong>Matricule:</strong> {matricule}</p>
              <p><strong>Contact:</strong> {student.guardian_contact}</p>
              <p><strong>Father's Name:</strong> {student.father_name || 'N/A'}</p>
            </div>
          </div>
        </div>
        <div className="id-card-footer">
          <h4>2025/2026 ACADEMIC YEAR</h4>
        </div>
      </div>
    </div>
  );
};

function IdCard() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    ApiService.getStudents() // Using getStudents to fetch all students
      .then(setStudents)
      .catch(err => {
        console.error("Error fetching students:", err);
        setError('Failed to fetch students. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="idcard-page-wrapper">
      {/* Hamburger menu for mobile */}
      <button className="hamburger-menu" onClick={() => setSidebarOpen(true)}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
      <div className="idcard-container">
        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}> 
          <div className="logo-section" style={{position: 'relative'}}>
            <img src={logo} alt="MPASAT Logo" className="logo" />
            <h1>MPASAT</h1>
            {/* Close button for mobile */}
            {sidebarOpen && (
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)} style={{position: 'absolute', top: 8, right: 8}}>
                <MdClose />
              </button>
            )}
          </div>
          <div className="nav-item" onClick={() => navigateWithLoader('/dashboard')}><MdDashboard className="nav-icon" /><span>Dashboard</span></div>
          <div className="nav-item" onClick={() => navigateWithLoader('/students')}><MdPeople className="nav-icon" /><span>Students</span></div>
          <div className="nav-item" onClick={() => navigateWithLoader('/classes')}><MdSchool className="nav-icon" /><span>Classes</span></div>
          <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}><MdWork className="nav-icon" /><span>Vocational</span></div>
          <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}><MdPerson className="nav-icon" /><span>Teachers</span></div>
          <div className="nav-item" onClick={() => navigateWithLoader('/fees')}><MdAttachMoney className="nav-icon" /><span>Fees</span></div>
          <div className="nav-item active"><MdCreditCard className="nav-icon" /><span>ID Cards</span></div>
          <div className="nav-item" onClick={() => regularNavigate('/') }><MdLogout className="nav-icon" /><span>Logout</span></div>
        </div>
        
        {/* Main Content */}
        <div className="main-content">
          <header className="idcard-main-header">
            <h1>ID Card Generation</h1>
            <button className="idcard-print-btn" onClick={handlePrintAll} disabled={students.length === 0}>
              <MdPrint /> Print All Cards
            </button>
          </header>
          
          {loading && <div className="idcard-loading">Loading students...</div>}
          {error && <div className="idcard-error">{error}</div>}
          
          {!loading && students.length > 0 && (
            <div className="idcard-grid">
              {students.map(student => (
                <IdCardTemplate key={student.id} student={student} />
              ))}
            </div>
          )}
          
          {!loading && !error && students.length === 0 && (
            <div className="idcard-empty">No students found to generate ID cards.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IdCard; 