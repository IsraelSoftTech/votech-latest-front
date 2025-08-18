import React, { useState, useEffect, useRef } from 'react';
import SideTop from './SideTop';
import { FaEdit, FaSave, FaTimes, FaDollarSign, FaUsers, FaCalendarAlt, FaMoneyBillWave, FaSearch, FaDownload, FaPrint } from 'react-icons/fa';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import MessageBox from './MessageBox';
import SalaryReceipt from './SalaryReceipt';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Salary.css';

export default function Salary({ authUser }) {
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [statistics, setStatistics] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalApproved: 0
  });
  const [loading, setLoading] = useState(true);
  const [editingSalary, setEditingSalary] = useState(null);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Pay Salary Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    name: '',
    salaryAmount: '',
    month: new Date().getMonth() + 1
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNames, setFilteredNames] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const receiptRef = useRef();

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
    fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [applicationsData, statsData] = await Promise.all([
        api.getApprovedApplications(),
        api.getSalaryStatistics()
      ]);
      setApprovedApplications(applicationsData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error fetching salary data:', error);
      if (error.message.includes('Session expired')) {
        showMessage('Session Expired', 'Your session has expired. Please login again.', 'error');
        setTimeout(() => {
          window.location.href = '/signin';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSalary = (application) => {
    setEditingSalary(application.application_id);
    setSalaryAmount(application.salary_amount.toString());
  };

  const handleSaveSalary = async (application) => {
    try {
      if (!salaryAmount || parseFloat(salaryAmount) <= 0) {
        showMessage('Invalid Amount', 'Please enter a valid salary amount', 'warning');
        return;
      }

      await api.updateSalary(
        application.applicant_id,
        parseFloat(salaryAmount)
      );

      setSuccessMessage('success');
      setEditingSalary(null);
      setSalaryAmount('');
      
      // Refresh data
      await fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating salary:', error);
      showMessage('Error', `Error updating salary: ${error.message}`, 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingSalary(null);
    setSalaryAmount('');
  };

  // Pay Salary Modal Functions
  const openPayModal = () => {
    setShowPayModal(true);
    setPayForm({
      name: '',
      salaryAmount: '',
      month: new Date().getMonth() + 1
    });
    setSearchQuery('');
    setFilteredNames([]);
    setShowSearchResults(false);
    setSelectedApplication(null);
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setPayForm({
      name: '',
      salaryAmount: '',
      month: new Date().getMonth() + 1
    });
    setSearchQuery('');
    setFilteredNames([]);
    setShowSearchResults(false);
    setSelectedApplication(null);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredNames([]);
      setShowSearchResults(false);
      return;
    }

    // Filter approved applications and exclude only those already paid for the selected month/year
    const filtered = approvedApplications.filter(app => {
      const nameMatches = app.applicant_name.toLowerCase().includes(query.toLowerCase());
      
      // Only exclude if this employee is already paid for the SPECIFIC month being selected
      const selectedMonthName = getMonthName(payForm.month);
      let alreadyPaidForSelectedPeriod = false;
      
      if (app.all_salary_records) {
        const selectedMonthRecord = app.all_salary_records.find(record => 
          record.month === selectedMonthName && record.year === getCurrentAcademicYear().split('/')[0] // Use current academic year's start year
        );
        // Only exclude if this specific month is already paid
        alreadyPaidForSelectedPeriod = selectedMonthRecord && selectedMonthRecord.paid === true;
      }
      
      // Show employee if name matches AND they haven't been paid for the selected month
      return nameMatches && !alreadyPaidForSelectedPeriod;
    });
    
    setFilteredNames(filtered);
    setShowSearchResults(true);
  };

  const selectName = (application) => {
    setPayForm({
      ...payForm,
      name: application.applicant_name,
      salaryAmount: application.salary_amount > 0 ? application.salary_amount.toString() : ''
    });
    setSelectedApplication(application);
    setSearchQuery(application.applicant_name);
    setShowSearchResults(false);
  };

  const handlePayFormChange = (e) => {
    const { name, value } = e.target;
    setPayForm(prev => ({
      ...prev,
      [name]: value
    }));

    // If month or year changes, trigger a new search to update the filtered results
    if ((name === 'month') && searchQuery.trim() !== '') {
      // Trigger search again with the new month/year
      const filtered = approvedApplications.filter(app => {
        const nameMatches = app.applicant_name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Only exclude if this employee is already paid for the SPECIFIC month being selected
        const selectedMonthName = getMonthName(parseInt(value));
        const selectedYear = getCurrentAcademicYear().split('/')[0]; // Use current academic year's start year
        let alreadyPaidForSelectedPeriod = false;
        
        if (app.all_salary_records) {
          const selectedMonthRecord = app.all_salary_records.find(record => 
            record.month === selectedMonthName && record.year === selectedYear
          );
          // Only exclude if this specific month is already paid
          alreadyPaidForSelectedPeriod = selectedMonthRecord && selectedMonthRecord.paid === true;
        }
        
        // Show employee if name matches AND they haven't been paid for the selected month
        return nameMatches && !alreadyPaidForSelectedPeriod;
      });
      
      setFilteredNames(filtered);
      setShowSearchResults(true);
    }
  };

  const handlePaySalary = async () => {
    try {
      if (!selectedApplication || !payForm.salaryAmount || !payForm.month) {
        showMessage('Missing Information', 'Please fill in all required fields', 'warning');
        return;
      }

      // Get the correct salary record for the selected month
      const selectedMonthName = getMonthName(payForm.month);
      const academicYearStart = getCurrentAcademicYear().split('/')[0];
      
      console.log('🔍 Debugging salary payment:', {
        selectedApplication: selectedApplication.applicant_name,
        selectedMonth: selectedMonthName,
        academicYearStart: academicYearStart,
        allSalaryRecords: selectedApplication.all_salary_records
      });
      
      // Find the salary record for the selected month from all_salary_records
      let salaryRecord = null;
      if (selectedApplication.all_salary_records) {
        salaryRecord = selectedApplication.all_salary_records.find(record => 
          record.month === selectedMonthName && record.year === parseInt(academicYearStart)
        );
        
        console.log('🔍 Salary record search:', {
          lookingFor: { month: selectedMonthName, year: parseInt(academicYearStart) },
          foundRecord: salaryRecord,
          allRecords: selectedApplication.all_salary_records.map(r => ({ month: r.month, year: r.year, id: r.id }))
        });
      }

      if (!salaryRecord || !salaryRecord.id) {
        showMessage('No Salary Record', `No salary record found for ${selectedApplication.applicant_name} for ${selectedMonthName} ${academicYearStart}. Please set a salary amount first.`, 'warning');
        return;
      }

      // Check if salary is already paid for the specific month being paid
      if (salaryRecord.paid === true) {
        showMessage('Already Paid', `Salary for ${selectedApplication.applicant_name} for ${selectedMonthName} ${academicYearStart} has already been paid.`, 'warning');
        return;
      }

      // Confirm payment
      showMessage(
        'Confirm Payment',
        `Are you sure you want to pay ${formatCurrency(parseFloat(payForm.salaryAmount))} to ${selectedApplication.applicant_name} for ${selectedMonthName} ${academicYearStart}?\n\nThis action cannot be undone.`,
        'warning',
        async () => {
          try {
            await api.markSalaryAsPaid(salaryRecord.id);

            setSuccessMessage('success');
            closePayModal();
            
            // Refresh data
            await fetchData();
            
            // Generate receipt after 2 seconds
            setTimeout(() => {
              generateReceipt();
            }, 2000);
            
            // Clear success message after 5 seconds
            setTimeout(() => {
              setSuccessMessage('');
            }, 5000);
          } catch (error) {
            console.error('Error paying salary:', error);
            
            // Handle specific error messages from backend
            if (error.message.includes('already been paid')) {
              showMessage('Payment Error', error.message, 'error');
              // Refresh data to show updated status
              await fetchData();
            } else if (error.message.includes('Cannot pay twice')) {
              showMessage('Payment Error', error.message, 'error');
              // Refresh data to show updated status
              await fetchData();
            } else {
              showMessage('Error', `Error paying salary: ${error.message}`, 'error');
            }
          }
        },
        'Pay',
        'Cancel',
        true
      );
    } catch (error) {
      console.error('Error in payment process:', error);
      showMessage('Error', `Error in payment process: ${error.message}`, 'error');
    }
  };

  const generateReceipt = () => {
    const receipt = {
      type: 'Salary Payment',
      periodValue: `${getMonthName(payForm.month)} ${getCurrentAcademicYear().split('/')[0]}`,
      generatedAt: new Date().toLocaleString(),
      employeeName: selectedApplication.applicant_name,
      employeeContact: selectedApplication.contact,
      salaryAmount: parseFloat(payForm.salaryAmount),
      paymentDate: new Date().toLocaleDateString(),
      paymentTime: new Date().toLocaleTimeString(),
      month: payForm.month,
      year: getCurrentAcademicYear().split('/')[0],
      monthName: getMonthName(payForm.month)
    };
    
    setPaymentReceipt(receipt);
    setShowReceipt(true);
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setPaymentReceipt(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount);
  };

  const getCurrentMonthName = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[new Date().getMonth()];
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
  };

  // Calculate current academic year (changes on August 1st)
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    
    // Academic year changes on August 1st
    // If we're in August (1st or later) or September onwards, use current year as start
    if (currentMonth >= 8) {
      return `${currentYear}/${currentYear + 1}`;
    } else {
      return `${currentYear - 1}/${currentYear}`;
    }
  };

  // Get the start year of the academic year (for database storage)
  const getAcademicYearStart = () => {
    const academicYear = getCurrentAcademicYear();
    return parseInt(academicYear.split('/')[0]);
  };

  // Check if there are any pending salaries to pay
  const hasPendingSalaries = () => {
    return approvedApplications.some(app => {
      // Check if employee has any salary records
      if (!app.all_salary_records || app.all_salary_records.length === 0) {
        return false;
      }
      
      // Check if any month is pending (not paid)
      return app.all_salary_records.some(record => record.paid === false);
    });
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <SideTop>
      <div className="salary-container">
        {successMessage && (
          <SuccessMessage 
            message={successMessage} 
            onClose={() => setSuccessMessage('')}
          />
        )}

        {/* MessageBox */}
        <MessageBox {...messageBox} onClose={closeMessage} />

        {/* Header */}
        <div className="salary-header">
          <h1 className="salary-title">Salary Management</h1>
          <p className="salary-subtitle">
            Manage salaries for approved applications - {getCurrentMonthName()} {new Date().getFullYear()}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="salary-stats-container">
          <div className="salary-stat-card salary-paid-card">
            <div className="salary-stat-icon">
              <FaDollarSign />
            </div>
            <div className="salary-stat-content">
              <h3 className="salary-stat-title">Total Paid</h3>
              <p className="salary-stat-amount">{formatCurrency(statistics.totalPaid)}</p>
              <p className="salary-stat-label">This Month</p>
            </div>
          </div>

          <div className="salary-stat-card salary-pending-card">
            <div className="salary-stat-icon">
              <FaCalendarAlt />
            </div>
            <div className="salary-stat-content">
              <h3 className="salary-stat-title">Total Pending</h3>
              <p className="salary-stat-amount">{formatCurrency(statistics.totalPending)}</p>
              <p className="salary-stat-label">This Month</p>
            </div>
          </div>

          <div className="salary-stat-card salary-approved-card">
            <div className="salary-stat-icon">
              <FaUsers />
            </div>
            <div className="salary-stat-content">
              <h3 className="salary-stat-title">Approved Staff</h3>
              <p className="salary-stat-amount">{statistics.totalApproved}</p>
              <p className="salary-stat-label">Total Approved</p>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="salary-table-container">
          <div className="salary-table-header">
            <h2 className="salary-table-title">Approved Applications & Salaries</h2>
            <div className="salary-table-actions">
              <button 
                className="salary-pay-btn"
                onClick={openPayModal}
                disabled={!hasPendingSalaries()}
              >
                <FaMoneyBillWave /> Pay Salary
              </button>
              <button 
                className="salary-delete-all-btn"
                onClick={() => {
                  showMessage(
                    'Delete All Salaries',
                    'Do you want to delete all paid salary records? This action will permanently remove all salary amounts and payment records from the database.',
                    'error',
                    async () => {
                      try {
                        await api.deleteAllSalaries();
                        setSuccessMessage('success');
                        await fetchData();
                        setTimeout(() => {
                          setSuccessMessage('');
                        }, 3000);
                      } catch (error) {
                        console.error('Error deleting all salaries:', error);
                        showMessage('Error', `Failed to delete salary records: ${error.message}`, 'error');
                      }
                    },
                    'Delete All',
                    'Cancel',
                    true
                  );
                }}
              >
                <FaTimes /> Delete All
              </button>
            </div>
          </div>

          {loading ? (
            <div className="salary-loading">
              <div className="salary-loading-spinner"></div>
              <p>Loading approved applications...</p>
            </div>
          ) : approvedApplications.length === 0 ? (
            <div className="salary-empty-state">
              <div className="salary-empty-icon">📋</div>
              <h3>No Approved Applications</h3>
              <p>There are no approved applications to display. Approved applications will appear here once they are processed.</p>
            </div>
          ) : (
            <div className="salary-table-responsive">
              <table className="salary-table">
                <thead className="salary-table-head">
                  <tr className="salary-table-row">
                    <th className="salary-table-header-cell">Name</th>
                    <th className="salary-table-header-cell">Contact</th>
                    <th className="salary-table-header-cell">Classes</th>
                    <th className="salary-table-header-cell">Subjects</th>
                    <th className="salary-table-header-cell">Salary</th>
                    <th className="salary-table-header-cell">Status</th>
                    <th className="salary-table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="salary-table-body">
                  {approvedApplications.map((app) => (
                    <tr key={app.application_id} className="salary-table-row">
                      <td className="salary-table-cell salary-name-cell">
                        <div className="salary-applicant-info">
                          <span className="salary-applicant-name">{app.applicant_name}</span>
                        </div>
                      </td>
                      <td className="salary-table-cell">{app.contact}</td>
                      <td className="salary-table-cell">{app.classes}</td>
                      <td className="salary-table-cell">{app.subjects}</td>
                      <td className="salary-table-cell salary-amount-cell">
                        {editingSalary === app.application_id ? (
                          <div className="salary-edit-container">
                            <div className="salary-edit-row">
                              <input
                                type="number"
                                value={salaryAmount}
                                onChange={(e) => setSalaryAmount(e.target.value)}
                                className="salary-edit-input"
                                placeholder="Enter amount"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="salary-amount">
                            {app.salary_amount > 0 ? formatCurrency(app.salary_amount) : 'Not set'}
                          </span>
                        )}
                      </td>
                      <td className="salary-table-cell salary-status-cell">
                        {app.salary_amount > 0 ? (
                          app.salary_status === 'paid' ? (
                            <div className="salary-status-paid">
                              <span className="salary-status-badge salary-paid">PAID</span>
                              <div className="salary-paid-details">
                                <span className="salary-paid-month">Paid for {app.salary_month} {app.salary_year}</span>
                                {app.paid_at && (
                                  <span className="salary-paid-date">
                                    {new Date(app.paid_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="salary-status-pending">
                              <span className="salary-status-badge salary-pending">PENDING</span>
                              {app.paid_months && (
                                <div className="salary-previously-paid">
                                  <span className="salary-previously-paid-label">Previously paid:</span>
                                  <span className="salary-previously-paid-months">{app.paid_months}</span>
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="salary-status-badge salary-not-set">NOT SET</span>
                        )}
                      </td>
                      <td className="salary-table-cell salary-actions-cell">
                        {editingSalary === app.application_id ? (
                          <div className="salary-action-buttons">
                            <button
                              className="salary-action-btn salary-save-btn"
                              onClick={() => handleSaveSalary(app)}
                              title="Save"
                            >
                              <FaSave />
                            </button>
                            <button
                              className="salary-action-btn salary-cancel-btn"
                              onClick={handleCancelEdit}
                              title="Cancel"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="salary-action-btn salary-edit-btn"
                            onClick={() => handleEditSalary(app)}
                            title="Edit Salary"
                          >
                            <FaEdit />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pay Salary Modal */}
        {showPayModal && (
          <div className="salary-pay-modal-overlay">
            <div className="salary-pay-modal">
              <div className="salary-pay-modal-header">
                <h3 className="salary-pay-modal-title">
                  <FaMoneyBillWave /> Pay Salary
                </h3>
                <button 
                  className="salary-pay-modal-close-btn"
                  onClick={closePayModal}
                >
                  ×
                </button>
              </div>
              
              <div className="salary-pay-modal-body">
                <div className="salary-pay-form-group">
                  <label className="salary-pay-form-label">Employee Name *</label>
                  <div className="salary-pay-search-container">
                    <div className="salary-pay-search-input-wrapper">
                      <FaSearch className="salary-pay-search-icon" />
                      <input
                        type="text"
                        name="name"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search employee name..."
                        className="salary-pay-search-input"
                      />
                    </div>
                    {showSearchResults && filteredNames.length > 0 && (
                      <div className="salary-pay-search-results">
                        {filteredNames.map((app) => (
                          <button
                            key={app.application_id}
                            className="salary-pay-search-result-btn"
                            onClick={() => selectName(app)}
                          >
                            {app.applicant_name} - {app.contact}
                          </button>
                        ))}
                      </div>
                    )}
                    {showSearchResults && filteredNames.length === 0 && searchQuery.trim() !== '' && (
                      <div className="salary-pay-no-results">
                        <p>No pending salaries found for {getMonthName(payForm.month)} {getCurrentAcademicYear().split('/')[0]}.</p>
                        <p>All employees may have already been paid for this period.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="salary-pay-form-group">
                  <label className="salary-pay-form-label">Salary Amount (XAF) *</label>
                  <input
                    type="number"
                    name="salaryAmount"
                    value={payForm.salaryAmount}
                    onChange={handlePayFormChange}
                    placeholder="Enter salary amount"
                    min="0"
                    step="0.01"
                    className="salary-pay-form-input"
                    readOnly={selectedApplication && selectedApplication.salary_amount > 0}
                  />
                </div>

                <div className="salary-pay-form-group">
                  <label className="salary-pay-form-label">Academic Year</label>
                  <div className="salary-pay-academic-year-display">
                    <span className="salary-pay-academic-year-text">{getCurrentAcademicYear()}</span>
                    <small className="salary-pay-academic-year-note">(Auto-updates on August 1st)</small>
                  </div>
                </div>

                <div className="salary-pay-form-group">
                  <label className="salary-pay-form-label">Month *</label>
                  <select
                    name="month"
                    value={payForm.month}
                    onChange={handlePayFormChange}
                    className="salary-pay-form-select"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>

                {selectedApplication && (
                  <div className="salary-pay-selected-info">
                    <h4>Selected Employee:</h4>
                    <p><strong>Name:</strong> {selectedApplication.applicant_name}</p>
                    <p><strong>Contact:</strong> {selectedApplication.contact}</p>
                    <p><strong>Classes:</strong> {selectedApplication.classes}</p>
                    <p><strong>Subjects:</strong> {selectedApplication.subjects}</p>
                  </div>
                )}
              </div>

              <div className="salary-pay-modal-footer">
                <button 
                  className="salary-pay-modal-cancel-btn"
                  onClick={closePayModal}
                >
                  Cancel
                </button>
                <button 
                  className="salary-pay-modal-pay-btn"
                  onClick={handlePaySalary}
                  disabled={!selectedApplication || !payForm.salaryAmount}
                >
                  <FaMoneyBillWave /> Pay Salary
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Salary Receipt Modal */}
        {showReceipt && paymentReceipt && (
          <div className="salary-receipt-modal-overlay">
            <div className="salary-receipt-modal">
              <div className="salary-receipt-modal-header">
                <h3 className="salary-receipt-modal-title">
                  <FaDownload /> Salary Payment Receipt
                </h3>
                <button 
                  className="salary-receipt-modal-close-btn"
                  onClick={closeReceipt}
                >
                  ×
                </button>
              </div>
              
              <div className="salary-receipt-modal-body">
                <SalaryReceipt receipt={paymentReceipt} ref={receiptRef} />
              </div>

              <div className="salary-receipt-modal-footer">
                <button 
                  className="salary-receipt-modal-close-btn-footer"
                  onClick={closeReceipt}
                >
                  Close
                </button>
                <button 
                  className="salary-receipt-modal-download-btn"
                  onClick={() => {
                    if (receiptRef.current) {
                      const canvas = html2canvas(receiptRef.current, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff'
                      }).then(canvas => {
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

                        const fileName = `salary_receipt_${paymentReceipt.employeeName.replace(/\s+/g, '_')}_${paymentReceipt.monthName}_${paymentReceipt.year}.pdf`;
                        pdf.save(fileName);
                      });
                    }
                  }}
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