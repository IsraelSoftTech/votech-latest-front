import React, { useEffect, useRef, useState } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FaDownload, FaPrint, FaSearch } from 'react-icons/fa';
import './PaySlip.css';
import './Admin2PaySlip.css';
import PayslipTemplate from './PayslipTemplate';
import './PayslipTemplate.css';

export default function PaySlip() {
  const [loading, setLoading] = useState(true);
  const [paidSalaries, setPaidSalaries] = useState([]);
  const [salaryDescriptions, setSalaryDescriptions] = useState([]);
  const [payslipStructure, setPayslipStructure] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const payslipRef = useRef();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [myPaidRes, descriptions, settings] = await Promise.all([
          api.getMyPaidSalaries(),
          api.getSalaryDescriptions(),
          api.getPayslipSettings()
        ]);
        const paidArray = Array.isArray(myPaidRes?.data) ? myPaidRes.data : (Array.isArray(myPaidRes) ? myPaidRes : []);
        setPaidSalaries(paidArray);
        setSalaryDescriptions(Array.isArray(descriptions) ? descriptions : []);
        const structure = settings?.settings?.structure;
        setPayslipStructure(Array.isArray(structure) ? structure : []);
      } catch (error) {
        console.error('Failed to load payslips:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const calculateDeductions = (baseSalary) => {
    const deductions = salaryDescriptions.map(desc => ({
      description: desc.description,
      percentage: desc.percentage,
      amount: (baseSalary * desc.percentage) / 100
    }));
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netPay = baseSalary - totalDeductions;
    return { deductions, totalDeductions, netPay };
  };

  const handleViewPayslip = (salary) => {
    setSelectedPayslip(salary);
    setShowPayslipModal(true);
  };

  const closePayslipModal = () => {
    setShowPayslipModal(false);
    setSelectedPayslip(null);
  };

  const downloadPayslip = async () => {
    try {
      if (!payslipRef.current || !selectedPayslip) return;
      const canvas = await html2canvas(payslipRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
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

      const fileName = `payslip_${(selectedPayslip.user_name||selectedPayslip.applicant_name||'user').replace(/\s+/g, '_')}_${selectedPayslip.month}_${selectedPayslip.year}.pdf`;
      pdf.save(fileName);
      closePayslipModal();
    } catch (error) {
      console.error('Failed to download payslip:', error);
    }
  };

  const makeEmploymentNumber = (rec) => {
    const base = (rec?.applicant_name || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'STAFF';
    const id = Number(rec?.id || 0);
    const seed = `${rec?.month || ''}-${rec?.year || ''}-${id}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const num = (hash % 100000); // five digits
    return `${base}-${String(num).padStart(5, '0')}`;
  };

  const filtered = paidSalaries.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.applicant_name?.toLowerCase().includes(q) ||
      s.month?.toLowerCase().includes(q) ||
      String(s.year).includes(q)
    );
  });

  return (
    <SideTop>
      <div className="teacher-payslip-container">
        <div className="teacher-payslip-header">
          <div className="teacher-payslip-header-content">
            <div className="teacher-payslip-header-text">
              <h1 className="teacher-payslip-title">My Pay Slips</h1>
              <p className="teacher-payslip-subtitle">Access and download your processed salary pay slips</p>
            </div>
            <div className="teacher-payslip-search">
              <FaSearch className="teacher-payslip-search-icon" />
              <input
                type="text"
                className="teacher-payslip-search-input"
                placeholder="Search by month, year, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="teacher-payslip-table-container">
          {loading ? (
            <div className="teacher-payslip-loading">
              <div className="teacher-payslip-loading-spinner" />
              <p>Loading your payslips...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="teacher-payslip-empty">
              <p>No paid salaries found yet.</p>
            </div>
          ) : (
            <div className="teacher-payslip-table-responsive">
              <table className="teacher-payslip-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Paid on</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>{s.month} {s.year}</td>
                      <td className="teacher-payslip-amount">{formatCurrency(s.amount)}</td>
                      <td className="teacher-payslip-date">{formatDate(s.paid_at)}</td>
                      <td className="teacher-payslip-actions">
                        <button className="teacher-payslip-view-btn" onClick={() => handleViewPayslip(s)}>
                          <FaPrint /> View
                        </button>
                        <button className="teacher-payslip-download-btn" onClick={() => { setSelectedPayslip(s); setShowPayslipModal(true); setTimeout(downloadPayslip, 400); }}>
                          <FaDownload /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showPayslipModal && selectedPayslip && (
          <div className="admin2-payslip-modal-overlay">
            <div className="admin2-payslip-modal">
              <div className="admin2-payslip-modal-header">
                <h3 className="admin2-payslip-modal-title">
                  <FaPrint /> Pay Slip - {selectedPayslip.user_name || selectedPayslip.applicant_name}
                </h3>
                <button className="admin2-payslip-modal-close-btn" onClick={closePayslipModal}>×</button>
              </div>
              <div className="admin2-payslip-modal-body">
                <div ref={payslipRef}>
                  <PayslipTemplate
                    name={selectedPayslip.user_name || selectedPayslip.applicant_name}
                    employmentNumber={makeEmploymentNumber(selectedPayslip)}
                    month={selectedPayslip.month}
                    year={selectedPayslip.year}
                    grossAmount={selectedPayslip.amount}
                    structure={payslipStructure && payslipStructure.length ? payslipStructure : undefined}
                  />
                </div>
              </div>

              <div className="admin2-payslip-modal-footer">
                <button className="admin2-payslip-modal-close-btn-footer" onClick={closePayslipModal}>Close</button>
                <button className="admin2-payslip-modal-download-btn" onClick={downloadPayslip}>
                  <FaDownload /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 