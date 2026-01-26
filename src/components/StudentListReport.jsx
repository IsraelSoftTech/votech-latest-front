import React from 'react';
import './StudentListReport.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StudentListReport = React.forwardRef(({ report }, ref) => {
  if (!report) return null;

  const downloadPDF = async () => {
    if (!ref.current) return;
    
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `student_list_${report.className}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="student-list-report-container" ref={ref}>
      <div className="report-header">
        <div className="report-title-group">
          <h1>VOTECH (S7)</h1>
          <h2>STUDENT CLASS LIST</h2>
          <h3>Class: {report.className}</h3>
        </div>
        <div className="report-meta">
          <p><strong>Generated:</strong> {report.generatedAt}</p>
          <p><strong>Class:</strong> {report.className}</p>
          <p><strong>Total Students:</strong> {report.totalStudents}</p>
          <p><strong>Academic Year:</strong> {report.academicYear}</p>
        </div>
      </div>

      <div className="report-section">
        <h4>STUDENT DETAILS</h4>
        <table className="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Sex</th>
              <th>Date of Birth</th>
              <th>Place of Birth</th>
              <th>Father's Name</th>
              <th>Mother's Name</th>
              <th>Department</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map((student, index) => (
              <tr key={student.id || index}>
                <td>{index + 1}</td>
                <td>{student.student_id}</td>
                <td>{student.full_name}</td>
                <td>{student.sex}</td>
                <td>{student.date_of_birth}</td>
                <td>{student.place_of_birth}</td>
                <td>{student.father_name}</td>
                <td>{student.mother_name}</td>
                <td>{student.specialty_name || student.dept || ''}</td>
                <td>{student.guardian_contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="report-footer">
        <p>This report was generated automatically by the VOTECH Student Management System.</p>
        <div className="signature-area">
          <div className="signature-line"></div>
          <p>Authorized Signature</p>
        </div>
      </div>

      <button className="download-pdf-btn" onClick={downloadPDF}>
        <FaDownload /> Download PDF
      </button>
    </div>
  );
});

export default StudentListReport; 