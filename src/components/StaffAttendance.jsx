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
  const [activeTab, setActiveTab] = useState('records'); // 'records' or 'employment'
  const [employmentStatus, setEmploymentStatus] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    full_time_expected_days: { value: 22 },
    part_time_expected_days: { value: 11 },
    start_time: { value: '08:00' },
    end_time: { value: '17:00' }
  });
  const [settingsForm, setSettingsForm] = useState({
    fullTimeDays: 22,
    partTimeDays: 11,
    startTime: '08:00',
    endTime: '17:00'
  });
  const reportRef = useRef();
  const getInitialRole = () => {
    const stored = sessionStorage.getItem('authUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed?.role || '';
      } catch (error) {
        console.error('Failed to parse authUser for role:', error);
      }
    }
    return '';
  };

  const [userRole, setUserRole] = useState(getInitialRole);

  useEffect(() => {
    const stored = sessionStorage.getItem('authUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserRole(parsed?.role || '');
      } catch (error) {
        console.error('Failed to parse authUser for role:', error);
      }
    }
  }, []);

  const canManageRecords = ['Admin3', 'Admin1'].includes(userRole);
  const canManageEmployment = ['Admin3', 'Admin1'].includes(userRole);
  const canManageSettings = canManageEmployment;

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
    loadEmploymentStatus();
    loadSettings();
    
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

  const loadEmploymentStatus = async () => {
    try {
      const data = await api.getStaffEmploymentStatus();
      setEmploymentStatus(data);
    } catch (error) {
      console.error('Error loading employment status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getStaffAttendanceSettings();
      setSettings(data);
      setSettingsForm({
        fullTimeDays: parseInt(data.full_time_expected_days?.value) || 22,
        partTimeDays: parseInt(data.part_time_expected_days?.value) || 11,
        startTime: data.start_time?.value || '08:00',
        endTime: data.end_time?.value || '17:00'
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleEmploymentTypeChange = async (staffName, employmentType) => {
    if (!canManageEmployment) return;
    try {
      await api.updateStaffEmploymentStatus(staffName, employmentType);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      loadEmploymentStatus();
    } catch (error) {
      console.error('Error updating employment status:', error);
      alert('Failed to update employment status: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSaveSettings = async () => {
    if (!canManageSettings) return;
    try {
      await api.updateStaffAttendanceSettings(
        settingsForm.fullTimeDays, 
        settingsForm.partTimeDays,
        settingsForm.startTime,
        settingsForm.endTime
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      loadSettings();
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + (error.message || 'Unknown error'));
    }
  };

  const getEmploymentType = (staffName) => {
    const status = employmentStatus.find(s => s.staff_name === staffName);
    return status ? status.employment_type : null;
  };

  const handleCreateNew = () => {
    if (!canManageRecords) return;
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
    if (!canManageRecords) return;
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
    if (!canManageRecords) return;
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
    if (!canManageRecords) return;
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

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
      // Create a temporary container to render the full content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-99999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1200px';
      tempContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempContainer);

      // Clone the report content
      const reportClone = reportRef.current.cloneNode(true);
      tempContainer.appendChild(reportClone);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 800));

      // Find the table to get row positions
      const table = tempContainer.querySelector('table');
      const tbodyRows = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
      const theadRow = table ? table.querySelector('thead tr') : null;
      const tfootRow = table ? table.querySelector('tfoot tr') : null;
      
      // Calculate row positions relative to the container
      const rowPositions = [];
      const containerRect = tempContainer.getBoundingClientRect();
      
      if (table && tbodyRows.length > 0) {
        // Get table header row position
        if (theadRow) {
          const theadRect = theadRow.getBoundingClientRect();
          rowPositions.push({
            top: theadRect.top - containerRect.top,
            height: theadRect.height,
            bottom: theadRect.bottom - containerRect.top,
            element: theadRow,
            isHeader: true
          });
        }
        
        // Calculate position of each data row
        tbodyRows.forEach((row) => {
          const rowRect = row.getBoundingClientRect();
          const rowTop = rowRect.top - containerRect.top;
          const rowHeight = rowRect.height;
          rowPositions.push({
            top: rowTop,
            height: rowHeight,
            bottom: rowTop + rowHeight,
            element: row,
            isHeader: false
          });
        });
        
        // Get table footer row position
        if (tfootRow) {
          const tfootRect = tfootRow.getBoundingClientRect();
          rowPositions.push({
            top: tfootRect.top - containerRect.top,
            height: tfootRect.height,
            bottom: tfootRect.bottom - containerRect.top,
            element: tfootRow,
            isFooter: true
          });
        }
      }

      // Capture the full content without height restrictions
      const canvas = await html2canvas(tempContainer, { 
        scale: 2, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: tempContainer.scrollWidth,
        windowHeight: tempContainer.scrollHeight,
        logging: false
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // A4 landscape dimensions: 297mm x 210mm
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Calculate how many pages we need based on actual content height
      const contentHeightPerPage = pageHeight - (margin * 2);
      const totalPages = Math.ceil(imgHeight / contentHeightPerPage);
      
      // Calculate page breaks at row boundaries
      // Scale factor is 2, so we need to multiply positions by 2
      const scale = 2;
      const contentHeightPerPagePixels = (contentHeightPerPage / imgHeight) * canvas.height;
      
      const pageBreaks = [];
      
      if (rowPositions.length > 0) {
        // Calculate scaled positions - account for the scale factor in html2canvas
        const scaledRowPositions = rowPositions.map(row => ({
          top: row.top * scale,
          bottom: row.bottom * scale,
          height: row.height * scale,
          isHeader: row.isHeader || false,
          isFooter: row.isFooter || false
        }));
        
        // Find the first data row (after header)
        const firstDataRowIndex = scaledRowPositions.findIndex(r => !r.isHeader && !r.isFooter);
        const headerRow = scaledRowPositions.find(r => r.isHeader);
        const footerRow = scaledRowPositions.find(r => r.isFooter);
        
        // Start from top of container (includes report header, table title, etc.)
        let currentPageStart = 0;
        let currentPageEnd = 0;
        let currentPageRows = [];
        let isFirstPage = true;
        
        // Process each row (data rows and footer, but not header row)
        scaledRowPositions.forEach((row, index) => {
          // Skip header row in iteration (it's already in the first page start)
          if (row.isHeader) return;
          
          // For first page, start from top of container
          if (isFirstPage && currentPageRows.length === 0) {
            currentPageStart = 0;
          }
          
          // Calculate if adding this row would exceed page height
          // For first page, measure from container top; for others, from current page start
          const pageStartForCalculation = isFirstPage ? 0 : currentPageStart;
          const pageHeightWithRow = row.bottom - pageStartForCalculation;
          
          // Check if this row would fit (with small margin for safety)
          const wouldExceed = currentPageRows.length > 0 && 
            pageHeightWithRow > (contentHeightPerPagePixels * 0.98); // 98% to leave small margin
          
          if (wouldExceed && currentPageRows.length > 0) {
            // Save current page (ending at the last complete row)
            pageBreaks.push({
              startY: currentPageStart,
              endY: currentPageEnd,
              height: currentPageEnd - currentPageStart
            });
            
            // Start new page - begin at the start of this row (which won't fit on previous page)
            // For new pages, we start from the row position (table header will be included if it's visible)
            currentPageStart = row.top;
            currentPageEnd = row.bottom;
            currentPageRows = [row];
            isFirstPage = false;
          } else {
            // Add row to current page
            if (currentPageRows.length === 0) {
              // First row on page - start from container top for first page, row top for others
              currentPageStart = isFirstPage ? 0 : row.top;
            }
            currentPageEnd = row.bottom;
            currentPageRows.push(row);
          }
        });
        
        // Add the last page (including footer if it exists)
        if (currentPageRows.length > 0) {
          // Include footer if it fits, otherwise put it on next page
          if (footerRow && footerRow.top >= currentPageStart) {
            const footerWouldFit = (footerRow.bottom - currentPageStart) <= contentHeightPerPagePixels;
            if (footerWouldFit) {
              currentPageEnd = footerRow.bottom;
            }
          }
          
          pageBreaks.push({
            startY: currentPageStart,
            endY: currentPageEnd,
            height: currentPageEnd - currentPageStart
          });
        }
      }
      
      // If we couldn't calculate row positions, fall back to simple division
      const actualPageBreaks = pageBreaks.length > 0 ? pageBreaks : 
        Array.from({ length: totalPages }, (_, i) => {
          const startY = (canvas.height / totalPages) * i;
          const endY = i === totalPages - 1 ? canvas.height : (canvas.height / totalPages) * (i + 1);
          return {
            startY: startY,
            endY: endY,
            height: endY - startY
          };
        });
      
      // Add pages with proper slicing at row boundaries
      for (let i = 0; i < actualPageBreaks.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const breakInfo = actualPageBreaks[i];
        const sourceY = Math.floor(breakInfo.startY);
        const sourceHeight = Math.ceil(breakInfo.endY - breakInfo.startY);
        
        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        // Fill with white background
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        // Draw the slice from the original canvas
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,  // Source rectangle
          0, 0, canvas.width, sourceHeight          // Destination rectangle
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
        
        // Ensure the image fits on the page
        const finalHeight = Math.min(pageImgHeight, contentHeightPerPage);
        
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, finalHeight);
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('employment')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderBottom: activeTab === 'employment' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'employment' ? '#3b82f6' : '#6b7280',
            fontWeight: activeTab === 'employment' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Full/Part Time
        </button>
        <button
          onClick={() => setActiveTab('records')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderBottom: activeTab === 'records' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'records' ? '#3b82f6' : '#6b7280',
            fontWeight: activeTab === 'records' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Attendance Records
        </button>
      </div>

      {/* Action Buttons */}
      <div className="actions-row" style={{ gap: 8, marginBottom: 20 }}>
        {activeTab === 'records' && canManageRecords && (
          <button 
            className="att-primary-btn" 
            onClick={handleCreateNew}
            disabled={editingRecord !== null}
          >
            New
          </button>
        )}
        
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



      {/* Employment Status Tab */}
      {activeTab === 'employment' && (
        <div className="att-sessions-table">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Staff Employment Status</h3>
            {canManageSettings && (
              <button
                className="att-primary-btn"
                onClick={() => setShowSettingsModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                </svg>
                Settings
              </button>
            )}
          </div>
          <div className="att-table-wrapper">
            <table className="att-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Name</th>
                  <th>Full Time</th>
                  <th>Part Time</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const currentType = getEmploymentType(user.name);
                  return (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.name} ({user.role})</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={currentType === 'Full Time'}
                          onChange={(e) => {
                            if (!canManageEmployment) return;
                            if (e.target.checked) {
                              handleEmploymentTypeChange(user.name, 'Full Time');
                            }
                          }}
                          disabled={!canManageEmployment}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={currentType === 'Part Time'}
                          onChange={(e) => {
                            if (!canManageEmployment) return;
                            if (e.target.checked) {
                              handleEmploymentTypeChange(user.name, 'Part Time');
                            }
                          }}
                          disabled={!canManageEmployment}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Records Table */}
      {activeTab === 'records' && (
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
                {canManageRecords && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {/* New record creation row */}
              {canManageRecords && isCreatingNew && (
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
              
              {records.map((record) => {
                const isRowEditing = canManageRecords && editingRecord && editingRecord.id === record.id;
                return (
                  <tr key={record.id}>
                    {isRowEditing ? (
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
                        {canManageRecords && (
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
                        )}
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
                        {canManageRecords && (
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
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && canManageSettings && (
        <div className="att-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="att-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
                Attendance Settings
              </h2>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Expected Days per Month - Full Time Staff
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={settingsForm.fullTimeDays}
                  onChange={(e) => setSettingsForm({...settingsForm, fullTimeDays: parseInt(e.target.value) || 0})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {settings.full_time_expected_days?.description || 'Expected number of days present per month for full-time staff'}
                </p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Expected Days per Month - Part Time Staff
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={settingsForm.partTimeDays}
                  onChange={(e) => setSettingsForm({...settingsForm, partTimeDays: parseInt(e.target.value) || 0})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {settings.part_time_expected_days?.description || 'Expected number of days present per month for part-time staff'}
                </p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Start Time (Expected Arrival Time)
                </label>
                <input
                  type="time"
                  value={settingsForm.startTime}
                  onChange={(e) => setSettingsForm({...settingsForm, startTime: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {settings.start_time?.description || 'Expected start time for staff (HH:MM format)'}
                </p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  End Time (Expected Departure Time)
                </label>
                <input
                  type="time"
                  value={settingsForm.endTime}
                  onChange={(e) => setSettingsForm({...settingsForm, endTime: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {settings.end_time?.description || 'Expected end time for staff (HH:MM format)'}
                </p>
              </div>
            </div>
            <div className="att-modal-actions" style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
              <button className="att-ghost-btn" onClick={() => setShowSettingsModal(false)}>Cancel</button>
              <button className="att-primary-btn" onClick={handleSaveSettings}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Modal */}
      {showReportModal && reportData && (
        <div className="att-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="att-modal" style={{ maxWidth: '95vw', maxHeight: '95vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div ref={reportRef} style={{ 
              padding: '20px', 
              backgroundColor: 'white',
              width: '1200px', // Fixed width for consistent PDF generation
              minHeight: 'auto' // Let content determine height
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #3b82f6', paddingBottom: '20px' }}>
                <img src={logo} alt="VOTECH(S7) Logo" style={{ height: '80px', marginBottom: '15px' }} />
                <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>VOTECH(S7) ACADEMY</h1>
                <h2 style={{ margin: '8px 0', fontSize: '22px', color: '#374151' }}>STAFF ATTENDANCE MONTHLY REPORT</h2>
                <h3 style={{ margin: '0', fontSize: '20px', color: '#6b7280', fontWeight: '600' }}>{reportData.month_name}</h3>
              </div>

              {/* Professional Attendance Report Table */}
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                  Detailed Staff Attendance Analysis
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    pageBreakInside: 'auto'
                  }}>
                    <thead style={{ display: 'table-header-group' }}>
                      <tr style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151', fontWeight: '600' }}>S/N</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151', fontWeight: '600' }}>Staff Name</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Expected Days</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Present</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Absent</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Late</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Half Day</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Hours Worked</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Hours Missed</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Late Arrival (hrs)</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Early Departure (hrs)</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Attendance Rate</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #374151', fontWeight: '600' }}>Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.staff_reports.map((staff, index) => {
                        const attendanceColor = staff.attendance_rate >= 80 ? '#059669' : staff.attendance_rate >= 60 ? '#d97706' : '#dc2626';
                        return (
                          <tr key={index} style={{ 
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            pageBreakInside: 'avoid',
                            pageBreakAfter: 'auto'
                          }}>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', fontWeight: '500' }}>{staff.staff_name}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{staff.employment_type || 'Full Time'}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: '500' }}>{staff.expected_days}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{staff.present_days}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>{staff.absent_days}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#d97706', fontWeight: '600' }}>{staff.late_days}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#7c3aed', fontWeight: '600' }}>{staff.half_days}</td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#047857', fontWeight: '500' }}>
                              {staff.total_hours_worked} hrs<br/>
                              <span style={{ fontSize: '10px', color: '#6b7280' }}>({staff.total_minutes_worked} min)</span>
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#dc2626', fontWeight: '500' }}>
                              {staff.total_hours_missed} hrs<br/>
                              <span style={{ fontSize: '10px', color: '#6b7280' }}>({staff.total_minutes_missed} min)</span>
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#d97706', fontWeight: '500' }}>
                              {staff.total_late_arrival_hours || 0} hrs<br/>
                              <span style={{ fontSize: '10px', color: '#6b7280' }}>({staff.total_late_arrival_minutes || 0} min)</span>
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#dc2626', fontWeight: '500' }}>
                              {staff.total_early_departure_hours || 0} hrs<br/>
                              <span style={{ fontSize: '10px', color: '#6b7280' }}>({staff.total_early_departure_minutes || 0} min)</span>
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: attendanceColor, fontWeight: '600', fontSize: '13px' }}>
                              {staff.attendance_rate}%
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: attendanceColor, fontWeight: '600', fontSize: '13px' }}>
                              {staff.compliance_rate || staff.attendance_rate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot style={{ display: 'table-footer-group' }}>
                      <tr style={{ backgroundColor: '#f3f4f6', fontWeight: '600', pageBreakInside: 'avoid' }}>
                        <td colSpan="4" style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>TOTALS:</td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#059669' }}>
                          {reportData.staff_reports.reduce((sum, s) => sum + s.present_days, 0)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#dc2626' }}>
                          {reportData.staff_reports.reduce((sum, s) => sum + s.absent_days, 0)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#d97706' }}>
                          {reportData.staff_reports.reduce((sum, s) => sum + s.late_days, 0)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#7c3aed' }}>
                          {reportData.staff_reports.reduce((sum, s) => sum + s.half_days, 0)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#047857' }}>
                          {Math.round((reportData.staff_reports.reduce((sum, s) => sum + s.total_minutes_worked, 0) / 60) * 10) / 10} hrs
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#dc2626' }}>
                          {Math.round((reportData.staff_reports.reduce((sum, s) => sum + s.total_minutes_missed, 0) / 60) * 10) / 10} hrs
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#d97706' }}>
                          {Math.round((reportData.staff_reports.reduce((sum, s) => sum + (s.total_late_arrival_minutes || 0), 0) / 60) * 10) / 10} hrs
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#dc2626' }}>
                          {Math.round((reportData.staff_reports.reduce((sum, s) => sum + (s.total_early_departure_minutes || 0), 0) / 60) * 10) / 10} hrs
                        </td>
                        <td colSpan="2" style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#3b82f6' }}>
                          Overall: {reportData.overall_stats.attendance_rate}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* Report Settings Info */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f0f9ff', 
                  borderRadius: '6px', 
                  border: '1px solid #0ea5e9',
                  fontSize: '12px'
                }}>
                  <strong style={{ color: '#0369a1' }}>Report Settings:</strong>
                  <div style={{ marginTop: '8px', color: '#0c4a6e', lineHeight: '1.8' }}>
                    <div>Expected Work Hours: {reportData.settings.start_time} - {reportData.settings.end_time}</div>
                    <div>Full Time Expected Days: {reportData.settings.full_time_expected_days} days/month</div>
                    <div>Part Time Expected Days: {reportData.settings.part_time_expected_days} days/month</div>
                  </div>
                </div>
              </div>

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