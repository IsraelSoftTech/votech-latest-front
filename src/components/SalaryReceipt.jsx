import React from 'react';
import './SalaryReceipt.css';

const SalaryReceipt = React.forwardRef(({ receipt }, ref) => {
  if (!receipt) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount);
  };

  return (
    <div className="salary-receipt-container" ref={ref}>
      <div className="salary-receipt-header">
        <div className="salary-receipt-title-group">
          <h1 className="salary-receipt-company">VOTECH (S7)</h1>
          <h2 className="salary-receipt-type">SALARY PAYMENT RECEIPT</h2>
          <h3 className="salary-receipt-period">{receipt.periodValue}</h3>
        </div>
        <div className="salary-receipt-meta">
          <p className="salary-receipt-generated"><strong>Generated:</strong> {receipt.generatedAt}</p>
          <p className="salary-receipt-payment-date"><strong>Payment Date:</strong> {receipt.paymentDate}</p>
          <p className="salary-receipt-payment-time"><strong>Payment Time:</strong> {receipt.paymentTime}</p>
        </div>
      </div>

      <div className="salary-receipt-section">
        <h4 className="salary-receipt-section-title">EMPLOYEE INFORMATION</h4>
        <div className="salary-receipt-employee-info">
          <div className="salary-receipt-info-row">
            <span className="salary-receipt-info-label">Employee Name:</span>
            <span className="salary-receipt-info-value">{receipt.employeeName}</span>
          </div>
          <div className="salary-receipt-info-row">
            <span className="salary-receipt-info-label">Contact:</span>
            <span className="salary-receipt-info-value">{receipt.employeeContact}</span>
          </div>
          <div className="salary-receipt-info-row">
            <span className="salary-receipt-info-label">Payment Period:</span>
            <span className="salary-receipt-info-value">{receipt.monthName} {receipt.year}</span>
          </div>
        </div>
      </div>

      <div className="salary-receipt-section">
        <h4 className="salary-receipt-section-title">PAYMENT DETAILS</h4>
        <div className="salary-receipt-payment-details">
          <div className="salary-receipt-payment-row">
            <span className="salary-receipt-payment-label">Salary Amount:</span>
            <span className="salary-receipt-payment-amount">{formatCurrency(receipt.salaryAmount)}</span>
          </div>
          <div className="salary-receipt-payment-row">
            <span className="salary-receipt-payment-label">Currency:</span>
            <span className="salary-receipt-payment-value">XAF (Central African CFA Franc)</span>
          </div>
          <div className="salary-receipt-payment-row">
            <span className="salary-receipt-payment-label">Payment Status:</span>
            <span className="salary-receipt-payment-status">PAID</span>
          </div>
        </div>
      </div>

      <div className="salary-receipt-section">
        <h4 className="salary-receipt-section-title">SUMMARY</h4>
        <div className="salary-receipt-summary">
          <div className="salary-receipt-summary-row">
            <span className="salary-receipt-summary-label">Total Amount Paid:</span>
            <span className="salary-receipt-summary-amount">{formatCurrency(receipt.salaryAmount)}</span>
          </div>
        </div>
      </div>

      <div className="salary-receipt-footer">
        <div className="salary-receipt-signature-section">
          <div className="salary-receipt-signature-line"></div>
          <p className="salary-receipt-signature-label">Authorized Signature</p>
        </div>
        <div className="salary-receipt-stamp-section">
          <div className="salary-receipt-stamp">
            <span className="salary-receipt-stamp-text">PAID</span>
          </div>
        </div>
      </div>

      <div className="salary-receipt-notes">
        <p className="salary-receipt-note">
          <strong>Note:</strong> This receipt serves as proof of salary payment for {receipt.employeeName} 
          for the period of {receipt.monthName} {receipt.year}. Please keep this document for your records.
        </p>
        <p className="salary-receipt-note">
          <strong>VOTECH (S7)</strong> - Empowering Education Through Technology
        </p>
      </div>
    </div>
  );
});

export default SalaryReceipt; 