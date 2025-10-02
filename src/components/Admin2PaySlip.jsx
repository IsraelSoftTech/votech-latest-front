import React, { useState, useEffect, useRef } from 'react';
import SideTop from './SideTop';
import { FaDownload, FaSort, FaFilter, FaCalendarAlt, FaUser, FaMoneyBillWave, FaSearch, FaPrint, FaCog, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../services/api';
import MessageBox from './MessageBox';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Admin2PaySlip.css';
import PayslipTemplate from './PayslipTemplate';
import './PayslipTemplate.css';

const DEFAULT_STRUCTURE = [
  { title: '1) AUXILARY ALLOWANCE', items: [
    { code: 'a)', label: 'Transport & Calls', percent: 10, debitPercent: null, remark: '' },
    { code: 'b)', label: 'Job Responsibility', percent: 30, debitPercent: null, remark: '' },
    { code: 'i)', label: 'Executing and Reporting of personal administrative and teaching responsibility', note: true },
    { code: 'ii)', label: 'Delegating, Coordinating and Reporting of administrative responsibilities of which you are the Leade.', note: true },
  ]},
  { title: '2) BASIC ESSENTIAL ALLOWANCE', items: [
    { code: 'a)', label: 'Housing, Feeding, Health Care, Family Support, Social Security', percent: 30, debitPercent: null, remark: '' },
    { code: 'b)', label: 'C.N.P.S Personal Contribution', percent: null, debitPercent: 4, remark: '4% of Gross Salary' },
  ]},
  { title: '3) PROFESSIONAL & RESEARCH ALLOWANCE', items: [
    { code: 'a)', label: 'Professional Development and Dressing support', percent: 20, debitPercent: null, remark: '' },
  ]},
  { title: '4) BONUS ALLOWANCE', items: [
    { code: 'a)', label: 'Longivity, Productivity, Creativity, Intrapreneurship', percent: 10, debitPercent: null, remark: '' },
  ]},
  { title: '5) OTHERS', items: [
    { code: 'a)', label: 'Socials', percent: null, debitPercent: null, remark: '' },
    { code: 'b)', label: 'Niangi', percent: null, debitPercent: null, remark: '' },
  ]},
];

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

  // Read CNPS preferences saved from Salary page
  const getCnpsIncludedFor = (rec) => {
    try {
      // Prefer backend-provided flag if present on the record
      const backendExcluded = typeof rec?.cnps_excluded === 'boolean' ? rec.cnps_excluded : null;
      if (backendExcluded !== null) {
        return !backendExcluded; // included if not excluded
      }
      // Fallback to local storage
      const raw = localStorage.getItem('cnpsPreferences');
      const prefs = raw ? JSON.parse(raw) : {};
      const idKey = String(rec && (rec.user_id || rec.applicant_id || rec.id));
      const nameKey = `name:${String(rec && (rec.user_name || rec.applicant_name) || '')}`;
      const excludedById = prefs?.[idKey];
      const excludedByName = prefs?.[nameKey];
      const isExcluded = typeof excludedById === 'boolean' ? excludedById : (typeof excludedByName === 'boolean' ? excludedByName : false);
      return !isExcluded; // include CNPS unless excluded
    } catch (e) {
      return true;
    }
  };

  // Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [payslipStructure, setPayslipStructure] = useState([]);

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
    loadPayslipSettings();
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
      const list = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      setPaidSalaries(list);
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

  const loadPayslipSettings = async () => {
    try {
      const res = await api.getPayslipSettings();
      const settings = res?.settings || null;
      if (settings && Array.isArray(settings.structure) && settings.structure.length) {
        setPayslipStructure(settings.structure);
      } else {
        setPayslipStructure(DEFAULT_STRUCTURE);
      }
    } catch (e) {
      console.error('Failed to load payslip settings:', e);
      setPayslipStructure(DEFAULT_STRUCTURE);
    }
  };

  const savePayslipSettings = async () => {
    try {
      await api.savePayslipSettings({ structure: payslipStructure });
      showMessage('Success', 'Payslip settings saved successfully.', 'success');
      setShowSettingsModal(false);
    } catch (e) {
      console.error('Failed to save settings:', e);
      showMessage('Error', 'Failed to save payslip settings', 'error');
    }
  };

  const addSection = () => {
    setPayslipStructure(prev => ([...prev, { title: '', items: [] }]));
  };

  const removeSection = (sIndex) => {
    setPayslipStructure(prev => prev.filter((_, idx) => idx !== sIndex));
  };

  const updateSectionTitle = (sIndex, value) => {
    setPayslipStructure(prev => prev.map((sec, idx) => idx === sIndex ? { ...sec, title: value } : sec));
  };

  const addItem = (sIndex) => {
    setPayslipStructure(prev => prev.map((sec, idx) => idx === sIndex ? { ...sec, items: [...(sec.items||[]), { code: '', label: '', percent: null, debitPercent: null, remark: '', note: false }] } : sec));
  };

  const removeItem = (sIndex, iIndex) => {
    setPayslipStructure(prev => prev.map((sec, idx) => idx === sIndex ? { ...sec, items: sec.items.filter((_, j) => j !== iIndex) } : sec));
  };

  const updateItemField = (sIndex, iIndex, field, value) => {
    setPayslipStructure(prev => prev.map((sec, idx) => {
      if (idx !== sIndex) return sec;
      const items = sec.items.map((it, j) => j === iIndex ? { ...it, [field]: value } : it);
      return { ...sec, items };
    }));
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

  const getFilteredAndSortedData = () => {
    let filtered = paidSalaries.filter(salary => {
      const displayName = (salary.user_name || salary.applicant_name || '').toLowerCase();
      const matchesSearch = displayName.includes(searchQuery.toLowerCase()) ||
                           salary.contact.includes(searchQuery);
      const matchesMonth = !filterMonth || salary.month === filterMonth;
      const matchesYear = !filterYear || salary.year.toString() === filterYear;
      return matchesSearch && matchesMonth && matchesYear;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'applicant_name':
          aValue = (a.user_name || a.applicant_name || '').toLowerCase();
          bValue = (b.user_name || b.applicant_name || '').toLowerCase();
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
      setTimeout(async () => {
        if (payslipRef.current) {
          // Detect mobile device
          const isMobile = window.innerWidth <= 768;
          const element = payslipRef.current;
          
          // Force a fixed width for mobile to prevent cutting
          if (isMobile) {
            element.classList.add('pdf-generation-mobile');
            element.style.width = '400px'; // Slightly wider for better readability
            element.style.minWidth = '400px';
            element.style.maxWidth = '400px';
            element.style.transform = 'scale(1)';
            element.style.transformOrigin = 'top left';
          }
          
          // Wait for layout to settle
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Enhanced html2canvas configuration for better mobile rendering
          const canvas = await html2canvas(element, {
            scale: isMobile ? 2.5 : (window.devicePixelRatio || 2), // Balanced scale for mobile
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: isMobile ? 400 : element.scrollWidth,
            height: element.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: isMobile ? 400 : Math.max(element.scrollWidth, 800),
            windowHeight: Math.max(element.scrollHeight, 600),
            foreignObjectRendering: false, // Sometimes causes issues on mobile
            logging: false,
            removeContainer: true
          });
          
          // Reset element styles
          if (isMobile) {
            element.classList.remove('pdf-generation-mobile');
            element.style.width = '';
            element.style.minWidth = '';
            element.style.maxWidth = '';
            element.style.transform = '';
            element.style.transformOrigin = '';
          }
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
          const fileName = `payslip_${(salary.user_name||salary.applicant_name||'user').replace(/\s+/g, '_')}_${salary.month}_${salary.year}.pdf`;
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

  const generateEmploymentNumber = (rec) => {
    const base = (rec?.applicant_name || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'STAFF';
    const id = Number(rec?.id || 0);
    const pseudo = (id * 9301 + 49297) % 100000; // deterministic 5 digits
    return `${base}-${String(pseudo).padStart(5, '0')}`;
  };

  const generateAcademicYears = () => {
    const currentAcademicYear = getCurrentAcademicYear();
    const [startYear] = currentAcademicYear.split('/');
    const startYearNum = parseInt(startYear);
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

        {/* Controls */}
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

        {/* Table */}
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
                          <span className="admin2-payslip-employee-name">{salary.user_name || salary.applicant_name}</span>
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
                  <h4>Payslip Structure</h4>
                  <p className="admin2-payslip-settings-description">
                    Configure sections (headings) and items (subheadings). Use Credit % for earnings and Debit % for deductions. Remarks are optional.
                  </p>

                  <button className="admin2-payslip-settings-add-btn" onClick={addSection}><FaPlus /> Add Section</button>

                  {payslipStructure.length === 0 ? (
                    <div className="admin2-payslip-settings-empty">
                      <p>No sections yet. Click "Add Section" to begin.</p>
                    </div>
                  ) : (
                    <div className="admin2-payslip-settings-items">
                      {payslipStructure.map((sec, sIndex) => (
                        <div key={sIndex} className="admin2-payslip-settings-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text"
                              className="admin2-payslip-settings-input"
                              placeholder="Section title (e.g., 1) AUXILARY ALLOWANCE)"
                              value={sec.title}
                              onChange={(e) => updateSectionTitle(sIndex, e.target.value)}
                            />
                            <button className="admin2-payslip-settings-remove-btn" onClick={() => removeSection(sIndex)} title="Remove section"><FaTimes /></button>
                            <button className="admin2-payslip-settings-add-btn" onClick={() => addItem(sIndex)} title="Add item"><FaPlus /></button>
                          </div>

                          {(sec.items || []).length === 0 ? (
                            <div className="admin2-payslip-settings-empty" style={{ marginTop: 8 }}>
                              <p>No items. Use + to add.</p>
                            </div>
                          ) : (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {sec.items.map((it, iIndex) => (
                                <div key={iIndex} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 1fr 70px 40px', gap: 8, alignItems: 'center' }}>
                                  <input type="text" className="admin2-payslip-settings-input" placeholder="Code (a), i), etc.)" value={it.code || ''} onChange={(e) => updateItemField(sIndex, iIndex, 'code', e.target.value)} />
                                  <input type="text" className="admin2-payslip-settings-input" placeholder="Label" value={it.label || ''} onChange={(e) => updateItemField(sIndex, iIndex, 'label', e.target.value)} />
                                  <input type="number" className="admin2-payslip-settings-input" placeholder="Credit %" value={it.percent ?? ''} onChange={(e) => updateItemField(sIndex, iIndex, 'percent', e.target.value === '' ? null : parseFloat(e.target.value))} disabled={!!it.note} />
                                  <input type="number" className="admin2-payslip-settings-input" placeholder="Debit %" value={it.debitPercent ?? ''} onChange={(e) => updateItemField(sIndex, iIndex, 'debitPercent', e.target.value === '' ? null : parseFloat(e.target.value))} disabled={!!it.note} />
                                  <input type="text" className="admin2-payslip-settings-input" placeholder="Remark" value={it.remark || ''} onChange={(e) => updateItemField(sIndex, iIndex, 'remark', e.target.value)} />
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                    <input type="checkbox" checked={!!it.note} onChange={(e) => updateItemField(sIndex, iIndex, 'note', e.target.checked)} />
                                    Note
                                  </label>
                                  <button className="admin2-payslip-settings-remove-btn" onClick={() => removeItem(sIndex, iIndex)} title="Remove"><FaTimes /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
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
                  onClick={savePayslipSettings}
                  disabled={payslipStructure.length === 0}
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
                  <FaPrint /> Pay Slip - {selectedPayslip.user_name || selectedPayslip.applicant_name}
                </h3>
                <button 
                  className="admin2-payslip-modal-close-btn"
                  onClick={closePayslipModal}
                >
                  ×
                </button>
              </div>
              
              <div className="admin2-payslip-modal-body">
                <div ref={payslipRef}>
                  <PayslipTemplate
                    name={selectedPayslip.user_name || selectedPayslip.applicant_name}
                    employmentNumber={generateEmploymentNumber(selectedPayslip)}
                    month={selectedPayslip.month}
                    year={selectedPayslip.year}
                    grossAmount={selectedPayslip.amount}
                    debitPercentCNPS={getCnpsIncludedFor(selectedPayslip) ? 4 : 0}
                    structure={payslipStructure && payslipStructure.length ? payslipStructure : undefined}
                  />
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