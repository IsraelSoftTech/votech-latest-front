import React, { useState, useRef, useEffect } from 'react';
import './Fees.css';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import logo from '../assets/logo.png';
import { 
  MdDashboard, MdLogout, MdPeople, MdSchool, MdWork, MdPerson, 
  MdAttachMoney, MdCreditCard, MdSearch, MdPrint, MdAdd, MdClose,
  MdReceipt, MdCheckCircle, MdWarning, MdInfo, MdMenu
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

function Fees() {
  const regularNavigate = useNavigate();
  const { navigateWithLoader } = useNavigation();
  const { selectedYear } = useYear();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFees, setStudentFees] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payType, setPayType] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showNoStudentsModal, setShowNoStudentsModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [printStats, setPrintStats] = useState([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await ApiService.getClasses();
        setClasses(classesData);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    fetchClasses();
  }, []);

  // Auto-suggest students with debouncing
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const students = await ApiService.getStudents(selectedYear);
        const filtered = students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      } catch (error) {
        console.error('Error searching students:', error);
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedYear]);

  // Select student
  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchTerm(student.full_name);
    setSuggestions([]);
    setShowDropdown(false);
    setLoading(true);
    setError('');
    
    try {
      const data = await ApiService.getStudentFees(student.id, selectedYear);
      setStudentFees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pay Fee
  const openPayModal = () => {
    setPayType('');
    setPayAmount('');
    setPaySuccess('');
    setShowPayModal(true);
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setPayType('');
    setPayAmount('');
    setPaySuccess('');
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payType || !payAmount || isNaN(payAmount) || payAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setPayLoading(true);
    setPaySuccess('');
    setError('');

    try {
      await ApiService.payFee({
        student_id: selectedStudent.id,
        class_id: studentFees.student.class_id,
        fee_type: payType,
        amount: parseFloat(payAmount),
        paid_at: payDate
      });

      // Generate receipt data
      const receipt = {
        studentName: selectedStudent.full_name,
        className: studentFees.student.class_name,
        feeType: payType,
        amount: parseFloat(payAmount),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        receiptNumber: `RCP-${Date.now()}`
      };
      setReceiptData(receipt);
      setPaySuccess('Payment successful! Receipt generated.');
      
      // Refresh balance
      const data = await ApiService.getStudentFees(selectedStudent.id, selectedYear);
      setStudentFees(data);
      
      // Close pay modal and show receipt
      setTimeout(() => {
        closePayModal();
        setShowReceipt(true);
      }, 1500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Print Receipt
  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    
    // Calculate totals for the printed receipt
    const totalFees = getFeeAmount('Registration') + getFeeAmount('Tuition') + getFeeAmount('Vocational') + getFeeAmount('Sport Wear') + getFeeAmount('Sanitation & Health');
    const totalBalance = Object.values(studentFees?.balance || {}).reduce((a, b) => a + Number(b || 0), 0);
    const totalPaid = Math.max(0, totalFees - totalBalance);
    const totalFeeLeft = Object.values(studentFees?.balance || {}).reduce((a, b) => a + Number(b || 0), 0);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${receiptData.studentName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .receipt { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #14296a; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { color: #14296a; margin: 0 0 5px 0; font-size: 24px; }
            .header h2 { color: #333; margin: 0 0 10px 0; font-size: 18px; }
            .receipt-number { font-size: 12px; color: #666; background: #f8f9fa; padding: 5px 10px; border-radius: 4px; display: inline-block; }
            .details { margin: 25px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-row span:first-child { font-weight: 600; color: #333; }
            .detail-row span:last-child { color: #14296a; font-weight: 500; }
            .total { border-top: 2px solid #14296a; padding-top: 15px; margin-top: 20px; }
            .total .detail-row { font-weight: bold; font-size: 16px; color: #14296a; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .footer p { margin: 5px 0; color: #666; }
            .footer small { color: #999; font-size: 11px; }
            .amount-highlight { background: #e8f4fd; padding: 10px; border-radius: 6px; margin: 15px 0; }
            .amount-highlight .detail-row { border-bottom: none; margin: 5px 0; }
            @media print { 
              body { margin: 0; background: white; } 
              .receipt { box-shadow: none; border: 1px solid #ddd; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>MPASAT ONLINE</h1>
              <h2>Payment Receipt</h2>
              <div class="receipt-number">Receipt #: ${receiptData.receiptNumber}</div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span>Student Name:</span>
                <span>${receiptData.studentName}</span>
              </div>
              <div class="detail-row">
                <span>Class:</span>
                <span>${receiptData.className}</span>
              </div>
              <div class="detail-row">
                <span>Fee Type:</span>
                <span>${receiptData.feeType}</span>
              </div>
              <div class="detail-row">
                <span>Date:</span>
                <span>${receiptData.date}</span>
              </div>
              <div class="detail-row">
                <span>Time:</span>
                <span>${receiptData.time}</span>
              </div>
            </div>
            
            <div class="amount-highlight">
              <div class="detail-row">
                <span>${receiptData.feeType} Amount Paid:</span>
                <span>XAF${receiptData.amount.toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span>${receiptData.feeType} Amount Left:</span>
                <span>XAF${studentFees?.balance[receiptData.feeType]?.toLocaleString() || 0}</span>
              </div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span>Total Amount Paid (All Fees):</span>
                <span>XAF${totalPaid.toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span>Total Fee Left:</span>
                <span>XAF${totalFeeLeft.toLocaleString()}</span>
              </div>
            </div>
            
            <div class="total">
              <div class="detail-row">
                <span>Amount Paid:</span>
                <span>XAF${receiptData.amount.toLocaleString()}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your payment!</p>
              <small>This is a computer generated receipt</small>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Print Class Fee List
  const openPrintModal = () => {
    setPrintStats([]);
    setSelectedClass('');
    setPrintError('');
    setShowPrintModal(true);
  };

  const closePrintModal = () => setShowPrintModal(false);

  const handlePrintFetch = async () => {
    if (!selectedClass) return;
    setPrintLoading(true);
    setPrintError('');
    
    try {
      const stats = await ApiService.getClassFeeStats(selectedClass, selectedYear);
      setPrintStats(stats);
      
      // Check if no students found
      if (stats.length === 0) {
        const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'Unknown Class';
        setPrintError(`No students found in class "${selectedClassName}". Students need to be assigned to this class to view fee data.`);
      }
    } catch (err) {
      setPrintError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  const printClassList = () => {
    const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'Unknown Class';
    
    // Check if there are any students to print
    if (printStats.length === 0) {
      setShowNoStudentsModal(true);
      return;
    }
    
    const printWindow = window.open('', '_blank');
    
    // Calculate totals
    const totals = {
      Registration: 0,
      Tuition: 0,
      Vocational: 0,
      'Sport Wear': 0,
      'Sanitation & Health': 0,
      Total: 0,
      Balance: 0
    };

    printStats.forEach(student => {
      FEE_TYPES.forEach(type => {
        totals[type] += parseFloat(student[type] || 0);
      });
      totals.Total += parseFloat(student.Total || 0);
      totals.Balance += parseFloat(student.Balance || 0);
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Class Fee Report - ${selectedClassName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .report { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .totals { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; }
            .status-paid { color: green; font-weight: bold; }
            .status-owing { color: red; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="header">
              <h1>MPASAT ONLINE</h1>
              <h2>Class Fee Report</h2>
              <h3>${selectedClassName}</h3>
              <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  ${FEE_TYPES.map(type => `<th>${type}</th>`).join('')}
                  <th>Total Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${printStats.map(student => `
                  <tr>
                    <td>${student.name}</td>
                    ${FEE_TYPES.map(type => `<td>XAF${parseFloat(student[type] || 0).toLocaleString()}</td>`).join('')}
                    <td>XAF${parseFloat(student.Total || 0).toLocaleString()}</td>
                    <td>XAF${parseFloat(student.Balance || 0).toLocaleString()}</td>
                    <td class="${student.Status === 'Paid' ? 'status-paid' : 'status-owing'}">${student.Status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <h3>Class Totals:</h3>
              <p><strong>Total Registration Fees:</strong> XAF${totals.Registration.toLocaleString()}</p>
              <p><strong>Total Tuition Fees:</strong> XAF${totals.Tuition.toLocaleString()}</p>
              <p><strong>Total Vocational Fees:</strong> XAF${totals.Vocational.toLocaleString()}</p>
              <p><strong>Total Sport Wear Fees:</strong> XAF${totals['Sport Wear'].toLocaleString()}</p>
              <p><strong>Total Sanitation & Health Fees:</strong> XAF${totals['Sanitation & Health'].toLocaleString()}</p>
              <p><strong>Total Amount Paid:</strong> XAF${totals.Total.toLocaleString()}</p>
              <p><strong>Total Outstanding Balance:</strong> XAF${totals.Balance.toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Get fee amount for selected type
  const getFeeAmount = (feeType) => {
    if (!studentFees || !studentFees.student) return 0;
    
    const feeMap = {
      'Registration': studentFees.student.registration_fee,
      'Tuition': studentFees.student.tuition_fee,
      'Vocational': studentFees.student.vocational_fee,
      'Sport Wear': studentFees.student.sport_wear_fee,
      'Sanitation & Health': studentFees.student.health_sanitation_fee
    };
    
    return feeMap[feeType] || 0;
  };

  return (
    <div className="fees-page-wrapper">
      <div className="fees-wrapper">
        {/* Hamburger menu for mobile */}
        <button className="hamburger-menu" onClick={() => setSidebarOpen(true)}>
          <MdMenu />
        </button>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        <div className="fees-container">
          {/* Sidebar */}
          <div className={`sidebar${sidebarOpen ? ' open' : ''}`}> 
            <div className="logo-section" style={{position: 'relative'}}>
              <img src={logo} alt="MPASAT Logo" className="logo" />
              <h1>MPASAT</h1>
              {/* Close button for mobile */}
              {sidebarOpen && (
                <button className="sidebar-close" onClick={() => setSidebarOpen(false)} style={{position: 'absolute', top: 8, right: 8}}>
                  <MdClose />
                </button>
              )}
            </div>
            <div className="nav-item" onClick={() => navigateWithLoader('/dashboard')}>
              <MdDashboard className="nav-icon" /><span>Dashboard</span>
            </div>
            <div className="nav-item" onClick={() => navigateWithLoader('/students')}>
              <MdPeople className="nav-icon" /><span>Students</span>
            </div>
            <div className="nav-item" onClick={() => navigateWithLoader('/classes')}>
              <MdSchool className="nav-icon" /><span>Classes</span>
            </div>
            <div className="nav-item" onClick={() => navigateWithLoader('/vocational')}>
              <MdWork className="nav-icon" /><span>Vocational</span>
            </div>
            <div className="nav-item" onClick={() => navigateWithLoader('/teachers')}>
              <MdPerson className="nav-icon" /><span>Teachers</span>
            </div>
            <div className="nav-item active">
              <MdAttachMoney className="nav-icon" /><span>Fees</span>
            </div>
            <div className="nav-item" onClick={() => navigateWithLoader('/id-cards')}>
              <MdCreditCard className="nav-icon" /><span>ID Cards</span>
            </div>
            <div className="nav-item" onClick={() => regularNavigate('/')}> 
              <MdLogout className="nav-icon" /><span>Logout</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="main-content">
            <h1>Fees Management</h1>
            
            {/* Search Section */}
            <div className="fees-search-section">
              <div className="fees-student-search-box" ref={searchBoxRef}>
                <MdSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Type student name to search..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setSelectedStudent(null);
                    setStudentFees(null);
                    setError('');
                  }}
                  onFocus={() => setShowDropdown(suggestions.length > 0)}
                  autoComplete="off"
                />
                {showDropdown && suggestions.length > 0 && (
                  <ul className="fees-suggestions">
                    {suggestions.map(student => (
                      <li key={student.id} onClick={() => handleSelectStudent(student)}>
                        {student.full_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Loading and Error States */}
            {loading && <div className="fees-loading">Loading student information...</div>}
            {error && <div className="fees-error"><MdWarning /> {error}</div>}

            {/* Student Details and Fee Balance */}
            {selectedStudent && studentFees && (
              <div className="fees-details-card">
                <div className="student-info">
                  <h3><MdInfo /> Student Information</h3>
                  <div className="info-grid">
                    <div><strong>Name:</strong> {studentFees.student.full_name}</div>
                    <div><strong>Class:</strong> {studentFees.student.class_name}</div>
                  </div>
                </div>
                
                <div className="fees-balance-section">
                  <h3><MdAttachMoney /> Fee Balance</h3>
                  <div className="fees-balance-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Fee Type</th>
                          <th>Total Amount</th>
                          <th>Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(studentFees.balance).map(([type, balance]) => {
                          const totalAmount = getFeeAmount(type);
                          const status = balance <= 0 ? 'Paid' : 'Owing';
                          return (
                            <tr key={type} className={status === 'Paid' ? 'paid-row' : 'owing-row'}>
                              <td>{type}</td>
                              <td>XAF{totalAmount.toLocaleString()}</td>
                              <td>XAF{Number(balance).toLocaleString()}</td>
                              <td>
                                <span className={`status-badge ${status.toLowerCase()}`}>
                                  {status === 'Paid' ? <MdCheckCircle /> : <MdWarning />}
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button className="pay-fee-btn" onClick={openPayModal}>
                    <MdAdd /> Pay Fee
                  </button>
                </div>
              </div>
            )}

            {/* Print Class Fee List Button */}
            <div className="print-section">
              <button className="print-fee-btn" onClick={openPrintModal}>
                <MdPrint /> Print Class Fee List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pay Fee Modal */}
      {showPayModal && (
        <div className="fees-modal-overlay" onClick={closePayModal}>
          <div className="fees-modal" onClick={e => e.stopPropagation()}>
            <div className="fees-modal-header">
              <h2><MdReceipt /> Pay Fee</h2>
              <button className="fees-modal-close" onClick={closePayModal}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handlePay} className="fees-pay-form">
              <div className="fees-form-group">
                <label>Fee Type</label>
                <select 
                  value={payType} 
                  onChange={e => {
                    setPayType(e.target.value);
                    if (e.target.value) {
                      setPayAmount(getFeeAmount(e.target.value).toString());
                    }
                  }} 
                  required
                >
                  <option value="">Select Fee Type</option>
                  {FEE_TYPES.map(type => {
                    const isPaid = studentFees?.balance[type] === 0;
                    return (
                      <option key={type} value={type} disabled={isPaid}>
                        {type} - XAF{getFeeAmount(type).toLocaleString()} {isPaid ? '(Paid)' : ''}
                      </option>
                    );
                  })}
                </select>
                {/* If all fee types are paid, show a message */}
                {FEE_TYPES.every(type => studentFees?.balance[type] === 0) && (
                  <div className="fees-success" style={{marginTop: '1rem'}}>
                    <MdCheckCircle /> All fees for this student are fully paid.
                  </div>
                )}
              </div>
              <div className="fees-form-group">
                <label>Amount (XAF)</label>
                <input 
                  type="number" 
                  min="1" 
                  max={getFeeAmount(payType)}
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                  required 
                />
                {payType && (
                  <small className="fee-info">
                    Total fee: XAF{getFeeAmount(payType).toLocaleString()} | 
                    Balance: XAF{studentFees?.balance[payType]?.toLocaleString() || 0}
                  </small>
                )}
              </div>
              <div className="fees-form-group">
                <label htmlFor="pay-date">Payment Date</label>
                <input
                  type="date"
                  id="pay-date"
                  name="pay-date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  required
                />
              </div>
              <div className="fees-form-actions">
                <button type="button" className="fees-cancel-btn" onClick={closePayModal}>
                  Cancel
                </button>
                <button type="submit" className="fees-save-btn" disabled={payLoading || !payType || studentFees?.balance[payType] === 0}>
                  {payLoading ? 'Processing...' : 'Pay Fee'}
                </button>
              </div>
              {paySuccess && <div className="fees-success"><MdCheckCircle /> {paySuccess}</div>}
              {error && <div className="fees-error"><MdWarning /> {error}</div>}
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fees-modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="fees-modal receipt-modal" onClick={e => e.stopPropagation()}>
            <div className="fees-modal-header">
              <h2><MdReceipt /> Payment Receipt</h2>
              <button className="fees-modal-close" onClick={() => setShowReceipt(false)}>
                <MdClose />
              </button>
            </div>
            <div className="receipt-content">
              <div className="receipt-header">
                <h3>MPASAT ONLINE</h3>
                <p>Payment Receipt</p>
                <small>Receipt #: {receiptData.receiptNumber}</small>
              </div>
              <div className="receipt-details">
                <div className="receipt-row">
                  <span>Student Name:</span>
                  <span>{receiptData.studentName}</span>
                </div>
                <div className="receipt-row">
                  <span>Class:</span>
                  <span>{receiptData.className}</span>
                </div>
                <div className="receipt-row">
                  <span>Fee Type:</span>
                  <span>{receiptData.feeType}</span>
                </div>
                <div className="receipt-row">
                  <span>Date:</span>
                  <span>{receiptData.date}</span>
                </div>
                <div className="receipt-row">
                  <span>Time:</span>
                  <span>{receiptData.time}</span>
                </div>
                <div className="receipt-row">
                  <span>{receiptData.feeType} Amount Paid:</span>
                  <span>XAF{receiptData.amount.toLocaleString()}</span>
                </div>
                <div className="receipt-row">
                  <span>{receiptData.feeType} Amount Left:</span>
                  <span>XAF{studentFees?.balance[receiptData.feeType]?.toLocaleString() || 0}</span>
                </div>
                <div className="receipt-row">
                  <span>Total Amount Paid (All Fees):</span>
                  <span>XAF{(() => {
                    const totalFees = getFeeAmount('Registration') + getFeeAmount('Tuition') + getFeeAmount('Vocational') + getFeeAmount('Sport Wear') + getFeeAmount('Sanitation & Health');
                    const totalBalance = Object.values(studentFees?.balance || {}).reduce((a, b) => a + Number(b || 0), 0);
                    const totalPaid = Math.max(0, totalFees - totalBalance);
                    return totalPaid.toLocaleString();
                  })()}</span>
                </div>
                <div className="receipt-row">
                  <span>Total Fee Left:</span>
                  <span>XAF{(Object.values(studentFees?.balance || {}).reduce((a, b) => a + Number(b || 0), 0)).toLocaleString()}</span>
                </div>
                <div className="receipt-total">
                  <span>Amount Paid:</span>
                  <span>XAF${receiptData.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="receipt-footer">
                <p>Thank you for your payment!</p>
                <small>This is a computer generated receipt</small>
              </div>
              <div className="receipt-actions">
                <button className="print-receipt-btn" onClick={printReceipt}>
                  <MdPrint /> Print Receipt
                </button>
                <button className="close-receipt-btn" onClick={() => setShowReceipt(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Class Fee List Modal */}
      {showPrintModal && (
        <div className="fees-modal-overlay" onClick={closePrintModal}>
          <div className="fees-modal fees-print-modal" onClick={e => e.stopPropagation()}>
            <div className="fees-modal-header">
              <h2><MdPrint /> Print Class Fee List</h2>
              <button className="fees-modal-close" onClick={closePrintModal}>
                <MdClose />
              </button>
            </div>
            <div className="print-form">
              <div className="fees-form-group">
                <label>Select Class</label>
                <select 
                  value={selectedClass} 
                  onChange={e => setSelectedClass(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  className="fees-fetch-btn" 
                  onClick={handlePrintFetch} 
                  disabled={!selectedClass || printLoading}
                >
                  {printLoading ? 'Loading...' : 'Fetch Data'}
                </button>
              </div>
              
              {printError && <div className="fees-error"><MdWarning /> {printError}</div>}
              
              {printStats.length > 0 && (
                <div className="fees-print-table-wrapper">
                  <h3>Fee Statistics for {classes.find(c => c.id === selectedClass)?.name}</h3>
                  <div className="stats-summary">
                    <div className="stat-item">
                      <span>Total Students:</span>
                      <span>{printStats.length}</span>
                    </div>
                    <div className="stat-item">
                      <span>Fully Paid:</span>
                      <span>{printStats.filter(s => s.Status === 'Paid').length}</span>
                    </div>
                    <div className="stat-item">
                      <span>With Balance:</span>
                      <span>{printStats.filter(s => s.Status === 'Owing').length}</span>
                    </div>
                  </div>
                  <table className="fees-print-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        {FEE_TYPES.map(type => <th key={type}>{type}</th>)}
                        <th>Total Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printStats.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.name}</td>
                          {FEE_TYPES.map(type => (
                            <td key={type}>XAF{Number(row[type] || 0).toLocaleString()}</td>
                          ))}
                          <td>XAF{Number(row.Total || 0).toLocaleString()}</td>
                          <td>XAF{Number(row.Balance || 0).toLocaleString()}</td>
                          <td>
                            <span className={`status-badge ${row.Status.toLowerCase()}`}>
                              {row.Status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="fees-print-btn" onClick={printClassList}>
                    <MdPrint /> Print Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Students Modal */}
      {showNoStudentsModal && (
        <div className="fees-modal-overlay" onClick={() => setShowNoStudentsModal(false)}>
          <div className="fees-modal fees-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="fees-modal-header">
              <h2><MdWarning /> No Students Found</h2>
              <button className="fees-modal-close" onClick={() => setShowNoStudentsModal(false)}>
                <MdClose />
              </button>
            </div>
            <div className="fees-confirm-body">
              <p>No students found in class <strong>"{classes.find(c => c.id === selectedClass)?.name}"</strong>.</p>
              <p>Students need to be assigned to this class to generate a fee report.</p>
            </div>
            <div className="fees-confirm-actions">
              <button 
                className="fees-cancel-btn"
                onClick={() => setShowNoStudentsModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fees; 