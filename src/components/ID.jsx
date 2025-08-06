import React, { useRef, useState, useEffect } from 'react';
import './ID.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa';
import stamp from '../assets/stamp.png';
import api from '../services/api';
import config from '../config';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import SideTop from './SideTop';
import logo from '../assets/logo.png';

function ID() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

  // Test function to check picture endpoint
  const testPictureEndpoint = async (studentId) => {
    try {
      const baseApiUrl = config.API_URL && config.API_URL.replace('/api','');
      const testUrl = baseApiUrl + `/api/students/${studentId}/picture`;
      console.log('Testing picture endpoint:', testUrl);
      
      const response = await fetch(testUrl);
      console.log('Picture endpoint response status:', response.status);
      console.log('Picture endpoint response headers:', response.headers);
      
      if (response.ok) {
        console.log('Picture endpoint is working');
      } else {
        console.log('Picture endpoint failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error testing picture endpoint:', error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Config API_URL:', config.API_URL);
        console.log('Config FRONTEND_URL:', config.FRONTEND_URL);
        console.log('Config FTP_URL:', config.FTP_URL);
        
        const [studentsData, classesData] = await Promise.all([
          api.getStudents(),
          api.getClasses()
        ]);
        console.log('Fetched students data:', studentsData);
        console.log('Fetched classes data:', classesData);
        setStudents(studentsData);
        setClasses(classesData);
        
        // Test picture endpoint with first student if available
        if (studentsData.length > 0) {
          testPictureEndpoint(studentsData[0].id);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
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

  // Filter students by selected class
  const filteredStudents = selectedClass
    ? students.filter(s => {
        let className = s.class_name || s.class || '';
        if (!className && s.class_id && classes.length > 0) {
          const found = classes.find(c => c.id === s.class_id);
          if (found) className = found.name;
        }
        return className === selectedClass;
      })
    : students;

  // Helper for valid till: 30th September of the year after issued year
  function getValidTill(issued) {
    if (!issued) return '';
    const d = new Date(issued);
    const nextYear = d.getFullYear() + 1;
    return `30/09/${nextYear}`;
  }

  // Helper for photo
  function getPhotoUrl(student) {
    console.log('Getting photo URL for student:', student.id, student.full_name);
    
    // First check if student has a direct photo_url (from FTP or local storage)
    if (student.photo_url) {
      console.log('Using direct photo_url:', student.photo_url);
      return student.photo_url;
    }
    
    // Fallback to API endpoint
    const baseApiUrl = config.API_URL && config.API_URL.replace('/api','');
    if (student.id && baseApiUrl) {
      const apiUrl = baseApiUrl + `/api/students/${student.id}/picture`;
      console.log('Using API endpoint:', apiUrl);
      return apiUrl;
    }
    
    // Final fallback to generated avatar
    const avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.full_name || 'Student');
    console.log('Using generated avatar:', avatarUrl);
    return avatarUrl;
  }

  // Preload images function
  const preloadImages = async () => {
    const imagePromises = filteredStudents.map(student => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Don't fail if image fails to load
        img.src = getPhotoUrl(student);
      });
    });
    
    await Promise.all(imagePromises);
    console.log('All images preloaded');
  };

  // PDF download handler
  const downloadPDF = async () => {
    if (!printRef.current || filteredStudents.length === 0) {
      alert('Please select a class or ensure there are students to download.');
      return;
    }
    
    setIsGeneratingPDF(true);
    
    try {
      console.log('Generating PDF for', filteredStudents.length, 'students');
      
      // Preload all images first
      await preloadImages();
      
      // Wait longer for images to load properly
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force all images to load before capturing
      const images = printRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = resolve; // Don't fail if image fails to load
            // Force reload if needed
            if (img.src) {
              img.src = img.src + '?t=' + Date.now();
            }
          });
        })
      );
      
      // Wait a bit more after images are loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging to see what's happening
        width: printRef.current.scrollWidth,
        height: printRef.current.scrollHeight,
        imageTimeout: 15000, // Increase timeout for images
        onclone: (clonedDoc) => {
          // Ensure images in cloned document are visible
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach(img => {
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with class name and date
      const className = selectedClass || 'all_classes';
      const date = new Date().toISOString().split('T')[0];
      const fileName = `votech_id_cards_${className.replace(/\s+/g, '_')}_${date}.pdf`;
      
      pdf.save(fileName);
      console.log('PDF downloaded successfully:', fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
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
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          style={{ padding: '7px 16px', borderRadius: 6, border: '1.5px solid #1976d2', fontSize: 15, minWidth: 160 }}
        >
          <option value=''>Select Class to Download</option>
          {classes.map(c => (
            <option key={c.id} value={typeof c.name === 'string' ? c.name : ''}>{typeof c.name === 'string' ? c.name : 'Unknown Class'}</option>
          ))}
        </select>
        {filteredStudents.length > 0 && (
          <span style={{ color: '#1976d2', fontSize: '14px', fontWeight: '500' }}>
            {selectedClass ? `${filteredStudents.length} ID card${filteredStudents.length !== 1 ? 's' : ''} ready for download` : `${filteredStudents.length} total ID card${filteredStudents.length !== 1 ? 's' : ''} available`}
          </span>
        )}
      </div>
      <div ref={printRef} className="idcard-print-area">
        <div className="idcard-grid">
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
              <div className="idcard-template" key={student.id || idx}>
                {/* Watermark logo */}
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
                          console.log('Image failed to load for student:', student.id, student.full_name, 'URL:', e.target.src);
                          e.target.onerror = null; 
                          e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fullName || 'Student'); 
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully for student:', student.id, student.full_name);
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