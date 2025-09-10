import React, { useState, useEffect, useRef } from 'react';
import './ID.css';
import { useNavigate, useLocation } from 'react-router-dom';
import stamp from '../assets/stamp.png';
import api from '../services/api';
import config from '../config';
import SideTop from './SideTop';
import logo from '../assets/logo.png';
import { FaPrint, FaTimes } from 'react-icons/fa';

function ID() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const printRef = useRef();

  // Admin3 guard
  if (authUser?.role !== 'Admin3') {
    return (
      <SideTop>
        <div style={{ padding: 24 }}>
          <h3 style={{ color: '#b91c1c' }}>Access Denied</h3>
          <p style={{ color: '#374151' }}>Only Admin3 can view the ID Cards module.</p>
        </div>
      </SideTop>
    );
  }

  // Test function to check picture endpoint
  const testPictureEndpoint = async (studentId) => {
    try {
      const baseApiUrl = config.API_URL && config.API_URL.replace('/api','');
      const testUrl = baseApiUrl + `/api/students/${studentId}/picture`;
      const response = await fetch(testUrl);
      if (!response.ok) {}
    } catch (error) {}
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsData, classesData] = await Promise.all([
          api.getStudents(),
          api.getClasses()
        ]);
        setStudents(studentsData);
        setClasses(classesData);
        if (studentsData.length > 0) {
          testPictureEndpoint(studentsData[0].id);
        }
      } catch (err) {
        setStudents([]);
        setClasses([]);
      }
    }
    fetchData();
  }, []);

  // Count logic
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalToday = students.filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr).length;
  const totalOverall = students.length;

  function getValidTill(issued) {
    if (!issued) return '';
    const d = new Date(issued);
    const nextYear = d.getFullYear() + 1;
    return `30/09/${nextYear}`;
  }

  function getPhotoUrl(student) {
    console.log('getPhotoUrl called for student:', student.full_name, 'ID:', student.id);
    
    if (student.photo_url) {
      console.log('Using existing photo_url:', student.photo_url);
      return student.photo_url;
    }
    
    // Try to construct URL from FTP storage
    if (student.id) {
      // Use the FTP URL from config
      const ftpUrl = config.FTP_URL;
      
      // Try a simple, direct approach first
      const ftpUrl1 = `${ftpUrl}/students/${student.id}.jpg`;
      console.log('Trying FTP URL:', ftpUrl1);
      return ftpUrl1;
    }
    
    // Fallback to a simple, reliable avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name || 'Student')}&background=1976d2&color=fff&size=200`;
    console.log('Using fallback avatar:', avatarUrl);
    return avatarUrl;
  }

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const handleClassSelect = (className) => {
    setSelectedClass(className);
    if (className === 'All Classes') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => {
        let studentClassName = student.class_name || student.class || '';
        if (!studentClassName && student.class_id && classes.length > 0) {
          const found = classes.find(c => c.id === student.class_id);
          if (found) studentClassName = found.name;
        }
        return studentClassName === className;
      });
      setFilteredStudents(filtered);
    }
  };

  const handlePrint = () => {
    if (filteredStudents.length === 0) {
      alert('No students found for the selected class.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Cards - ${selectedClass}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0.5cm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Arial, sans-serif;
              }
              .print-grid { 
                display: grid; 
                grid-template-columns: repeat(2, 85.6mm); 
                gap: 6mm; 
                justify-content: center; 
                align-items: start;
              }
              .idcard-template {
                width: 85.6mm;
                height: 53.98mm;
                background: linear-gradient(135deg, #6ec6ff 0%, #2196f3 100%);
                border: 2px solid #204080;
                border-radius: 18px;
                box-shadow: 0 4px 16px rgba(32,64,128,0.13);
                padding: 3mm;
                display: flex;
                flex-direction: column;
                font-family: 'Segoe UI', Arial, sans-serif;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
                page-break-inside: avoid;
                break-inside: avoid;
                margin: 0;
              }
              .idcard-watermark {
                position: absolute;
                left: 50%;
                top: 50%;
                width: 55mm;
                height: 55mm;
                opacity: 0.06;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 0;
              }
              .idcard-top-row {
                display: flex;
                align-items: center;
                gap: 7px;
                margin-bottom: 1px;
                z-index: 2;
              }
              .idcard-logo-small {
                width: 22px;
                height: 22px;
                object-fit: contain;
                margin-right: 4px;
                border-radius: 4px;
                background: #fff;
                box-shadow: 0 1px 4px rgba(32,64,128,0.08);
              }
              .idcard-header {
                font-size: 0.78rem;
                font-weight: bold;
                color: #fff;
                text-align: left;
                letter-spacing: 0.5px;
                z-index: 2;
                text-shadow: 0 1px 4px #20408033;
                margin-bottom: 0;
              }
              .idcard-motto {
                font-size: 0.93rem;
                color: #e3f2fd;
                text-align: left;
                margin-bottom: 4px;
                font-weight: 500;
                z-index: 2;
                text-shadow: 0 1px 4px #20408022;
              }
              .idcard-row-main {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 0;
                z-index: 2;
                height: 130px;
              }
              .idcard-photo-stamp-col {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100%;
                min-width: 100px;
                max-width: 100px;
                position: relative;
              }
              .idcard-photo {
                width: 90px;
                height: 90px;
                background: #fff;
                border-radius: 50%;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 4px solid #fff;
                box-shadow: 0 4px 16px #1976d244;
                position: relative;
                margin-bottom: 0;
              }
              .idcard-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
                background: #f7f8fa;
              }
              .idcard-stamp {
                position: absolute;
                right: -12px;
                bottom: -12px;
                width: 48px;
                height: 48px;
                object-fit: contain;
                opacity: 0.82;
                border-radius: 50%;
                border: 3px solid #fff;
                box-shadow: 0 2px 8px #1976d244;
                background: #fff;
                z-index: 4;
              }
              .idcard-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                font-size: 0.72rem;
                color: #222;
                justify-content: flex-start;
                z-index: 2;
                margin-left: 16px;
                min-width: 0;
              }
              .idcard-info-fields {
                padding: 4px 4px 4px 6px;
                min-width: 0;
                word-break: break-word;
                white-space: normal;
                overflow: visible;
                font-size: 0.72rem;
                color: #0d2547;
                background: rgba(255,255,255,0.85);
                border-radius: 6px;
                box-shadow: 0 1px 4px rgba(32,64,128,0.07);
                border: 1.2px solid #e3f2fd;
              }
              .idcard-info-fields > div {
                margin-bottom: 1.5px;
                line-height: 1.13;
                padding-right: 1px;
              }
              .idcard-info-fields b {
                color: #1976d2;
                font-weight: 600;
                font-size: 0.72rem;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for images to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
    
    setShowPrintModal(false);
  };

  return (
    <SideTop>
      <div className="dashboard-cards" style={{ marginTop: 80, marginBottom: 30 }}>
        <div className="card idcard-today">
          <div className="count">{totalToday}</div>
          <div className="desc">Total IDs generated today</div>
        </div>
        <div className="card idcard-total">
          <div className="count">{totalOverall}</div>
          <div className="desc">Overall total IDs</div>
          <button 
            onClick={handlePrintClick}
            style={{
              background: '#204080',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaPrint size={12} />
            Print ID Cards
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        {students.length > 0 && (
          <span style={{ color: '#1976d2', fontSize: '14px', fontWeight: '500' }}>
            {students.length} total ID card{students.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="idcard-print-area">
        <div className="idcard-grid">
          {students.map((student, idx) => {
            const fullName = student.full_name || '';
            const firstName = fullName.split(' ')[0] || '';
            const lastName = fullName.split(' ').slice(1).join(' ');
            let className = student.class_name || student.class || '';
            if (!className && student.class_id && classes.length > 0) {
              const found = classes.find(c => c.id === student.class_id);
              if (found) className = found.name;
            }
            return (
              <div className="idcard-template" key={student.id || idx}>
                <img src={logo} alt="watermark" className="idcard-watermark" />
                <div className="idcard-top-row">
                  <img src={logo} alt="logo" className="idcard-logo-small" />
                  <div className="idcard-header">VOTECH STUDENT ID CARD</div>
                </div>
                <div className="idcard-motto">Motto: Igniting "Preneurs"</div>
                <div className="idcard-row idcard-row-main">
                  <div className="idcard-photo-stamp-col">
                    <div className="idcard-photo">
                      <img 
                        src={getPhotoUrl(student)} 
                        alt="student" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%',
                          background: '#f7f8fa',
                          display: 'block',
                          visibility: 'visible',
                          opacity: '1'
                        }}
                        onError={e => { 
                          // Prevent infinite loop by checking if we're already using fallback
                          if (!e.target.src.includes('ui-avatars.com')) {
                            console.log('Image failed, using fallback for:', student.full_name);
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name || 'Student')}&background=1976d2&color=fff&size=200`;
                          }
                        }}
                      />
                    </div>
                    <div style={{ height: 16 }} />
                    <img src={stamp} alt="stamp" className="idcard-stamp" />
                  </div>
                  <div className="idcard-info">
                    <div className="idcard-info-fields">
                      <div><b>Full Name</b>: {firstName} {lastName}</div>
                      <div><b>Sex</b>: {student.sex || ''}</div>
                      <div><b>Date of Birth</b>: {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                      <div><b>Student ID</b>: {student.student_id || ''}</div>
                      <div><b>Class</b>: {className}</div>
                      <div><b>Specialty</b>: {student.specialty_name || ''}</div>
                      <div><b>Date Issued</b>: {student.created_at ? new Date(student.created_at).toLocaleDateString('en-GB') : ''}</div>
                      <div><b>Valid Till</b>: {getValidTill(student.created_at)}</div>
                      <div style={{ gridColumn: '1 / -1' }}><b>Contact</b>: {student.guardian_contact || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '300px',
            maxWidth: '500px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#204080' }}>Print ID Cards</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#666'
                }}
              >
                <FaTimes />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select Class to Print:
              </label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select a class...</option>
                <option value="All Classes">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedClass && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                <strong>Selected:</strong> {selectedClass}
                <br />
                <strong>Students to print:</strong> {filteredStudents.length}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPrintModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  background: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                disabled={!selectedClass || filteredStudents.length === 0}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: selectedClass && filteredStudents.length > 0 ? '#204080' : '#ccc',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: selectedClass && filteredStudents.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                <FaPrint style={{ marginRight: '6px' }} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="print-grid">
        {filteredStudents.map((student, idx) => {
          const fullName = student.full_name || '';
          const firstName = fullName.split(' ')[0] || '';
          const lastName = fullName.split(' ').slice(1).join(' ');
          let className = student.class_name || student.class || '';
          if (!className && student.class_id && classes.length > 0) {
            const found = classes.find(c => c.id === student.class_id);
            if (found) className = found.name;
          }
          
          return (
            <div key={student.id || idx}>
              <div className="idcard-template">
                <img src={logo} alt="watermark" className="idcard-watermark" />
                <div className="idcard-top-row">
                  <img src={logo} alt="logo" className="idcard-logo-small" />
                  <div className="idcard-header">VOTECH STUDENT ID CARD</div>
                </div>
                <div className="idcard-motto">Motto: Igniting "Preneurs"</div>
                <div className="idcard-row idcard-row-main">
                  <div className="idcard-photo-stamp-col">
                    <div className="idcard-photo">
                      <img 
                        src={getPhotoUrl(student)} 
                        alt="student" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%',
                          background: '#f7f8fa',
                          display: 'block',
                          visibility: 'visible',
                          opacity: '1'
                        }}
                      />
                    </div>
                    <div style={{ height: 16 }} />
                    <img src={stamp} alt="stamp" className="idcard-stamp" />
                  </div>
                  <div className="idcard-info">
                    <div className="idcard-info-fields">
                      <div><b>Full Name</b>: {firstName} {lastName}</div>
                      <div><b>Sex</b>: {student.sex || ''}</div>
                      <div><b>Date of Birth</b>: {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                      <div><b>Student ID</b>: {student.student_id || ''}</div>
                      <div><b>Class</b>: {className}</div>
                      <div><b>Specialty</b>: {student.specialty_name || ''}</div>
                      <div><b>Date Issued</b>: {student.created_at ? new Date(student.created_at).toLocaleDateString('en-GB') : ''}</div>
                      <div><b>Valid Till</b>: {getValidTill(student.created_at)}</div>
                      <div><b>Contact</b>: {student.guardian_contact || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </SideTop>
  );
}

export default ID; 