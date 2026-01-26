import React, { useEffect, useState, useMemo, useCallback } from 'react';
import SideTop from './SideTop';
import './Fee.css';
import './FeeReceipt.css';
import './FeeReport.css';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import FeeReport from './FeeReport';
import FeeReceipt from './FeeReceipt';
import { usePermissions } from '../hooks/usePermissions';
import { FaEdit, FaPrint, FaMoneyBillWave, FaEye, FaDownload, FaLock, FaHistory } from 'react-icons/fa';

export default function Fee() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get permissions
  const { isReadOnly, userRole } = usePermissions();
  const isAdmin1 = userRole === 'Admin1';

  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const searchTimeout = React.useRef();
  const [selectedStudent, setSelectedStudent] = React.useState(null);
  const [studentFeeStats, setStudentFeeStats] = React.useState(null);
  const [feeStatsLoading, setFeeStatsLoading] = React.useState(false);
  const [feeStatsError, setFeeStatsError] = React.useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [payType, setPayType] = React.useState('');
  const [payAmount, setPayAmount] = React.useState('');
  const [feeStatsModalOpen, setFeeStatsModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [classStatsLoading, setClassStatsLoading] = useState(false);
  const [classStatsError, setClassStatsError] = useState('');
  const [classStats, setClassStats] = useState(null);
  const [proceedClicked, setProceedClicked] = useState(false);
  const [showFeeReportModal, setShowFeeReportModal] = useState(false);
  const [generatedFeeReport, setGeneratedFeeReport] = useState(null);
  const feeReportRef = React.useRef();
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ className: '', classId: '', backendResponse: null });
  
  // Discount state
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountRate, setDiscountRate] = useState(() => {
    const saved = localStorage.getItem('globalFeeDiscountRate');
    const parsed = saved ? parseFloat(saved) : 0;
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
  });
  const [discountApplies, setDiscountApplies] = useState(() => {
    try {
      const raw = localStorage.getItem('feeDiscountApplies');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  
  // Receipt modal state
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = React.useRef();
  
  // Transaction history state
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);

  // New state for fee management table
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentFeeDetails, setStudentFeeDetails] = useState({});
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Function to fetch students (without fee details - fast)
  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const studentsData = await api.getStudents();
      const classesData = await api.getClasses();
    
      setStudents(studentsData);
      setClasses(classesData);
      setFilteredStudents(studentsData);

      // Also update the totals (this might be slow but needed for summary)
      await updateTotals(studentsData, classesData);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Function to fetch fee details only for specific students (lazy loading)
  const fetchFeeDetailsForStudents = useCallback(async (studentIds) => {
    setStudentFeeDetails(prev => {
      const studentsToFetch = studentIds.filter(id => !prev[id]);
      if (studentsToFetch.length === 0) return prev;

      // Fetch in the background
      Promise.all(studentsToFetch.map(async (studentId) => {
        try {
          const feeStats = await api.getStudentFeeStats(studentId);
          return { studentId, feeStats };
        } catch (error) {
          console.error(`Error fetching fee stats for student ${studentId}:`, error);
          return { studentId, feeStats: null };
        }
      })).then(feeDetailsResults => {
        setStudentFeeDetails(prevState => {
          const updated = { ...prevState };
          feeDetailsResults.forEach(({ studentId, feeStats }) => {
            if (feeStats) updated[studentId] = feeStats;
          });
          return updated;
        });
      }).catch(error => {
        console.error('Error fetching fee details:', error);
      });

      return prev;
    });
  }, []); // Stable function - uses functional updates for state

  // Persist discount configs whenever they change
  useEffect(() => {
    try { localStorage.setItem('globalFeeDiscountRate', String(discountRate || 0)); } catch {}
  }, [discountRate]);
  useEffect(() => {
    try { localStorage.setItem('feeDiscountApplies', JSON.stringify(discountApplies || {})); } catch {}
  }, [discountApplies]);

  // Helper: compute discounted totals for table display (UI only)
  const getDiscountedTotals = (studentId) => {
    const base = getStudentFeeStats(studentId);
    if (!base) return null;
    const applies = !!discountApplies[studentId];
    const rate = (parseFloat(discountRate) || 0) / 100;
    if (!applies || rate <= 0) return base;
    const discountedExpected = Math.max(0, Math.round(base.totalExpected * (1 - rate)));
    const totalPaid = base.totalPaid;
    const discountedBalance = Math.max(0, discountedExpected - totalPaid);
    return { ...base, totalExpected: discountedExpected, totalBalance: discountedBalance };
  };

  // Function to update totals (optimized to use cached data when available)
  const updateTotals = async (studentsData, classesData) => {
    setLoadingTotals(true);
    try {
      // Build a map of classId -> class total_fee
      const classMap = {};
      classesData.forEach(cls => {
        classMap[cls.id] = parseFloat(cls.total_fee) || 0;
      });
      
      // Use a callback to get latest fee details state
      let allFeeDetails = {};
      setStudentFeeDetails(prev => {
        allFeeDetails = prev;
        return prev;
      });
      
      // Fetch fee stats only for students we don't have cached
      const studentsToFetch = studentsData.filter(s => !allFeeDetails[s.id]);
      if (studentsToFetch.length > 0) {
        const feeStatsPromises = studentsToFetch.map(async student => {
          try {
            const stats = await api.getStudentFeeStats(student.id);
            return { studentId: student.id, stats };
          } catch (e) {
            return { studentId: student.id, stats: null };
          }
        });
        
        // Wait for new fetches and update cache
        const newFeeStats = await Promise.all(feeStatsPromises);
        setStudentFeeDetails(prev => {
          const updated = { ...prev };
          newFeeStats.forEach(({ studentId, stats }) => {
            if (stats) updated[studentId] = stats;
          });
          allFeeDetails = updated; // Update local reference
          return updated;
        });
      }
      
      // Calculate totals using all fee details
      let paidSum = 0;
      let overallFee = 0;
      for (const student of studentsData) {
        const stats = allFeeDetails[student.id];
        const classTotalFee = classMap[student.class_id] || 0;
        overallFee += classTotalFee;
        let paid = 0;
        if (stats && stats.balance) {
          // Paid = class total fee - sum of balances
          const sumBalance = Object.values(stats.balance).reduce((a, b) => a + (b || 0), 0);
          paid = classTotalFee - sumBalance;
        }
        paidSum += paid;
      }
      setTotalPaid(paidSum);
      setTotalOwed(overallFee - paidSum);
    } catch (e) {
      setTotalPaid(0);
      setTotalOwed(0);
    }
    setLoadingTotals(false);
  };

  // Fetch students on mount (without fee details - fast)
  useEffect(() => {
    fetchStudents();
  }, []);

  // Memoize student IDs on current page for stable dependency
  const currentPageStudentIds = useMemo(() => {
    if (filteredStudents.length === 0) return '';
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const currentPageStudents = filteredStudents.slice(startIdx, endIdx);
    return currentPageStudents.map(s => s.id).sort().join(',');
  }, [currentPage, pageSize, filteredStudents]);

  // Fetch fee details only for students on the current page (lazy loading)
  useEffect(() => {
    if (currentPageStudentIds && typeof currentPageStudentIds === 'string') {
      const studentIds = currentPageStudentIds.split(',').filter(id => id);
      if (studentIds.length > 0) {
        fetchFeeDetailsForStudents(studentIds);
      }
    }
  }, [currentPageStudentIds, fetchFeeDetailsForStudents]);

  // Keep static; no auto-refresh on focus/visibility

  // Refresh data when location changes (user navigates back to this component)
  // Removed auto refresh on navigation change

  // Filter students based on search query and class filter
  useEffect(() => {
    let filtered = students;
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(student => 
        student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by class
    if (selectedClassFilter) {
      filtered = filtered.filter(student => {
        const studentClass = student.class_name || student.class || '';
        return studentClass === selectedClassFilter;
      });
    }
    
    setFilteredStudents(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [students, searchQuery, selectedClassFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to first page if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Calculate student fee statistics
  const getStudentFeeStats = (studentId) => {
    const feeStats = studentFeeDetails[studentId];
    if (!feeStats) return null;
    
    const feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
    let totalExpected = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    
    feeTypes.forEach(type => {
      // Get expected amount from student's class fees
      const expected = parseFloat(feeStats.student?.[type.toLowerCase() + '_fee']) || 0;
      // Calculate paid amount: expected - balance
      const balance = feeStats.balance?.[type] || 0;
      const paid = Math.max(0, expected - balance);
      
      totalExpected += expected;
      totalPaid += paid;
      totalBalance += balance;
    });
    
    return {
      totalExpected,
      totalPaid,
      totalBalance,
      feeTypes: feeTypes.map(type => ({
        type,
        expected: feeStats.balance?.[type] || 0,
        paid: feeStats.paid?.[type] || 0,
        balance: (feeStats.balance?.[type] || 0) - (feeStats.paid?.[type] || 0)
      }))
    };
  };

  // Get student status
  const getStudentStatus = (studentId) => {
    const stats = getStudentFeeStats(studentId);
    if (!stats) return 'Unknown';
    
    if (stats.totalBalance === 0 && stats.totalPaid > 0) return 'Completed';
    if (stats.totalPaid > 0 && stats.totalBalance > 0) return 'Partial';
    if (stats.totalPaid === 0 && stats.totalBalance > 0) return 'Pending';
    return 'No Fees';
  };

  // Handle pay fee
  const handlePayFee = (student) => {
    navigate(`/admin-fee/${student.id}?openPay=1`);
  };

  // Handle view details
  const handleViewDetails = (student) => {
    navigate(`/admin-fee/${student.id}`);
  };

  // Handle edit student fees
  const handleEditStudentFees = (student) => {
    setSelectedStudent(student);
    setPaymentModalOpen(true);
  };

  // Helper to compute already paid for a fee type using cached stats
  const getAlreadyPaidForType = (studentId, typeLabel) => {
    try {
      const stats = studentFeeDetails[studentId];
      if (!stats) return 0;
      const typeKey = String(typeLabel || '').trim();
      const expected = parseFloat(stats.student?.[typeKey.toLowerCase() + '_fee']) || 0;
      const balanceOwed = stats.balance?.[typeKey] || 0;
      const paid = Math.max(0, expected - balanceOwed);
      return paid;
    } catch {
      return 0;
    }
  };

  // Helper to get expected amount for fee type from student's class fees
  const getExpectedForType = (studentId, typeLabel) => {
    try {
      const stats = studentFeeDetails[studentId];
      if (!stats) return 0;
      const expected = parseFloat(stats.student?.[String(typeLabel).toLowerCase() + '_fee']) || 0;
      return expected;
    } catch {
      return 0;
    }
  };

  // Handle clear student fees
  const handleClearStudentFees = async (student) => {
    if (window.confirm(`Are you sure you want to clear all fee records for ${student.full_name}? This action will permanently delete all payment records and cannot be undone.`)) {
      try {
        await api.clearStudentFees(student.id);
        // Refresh the students and their fee details
        await fetchStudentsAndFees();
        alert('Student fees cleared successfully!');
      } catch (error) {
        console.error('Error clearing student fees:', error);
        alert('Failed to clear student fees. Please try again.');
      }
    }
  };

  // Handle generate receipt
  const handleGenerateReceipt = async (student) => {
    try {
      const stats = await api.getStudentFeeStats(student.id);
      const transactions = await api.getStudentPaymentDetails(student.id);
      if (stats && stats.student && stats.balance) {
        setReceiptData({
          student: stats.student,
          balance: stats.balance,
          transactions: transactions,
          discountApplied: !!discountApplies[student.id],
          discountRate: parseFloat(discountRate) || 0
        });
        setReceiptModalOpen(true);
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt.');
    }
  };

  // Handle generate receipt for specific payment
  const handleGenerateReceiptForPayment = async (student, payment) => {
    try {
      const stats = await api.getStudentFeeStats(student.id);
      const transactions = await api.getStudentPaymentDetails(student.id);
      if (stats && stats.student && stats.balance) {
        setReceiptData({
          student: stats.student,
          balance: stats.balance,
          currentPayment: payment,
          transactions: transactions,
          discountApplied: !!discountApplies[student.id],
          discountRate: parseFloat(discountRate) || 0
        });
        setReceiptModalOpen(true);
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt.');
    }
  };

  // Handle show transaction history
  const handleShowTransactionHistory = async (student) => {
    try {
      setSelectedStudentForHistory(student);
      const transactions = await api.getStudentPaymentDetails(student.id);
      setTransactionHistory(transactions);
      setShowTransactionHistory(true);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      alert('Failed to fetch transaction history.');
    }
  };

  // Handle print/download receipt from Actions
  const handlePrintReceipt = async (student) => {
    await handleGenerateReceipt(student);
    // Allow modal to render then trigger download button programmatically
    setTimeout(() => {
      const btn = document.querySelector('.download-pdf-btn');
      if (btn) btn.click();
    }, 300);
  };

  // Fetch and aggregate total paid/owed on mount
  useEffect(() => {
    const fetchInitialTotals = async () => {
      try {
        const students = await api.getStudents();
        const classes = await api.getClasses();
        await updateTotals(students, classes);
      } catch (error) {
        console.error('Error fetching initial totals:', error);
        setTotalPaid(0);
        setTotalOwed(0);
        setLoadingTotals(false);
      }
    };
    fetchInitialTotals();
  }, []);

  // Fetch classes on mount for modal
  useEffect(() => {
    if (feeStatsModalOpen && classes.length === 0) {
      api.getClasses().then(setClasses).catch(() => setClasses([]));
    }
  }, [feeStatsModalOpen, classes.length]);

  // Build class stats using current frontend fee table details to ensure consistency
  useEffect(() => {
    const buildStats = async () => {
      if (proceedClicked && selectedClassName) {
        setClassStatsLoading(true);
        setClassStatsError('');
        try {
          const feeTypes = ['Registration','Bus','Tuition','Internship','Remedial','PTA'];
          const inClass = students.filter(s => (s.class_name || s.class || '') === selectedClassName);
          // fetch missing details for students in class
          const missing = inClass.filter(s => !studentFeeDetails[s.id]);
          if (missing.length) {
            try {
              const results = await Promise.all(missing.map(async m => {
                try { return { id: m.id, details: await api.getStudentFeeStats(m.id) }; } catch { return { id: m.id, details: null }; }
              }));
              const updates = {};
              results.forEach(r => { if (r.details) updates[r.id] = r.details; });
              if (Object.keys(updates).length) {
                setStudentFeeDetails(prev => ({ ...prev, ...updates }));
              }
            } catch {}
          }
          // map rows using latest details
          const currentDetails = (sid) => (studentFeeDetails[sid] || {});
          const mapped = inClass.map(s => {
            const details = currentDetails(s.id);
            const row = {
              id: s.id,
              student_id: s.student_id,
              name: s.full_name,
              full_name: s.full_name,
            };
            let totalPaid = 0;
            let totalBalance = 0;
            let totalExpected = 0;
            feeTypes.forEach(t => {
              const expected = details && details.student ? (parseFloat(details.student?.[t.toLowerCase() + '_fee']) || 0) : 0;
              const balance = details && details.balance ? (details.balance?.[t] || 0) : expected;
              const paid = Math.max(0, expected - balance);
              row[t] = paid;
              row[`${t}_expected`] = expected;
              row[`${t}_balance`] = balance;
              totalPaid += paid;
              totalBalance += balance;
              totalExpected += expected;
            });
            row.Expected = totalExpected;
            row.Total = totalPaid;
            row.Balance = totalBalance;
            row.Status = totalBalance === 0 && totalPaid > 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';
            return row;
          });
          setClassStats(mapped);
          setClassStatsLoading(false);
          setDebugInfo(d => ({ ...d, className: selectedClassName, classId: '', backendResponse: mapped }));
        } catch (err) {
          setClassStatsError('Failed to build class fee statistics.');
          setClassStatsLoading(false);
        }
      }
    };
    buildStats();
  }, [proceedClicked, selectedClassName, students, studentFeeDetails]);

  // Generate fee report
  const generateFeeReport = () => {
    if (!classStats || !Array.isArray(classStats)) {
      console.error('No class stats available');
      return;
    }

    const feeTypes = ['Registration','Bus','Tuition','Internship','Remedial','PTA'];

    // Calculate totals using the same mapped classStats rows shown in the modal
    const totalStudents = classStats.length;
    const totalExpected = classStats.reduce((sum, s) => sum + (s.Expected || 0), 0);
    const totalPaid = classStats.reduce((sum, s) => sum + (s.Total || 0), 0);
    const totalOwed = classStats.reduce((sum, s) => sum + (s.Balance || 0), 0);
    const paymentRate = totalExpected > 0 ? totalPaid / totalExpected : 0;

    // Process students data
    const students = classStats.map(s => {
      const expectedFees = s.Expected || 0;
      const paidFees = s.Total || 0;
      const owedFees = s.Balance || 0;
      
      let paymentStatus = 'uncompleted';
      if (owedFees === 0) paymentStatus = 'completed';
      else if (paidFees > 0) paymentStatus = 'partial';
      
      return {
        id: s.id || Math.random().toString(),
        student_id: s.student_id || 'N/A',
        full_name: s.name || s.full_name,
        expectedFees,
        paidFees,
        owedFees,
        paymentStatus
      };
    });

    // We removed the type breakdown from the report per your request
    const feeBreakdown = [];

    const report = {
      className: selectedClassName,
      totalStudents,
      totalExpected,
      totalPaid,
      totalOwed,
      paymentRate,
      students,
      feeBreakdown,
      generatedAt: new Date().toLocaleString()
    };

    setGeneratedFeeReport(report);
    setShowFeeReportModal(true);
  };

  const closeFeeReportModal = () => {
    setShowFeeReportModal(false);
    setGeneratedFeeReport(null);
  };

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        // Use the API to search students by name or ID
        const res = await api.searchStudents(searchQuery);
        setSearchResults(res);
      } catch (err) {
        setSearchResults([]);
        setSearchError('No students found.');
      }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  // Fetch fee stats
  const handleStudentClick = (student) => {
    navigate(`/admin-fee/${student.id}`);
  };

  // Open payment modal
  const handlePayClick = () => {
    setPaymentModalOpen(true);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !payType || !payAmount) return;
    
    try {
      // Interpret the entered amount as the desired total paid for this fee type.
      // Only increases are supported via creating a new payment record.
      const desiredTotal = parseFloat(payAmount) || 0;
      const alreadyPaid = getAlreadyPaidForType(selectedStudent.id, payType);
      const expected = getExpectedForType(selectedStudent.id, payType);

      if (desiredTotal > expected) {
        alert(`Amount exceeds expected for ${payType}. Max allowed is ${expected.toLocaleString()} XAF.`);
        return;
      }

      let message = 'No changes made.';
      if (desiredTotal < alreadyPaid) {
        // Decrease by reconciling to the new total
        await api.reconcileStudentFee({
          student_id: selectedStudent.id,
          fee_type: payType,
          total_amount: desiredTotal
        });
        message = 'Fee reduced successfully!';
      } else if (desiredTotal > alreadyPaid) {
        // Increase by topping up the delta
        const delta = desiredTotal - alreadyPaid;
        await api.payStudentFee({
          student_id: selectedStudent.id,
          class_id: selectedStudent.class_id,
          fee_type: payType,
          amount: delta
        });
        message = 'Fee updated successfully!';
      }
      
      // Update only this student's cached stats so the table reflects immediately
      try {
        const refreshed = await api.getStudentFeeStats(selectedStudent.id);
        setStudentFeeDetails(prev => ({ ...prev, [selectedStudent.id]: refreshed }));
      } catch {}
      
      // Close modal and show success message
      setPaymentModalOpen(false);
      setPayType('');
      setPayAmount('');
      setSelectedStudent(null);
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error updating fee:', error);
      setSuccessMessage('');
      alert('Failed to update fee. Please try again.');
    }
  };

  // Close payment modal
  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
    setPayType('');
    setPayAmount('');
    setSelectedStudent(null);
  };

  return (
    <SideTop>
      <div className="fee-main-content">
        {successMessage && (
          <div style={{
            background: '#e6ffed',
            color: '#065f46',
            border: '1px solid #34d399',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            fontWeight: 600
          }}>
            {successMessage}
          </div>
        )}
        <div className="fee-header">
          <h2>
            Fee Payment
            {isReadOnly && <span className="read-only-badge"><FaLock /> Read Only</span>}
          </h2>
        </div>
        <div className="fee-cards-row">
          <div className="fee-card paid">
            <div className="fee-card-title">Total Fees Paid</div>
            <div className="fee-card-value">{loadingTotals ? '...' : totalPaid.toLocaleString()} XAF</div>
          </div>
          <div className="fee-card owed">
            <div className="fee-card-title">Total Fees Owed</div>
            <div className="fee-card-value">{loadingTotals ? '...' : totalOwed.toLocaleString()} XAF</div>
          </div>
        </div>
        {/* Responsive search bar and Fee Statistics button */}
        <div style={{ margin: '32px 0 18px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <input
            className="student-search-bar"
            type="text"
            placeholder="Search student by name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: 300, fontSize: 17, borderRadius: 8, border: '1.5px solid #1976d2', padding: '12px 16px' }}
          />
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 200,
              fontSize: 17,
              borderRadius: 8,
              border: '1.5px solid #1976d2',
              padding: '12px 16px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.name}>
                {cls.name}
              </option>
            ))}
          </select>
          {!isReadOnly && (
            <span
              className="fee-stats-btn-text"
              style={{ color: '#1976d2', fontWeight: 600, fontSize: 17, cursor: 'pointer', userSelect: 'none', borderBottom: '1.5px dashed #1976d2' }}
              onClick={() => { setFeeStatsModalOpen(true); setProceedClicked(false); setSelectedClassId(''); setClassStats(null); }}
            >
              Fee Statistics
            </span>
          )}
          <button
            onClick={fetchStudents}
            disabled={studentsLoading}
            style={{
              background: studentsLoading ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '17px',
              fontWeight: 600,
              cursor: studentsLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            title="Refresh fee data"
          >
            <span style={{ fontSize: '16px' }}>🔄</span>
            {studentsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          {!isReadOnly && (
            <button
              onClick={() => setDiscountModalOpen(true)}
              style={{
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '17px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              title="Set discount rate"
            >
              <span style={{ fontSize: '16px' }}>💸</span>
              Discount
            </button>
          )}
        </div>
        {searchLoading && <div style={{ textAlign: 'center', color: '#888', marginTop: 12 }}>Searching...</div>}
        {searchError && <div style={{ textAlign: 'center', color: '#e53e3e', marginTop: 12 }}>{searchError}</div>}
        
        {/* Fee Management Table */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
            <h3 style={{ color: '#204080', fontSize: '1.2rem', margin: 0 }}>
              Student Fee Management ({filteredStudents.length} students)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                Show:
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #1976d2',
                  fontSize: '14px',
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#204080',
                  fontWeight: 500
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
              <span style={{ fontSize: '14px', color: '#666' }}>
                per page
              </span>
            </div>
          </div>
          
          {studentsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #e1e5e9', borderTop: '4px solid #1976d2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
              <p>Loading students and fee data...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No students found matching your criteria.</p>
            </div>
          ) : (
            <div style={{ 
              background: '#fff', 
              borderRadius: 12, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)', 
              overflow: 'hidden',
              marginBottom: 24
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                    <tr style={{ background: '#204080', color: '#fff' }}>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Student</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Class</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Total Expected</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Total Paid</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Balance</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Discount {typeof discountRate === 'number' && discountRate > 0 ? `( ${discountRate}% )` : ''}</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Status</th>
                      {!isAdmin1 && (
                        <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Actions</th>
                      )}
                </tr>
              </thead>
              <tbody>
                    {paginatedStudents.map((student, index) => {
                      const baseStats = getStudentFeeStats(student.id);
                      const feeStats = getDiscountedTotals(student.id) || baseStats;
                      const status = (() => {
                        if (!feeStats) return 'Unknown';
                        if (feeStats.totalBalance === 0 && feeStats.totalPaid > 0) return 'Completed';
                        if (feeStats.totalPaid > 0 && feeStats.totalBalance > 0) return 'Partial';
                        if (feeStats.totalPaid === 0 && feeStats.totalBalance > 0) return 'Pending';
                        return 'No Fees';
                      })();
                      const applied = !!discountApplies[student.id];
                  
                  return (
                        <tr key={student.id} style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          background: index % 2 === 0 ? '#fff' : '#f9fafb'
                        }}>
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <div style={{ fontWeight: 600, color: '#204080' }}>{student.full_name}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>ID: {student.student_id}</div>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px' }}>
                            {student.class_name || student.class || 'N/A'}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#1976d2' }}>
                            {feeStats ? feeStats.totalExpected.toLocaleString() : '0'} XAF
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#2ecc71' }}>
                            {feeStats ? feeStats.totalPaid.toLocaleString() : '0'} XAF
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#e53e3e' }}>
                            {feeStats ? feeStats.totalBalance.toLocaleString() : '0'} XAF
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px' }}>
                            {!isReadOnly ? (
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={applied}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setDiscountApplies(prev => ({ ...prev, [student.id]: checked }));
                                  }}
                                />
                                <span style={{ fontSize: 12, color: '#555' }}>{applied ? 'Apply' : 'No'}</span>
                              </label>
                            ) : (
                              <span style={{ fontSize: 12, color: '#777' }}>{applied ? 'Yes' : 'No'}</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fff',
                              background: status === 'Completed' ? '#2ecc71' : 
                                         status === 'Partial' ? '#ffc107' : 
                                         status === 'Pending' ? '#e53e3e' : '#6c757d'
                            }}>
                              {status}
                            </span>
                      </td>
                          {!isAdmin1 && (
                            <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleViewDetails(student)}
                                  style={{
                                    background: '#1976d2',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="View Details"
                                >
                                  <FaEye size={12} />
                                </button>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handlePayFee(student)}
                                    style={{
                                      background: '#28a745',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '6px 8px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Pay Fee"
                                  >
                                    <FaMoneyBillWave size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleShowTransactionHistory(student)}
                                  style={{
                                    background: '#6f42c1',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="View Transaction History"
                                >
                                  <FaHistory size={12} />
                                </button>
                                {status === 'Completed' && !isReadOnly && (
                                  <button
                                    onClick={() => handleGenerateReceipt(student)}
                                    style={{
                                      background: '#17a2b8',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '6px 8px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Generate Receipt"
                                  >
                                    <FaDownload size={12} />
                                  </button>
                                )}
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleEditStudentFees(student)}
                                    style={{
                                      background: '#ffc107',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '6px 8px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Edit Fees"
                                  >
                                    <FaEdit size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                    </tr>
                  );
                    })}
              </tbody>
            </table>
              </div>
              {/* Pagination Controls */}
              {totalPages > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderTop: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                    {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #1976d2',
                          background: currentPage === 1 ? '#e5e7eb' : '#fff',
                          color: currentPage === 1 ? '#999' : '#1976d2',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="First page"
                      >
                        ««
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #1976d2',
                          background: currentPage === 1 ? '#e5e7eb' : '#fff',
                          color: currentPage === 1 ? '#999' : '#1976d2',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Previous
                      </button>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(() => {
                          const pages = [];
                          const maxVisible = 7;
                          let startPage, endPage;

                          if (totalPages <= maxVisible) {
                            // Show all pages if total is less than max
                            startPage = 1;
                            endPage = totalPages;
                          } else {
                            // Calculate which pages to show
                            if (currentPage <= 3) {
                              startPage = 1;
                              endPage = maxVisible;
                            } else if (currentPage >= totalPages - 2) {
                              startPage = totalPages - maxVisible + 1;
                              endPage = totalPages;
                            } else {
                              startPage = currentPage - 3;
                              endPage = currentPage + 3;
                            }
                          }

                          // Add first page and ellipsis if needed
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                onClick={() => setCurrentPage(1)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #1976d2',
                                  background: '#fff',
                                  color: '#1976d2',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  minWidth: '40px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                1
                              </button>
                            );
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis1" style={{ padding: '8px 4px', color: '#666' }}>
                                  ...
                                </span>
                              );
                            }
                          }

                          // Add visible page numbers
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #1976d2',
                                  background: currentPage === i ? '#1976d2' : '#fff',
                                  color: currentPage === i ? '#fff' : '#1976d2',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  minWidth: '40px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {i}
                              </button>
                            );
                          }

                          // Add last page and ellipsis if needed
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis2" style={{ padding: '8px 4px', color: '#666' }}>
                                  ...
                                </span>
                              );
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #1976d2',
                                  background: '#fff',
                                  color: '#1976d2',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  minWidth: '40px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {totalPages}
                              </button>
                            );
                          }

                          return pages;
                        })()}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #1976d2',
                          background: currentPage === totalPages ? '#e5e7eb' : '#fff',
                          color: currentPage === totalPages ? '#999' : '#1976d2',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #1976d2',
                          background: currentPage === totalPages ? '#e5e7eb' : '#fff',
                          color: currentPage === totalPages ? '#999' : '#1976d2',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Last page"
                      >
                        »»
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Show search results when there's a search query */}
        {searchQuery && (
          <div className="student-search-grid">
            {searchResults.map(s => (
              <div
                key={s.id}
                className="student-search-result"
                onClick={() => handleStudentClick(s)}
              >
                {s.full_name} ({s.student_id})
              </div>
            ))}
          </div>
        )}
        {/* Fee Statistics Modal */}
        {feeStatsModalOpen && !isReadOnly && (
          <div className="fee-stats-modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(32,64,128,0.13)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto'}}>
            <div className="fee-stats-modal-content" style={{background:'#fff',borderRadius:16,boxShadow:'0 8px 40px rgba(32,64,128,0.18)',padding:'36px 28px 28px 28px',maxWidth:1200,width:'98vw',minWidth:0,position:'relative',marginTop:48,marginBottom:48}}>
              {/* Close button */}
              <button className="fee-stats-modal-close" style={{position:'absolute',top:16,right:22,background:'none',border:'none',color:'#222',fontSize:'1.5rem',fontWeight:200,lineHeight:1,cursor:'pointer',zIndex:1001,padding:'0 6px'}} onClick={()=>setFeeStatsModalOpen(false)} aria-label="Close">&#10005;</button>
              {/* Step 1: Select class */}
              {!proceedClicked && (
                <div className="fee-stats-select-step">
                  <div className="fee-stats-modal-header">
                    <img src={require('../assets/logo.png')} alt="VOTECH Logo" className="fee-stats-modal-logo" />
                    <div>
                      <h2 className="fee-stats-modal-title">Fee Statistics</h2>
                      <div className="fee-stats-modal-desc">View and print fee statistics for any class</div>
                    </div>
                  </div>
                  <label className="fee-stats-modal-label">Select Class</label>
                  <select
                    value={selectedClassName}
                    onChange={e => setSelectedClassName(e.target.value)}
                    className="fee-stats-modal-select"
                  >
                    <option value=''>-- Select Class --</option>
                    {classes.map(cls => <option key={cls.id} value={typeof cls.name === 'string' ? cls.name : ''}>{typeof cls.name === 'string' ? cls.name : 'Unknown Class'}</option>)}
                  </select>
                  <button
                    className="fee-stats-proceed-btn"
                    disabled={!selectedClassName}
                    onClick={()=>setProceedClicked(true)}
                  >
                    Proceed
                  </button>
                </div>
              )}
              {/* Step 2: Show statistics table */}
              {proceedClicked && (
                <div className="fee-stats-table-step">
                  <div className="fee-stats-modal-header">
                    <img src={require('../assets/logo.png')} alt="VOTECH Logo" className="fee-stats-modal-logo" />
                    <div>
                      <h2 className="fee-stats-modal-title">Fee Statistics - {selectedClassName}</h2>
                      <div className="fee-stats-modal-desc">Academic Year: {(() => {const startYear=2025;const now=new Date();const start=new Date('2025-09-01');let diff=(now.getFullYear()-startYear)*12+(now.getMonth()-8);if(diff<0)diff=0;const period=Math.floor(diff/9);const year1=2025+period;const year2=year1+1;return `${year1}/${year2}`;})()}</div>
                    </div>
                  </div>
                  {/* Debug Panel */}
                  <div style={{margin:'8px 0 0 0',textAlign:'right'}}>
                    <button style={{background:'none',border:'none',color:'#1976d2',fontWeight:600,cursor:'pointer',fontSize:14}} onClick={()=>setDebugOpen(v=>!v)}>{debugOpen ? 'Hide' : 'Show'} Debug Info</button>
                  </div>
                  {debugOpen && (
                    <div style={{background:'#f7f8fa',border:'1.5px solid #b0c4de',borderRadius:8,padding:'12px 18px',margin:'10px 0 18px 0',fontSize:13,color:'#333',maxHeight:220,overflow:'auto'}}>
                      <div><b>Selected Class Name:</b> {debugInfo.className}</div>
                      <div><b>Resolved Class ID:</b> {debugInfo.classId}</div>
                      <div><b>Backend Response:</b></div>
                      <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',background:'#f0f4fa',padding:'8px',borderRadius:6,marginTop:4,maxHeight:120,overflow:'auto'}}>{JSON.stringify(debugInfo.backendResponse, null, 2)}</pre>
                    </div>
                  )}
                  {classStatsLoading && <div className="fee-stats-loading">Loading...</div>}
                  {classStatsError && <div className="fee-stats-error">{classStatsError}</div>}
                  {classStats && Array.isArray(classStats) && (
                    <div className="fee-stats-table-wrapper">
                      <table className="fee-stats-table-pro" style={{fontSize:15}}>
                        <thead>
                          <tr>
                            <th>S/N</th>
                            <th>Full Name</th>
                            <th>Student ID</th>
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
                          {(classStats || [])
                            .slice()
                            .sort((a,b)=> (a?.name || '').localeCompare(b?.name || ''))
                            .map((s,idx)=>{
                              return (
                                <tr key={s.name+idx}>
                                  <td>{idx+1}</td>
                                  <td>{typeof s.name === 'string' ? s.name : 'Unknown Student'}</td>
                                  <td>{s.student_id || ''}</td>
                                  <td>{(s.Registration||0).toLocaleString()}</td>
                                  <td>{(s.Bus||0).toLocaleString()}</td>
                                  <td>{(s.Tuition||0).toLocaleString()}</td>
                                  <td>{(s.Internship||0).toLocaleString()}</td>
                                  <td>{(s.Remedial||0).toLocaleString()}</td>
                                  <td>{(s.PTA||0).toLocaleString()}</td>
                                  <td>{(s.Total||0).toLocaleString()}</td>
                                  <td>{(s.Balance||0).toLocaleString()}</td>
                                  <td style={{color:s.Status==='Paid'?'#2ecc71':'#e53e3e',fontWeight:700}}>{s.Status}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      {!isReadOnly && (
                        <div className="fee-stats-modal-actions">
                          <button className="print-button fee-stats-print-btn" onClick={generateFeeReport}>Generate Report</button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Fee Report Modal */}
                  {showFeeReportModal && generatedFeeReport && !isReadOnly && (
                    <div className="fee-report-modal-overlay" onClick={closeFeeReportModal}>
                      <div className="fee-report-modal-content" onClick={e => e.stopPropagation()}>
                        <FeeReport ref={feeReportRef} report={generatedFeeReport} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal/print styles */}
      <style>{`
        .fee-stats-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(32,64,128,0.13); z-index: 2000; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; }
        .fee-stats-modal-content { background: #fff; border-radius: 18px; box-shadow: 0 8px 40px rgba(32,64,128,0.18); padding: 0; max-width: 1200px; width: 98vw; min-width: 0; position: relative; margin-top: 48px; margin-bottom: 48px; overflow: visible; }
        .fee-stats-modal-header { display: flex; align-items: center; gap: 22px; border-radius: 18px 18px 0 0; background: linear-gradient(90deg, #eaf6ff 0%, #f7f8fa 100%); padding: 32px 32px 18px 32px; border-bottom: 1.5px solid #e0eafc; }
        .fee-stats-modal-logo { width: 64px; height: 64px; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(32,64,128,0.07); }
        .fee-stats-modal-title { font-size: 2rem; font-weight: 700; color: #204080; margin: 0; }
        .fee-stats-modal-desc { font-size: 1.1rem; color: #1976d2; margin-top: 4px; }
        .fee-stats-modal-label { font-weight: 600; color: #204080; margin: 32px 0 8px 32px; display: block; font-size: 1.08rem; }
        .fee-stats-modal-select { width: calc(100% - 64px); margin-left: 32px; padding: 12px 16px; border-radius: 7px; border: 1.5px solid #1976d2; font-size: 1.08rem; margin-bottom: 18px; background: #f7f8fa; }
        .fee-stats-proceed-btn { background: #1976d2; color: #fff; border: none; border-radius: 7px; padding: 12px 32px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(32,64,128,0.08); transition: background 0.15s; display: block; margin: 20px 32px 0 auto; }
        .fee-stats-proceed-btn:disabled { background: #b0c4de; cursor: not-allowed; }
        .fee-stats-table-step { padding: 0 0 32px 0; }
        .fee-stats-table-wrapper { width: 100%; overflow-x: auto; padding: 0 32px; }
        .fee-stats-table-pro { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(32,64,128,0.07); min-width: 1100px; }
        .fee-stats-table-pro th, .fee-stats-table-pro td { padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 1.05rem; }
        .fee-stats-table-pro th { background: #1976d2; color: #fff; font-weight: 700; position: sticky; top: 0; z-index: 2; }
        .fee-stats-table-pro tr:last-child td { border-bottom: none; }
        .fee-stats-modal-actions { display: flex; justify-content: flex-end; gap: 18px; margin: 24px 32px 0 0; }
        .fee-stats-print-btn { background: #204080; color: #fff; border: none; border-radius: 7px; padding: 12px 32px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(32,64,128,0.08); transition: background 0.15s; }
        .fee-stats-print-btn:hover { background:rgb(35, 46, 150); }
        .fee-stats-modal-close { position: absolute; top: 18px; right: 28px; background: none; border: none; color: #222; font-size: 1.7rem; font-weight: 200; line-height: 1; cursor: pointer; z-index: 1001; padding: 0 6px; }
        .fee-stats-modal-close:hover { color: #1976d2; }
        .fee-stats-loading { color: #888; margin: 18px 0; text-align: center; font-size: 1.1rem; }
        .fee-stats-error { color: #e53e3e; margin: 18px 0; text-align: center; font-size: 1.1rem; }
        @media (max-width: 900px) { .fee-stats-modal-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 24px 12px 12px 12px; } .fee-stats-modal-label, .fee-stats-modal-select { margin-left: 12px; width: calc(100% - 24px); } .fee-stats-table-wrapper { padding: 0 8px; } }
        @media (max-width: 600px) { .fee-stats-modal-content { max-width: 99vw; padding: 0; } .fee-stats-modal-header { padding: 16px 4px 8px 4px; } .fee-stats-modal-label, .fee-stats-modal-select { margin-left: 4px; width: calc(100% - 8px); } .fee-stats-table-pro th, .fee-stats-table-pro td { padding: 8px 4px; font-size: 0.98rem; } }
        @media print { @page { size: A4 landscape; margin: 10mm; } body, html { background: white !important; } .fee-stats-modal-overlay, .fee-stats-modal-content, .sidebar, .admin-header, .fee-main-content > *:not(.stats-print-area), .print-button, .fee-stats-modal-close { display: none !important; } .stats-print-area { display: block !important; width: 100vw !important; margin: 0 !important; padding: 0 !important; } }
                 @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
         
         /* Payment Modal Styles */
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
         .text-select:focus, .text-input:focus {
           outline: none;
           border-color: rgb(46, 44, 153);
         }
         
         /* Transaction History Modal Styles */
         .transaction-history-modal-overlay {
           position: fixed;
           top: 0; left: 0; right: 0; bottom: 0;
           background: rgba(32,64,128,0.13);
           z-index: 1000;
           display: flex;
           align-items: center;
           justify-content: center;
         }
         .transaction-history-modal-content {
           background: #fff;
           border-radius: 16px;
           box-shadow: 0 8px 40px rgba(32,64,128,0.18);
           padding: 36px 28px 28px 28px;
           max-width: 800px;
           width: 98vw;
           min-width: 0;
           position: relative;
           max-height: 80vh;
           overflow-y: auto;
         }
         
         /* Discount Modal Styles */
         .discount-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(32,64,128,0.13); z-index: 1100; display: flex; align-items: center; justify-content: center; }
         .discount-modal-content { background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(32,64,128,0.18); padding: 28px; width: 96vw; max-width: 420px; position: relative; text-align: center; }
       `}</style>
      
             {/* Payment Modal */}
       {paymentModalOpen && selectedStudent && !isReadOnly && (
         <div className="student-fee-modal-overlay" onClick={e => e.stopPropagation()}>
           <div className="student-fee-modal-content" onClick={e => e.stopPropagation()}>
             <button 
               className="text-button close-btn black-x always-visible" 
               onClick={handleClosePaymentModal} 
               style={{
                 position: 'absolute',
                 top: 10,
                 right: 20,
                 zIndex: 10000,
                 color: '#111',
                 background: 'none',
                 border: 'none',
                 fontSize: '24px',
                 cursor: 'pointer'
               }} 
               aria-label="Close"
             >
               &#10005;
             </button>
             <h2>Edit Fee Payment</h2>
             <p style={{ marginBottom: '20px', color: '#666' }}>
               Student: <strong>{selectedStudent.full_name}</strong>
             </p>
             <form onSubmit={handlePaymentSubmit}>
               <label>Fee Type</label>
               <select 
                 value={payType} 
                 onChange={async e => {
                   const selected = e.target.value;
                   setPayType(selected);
                   // Refresh stats for accurate prefill if the user edited before
                   if (selected && selectedStudent) {
                     try {
                       const refreshed = await api.getStudentFeeStats(selectedStudent.id);
                       setStudentFeeDetails(prev => ({ ...prev, [selectedStudent.id]: refreshed }));
                     } catch {}
                     const alreadyPaid = getAlreadyPaidForType(selectedStudent.id, selected);
                     setPayAmount(alreadyPaid ? String(alreadyPaid) : '');
                   }
                 }} 
                 required 
                 className="text-select"
                 style={{
                   background: 'none',
                   border: '1.5px solid #204080',
                   borderRadius: '7px',
                   fontSize: '1.08rem',
                   padding: '10px 12px',
                   marginBottom: '18px',
                   width: '100%',
                   color: '#204080'
                 }}
               >
                 <option value="">Select Fee Type</option>
                 {['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'].map(type => (
                   <option key={type} value={type}>
                     {type}
                   </option>
                 ))}
               </select>
               <label>Amount to Pay/Edit (XAF)</label>
               <input 
                 type="number" 
                 min="0" 
                 step="0.01"
                 value={payAmount} 
                 onChange={e => setPayAmount(e.target.value)} 
                 className="text-input" 
                 required 
                 placeholder="Enter amount"
                 style={{
                   background: 'none',
                   border: '1.5px solid #204080',
                   borderRadius: '7px',
                   fontSize: '1.08rem',
                   padding: '10px 12px',
                   marginBottom: '18px',
                   width: '100%',
                   color: '#204080'
                 }}
               />
               <button 
                 type="submit" 
                 className="text-button no-hover" 
                 disabled={!payType || !payAmount}
                 style={{
                   background: '#1976d2',
                   color: '#fff',
                   border: 'none',
                   borderRadius: '7px',
                   padding: '12px 32px',
                   fontSize: '1.1rem',
                   fontWeight: '700',
                   cursor: 'pointer',
                   width: '100%'
                 }}
               >
                 Update Fee
               </button>
             </form>
           </div>
         </div>
       )}

       {/* Receipt Modal */}
       {receiptModalOpen && receiptData && !isReadOnly && (
         <div className="fee-receipt-modal-overlay">
           <div className="fee-receipt-modal-content">
             <button 
               className="text-button close-btn black-x always-visible" 
               onClick={() => setReceiptModalOpen(false)} 
               style={{
                 position: 'absolute',
                 top: 10,
                 right: 20,
                 zIndex: 10000,
                 color: '#111',
                 background: 'none',
                 border: 'none',
                 fontSize: '24px',
                 cursor: 'pointer'
               }} 
               aria-label="Close"
             >
               &#10005;
             </button>
             <div className="print-area">
               <FeeReceipt ref={receiptRef} receipt={receiptData} currentPayment={receiptData.currentPayment} />
             </div>
           </div>
         </div>
       )}

       {/* Transaction History Modal */}
       {showTransactionHistory && selectedStudentForHistory && (
         <div className="transaction-history-modal-overlay" onClick={() => setShowTransactionHistory(false)}>
           <div className="transaction-history-modal-content" onClick={e => e.stopPropagation()}>
             <button 
               className="text-button close-btn black-x always-visible" 
               onClick={() => setShowTransactionHistory(false)} 
               style={{
                 position: 'absolute',
                 top: 10,
                 right: 20,
                 zIndex: 10000,
                 color: '#111',
                 background: 'none',
                 border: 'none',
                 fontSize: '24px',
                 cursor: 'pointer'
               }} 
               aria-label="Close"
             >
               &#10005;
             </button>
             <h2>Transaction History</h2>
             <p style={{ marginBottom: '20px', color: '#666' }}>
               Student: <strong>{selectedStudentForHistory.full_name}</strong> ({selectedStudentForHistory.student_id})
             </p>
             
             {transactionHistory.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                 <p>No transactions found for this student.</p>
               </div>
             ) : (
               <div style={{ 
                 background: '#fff', 
                 borderRadius: 12, 
                 boxShadow: '0 2px 12px rgba(0,0,0,0.1)', 
                 overflow: 'hidden',
                 marginBottom: 24
               }}>
                 <div style={{ overflowX: 'auto' }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                     <thead>
                       <tr style={{ background: '#204080', color: '#fff' }}>
                         <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Date</th>
                         <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Fee Type</th>
                         <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Amount (XAF)</th>
                         <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {transactionHistory.map((transaction, index) => (
                         <tr key={transaction.id} style={{ 
                           borderBottom: '1px solid #e5e7eb',
                           background: index % 2 === 0 ? '#fff' : '#f9fafb'
                         }}>
                           <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                             {new Date(transaction.paid_at).toLocaleDateString()}
                           </td>
                           <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px' }}>
                             {transaction.fee_type}
                           </td>
                           <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#2ecc71' }}>
                             {parseFloat(transaction.amount).toLocaleString()}
                           </td>
                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                             <button
                               onClick={() => {
                                 handleGenerateReceiptForPayment(selectedStudentForHistory, transaction);
                                 setShowTransactionHistory(false);
                               }}
                               style={{
                                 background: '#17a2b8',
                                 color: '#fff',
                                 border: 'none',
                                 borderRadius: '4px',
                                 padding: '6px 12px',
                                 fontSize: '12px',
                                 cursor: 'pointer',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '4px'
                               }}
                               title="Generate Receipt for this Payment"
                             >
                               <FaDownload size={12} />
                               Receipt
                             </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
           </div>
         </div>
       )}
 
       {/* Discount Modal */}
       {discountModalOpen && !isReadOnly && (
         <div className="discount-modal-overlay" onClick={() => setDiscountModalOpen(false)}>
           <div className="discount-modal-content" onClick={e => e.stopPropagation()}>
             <button 
               className="text-button close-btn black-x always-visible" 
               onClick={() => setDiscountModalOpen(false)} 
               style={{ position: 'absolute', top: 10, right: 20, zIndex: 10000, color: '#111', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
               aria-label="Close"
             >
               &#10005;
             </button>
             <h2 style={{ marginTop: 4, marginBottom: 12 }}>Set Discount</h2>
             <p style={{ color: '#666', marginBottom: 16 }}>Choose a discount rate to apply to selected students.</p>
             <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
               {[5,10,15,20,25,30].map(p => (
                 <button key={p} onClick={() => setDiscountRate(p)} style={{ border: '1px solid #1976d2', background: '#eaf6ff', color: '#204080', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>{p}%</button>
               ))}
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
               <input
                 type="number"
                 min="0"
                 max="100"
                 step="0.01"
                 value={discountRate}
                 onChange={e => {
                   const v = parseFloat(e.target.value);
                   setDiscountRate(isNaN(v) ? 0 : Math.max(0, Math.min(100, v)));
                 }}
                 style={{ width: 120, textAlign: 'right', border: '1.5px solid #204080', borderRadius: 7, padding: '8px 10px', fontSize: 16, color: '#204080' }}
               />
               <span style={{ fontWeight: 700, color: '#204080' }}>%</span>
             </div>
             <div style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>Current rate will affect Total Expected and Balance for checked students.</div>
             <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
               <button onClick={() => { setDiscountModalOpen(false); setSuccessMessage(`Discount rate set to ${parseFloat(discountRate) || 0}%`); setTimeout(()=>setSuccessMessage(''), 3000); }} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
               <button onClick={() => { setDiscountRate(0); setSuccessMessage('Discount rate cleared'); setTimeout(()=>setSuccessMessage(''), 3000); }} style={{ background: '#eee', color: '#333', border: '1px solid #ddd', borderRadius: 7, padding: '10px 18px', cursor: 'pointer' }}>Clear Rate</button>
             </div>
           </div>
         </div>
       )}
     </SideTop>
   );
 } 