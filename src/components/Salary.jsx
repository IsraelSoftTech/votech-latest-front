import React, { useEffect, useState, useRef } from 'react';
import SideTop from './SideTop';
import './Salary.css';
import { FaMoneyCheckAlt, FaMoneyBillWave, FaSearch, FaEdit, FaUserTie, FaTimes, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';
import SalaryReceiptReport from './SalaryReceiptReport';
import './SalaryReceiptReport.css';

export default function Salary() {
  const [teacherUsers, setTeacherUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [salaryModal, setSalaryModal] = useState(null);
  const [setSalariesOpen, setSetSalariesOpen] = useState(false);
  const [salaryTable, setSalaryTable] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalNotPaid, setTotalNotPaid] = useState(0);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTeacherName, setPayTeacherName] = useState('');
  const [payTeacherSuggestions, setPayTeacherSuggestions] = useState([]);
  const [payTeacher, setPayTeacher] = useState(null);
  const [payMonth, setPayMonth] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
  const [payingSalary, setPayingSalary] = useState(false);
  const [payReceipt, setPayReceipt] = useState(null);
  const receiptRef = useRef();
  const [showSalaryReceiptModal, setShowSalaryReceiptModal] = useState(false);
  const [salaryReceiptData, setSalaryReceiptData] = useState(null);
  const salaryReceiptRef = useRef();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [payTeacherSalary, setPayTeacherSalary] = useState('');
  // Add state for triggering totals recalculation
  const [totalsRefreshTrigger, setTotalsRefreshTrigger] = useState(0);
  // Add state for edit month
  const [editSalaryMonths, setEditSalaryMonths] = useState([]);
  // Add state for expanded teacher view and upset all modal
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  const [showUpsetAllModal, setShowUpsetAllModal] = useState(false);

  // Fetch all teacher users on mount
  useEffect(() => {
    setLoading(true);
    api.getTeacherUsers()
      .then(setTeacherUsers)
      .catch(() => setTeacherUsers([]))
      .finally(() => setLoading(false));
  }, []);

  // Live search suggestions
  useEffect(() => {
    if (!search) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      teacherUsers.filter(t =>
        (t.name || t.username || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, teacherUsers]);

  // When a teacher is selected, fetch their salary history
  useEffect(() => {
    if (!selectedTeacher) return;
    setLoading(true);
    api.getSalaryByTeacher(selectedTeacher.id)
      .then(res => setSalaryHistory(res))
      .catch(() => setSalaryHistory([]))
      .finally(() => setLoading(false));
  }, [selectedTeacher]);

  // Calculate totals for all teachers
  useEffect(() => {
    if (!teacherUsers.length) return;
    api.getSalaries().then(records => {
      let paid = 0, notPaid = 0;
      records.forEach(s => {
        if (s.paid) paid += Number(s.amount);
        else notPaid += Number(s.amount);
      });
      setTotalPaid(paid);
      setTotalNotPaid(notPaid);
    });
  }, [teacherUsers, totalsRefreshTrigger]); // Add totalsRefreshTrigger as dependency

  // Update handleSetSalaries to show only one row per teacher (latest paid month)
  const handleSetSalaries = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await api.getSalaries();
      console.log('All salary records from API:', records);
      
      // Group salary records by teacher
      const teacherSalaryMap = {};
      records.forEach(record => {
        if (!teacherSalaryMap[record.teacher_id]) {
          teacherSalaryMap[record.teacher_id] = [];
        }
        teacherSalaryMap[record.teacher_id].push(record);
      });
      
      // Create table rows - one per teacher, showing latest paid month
      const table = [];
      teacherUsers.forEach(teacher => {
        const teacherSalaries = teacherSalaryMap[teacher.id] || [];
        
        if (teacherSalaries.length === 0) {
          // If no salary records, show one row with empty data
          table.push({
            ...teacher,
            salary: '',
            salary_id: null,
            paid: false,
            month: '',
            allSalaries: []
          });
        } else {
          // Find the latest paid month, or use the most recent month if none paid
          const paidSalaries = teacherSalaries.filter(s => s.paid);
          const latestPaid = paidSalaries.length > 0 
            ? paidSalaries.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))[0]
            : teacherSalaries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          
          table.push({
            ...teacher,
            salary: latestPaid.amount,
            salary_id: latestPaid.id,
            paid: latestPaid.paid,
            month: latestPaid.month,
            allSalaries: teacherSalaries // Store all salaries for expanded view
          });
        }
      });
      
      console.log('Salary table after mapping:', table);
      setSalaryTable(table);
      setEditRow(null);
      setSalaryAmount('');
      setSuccess('Salaries refreshed successfully');
      setTimeout(() => setSuccess(''), 1200);
    } catch (e) {
      setError('Failed to refresh salaries');
    }
    setLoading(false);
  };

  // Update handleEditSalary to work with new row structure
  const handleEditSalary = (row) => {
    const editRowId = `${row.id}-${row.month}`;
    setEditRow(editRowId);
    setSalaryAmount(row.salary || '');
    // Pre-select the current month if available, else empty
    setEditSalaryMonths(row.month ? [row.month] : []);
  };

  // Save salary amount
  const handleSaveSalary = async (row) => {
    setSaving(true);
    setError('');
    try {
      if (!editSalaryMonths.length) {
        setError('Please select at least one month');
        setSaving(false);
        return;
      }
      let atLeastOneSuccess = false;
      let duplicateMonths = [];
      for (const month of editSalaryMonths) {
        try {
          if (row.salary_id) {
            await api.deleteSalary(row.salary_id);
          }
          await api.setSalary({ teacher_id: row.id, amount: salaryAmount, month });
          atLeastOneSuccess = true;
        } catch (e) {
          duplicateMonths.push(month);
        }
      }
      if (atLeastOneSuccess) {
        setSuccess('Salary set successfully');
        setTimeout(() => setSuccess(''), 1200);
        setTotalsRefreshTrigger(prev => prev + 1);
        setEditRow(null);
        setSalaryAmount('');
        setEditSalaryMonths([]);
        // Refresh table
        const records = await api.getSalaries();
        setSalaryTable(salaryTable.map(r => r.id === row.id ? { ...r, salary: salaryAmount } : r));
      }
      if (duplicateMonths.length) {
        setError('Salary for these months already exists: ' + duplicateMonths.join(', '));
      }
      if (!atLeastOneSuccess && duplicateMonths.length) {
        setError('Salary for all selected months already exists');
      }
    } catch (e) {
      setError('Failed to save salary');
    }
    setSaving(false);
  };

  // Pay salary
  const handlePaySalary = (record) => {
    // Only allow payment if salary is not already paid
    if (record.paid) {
      setError('This salary is already paid');
      return;
    }
    setSalaryModal(record);
  };
  const handlePaySalaryConfirm = async () => {
    if (!salaryModal) return;
    setPaying(true);
    setError('');
    try {
      await api.paySalary({ 
        salary_id: salaryModal.id, 
        month: salaryModal.month 
      });
      setSalaryHistory(salaryHistory.map(s => s.id === salaryModal.id ? { 
        ...s, 
        paid: true, 
        paid_at: new Date().toISOString() 
      } : s));
      setSalaryModal(null);
      setSuccess('Salary paid successfully');
      setTimeout(() => setSuccess(''), 1200);
      // Trigger totals recalculation
      setTotalsRefreshTrigger(prev => prev + 1);
    } catch (e) {
      setError(e.message || 'Failed to pay salary');
    }
    setPaying(false);
  };

  // Pay Salary Modal logic
  const handlePayTeacherNameChange = (e) => {
    const value = e.target.value;
    setPayTeacherName(value);
    setPayTeacher(null);
    if (value.length > 0) {
      setPayTeacherSuggestions(
        teacherUsers.filter(t => (t.name || t.username || '').toLowerCase().includes(value.toLowerCase()))
      );
    } else {
      setPayTeacherSuggestions([]);
    }
  };
  const handlePaySalarySubmit = async (e) => {
    e.preventDefault();
    if (!payTeacher || !payMonth) return;
    setPayingSalary(true);
    setError('');
    
    try {
      // First check if there's an unpaid salary record for this teacher and month
      const teacherSalaries = await api.getSalaryByTeacher(payTeacher.id);
      const salaryData = teacherSalaries.salaries || teacherSalaries;
      
      // Find unpaid salary record for this month
      const unpaidSalary = salaryData.find(s => 
        !s.paid && s.month === payMonth
      );
      
      if (!unpaidSalary) {
        // Check if there's already a paid salary for this month
        const paidSalary = salaryData.find(s => 
          s.paid && s.month === payMonth
        );
        
        if (paidSalary) {
          throw new Error(`Salary for ${payMonth} is already paid for this teacher`);
        } else {
          throw new Error(`No salary record found for ${payMonth}. Please set salary first.`);
        }
      }
      
      // Pay the salary
      const res = await fetch(`${api.API_URL}/salaries/pay`, {
        method: 'POST',
        headers: api.getAuthHeaders(),
        body: JSON.stringify({
          salary_id: unpaidSalary.id,
          month: payMonth
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to pay salary.');
      }
      
      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        // If response is empty, treat as success
      }
      
      setPaySuccess(true);
      const receipt = {
        name: payTeacher.name || payTeacher.username,
        role: payTeacher.role,
        amount: unpaidSalary.amount,
        month: payMonth,
        date: new Date().toLocaleDateString(),
        generatedAt: new Date().toLocaleString()
      };
      setPayReceipt(receipt);
      setSalaryReceiptData(receipt);
      setShowSalaryReceiptModal(true);
      // Trigger totals recalculation
      setTotalsRefreshTrigger(prev => prev + 1);
    } catch (e) {
      setError(e.message || 'Failed to pay salary.');
    }
    setPayingSalary(false);
  };
  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '', 'width=600,height=600');
      printWindow.document.write('<html><head><title>Salary Receipt</title></head><body>' + receiptRef.current.innerHTML + '</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Update handlePayTeacherSelect with more debugging
  const handlePayTeacherSelect = async (teacher) => {
    console.log('handlePayTeacherSelect called with teacher:', teacher);
    console.log('Current salaryTable:', salaryTable);
    
    setPayTeacher(teacher);
    setPayTeacherName(teacher.name || teacher.username);
    setPayTeacherSuggestions([]);
    
    // First try to get salary from salaryTable (current state)
    const foundInTable = salaryTable.find(s => s.id === teacher.id);
    console.log('Found in salaryTable:', foundInTable);
    
    if (foundInTable && foundInTable.salary) {
      console.log('Found salary in table:', foundInTable.salary);
      setPayTeacherSalary(foundInTable.salary);
      return;
    }
    
    // If not in table, try to fetch from database
    try {
      console.log('Fetching salary for teacher:', teacher.id);
      const response = await api.getSalaryByTeacher(teacher.id);
      console.log('Salary response from API:', response);
      
      // Handle new response format
      const salaryData = response.salaries || response; // Backward compatibility
      console.log('Salary data from API:', salaryData);
      
      // Find the unpaid salary record
      const unpaidSalary = salaryData.find(s => !s.paid);
      console.log('Unpaid salary record:', unpaidSalary);
      
      if (unpaidSalary) {
        setPayTeacherSalary(unpaidSalary.amount);
      } else {
        console.log('No unpaid salary found, checking if teacher has any salary records');
        // If no unpaid salary, check if teacher has any salary records at all
        if (salaryData.length > 0) {
          // Use the most recent salary record
          const latestSalary = salaryData[salaryData.length - 1];
          console.log('Using latest salary record:', latestSalary);
          setPayTeacherSalary(latestSalary.amount);
        } else {
          console.log('No salary records found for teacher');
          setPayTeacherSalary('');
        }
      }
    } catch (error) {
      console.error('Error fetching teacher salary:', error);
      setPayTeacherSalary('');
    }
  };

  // Handle teacher row click to expand/collapse
  const handleTeacherClick = (teacher) => {
    if (expandedTeacher === teacher.id) {
      setExpandedTeacher(null);
    } else {
      setExpandedTeacher(teacher.id);
    }
  };

  // Handle Upset All confirmation
  const handleUpsetAll = async () => {
    try {
      // Delete all salary records
      const records = await api.getSalaries();
      for (const record of records) {
        await api.deleteSalary(record.id);
      }
      setSuccess('All salary records have been deleted');
      setTimeout(() => setSuccess(''), 3000);
      setShowUpsetAllModal(false);
      // Refresh the table
      handleSetSalaries();
    } catch (error) {
      setError('Failed to delete all salary records');
    }
  };

  return (
    <SideTop>
      <div className="salary-cards-row">
        <div className="salary-card paid">
          <div className="icon"><FaMoneyBillWave /></div>
          <div className="count">{totalPaid.toLocaleString()} XAF</div>
          <div className="desc">Total Salary Paid</div>
        </div>
        <div className="salary-card not-paid">
          <div className="icon"><FaMoneyCheckAlt /></div>
          <div className="count">{totalNotPaid.toLocaleString()} XAF</div>
          <div className="desc">Total Salary Not Paid</div>
        </div>
      </div>
      <div className="salary-actions-row">
        <button className="set-salaries-btn" onClick={handleSetSalaries}>Refresh Salaries</button>
        <button className="set-salaries-btn" style={{background:'#388e3c'}} onClick={()=>{setPayModalOpen(true); setPaySuccess(false); setPayTeacherName(''); setPayTeacher(null); setPayMonth(''); setPayReceipt(null);}}>Pay Salary</button>
        <button className="set-salaries-btn" style={{background:'#e53e3e'}} onClick={() => setShowUpsetAllModal(true)}>Upset All</button>
      </div>
      {/* Set Salaries Table always visible below search bar */}
      <div className="salary-table-wrapper" style={{marginTop: 24}}>
        <table className="salary-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Salary Amount (XAF)</th>
              <th>Month</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {salaryTable.map((row, index) => (
              <React.Fragment key={`${row.id}-${index}`}>
                <tr 
                  onClick={() => handleTeacherClick(row)}
                  style={{cursor: 'pointer', backgroundColor: expandedTeacher === row.id ? '#f5f5f5' : ''}}
                >
                  <td>{row.name || row.username}</td>
                  <td>{row.role}</td>
                  <td>
                    {editRow === `${row.id}-${row.month}` ? (
                      <input
                        type="number"
                        value={salaryAmount}
                        onChange={e => setSalaryAmount(e.target.value)}
                        className="salary-input"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      row.salary
                    )}
                  </td>
                  <td>
                    {editRow === `${row.id}-${row.month}` ? (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}} onClick={e => e.stopPropagation()}>
                        {months.map(m => (
                          <label key={m} style={{marginRight:8}}>
                            <input
                              type="checkbox"
                              checked={editSalaryMonths.includes(m)}
                              onChange={e => {
                                if (e.target.checked) setEditSalaryMonths([...editSalaryMonths, m]);
                                else setEditSalaryMonths(editSalaryMonths.filter(mon => mon !== m));
                              }}
                            /> {m}
                          </label>
                        ))}
                      </div>
                    ) : (
                      row.month || '-'
                    )}
                  </td>
                  <td>
                    {row.paid ? (
                      <span style={{color:'#388e3c'}}><FaCheckCircle style={{verticalAlign:'middle'}}/> Paid</span>
                    ) : (
                      <span style={{color:'#e53e3e'}}>Not Paid</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {editRow === `${row.id}-${row.month}` ? (
                      <>
                        <button className="save-btn" disabled={saving} onClick={() => handleSaveSalary(row)}>Save</button>
                        <button className="cancel-btn" onClick={() => setEditRow(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="edit-btn" onClick={() => handleEditSalary(row)}><FaEdit /></button>
                    )}
                  </td>
                </tr>
                {/* Expanded months view */}
                {expandedTeacher === row.id && row.allSalaries && row.allSalaries.length > 0 && (
                  <tr>
                    <td colSpan="6" style={{padding: '10px 20px', backgroundColor: '#f9f9f9'}}>
                      <div style={{fontWeight: 'bold', marginBottom: '10px'}}>All Months for {row.name || row.username}:</div>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px'}}>
                        {row.allSalaries.map((salary, idx) => (
                          <div key={idx} style={{
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            backgroundColor: salary.paid ? '#e8f5e8' : '#fff'
                          }}>
                            <strong>{salary.month}</strong>: {salary.amount} XAF - 
                            {salary.paid ? (
                              <span style={{color:'#388e3c'}}> ✅ Paid</span>
                            ) : (
                              <span style={{color:'#e53e3e'}}> ❌ Not Paid</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {error && <div style={{color:'#e53e3e', marginBottom:12}}>{error}</div>}
      {success && <div style={{color:'#388e3c', marginBottom:12}}>{success}</div>}
      {/* Suggestions dropdown */}
      {search && suggestions.length > 0 && (
        <div className="salary-search-results">
          {suggestions.map(t => (
            <div key={t.id} className="teacher-result" onClick={() => { setSelectedTeacher(t); setSearch(''); }}>
              <FaUserTie className="teacher-icon" />
              <span>{t.name || t.username}</span>
            </div>
          ))}
        </div>
      )}
      {/* Salary history for selected teacher */}
      {selectedTeacher && (
        <div className="salary-history-section">
          <div className="salary-history-header">
            <span style={{fontWeight:600, fontSize:18}}>{selectedTeacher.name || selectedTeacher.username}</span>
            <button className="close-btn" onClick={() => setSelectedTeacher(null)}><FaTimes /></button>
          </div>
          {loading ? <div style={{padding:20}}>Loading...</div> : salaryHistory.length === 0 ? (
            <div style={{padding:20, color:'#888'}}>No salary records found.</div>
          ) : (
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Amount (XAF)</th>
                  <th>Status</th>
                  <th>Paid At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map(record => (
                  <tr key={record.id}>
                    <td>{record.amount}</td>
                    <td>{record.paid ? <span style={{color:'#388e3c'}}><FaCheckCircle style={{verticalAlign:'middle'}}/> Paid</span> : <span style={{color:'#e53e3e'}}>Not Paid</span>}</td>
                    <td>{record.paid_at ? new Date(record.paid_at).toLocaleString() : '-'}</td>
                    <td>
                      {!record.paid && (
                        <button className="pay-btn" disabled={paying} onClick={() => handlePaySalary(record)}>Pay</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Salary Payment Modal */}
      {salaryModal && (
        <div className="salary-modal-overlay" onClick={() => setSalaryModal(null)}>
          <div className="salary-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSalaryModal(null)}><FaTimes /></button>
            <h3>Pay Salary</h3>
            <div>Name: {selectedTeacher?.name || selectedTeacher?.username}</div>
            <div style={{margin:'16px 0'}}>Amount: {salaryModal.amount} XAF</div>
            <button className="pay-btn" disabled={paying} onClick={handlePaySalaryConfirm}>Pay Salary</button>
          </div>
        </div>
      )}
      {/* Pay Salary Modal */}
      {payModalOpen && (
        <div className="salary-modal-overlay" onClick={()=>setPayModalOpen(false)}>
          <div className="salary-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420,minWidth:0,width:'98vw'}}>
            <button className="close-btn" onClick={()=>setPayModalOpen(false)}><FaTimes /></button>
            <h3>Pay Salary</h3>
            {!paySuccess ? (
              <form onSubmit={handlePaySalarySubmit} className="pay-salary-form">
                <label>Name of Teacher</label>
                <input type="text" value={payTeacherName} onChange={handlePayTeacherNameChange} placeholder="Type teacher name..." autoFocus autoComplete="off" />
                {payTeacherSuggestions.length > 0 && (
                  <div className="salary-search-results">
                    {payTeacherSuggestions.map(t => (
                      <div key={t.id} className="teacher-result" onClick={()=>handlePayTeacherSelect(t)}>
                        <FaUserTie className="teacher-icon" />
                        <span>{t.name || t.username}</span>
                      </div>
                    ))}
                  </div>
                )}
                <label>Role</label>
                <input type="text" value={payTeacher?.role || ''} readOnly />
                <label>Salary Amount</label>
                <input type="text" value={payTeacherSalary} readOnly />
                <label>Month</label>
                <select value={payMonth} onChange={e=>setPayMonth(e.target.value)} required>
                  <option value="">Select Month</option>
                  {months.map(m=>(<option key={m} value={m}>{m}</option>))}
                </select>
                <button className="pay-btn" type="submit" disabled={payingSalary || !payTeacher || !payMonth}>Pay</button>
                {error && <div style={{color:'#e53e3e',marginTop:8}}>{error}</div>}
              </form>
            ) : (
              <div className="pay-success-message">
                <FaCheckCircle style={{color:'#388e3c',marginRight:6,verticalAlign:'middle'}}/> Salary paid successfully!
              </div>
            )}
          </div>
        </div>
      )}
      {/* Salary Receipt Report Modal */}
      {showSalaryReceiptModal && salaryReceiptData && (
        <div className="salary-receipt-modal-overlay" onClick={() => setShowSalaryReceiptModal(false)}>
          <div className="salary-receipt-modal-content" onClick={e => e.stopPropagation()}>
            <SalaryReceiptReport ref={salaryReceiptRef} receipt={salaryReceiptData} />
          </div>
        </div>
      )}
      {showUpsetAllModal && (
        <div className="salary-modal-overlay" onClick={() => setShowUpsetAllModal(false)}>
          <div className="salary-modal" onClick={e => e.stopPropagation()}>
            <h3>Upset All Settings</h3>
            <p>Are you sure you want to delete all salary records? This action cannot be undone.</p>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px'}}>
              <button className="cancel-btn" onClick={() => setShowUpsetAllModal(false)}>Cancel</button>
              <button className="pay-btn" style={{background: '#e53e3e'}} onClick={handleUpsetAll}>Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 