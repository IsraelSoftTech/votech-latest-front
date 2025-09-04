import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import './Attendance.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png';

export default function StaffAttendance() {
  const [stats, setStats] = useState({
    currentMonth: { total_records: 0, present_count: 0, absent_count: 0, late_count: 0, half_day_count: 0, attendanceRate: 0 },
    lastMonth: { total_records: 0, present_count: 0, absent_count: 0, late_count: 0, half_day_count: 0, attendanceRate: 0 }
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const reportRef = useRef();

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      months.push({
        value: `${month}-${year}`,
        label: monthName,
        month: month,
        year: year
      });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    loadStats();
    loadRecords();
    loadUsers();
    loadClasses();
    
    // Set default selected month to current month
    const currentDate = new Date();
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getStaffAttendanceStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const data = await api.getStaffAttendanceRecords({ limit: 100 });
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getStaffUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await api.getStaffClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleCreateNew = () => {
    const newRecord = {
      id: 'new',
      date: new Date().toISOString().split('T')[0], // Today's date
      staff_name: '',
      time_in: '',
      time_out: '',
      classes_taught: [],
      status: 'Present'
    };
    setEditingRecord(newRecord);
    setIsCreatingNew(true);
  };

  const handleEdit = (record) => {
    // Convert classes string to array for editing
    const recordForEdit = {
      ...record,
      classes_taught: record.classes_taught 
        ? record.classes_taught.split(',').map(c => c.trim()).filter(c => c)
        : []
    };
    setEditingRecord(recordForEdit);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    // Validate required fields
    if (!editingRecord.staff_name) {
      alert('Please select a staff member');
      return;
    }

    try {
      // Convert classes array to string for storage
      const recordToSave = {
        ...editingRecord,
        classes_taught: Array.isArray(editingRecord.classes_taught) 
          ? editingRecord.classes_taught.join(', ')
          : editingRecord.classes_taught
      };

      if (isCreatingNew) {
        // Create new record
        await api.createStaffAttendanceRecord(recordToSave);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setEditingRecord(null);
        setIsCreatingNew(false);
      } else {
        // Update existing record
        await api.updateStaffAttendanceRecord(editingRecord.id, recordToSave);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setEditingRecord(null);
      }
      loadStats();
      loadRecords();
    } catch (error) {
      console.error('Save error:', error);
      alert('Save failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await api.deleteStaffAttendanceRecord(id);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      loadStats();
      loadRecords();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + (error.message || 'Unknown error'));
    }
  };

  const generateMonthlyReport = async () => {
    if (!selectedMonth || !selectedYear) {
      alert('Please select a month and year');
      return;
    }

    setLoading(true);
    try {
      const data = await api.generateStaffMonthlyReport(selectedMonth, selectedYear);
      setReportData(data);
      setShowReportModal(true);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Report generation failed: ' + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const downloadReportPDF = async () => {
    if (!reportRef.current || !reportData) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        width: 1200, // Fixed width for consistent layout
        height: 800   // Fixed height for consistent layout
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // A4 landscape dimensions: 297mm x 210mm
      const pageWidth = 297;
      const pageHeight = 210;
      const imgWidth = pageWidth - 20; // Leave 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 1;

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20); // Account for margins
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + (pageHeight - 20);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
        pageCount++;
      }
      
      const monthName = monthOptions.find(opt => opt.month == selectedMonth && opt.year == selectedYear)?.label || `${selectedMonth}/${selectedYear}`;
      const fileName = `staff_attendance_report_${monthName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF generation failed: ' + error.message);
    }
  };



  return (
    <div className="attendance-container">
      {showSuccess && <SuccessMessage message="Operation successful" />}

      {/* Statistics Cards */}
      <div className="attendance-cards">
        <div className="attendance-card">
          <div className="title">Current Month Attendance</div>
          <div className="stats">
            <span className="present">Present: {stats.currentMonth.present_count}</span>
            <span className="absent">Absent: {stats.currentMonth.absent_count}</span>
            <span style={{ color: '#d97706' }}>Late: {stats.currentMonth.late_count}</span>
            <span style={{ color: '#7c3aed' }}>Half Day: {stats.currentMonth.half_day_count}</span>
          </div>
          <div className="total">Attendance Rate: {stats.currentMonth.attendanceRate}%</div>
        </div>

        <div className="attendance-card">
          <div className="title">Last Month Attendance</div>
          <div className="stats">
            <span className="present">Present: {stats.lastMonth.present_count}</span>
            <span className="absent">Absent: {stats.lastMonth.absent_count}</span>
            <span style={{ color: '#d97706' }}>Late: {stats.lastMonth.late_count}</span>
            <span style={{ color: '#7c3aed' }}>Half Day: {stats.lastMonth.half_day_count}</span>
          </div>
          <div className="total">Attendance Rate: {stats.lastMonth.attendanceRate}%</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="actions-row" style={{ gap: 8, marginBottom: 20 }}>
        <button 
          className="att-primary-btn" 
          onClick={handleCreateNew}
          disabled={editingRecord !== null}
        >
          New
        </button>
        
        {/* Month Selection for Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [month, year] = e.target.value.split('-');
              setSelectedMonth(parseInt(month));
              setSelectedYear(parseInt(year));
            }}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button 
            className="att-primary-btn" 
            onClick={generateMonthlyReport}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>



      {/* Records Table */}
      <div className="att-sessions-table">
        <h3>Staff Attendance Records</h3>
        <div className="att-table-wrapper">
          <table className="att-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Staff Name</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Classes Taught</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New record creation row */}
              {isCreatingNew && (
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td>
                    <input
                      type="date"
                      value={editingRecord.date}
                      onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})}
                      style={{ width: '100%', padding: '4px' }}
                    />
                  </td>
                  <td>
                    <select
                      value={editingRecord.staff_name}
                      onChange={(e) => setEditingRecord({...editingRecord, staff_name: e.target.value})}
                      style={{ width: '100%', padding: '4px' }}
                    >
                      <option value="">Select Staff Member</option>
                      {users.map(user => (
                        <option key={user.id} value={user.name}>
                          {user.name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="time"
                      value={editingRecord.time_in || ''}
                      onChange={(e) => setEditingRecord({...editingRecord, time_in: e.target.value})}
                      style={{ width: '100%', padding: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={editingRecord.time_out || ''}
                      onChange={(e) => setEditingRecord({...editingRecord, time_out: e.target.value})}
                      style={{ width: '100%', padding: '4px' }}
                    />
                  </td>
                  <td>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '4px' }}>
                      {classes.map(classItem => (
                        <label key={classItem.id} style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                          <input
                            type="checkbox"
                            checked={editingRecord.classes_taught.includes(classItem.name)}
                            onChange={(e) => {
                              const newClasses = e.target.checked
                                ? [...editingRecord.classes_taught, classItem.name]
                                : editingRecord.classes_taught.filter(c => c !== classItem.name);
                              setEditingRecord({...editingRecord, classes_taught: newClasses});
                            }}
                            style={{ marginRight: '4px' }}
                          />
                                                          {classItem.name}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <select
                      value={editingRecord.status}
                      onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value})}
                      style={{ width: '100%', padding: '4px' }}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                      <option value="Half Day">Half Day</option>
                    </select>
                  </td>
                  <td>
                    <button 
                      className="att-primary-btn" 
                      onClick={handleSaveEdit}
                      style={{ marginRight: '4px', padding: '4px 8px', fontSize: '12px' }}
                    >
                      Save
                    </button>
                    <button 
                      className="att-ghost-btn" 
                      onClick={() => {
                        setEditingRecord(null);
                        setIsCreatingNew(false);
                      }}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}
              
              {records.map((record) => (
                  <tr key={record.id}>
                    {editingRecord && editingRecord.id === record.id ? (
                      <>
                        <td>
                          <input
                            type="date"
                            value={editingRecord.date}
                            onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        </td>
                        <td>
                          <select
                            value={editingRecord.staff_name}
                            onChange={(e) => setEditingRecord({...editingRecord, staff_name: e.target.value})}
                            style={{ width: '100%', padding: '4px' }}
                          >
                            <option value="">Select Staff Member</option>
                            {users.map(user => (
                              <option key={user.id} value={user.name}>
                                {user.name} ({user.role})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={editingRecord.time_in || ''}
                            onChange={(e) => setEditingRecord({...editingRecord, time_in: e.target.value})}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={editingRecord.time_out || ''}
                            onChange={(e) => setEditingRecord({...editingRecord, time_out: e.target.value})}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        </td>
                        <td>
                          <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '4px' }}>
                            {classes.map(classItem => (
                              <label key={classItem.id} style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                                <input
                                  type="checkbox"
                                  checked={editingRecord.classes_taught.includes(classItem.name)}
                                  onChange={(e) => {
                                    const newClasses = e.target.checked
                                      ? [...editingRecord.classes_taught, classItem.name]
                                      : editingRecord.classes_taught.filter(c => c !== classItem.name);
                                    setEditingRecord({...editingRecord, classes_taught: newClasses});
                                  }}
                                  style={{ marginRight: '4px' }}
                                />
                                {classItem.name}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td>
                          <select
                            value={editingRecord.status}
                            onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value})}
                            style={{ width: '100%', padding: '4px' }}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                            <option value="Half Day">Half Day</option>
                          </select>
                        </td>
                        <td>
                          <button 
                            className="att-primary-btn" 
                            onClick={handleSaveEdit}
                            style={{ marginRight: '4px', padding: '4px 8px', fontSize: '12px' }}
                          >
                            Save
                          </button>
                          <button 
                            className="att-ghost-btn" 
                            onClick={() => {
                              setEditingRecord(null);
                              setIsCreatingNew(false);
                            }}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>{record.staff_name}</td>
                        <td>{record.time_in || '-'}</td>
                        <td>{record.time_out || '-'}</td>
                        <td>{record.classes_taught || '-'}</td>
                        <td>
                          <span className={`status-badge ${record.status.toLowerCase().replace(' ', '-')}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="att-primary-btn" 
                            onClick={() => handleEdit(record)}
                            style={{ marginRight: '4px', padding: '4px 8px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button 
                            className="att-ghost-btn" 
                            onClick={() => handleDelete(record.id)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Report Modal */}
      {showReportModal && reportData && (
        <div className="att-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="att-modal" style={{ maxWidth: '95vw', maxHeight: '95vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div ref={reportRef} style={{ 
              padding: '20px', 
              backgroundColor: 'white',
              width: '1200px', // Fixed width for consistent PDF generation
              minHeight: '800px' // Fixed height for consistent PDF generation
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #3b82f6', paddingBottom: '20px' }}>
                <img src={logo} alt="VOTECH(S7) Logo" style={{ height: '80px', marginBottom: '15px' }} />
                <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>VOTECH(S7) ACADEMY</h1>
                <h2 style={{ margin: '8px 0', fontSize: '22px', color: '#374151' }}>STAFF ATTENDANCE MONTHLY REPORT</h2>
                <h3 style={{ margin: '0', fontSize: '20px', color: '#6b7280', fontWeight: '600' }}>{reportData.month_name}</h3>
              </div>

              {/* Summary Statistics */}
              <div style={{ 
                marginBottom: '30px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '15px',
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{reportData.total_staff}</div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>Total Staff</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{reportData.overall_stats.attendance_rate}%</div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>Attendance Rate</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{reportData.overall_stats.present}</div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>Total Present</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #dc2626' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{reportData.overall_stats.absent}</div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>Total Absent</div>
                </div>
              </div>

              {/* Detailed Statistics */}
              <div style={{ 
                marginBottom: '30px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '15px',
                padding: '20px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #f59e0b'
              }}>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d97706' }}>{reportData.overall_stats.late}</div>
                  <div style={{ fontSize: '14px', color: '#92400e' }}>Late Arrivals</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>{reportData.overall_stats.half_days}</div>
                  <div style={{ fontSize: '14px', color: '#5b21b6' }}>Half Days</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151' }}>{reportData.total_records}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Records</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>{new Date(reportData.generated_at).toLocaleDateString()}</div>
                  <div style={{ fontSize: '14px', color: '#047857' }}>Generated Date</div>
                </div>
              </div>

              {/* Staff Individual Reports */}
              {reportData.staff_reports.map((staff, index) => (
                <div key={index} style={{ 
                  marginBottom: '25px', 
                  pageBreakInside: 'avoid',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    backgroundColor: '#f3f4f6', 
                    padding: '15px', 
                    margin: '0',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h4 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {staff.staff_name}
                    </h4>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: staff.attendance_rate >= 80 ? '#059669' : staff.attendance_rate >= 60 ? '#d97706' : '#dc2626'
                    }}>
                      Attendance Rate: {staff.attendance_rate}%
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: '#ffffff'
                  }}>
                    <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #0ea5e9' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>{staff.present_days}</div>
                      <div style={{ fontSize: '14px', color: '#0c4a6e' }}>Present Days</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #f87171' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{staff.absent_days}</div>
                      <div style={{ fontSize: '14px', color: '#991b1b' }}>Absent Days</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fbbf24' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{staff.late_days}</div>
                      <div style={{ fontSize: '14px', color: '#92400e' }}>Late Days</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #c084fc' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>{staff.half_days}</div>
                      <div style={{ fontSize: '14px', color: '#5b21b6' }}>Half Days</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div style={{ 
                marginTop: '40px', 
                paddingTop: '20px', 
                borderTop: '2px solid #e5e7eb',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                <p>Report generated on {new Date(reportData.generated_at).toLocaleString()}</p>
                <p>VOTECH(S7) Academy - Staff Attendance Management System</p>
              </div>
            </div>
            
            <div className="att-modal-actions" style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
              <button className="att-ghost-btn" onClick={() => setShowReportModal(false)}>Close</button>
              <button className="att-primary-btn" onClick={downloadReportPDF}>Download PDF (A4 Landscape)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 