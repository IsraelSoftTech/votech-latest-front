import React, { useState, useEffect, useRef } from 'react';
import './Inventory.css';
import SideTop from './SideTop';
import { FaMoneyBill, FaChartLine, FaCalculator, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import api from '../services/api';
import InventoryReport from './InventoryReport';
import SuccessMessage from './SuccessMessage';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('Income Management');
  const [showModal, setShowModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [expenditureItems, setExpenditureItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expenditureLoading, setExpenditureLoading] = useState(false);
  const [form, setForm] = useState({
    date: '',
    item_name: '',
    department: '',
    quantity: '',
    estimated_cost: '',
  });
  const [expenditureForm, setExpenditureForm] = useState({
    date: '',
    item_name: '',
    department: '',
    quantity: '',
    estimated_cost: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expenditureEditId, setExpenditureEditId] = useState(null);
  const [showExpenditureModal, setShowExpenditureModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('income');

  // Depreciation Rate state
  const [depreciationEdits, setDepreciationEdits] = useState({});
  const [depreciationSaving, setDepreciationSaving] = useState({});

  // Mobile tab modal state
  const [showTabModal, setShowTabModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDisplayModal, setShowReportDisplayModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportPeriod, setReportPeriod] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportMonth, setReportMonth] = useState('');
  const [reportYear, setReportYear] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const reportRef = useRef();

  // Responsive check (simple window width)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper function to format date
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  // Helper function to calculate total income
  function calculateTotalIncome() {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.estimated_cost) || 0);
    }, 0);
  }

  function calculateTotalExpenditure() {
    return expenditureItems.reduce((total, item) => {
      return total + (parseFloat(item.estimated_cost) || 0);
    }, 0);
  }

  const tabs = [
    { id: 'Income Management', label: 'Income Management', icon: <FaMoneyBill /> },
    { id: 'Expenditure Management', label: 'Expenditure Management', icon: <FaChartLine /> },
    { id: 'Depreciation Rate', label: 'Depreciation Rate', icon: <FaCalculator /> },
    { id: 'Reports', label: 'Reports', icon: <FaChartLine /> },
  ];

  useEffect(() => {
    if (activeTab === 'Income Management') {
      fetchItems();
      fetchDepartments();
    } else if (activeTab === 'Expenditure Management') {
      fetchExpenditureItems();
      fetchDepartments();
    }
    // eslint-disable-next-line
  }, [activeTab]);

  // Also fetch specialties on initial mount to populate dropdowns immediately
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function fetchItems() {
    console.log('fetchItems called');
    setLoading(true);
    try {
      const data = await api.getInventory('income');
      console.log('Fetched income items:', data);
      setItems(data);
    } catch (e) {
      console.error('Error fetching income items:', e);
      setError('Failed to fetch items');
    }
    setLoading(false);
  }

  async function fetchExpenditureItems() {
    console.log('fetchExpenditureItems called');
    setExpenditureLoading(true);
    try {
      const data = await api.getInventory('expenditure');
      console.log('Fetched expenditure items:', data);
      setExpenditureItems(data);
    } catch (e) {
      console.error('Error fetching expenditure items:', e);
      setError('Failed to fetch expenditure items');
    }
    setExpenditureLoading(false);
  }

  async function fetchDepartments() {
    try {
      const data = await api.getSpecialties();
      const mapped = Array.isArray(data)
        ? data.map(s => ({ id: s.id, name: typeof s.name === 'string' ? s.name : 'Unknown Specialty' }))
        : [];
      setDepartments(mapped);
    } catch (e) {
      setDepartments([]);
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function openEditModal(item) {
    setEditId(item.id);
    setForm({
      date: item.date,
      item_name: item.item_name,
      department: item.department,
      quantity: item.quantity,
      estimated_cost: item.estimated_cost,
    });
    setShowModal(true);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowSuccess(false);
    if (!form.date || !form.item_name || !form.department || !form.quantity || !form.estimated_cost) {
      setError('All fields are required');
      return;
    }
    try {
      if (editId) {
        await api.editInventoryItem(editId, { ...form, type: 'income' });
        setSuccess('Item updated successfully!');
        setShowSuccess(true);
      } else {
        await api.registerInventoryItem({ ...form, type: 'income' });
        setSuccess('Item registered successfully!');
        setShowSuccess(true);
      }
      setShowModal(false);
      setForm({ date: '', item_name: '', department: '', quantity: '', estimated_cost: '' });
      setEditId(null);
      fetchItems();
    } catch (e) {
      setError(editId ? 'Failed to update item' : 'Failed to register item');
    }
  }

  function handleExpenditureFormChange(e) {
    const { name, value } = e.target;
    setExpenditureForm(f => ({ ...f, [name]: value }));
  }

  function openExpenditureEditModal(item) {
    setExpenditureEditId(item.id);
    setExpenditureForm({
      date: item.date,
      item_name: item.item_name,
      department: item.department,
      quantity: item.quantity,
      estimated_cost: item.estimated_cost,
    });
    setShowExpenditureModal(true);
  }

  async function handleExpenditureRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowSuccess(false);
    if (!expenditureForm.date || !expenditureForm.item_name || !expenditureForm.department || !expenditureForm.quantity || !expenditureForm.estimated_cost) {
      setError('All fields are required');
      return;
    }
    try {
      if (expenditureEditId) {
        await api.editInventoryItem(expenditureEditId, { ...expenditureForm, type: 'expenditure' });
        setSuccess('Expenditure item updated successfully!');
        setShowSuccess(true);
      } else {
        await api.registerInventoryItem({ ...expenditureForm, type: 'expenditure' });
        setSuccess('Expenditure item registered successfully!');
        setShowSuccess(true);
      }
      setShowExpenditureModal(false);
      setExpenditureForm({ date: '', item_name: '', department: '', quantity: '', estimated_cost: '' });
      setExpenditureEditId(null);
      fetchExpenditureItems();
    } catch (e) {
      setError(expenditureEditId ? 'Failed to update expenditure item' : 'Failed to register expenditure item');
    }
  }

  async function handleDelete(id, type = 'income') {
    setItemToDelete(id);
    setDeleteType(type);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    try {
      await api.deleteInventoryItem(itemToDelete);
      setSuccess('Item deleted successfully!');
      setShowSuccess(true);
      if (deleteType === 'income') fetchItems();
      else fetchExpenditureItems();
    } catch (e) {
      setError('Failed to delete item');
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
  }

  function handleModalClose() {
    setShowModal(false);
    setForm({ date: '', item_name: '', department: '', quantity: '', estimated_cost: '' });
    setEditId(null);
  }

  function handleExpenditureModalClose() {
    setShowExpenditureModal(false);
    setExpenditureForm({ date: '', item_name: '', department: '', quantity: '', estimated_cost: '' });
    setExpenditureEditId(null);
  }

  function handleDeleteModalClose() {
    setShowDeleteModal(false);
    setItemToDelete(null);
  }

  // Report generation functions
  function openReportModal() {
    setShowReportModal(true);
    setReportType('');
    setReportPeriod('');
    setReportDate('');
    setReportMonth('');
    setReportYear('');
    setGeneratedReport(null);
  }

  function closeReportModal() {
    setShowReportDisplayModal(false);
    setGeneratedReport(null);
  }

  function closeReportGenerationModal() {
    setShowReportModal(false);
    setReportType('');
    setReportPeriod('');
    setReportDate('');
    setReportMonth('');
    setReportYear('');
    setGeneratedReport(null);
  }

  function generateReport() {
    console.log('generateReport called!');
    console.log('reportType:', reportType);
    console.log('reportPeriod:', reportPeriod);
    console.log('reportDate:', reportDate);
    console.log('reportMonth:', reportMonth);
    console.log('reportYear:', reportYear);
    
    if (!reportType || !reportPeriod) {
      console.log('Validation failed - missing reportType or reportPeriod');
      setError('Please select report type and period');
      return;
    }

    // Additional validation for specific periods
    if (reportPeriod === 'date' && !reportDate) {
      console.log('Validation failed - missing reportDate');
      setError('Please select a date');
      return;
    }
    
    if (reportPeriod === 'month' && (!reportMonth || !reportYear)) {
      console.log('Validation failed - missing reportMonth or reportYear');
      setError('Please select both month and year');
      return;
    }
    
    if (reportPeriod === 'year' && !reportYear) {
      console.log('Validation failed - missing reportYear');
      setError('Please select a year');
      return;
    }

    let filteredIncome = [];
    let filteredExpenditure = [];

    // Debug: Log the data we're working with
    console.log('Items:', items);
    console.log('Expenditure Items:', expenditureItems);
    console.log('Report Period:', reportPeriod);
    console.log('Report Date:', reportDate);
    console.log('Report Month:', reportMonth);
    console.log('Report Year:', reportYear);

    // Filter data based on period
    if (reportPeriod === 'date' && reportDate) {
      console.log('Filtering by date:', reportDate);
      filteredIncome = items.filter(item => {
        // Normalize both dates to YYYY-MM-DD format for comparison
        const itemDateFormatted = formatDate(item.date);
        const selectedDateFormatted = reportDate;
        console.log('Comparing item date:', itemDateFormatted, 'with selected date:', selectedDateFormatted);
        return itemDateFormatted === selectedDateFormatted;
      });
      filteredExpenditure = expenditureItems.filter(item => {
        // Normalize both dates to YYYY-MM-DD format for comparison
        const itemDateFormatted = formatDate(item.date);
        const selectedDateFormatted = reportDate;
        console.log('Comparing expenditure date:', itemDateFormatted, 'with selected date:', selectedDateFormatted);
        return itemDateFormatted === selectedDateFormatted;
      });
    } else if (reportPeriod === 'month' && reportMonth && reportYear) {
      console.log('Filtering by month:', reportMonth, 'year:', reportYear);
      filteredIncome = items.filter(item => {
        const itemDate = new Date(item.date);
        const matches = itemDate.getFullYear() === parseInt(reportYear) && 
                       itemDate.getMonth() + 1 === parseInt(reportMonth);
        console.log('Item date:', item.date, 'Parsed year:', itemDate.getFullYear(), 'Parsed month:', itemDate.getMonth() + 1, 'Matches:', matches);
        return matches;
      });
      filteredExpenditure = expenditureItems.filter(item => {
        const itemDate = new Date(item.date);
        const matches = itemDate.getFullYear() === parseInt(reportYear) && 
                       itemDate.getMonth() + 1 === parseInt(reportMonth);
        console.log('Expenditure date:', item.date, 'Parsed year:', itemDate.getFullYear(), 'Parsed month:', itemDate.getMonth() + 1, 'Matches:', matches);
        return matches;
      });
    } else if (reportPeriod === 'year' && reportYear) {
      console.log('Filtering by year:', reportYear);
      filteredIncome = items.filter(item => {
        const itemDate = new Date(item.date);
        const matches = itemDate.getFullYear() === parseInt(reportYear);
        console.log('Item date:', item.date, 'Parsed year:', itemDate.getFullYear(), 'Matches:', matches);
        return matches;
      });
      filteredExpenditure = expenditureItems.filter(item => {
        const itemDate = new Date(item.date);
        const matches = itemDate.getFullYear() === parseInt(reportYear);
        console.log('Expenditure date:', item.date, 'Parsed year:', itemDate.getFullYear(), 'Matches:', matches);
        return matches;
      });
    }

    console.log('Filtered Income:', filteredIncome);
    console.log('Filtered Expenditure:', filteredExpenditure);

    // Check if we have any data for the selected period
    if (filteredIncome.length === 0 && filteredExpenditure.length === 0) {
      console.log('No data found for the selected period');
      setError(`No data found for the selected period: ${reportPeriod === 'date' ? reportDate : 
                reportPeriod === 'month' ? `${reportMonth}/${reportYear}` : reportYear}`);
      return;
    }

    // Calculate totals
    const totalIncome = filteredIncome.reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);
    const totalExpenditure = filteredExpenditure.reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);
    const netBalance = totalIncome - totalExpenditure;

    // Calculate depreciation for income items
    const incomeWithDepreciation = filteredIncome.map(item => {
      const depreciationRate = parseFloat(item.depreciation_rate) || 0;
      const monthlyDepreciation = (parseFloat(item.estimated_cost) * depreciationRate) / 100;
      const annualDepreciation = monthlyDepreciation * 12;
      return {
        ...item,
        monthlyDepreciation,
        annualDepreciation
      };
    });

    const report = {
      type: reportType,
      period: reportPeriod,
      periodValue: reportPeriod === 'date' ? reportDate : 
                   reportPeriod === 'month' ? `${reportMonth}/${reportYear}` : reportYear,
      totalIncome,
      totalExpenditure,
      netBalance,
      incomeItems: incomeWithDepreciation,
      expenditureItems: filteredExpenditure,
      generatedAt: new Date().toLocaleString()
    };

    console.log('Generated report:', report);
    console.log('Setting generatedReport and opening display modal');
    
    setGeneratedReport(report);
    setShowReportModal(false); // Close the report generation modal
    setShowReportDisplayModal(true); // Open the report display modal
    
    console.log('Modal state changes completed');
  }

  function handleDepreciationChange(id, value) {
    setDepreciationEdits(edits => ({ ...edits, [id]: value }));
  }

  async function saveDepreciationRate(id) {
    setDepreciationSaving(s => ({ ...s, [id]: true }));
    try {
      const item = items.find(i => i.id === id);
      await api.editInventoryItem(id, { ...item, depreciation_rate: depreciationEdits[id], type: 'income' });
      setSuccess('Depreciation rate saved!');
      setShowSuccess(true);
      fetchItems();
    } catch (e) {
      setError('Failed to save depreciation rate');
    }
    setDepreciationSaving(s => ({ ...s, [id]: false }));
  }

  return (
    <SideTop>
      <div className="inventory-container">
        <h2>Inventory Management</h2>
        
        {/* Summary Cards */}
        <div className="inventory-cards">
          <div className="inventory-card income">
            <div className="card-icon">
              <FaMoneyBill />
            </div>
            <div className="card-content">
              <div className="card-title">Total Income</div>
              <div className="card-value">XAF {calculateTotalIncome().toLocaleString()}</div>
            </div>
          </div>
          <div className="inventory-card expenditure">
            <div className="card-icon">
              <FaChartLine />
            </div>
            <div className="card-content">
              <div className="card-title">Total Expenditure</div>
              <div className="card-value">XAF {calculateTotalExpenditure().toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Sub Tabs */}
        {isMobile ? (
          <div style={{ marginBottom: 32 }}>
            <button className="mobile-tab-trigger" onClick={() => setShowTabModal(true)}>
              <FaChartLine /> View Tabs
            </button>
            {showTabModal && (
              <div className="modal-overlay" onClick={() => setShowTabModal(false)}>
                <div className="mobile-tab-content" onClick={e => e.stopPropagation()}>
                  <div className="mobile-tab-header">
                    <h3>Select Tab</h3>
                  </div>
                  <div className="mobile-tab-list">
                    {tabs.map(tab => (
                      <div key={tab.id} className="mobile-tab-item">
                        <button
                          className={`tab-button${activeTab === tab.id ? ' active' : ''}`}
                          onClick={() => { setActiveTab(tab.id); setShowTabModal(false); }}
                        >
                          <span className="tab-icon">{tab.icon}</span>
                          <span className="tab-label">{tab.label}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mobile-tab-close"
                    onClick={() => setShowTabModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="inventory-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'Income Management' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3>Income Management</h3>
                <button className="register-btn" onClick={() => setShowModal(true)}><FaPlus /> Register Item</button>
              </div>
              {error && <div className="error-message">{error}</div>}
              {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}
              {/* Modal */}
              {showModal && (
                <div className="modal-overlay" onClick={handleModalClose}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>{editId ? 'Edit Income Item' : 'Register Income Item'}</h3>
                    <form onSubmit={handleRegister} className="register-form">
                      <label>Date<input type="date" name="date" value={form.date} onChange={handleFormChange} required /></label>
                      <label>Item Name<input type="text" name="item_name" value={form.item_name} onChange={handleFormChange} required /></label>
                      <label>Department
                        <select name="department" value={form.department} onChange={handleFormChange} required>
                          <option value="">Select Department</option>
                          {departments && departments.length > 0
                            ? departments.map((d) => (
                                <option key={d.id || d.name} value={d.name}>{d.name}</option>
                              ))
                            : <option value="" disabled>No specialties available</option>
                          }
                        </select>
                      </label>
                      <label>Quantity or Number<input type="number" name="quantity" value={form.quantity} onChange={handleFormChange} min="1" required /></label>
                      <label>Estimated Cost<input type="number" name="estimated_cost" value={form.estimated_cost} onChange={handleFormChange} min="0" step="0.01" required /></label>
                      <div className="form-actions">
                        <button type="submit" className="register-btn">{editId ? 'Update' : 'Register'}</button>
                        <button type="button" className="cancel-btn" onClick={handleModalClose}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              {/* Delete Confirmation Modal */}
              {showDeleteModal && (
                <div className="modal-overlay" onClick={handleDeleteModalClose}>
                  <div className="modal-content delete-confirmation" onClick={e => e.stopPropagation()}>
                    <h3>Confirm Delete</h3>
                    <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                    <div className="form-actions">
                      <button type="button" className="delete-btn" onClick={confirmDelete}>Delete</button>
                      <button type="button" className="cancel-btn" onClick={handleDeleteModalClose}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Table */}
              <div className="inventory-table-wrapper">
                {loading ? <div>Loading...</div> : (
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item Name</th>
                        <th>Department</th>
                        <th>Quantity</th>
                        <th>Estimated Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>No items found.</td></tr>
                      ) : items.map(item => (
                        <tr key={item.id}>
                          <td>{formatDate(item.date)}</td>
                          <td>{item.item_name}</td>
                          <td>{item.department}</td>
                          <td>{item.quantity}</td>
                          <td>XAF {Number(item.estimated_cost).toLocaleString()}</td>
                          <td>
                            <button className="action-btn edit" title="Edit" onClick={() => openEditModal(item)}><FaEdit /></button>
                            <button className="action-btn delete" title="Delete" onClick={() => handleDelete(item.id)}><FaTrash /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'Expenditure Management' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3>Expenditure Management</h3>
                <button className="register-btn" onClick={() => setShowExpenditureModal(true)}><FaPlus /> Register Item</button>
              </div>
              {error && <div className="error-message">{error}</div>}
              {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}
              {/* Expenditure Modal */}
              {showExpenditureModal && (
                <div className="modal-overlay" onClick={handleExpenditureModalClose}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>{expenditureEditId ? 'Edit Expenditure Item' : 'Register Expenditure Item'}</h3>
                    <form onSubmit={handleExpenditureRegister} className="register-form">
                      <label>Date<input type="date" name="date" value={expenditureForm.date} onChange={handleExpenditureFormChange} required /></label>
                      <label>Item Name<input type="text" name="item_name" value={expenditureForm.item_name} onChange={handleExpenditureFormChange} required /></label>
                      <label>Department
                        <select name="department" value={expenditureForm.department} onChange={handleExpenditureFormChange} required>
                          <option value="">Select Department</option>
                          {departments && departments.length > 0
                            ? departments.map((d) => (
                                <option key={d.id || d.name} value={d.name}>{d.name}</option>
                              ))
                            : <option value="" disabled>No specialties available</option>
                          }
                        </select>
                      </label>
                      <label>Quantity or Number<input type="number" name="quantity" value={expenditureForm.quantity} onChange={handleExpenditureFormChange} min="1" required /></label>
                      <label>Estimated Cost<input type="number" name="estimated_cost" value={expenditureForm.estimated_cost} onChange={handleExpenditureFormChange} min="0" step="0.01" required /></label>
                      <div className="form-actions">
                        <button type="submit" className="register-btn">{expenditureEditId ? 'Update' : 'Register'}</button>
                        <button type="button" className="cancel-btn" onClick={handleExpenditureModalClose}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              {/* Delete Confirmation Modal (shared) */}
              {showDeleteModal && (
                <div className="modal-overlay" onClick={handleDeleteModalClose}>
                  <div className="modal-content delete-confirmation" onClick={e => e.stopPropagation()}>
                    <h3>Confirm Delete</h3>
                    <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                    <div className="form-actions">
                      <button type="button" className="delete-btn" onClick={confirmDelete}>Delete</button>
                      <button type="button" className="cancel-btn" onClick={handleDeleteModalClose}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Expenditure Table */}
              <div className="inventory-table-wrapper">
                {expenditureLoading ? <div>Loading...</div> : (
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item Name</th>
                        <th>Department</th>
                        <th>Quantity</th>
                        <th>Estimated Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenditureItems.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>No items found.</td></tr>
                      ) : expenditureItems.map(item => (
                        <tr key={item.id}>
                          <td>{formatDate(item.date)}</td>
                          <td>{item.item_name}</td>
                          <td>{item.department}</td>
                          <td>{item.quantity}</td>
                          <td>XAF {Number(item.estimated_cost).toLocaleString()}</td>
                          <td>
                            <button className="action-btn edit" title="Edit" onClick={() => openExpenditureEditModal(item)}><FaEdit /></button>
                            <button className="action-btn delete" title="Delete" onClick={() => handleDelete(item.id, 'expenditure')}><FaTrash /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'Depreciation Rate' && (
            <div className="tab-panel">
              <h3>Depreciation Rate</h3>
              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item Name</th>
                      <th>Department</th>
                      <th>Quantity</th>
                      <th>Estimated Cost</th>
                      <th>Monthly Depreciation Rate (%)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center' }}>No items found.</td></tr>
                    ) : items.map(item => (
                      <tr key={item.id}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.item_name}</td>
                        <td>{item.department}</td>
                        <td>{item.quantity}</td>
                        <td>XAF {Number(item.estimated_cost).toLocaleString()}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={depreciationEdits[item.id] !== undefined ? depreciationEdits[item.id] : (item.depreciation_rate || '')}
                            onChange={e => handleDepreciationChange(item.id, e.target.value)}
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>
                          <button
                            className="register-btn"
                            style={{ padding: '6px 14px', fontSize: 14 }}
                            disabled={depreciationSaving[item.id]}
                            onClick={() => saveDepreciationRate(item.id)}
                          >
                            {depreciationSaving[item.id] ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'Reports' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3>Reports</h3>
                <button className="register-btn" onClick={openReportModal}>
                  <FaPlus /> Print Report
                </button>
              </div>
              
              {/* Report Generation Modal */}
              {showReportModal && (
                <div className="modal-overlay" onClick={closeReportGenerationModal}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>Generate Report</h3>
                    <div className="report-form">
                      <div className="form-group">
                        <label>Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)}>
                          <option value="">Select Report Type</option>
                          <option value="income">Income Report</option>
                          <option value="expenditure">Expenditure Report</option>
                          <option value="full">Full Report</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Period</label>
                        <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)}>
                          <option value="">Select Period</option>
                          <option value="date">Specific Date</option>
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                        </select>
                      </div>
                      
                      {reportPeriod === 'date' && (
                        <div className="form-group">
                          <label>Select Date</label>
                          <input 
                            type="date" 
                            value={reportDate} 
                            onChange={e => setReportDate(e.target.value)}
                          />
                        </div>
                      )}
                      
                      {reportPeriod === 'month' && (
                        <div className="form-row">
                          <div className="form-group">
                            <label>Month</label>
                            <select value={reportMonth} onChange={e => setReportMonth(e.target.value)}>
                              <option value="">Select Month</option>
                              {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>
                                  {new Date(2024, month - 1).toLocaleDateString('en-US', {month: 'long'})}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Year</label>
                            <select value={reportYear} onChange={e => setReportYear(e.target.value)}>
                              <option value="">Select Year</option>
                              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {reportPeriod === 'year' && (
                        <div className="form-group">
                          <label>Year</label>
                          <select value={reportYear} onChange={e => setReportYear(e.target.value)}>
                            <option value="">Select Year</option>
                            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div className="form-actions">
                        <button 
                          type="button" 
                          className="register-btn" 
                          onClick={() => {
                            console.log('Generate Report button clicked!');
                            generateReport();
                          }}
                          disabled={!reportType || !reportPeriod || 
                                   (reportPeriod === 'date' && !reportDate) ||
                                   (reportPeriod === 'month' && (!reportMonth || !reportYear)) ||
                                   (reportPeriod === 'year' && !reportYear)}
                        >
                          Generate Report
                        </button>
                        <button type="button" className="cancel-btn" onClick={closeReportGenerationModal}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Report Modal */}
              {showReportDisplayModal && generatedReport && (
                <div className="inventory-report-modal-overlay" onClick={closeReportModal}>
                  <div className="inventory-report-modal-content" onClick={e => e.stopPropagation()}>
                    <InventoryReport ref={reportRef} report={generatedReport} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SideTop>
  );
} 