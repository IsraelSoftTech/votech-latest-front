import React from 'react';
import './FeeReceipt.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logoImage from '../assets/logo.png';

const FeeReceipt = React.forwardRef(({ receipt, currentPayment = null }, ref) => {
  if (!receipt) return null;

  const { student, balance, transactions = [], discountApplied = false, discountRate = 0 } = receipt;
  const feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
  
  // Function to convert number to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    return 'Number too large';
  };
  
  const rate = discountApplied ? Math.max(0, Math.min(100, parseFloat(discountRate) || 0)) / 100 : 0;

  // Generate/resolve a unique receipt reference
  const generateRef = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
    const sid = (student?.student_id || 'STD').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
    return `VTA-${y}${m}${d}${hh}${mm}${ss}-${sid}-${rand}`;
  };

  const getOrCreateRefForPayment = (paymentId) => {
    try {
      const key = 'receiptRefByPaymentId';
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      if (map[paymentId]) return map[paymentId];
      const newRef = generateRef();
      map[paymentId] = newRef;
      localStorage.setItem(key, JSON.stringify(map));
      return newRef;
    } catch {
      return generateRef();
    }
  };

  const resolvedReceiptRef = React.useMemo(() => {
    if (currentPayment && currentPayment.id) {
      return getOrCreateRefForPayment(currentPayment.id);
    }
    return generateRef();
  }, [currentPayment]);

  // Calculate amounts (respect discount)
  let paid, total, left, status;
  
  if (currentPayment) {
    // Show only the current payment amount
    paid = currentPayment.amount || 0;
    const baseTotal = feeTypes.reduce((sum, type) => sum + (parseFloat(student[type.toLowerCase() + '_fee']) || 0), 0);
    total = Math.round(baseTotal * (1 - rate));
    const baseLeft = feeTypes.reduce((sum, type) => sum + (balance[type] || 0), 0);
    // If discount applies, recompute left as discounted total minus paid-to-date overall
    if (rate > 0) {
      const totalPaidToDate = feeTypes.reduce((sum, type) => sum + ((parseFloat(student[type.toLowerCase() + '_fee']) || 0) - (balance[type] || 0)), 0);
      left = Math.max(0, total - totalPaidToDate);
    } else {
      left = baseLeft;
    }
    status = 'Payment Received';
  } else {
    const basePaid = feeTypes.reduce((sum, type) => sum + ((parseFloat(student[type.toLowerCase() + '_fee']) || 0) - (balance[type] || 0)), 0);
    const baseTotal = feeTypes.reduce((sum, type) => sum + (parseFloat(student[type.toLowerCase() + '_fee']) || 0), 0);
    total = Math.round(baseTotal * (1 - rate));
    paid = basePaid;
    left = Math.max(0, total - paid);
    status = left <= 0 ? 'Completed' : 'Uncompleted';
  }

  // Get last payment for each fee type (excluding current payment)
  const getLastPaymentForType = (feeType) => {
    if (!transactions || transactions.length === 0) return 0;
    
    // Filter transactions for this fee type and exclude current payment
    const filteredTransactions = transactions.filter(t => {
      if (t.fee_type !== feeType) return false;
      if (currentPayment && t.id === currentPayment.id) return false;
      return true;
    });
    
    if (filteredTransactions.length === 0) return 0;
    
    // Sort by date and get the most recent
    const lastPayment = filteredTransactions
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))[0];
    
    return lastPayment ? parseFloat(lastPayment.amount) : 0;
  };

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
        height: 290mm;
        margin: 0 auto;
        padding: 3mm;
        box-sizing: border-box;
        font-family: 'Times New Roman', serif;
        color: black;
        position: absolute;
        left: -9999px;
        top: -9999px;
        overflow: visible;
        display: flex;
        flex-direction: column;
        gap: 4mm;
      `;
      
      // Clone the receipt content twice
      const receiptContent = ref.current.querySelector('.receipt-template');
      if (receiptContent) {
        const firstReceipt = receiptContent.cloneNode(true);
        const secondReceipt = receiptContent.cloneNode(true);
        
        // Set appropriate height for each receipt to fit two on one A4 page
        firstReceipt.style.cssText = `
          width: 100%;
          height: 140mm;
          min-height: 140mm;
          max-height: 140mm;
          padding: 3mm;
          border: 1px dotted #000;
          background: linear-gradient(to bottom, #fefefe, #f5f5f0);
          box-sizing: border-box;
          overflow: visible;
          page-break-inside: avoid;
          break-inside: avoid;
        `;
        
        secondReceipt.style.cssText = `
          width: 100%;
          height: 140mm;
          min-height: 140mm;
          max-height: 140mm;
          padding: 3mm;
          border: 1px dotted #000;
          background: linear-gradient(to bottom, #fefefe, #f5f5f0);
          box-sizing: border-box;
          overflow: visible;
          page-break-inside: avoid;
          break-inside: avoid;
        `;
        
        tempContainer.appendChild(firstReceipt);
        tempContainer.appendChild(secondReceipt);

        // Spacing is already set in the container CSS above

        // Inject optimized style overrides to ensure all content fits
        const style = document.createElement('style');
        style.textContent = `
          .fee-types-table th, .fee-types-table td { 
            padding: 0.8mm !important; 
            font-size: 8pt !important; 
            line-height: 1.1 !important;
          }
          .summary-table th, .summary-table td { 
            padding: 0.8mm !important; 
            font-size: 8pt !important; 
            line-height: 1.1 !important;
          }
          .receipt-header { margin-bottom: 2mm !important; }
          .student-info-section { margin-bottom: 1.5mm !important; }
          .payment-statement { margin-bottom: 1.5mm !important; }
          .fee-types-section { margin-bottom: 1.5mm !important; }
          .amount-summary-section { margin-bottom: 1.5mm !important; }
          .section-title, .fee-types-title, .summary-title { 
            font-size: 9pt !important; 
            margin-bottom: 1mm !important; 
          }
          .school-name { font-size: 11pt !important; }
          .receipt-title { font-size: 15pt !important; }
          .student-row { margin-bottom: 0.5mm !important; }
          .payment-statement p { margin-bottom: 0.5mm !important; font-size: 8pt !important; }
          .current-payment-details p { margin-bottom: 0.5mm !important; font-size: 8pt !important; }
          .statement-text { font-size: 9pt !important; }
          .amount-in-words, .amount-in-figures { font-size: 8pt !important; }
          .fee-type-paid, .payment-amount, .payment-date { font-size: 8pt !important; }
        `;
        tempContainer.appendChild(style);
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
        removeContainer: false,
        onclone: (clonedDoc) => {
          // Ensure proper spacing in cloned document
          const clonedContainer = clonedDoc.querySelector('.temp-pdf-container');
          if (clonedContainer) {
            clonedContainer.style.padding = '5mm';
            clonedContainer.style.gap = '6mm';
          }
        }
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
      
      // Scale the image to fit exactly on one A4 page with some margin
      const margin = 5; // 5mm margin on all sides
      const availableWidth = 210 - (2 * margin);
      const availableHeight = 297 - (2 * margin);
      
      const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
      // Center the image on the page with margin
      const x = margin + (availableWidth - scaledWidth) / 2;
      const y = margin + (availableHeight - scaledHeight) / 2;
      
      // Add the image to PDF - only one page, no second page
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

      const fileName = `fee_receipt_${student.student_id}_${resolvedReceiptRef}.pdf`;
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
        <div className="header-with-logo">
          <img src={logoImage} alt="School Logo" className="school-logo" />
          <div className="school-info">
            <div className="school-name">VOTECH(S7) ACADEMY</div>
          </div>
        </div>
        <div className="receipt-title-section">
          <h1 className="receipt-title">FEE PAYMENT</h1>
          <div style={{ fontSize: '10pt', color: '#333' }}>Receipt Ref: <strong>{resolvedReceiptRef}</strong></div>
        </div>
      </div>

      {/* Student Information */}
      <div className="student-info-section">
        <div className="student-details">
          <div className="student-row">
            <span className="label">Name:</span>
            <span className="value">{student.full_name || student.name}</span>
          </div>
          <div className="student-row">
            <span className="label">Student ID:</span>
            <span className="value">{student.student_id}</span>
          </div>
        </div>
      </div>

      {/* Payment Statement */}
      <div className="payment-statement">
        <p className="statement-text">
          Fee of <strong>{paid.toLocaleString()}</strong> paid on <strong>{new Date(currentPayment ? currentPayment.paid_at : new Date()).toLocaleDateString()}</strong>
        </p>
        {discountApplied && rate > 0 && (
          <p className="statement-text" style={{ color: '#204080' }}>
            Discount applied: <strong>{Math.round(rate * 100)}%</strong>
          </p>
        )}
        <p className="amount-in-words">
          <strong>Amount in words:</strong> {numberToWords(paid)} XAF
        </p>
        <p className="amount-in-figures">
          <strong>Amount in figures:</strong> {paid.toLocaleString()} XAF
        </p>
        {currentPayment && (
          <div className="current-payment-details">
            <p className="fee-type-paid">
              <strong>Fee Type:</strong> {currentPayment.fee_type}
            </p>
            <p className="payment-amount">
              <strong>Amount Paid:</strong> {currentPayment.amount.toLocaleString()} XAF
            </p>
            <p className="payment-date">
              <strong>Payment Date:</strong> {new Date(currentPayment.paid_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Fee Breakdown Table - Show all fee types for general receipt, specific fee type for transaction receipt */}
      {currentPayment ? (
        <div className="fee-types-section">
          <h3 className="fee-types-title">Payment Details</h3>
          <table className="fee-types-table">
            <thead>
              <tr>
                <th>Fee Type</th>
                <th>Amount Paid (XAF)</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fee-type-name">{currentPayment.fee_type}</td>
                <td className="fee-paid">{currentPayment.amount.toLocaleString()}</td>
                <td className="fee-date">{new Date(currentPayment.paid_at).toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fee-types-section">
          <h3 className="fee-types-title">Fee Breakdown</h3>
          <table className="fee-types-table">
            <thead>
              <tr>
                <th>Fee Type</th>
                <th>Expected (XAF)</th>
                <th>Paid (XAF)</th>
                <th>Balance (XAF)</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {feeTypes.map(type => {
                const expectedFee = parseFloat(student[type.toLowerCase() + '_fee']) || 0;
                const discountedExpected = Math.round(expectedFee * (1 - rate));
                const balanceOwed = balance[type] || 0;
                const amountPaid = expectedFee - balanceOwed;
                const discountedBalance = Math.max(0, discountedExpected - amountPaid);
                const pctBase = discountedExpected > 0 ? discountedExpected : expectedFee;
                const pctPaid = pctBase > 0 ? Math.round((amountPaid / pctBase) * 100) : 0;
                const percentage = pctBase > 0 ? `${pctPaid}%` : '-';
                
                return (
                  <tr key={type}>
                    <td className="fee-type-name">{type}</td>
                    <td className="fee-expected">{(discountApplied && rate > 0 ? discountedExpected : expectedFee).toLocaleString()}</td>
                    <td className="fee-paid">{amountPaid.toLocaleString()}</td>
                    <td className="fee-balance">{(discountApplied && rate > 0 ? discountedBalance : balanceOwed).toLocaleString()}</td>
                    <td className={`fee-percentage ${pctBase > 0 ? (amountPaid >= pctBase ? 'completed' : amountPaid > 0 ? 'partial' : 'pending') : 'no-fee'}`}>
                      {percentage}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Overall Summary */}
      <div className="amount-summary-section">
        <h3 className="summary-title">Overall Summary</h3>
        <table className="summary-table">
          <tbody>
            <tr>
              <td className="summary-label">Overall Expected</td>
              <td className="summary-value">{total.toLocaleString()} XAF</td>
            </tr>
            <tr>
              <td className="summary-label">Overall Paid</td>
              <td className="summary-value">{paid.toLocaleString()} XAF</td>
            </tr>
            <tr>
              <td className="summary-label">Overall Balance</td>
              <td className="summary-value">{left.toLocaleString()} XAF</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Last Transactions - Only show for general receipt, not for specific transaction receipt */}
      {!currentPayment && transactions && transactions.length > 0 && (
        <div className="fee-types-section">
          <h3 className="fee-types-title">Last Transactions</h3>
          <table className="fee-types-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fee Type</th>
                <th>Amount (XAF)</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
                .slice(0, 5)
                .map((transaction, index) => (
                <tr key={transaction.id || index}>
                  <td className="fee-date">{new Date(transaction.paid_at).toLocaleDateString()}</td>
                  <td className="fee-type-name">{transaction.fee_type}</td>
                  <td className="fee-paid">{parseFloat(transaction.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="receipt-footer">
        {/* Footer content removed */}
      </div>
    </div>
  );

  return (
    <div className="receipt-container" ref={ref}>
      {/* Single Receipt for display */}
      <ReceiptContent />
      
      <button className="download-pdf-btn" onClick={downloadPDF}>
        <FaDownload /> Download PDF
      </button>
    </div>
  );
});

export default FeeReceipt; 