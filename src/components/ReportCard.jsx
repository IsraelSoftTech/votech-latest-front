import React, { useState, useEffect } from 'react';
import { FaGraduationCap, FaExclamationTriangle, FaChartBar, FaCalendarAlt, FaCog, FaTimes, FaSave, FaCheck, FaDownload, FaSpinner } from 'react-icons/fa';
import SideTop from './SideTop';
import api from '../services/api';
import ReportTemplate from './ReportTemplate';
import './ReportCard.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ReportCard = () => {
  // State for dropdowns
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [showTemplate, setShowTemplate] = useState(false);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMode, setSettingsMode] = useState(''); // 'classify' or 'coefficients'
  const [subjects, setSubjects] = useState([]);
  const [selectedClassForSettings, setSelectedClassForSettings] = useState('');
  const [subjectClassifications, setSubjectClassifications] = useState({});
  const [subjectCoefficients, setSubjectCoefficients] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Report Card Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  // Mock data for demonstration
  const generatedClasses = 12;
  const notGeneratedClasses = 3;
  const totalClasses = generatedClasses + notGeneratedClasses;
  const generationRate = Math.round((generatedClasses / totalClasses) * 100);

  // Dynamic academic year calculation
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // January is 0
    const currentDay = now.getDate();
    
    // If it's August 1st or later, use current year as start year
    // If it's before August 1st, use previous year as start year
    const startYear = (currentMonth > 8 || (currentMonth === 8 && currentDay >= 1)) ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    
    return `${startYear}/${endYear}`;
  };

  // Academic year options (only current year)
  const getAcademicYearOptions = () => {
    return [getCurrentAcademicYear()];
  };

  // Term options
  const termOptions = [
    { value: 'first', label: 'First Term' },
    { value: 'second', label: 'Second Term' },
    { value: 'third', label: 'Third Term' },
    { value: 'annual', label: 'Annual' }
  ];

  // Fetch classes from AdminClass
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await api.getClasses();
        setClasses(classesData);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      }
    };

    fetchClasses();
  }, []);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsData = await api.getSubjects();
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      }
    };

    fetchSubjects();
  }, []);

  // Set default academic year
  useEffect(() => {
    setSelectedSchoolYear(getCurrentAcademicYear());
  }, []);

  const handleDownload = async () => {
    const template = document.querySelector('.report-template-container');
    if (!template) return;
    const canvas = await html2canvas(template, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    const y = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;
    pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, pdfHeight);
    pdf.save('report-template.pdf');
  };

  // Report Card Generation Functions
  const generateReportCards = async () => {
    if (!selectedClass || !selectedTerm) {
      setError('Please select both class and term');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log('Starting report card generation for class:', selectedClass, 'term:', selectedTerm);
      
      // Fetch all necessary data
      const [
        students,
        uploadedMarks,
        subjects,
        classifications,
        coefficients
      ] = await Promise.all([
        api.getStudentsByClass(selectedClass),
        api.getUploadedMarks(),
        api.getSubjects(),
        api.getSubjectClassifications(),
        api.getSubjectCoefficients()
      ]);

      console.log('Fetched data:', {
        studentsCount: students.length,
        uploadedMarksCount: uploadedMarks.length,
        subjectsCount: subjects.length,
        classifications: classifications,
        coefficients: coefficients
      });

      // Test marks data structure
      if (uploadedMarks.length > 0) {
        console.log('Sample uploaded marks:', uploadedMarks[0]);
      }

      // Filter marks for the selected class and sequences 5 & 6
      const classMarks = uploadedMarks.filter(mark => 
        mark.class_id === parseInt(selectedClass) && 
        (mark.sequence_id === 5 || mark.sequence_id === 6)
      );

      console.log('Filtered class marks:', classMarks);

      if (classMarks.length === 0) {
        setError('No marks found for this class. Please ensure marks for Sequence 5 and 6 are uploaded.');
        return;
      }

      // Test the first marks record to see the data structure
      if (classMarks.length > 0) {
        try {
          const testMarksData = await api.getMarksByClassAndSequence(classMarks[0].class_id, classMarks[0].sequence_id);
          console.log('Test marks data structure:', testMarksData);
          console.log('Test marks data keys:', Object.keys(testMarksData));
          
          // Test if we can access the raw data
          if (testMarksData.student_data) {
            console.log('student_data field exists');
            const testStudentData = typeof testMarksData.student_data === 'string' 
              ? JSON.parse(testMarksData.student_data) 
              : testMarksData.student_data;
            console.log('Test student data (first 5 rows):', testStudentData.slice(0, 5));
            
            // Show the structure of each row
            testStudentData.slice(0, 3).forEach((row, index) => {
              console.log(`Row ${index + 1}:`, {
                'S/N (A)': row[0],
                'FULL NAMES (B)': row[1],
                'Marks/20 (C)': row[2]
              });
            });
          } else {
            console.log('NO STUDENT_DATA FOUND in test marks data');
            console.log('This means the Excel data was not properly stored in the database');
            console.log('Available fields:', Object.keys(testMarksData));
            
            // Try to access the raw data directly
            if (testMarksData.student_data === null) {
              console.log('student_data is null');
            } else if (testMarksData.student_data === undefined) {
              console.log('student_data is undefined');
            } else {
              console.log('student_data has unexpected value:', testMarksData.student_data);
            }
            
            // Try to test the marks data directly
            try {
              const testResult = await api.testMarksData(testMarksData.id);
              console.log('Direct test result:', testResult);
            } catch (error) {
              console.error('Error testing marks data directly:', error);
            }
          }
        } catch (error) {
          console.error('Error testing marks data:', error);
        }
      }

      // Get class info
      const classInfo = classes.find(c => c.id === parseInt(selectedClass));
      
      console.log('Processing students data...');
      
      // Process each student
      const processedStudents = await processStudentsData(
        students,
        classMarks,
        subjects,
        classifications[selectedClass] || {},
        coefficients[selectedClass] || {},
        classInfo
      );

      console.log('Processed students:', processedStudents.length);

      setReportData({
        students: processedStudents,
        classInfo,
        term: selectedTerm,
        generatedAt: new Date().toISOString()
      });

      setSuccessMessage(`Successfully processed ${processedStudents.length} students`);
      setShowPreview(true);
      setCurrentStudentIndex(0);

    } catch (error) {
      console.error('Error generating report cards:', error);
      setError('Failed to generate report cards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const processStudentsData = async (students, classMarks, subjects, classifications, coefficients, classInfo) => {
    const processedStudents = [];

    console.log('Processing students:', students.length);
    console.log('Sample student data:', students.slice(0, 2));

    for (const student of students) {
      try {
        console.log(`\n--- Processing student: ${student.full_name} (ID: ${student.id}) ---`);
        
        // Get marks for this student from sequences 5 and 6
        const studentMarks = await getStudentMarks(student, classMarks);
        
        console.log(`Student marks received:`, studentMarks);
        
        // Process subjects based on classifications
        const generalSubjects = [];
        const professionalSubjects = [];

        // For now, we only have GENERAL marks, so create a single subject entry
        const generalMark = studentMarks.find(m => m.subject_code === 'GENERAL');
        
        if (generalMark) {
          const subjectData = {
            code: 'GENERAL',
            name: 'General',
            seq5: generalMark.seq5 || 0,
            seq6: generalMark.seq6 || 0,
            average: generalMark.seq5 && generalMark.seq6 ? ((generalMark.seq5 + generalMark.seq6) / 2) : (generalMark.seq5 || generalMark.seq6 || 0),
            coefficient: 1, // Default coefficient
            total: generalMark.seq5 && generalMark.seq6 ? ((generalMark.seq5 + generalMark.seq6) / 2) : (generalMark.seq5 || generalMark.seq6 || 0),
            teacher: generalMark.teacher || 'N/A'
          };

          generalSubjects.push(subjectData);
        }

        // Calculate totals
        const generalTotal = calculateSectionTotal(generalSubjects);
        const professionalTotal = calculateSectionTotal(professionalSubjects);
        const grandTotal = {
          marks: generalTotal.marks + professionalTotal.marks,
          coef: generalTotal.coef + professionalTotal.coef,
          total: generalTotal.total + professionalTotal.total,
          average: (generalTotal.coef + professionalTotal.coef) > 0 ? (generalTotal.total + professionalTotal.total) / (generalTotal.coef + professionalTotal.coef) : 0
        };

        // Mock term averages (in real implementation, these would come from database)
        const termAverages = {
          first: grandTotal.average * 0.9 + Math.random() * 2,
          second: grandTotal.average * 0.95 + Math.random() * 2,
          annual: (grandTotal.average * 0.9 + grandTotal.average * 0.95) / 2
        };

        const processedStudent = {
          ...student,
          student_id: student.id, // Ensure student_id is available
          general_subjects: generalSubjects,
          professional_subjects: professionalSubjects,
          general_total: generalTotal,
          professional_total: professionalTotal,
          grand_total: grandTotal,
          term_averages: termAverages,
          class_average: grandTotal.average * 0.85 + Math.random() * 3, // Mock class average
          student_rank: Math.floor(Math.random() * students.length) + 1, // Mock rank
          total_students: students.length,
          grade: getGrade(grandTotal.average)
        };

        console.log(`Processed student ${student.full_name}:`, {
          student_id: processedStudent.student_id,
          general_subjects: generalSubjects.length,
          professional_subjects: professionalSubjects.length,
          grand_total: grandTotal,
          general_mark: generalMark
        });

        processedStudents.push(processedStudent);

      } catch (error) {
        console.error(`Error processing student ${student.full_name}:`, error);
        // Continue with other students
      }
    }

    return processedStudents;
  };

  const getStudentMarks = async (student, classMarks) => {
    const studentMarks = [];
    console.log(`Processing marks for student: ${student.full_name} (ID: ${student.id})`);

    for (const markRecord of classMarks) {
      try {
        console.log(`Fetching marks for sequence ${markRecord.sequence_id}`);
        
        // Get the marks data using class_id and sequence_id
        const marksData = await api.getMarksByClassAndSequence(markRecord.class_id, markRecord.sequence_id);
        
        console.log('Marks data received:', marksData);
        console.log('Marks data keys:', Object.keys(marksData));
        
        if (marksData.student_data) {
          // Parse the student_data JSON from the database
          const studentData = typeof marksData.student_data === 'string' 
            ? JSON.parse(marksData.student_data) 
            : marksData.student_data;

          console.log(`Student data for sequence ${markRecord.sequence_id}:`, studentData.length, 'rows');
          console.log('Sample student data (first 3 rows):', studentData.slice(0, 3));

          // Find the student row in the Excel data
          // Excel structure: row[0] = S/N, row[1] = FULL NAMES (Column B), row[2] = Marks/20 (Column C)
          const studentRow = studentData.find(row => {
            if (!row || !row[1]) return false;
            
            const excelName = row[1].toString().toLowerCase().trim();
            const studentName = student.full_name?.toLowerCase().trim();
            
            console.log(`Comparing: "${excelName}" with "${studentName}"`);
            
            // Try different matching strategies
            const exactMatch = excelName === studentName;
            const containsMatch = excelName.includes(studentName) || studentName.includes(excelName);
            
            // Split names and check for partial matches
            const excelWords = excelName.split(/\s+/).filter(word => word.length > 0);
            const studentWords = studentName.split(/\s+/).filter(word => word.length > 0);
            
            const wordMatch = excelWords.some(word => studentWords.includes(word)) ||
                             studentWords.some(word => excelWords.includes(word));
            
            // More flexible matching - check if any word from student name appears in excel name
            const flexibleMatch = studentWords.some(word => 
              excelWords.some(excelWord => 
                excelWord.includes(word) || word.includes(excelWord)
              )
            );
            
            const matches = exactMatch || containsMatch || wordMatch || flexibleMatch;
            
            if (matches) {
              console.log(`Found match for student: ${student.full_name}`);
              console.log('Matched row data:', row);
              console.log('Match type:', exactMatch ? 'exact' : containsMatch ? 'contains' : wordMatch ? 'word' : 'flexible');
            }
            
            return matches;
          });

          if (studentRow) {
            console.log('Found student row:', studentRow);
            console.log('Column B (Name):', studentRow[1]);
            console.log('Column C (Mark):', studentRow[2]);
            
            // Extract mark from Column C (index 2)
            const markValue = studentRow[2] !== undefined && studentRow[2] !== null && studentRow[2] !== '' 
              ? parseFloat(studentRow[2]) 
              : 0;
            
            console.log(`Mark value for ${student.full_name}: ${markValue} (raw: ${studentRow[2]})`);
            
            // Get teacher name from the uploaded marks record
            const teacherName = marksData.uploaded_by_name || 'N/A';
            
            // Create a subject mark entry for this student
            const existingMark = studentMarks.find(m => m.subject_code === 'GENERAL');
            if (existingMark) {
              if (markRecord.sequence_id === 5) {
                existingMark.seq5 = markValue;
              } else if (markRecord.sequence_id === 6) {
                existingMark.seq6 = markValue;
              }
              // Update teacher name if not already set
              if (existingMark.teacher === 'N/A') {
                existingMark.teacher = teacherName;
              }
            } else {
              studentMarks.push({
                subject_code: 'GENERAL',
                seq5: markRecord.sequence_id === 5 ? markValue : 0,
                seq6: markRecord.sequence_id === 6 ? markValue : 0,
                teacher: teacherName
              });
            }
          } else {
            console.log(`No mark found for student: ${student.full_name} in sequence ${markRecord.sequence_id}`);
            console.log('Available names in Excel:', studentData.map(row => row[1]).slice(0, 5));
            
            // Add a default mark entry for this student even if not found
            const existingMark = studentMarks.find(m => m.subject_code === 'GENERAL');
            if (!existingMark) {
              studentMarks.push({
                subject_code: 'GENERAL',
                seq5: markRecord.sequence_id === 5 ? 0 : 0,
                seq6: markRecord.sequence_id === 6 ? 0 : 0,
                teacher: 'N/A'
              });
            }
          }
        } else {
          console.log(`No student_data found for sequence ${markRecord.sequence_id}`);
          console.log('Full marks data:', marksData);
          
          // Add a default mark entry even if no data found
          const existingMark = studentMarks.find(m => m.subject_code === 'GENERAL');
          if (!existingMark) {
            studentMarks.push({
              subject_code: 'GENERAL',
              seq5: markRecord.sequence_id === 5 ? 0 : 0,
              seq6: markRecord.sequence_id === 6 ? 0 : 0,
              teacher: 'N/A'
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching marks for sequence ${markRecord.sequence_id}:`, error);
        
        // Add a default mark entry even if there's an error
        const existingMark = studentMarks.find(m => m.subject_code === 'GENERAL');
        if (!existingMark) {
          studentMarks.push({
            subject_code: 'GENERAL',
            seq5: markRecord.sequence_id === 5 ? 0 : 0,
            seq6: markRecord.sequence_id === 6 ? 0 : 0,
            teacher: 'N/A'
          });
        }
      }
    }

    console.log(`Final marks for ${student.full_name}:`, studentMarks);
    return studentMarks;
  };

  const calculateSectionTotal = (subjects) => {
    const total = subjects.reduce((acc, subject) => ({
      marks: acc.marks + 1,
      coef: acc.coef + subject.coefficient,
      total: acc.total + subject.total
    }), { marks: 0, coef: 0, total: 0 });

    return {
      ...total,
      average: total.coef > 0 ? total.total / total.coef : 0
    };
  };

  const getGrade = (average) => {
    if (average >= 18) return 'Excellent';
    if (average >= 14) return 'Very Good';
    if (average >= 12) return 'Good';
    if (average >= 10) return 'Fairly Good';
    if (average >= 8) return 'Average';
    if (average >= 6) return 'Weak';
    return 'Very Weak';
  };

  const downloadStudentReport = async (studentIndex) => {
    if (!reportData || !reportData.students[studentIndex]) return;

    const student = reportData.students[studentIndex];
    const template = document.querySelector('.report-template-container');
    
    if (!template) return;

    try {
      const canvas = await html2canvas(template, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const y = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;
      
      pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, pdfHeight);
      pdf.save(`${student.full_name}_ReportCard.pdf`);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report card');
    }
  };

  const downloadAllReports = async () => {
    if (!reportData) return;

    setLoading(true);
    setError('');

    try {
      for (let i = 0; i < reportData.students.length; i++) {
        setCurrentStudentIndex(i);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update
        
        const student = reportData.students[i];
        const template = document.querySelector('.report-template-container');
        
        if (template) {
          const canvas = await html2canvas(template, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pageWidth;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          const y = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;
          
          pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, pdfHeight);
          pdf.save(`${student.full_name}_ReportCard.pdf`);
        }
      }
      
      setSuccessMessage('All report cards downloaded successfully!');
    } catch (error) {
      console.error('Error downloading all reports:', error);
      setError('Failed to download some report cards');
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setReportData(null);
    setCurrentStudentIndex(0);
  };

  // Settings functions
  const openSettings = (mode) => {
    setSettingsMode(mode);
    setShowSettings(true);
    setSelectedClassForSettings('');
    setSubjectClassifications({});
    setSubjectCoefficients({});
    setSuccessMessage('');
  };

  const closeSettings = () => {
    setShowSettings(false);
    setSettingsMode('');
    setSelectedClassForSettings('');
    setSubjectClassifications({});
    setSubjectCoefficients({});
    setSuccessMessage('');
  };

  const handleClassChange = async (classId) => {
    setSelectedClassForSettings(classId);
    setLoading(true);
    setSuccessMessage('');

    try {
      if (settingsMode === 'classify') {
        const classifications = await api.getSubjectClassifications();
        const classClassifications = classifications[classId] || {};
        setSubjectClassifications(classClassifications);
      } else if (settingsMode === 'coefficients') {
        const coefficients = await api.getSubjectCoefficients();
        const classCoefficients = coefficients[classId] || {};
        setSubjectCoefficients(classCoefficients);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClassificationChange = (subjectId, type) => {
    setSubjectClassifications(prev => ({
      ...prev,
      [subjectId]: type
    }));
  };

  const handleCoefficientChange = (subjectId, coefficient) => {
    setSubjectCoefficients(prev => ({
      ...prev,
      [subjectId]: parseFloat(coefficient) || 0
    }));
  };

  const saveClassifications = async () => {
    if (!selectedClassForSettings) return;
    
    setLoading(true);
    try {
      await api.saveSubjectClassifications(selectedClassForSettings, subjectClassifications);
      setSuccessMessage('Subject classifications saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving classifications:', error);
      setSuccessMessage('Error saving classifications');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveCoefficients = async () => {
    if (!selectedClassForSettings) return;
    
    setLoading(true);
    try {
      await api.saveSubjectCoefficients(selectedClassForSettings, subjectCoefficients);
      setSuccessMessage('Subject coefficients saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving coefficients:', error);
      setSuccessMessage('Error saving coefficients');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideTop>
      <div className="report-container">
        {/* Header Section */}
        <div className="report-header">
          <div className="header-content">
            <h1 className="report-title">
              <FaChartBar className="title-icon" />
              Academic Reports
            </h1>
            <p className="report-subtitle">
              Comprehensive overview of class generation and academic planning
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn settings"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <FaCog />
            </button>
            {showTemplate && (
              <button 
                className="action-btn secondary" 
                style={{ marginLeft: 12 }}
                onClick={handleDownload}
              >
                Download
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <FaTimes /> {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <FaCheck /> {successMessage}
          </div>
        )}

        {showPreview ? (
          <div className="preview-section">
            <div className="preview-header">
              <h2>Report Card Preview</h2>
              <div className="preview-controls">
                <button 
                  className="download-all-btn"
                  onClick={downloadAllReports}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spinner" />
                      Downloading All...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Download All Reports
                    </>
                  )}
                </button>
                <button className="close-btn" onClick={closePreview}>
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="student-navigation">
              <button 
                onClick={() => setCurrentStudentIndex(Math.max(0, currentStudentIndex - 1))}
                disabled={currentStudentIndex === 0}
              >
                Previous
              </button>
              <span>
                Student {currentStudentIndex + 1} of {reportData.students.length}: {reportData.students[currentStudentIndex]?.full_name}
              </span>
              <button 
                onClick={() => setCurrentStudentIndex(Math.min(reportData.students.length - 1, currentStudentIndex + 1))}
                disabled={currentStudentIndex === reportData.students.length - 1}
              >
                Next
              </button>
              <button 
                className="download-current-btn"
                onClick={() => downloadStudentReport(currentStudentIndex)}
              >
                <FaDownload />
                Download This Report
              </button>
            </div>

            <div className="report-preview">
              <ReportTemplate 
                studentData={reportData.students[currentStudentIndex]}
                classData={reportData.classInfo}
                marksData={reportData.students[currentStudentIndex]}
                settings={{
                  class_master: 'CLASS MASTER',
                  principal_remark: 'PRINCIPAL\'S REMARK AND SIGNATURE',
                  disciplinary_record: {
                    absences: 0,
                    disciplinary_council: 'NO',
                    warned: 'NO',
                    suspended: 'NO',
                    might_be_expelled: 'NO'
                  },
                  class_council_decision: {
                    promoted: 'YES',
                    repeat: 'NO',
                    dismissed: 'NO',
                    next_year_start: 'September 2024'
                  }
                }}
              />
            </div>
          </div>
        ) : showTemplate ? (
          <ReportTemplate />
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card generated">
                <div className="card-header">
                  <div className="card-icon">
                    <FaGraduationCap />
                  </div>
                  <div className="card-info">
                    <h3 className="card-title">Classes Generated</h3>
                    <p className="card-subtitle">Successfully processed</p>
                  </div>
                </div>
                <div className="card-content">
                  <div className="stat-number">{generatedClasses}</div>
                  <div className="stat-percentage">
                    <span className="percentage">{generationRate}%</span>
                    <span className="label">of total classes</span>
                  </div>
                </div>
                <div className="card-footer">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${generationRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="stat-card pending">
                <div className="card-header">
                  <div className="card-icon warning">
                    <FaExclamationTriangle />
                  </div>
                  <div className="card-info">
                    <h3 className="card-title">Classes Not Generated</h3>
                    <p className="card-subtitle">Requires attention</p>
                  </div>
                </div>
                <div className="card-content">
                  <div className="stat-number">{notGeneratedClasses}</div>
                  <div className="stat-percentage">
                    <span className="percentage">{100 - generationRate}%</span>
                    <span className="label">of total classes</span>
                  </div>
                </div>
                <div className="card-footer">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill warning" 
                      style={{ width: `${100 - generationRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Section */}
            <div className="filter-section">
              <h2 className="filter-section-title">Generate Report Card</h2>
              <div className="filter-container">
                <div className="filter-box">
                  <h4 className="filter-title">School Year</h4>
                  <div className="filter-dropdown">
                    <select 
                      className="filter-select"
                      value={selectedSchoolYear}
                      onChange={(e) => setSelectedSchoolYear(e.target.value)}
                    >
                      <option value="">-- Select a school year --</option>
                      {getAcademicYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <div className="dropdown-arrow">▼</div>
                  </div>
                </div>

                <div className="filter-box">
                  <h4 className="filter-title">Class</h4>
                  <div className="filter-dropdown">
                    <select 
                      className="filter-select"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                      <option value="">-- Select a class --</option>
                      {classes.map(classItem => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name || 'Unknown Class'}
                        </option>
                      ))}
                    </select>
                    <div className="dropdown-arrow">▼</div>
                  </div>
                </div>

                <div className="filter-box">
                  <h4 className="filter-title">Term</h4>
                  <div className="filter-dropdown">
                    <select 
                      className="filter-select"
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                    >
                      <option value="">- select a term -</option>
                      {termOptions.map(term => (
                        <option key={term.value} value={term.value}>
                          {term.label}
                        </option>
                      ))}
                    </select>
                    <div className="dropdown-arrow">▼</div>
                  </div>
                </div>
              </div>

              {/* Generate Button - Only show when all selections are made */}
              {selectedSchoolYear && selectedClass && selectedTerm && (
                <div className="generate-section">
                  <button 
                    className="generate-btn"
                    onClick={generateReportCards}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <FaSpinner className="spinner" />
                        Generating Report Cards...
                      </>
                    ) : (
                      <>
                        <FaChartBar />
                        Generate Report Cards
                      </>
                    )}
                  </button>
                  <p className="generate-note">
                    This will generate report cards for all students in the selected class using uploaded marks from Sequence 5 and 6.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="settings-modal-overlay" onClick={closeSettings}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
              <div className="settings-header">
                <h2>Report Settings</h2>
                <button className="close-btn" onClick={closeSettings}>
                  <FaTimes />
                </button>
              </div>

              {!settingsMode ? (
                <div className="settings-options">
                  <div className="settings-option" onClick={() => openSettings('classify')}>
                    <div className="option-icon">
                      <FaGraduationCap />
                    </div>
                    <div className="option-content">
                      <h3>Classify Subjects</h3>
                      <p>Define which subjects are General or Professional for each class</p>
                    </div>
                    <div className="option-arrow">→</div>
                  </div>

                  <div className="settings-option" onClick={() => openSettings('coefficients')}>
                    <div className="option-icon">
                      <FaChartBar />
                    </div>
                    <div className="option-content">
                      <h3>Define Coefficients</h3>
                      <p>Set coefficient values for subjects in each class</p>
                    </div>
                    <div className="option-arrow">→</div>
                  </div>
                </div>
              ) : (
                <div className="settings-content">
                  <div className="settings-nav">
                    <button 
                      className="nav-btn"
                      onClick={() => setSettingsMode('')}
                    >
                      ← Back
                    </button>
                    <h3>{settingsMode === 'classify' ? 'Classify Subjects' : 'Define Coefficients'}</h3>
                  </div>

                  <div className="class-selector">
                    <label>Select Class:</label>
                    <select 
                      value={selectedClassForSettings}
                      onChange={(e) => handleClassChange(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">-- Choose a class --</option>
                      {classes.map(classItem => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name || 'Unknown Class'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClassForSettings && (
                    <div className="subjects-container">
                      {loading ? (
                        <div className="loading">Loading...</div>
                      ) : (
                        <>
                          <div className="subjects-header">
                            <h4>Subjects</h4>
                            {successMessage && (
                              <div className={`success-message ${successMessage.includes('Error') ? 'error' : ''}`}>
                                {successMessage}
                              </div>
                            )}
                          </div>
                          
                          <div className="subjects-list">
                            {subjects.map(subject => (
                              <div key={subject.id} className="subject-item">
                                <div className="subject-info">
                                  <span className="subject-name">{subject.name}</span>
                                  <span className="subject-code">({subject.code})</span>
                                </div>
                                
                                {settingsMode === 'classify' ? (
                                  <div className="subject-classification">
                                    <label className="radio-label">
                                      <input
                                        type="radio"
                                        name={`classification-${subject.id}`}
                                        value="general"
                                        checked={subjectClassifications[subject.id] === 'general'}
                                        onChange={() => handleSubjectClassificationChange(subject.id, 'general')}
                                      />
                                      <span>General</span>
                                    </label>
                                    <label className="radio-label">
                                      <input
                                        type="radio"
                                        name={`classification-${subject.id}`}
                                        value="professional"
                                        checked={subjectClassifications[subject.id] === 'professional'}
                                        onChange={() => handleSubjectClassificationChange(subject.id, 'professional')}
                                      />
                                      <span>Professional</span>
                                    </label>
                                  </div>
                                ) : (
                                  <div className="subject-coefficient">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={subjectCoefficients[subject.id] || ''}
                                      onChange={(e) => handleCoefficientChange(subject.id, e.target.value)}
                                      placeholder="Coefficient"
                                      className="coefficient-input"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="settings-actions">
                            <button 
                              className="save-btn"
                              onClick={settingsMode === 'classify' ? saveClassifications : saveCoefficients}
                              disabled={loading}
                            >
                              <FaSave />
                              Save {settingsMode === 'classify' ? 'Classifications' : 'Coefficients'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
};

export default ReportCard; 