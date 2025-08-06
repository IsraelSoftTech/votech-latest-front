import React, { useState, useEffect } from 'react';
import { FaDownload, FaFileAlt, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import SideTop from './SideTop';
import api from '../services/api';
import ReportTemplate from './ReportTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './ReportCardGenerator.css';

const ReportCardGenerator = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reportData, setReportData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const terms = [
    { value: 'first', label: 'First Term' },
    { value: 'second', label: 'Second Term' },
    { value: 'third', label: 'Third Term' },
    { value: 'annual', label: 'Annual' }
  ];

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Failed to fetch classes');
    }
  };

  const generateReportCards = async () => {
    if (!selectedClass || !selectedTerm) {
      setError('Please select both class and term');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
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

      // Filter marks for the selected class and sequences 5 & 6
      const classMarks = uploadedMarks.filter(mark => 
        mark.class_id === parseInt(selectedClass) && 
        (mark.sequence_id === 5 || mark.sequence_id === 6)
      );

      if (classMarks.length === 0) {
        setError('No marks found for this class. Please ensure marks for Sequence 5 and 6 are uploaded.');
        return;
      }

      // Get class info
      const classInfo = classes.find(c => c.id === parseInt(selectedClass));
      
      // Process each student
      const processedStudents = await processStudentsData(
        students,
        classMarks,
        subjects,
        classifications[selectedClass] || {},
        coefficients[selectedClass] || {},
        classInfo
      );

      setReportData({
        students: processedStudents,
        classInfo,
        term: selectedTerm,
        generatedAt: new Date().toISOString()
      });

      setSuccess(`Successfully processed ${processedStudents.length} students`);
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

    for (const student of students) {
      try {
        // Get marks for this student from sequences 5 and 6
        const studentMarks = await getStudentMarks(student, classMarks);
        
        // Process subjects based on classifications
        const generalSubjects = [];
        const professionalSubjects = [];

        for (const subject of subjects) {
          const subjectMarks = studentMarks.find(m => m.subject_code === subject.code);
          const classification = classifications[subject.id] || 'general';
          const coefficient = coefficients[subject.id] || 1;

          const subjectData = {
            code: subject.code,
            name: subject.name,
            seq5: subjectMarks?.seq5 || 0,
            seq6: subjectMarks?.seq6 || 0,
            average: subjectMarks ? ((subjectMarks.seq5 + subjectMarks.seq6) / 2) : 0,
            coefficient: coefficient,
            total: subjectMarks ? ((subjectMarks.seq5 + subjectMarks.seq6) / 2) * coefficient : 0,
            teacher: subjectMarks?.teacher || 'N/A'
          };

          if (classification === 'general') {
            generalSubjects.push(subjectData);
          } else {
            professionalSubjects.push(subjectData);
          }
        }

        // Calculate totals
        const generalTotal = calculateSectionTotal(generalSubjects);
        const professionalTotal = calculateSectionTotal(professionalSubjects);
        const grandTotal = {
          marks: generalTotal.marks + professionalTotal.marks,
          coef: generalTotal.coef + professionalTotal.coef,
          total: generalTotal.total + professionalTotal.total,
          average: (generalTotal.total + professionalTotal.total) / (generalTotal.coef + professionalTotal.coef)
        };

        // Mock term averages (in real implementation, these would come from database)
        const termAverages = {
          first: grandTotal.average * 0.9 + Math.random() * 2,
          second: grandTotal.average * 0.95 + Math.random() * 2,
          annual: (grandTotal.average * 0.9 + grandTotal.average * 0.95) / 2
        };

        processedStudents.push({
          ...student,
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
        });

      } catch (error) {
        console.error(`Error processing student ${student.full_name}:`, error);
        // Continue with other students
      }
    }

    return processedStudents;
  };

  const getStudentMarks = async (student, classMarks) => {
    const studentMarks = [];

    for (const markRecord of classMarks) {
      try {
        const marksData = await api.getMarksByClassAndSequence(markRecord.class_id, markRecord.sequence_id);
        
        if (marksData.student_data) {
          const studentRow = marksData.student_data.find(row => 
            row[1]?.toLowerCase().includes(student.full_name?.toLowerCase()) ||
            student.full_name?.toLowerCase().includes(row[1]?.toLowerCase())
          );

          if (studentRow) {
            const existingMark = studentMarks.find(m => m.subject_code === 'GENERAL');
            if (existingMark) {
              if (markRecord.sequence_id === 5) {
                existingMark.seq5 = parseFloat(studentRow[2]) || 0;
              } else if (markRecord.sequence_id === 6) {
                existingMark.seq6 = parseFloat(studentRow[2]) || 0;
              }
            } else {
              studentMarks.push({
                subject_code: 'GENERAL',
                seq5: markRecord.sequence_id === 5 ? (parseFloat(studentRow[2]) || 0) : 0,
                seq6: markRecord.sequence_id === 6 ? (parseFloat(studentRow[2]) || 0) : 0,
                teacher: markRecord.uploaded_by_name || 'N/A'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching marks for sequence ${markRecord.sequence_id}:`, error);
      }
    }

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
      
      setSuccess('All report cards downloaded successfully!');
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

  return (
    <SideTop>
      <div className="report-generator-container">
        <div className="generator-header">
          <h1>Report Card Generator</h1>
          <p>Generate individual report cards for students in a class</p>
        </div>

        {error && (
          <div className="error-message">
            <FaTimes /> {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <FaCheck /> {success}
          </div>
        )}

        {!showPreview ? (
          <div className="generator-controls">
            <div className="control-group">
              <label>Select Class:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={generating}
              >
                <option value="">-- Choose a class --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Select Term:</label>
              <select 
                value={selectedTerm} 
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={generating}
              >
                <option value="">-- Choose a term --</option>
                {terms.map(term => (
                  <option key={term.value} value={term.value}>
                    {term.label}
                  </option>
                ))}
              </select>
            </div>

            <button 
              className="generate-btn"
              onClick={generateReportCards}
              disabled={!selectedClass || !selectedTerm || generating}
            >
              {generating ? (
                <>
                  <FaSpinner className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <FaFileAlt />
                  Generate Report Cards
                </>
              )}
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </SideTop>
  );
};

export default ReportCardGenerator; 