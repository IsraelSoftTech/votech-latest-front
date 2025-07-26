import React from 'react';
import './FeeReport.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const FeeReport = React.forwardRef(({ report }, ref) => {
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

      const fileName = `fee_report_${report.className}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="fee-report-container" ref={ref}>
      <div className="report-header">
        <div className="report-title-group">
          <h1>VOTECH (S7)</h1>
          <h2>FEE STATISTICS REPORT</h2>
          <h3>Class: {report.className}</h3>
        </div>
        <div className="report-meta">
          <p><strong>Generated:</strong> {report.generatedAt}</p>
          <p><strong>Class:</strong> {report.className}</p>
          <p><strong>Total Students:</strong> {report.totalStudents}</p>
        </div>
      </div>

      <div className="report-section">
        <h4>FEE SUMMARY</h4>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Fees Expected</span>
            <span className="stat-value">XAF {report.totalExpected.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Fees Paid</span>
            <span className="stat-value positive">XAF {report.totalPaid.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Fees Owed</span>
            <span className="stat-value negative">XAF {report.totalOwed.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Payment Rate</span>
            <span className="stat-value">{(report.paymentRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <h5>STUDENT FEE DETAILS</h5>
        <table className="report-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Expected Fees (XAF)</th>
              <th>Paid Fees (XAF)</th>
              <th>Owed Fees (XAF)</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map(student => (
              <tr key={student.id}>
                <td>{student.student_id}</td>
                <td>{student.full_name}</td>
                <td>{student.expectedFees.toLocaleString()}</td>
                <td>{student.paidFees.toLocaleString()}</td>
                <td>{student.owedFees.toLocaleString()}</td>
                <td>
                  <span className={`status-badge ${student.paymentStatus}`}>
                    {student.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="report-section">
        <h4>FEE BREAKDOWN BY TYPE</h4>
        <table className="report-table">
          <thead>
            <tr>
              <th>Fee Type</th>
              <th>Expected (XAF)</th>
              <th>Paid (XAF)</th>
              <th>Owed (XAF)</th>
              <th>Payment Rate</th>
            </tr>
          </thead>
          <tbody>
            {report.feeBreakdown.map(fee => (
              <tr key={fee.type}>
                <td>{fee.type}</td>
                <td>{fee.expected.toLocaleString()}</td>
                <td>{fee.paid.toLocaleString()}</td>
                <td>{fee.owed.toLocaleString()}</td>
                <td>{(fee.paymentRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="report-footer">
        <p>This report was generated automatically by the VOTECH Fee Management System.</p>
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

export default FeeReport; 