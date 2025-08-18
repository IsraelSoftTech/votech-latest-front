import React, { useEffect, useState } from 'react';
import SideTop from './SideTop';
import './Fee.css';
import './FeeReceipt.css';
import './FeeReport.css';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import FeeReport from './FeeReport';
import FeeReceipt from './FeeReceipt';
import { FaEdit, FaTrash, FaMoneyBillWave, FaEye, FaDownload } from 'react-icons/fa';

export default function Fee() {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
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
  
  // Receipt modal state
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = React.useRef();

  // New state for fee management table
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentFeeDetails, setStudentFeeDetails] = useState({});
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // Fetch students and their fee details
  useEffect(() => {
    const fetchStudentsAndFees = async () => {
      try {
        setStudentsLoading(true);
        const studentsData = await api.getStudents();
        const classesData = await api.getClasses();
      
      setStudents(studentsData);
        setClasses(classesData);
        setFilteredStudents(studentsData);
      
        // Fetch fee details for all students
        const feeDetailsPromises = studentsData.map(async (student) => {
          try {
            const feeStats = await api.getStudentFeeStats(student.id);
            return { studentId: student.id, feeStats };
          } catch (error) {
            console.error(`Error fetching fee stats for student ${student.id}:`, error);
            return { studentId: student.id, feeStats: null };
          }
        });
        
        const feeDetailsResults = await Promise.all(feeDetailsPromises);
        const feeDetailsMap = {};
        feeDetailsResults.forEach(({ studentId, feeStats }) => {
          feeDetailsMap[studentId] = feeStats;
        });
        
        setStudentFeeDetails(feeDetailsMap);
    } catch (error) {
        console.error('Error fetching students and fees:', error);
        setStudents([]);
        setFilteredStudents([]);
    } finally {
        setStudentsLoading(false);
      }
    };
    
    fetchStudentsAndFees();
  }, []);

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
  }, [students, searchQuery, selectedClassFilter]);

  // Calculate student fee statistics
  const getStudentFeeStats = (studentId) => {
    const feeStats = studentFeeDetails[studentId];
    if (!feeStats) return null;
    
    const feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
    let totalExpected = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    
    feeTypes.forEach(type => {
      const expected = feeStats.balance?.[type] || 0;
      const paid = feeStats.paid?.[type] || 0;
      totalExpected += expected;
      totalPaid += paid;
      totalBalance += (expected - paid);
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

  // Handle edit student
  const handleEditStudent = (student) => {
    navigate(`/admin-student?edit=${student.id}`);
  };

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.full_name}? This action cannot be undone.`)) {
      try {
        await api.deleteStudent(student.id);
        // Refresh the students list
        const updatedStudents = students.filter(s => s.id !== student.id);
        setStudents(updatedStudents);
        setFilteredStudents(updatedStudents);
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student. Please try again.');
      }
    }
  };

  // Handle generate receipt
  const handleGenerateReceipt = async (student) => {
    try {
      const stats = await api.getStudentFeeStats(student.id);
      if (stats && stats.student && stats.balance) {
        setReceiptData({
          student: stats.student,
          balance: stats.balance
        });
        setReceiptModalOpen(true);
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt.');
    }
  };

  // Fetch and aggregate total paid/owed
  useEffect(() => {
    async function fetchTotals() {
      setLoadingTotals(true);
      try {
        const students = await api.getStudents();
        const classes = await api.getClasses();
        // Build a map of classId -> class total_fee
        const classMap = {};
        classes.forEach(cls => {
          classMap[cls.id] = parseFloat(cls.total_fee) || 0;
        });
        let paidSum = 0;
        let overallFee = 0;
        // Fetch all student fee stats in parallel
        const feeStatsArr = await Promise.all(students.map(async student => {
          try {
            const stats = await api.getStudentFeeStats(student.id);
            return { student, stats };
          } catch (e) {
            return { student, stats: null };
          }
        }));
        for (const { student, stats } of feeStatsArr) {
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
    }
    fetchTotals();
  }, []);

  // Fetch classes on mount for modal
  useEffect(() => {
    if (feeStatsModalOpen && classes.length === 0) {
      api.getClasses().then(setClasses).catch(() => setClasses([]));
    }
  }, [feeStatsModalOpen, classes.length]);

  // Fetch class stats when proceed is clicked
  useEffect(() => {
    if (proceedClicked && selectedClassName) {
      setClassStatsLoading(true);
      setClassStatsError('');
      // Find class_id by class name
      const foundClass = classes.find(c => c.name === selectedClassName);
      setDebugInfo(d => ({ ...d, className: selectedClassName, classId: foundClass ? foundClass.id : '' }));
      if (!foundClass) {
        setClassStatsError('Class not found.');
        setClassStatsLoading(false);
        setDebugInfo(d => ({ ...d, backendResponse: null }));
        return;
      }
      api.getClassFeeStats(foundClass.id)
        .then(data => {
          setClassStats(data);
          setClassStatsLoading(false);
          setDebugInfo(d => ({ ...d, backendResponse: data }));
        })
        .catch((err) => {
          setClassStatsError('Failed to fetch class fee statistics.');
          setClassStatsLoading(false);
          setDebugInfo(d => ({ ...d, backendResponse: err && err.message ? err.message : String(err) }));
        });
    }
  }, [proceedClicked, selectedClassName, classes]);

  // Generate fee report
  const generateFeeReport = () => {
    if (!classStats || !Array.isArray(classStats)) {
      console.error('No class stats available');
      return;
    }

    // Calculate totals
    const totalStudents = classStats.length;
    const totalExpected = classStats.reduce((sum, student) => {
      const expected = (student.Registration || 0) + (student.Bus || 0) + (student.Tuition || 0) + 
                      (student.Internship || 0) + (student.Remedial || 0) + (student.PTA || 0);
      return sum + expected;
    }, 0);
    
    const totalPaid = classStats.reduce((sum, student) => sum + (student.Total || 0), 0);
    const totalOwed = classStats.reduce((sum, student) => sum + (student.Balance || 0), 0);
    const paymentRate = totalExpected > 0 ? totalPaid / totalExpected : 0;

    // Process students data
    const students = classStats.map(student => {
      const expectedFees = (student.Registration || 0) + (student.Bus || 0) + (student.Tuition || 0) + 
                          (student.Internship || 0) + (student.Remedial || 0) + (student.PTA || 0);
      const paidFees = student.Total || 0;
      const owedFees = student.Balance || 0;
      
      let paymentStatus = 'uncompleted';
      if (owedFees === 0) paymentStatus = 'completed';
      else if (paidFees > 0) paymentStatus = 'partial';
      
      return {
        id: student.student_id || Math.random().toString(),
        student_id: student.student_id || 'N/A',
        full_name: student.name,
        expectedFees,
        paidFees,
        owedFees,
        paymentStatus
      };
    });

    // Calculate fee breakdown by type
    const feeTypes = ['Registration', 'Bus', 'Tuition', 'Internship', 'Remedial', 'PTA'];
    const feeBreakdown = feeTypes.map(type => {
      const expected = classStats.reduce((sum, student) => sum + (student[type] || 0), 0);
      const paid = classStats.reduce((sum, student) => {
        const studentPaid = student.Total || 0;
        const studentExpected = (student.Registration || 0) + (student.Bus || 0) + (student.Tuition || 0) + 
                               (student.Internship || 0) + (student.Remedial || 0) + (student.PTA || 0);
        const ratio = studentExpected > 0 ? studentPaid / studentExpected : 0;
        return sum + ((student[type] || 0) * ratio);
      }, 0);
      const owed = expected - paid;
      const paymentRate = expected > 0 ? paid / expected : 0;
      
      return {
        type,
        expected,
        paid,
        owed,
        paymentRate
      };
    });

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

  // Close payment modal and open receipt modal
  const handlePaymentSubmit = () => {
    setPaymentModalOpen(false);
    setReceiptModalOpen(true);
  };

  return (
    <SideTop>
      <div className="fee-main-content">
        <div className="fee-header">
          <h2>Fee Payment</h2>
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
          <span
            className="fee-stats-btn-text"
            style={{ color: '#1976d2', fontWeight: 600, fontSize: 17, cursor: 'pointer', userSelect: 'none', borderBottom: '1.5px dashed #1976d2' }}
            onClick={() => { setFeeStatsModalOpen(true); setProceedClicked(false); setSelectedClassId(''); setClassStats(null); }}
          >
            Fee Statistics
          </span>
        </div>
        {searchLoading && <div style={{ textAlign: 'center', color: '#888', marginTop: 12 }}>Searching...</div>}
        {searchError && <div style={{ textAlign: 'center', color: '#e53e3e', marginTop: 12 }}>{searchError}</div>}
        
        {/* Fee Management Table */}
        <div style={{ marginTop: 32 }}>
          <h3 style={{ color: '#204080', marginBottom: 16, fontSize: '1.2rem' }}>
            Student Fee Management ({filteredStudents.length} students)
          </h3>
          
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
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                    <tr style={{ background: '#204080', color: '#fff' }}>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Student</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Class</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Total Expected</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Total Paid</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Balance</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                    {filteredStudents.map((student, index) => {
                      const feeStats = getStudentFeeStats(student.id);
                      const status = getStudentStatus(student.id);
                  
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
                              {status === 'Completed' && (
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
                              <button
                                onClick={() => handleEditStudent(student)}
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
                                title="Edit Student"
                              >
                                <FaEdit size={12} />
                          </button>
                          <button
                                onClick={() => handleDeleteStudent(student)}
                                style={{
                                  background: '#dc3545',
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
                                title="Delete Student"
                              >
                                <FaTrash size={12} />
                          </button>
                            </div>
                        </td>
                    </tr>
                  );
                    })}
              </tbody>
            </table>
              </div>
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
        {feeStatsModalOpen && (
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
                          {classStats
                            .slice()
                            .sort((a,b)=>a.name.localeCompare(b.name))
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
                      <div className="fee-stats-modal-actions">
                        <button className="print-button fee-stats-print-btn" onClick={generateFeeReport}>Generate Report</button>
                      </div>
                    </div>
                  )}
                  
                  {/* Fee Report Modal */}
                  {showFeeReportModal && generatedFeeReport && (
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
      `}</style>
      
      {/* Receipt Modal */}
      {receiptModalOpen && receiptData && (
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
              <FeeReceipt ref={receiptRef} receipt={receiptData} />
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 