import React, { useState, useEffect, useRef } from 'react';
import SideTop from './SideTop';
import { FaDownload, FaSort, FaFilter, FaCalendarAlt, FaUser, FaMoneyBillWave, FaSearch, FaPrint, FaCog, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../services/api';
import MessageBox from './MessageBox';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Admin2PaySlip.css';

export default function Admin2PaySlip({ authUser }) {
  const [paidSalaries, setPaidSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('paid_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const payslipRef = useRef();

  // Settings Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [salaryDescriptions, setSalaryDescriptions] = useState([]);
  const [newDescription, setNewDescription] = useState('');
  const [newPercentage, setNewPercentage] = useState('');

  // MessageBox States
  const [messageBox, setMessageBox] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false
  });

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    fetchPaidSalaries();
    fetchSalaryDescriptions();
  }, [authUser]);

  const showMessage = (title, message, type = 'info', onConfirm = null, confirmText = 'OK', cancelText = 'Cancel', showCancel = false) => {
    setMessageBox({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
      showCancel
    });
  };

  const closeMessage = () => {
    setMessageBox(prev => ({ ...prev, isOpen: false }));
  };

  const fetchPaidSalaries = async () => {
    try {
      setLoading(true);
      const response = await api.getPaidSalaries();
      setPaidSalaries(response);
    } catch (error) {
      console.error('Error fetching paid salaries:', error);
      if (error.message.includes('Session expired')) {
        showMessage('Session Expired', 'Your session has expired. Please login again.', 'error');
        setTimeout(() => {
          window.location.href = '/signin';
        }, 2000);
      } else {
        showMessage('Error', `Failed to fetch paid salaries: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryDescriptions = async () => {
    try {
      const response = await api.getSalaryDescriptions();
      setSalaryDescriptions(response);
    } catch (error) {
      console.error('Error fetching salary descriptions:', error);
      setSalaryDescriptions([]);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth >= 8) {
      return `${currentYear}/${currentYear + 1}`;
    } else {
      return `${currentYear - 1}/${currentYear}`;
    }
  };

  // Calculate deductions and net pay
  const calculateDeductions = (baseSalary) => {
    const deductions = salaryDescriptions.map(desc => ({
      description: desc.description,
      percentage: desc.percentage,
      amount: (baseSalary * desc.percentage) / 100
    }));
    
    const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
    const netPay = baseSalary - totalDeductions;
    
    return { deductions, totalDeductions, netPay };
  };

  // Filter and sort data
  const getFilteredAndSortedData = () => {
    let filtered = paidSalaries.filter(salary => {
      const matchesSearch = salary.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           salary.contact.includes(searchQuery);
      const matchesMonth = !filterMonth || salary.month === filterMonth;
      const matchesYear = !filterYear || salary.year.toString() === filterYear;
      
      return matchesSearch && matchesMonth && matchesYear;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'applicant_name':
          aValue = a.applicant_name.toLowerCase();
          bValue = b.applicant_name.toLowerCase();
          break;
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'month':
          aValue = new Date(`${a.year}-${getMonthNumber(a.month)}-01`);
          bValue = new Date(`${b.year}-${getMonthNumber(b.month)}-01`);
          break;
        case 'paid_at':
        default:
          aValue = new Date(a.paid_at);
          bValue = new Date(b.paid_at);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const getMonthNumber = (monthName) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(monthName) + 1;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewPayslip = (salary) => {
    setSelectedPayslip(salary);
    setShowPayslipModal(true);
  };

  const closePayslipModal = () => {
    setShowPayslipModal(false);
    setSelectedPayslip(null);
  };

  const downloadPayslip = async (salary) => {
    try {
      setSelectedPayslip(salary);
      setShowPayslipModal(true);
      
      // Wait for modal to render
      setTimeout(async () => {
        if (payslipRef.current) {
          const canvas = await html2canvas(payslipRef.current, {
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

          const fileName = `payslip_${salary.applicant_name.replace(/\s+/g, '_')}_${salary.month}_${salary.year}.pdf`;
          pdf.save(fileName);
          
          closePayslipModal();
        }
      }, 500);
    } catch (error) {
      console.error('Error generating payslip:', error);
      showMessage('Error', 'Failed to generate payslip PDF', 'error');
    }
  };

  const months = [
    { value: '', label: 'All Months' },
    { value: 'January', label: 'January' },
    { value: 'February', label: 'February' },
    { value: 'March', label: 'March' },
    { value: 'April', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'June' },
    { value: 'July', label: 'July' },
    { value: 'August', label: 'August' },
    { value: 'September', label: 'September' },
    { value: 'October', label: 'October' },
    { value: 'November', label: 'November' },
    { value: 'December', label: 'December' }
  ];

  // Generate academic years for the year selector
  const generateAcademicYears = () => {
    const currentAcademicYear = getCurrentAcademicYear();
    const [startYear] = currentAcademicYear.split('/');
    const startYearNum = parseInt(startYear);
    
    // Generate academic years from current to 2050/2051
    const years = [];
    years.push({ value: '', label: 'All Years' });
    
    for (let year = startYearNum; year <= 2050; year++) {
      const academicYear = `${year}/${year + 1}`;
      years.push({ value: year.toString(), label: academicYear });
    }
    
    return years;
  };

  const years = generateAcademicYears();
  const filteredData = getFilteredAndSortedData();

  return (
    <SideTop>
      <div className="admin2-payslip-container">
        {/* MessageBox */}
        <MessageBox {...messageBox} onClose={closeMessage} />

        {/* Header */}
        <div className="admin2-payslip-header">
          <div className="admin2-payslip-header-content">
            <div className="admin2-payslip-header-text">
              <h1 className="admin2-payslip-title">Pay Slip Management</h1>
              <p className="admin2-payslip-subtitle">
                View and download professional pay slips for all paid salaries
              </p>
            </div>
            <button 
              className="admin2-payslip-settings-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Pay Slip Settings"
            >
              <FaCog />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="admin2-payslip-controls">
          <div className="admin2-payslip-search-section">
            <div className="admin2-payslip-search-container">
              <FaSearch className="admin2-payslip-search-icon" />
              <input
                type="text"
                placeholder="Search by name or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin2-payslip-search-input"
              />
            </div>
          </div>

          <div className="admin2-payslip-filters">
            <div className="admin2-payslip-filter-group">
              <label className="admin2-payslip-filter-label">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="admin2-payslip-filter-select"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            <div className="admin2-payslip-filter-group">
              <label className="admin2-payslip-filter-label">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="admin2-payslip-filter-select"
              >
                {years.map(year => (
                  <option key={year.value} value={year.value}>{year.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="admin2-payslip-stats">
          <div className="admin2-payslip-stat-card">
            <FaMoneyBillWave className="admin2-payslip-stat-icon" />
            <div className="admin2-payslip-stat-content">
              <h3>Total Paid</h3>
              <p>{formatCurrency(filteredData.reduce((sum, salary) => sum + parseFloat(salary.amount), 0))}</p>
            </div>
          </div>
          <div className="admin2-payslip-stat-card">
            <FaUser className="admin2-payslip-stat-icon" />
            <div className="admin2-payslip-stat-content">
              <h3>Total Records</h3>
              <p>{filteredData.length}</p>
            </div>
          </div>
          <div className="admin2-payslip-stat-card">
            <FaCalendarAlt className="admin2-payslip-stat-icon" />
            <div className="admin2-payslip-stat-content">
              <h3>Current Period</h3>
              <p>{getCurrentAcademicYear()}</p>
            </div>
          </div>
        </div>

        {/* Pay Slips Table */}
        <div className="admin2-payslip-table-container">
          <div className="admin2-payslip-table-header">
            <h2 className="admin2-payslip-table-title">Paid Salary Records</h2>
            <button 
              className="admin2-payslip-refresh-btn"
              onClick={fetchPaidSalaries}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="admin2-payslip-loading">
              <div className="admin2-payslip-loading-spinner"></div>
              <p>Loading paid salary records...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="admin2-payslip-empty-state">
              <div className="admin2-payslip-empty-icon">📄</div>
              <h3>No Pay Slips Found</h3>
              <p>No paid salary records match your current filters. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="admin2-payslip-table-responsive">
              <table className="admin2-payslip-table">
                <thead className="admin2-payslip-table-head">
                  <tr className="admin2-payslip-table-row">
                    <th 
                      className="admin2-payslip-table-header-cell admin2-payslip-sortable"
                      onClick={() => handleSort('applicant_name')}
                    >
                      Employee Name
                      <FaSort className="admin2-payslip-sort-icon" />
                    </th>
                    <th className="admin2-payslip-table-header-cell">Contact</th>
                    <th className="admin2-payslip-table-header-cell">Classes</th>
                    <th className="admin2-payslip-table-header-cell">Subjects</th>
                    <th 
                      className="admin2-payslip-table-header-cell admin2-payslip-sortable"
                      onClick={() => handleSort('amount')}
                    >
                      Amount
                      <FaSort className="admin2-payslip-sort-icon" />
                    </th>
                    <th 
                      className="admin2-payslip-table-header-cell admin2-payslip-sortable"
                      onClick={() => handleSort('month')}
                    >
                      Period
                      <FaSort className="admin2-payslip-sort-icon" />
                    </th>
                    <th 
                      className="admin2-payslip-table-header-cell admin2-payslip-sortable"
                      onClick={() => handleSort('paid_at')}
                    >
                      Payment Date
                      <FaSort className="admin2-payslip-sort-icon" />
                    </th>
                    <th className="admin2-payslip-table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="admin2-payslip-table-body">
                  {filteredData.map((salary) => (
                    <tr key={salary.id} className="admin2-payslip-table-row">
                      <td className="admin2-payslip-table-cell admin2-payslip-name-cell">
                        <div className="admin2-payslip-employee-info">
                          <span className="admin2-payslip-employee-name">{salary.applicant_name}</span>
                        </div>
                      </td>
                      <td className="admin2-payslip-table-cell">{salary.contact}</td>
                      <td className="admin2-payslip-table-cell">{salary.classes}</td>
                      <td className="admin2-payslip-table-cell">{salary.subjects}</td>
                      <td className="admin2-payslip-table-cell admin2-payslip-amount-cell">
                        <span className="admin2-payslip-amount">{formatCurrency(salary.amount)}</span>
                      </td>
                      <td className="admin2-payslip-table-cell">
                        <span className="admin2-payslip-period">{salary.month} {salary.year}</span>
                      </td>
                      <td className="admin2-payslip-table-cell">
                        <span className="admin2-payslip-date">{formatDate(salary.paid_at)}</span>
                      </td>
                      <td className="admin2-payslip-table-cell admin2-payslip-actions-cell">
                        <div className="admin2-payslip-action-buttons">
                          <button
                            className="admin2-payslip-action-btn admin2-payslip-view-btn"
                            onClick={() => handleViewPayslip(salary)}
                            title="View Pay Slip"
                          >
                            <FaPrint />
                          </button>
                          <button
                            className="admin2-payslip-action-btn admin2-payslip-download-btn"
                            onClick={() => downloadPayslip(salary)}
                            title="Download PDF"
                          >
                            <FaDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="admin2-payslip-settings-modal-overlay">
            <div className="admin2-payslip-settings-modal">
              <div className="admin2-payslip-settings-modal-header">
                <h3 className="admin2-payslip-settings-modal-title">
                  <FaCog /> Pay Slip Settings
                </h3>
                <button 
                  className="admin2-payslip-settings-modal-close-btn"
                  onClick={() => setShowSettingsModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="admin2-payslip-settings-modal-body">
                <div className="admin2-payslip-settings-section">
                  <h4>Salary Descriptions & Deductions</h4>
                  <p className="admin2-payslip-settings-description">
                    Define salary descriptions and their percentages. These will be applied to all pay slips.
                  </p>
                  
                  <div className="admin2-payslip-settings-add-section">
                    <div className="admin2-payslip-settings-input-group">
                      <input
                        type="text"
                        placeholder="Description (e.g., Tax, Insurance, etc.)"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="admin2-payslip-settings-input"
                      />
                      <input
                        type="number"
                        placeholder="Percentage"
                        value={newPercentage}
                        onChange={(e) => setNewPercentage(e.target.value)}
                        className="admin2-payslip-settings-input"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <button
                        className="admin2-payslip-settings-add-btn"
                        onClick={() => {
                          if (!newDescription.trim() || !newPercentage.trim()) {
                            showMessage('Missing Information', 'Please enter both description and percentage', 'warning');
                            return;
                          }
                          const percentage = parseFloat(newPercentage);
                          if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                            showMessage('Invalid Percentage', 'Percentage must be a number between 0 and 100', 'warning');
                            return;
                          }
                          setSalaryDescriptions(prev => [...prev, {
                            id: Date.now(),
                            description: newDescription.trim(),
                            percentage: percentage
                          }]);
                          setNewDescription('');
                          setNewPercentage('');
                        }}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>

                  <div className="admin2-payslip-settings-list">
                    {salaryDescriptions.length === 0 ? (
                      <div className="admin2-payslip-settings-empty">
                        <p>No descriptions added yet. Add descriptions to customize pay slips.</p>
                      </div>
                    ) : (
                      <div className="admin2-payslip-settings-items">
                        {salaryDescriptions.map((desc) => (
                          <div key={desc.id} className="admin2-payslip-settings-item">
                            <div className="admin2-payslip-settings-item-info">
                              <span className="admin2-payslip-settings-item-description">{desc.description}</span>
                              <span className="admin2-payslip-settings-item-percentage">{desc.percentage}%</span>
                            </div>
                            <button
                              className="admin2-payslip-settings-remove-btn"
                              onClick={() => setSalaryDescriptions(prev => prev.filter(d => d.id !== desc.id))}
                              title="Remove"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {salaryDescriptions.length > 0 && (
                    <div className="admin2-payslip-settings-total">
                      <span>Total Percentage: {salaryDescriptions.reduce((sum, desc) => sum + desc.percentage, 0)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin2-payslip-settings-modal-footer">
                <button 
                  className="admin2-payslip-settings-modal-cancel-btn"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="admin2-payslip-settings-modal-save-btn"
                  onClick={async () => {
                    try {
                      await api.saveSalaryDescriptions(salaryDescriptions);
                      showMessage('Success', 'Salary descriptions saved successfully!', 'success');
                      setShowSettingsModal(false);
                    } catch (error) {
                      console.error('Error saving salary descriptions:', error);
                      showMessage('Error', `Failed to save salary descriptions: ${error.message}`, 'error');
                    }
                  }}
                  disabled={salaryDescriptions.length === 0}
                >
                  <FaSave /> Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pay Slip Modal */}
        {showPayslipModal && selectedPayslip && (
          <div className="admin2-payslip-modal-overlay">
            <div className="admin2-payslip-modal">
              <div className="admin2-payslip-modal-header">
                <h3 className="admin2-payslip-modal-title">
                  <FaPrint /> Pay Slip - {selectedPayslip.applicant_name}
                </h3>
                <button 
                  className="admin2-payslip-modal-close-btn"
                  onClick={closePayslipModal}
                >
                  ×
                </button>
              </div>
              
              <div className="admin2-payslip-modal-body">
                <div className="admin2-payslip-content" ref={payslipRef}>
                  <div className="admin2-payslip-header-section">
                    <div className="admin2-payslip-company-info">
                      <h1 className="admin2-payslip-company-name">VOTECH (S7) ACADEMY</h1>
                      <div className="admin2-payslip-logo">
                        <img src="/assets/logo.png" alt="VOTECH Logo" className="admin2-payslip-logo-img" />
                      </div>
                    </div>
                    <div className="admin2-payslip-document-info">
                      <h2 className="admin2-payslip-document-title">PAYSLIP</h2>
                      <p className="admin2-payslip-period">Period: {selectedPayslip.month} {selectedPayslip.year}</p>
                      <p className="admin2-payslip-date">Date: {formatDate(selectedPayslip.paid_at)}</p>
                    </div>
                  </div>

                  <div className="admin2-payslip-employee-section">
                    <div className="admin2-payslip-employee-details">
                      <h3>Employee Information</h3>
                      <div className="admin2-payslip-employee-grid">
                        <div className="admin2-payslip-employee-field">
                          <label>Name:</label>
                          <span>{selectedPayslip.applicant_name}</span>
                        </div>
                        <div className="admin2-payslip-employee-field">
                          <label>Contact:</label>
                          <span>{selectedPayslip.contact}</span>
                        </div>
                        <div className="admin2-payslip-employee-field">
                          <label>Classes:</label>
                          <span>{selectedPayslip.classes}</span>
                        </div>
                        <div className="admin2-payslip-employee-field">
                          <label>Subjects:</label>
                          <span>{selectedPayslip.subjects}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin2-payslip-salary-section">
                    <h3>Salary Details</h3>
                    <div className="admin2-payslip-salary-table">
                      <table className="admin2-payslip-salary-details">
                        <tbody>
                          <tr>
                            <td className="admin2-payslip-salary-label">Basic Salary:</td>
                            <td className="admin2-payslip-salary-amount">{formatCurrency(selectedPayslip.amount)}</td>
                          </tr>
                          {salaryDescriptions.length > 0 && (
                            <>
                              {calculateDeductions(selectedPayslip.amount).deductions.map((deduction, index) => (
                                <tr key={index}>
                                  <td className="admin2-payslip-salary-label">{deduction.description}:</td>
                                  <td className="admin2-payslip-salary-amount admin2-payslip-deduction-amount">-{formatCurrency(deduction.amount)}</td>
                                </tr>
                              ))}
                              <tr className="admin2-payslip-salary-total-deductions">
                                <td className="admin2-payslip-salary-label">Total Deductions:</td>
                                <td className="admin2-payslip-salary-amount admin2-payslip-total-deductions">-{formatCurrency(calculateDeductions(selectedPayslip.amount).totalDeductions)}</td>
                              </tr>
                            </>
                          )}
                          <tr className="admin2-payslip-salary-total">
                            <td className="admin2-payslip-salary-label">Net Pay:</td>
                            <td className="admin2-payslip-salary-amount">{formatCurrency(calculateDeductions(selectedPayslip.amount).netPay)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="admin2-payslip-footer">
                    <div className="admin2-payslip-signature-section">
                      <div className="admin2-payslip-signature-box">
                        <p>Employee Signature</p>
                        <div className="admin2-payslip-signature-line"></div>
                      </div>
                      <div className="admin2-payslip-signature-box">
                        <p>Authorized Signature</p>
                        <div className="admin2-payslip-signature-line"></div>
                      </div>
                    </div>
                    <div className="admin2-payslip-notes">
                      <p><strong>Notes:</strong></p>
                      <ul>
                        <li>This is an official pay slip for {selectedPayslip.month} {selectedPayslip.year}</li>
                        <li>Payment was processed on {formatDate(selectedPayslip.paid_at)}</li>
                        <li>For any queries, please contact the HR department</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin2-payslip-modal-footer">
                <button 
                  className="admin2-payslip-modal-close-btn-footer"
                  onClick={closePayslipModal}
                >
                  Close
                </button>
                <button 
                  className="admin2-payslip-modal-download-btn"
                  onClick={() => downloadPayslip(selectedPayslip)}
                >
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