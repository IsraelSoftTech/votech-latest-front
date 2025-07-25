import React, { useEffect, useState, useRef } from 'react';
import SideTop from './SideTop';
import './Salary.css';
import { FaMoneyCheckAlt, FaMoneyBillWave, FaSearch, FaEdit, FaTrash, FaUserTie, FaTimes, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';

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
  const [deleting, setDeleting] = useState(false);
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
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
  }, [teacherUsers]);

  // Set Salaries Table
  const handleSetSalaries = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await api.getSalaries();
      const table = teacherUsers.map(u => {
        const record = records.find(s => s.teacher_id === u.id && !s.paid);
        return {
          ...u,
          salary: record ? record.amount : '',
          salary_id: record ? record.id : null,
          paid: record ? record.paid : false
        };
      });
      setSalaryTable(table);
      setEditRow(null); // Reset edit row when refreshing
      setSalaryAmount(''); // Reset salary amount when refreshing
      setSuccess('Salaries refreshed successfully');
      setTimeout(() => setSuccess(''), 1200);
    } catch (e) {
      setError('Failed to refresh salaries');
    }
    setLoading(false);
  };

  // Edit salary amount
  const handleEditSalary = (row) => {
    setEditRow(row.id);
    setSalaryAmount(row.salary || '');
  };

  // Save salary amount
  const handleSaveSalary = async (row) => {
    setSaving(true);
    setError('');
    try {
      let updated;
      if (row.salary_id) {
        await api.deleteSalary(row.salary_id);
      }
      updated = await api.setSalary({ teacher_id: row.id, amount: salaryAmount });
      // Refresh table
      const records = await api.getSalaries();
      setSalaryTable(salaryTable.map(r => r.id === row.id ? { ...r, salary: salaryAmount, salary_id: updated.id, paid: false } : r));
      setEditRow(null);
      setSalaryAmount('');
      setSuccess('Salary set successfully');
      setTimeout(() => setSuccess(''), 1200);
    } catch (e) {
      setError('Failed to save salary');
    }
    setSaving(false);
  };

  // Delete salary
  const handleDeleteSalary = async (row) => {
    setDeleting(true);
    setError('');
    try {
      if (row.salary_id) {
        await api.deleteSalary(row.salary_id);
        setSalaryTable(salaryTable.map(r => r.id === row.id ? { ...r, salary: '', salary_id: null, paid: false } : r));
      }
    } catch (e) {
      setError('Failed to delete salary');
    }
    setDeleting(false);
  };

  // Pay salary
  const handlePaySalary = (record) => {
    setSalaryModal(record);
  };
  const handlePaySalaryConfirm = async () => {
    if (!salaryModal) return;
    setPaying(true);
    setError('');
    try {
      await api.paySalary({ salary_id: salaryModal.id });
      setSalaryHistory(salaryHistory.map(s => s.id === salaryModal.id ? { ...s, paid: true, paid_at: new Date().toISOString() } : s));
      setSalaryModal(null);
      setSuccess('Salary paid successfully');
      setTimeout(() => setSuccess(''), 1200);
    } catch (e) {
      setError('Failed to pay salary');
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
  const handlePayTeacherSelect = (teacher) => {
    setPayTeacher(teacher);
    setPayTeacherName(teacher.name || teacher.username);
    setPayTeacherSuggestions([]);
  };
  const handlePaySalarySubmit = async (e) => {
    e.preventDefault();
    if (!payTeacher || !payMonth) return;
    setPayingSalary(true);
    setError('');
    try {
      // Record payment in DB (call backend)
      const res = await api.paySalary({
        salary_id: payTeacher.salary_id, // or teacher_id if needed
        month: payMonth
      });
      setPaySuccess(true);
      setPayReceipt({
        name: payTeacher.name || payTeacher.username,
        role: payTeacher.role,
        amount: payTeacher.salary,
        month: payMonth,
        date: new Date().toLocaleDateString()
      });
      // Optionally refresh salary table/history here
    } catch (e) {
      setError('Failed to pay salary.');
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
      </div>
      {/* Set Salaries Table always visible below search bar */}
      <div className="salary-table-wrapper" style={{marginTop: 24}}>
        <table className="salary-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Salary Amount (XAF)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {salaryTable.map(row => (
              <tr key={row.id}>
                <td>{row.name || row.username}</td>
                <td>{row.role}</td>
                <td>
                  {editRow === row.id ? (
                    <input
                      type="number"
                      value={salaryAmount}
                      onChange={e => setSalaryAmount(e.target.value)}
                      className="salary-input"
                    />
                  ) : (
                    row.salary
                  )}
                </td>
                <td>
                  {editRow === row.id ? (
                    <>
                      <button className="save-btn" disabled={saving} onClick={() => handleSaveSalary(row)}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditRow(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="edit-btn" onClick={() => handleEditSalary(row)}><FaEdit /></button>
                      <button className="delete-btn" disabled={deleting} onClick={() => handleDeleteSalary(row)}><FaTrash /></button>
                    </>
                  )}
                </td>
              </tr>
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
                <input type="text" value={payTeacher?.salary || ''} readOnly />
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
    </SideTop>
  );
} 