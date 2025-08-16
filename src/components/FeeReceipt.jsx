import React from 'react';
import './FeeReceipt.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png';

function getAcademicYear() {
  const startYear = 2025;
  const now = new Date();
  const start = new Date('2025-09-01');
  let diff = (now.getFullYear() - startYear) * 12 + (now.getMonth() - 8);
  if (diff < 0) diff = 0;
  const period = Math.floor(diff / 9);
  const year1 = 2025 + period;
  const year2 = year1 + 1;
  return `${year1}/${year2}`;
}

const FeeReceipt = React.forwardRef(({ receipt }, ref) => {
  if (!receipt) return null;

  const { student, balance } = receipt;
  const feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
  
  const paid = feeTypes.reduce((sum, type) => sum + ((parseFloat(student[type.toLowerCase() + '_fee']) || 0) - (balance[type] || 0)), 0);
  const total = feeTypes.reduce((sum, type) => sum + (parseFloat(student[type.toLowerCase() + '_fee']) || 0), 0);
  const left = total - paid;
  const status = left <= 0 ? 'Completed' : 'Uncompleted';

  const downloadPDF = async () => {
    if (!ref.current) return;
    
    try {
      // Temporarily hide the download button
      const downloadBtn = document.querySelector('.download-pdf-btn');
      const originalDisplay = downloadBtn ? downloadBtn.style.display : '';
      if (downloadBtn) {
        downloadBtn.style.display = 'none';
      }
      
      // Wait for any animations or rendering to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the actual rendered content exactly as it appears
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: ref.current.offsetWidth,
        windowHeight: ref.current.offsetHeight
      });
      
      // Restore the download button
      if (downloadBtn) {
        downloadBtn.style.display = originalDisplay;
      }
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with exact dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const fileName = `fee_receipt_${student.student_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Restore the download button in case of error
      const downloadBtn = document.querySelector('.download-pdf-btn');
      if (downloadBtn) {
        downloadBtn.style.display = '';
      }
    }
  };

  const ReceiptContent = () => (
    <div className="receipt-content">
      <div className="receipt-header">
        <img src={logo} alt="VOTECH Logo" className="receipt-logo" />
        <div className="receipt-title-group">
          <h1>VOTECH (S7)</h1>
          <h2>FEE RECEIPT - {getAcademicYear()}</h2>
        </div>
      </div>
      
      <div className="receipt-student-info">
        <div><strong>Student Name:</strong> {student.full_name}</div>
        <div><strong>Student ID:</strong> {student.student_id}</div>
        <div><strong>Class:</strong> {student.class_name}</div>
        <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
      </div>
      
      <div className="status-badge">
        <span className={`status-${status.toLowerCase()}`}>
          Status: {status}
        </span>
      </div>
      
      <table className="receipt-table">
        <thead>
          <tr>
            <th>Fee Type</th>
            <th>Total (XAF)</th>
            <th>Paid (XAF)</th>
            <th>Balance (XAF)</th>
          </tr>
        </thead>
        <tbody>
          {feeTypes.map(type => {
            const totalFee = parseFloat(student[type.toLowerCase() + '_fee']) || 0;
            const balanceOwed = balance[type] || 0;
            const amountPaid = totalFee - balanceOwed;
            return (
              <tr key={type}>
                <td>{type}</td>
                <td>{totalFee.toLocaleString()}</td>
                <td>{amountPaid.toLocaleString()}</td>
                <td>{balanceOwed.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2"><strong>Total</strong></td>
            <td><strong>{paid.toLocaleString()}</strong></td>
            <td><strong>{left.toLocaleString()}</strong></td>
          </tr>
        </tfoot>
      </table>
      
      <div className="receipt-footer">
        <p>Thank you for your payment!</p>
        <div className="signature-area">
          <div className="signature-line"></div>
          <p>Cashier's Signature</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="receipt-container" ref={ref}>
      {/* First Receipt */}
      <ReceiptContent />
      
      {/* Second Receipt (Duplicate) */}
      <ReceiptContent />
      
      <button className="download-pdf-btn" onClick={downloadPDF}>
        <FaDownload /> Download PDF
      </button>
    </div>
  );
});

export default FeeReceipt; 