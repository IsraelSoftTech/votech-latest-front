import React from 'react';
import './SalaryReceiptReport.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SalaryReceiptReport = React.forwardRef(({ receipt }, ref) => {
  if (!receipt) return null;

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
      const fileName = `salary_receipt_${receipt.name}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="salary-receipt-report-container" ref={ref}>
      <div className="report-header">
        <div className="report-title-group">
          <h1>VOTECH (S7)</h1>
          <h2>SALARY RECEIPT</h2>
        </div>
        <div className="report-meta">
          <p><strong>Generated:</strong> {receipt.generatedAt}</p>
        </div>
      </div>
      <div className="report-section">
        <table className="report-table">
          <tbody>
            <tr><th>Name</th><td>{receipt.name}</td></tr>
            <tr><th>Role</th><td>{receipt.role}</td></tr>
            <tr><th>Salary Amount</th><td>{Number(receipt.amount).toLocaleString()} XAF</td></tr>
            <tr><th>Month</th><td>{receipt.month}</td></tr>
            <tr><th>Date Paid</th><td>{receipt.date}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="report-footer">
        <p>This receipt was generated automatically by the VOTECH Salary Management System.</p>
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

export default SalaryReceiptReport; 