import React from 'react';
import './FeeReceipt.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
      
      // Create a temporary container with two receipts for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.className = 'receipt-container temp-pdf-container';
      tempContainer.style.cssText = `
        background: white;
        width: 210mm;
        min-height: 280mm;
        margin: 0 auto;
        padding: 5mm;
        box-sizing: border-box;
        font-family: 'Times New Roman', serif;
        color: black;
        position: absolute;
        left: -9999px;
        top: -9999px;
        overflow: visible;
        display: flex;
        flex-direction: column;
        gap: 15mm;
      `;
      
      // Clone the receipt content twice
      const receiptContent = ref.current.querySelector('.receipt-template');
      if (receiptContent) {
        const firstReceipt = receiptContent.cloneNode(true);
        const secondReceipt = receiptContent.cloneNode(true);
        tempContainer.appendChild(firstReceipt);
        tempContainer.appendChild(secondReceipt);
      }
      
      // Add to DOM temporarily
      document.body.appendChild(tempContainer);
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Capture the temporary container
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: tempContainer.scrollWidth,
        windowHeight: tempContainer.scrollHeight,
        logging: false,
        removeContainer: false
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      // Restore the download button
      if (downloadBtn) {
        downloadBtn.style.display = originalDisplay;
      }
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with exact dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the image to PDF
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
    <div className="receipt-template">
      {/* Header Section */}
      <div className="receipt-header">
        <div className="school-name">VOTECH(S7) ACADEMY</div>
        <h1 className="receipt-title">Fee Receipt</h1>
        <div className="receipt-meta">
          <div className="meta-row">
            <span className="meta-label">Date:</span>
            <span className="meta-underline">{new Date().toLocaleDateString()}</span>
            <span className="meta-label">Receipt No:</span>
            <span className="meta-underline">{student.student_id}-{Date.now()}</span>
          </div>
        </div>
      </div>

      {/* Recipient and Amount Section */}
      <div className="receipt-main">
        <div className="main-row">
          <span className="main-label">Received From:</span>
          <span className="main-underline">{student.full_name}</span>
          <span className="main-label">the amount of XAF</span>
          <span className="main-underline">{paid.toLocaleString()}</span>
        </div>
        <div className="main-row">
          <span className="main-label">For Payment of</span>
          <span className="main-underline-long">School Fees - {student.class_name}</span>
        </div>
      </div>

      {/* Period Section */}
      <div className="receipt-period">
        <div className="period-row">
          <span className="period-label">From</span>
          <span className="period-underline">September 2025</span>
          <span className="period-label">to</span>
          <span className="period-underline">June 2026</span>
        </div>
      </div>

      {/* Fee Types Table */}
      <div className="fee-types-section">
        <h3 className="fee-types-title">Fee Breakdown</h3>
        <table className="fee-types-table">
          <thead>
            <tr>
              <th>Fee Type</th>
              <th>Expected (XAF)</th>
              <th>Paid (XAF)</th>
              <th>Balance (XAF)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {feeTypes.map(type => {
              const expectedFee = parseFloat(student[type.toLowerCase() + '_fee']) || 0;
              const balanceOwed = balance[type] || 0;
              const amountPaid = expectedFee - balanceOwed;
              
              // If expected fee is 0, show "-" for status
              let feeStatus = '-';
              if (expectedFee > 0) {
                feeStatus = balanceOwed === 0 && amountPaid > 0 ? 'Completed' : 
                           amountPaid > 0 ? 'Partial' : 'Pending';
              }
              
              return (
                <tr key={type}>
                  <td className="fee-type-name">{type}</td>
                  <td className="fee-expected">{expectedFee.toLocaleString()}</td>
                  <td className="fee-paid">{amountPaid.toLocaleString()}</td>
                  <td className="fee-balance">{balanceOwed.toLocaleString()}</td>
                  <td className={`fee-status ${expectedFee > 0 ? feeStatus.toLowerCase() : 'no-fee'}`}>
                    {feeStatus}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Amount Summary */}
      <div className="amount-summary-section">
        <table className="summary-table">
          <tbody>
            <tr>
              <td className="summary-label">Total Amount to be Received</td>
              <td className="summary-value">{total.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="summary-label">Amount Received</td>
              <td className="summary-value">{paid.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="summary-label">Balance Due</td>
              <td className="summary-value">{left.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="receipt-footer">
        {/* Footer content removed */}
      </div>
    </div>
  );

  return (
    <div className="receipt-container" ref={ref}>
      {/* Single Receipt - will be duplicated when printing/PDF */}
      <ReceiptContent />
      
      <button className="download-pdf-btn" onClick={downloadPDF}>
        <FaDownload /> Download PDF
      </button>
    </div>
  );
});

export default FeeReceipt; 