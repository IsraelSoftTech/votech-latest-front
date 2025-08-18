import React, { useState, useEffect, useRef } from 'react';
import './Inventory.css';
import SideTop from './SideTop';
import { 
  FaMoneyBill, FaChartLine, FaCalculator, FaPlus, FaTrash, FaEdit, 
  FaBuilding, FaBoxes, FaFileInvoiceDollar, FaChartBar, FaCog,
  FaEye, FaDownload, FaPrint, FaCalendarAlt, FaDollarSign
} from 'react-icons/fa';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Inventory() {
  // State Management
  const [activeTab, setActiveTab] = useState('Income Management');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Data States
  const [inventoryItems, setInventoryItems] = useState([]);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [assetCategories, setAssetCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);

  // Modal States
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAssetCategoryModal, setShowAssetCategoryModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptType, setReceiptType] = useState('');

  // Form States
  const [inventoryForm, setInventoryForm] = useState({
    date: '',
    item_name: '',
    department: '',
    quantity: '',
    estimated_cost: '',
    type: 'income',
    budget_head_id: '',
    asset_category: '',
    purchase_date: '',
    supplier: '',
    warranty_expiry: '',
    location: '',
    condition: 'new',
    depreciation_rate: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    name: '',
    code: '',
    category: 'expenditure',
    description: '',
    allocated_amount: ''
  });

  const [assetCategoryForm, setAssetCategoryForm] = useState({
    name: '',
    description: '',
    default_depreciation_rate: '',
    useful_life_years: ''
  });

  const [depreciationForm, setDepreciationForm] = useState({
    month: '',
    year: ''
  });

  // Edit States
  const [editingItem, setEditingItem] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingAssetCategory, setEditingAssetCategory] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Refs
  const reportRef = useRef();
  const receiptRef = useRef();

  // Responsive handling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Success message handling
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Data fetching
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [inventory, budget, assets, depts] = await Promise.all([
        api.getInventory(),
        api.getBudgetHeads(),
        api.getAssetCategories(),
        api.getSpecialties()
      ]);
      
      setInventoryItems(inventory);
      setBudgetHeads(budget);
      setAssetCategories(assets);
      setDepartments(depts.map(d => ({ id: d.id, name: d.name })));
    } catch (error) {
      setError('Failed to fetch initial data');
      console.error(error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const summary = await api.getFinancialSummary({ 
        period: 'month', 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
      });
      setFinancialSummary(summary);
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      const balance = await api.getBalanceSheet();
      setBalanceSheet(balance);
    } catch (error) {
      console.error('Failed to fetch balance sheet:', error);
    }
  };

  // Form handlers
  const handleInventoryFormChange = (e) => {
    const { name, value } = e.target;
    setInventoryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBudgetFormChange = (e) => {
    const { name, value } = e.target;
    setBudgetForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAssetCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setAssetCategoryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDepreciationFormChange = (e) => {
    const { name, value } = e.target;
    setDepreciationForm(prev => ({ ...prev, [name]: value }));
  };

  // CRUD Operations
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingItem) {
        await api.editInventoryItem(editingItem.id, inventoryForm);
        setSuccess('Inventory item updated successfully!');
      } else {
        await api.registerInventoryItem(inventoryForm);
        setSuccess('Inventory item registered successfully!');
      }
      
        setShowSuccess(true);
      setShowInventoryModal(false);
      resetInventoryForm();
      fetchInitialData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingBudget) {
        await api.updateBudgetHead(editingBudget.id, budgetForm);
        setSuccess('Budget head updated successfully!');
      } else {
        await api.createBudgetHead(budgetForm);
        setSuccess('Budget head created successfully!');
      }
      
      setShowSuccess(true);
      setShowBudgetModal(false);
      resetBudgetForm();
      fetchInitialData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAssetCategorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingAssetCategory) {
        await api.updateAssetCategory(editingAssetCategory.id, assetCategoryForm);
        setSuccess('Asset category updated successfully!');
      } else {
        await api.createAssetCategory(assetCategoryForm);
        setSuccess('Asset category created successfully!');
      }
      
      setShowSuccess(true);
      setShowAssetCategoryModal(false);
      resetAssetCategoryForm();
      fetchInitialData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteInventoryItem(itemToDelete.id);
      setSuccess('Item deleted successfully!');
      setShowSuccess(true);
    setShowDeleteModal(false);
    setItemToDelete(null);
      fetchInitialData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDepreciationCalculation = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await api.calculateDepreciation(
        parseInt(depreciationForm.month),
        parseInt(depreciationForm.year)
      );
      setSuccess(`Depreciation calculated successfully! ${result.records_processed} records processed.`);
      setShowSuccess(true);
      setShowDepreciationModal(false);
      setDepreciationForm({ month: '', year: '' });
      fetchInitialData();
    } catch (error) {
      setError(error.message);
    }
  };

  // Form reset functions
  const resetInventoryForm = () => {
    setInventoryForm({
      date: '',
      item_name: '',
      department: '',
      quantity: '',
      estimated_cost: '',
      type: 'income',
      budget_head_id: '',
      asset_category: '',
      purchase_date: '',
      supplier: '',
      warranty_expiry: '',
      location: '',
      condition: 'new',
      depreciation_rate: ''
    });
    setEditingItem(null);
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      name: '',
      code: '',
      category: 'expenditure',
      description: '',
      allocated_amount: ''
    });
    setEditingBudget(null);
  };

  const resetAssetCategoryForm = () => {
    setAssetCategoryForm({
      name: '',
      description: '',
      default_depreciation_rate: '',
      useful_life_years: ''
    });
    setEditingAssetCategory(null);
  };

  // Edit functions
  const openEditInventory = (item) => {
    setEditingItem(item);
    setInventoryForm({
      date: item.date,
      item_name: item.item_name,
      department: item.department,
      quantity: item.quantity,
      estimated_cost: item.estimated_cost,
      type: item.type,
      budget_head_id: item.budget_head_id || '',
      asset_category: item.asset_category || '',
      purchase_date: item.purchase_date || '',
      supplier: item.supplier || '',
      warranty_expiry: item.warranty_expiry || '',
      location: item.location || '',
      condition: item.condition || 'new',
      depreciation_rate: item.depreciation_rate || ''
    });
    setShowInventoryModal(true);
  };

  const openEditBudget = (budget) => {
    setEditingBudget(budget);
    setBudgetForm({
      name: budget.name,
      code: budget.code || '',
      category: budget.category,
      description: budget.description || '',
      allocated_amount: budget.allocated_amount || ''
    });
    setShowBudgetModal(true);
  };

  const openEditAssetCategory = (category) => {
    setEditingAssetCategory(category);
    setAssetCategoryForm({
      name: category.name,
      description: category.description || '',
      default_depreciation_rate: category.default_depreciation_rate || '',
      useful_life_years: category.useful_life_years || ''
    });
    setShowAssetCategoryModal(true);
  };

  // Delete functions
  const handleDeleteBudgetHead = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget head? This action cannot be undone.')) {
      try {
        await api.deleteBudgetHead(id);
        setSuccess('Budget head deleted successfully!');
        setShowSuccess(true);
        fetchInitialData();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleDeleteAssetCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset category? This action cannot be undone.')) {
      try {
        await api.deleteAssetCategory(id);
        setSuccess('Asset category deleted successfully!');
        setShowSuccess(true);
        fetchInitialData();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  // PDF Generation Functions
  const generateFinancialSummaryPDF = async () => {
    if (!financialSummary) return;
    
    setReceiptData(financialSummary);
    setReceiptType('financial_summary');
    setShowReceiptModal(true);
  };

  const generateBalanceSheetPDF = async () => {
    if (!balanceSheet) return;
    
    setReceiptData(balanceSheet);
    setReceiptType('balance_sheet');
    setShowReceiptModal(true);
  };

  const generateMonthlyReport = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const summary = await api.getFinancialSummary({ 
        period: 'month', 
        month: month, 
        year: year 
      });
      
      setFinancialSummary(summary);
      setSuccess('Monthly report generated successfully!');
      setShowSuccess(true);
    } catch (error) {
      setError('Failed to generate monthly report: ' + error.message);
    }
  };

  const generateYearlyReport = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      
      const summary = await api.getFinancialSummary({ 
        period: 'year', 
        year: year 
      });
      
      setFinancialSummary(summary);
      setSuccess('Yearly report generated successfully!');
      setShowSuccess(true);
    } catch (error) {
      setError('Failed to generate yearly report: ' + error.message);
    }
  };

  // Download Receipt as PDF
  const downloadReceiptPDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      // Temporarily hide the download button
      const downloadBtn = document.querySelector('.download-pdf-btn');
      const originalDisplay = downloadBtn ? downloadBtn.style.display : '';
      if (downloadBtn) {
        downloadBtn.style.display = 'none';
      }
      
      // Get the receipt element
      const receiptElement = receiptRef.current;
      
      // Temporarily remove height constraints and ensure full content is visible
      const originalStyles = {
        height: receiptElement.style.height,
        maxHeight: receiptElement.style.maxHeight,
        overflow: receiptElement.style.overflow,
        position: receiptElement.style.position
      };
      
      // Set styles to ensure full content capture
      receiptElement.style.height = 'auto';
      receiptElement.style.maxHeight = 'none';
      receiptElement.style.overflow = 'visible';
      receiptElement.style.position = 'relative';
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the actual dimensions of the content
      const contentHeight = receiptElement.scrollHeight;
      const contentWidth = receiptElement.scrollWidth;
      
      // Log dimensions for debugging
      console.log('Receipt dimensions:', { contentWidth, contentHeight });
      
      // Capture the receipt content with proper dimensions
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: contentWidth,
        height: contentHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        logging: false,
        removeContainer: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure the cloned element has the same dimensions
          const clonedElement = clonedDoc.querySelector('.receipt-template');
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.position = 'relative';
            clonedElement.style.width = '100%';
            clonedElement.style.display = 'block';
          }
        }
      });
      
      // Log canvas dimensions for debugging
      console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height });
      
      // Restore original styles
      receiptElement.style.height = originalStyles.height;
      receiptElement.style.maxHeight = originalStyles.maxHeight;
      receiptElement.style.overflow = originalStyles.overflow;
      receiptElement.style.position = originalStyles.position;
      
      // Restore the download button
      if (downloadBtn) {
        downloadBtn.style.display = originalDisplay;
      }
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with proper dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // A4 width minus margins (210mm - 20mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Calculate if we need multiple pages
      const pageHeight = 277; // A4 height minus margins (297mm - 20mm)
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if content is too long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${receiptType}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      setSuccess('PDF downloaded successfully!');
      setShowSuccess(true);
    } catch (error) {
      console.error('PDF generation error:', error);
      setError('Failed to generate PDF: ' + error.message);
      
      // Restore the download button in case of error
      const downloadBtn = document.querySelector('.download-pdf-btn');
      if (downloadBtn) {
        downloadBtn.style.display = '';
      }
      
      // Also restore original styles in case of error
      if (receiptRef.current) {
        const receiptElement = receiptRef.current;
        receiptElement.style.height = '';
        receiptElement.style.maxHeight = '';
        receiptElement.style.overflow = '';
        receiptElement.style.position = '';
      }
    }
  };

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getFilteredInventory = (type) => {
    return inventoryItems.filter(item => item.type === type);
  };

  const calculateTotalValue = (type) => {
    return getFilteredInventory(type).reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);
  };

  // Tab configuration
  const tabs = [
    { id: 'Income Management', label: 'Income Management', icon: <FaMoneyBill /> },
    { id: 'Expenditure Management', label: 'Expenditure Management', icon: <FaChartLine /> },
    { id: 'Budget Heads', label: 'Budget Heads', icon: <FaBuilding /> },
    { id: 'Asset Categories', label: 'Asset Categories', icon: <FaBoxes /> },
    { id: 'Depreciation Management', label: 'Depreciation Management', icon: <FaCalculator /> },
    { id: 'Financial Reports', label: 'Financial Reports', icon: <FaFileInvoiceDollar /> }
  ];

  return (
    <SideTop>
      <div className="inventory-container">
        <div className="inventory-header">
          <h1>Inventory Management System</h1>
          <p>Comprehensive financial tracking, asset management, and reporting</p>
        </div>

        {/* Success Message */}
        {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')} className="error-close">×</button>
              </div>
            )}

        {/* Navigation Tabs */}
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

        {/* Tab Content */}
        <div className="tab-content">
          {/* Income Management */}
          {activeTab === 'Income Management' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Income Management</h3>
                <button className="primary-btn" onClick={() => setShowInventoryModal(true)}>
                  <FaPlus /> Register Income Item
                </button>
              </div>
              
              <div className="inventory-table-container">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item Name</th>
                        <th>Department</th>
                      <th>Budget Head</th>
                      <th>Asset Category</th>
                        <th>Quantity</th>
                      <th>Cost</th>
                      <th>Depreciation Rate</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                    {getFilteredInventory('income').map(item => (
                        <tr key={item.id}>
                          <td>{formatDate(item.date)}</td>
                          <td>{item.item_name}</td>
                          <td>{item.department}</td>
                        <td>{item.budget_head_name || '-'}</td>
                        <td>{item.asset_category || '-'}</td>
                          <td>{item.quantity}</td>
                        <td>{formatCurrency(item.estimated_cost)}</td>
                        <td>{item.depreciation_rate ? `${item.depreciation_rate}%` : '-'}</td>
                        <td className="actions">
                          <button onClick={() => openEditInventory(item)} className="action-btn edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => { setItemToDelete(item); setShowDeleteModal(true); }} className="action-btn delete">
                            <FaTrash />
                          </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          )}
          
          {/* Expenditure Management */}
          {activeTab === 'Expenditure Management' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Expenditure Management</h3>
                <button className="primary-btn" onClick={() => {
                  setInventoryForm(prev => ({ ...prev, type: 'expenditure' }));
                  setShowInventoryModal(true);
                }}>
                  <FaPlus /> Register Expenditure Item
                </button>
              </div>
              
              <div className="inventory-table-container">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item Name</th>
                        <th>Department</th>
                      <th>Budget Head</th>
                        <th>Quantity</th>
                      <th>Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                    {getFilteredInventory('expenditure').map(item => (
                        <tr key={item.id}>
                          <td>{formatDate(item.date)}</td>
                          <td>{item.item_name}</td>
                          <td>{item.department}</td>
                        <td>{item.budget_head_name || '-'}</td>
                          <td>{item.quantity}</td>
                        <td>{formatCurrency(item.estimated_cost)}</td>
                        <td className="actions">
                          <button onClick={() => openEditInventory(item)} className="action-btn edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => { setItemToDelete(item); setShowDeleteModal(true); }} className="action-btn delete">
                            <FaTrash />
                          </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          )}

          {/* Budget Heads Management */}
          {activeTab === 'Budget Heads' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Budget Heads Management</h3>
                <button className="primary-btn" onClick={() => setShowBudgetModal(true)}>
                  <FaPlus /> Create Budget Head
                </button>
              </div>
              
              <div className="budget-heads-grid">
                {budgetHeads.length === 0 ? (
                  <div className="no-data-message">
                    <p>No budget heads created yet. Click "Create Budget Head" to get started.</p>
                  </div>
                ) : (
                  budgetHeads.map(budget => (
                    <div key={budget.id} className="budget-head-card">
                      <div className="budget-header">
                        <h4>{budget.name}</h4>
                        <span className={`budget-category ${budget.category}`}>{budget.category}</span>
                      </div>
                      <div className="budget-details">
                        <p><strong>Code:</strong> {budget.code || 'N/A'}</p>
                        <p><strong>Allocated Amount:</strong> {formatCurrency(budget.allocated_amount)}</p>
                        <p><strong>Description:</strong> {budget.description || 'No description'}</p>
                      </div>
                      <div className="budget-actions">
                        <button onClick={() => openEditBudget(budget)} className="action-btn edit">
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteBudgetHead(budget.id)} 
                          className="action-btn delete"
                          style={{ display: 'inline-flex', marginLeft: '8px' }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Asset Categories Management */}
          {activeTab === 'Asset Categories' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Asset Categories Management</h3>
                <button className="primary-btn" onClick={() => setShowAssetCategoryModal(true)}>
                  <FaPlus /> Create Asset Category
                </button>
              </div>
              
              <div className="asset-categories-grid">
                {assetCategories.length === 0 ? (
                  <div className="no-data-message">
                    <p>No asset categories created yet. Click "Create Asset Category" to get started.</p>
                  </div>
                ) : (
                  assetCategories.map(category => (
                    <div key={category.id} className="asset-category-card">
                      <div className="category-header">
                        <h4>{category.name}</h4>
                      </div>
                      <div className="category-details">
                        <p><strong>Default Depreciation Rate:</strong> {category.default_depreciation_rate}%</p>
                        <p><strong>Useful Life:</strong> {category.useful_life_years} years</p>
                        <p><strong>Description:</strong> {category.description || 'No description'}</p>
                      </div>
                      <div className="category-actions">
                        <button onClick={() => openEditAssetCategory(category)} className="action-btn edit">
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteAssetCategory(category.id)} 
                          className="action-btn delete"
                          style={{ display: 'inline-flex', marginLeft: '8px' }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Depreciation Management */}
          {activeTab === 'Depreciation Management' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Depreciation Management</h3>
                <button className="primary-btn" onClick={() => setShowDepreciationModal(true)}>
                  <FaCalculator /> Calculate Depreciation
                </button>
              </div>
              
              <div className="depreciation-info">
                <h4>Asset Depreciation Overview</h4>
                <p>Calculate monthly depreciation for all assets with depreciation rates set.</p>
                
                <div className="depreciation-stats">
                  <div className="stat-item">
                    <span>Assets with Depreciation:</span>
                    <span>{inventoryItems.filter(item => item.type === 'income' && item.depreciation_rate > 0).length}</span>
                  </div>
                  <div className="stat-item">
                    <span>Total Asset Value:</span>
                    <span>{formatCurrency(calculateTotalValue('income'))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Reports */}
          {activeTab === 'Financial Reports' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Financial Reports</h3>
                <div className="report-actions">
                  <button className="primary-btn" onClick={() => fetchFinancialSummary()}>
                    <FaChartBar /> Refresh Summary
                  </button>
                  <button className="primary-btn" onClick={() => fetchBalanceSheet()}>
                    <FaFileInvoiceDollar /> Refresh Balance Sheet
                  </button>
                </div>
              </div>
              
              <div className="reports-section">
                {/* Financial Summary Report */}
                <div className="report-card">
                  <h4>Financial Summary Report</h4>
                  <p>Monthly income, expenditure, and net balance overview</p>
                  
                  {financialSummary ? (
                    <div className="financial-summary-content">
                      <div className="summary-period">
                        <strong>Period:</strong> {financialSummary.period_value}
                      </div>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span>Total Income:</span>
                          <span className="amount positive">{formatCurrency(financialSummary.income)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Expenditure:</span>
                          <span className="amount negative">{formatCurrency(financialSummary.expenditure)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Asset Purchases:</span>
                          <span className="amount neutral">{formatCurrency(financialSummary.asset_purchase)}</span>
                        </div>
                        <div className="summary-item total">
                          <span>Net Balance:</span>
                          <span className={`amount ${financialSummary.net_balance >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(financialSummary.net_balance)}
                          </span>
                        </div>
                      </div>
                      <button className="secondary-btn" onClick={() => generateFinancialSummaryPDF()}>
                        <FaDownload /> Download Summary PDF
                      </button>
                    </div>
                  ) : (
                    <div className="no-data-message">
                      <p>No financial summary available. Click "Refresh Summary" to generate.</p>
                    </div>
                  )}
                </div>
                
                {/* Balance Sheet Report */}
                <div className="report-card">
                  <h4>Balance Sheet Report</h4>
                  <p>Current financial position and asset valuation</p>
                  
                  {balanceSheet ? (
                    <div className="balance-sheet-content">
                      <div className="balance-sheet-date">
                        <strong>As of:</strong> {formatDate(balanceSheet.as_of_date)}
                      </div>
                      
                      <div className="balance-sheet-sections">
                        <div className="balance-section">
                          <h5>Assets</h5>
                          <div className="balance-item">
                            <span>Total Assets:</span>
                            <span>{formatCurrency(balanceSheet.assets.total_assets)}</span>
                          </div>
                          <div className="balance-item">
                            <span>Current Value:</span>
                            <span>{formatCurrency(balanceSheet.assets.current_value)}</span>
                          </div>
                          <div className="balance-item">
                            <span>Depreciation:</span>
                            <span>{formatCurrency(balanceSheet.assets.depreciation)}</span>
                          </div>
                        </div>
                        
                        <div className="balance-section">
                          <h5>Liabilities</h5>
                          <div className="balance-item">
                            <span>Total Liabilities:</span>
                            <span>{formatCurrency(balanceSheet.liabilities.total_liabilities)}</span>
                          </div>
                        </div>
                        
                        <div className="balance-section">
                          <h5>Equity</h5>
                          <div className="balance-item">
                            <span>Total Income:</span>
                            <span>{formatCurrency(balanceSheet.equity.total_income)}</span>
                          </div>
                          <div className="balance-item">
                            <span>Total Expenditures:</span>
                            <span>{formatCurrency(balanceSheet.equity.total_expenditures)}</span>
                          </div>
                          <div className="balance-item total">
                            <span>Net Equity:</span>
                            <span>{formatCurrency(balanceSheet.equity.net_equity)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="balance-totals">
                        <div className="total-item">
                          <span>Assets + Equity:</span>
                          <span>{formatCurrency(balanceSheet.totals.assets_plus_equity)}</span>
                        </div>
                        <div className="total-item">
                          <span>Liabilities + Equity:</span>
                          <span>{formatCurrency(balanceSheet.totals.liabilities_plus_equity)}</span>
                        </div>
                      </div>
                      
                      <button className="secondary-btn" onClick={() => generateBalanceSheetPDF()}>
                        <FaDownload /> Download Balance Sheet PDF
                      </button>
                    </div>
                  ) : (
                    <div className="no-data-message">
                      <p>No balance sheet available. Click "Refresh Balance Sheet" to generate.</p>
                    </div>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="report-card">
                  <h4>Quick Actions</h4>
                  <p>Generate reports for specific periods</p>
                  
                  <div className="quick-actions">
                    <button className="secondary-btn" onClick={() => setShowReportModal(true)}>
                      <FaCalendarAlt /> Custom Period Report
                    </button>
                    <button className="secondary-btn" onClick={() => generateMonthlyReport()}>
                      <FaChartBar /> Monthly Report
                    </button>
                    <button className="secondary-btn" onClick={() => generateYearlyReport()}>
                      <FaFileInvoiceDollar /> Yearly Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Modal */}
        {showInventoryModal && (
          <div className="modal-overlay" onClick={() => setShowInventoryModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>{editingItem ? 'Edit Inventory Item' : 'Register Inventory Item'}</h3>
              <form onSubmit={handleInventorySubmit} className="inventory-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      name="date"
                      value={inventoryForm.date}
                      onChange={handleInventoryFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Type *</label>
                    <select
                      name="type"
                      value={inventoryForm.type}
                      onChange={handleInventoryFormChange}
                      required
                    >
                      <option value="income">Income</option>
                      <option value="expenditure">Expenditure</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Item Name *</label>
                    <input
                      type="text"
                      name="item_name"
                      value={inventoryForm.item_name}
                      onChange={handleInventoryFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      name="department"
                      value={inventoryForm.department}
                      onChange={handleInventoryFormChange}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                          <input
                            type="number"
                      name="quantity"
                      value={inventoryForm.quantity}
                      onChange={handleInventoryFormChange}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Estimated Cost *</label>
                    <input
                      type="number"
                      name="estimated_cost"
                      value={inventoryForm.estimated_cost}
                      onChange={handleInventoryFormChange}
                            min="0"
                            step="0.01"
                      required
                    />
                  </div>
                </div>

                {inventoryForm.type === 'income' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Budget Head</label>
                        <select
                          name="budget_head_id"
                          value={inventoryForm.budget_head_id}
                          onChange={handleInventoryFormChange}
                        >
                          <option value="">Select Budget Head</option>
                          {budgetHeads.filter(bh => bh.category === 'income').map(bh => (
                            <option key={bh.id} value={bh.id}>{bh.name}</option>
                          ))}
                        </select>
              </div>
                      <div className="form-group">
                        <label>Asset Category</label>
                        <select
                          name="asset_category"
                          value={inventoryForm.asset_category}
                          onChange={handleInventoryFormChange}
                        >
                          <option value="">Select Asset Category</option>
                          {assetCategories.map(ac => (
                            <option key={ac.id} value={ac.name}>{ac.name}</option>
                          ))}
                        </select>
            </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Purchase Date</label>
                        <input
                          type="date"
                          name="purchase_date"
                          value={inventoryForm.purchase_date}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Depreciation Rate (%)</label>
                        <input
                          type="number"
                          name="depreciation_rate"
                          value={inventoryForm.depreciation_rate}
                          onChange={handleInventoryFormChange}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Supplier</label>
                        <input
                          type="text"
                          name="supplier"
                          value={inventoryForm.supplier}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Location</label>
                        <input
                          type="text"
                          name="location"
                          value={inventoryForm.location}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Warranty Expiry</label>
                        <input
                          type="date"
                          name="warranty_expiry"
                          value={inventoryForm.warranty_expiry}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Condition</label>
                        <select
                          name="condition"
                          value={inventoryForm.condition}
                          onChange={handleInventoryFormChange}
                        >
                          <option value="new">New</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {inventoryForm.type === 'expenditure' && (
                  <div className="form-group">
                    <label>Budget Head</label>
                    <select
                      name="budget_head_id"
                      value={inventoryForm.budget_head_id}
                      onChange={handleInventoryFormChange}
                    >
                      <option value="">Select Budget Head</option>
                      {budgetHeads.filter(bh => bh.category === 'expenditure').map(bh => (
                        <option key={bh.id} value={bh.id}>{bh.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-actions">
                  <button type="submit" className="primary-btn">
                    {editingItem ? 'Update Item' : 'Register Item'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setShowInventoryModal(false)}>
                    Cancel
                </button>
              </div>
              </form>
            </div>
          </div>
        )}

        {/* Budget Head Modal */}
        {showBudgetModal && (
          <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>{editingBudget ? 'Edit Budget Head' : 'Create Budget Head'}</h3>
              <form onSubmit={handleBudgetSubmit} className="budget-form">
                <div className="form-row">
                      <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={budgetForm.name}
                      onChange={handleBudgetFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Code</label>
                    <input
                      type="text"
                      name="code"
                      value={budgetForm.code}
                      onChange={handleBudgetFormChange}
                    />
                  </div>
                      </div>
                      
                <div className="form-row">
                      <div className="form-group">
                    <label>Category *</label>
                    <select
                      name="category"
                      value={budgetForm.category}
                      onChange={handleBudgetFormChange}
                      required
                    >
                      <option value="income">Income</option>
                      <option value="expenditure">Expenditure</option>
                      <option value="asset">Asset</option>
                        </select>
                  </div>
                  <div className="form-group">
                    <label>Allocated Amount</label>
                    <input
                      type="number"
                      name="allocated_amount"
                      value={budgetForm.allocated_amount}
                      onChange={handleBudgetFormChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                      </div>
                      
                        <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={budgetForm.description}
                    onChange={handleBudgetFormChange}
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-btn">
                    {editingBudget ? 'Update Budget Head' : 'Create Budget Head'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setShowBudgetModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Asset Category Modal */}
        {showAssetCategoryModal && (
          <div className="modal-overlay" onClick={() => setShowAssetCategoryModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>{editingAssetCategory ? 'Edit Asset Category' : 'Create Asset Category'}</h3>
              <form onSubmit={handleAssetCategorySubmit} className="asset-category-form">
                <div className="form-group">
                  <label>Name *</label>
                          <input 
                    type="text"
                    name="name"
                    value={assetCategoryForm.name}
                    onChange={handleAssetCategoryFormChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Default Depreciation Rate (%)</label>
                    <input
                      type="number"
                      name="default_depreciation_rate"
                      value={assetCategoryForm.default_depreciation_rate}
                      onChange={handleAssetCategoryFormChange}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Useful Life (Years)</label>
                    <input
                      type="number"
                      name="useful_life_years"
                      value={assetCategoryForm.useful_life_years}
                      onChange={handleAssetCategoryFormChange}
                      min="1"
                      max="50"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={assetCategoryForm.description}
                    onChange={handleAssetCategoryFormChange}
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-btn">
                    {editingAssetCategory ? 'Update Asset Category' : 'Create Asset Category'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setShowAssetCategoryModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
                        </div>
                      )}
                      
        {/* Depreciation Calculation Modal */}
        {showDepreciationModal && (
          <div className="modal-overlay" onClick={() => setShowDepreciationModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Calculate Monthly Depreciation</h3>
              <form onSubmit={handleDepreciationCalculation} className="depreciation-form">
                        <div className="form-row">
                          <div className="form-group">
                    <label>Month *</label>
                    <select
                      name="month"
                      value={depreciationForm.month}
                      onChange={handleDepreciationFormChange}
                      required
                    >
                              <option value="">Select Month</option>
                              {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>
                                  {new Date(2024, month - 1).toLocaleDateString('en-US', {month: 'long'})}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                    <label>Year *</label>
                    <select
                      name="year"
                      value={depreciationForm.year}
                      onChange={handleDepreciationFormChange}
                      required
                    >
                              <option value="">Select Year</option>
                              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                <div className="form-actions">
                  <button type="submit" className="primary-btn">
                    Calculate Depreciation
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setShowDepreciationModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
                        </div>
                      )}
                      
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content delete-confirmation" onClick={e => e.stopPropagation()}>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete "{itemToDelete?.item_name}"? This action cannot be undone.</p>
                      <div className="form-actions">
                <button type="button" className="danger-btn" onClick={handleDelete}>
                  Delete
                </button>
                <button type="button" className="secondary-btn" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                  </div>
                </div>
            </div>
          )}

        {/* Receipt Modal */}
        {showReceiptModal && receiptData && (
          <div className="fee-receipt-modal-overlay">
            <div className="fee-receipt-modal-content">
                        <button 
                className="text-button close-btn black-x always-visible" 
                onClick={() => setShowReceiptModal(false)} 
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
                {receiptType === 'financial_summary' && (
                  <div className="receipt-wrapper">
                    <div className="receipt-template" ref={receiptRef}>
                      {/* Header Section */}
                      <div className="receipt-header">
                        <div className="school-name">VOTECH(S7) ACADEMY</div>
                        <h1 className="receipt-title">Financial Summary Report</h1>
                        <div className="receipt-meta">
                          <div className="meta-row">
                            <span className="meta-label">Period:</span>
                            <span className="meta-underline">{receiptData.period_value}</span>
                            <span className="meta-label">Generated:</span>
                            <span className="meta-underline">{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary Section */}
                      <div className="receipt-main">
                        <div className="main-row">
                          <span className="main-label">Report Type:</span>
                          <span className="main-underline-long">Financial Summary - {receiptData.period_value}</span>
                        </div>
                      </div>

                      {/* Summary Table */}
                      <div className="fee-types-section">
                        <h3 className="fee-types-title">Financial Summary</h3>
                        <table className="fee-types-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Amount (XAF)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fee-type-name">Total Income</td>
                              <td className="fee-expected">{formatCurrency(receiptData.income)}</td>
                              <td className="fee-status completed">Active</td>
                            </tr>
                            <tr>
                              <td className="fee-type-name">Total Expenditure</td>
                              <td className="fee-expected">{formatCurrency(receiptData.expenditure)}</td>
                              <td className="fee-status pending">Active</td>
                            </tr>
                            <tr>
                              <td className="fee-type-name">Asset Purchases</td>
                              <td className="fee-expected">{formatCurrency(receiptData.asset_purchase)}</td>
                              <td className="fee-status partial">Active</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Amount Summary */}
                      <div className="amount-summary-section">
                        <table className="summary-table">
                          <tbody>
                            <tr>
                              <td className="summary-label">Net Balance</td>
                              <td className="summary-value">
                                {formatCurrency(receiptData.net_balance)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {receiptType === 'balance_sheet' && (
                  <div className="receipt-wrapper">
                    <div className="receipt-template" ref={receiptRef}>
                      {/* Header Section */}
                      <div className="receipt-header">
                        <div className="school-name">VOTECH(S7) ACADEMY</div>
                        <h1 className="receipt-title">Balance Sheet Report</h1>
                        <div className="receipt-meta">
                          <div className="meta-row">
                            <span className="meta-label">As of:</span>
                            <span className="meta-underline">{formatDate(receiptData.as_of_date)}</span>
                            <span className="meta-label">Generated:</span>
                            <span className="meta-underline">{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Sheet Sections */}
                      <div className="fee-types-section">
                        <h3 className="fee-types-title">Assets</h3>
                        <table className="fee-types-table">
                          <thead>
                            <tr>
                              <th>Asset Category</th>
                              <th>Amount (XAF)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fee-type-name">Total Assets</td>
                              <td className="fee-expected">{formatCurrency(receiptData.assets.total_assets)}</td>
                            </tr>
                            <tr>
                              <td className="fee-type-name">Current Value</td>
                              <td className="fee-expected">{formatCurrency(receiptData.assets.current_value)}</td>
                            </tr>
                            <tr>
                              <td className="fee-type-name">Depreciation</td>
                              <td className="fee-expected">{formatCurrency(receiptData.assets.depreciation)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="fee-types-section">
                        <h3 className="fee-types-title">Liabilities</h3>
                        <table className="fee-types-table">
                          <thead>
                            <tr>
                              <th>Liability Category</th>
                              <th>Amount (XAF)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fee-type-name">Total Liabilities</td>
                              <td className="fee-expected">{formatCurrency(receiptData.liabilities.total_liabilities)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="fee-types-section">
                        <h3 className="fee-types-title">Equity</h3>
                        <table className="fee-types-table">
                          <thead>
                            <tr>
                              <th>Equity Category</th>
                              <th>Amount (XAF)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fee-type-name">Total Income</td>
                              <td className="fee-expected">{formatCurrency(receiptData.equity.total_income)}</td>
                            </tr>
                            <tr>
                              <td className="fee-type-name">Total Expenditures</td>
                              <td className="fee-expected">{formatCurrency(receiptData.equity.total_expenditures)}</td>
                            </tr>
                            <tr>
                              <td className="fee-type-name">Net Equity</td>
                              <td className="fee-expected">{formatCurrency(receiptData.equity.net_equity)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Totals Summary */}
                      <div className="amount-summary-section">
                        <table className="summary-table">
                          <tbody>
                            <tr>
                              <td className="summary-label">Assets + Equity</td>
                              <td className="summary-value">{formatCurrency(receiptData.totals.assets_plus_equity)}</td>
                            </tr>
                            <tr>
                              <td className="summary-label">Liabilities + Equity</td>
                              <td className="summary-value">{formatCurrency(receiptData.totals.liabilities_plus_equity)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Download Button */}
                <div className="receipt-actions">
                  <button className="download-pdf-btn" onClick={() => downloadReceiptPDF()}>
                    <FaDownload /> Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 