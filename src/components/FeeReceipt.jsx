import React from 'react';
import './FeeReceipt.css';
import logo from '../assets/logo.png'; // Assuming you have a logo

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

  return (
    <div className="receipt-container" ref={ref}>
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
      {/* Status badge */}
      <div style={{margin:'10px 0 18px 0',textAlign:'center'}}>
        <span style={{
          display:'inline-block',
          padding:'6px 18px',
          borderRadius: '16px',
          background: status === 'Completed' ? '#2ecc71' : '#e53e3e',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: 1
        }}>
          Status: {status}
        </span>
      </div>
      <table className="receipt-table">
        <thead>
          <tr>
            <th>Fee Type</th>
            <th>Total Amount (XAF)</th>
            <th>Amount Paid (XAF)</th>
            <th>Balance Owed (XAF)</th>
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
});

export default FeeReceipt; 