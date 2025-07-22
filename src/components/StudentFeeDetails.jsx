import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideTop from './SideTop';
import api from '../services/api';
import './Fee.css';
import './StudentFeeDetails.css';
import FeeReceipt from './FeeReceipt';

// Add these imports for PDF generation
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function getAcademicYear() {
  // Academic year starts 2025/2026, changes every 9 months
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

export default function StudentFeeDetails() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [studentFeeStats, setStudentFeeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [payType, setPayType] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const receiptRef = useRef();
  // Remove savingReceipt and auto-save logic
  const [showPrintArea, setShowPrintArea] = useState(false);

  // Only define these after data is loaded
  let s, balance, feeTypes, paid, total, left, status;
  if (studentFeeStats && studentFeeStats.student) {
    s = studentFeeStats.student;
    balance = studentFeeStats.balance;
    feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
    paid = feeTypes.reduce((sum, type) => sum + ((parseFloat(s[type.toLowerCase() + '_fee']) || 0) - (balance[type] || 0)), 0);
    total = feeTypes.reduce((sum, type) => sum + (parseFloat(s[type.toLowerCase() + '_fee']) || 0), 0);
    left = total - paid;
    status = left <= 0 ? 'Completed' : 'Uncompleted';
  }

  // When payType changes, set payAmount to the remaining balance for that type
  useEffect(() => {
    if (payType && balance && typeof balance[payType] !== 'undefined') {
      setPayAmount(balance[payType] || '');
    } else {
      setPayAmount('');
    }
  }, [payType, balance]);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError('');
      try {
        const stats = await api.getStudentFeeStats(studentId);
        setStudentFeeStats(stats);
      } catch (err) {
        setError('Failed to fetch student fee stats.');
      }
      setLoading(false);
    }
    fetchStats();
  }, [studentId]);

  // Automatically save receipt as PDF when generated
  useEffect(() => {
    // Remove savingReceipt and auto-save logic
  }, [receipt, receiptModalOpen]);

  if (loading) return <SideTop><div className="fee-main-content">Loading...</div></SideTop>;
  if (error) return <SideTop><div className="fee-main-content" style={{color:'#e53e3e'}}>{error}</div></SideTop>;
  if (!studentFeeStats || !studentFeeStats.student) return <SideTop><div className="fee-main-content">No data found.</div></SideTop>;

  // For receipt
  const paidMap = {};
  feeTypes.forEach(type => {
    paidMap[type] = (parseFloat(s[type.toLowerCase() + '_fee']) || 0) - (balance[type] || 0);
  });

  const handlePay = () => {
    setPayType('');
    setPayAmount('');
    setPayModalOpen(true);
  };
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payType || !payAmount) return;
    setPaying(true);
    try {
      await api.payStudentFee({
        student_id: studentId,
        class_id: s.class_id,
        fee_type: payType,
        amount: parseFloat(payAmount)
      });
      // Refresh stats
      const stats = await api.getStudentFeeStats(studentId);
      setStudentFeeStats(stats);
      setPayModalOpen(false);
      setReceipt({
        student: stats.student,
        balance: stats.balance,
        paidAmount: parseFloat(payAmount),
        paidType: payType,
      });
      setReceiptModalOpen(true);
    } catch (err) {
      alert('Payment failed.');
    }
    setPaying(false);
  };

  const handlePrint = () => {
    setShowPrintArea(true);
    setTimeout(() => {
      window.print();
      setShowPrintArea(false);
    }, 100);
  };

  return (
    <SideTop>
      <div className="fee-main-content">
        {/* Always render print-area, only visible during print */}
        <div className="print-area" ref={receiptRef}>
          {receipt && <FeeReceipt receipt={receipt} />}
        </div>
        <h2 style={{marginBottom:18}}>Student Fee Details</h2>
        <table className="fee-stats-table">
          <thead>
            <tr>
              <th>Name of Student</th>
              <th>Registration</th>
              <th>Bus</th>
              <th>Tuition</th>
              <th>Internship</th>
              <th>Remedial</th>
              <th>PTA</th>
              <th>Total Paid</th>
              <th>Total Left</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{s.full_name}</td>
              {feeTypes.map(type => (
                <td key={type}>{((parseFloat(s[type.toLowerCase() + '_fee']) || 0) - (balance[type] || 0)).toLocaleString()} XAF</td>
              ))}
              <td>{paid.toLocaleString()} XAF</td>
              <td>{left.toLocaleString()} XAF</td>
              <td className={status === 'Completed' ? 'status-completed' : 'status-uncompleted'}>{status}</td>
            </tr>
          </tbody>
        </table>
        <div className="fee-pay-btn-row" style={{display:'flex',gap:12,alignItems:'center'}}>
          {status === 'Completed' ? (
            <>
              <button className="text-button no-hover" onClick={() => {
                setReceipt({
                  student: s,
                  balance: balance
                });
                setReceiptModalOpen(true);
              }}>View/Print Receipt</button>
              <button className="text-button no-hover" onClick={() => navigate('/admin-fee')}>Back</button>
            </>
          ) : (
            <>
              <button className="text-button no-hover" onClick={handlePay}>Pay</button>
              <button className="text-button no-hover" onClick={() => navigate('/admin-fee')}>Back</button>
            </>
          )}
          {receipt && status !== 'Completed' && (
            <button className="text-button no-hover" onClick={() => setReceiptModalOpen(true)}>View Receipt</button>
          )}
        </div>
        {/* Pay Modal */}
        {payModalOpen && (
          <div className="student-fee-modal-overlay" onClick={e => e.stopPropagation()}>
            <div className="student-fee-modal-content" onClick={e => e.stopPropagation()}>
              <button className="text-button close-btn black-x always-visible" onClick={() => setPayModalOpen(false)} style={{position:'absolute',top:10,right:20,zIndex:10000, color:'#111', background:'none', border:'none'}} aria-label="Close">&#10005;</button>
              <h2>Pay Fee</h2>
              <form onSubmit={handlePaySubmit}>
                <label>Fee Type</label>
                <select value={payType} onChange={e => setPayType(e.target.value)} required className="text-select">
                  <option value="">Select</option>
                  {feeTypes.map(type => (
                    <option key={type} value={type} disabled={(balance[type] || 0) <= 0}>{type}</option>
                  ))}
                </select>
                <label>Amount</label>
                <input type="number" min="1" max={payType ? (balance[payType] || 0) : undefined} value={payAmount} onChange={e => setPayAmount(e.target.value)} className="text-input" required />
                <button type="submit" className="text-button no-hover" disabled={paying || !payType}>{paying ? 'Paying...' : 'Pay'}</button>
              </form>
            </div>
          </div>
        )}
        {/* Receipt Modal */}
        {receiptModalOpen && receipt && (
          <div className="student-fee-modal-overlay">
            <div className="student-fee-modal-content" style={{maxWidth: '900px', padding: '20px', position: 'relative'}} onClick={e => e.stopPropagation()}>
              {/* Black (x) close button, always visible, navigates to Fee.jsx */}
              <button className="text-button close-btn black-x always-visible" onClick={() => { setReceiptModalOpen(false); navigate('/admin-fee'); }} style={{position:'absolute',top:10,right:20,zIndex:10000, color:'#111', background:'none', border:'none'}} aria-label="Close">&#10005;</button>
              <div className="print-area" style={{display:'block'}}>
                <FeeReceipt receipt={receipt} />
              </div>
              {/* Download PDF and Close buttons below the receipt */}
              <div style={{textAlign:'center',marginTop:24,display:'flex',justifyContent:'center',alignItems:'center',gap:16}}>
                <button className="text-button download-btn" onClick={async () => {
                  const input = document.querySelector('.print-area');
                  // Temporarily increase font size for PDF
                  const originalFontSize = input.style.fontSize;
                  input.style.fontSize = '20px';
                  const canvas = await html2canvas(input, { scale: 2 });
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                  const pageWidth = pdf.internal.pageSize.getWidth();
                  const imgProps = pdf.getImageProperties(imgData);
                  const pdfWidth = pageWidth;
                  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                  const fileName = `Fee_Receipt_${receipt.student.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
                  pdf.save(fileName);
                  // Revert font size
                  input.style.fontSize = originalFontSize;
                }}>Download PDF</button>
                <button className="text-button close-btn black-x always-visible" onClick={() => { setReceiptModalOpen(false); navigate('/admin-fee'); }} style={{fontSize:'0.9rem',fontWeight:400,background:'none',border:'none',color:'#111',padding:'12px 18px',cursor:'pointer'}} aria-label="Close">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .text-button,
        .text-button:hover,
        .no-hover,
        .no-hover:hover {
          background: none !important;
          border: none;
          color: #204080;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          padding: 12px 32px;
          transition: none;
        }
        .close-btn.black-x {
          font-size: 1.7rem !important;
          font-weight: 400;
          line-height: 1;
          color: #111 !important;
          background: none !important;
          border: none !important;
          cursor: pointer;
          z-index: 10000 !important;
          display: block;
        }
        .close-btn.black-x:hover {
          color: #e53e3e !important;
        }
        .download-btn {
          margin: 20px auto 0 auto;
          display: inline-block;
        }
        .text-select, .text-input {
          background: none;
          border: 1.5px solid #204080;
          border-radius: 7px;
          font-size: 1.08rem;
          padding: 10px 12px;
          margin-bottom: 18px;
          width: 100%;
          color: #204080;
        }
        .text-select:focus, .text-input:focus {
          outline: none;
          border-color: #388e3c;
        }
        .student-fee-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(32,64,128,0.13);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .student-fee-modal-content {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(32,64,128,0.18);
          padding: 36px 28px 28px 28px;
          max-width: 420px;
          width: 98vw;
          min-width: 0;
          position: relative;
          text-align: center;
        }
      `}</style>
    </SideTop>
  );
} 