import React, { useState, useEffect } from 'react';
import './ID.css';
import { useNavigate, useLocation } from 'react-router-dom';
import stamp from '../assets/stamp.png';
import api from '../services/api';
import config from '../config';
import SideTop from './SideTop';
import logo from '../assets/logo.png';

function ID() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

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
                      <div><b>Contact</b>: {student.guardian_contact || ''}</div>
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