import React, { useState, useEffect } from 'react';
import './UserFee.css';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import logo from '../assets/logo.png';
import { 
  MdDashboard, MdLogout, MdPeople, MdSchool, MdWork, MdPerson, 
  MdAttachMoney, MdCreditCard, MdSearch, MdPrint, MdAdd, MdClose,
  MdReceipt, MdCheckCircle, MdWarning, MdInfo, MdMenu, MdLock
} from 'react-icons/md';
import ApiService from '../services/api';
import { useYear } from '../context/YearContext';

const FEE_TYPES = [
  'Registration',
  'Tuition',
  'Vocational',
  'Sport Wear',
  'Sanitation & Health'
];

function UserFee() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear, setSelectedYear, years, loading: yearLoading } = useYear();

  // State
  const [userRole, setUserRole] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [studentFees, setStudentFees] = useState(null);
  const [parentStudents, setParentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get user info and role on mount
  useEffect(() => {
    const authUser = sessionStorage.getItem('authUser');
    if (authUser) {
      const user = JSON.parse(authUser);
      setUserRole(user.role);
      setUserInfo(user);
      
      // Fetch data based on role
      if (user.role === 'student') {
        fetchStudentFees(user.id);
      } else if (user.role === 'parent') {
        fetchParentStudents(user.id);
      } else if (user.role === 'teacher') {
        // Teachers don't have fee information, but we'll show a message
        setLoading(false);
      }
    }
  }, [selectedYear]);

  // Fetch student's own fees
  const fetchStudentFees = async (userId) => {
    try {
      setLoading(true);
      // First get the student record for this user
      const students = await ApiService.getStudents(selectedYear);
      const studentRecord = students.find(s => s.user_id === userId);
      
      if (studentRecord) {
        const data = await ApiService.getStudentFees(studentRecord.id, selectedYear);
        setStudentFees(data);
      } else {
        setError('No student record found for this account');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch parent's students
  const fetchParentStudents = async (userId) => {
    try {
      setLoading(true);
      const students = await ApiService.getStudents(selectedYear);
      const parentStudents = students.filter(s => s.user_id === userId);
      setParentStudents(parentStudents);
      
      // Fetch fees for each student
      const studentsWithFees = await Promise.all(
        parentStudents.map(async (student) => {
          try {
            const fees = await ApiService.getStudentFees(student.id, selectedYear);
            return { ...student, fees };
          } catch (err) {
            console.error(`Error fetching fees for student ${student.id}:`, err);
            return { ...student, fees: null };
          }
        })
      );
      setParentStudents(studentsWithFees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get fee amount for selected type
  const getFeeAmount = (feeType, studentData) => {
    if (!studentData) return 0;
    
    const feeMap = {
      'Registration': Number(studentData.registration_fee) || 0,
      'Tuition': Number(studentData.tuition_fee) || 0,
      'Vocational': Number(studentData.vocational_fee) || 0,
      'Sport Wear': Number(studentData.sport_wear_fee) || 0,
      'Sanitation & Health': Number(studentData.health_sanitation_fee) || 0
    };
    
    return feeMap[feeType] || 0;
  };

  // Calculate total fees and balance for a student
  const calculateStudentTotals = (studentData, balanceData) => {
    if (!studentData || !balanceData) return { totalFees: 0, totalBalance: 0, totalPaid: 0 };
    
    const totalFees = FEE_TYPES.reduce((sum, type) => {
      const feeAmount = getFeeAmount(type, studentData);
      return sum + feeAmount;
    }, 0);
    
    const totalBalance = Object.values(balanceData).reduce((sum, balance) => {
      return sum + Number(balance || 0);
    }, 0);
    
    const totalPaid = totalFees - totalBalance;
    
    return { totalFees, totalBalance, totalPaid };
  };

  return (
    <div className="userfee-dashboard-container">
      {/* Hamburger menu for mobile */}
      <button className="userfee-hamburger-menu" onClick={() => setSidebarOpen(true)}>
        <MdMenu />
      </button>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="userfee-sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
      {/* Sidebar */}
      <div className={`userfee-sidebar${sidebarOpen ? ' open' : ''}`}>  
        <div className="userfee-logo-section">
          <img src={logo} alt="MPASAT Logo" className="userfee-logo" />
          <h1>MPASAT</h1>
          <button className="userfee-sidebar-close" onClick={() => setSidebarOpen(false)}>
            <MdClose />
          </button>
        </div>
        <div className="userfee-nav-item" onClick={() => navigateWithLoader('/user-dashboard')}>
          <MdDashboard className="userfee-nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="userfee-nav-item" onClick={() => navigateWithLoader('/user-registration')}>
          <MdPeople className="userfee-nav-icon" />
          <span>Register</span>
        </div>
        <div className="userfee-nav-item active">
          <MdReceipt className="userfee-nav-icon" />
          <span>My Fees</span>
        </div>
        <div className="userfee-nav-item" onClick={() => regularNavigate('/')}> 
          <MdLogout className="userfee-nav-icon" />
          <span>Logout</span>
        </div>
      </div>
      {/* Main Content */}
      <div className="userfee-main-content">
        {/* Year Switcher Dropdown */}
        <div style={{ position: 'absolute', top: 30, right: 100, zIndex: 11 }}>
          <select
            value={selectedYear || ''}
            onChange={e => setSelectedYear(Number(e.target.value))}
            disabled={yearLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #14296a',
              fontWeight: 600,
              fontSize: 16,
              background: '#fff',
              color: '#14296a',
              minWidth: 90,
              outline: 'none',
              cursor: yearLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(20,41,106,0.08)'
            }}
          >
            <option value="" disabled>Select Year</option>
            {years && years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {/* Profile circle positioned at top right */}
        <div className="userfee-user-avatar">
          {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="userfee-dashboard-content">
          <div className="userfee-header">
            <h1>My Fee Statistics</h1>
          </div>
          
          {/* Loading and Error States */}
          {loading && <div className="userfee-loading">Loading fee information...</div>}
          {error && <div className="userfee-error"><MdWarning /> {error}</div>}

          {/* Student Fee Statistics */}
          {userRole === 'student' && studentFees && (
            <div className="userfee-details-card">
              <div className="userfee-student-info">
                <h3><MdInfo /> My Fee Information</h3>
                <div className="userfee-info-grid">
                  <div><strong>Name:</strong> {studentFees.student.full_name}</div>
                  <div><strong>Class:</strong> {studentFees.student.class_name}</div>
                </div>
              </div>
              
              <div className="userfee-balance-section">
                <h3><MdAttachMoney /> My Fee Balance</h3>
                <div className="userfee-balance-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Fee Type</th>
                        <th>Total Amount</th>
                        <th>Amount Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(studentFees.balance).map(([type, balance]) => {
                        const totalAmount = getFeeAmount(type, studentFees.student);
                        const amountPaid = totalAmount - Number(balance);
                        const status = balance <= 0 ? 'Completed' : 'Owing';
                        return (
                          <tr key={type} className={status === 'Completed' ? 'userfee-completed-row' : 'userfee-owing-row'}>
                            <td>{type}</td>
                            <td>XAF{totalAmount.toLocaleString()}</td>
                            <td>XAF{amountPaid.toLocaleString()}</td>
                            <td>XAF{Number(balance).toLocaleString()}</td>
                            <td>
                              <span className={`userfee-status-badge ${status.toLowerCase()}`}>
                                {status === 'Completed' ? <MdCheckCircle /> : <MdWarning />}
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary */}
                {(() => {
                  const { totalFees, totalBalance, totalPaid } = calculateStudentTotals(studentFees.student, studentFees.balance);
                  return (
                    <div className="userfee-summary">
                      <div className="userfee-summary-item">
                        <span>Total Fees:</span>
                        <span>XAF{totalFees.toLocaleString()}</span>
                      </div>
                      <div className="userfee-summary-item">
                        <span>Total Paid:</span>
                        <span>XAF{totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="userfee-summary-item">
                        <span>Total Balance:</span>
                        <span>XAF{totalBalance.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
                
                <button className="userfee-pay-fee-btn disabled" disabled>
                  <MdLock /> Pay Fees (Contact Admin)
                </button>
              </div>
            </div>
          )}

          {/* Parent Fee Statistics */}
          {userRole === 'parent' && parentStudents.length > 0 && (
            <div className="userfee-details-card">
              <div className="userfee-parent-info">
                <h3><MdInfo /> My Children's Fee Information</h3>
                <div className="userfee-info-grid">
                  <div><strong>Parent:</strong> {userInfo?.username || 'N/A'}</div>
                  <div><strong>Children Count:</strong> {parentStudents.length}</div>
                </div>
              </div>
              
              <div className="userfee-balance-section">
                <h3><MdAttachMoney /> Children's Fee Balance</h3>
                
                {parentStudents.map((student, index) => (
                  <div key={student.id} className="userfee-student-fee-section">
                    <h4>{student.full_name} - {student.class_name}</h4>
                    {student.fees ? (
                      <>
                        <div className="userfee-balance-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Fee Type</th>
                                <th>Total Amount</th>
                                <th>Amount Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(student.fees.balance).map(([type, balance]) => {
                                const totalAmount = getFeeAmount(type, student.fees.student);
                                const amountPaid = totalAmount - Number(balance);
                                const status = balance <= 0 ? 'Completed' : 'Owing';
                                return (
                                  <tr key={type} className={status === 'Completed' ? 'userfee-completed-row' : 'userfee-owing-row'}>
                                    <td>{type}</td>
                                    <td>XAF{totalAmount.toLocaleString()}</td>
                                    <td>XAF{amountPaid.toLocaleString()}</td>
                                    <td>XAF{Number(balance).toLocaleString()}</td>
                                    <td>
                                      <span className={`userfee-status-badge ${status.toLowerCase()}`}>
                                        {status === 'Completed' ? <MdCheckCircle /> : <MdWarning />}
                                        {status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Summary for this student */}
                        {(() => {
                          const { totalFees, totalBalance, totalPaid } = calculateStudentTotals(student.fees.student, student.fees.balance);
                          return (
                            <div className="userfee-summary">
                              <div className="userfee-summary-item">
                                <span>Total Fees:</span>
                                <span>XAF{totalFees.toLocaleString()}</span>
                              </div>
                              <div className="userfee-summary-item">
                                <span>Total Paid:</span>
                                <span>XAF{totalPaid.toLocaleString()}</span>
                              </div>
                              <div className="userfee-summary-item">
                                <span>Total Balance:</span>
                                <span>XAF{totalBalance.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="userfee-error">Unable to load fee information for this student</div>
                    )}
                  </div>
                ))}
                
                <button className="userfee-pay-fee-btn disabled" disabled>
                  <MdLock /> Pay Fees (Contact Admin)
                </button>
              </div>
            </div>
          )}

          {/* No students found for parent */}
          {userRole === 'parent' && !loading && parentStudents.length === 0 && (
            <div className="userfee-no-data">
              <MdInfo />
              <h3>No Students Found</h3>
              <p>You haven't registered any students yet. Please contact the administrator to register your children.</p>
            </div>
          )}

          {/* Teacher Fee Statistics */}
          {userRole === 'teacher' && (
            <div className="userfee-details-card">
              <div className="userfee-teacher-info">
                <h3><MdInfo /> Teacher Fee Information</h3>
                <div className="userfee-info-grid">
                  <div><strong>Teacher:</strong> {userInfo?.username || 'N/A'}</div>
                  <div><strong>Role:</strong> Teacher</div>
                </div>
              </div>
              
              <div className="userfee-balance-section">
                <h3><MdAttachMoney /> Fee Information</h3>
                <div className="userfee-no-data">
                  <MdInfo />
                  <h3>No Fee Information Available</h3>
                  <p>Teachers do not have fee information in the system. Please contact the administrator if you have any questions.</p>
                </div>
                
                <button className="userfee-pay-fee-btn disabled" disabled>
                  <MdLock /> Pay Fees (Contact Admin)
                </button>
              </div>
            </div>
          )}

          {/* No student record found */}
          {userRole === 'student' && !loading && !studentFees && (
            <div className="userfee-no-data">
              <MdInfo />
              <h3>No Student Record Found</h3>
              <p>No student record was found for your account. Please contact the administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserFee; 