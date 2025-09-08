import React, { useState, useEffect, useRef } from 'react';
import './Inventory.css';
import SideTop from './SideTop';
import { 
  FaMoneyBill, FaChartLine, FaCalculator, FaPlus, FaTrash, FaEdit, 
  FaBuilding, FaBoxes, FaFileInvoiceDollar, FaChartBar, FaCog,
  FaEye, FaPrint, FaCalendarAlt, FaDollarSign, FaDownload
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
      const [inventory, budget, assets, depts, financialSummary, balanceSheet] = await Promise.all([
        api.getInventory(),
        api.getBudgetHeads(),
        api.getAssetCategories(),
        api.getSpecialties(),
        api.getFinancialSummary().catch(() => null),
        api.getBalanceSheet().catch(() => null)
      ]);
      
      setInventoryItems(inventory);
      setBudgetHeads(budget);
      setAssetCategories(assets);
      setDepartments(depts.map(d => ({ id: d.id, name: d.name })));
      setFinancialSummary(financialSummary);
      setBalanceSheet(balanceSheet);
    } catch (error) {
      setError('Failed to fetch initial data');
      console.error(error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const summary = await api.getFinancialSummary();
      setFinancialSummary(summary);
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
      setError('Failed to fetch financial summary');
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      const balance = await api.getBalanceSheet();
      setBalanceSheet(balance);
    } catch (error) {
      console.error('Failed to fetch balance sheet:', error);
      setError('Failed to fetch balance sheet');
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

  // PDF Generation Functions using AdminStudent table design
  const generateFinancialSummaryPDF = async () => {
    if (!financialSummary) return;
    
    try {
      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.className = 'financial-summary-pdf-container';
      tempContainer.style.cssText = `
        background: white;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 15mm;
        box-sizing: border-box;
        font-family: 'Times New Roman', serif;
        color: black;
        position: absolute;
        left: -9999px;
        top: -9999px;
        overflow: visible;
        line-height: 1.4;
      `;

      // Create the financial summary content
      const financialSummaryHTML = `
        <div class="header-with-logo" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
          <div class="school-info">
            <h1 style="margin: 0; color: #1976d2; font-size: 28px; font-weight: 700;">VOTECH (S7) ACADEMY</h1>
            <h2 style="margin: 5px 0; color: #333; font-size: 20px; font-weight: 600;">FINANCIAL SUMMARY REPORT</h2>
            <h3 style="margin: 5px 0 0 0; color: #666; font-size: 16px; font-weight: 500;">Period: ${financialSummary.period_value}</h3>
          </div>
          <div class="report-meta" style="text-align: right; font-size: 12px; color: #666;">
            <p style="margin: 3px 0;"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 3px 0;"><strong>Total Income:</strong> ${formatCurrency(financialSummary.total_income)}</p>
            <p style="margin: 3px 0;"><strong>Total Expenditure:</strong> ${formatCurrency(financialSummary.total_expenditure)}</p>
            <p style="margin: 3px 0;"><strong>Net Balance:</strong> ${formatCurrency(financialSummary.net_income)}</p>
          </div>
        </div>
        
        <div class="financial-summary-table" style="margin-top: 25px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">S/N</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Category</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Item</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Amount (XAF)</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="page-break-inside: avoid; background-color: #e3f2fd;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;" colspan="5">CORE FINANCIAL OVERVIEW</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">1</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Income</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Income</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.total_income)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Active</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">2</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Expenditure</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Expenditure</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.total_expenditure)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Active</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">3</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Assets</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Asset Purchases</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.total_assets)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Active</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">4</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Balance</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Net Balance</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">${formatCurrency(financialSummary.net_income)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${financialSummary.net_income >= 0 ? 'Positive' : 'Negative'}</td>
              </tr>
              ${financialSummary.fee_reports ? `
                <tr style="page-break-inside: avoid; background-color: #e3f2fd;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;" colspan="5">FEE COLLECTION REPORTS</td>
                </tr>
                <tr style="page-break-inside: avoid;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">5</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Fees</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Fees Collected</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.fee_reports.total_fees_collected)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Collected</td>
                </tr>
                ${financialSummary.fee_reports.fee_breakdown ? financialSummary.fee_reports.fee_breakdown.map((fee, index) => `
                  <tr style="page-break-inside: avoid;">
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${6 + index}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Fees</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">${fee.fee_type}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(fee.amount)}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Paid</td>
                  </tr>
                `).join('') : ''}
              ` : ''}
              ${financialSummary.salary_reports ? `
                <tr style="page-break-inside: avoid; background-color: #e3f2fd;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;" colspan="5">SALARY REPORTS</td>
                </tr>
                <tr style="page-break-inside: avoid;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${6 + (financialSummary.fee_reports?.fee_breakdown?.length || 0)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Salaries</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Expected Salaries</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.salary_reports.total_expected)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Expected</td>
                </tr>
                <tr style="page-break-inside: avoid;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${7 + (financialSummary.fee_reports?.fee_breakdown?.length || 0)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Salaries</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Paid Salaries</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.salary_reports.total_paid)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Paid</td>
                </tr>
                <tr style="page-break-inside: avoid;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${8 + (financialSummary.fee_reports?.fee_breakdown?.length || 0)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Salaries</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Outstanding Salaries</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(financialSummary.salary_reports.total_owed)}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Pending</td>
                </tr>
              ` : ''}
              <tr style="page-break-inside: avoid; background-color: #f0f8ff; font-weight: bold;">
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: center;" colspan="3">TOTAL NET BALANCE</td>
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: right;">${formatCurrency(financialSummary.net_income)}</td>
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: center;">${financialSummary.net_income >= 0 ? 'PROFIT' : 'LOSS'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      tempContainer.innerHTML = financialSummaryHTML;

      // Add styles for the table
      const style = document.createElement('style');
      style.textContent = `
        .financial-summary-table table {
          page-break-inside: auto;
        }
        .financial-summary-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .financial-summary-table thead {
          display: table-header-group;
        }
        .financial-summary-table tfoot {
          display: table-footer-group;
        }
      `;
      tempContainer.appendChild(style);

      // Add to DOM temporarily
      document.body.appendChild(tempContainer);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the temporary container
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
        logging: false,
        removeContainer: false,
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');

      // Create PDF with A4 portrait dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Handle page breaks if content is taller than A4
      if (imgHeight > 297) {
        const pageHeight = 297;
        let heightLeft = imgHeight;
        let position = 0;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const fileName = `financial_summary_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setSuccess('Financial Summary PDF downloaded successfully!');
      setShowSuccess(true);
    } catch (error) {
      console.error('PDF generation error:', error);
      setError('Failed to generate PDF: ' + error.message);
    }
  };

  const generateBalanceSheetPDF = async () => {
    if (!balanceSheet) return;
    
    try {
      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.className = 'balance-sheet-pdf-container';
      tempContainer.style.cssText = `
        background: white;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 15mm;
        box-sizing: border-box;
        font-family: 'Times New Roman', serif;
        color: black;
        position: absolute;
        left: -9999px;
        top: -9999px;
        overflow: visible;
        line-height: 1.4;
      `;

      // Create the balance sheet content
      const balanceSheetHTML = `
        <div class="header-with-logo" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
          <div class="school-info">
            <h1 style="margin: 0; color: #1976d2; font-size: 28px; font-weight: 700;">VOTECH (S7) ACADEMY</h1>
            <h2 style="margin: 5px 0; color: #333; font-size: 20px; font-weight: 600;">BALANCE SHEET REPORT</h2>
            <h3 style="margin: 5px 0 0 0; color: #666; font-size: 16px; font-weight: 500;">As of: ${balanceSheet.as_of_date}</h3>
          </div>
          <div class="report-meta" style="text-align: right; font-size: 12px; color: #666;">
            <p style="margin: 3px 0;"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 3px 0;"><strong>Total Assets:</strong> ${formatCurrency(balanceSheet.assets.total_assets)}</p>
            <p style="margin: 3px 0;"><strong>Total Liabilities:</strong> ${formatCurrency(balanceSheet.liabilities.total_liabilities)}</p>
            <p style="margin: 3px 0;"><strong>Net Equity:</strong> ${formatCurrency(balanceSheet.equity.net_equity)}</p>
          </div>
        </div>
        
        <div class="balance-sheet-table" style="margin-top: 25px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">S/N</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Category</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Item</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Amount (XAF)</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr style="page-break-inside: avoid; background-color: #e3f2fd;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;" colspan="5">ASSETS</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">1</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Assets</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Assets</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.assets.total_assets)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Original</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">2</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Assets</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Current Value</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.assets.current_value)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Depreciated</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">3</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Assets</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Depreciation</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.assets.depreciation)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Accumulated</td>
              </tr>
              <tr style="page-break-inside: avoid; background-color: #e3f2fd;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;" colspan="5">LIABILITIES</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">4</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Liabilities</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Liabilities</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.liabilities.total_liabilities)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Outstanding</td>
              </tr>
              <tr style="page-break-inside: avoid; background-color: #e3f2fd;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;" colspan="5">EQUITY</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">5</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Equity</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Income</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.equity.total_income)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Revenue</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">6</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Equity</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Total Expenditures</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.equity.total_expenditures)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Expenses</td>
              </tr>
              <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">7</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">Equity</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: 500;">Net Equity</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(balanceSheet.equity.net_equity)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Net Worth</td>
              </tr>
              <tr style="page-break-inside: avoid; background-color: #f0f8ff; font-weight: bold;">
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: center;" colspan="3">TOTAL ASSETS</td>
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: right;">${formatCurrency(balanceSheet.assets.current_value)}</td>
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: center;">Current Value</td>
              </tr>
              <tr style="page-break-inside: avoid; background-color: #f0f8ff; font-weight: bold;">
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: center;" colspan="3">TOTAL LIABILITIES + EQUITY</td>
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: right;">${formatCurrency(balanceSheet.totals.liabilities_plus_equity)}</td>
                <td style="border: 2px solid #1976d2; padding: 8px; text-align: center;">Total</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      tempContainer.innerHTML = balanceSheetHTML;

      // Add styles for the table
      const style = document.createElement('style');
      style.textContent = `
        .balance-sheet-table table {
          page-break-inside: auto;
        }
        .balance-sheet-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .balance-sheet-table thead {
          display: table-header-group;
        }
        .balance-sheet-table tfoot {
          display: table-footer-group;
        }
      `;
      tempContainer.appendChild(style);

      // Add to DOM temporarily
      document.body.appendChild(tempContainer);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the temporary container
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
        logging: false,
        removeContainer: false,
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with A4 portrait dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Handle page breaks if content is taller than A4
      if (imgHeight > 297) {
        const pageHeight = 297;
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        }
      }

      const fileName = `balance_sheet_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      setSuccess('Balance Sheet PDF downloaded successfully!');
      setShowSuccess(true);
    } catch (error) {
      console.error('PDF generation error:', error);
      setError('Failed to generate PDF: ' + error.message);
    }
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
    { id: 'Budget Heads', label: 'Budget Heads', icon: <FaBuilding />, description: 'Create budget heads to categorize financial allocations' },
    { id: 'Income Management', label: 'Income Management', icon: <FaMoneyBill />, description: 'Register school income and track revenue sources' },
    { id: 'Expenditure Management', label: 'Expenditure Management', icon: <FaChartLine />, description: 'Register school expenditures and track spending' },
    { id: 'Asset Categories', label: 'Asset Categories', icon: <FaBoxes />, description: 'Create department heads for organized equipment allocation' },
    { id: 'Equipment Management', label: 'Equipment Management', icon: <FaCog />, description: 'Register equipment purchases and set depreciation rates' },
    { id: 'Depreciation Management', label: 'Depreciation Management', icon: <FaCalculator />, description: 'Calculate monthly depreciation and current equipment values' },
    { id: 'Financial Reports', label: 'Financial Reports', icon: <FaFileInvoiceDollar />, description: 'Generate comprehensive financial statements and balance sheets' }
  ];

  return (
    <SideTop>
      <div className="inv-inventory-container inv-root">
        <div className="inv-inventory-header">
          <h1>Financial Management System</h1>
          <p>Comprehensive budgeting, financial tracking, equipment management, and reporting for VOTECH(S7) Academy</p>
        </div>

        {/* Success Message */}
        {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}

        {/* Error Message */}
        {error && (
          <div className="inv-error-message">
            {error}
            <button onClick={() => setError('')} className="inv-error-close">×</button>
              </div>
            )}

        {/* Navigation Tabs */}
          <div className="inv-inventory-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`inv-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.description}
              >
                <span className="inv-tab-icon">{tab.icon}</span>
                <span className="inv-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

        {/* Tab Content */}
        <div className="inv-tab-content">
          {/* Income Management */}
          {activeTab === 'Income Management' && (
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Income Management</h3>
                <p className="inv-panel-description">Register school income and track revenue sources with proper categorization</p>
                <button className="inv-primary-btn" onClick={() => setShowInventoryModal(true)}>
                  <FaPlus /> Register Income Item
                </button>
              </div>
              
              <div className="inv-inventory-table-container">
                  <table className="inv-inventory-table">
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
                        <td className="inv-actions">
                          <button onClick={() => openEditInventory(item)} className="inv-action-btn edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => { setItemToDelete(item); setShowDeleteModal(true); }} className="inv-action-btn delete">
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
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Expenditure Management</h3>
                <p className="inv-panel-description">Register school expenditures and track spending with proper categorization</p>
                <button className="inv-primary-btn" onClick={() => {
                  setInventoryForm(prev => ({ ...prev, type: 'expenditure' }));
                  setShowInventoryModal(true);
                }}>
                  <FaPlus /> Register Expenditure Item
                </button>
              </div>
              
              <div className="inv-inventory-table-container">
                  <table className="inv-inventory-table">
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
                        <td className="inv-actions">
                          <button onClick={() => openEditInventory(item)} className="inv-action-btn edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => { setItemToDelete(item); setShowDeleteModal(true); }} className="inv-action-btn delete">
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
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Budget Heads Management</h3>
                <p className="inv-panel-description">Create budget heads to categorize financial allocations for income and expenditure tracking</p>
                <button className="inv-primary-btn" onClick={() => setShowBudgetModal(true)}>
                  <FaPlus /> Create Budget Head
                </button>
              </div>
              
              <div className="inv-budget-heads-grid">
                {budgetHeads.length === 0 ? (
                  <div className="inv-no-data-message">
                    <p>No budget heads created yet. Click "Create Budget Head" to get started.</p>
                  </div>
                ) : (
                  budgetHeads.map(budget => (
                    <div key={budget.id} className="inv-budget-head-card">
                      <div className="inv-budget-header">
                        <h4>{budget.name}</h4>
                        <span className={`inv-budget-category ${budget.category}`}>{budget.category}</span>
                      </div>
                      <div className="inv-budget-details">
                        <p><strong>Code:</strong> {budget.code || 'N/A'}</p>
                        <p><strong>Allocated Amount:</strong> {formatCurrency(budget.allocated_amount)}</p>
                        <p><strong>Description:</strong> {budget.description || 'No description'}</p>
                      </div>
                      <div className="inv-budget-actions">
                        <button onClick={() => openEditBudget(budget)} className="inv-action-btn edit">
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteBudgetHead(budget.id)} 
                          className="inv-action-btn delete"
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
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Department Heads & Asset Categories</h3>
                <p className="inv-panel-description">Create department heads for organized equipment allocation and asset categories with depreciation settings</p>
                <button className="inv-primary-btn" onClick={() => setShowAssetCategoryModal(true)}>
                  <FaPlus /> Create Asset Category
                </button>
              </div>
              
              <div className="inv-asset-categories-grid">
                {assetCategories.length === 0 ? (
                  <div className="inv-no-data-message">
                    <p>No asset categories created yet. Click "Create Asset Category" to get started.</p>
                    <p><strong>Tip:</strong> Asset categories help organize equipment by type and set default depreciation rates.</p>
                  </div>
                ) : (
                  assetCategories.map(category => (
                    <div key={category.id} className="inv-asset-category-card">
                      <div className="inv-category-header">
                        <h4>{category.name}</h4>
                        <span className="inv-category-type">Asset Category</span>
                      </div>
                      <div className="inv-category-details">
                        <p><strong>Default Depreciation Rate:</strong> {category.default_depreciation_rate || 'Not set'}%</p>
                        <p><strong>Useful Life:</strong> {category.useful_life_years || 'Not set'} years</p>
                        <p><strong>Description:</strong> {category.description || 'No description'}</p>
                      </div>
                      <div className="inv-category-actions">
                        <button onClick={() => openEditAssetCategory(category)} className="action-btn edit">
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteAssetCategory(category.id)} 
                          className="inv-action-btn delete"
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

          {/* Equipment Management */}
          {activeTab === 'Equipment Management' && (
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Equipment Purchase Registration</h3>
                <p className="inv-panel-description">Register equipment purchases with associated costs, suppliers, and depreciation settings</p>
                <button className="inv-primary-btn" onClick={() => {
                  setInventoryForm(prev => ({ ...prev, type: 'income' }));
                  setShowInventoryModal(true);
                }}>
                  <FaPlus /> Register Equipment Purchase
                </button>
              </div>
              
              <div className="inv-inventory-table-container">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Equipment Name</th>
                      <th>Department</th>
                      <th>Asset Category</th>
                      <th>Quantity</th>
                      <th>Cost</th>
                      <th>Supplier</th>
                      <th>Depreciation Rate</th>
                      <th>Current Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredInventory('income').filter(item => item.asset_category).map(item => (
                      <tr key={item.id}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.item_name}</td>
                        <td>{item.department}</td>
                        <td>{item.asset_category || '-'}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.estimated_cost)}</td>
                        <td>{item.supplier || '-'}</td>
                        <td>{item.depreciation_rate ? `${item.depreciation_rate}%` : '-'}</td>
                        <td>{formatCurrency(item.current_value || item.estimated_cost)}</td>
                        <td className="inv-actions">
                          <button onClick={() => openEditInventory(item)} className="inv-action-btn edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => { setItemToDelete(item); setShowDeleteModal(true); }} className="inv-action-btn delete">
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

          {/* Depreciation Management */}
          {activeTab === 'Depreciation Management' && (
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Monthly Equipment Valuation & Depreciation</h3>
                <p className="inv-panel-description">Calculate monthly depreciation and get current value of total school equipment at month end</p>
                <button className="inv-primary-btn" onClick={() => setShowDepreciationModal(true)}>
                  <FaCalculator /> Calculate Monthly Depreciation
                </button>
              </div>
              
              <div className="depreciation-info">
                <div className="depreciation-overview">
                  <h4>Equipment Depreciation Overview</h4>
                  <p>Accountants can set depreciation rates for various types of purchased equipment. The system provides the current value of the total equipment of the school at the end of each month.</p>
                </div>
                
                <div className="depreciation-stats">
                  <div className="stat-card">
                    <div className="stat-header">
                      <FaCog />
                      <span>Assets with Depreciation</span>
                  </div>
                    <div className="stat-value">
                      {inventoryItems.filter(item => item.type === 'income' && item.asset_category && item.depreciation_rate > 0).length}
                  </div>
                    <div className="stat-description">Equipment items with depreciation rates set</div>
                </div>
                  
                  <div className="stat-card">
                    <div className="stat-header">
                      <FaDollarSign />
                      <span>Total Asset Value</span>
              </div>
                    <div className="stat-value">
                      {formatCurrency(calculateTotalValue('income'))}
            </div>
                    <div className="stat-description">Original purchase value of all equipment</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-header">
                      <FaChartLine />
                      <span>Current Equipment Value</span>
                    </div>
                    <div className="stat-value">
                      {formatCurrency(
                        inventoryItems
                          .filter(item => item.type === 'income' && item.asset_category)
                          .reduce((sum, item) => sum + (parseFloat(item.current_value) || parseFloat(item.estimated_cost) || 0), 0)
                      )}
                    </div>
                    <div className="stat-description">Current value after depreciation</div>
                  </div>
                </div>
                
                <div className="depreciation-instructions">
                  <h5>How to Calculate Monthly Depreciation:</h5>
                  <ol>
                    <li>Click "Calculate Monthly Depreciation" button</li>
                    <li>Select the month and year for calculation</li>
                    <li>The system will automatically calculate depreciation for all assets with depreciation rates</li>
                    <li>Current values will be updated based on the depreciation calculation</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Financial Reports */}
          {activeTab === 'Financial Reports' && (
            <div className="inv-tab-panel">
              <div className="inv-panel-header">
                <h3>Financial Statements & Balance Sheet</h3>
                <p className="inv-panel-description">Generate comprehensive Financial Statements (Income, Expenses) and detailed Balance Sheet reports</p>
                <div className="report-actions">
                  <button className="inv-primary-btn" onClick={() => fetchFinancialSummary()}>
                    <FaChartBar /> Refresh Financial Summary
                  </button>
                  <button className="inv-primary-btn" onClick={() => fetchBalanceSheet()}>
                    <FaFileInvoiceDollar /> Refresh Balance Sheet
                  </button>
                </div>
              </div>
              
              <div className="reports-section">
                {/* Financial Summary Report */}
                <div className="report-card">
                  <h4>Comprehensive Financial Summary Report</h4>
                  <p>Complete financial overview including fees, salaries, and comprehensive analysis</p>
                  
                  {financialSummary ? (
                    <div className="financial-summary-content">
                      <div className="summary-period">
                        <strong>Period:</strong> {financialSummary.period_value}
                      </div>
                      
                      {/* Core Financial Overview */}
                      <div className="financial-overview-section">
                        <h5>📊 Core Financial Overview</h5>
                      <div className="inv-summary-grid">
                        <div className="inv-summary-item">
                          <span>Total Income:</span>
                            <span className="inv-amount positive">{formatCurrency(financialSummary.total_income)}</span>
                        </div>
                        <div className="inv-summary-item">
                          <span>Total Expenditure:</span>
                            <span className="inv-amount negative">{formatCurrency(financialSummary.total_expenditure)}</span>
                        </div>
                        <div className="inv-summary-item">
                          <span>Asset Purchases:</span>
                            <span className="inv-amount neutral">{formatCurrency(financialSummary.total_assets)}</span>
                        </div>
                        <div className="inv-summary-item total">
                          <span>Net Balance:</span>
                            <span className={`inv-amount ${financialSummary.net_income >= 0 ? 'positive' : 'negative'}`}>
                              {formatCurrency(financialSummary.net_income)}
                          </span>
                        </div>
                      </div>
                      </div>

                      {/* Fee Reports Section */}
                      {financialSummary.fee_reports && (
                        <div className="fee-reports-section">
                          <h5>🎓 Fee Collection Reports</h5>
                          <div className="reports-grid">
                            <div className="report-item">
                              <span>Total Fees Collected:</span>
                              <span className="amount positive">{formatCurrency(financialSummary.fee_reports.total_fees_collected)}</span>
                            </div>
                            
                            {financialSummary.fee_reports.fee_breakdown && financialSummary.fee_reports.fee_breakdown.length > 0 && (
                              <div className="fee-breakdown-section">
                                <h6>Fee Breakdown by Type:</h6>
                                <div className="fee-breakdown-list">
                                  {financialSummary.fee_reports.fee_breakdown.map((fee, index) => (
                                    <div key={index} className="inv-fee-breakdown-item">
                                      <span className="fee-type">{fee.fee_type}</span>
                                      <span className="fee-amount">{formatCurrency(fee.amount)}</span>
                                      <span className="fee-count">({fee.payment_count} payments)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {financialSummary.fee_reports.class_wise_totals && financialSummary.fee_reports.class_wise_totals.length > 0 && (
                              <div className="inv-class-fees-section">
                                <h6>Class-wise Collection:</h6>
                                <div className="inv-class-fees-list">
                                  {financialSummary.fee_reports.class_wise_totals.map((classFee, index) => (
                                    <div key={index} className="inv-class-fee-item">
                                      <div className="inv-class-info">
                                        <span className="inv-class-name">{classFee.class_name}</span>
                                        <span className="inv-class-students">{classFee.students_paid} students paid</span>
                                      </div>
                                      <div className="inv-class-amounts">
                                        <span className="inv-collected">{formatCurrency(classFee.fees_collected)}</span>
                                        <span className="inv-expected">/ {formatCurrency(classFee.class_total_fee)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Salary Reports Section */}
                      {financialSummary.salary_reports && (
                        <div className="salary-reports-section">
                          <h5>💼 Salary Reports</h5>
                          <div className="reports-grid">
                            <div className="report-item">
                              <span>Total Expected Salaries:</span>
                              <span className="amount neutral">{formatCurrency(financialSummary.salary_reports.total_expected)}</span>
                            </div>
                            <div className="report-item">
                              <span>Total Paid Salaries:</span>
                              <span className="amount positive">{formatCurrency(financialSummary.salary_reports.total_paid)}</span>
                            </div>
                            <div className="report-item">
                              <span>Outstanding Salaries:</span>
                              <span className="amount negative">{formatCurrency(financialSummary.salary_reports.total_owed)}</span>
                            </div>
                            <div className="report-item">
                              <span>Payment Rate:</span>
                              <span className="amount percentage">{financialSummary.salary_reports.payment_percentage?.toFixed(1) || 0}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Comprehensive Summary */}
                      {financialSummary.comprehensive_summary && (
                        <div className="comprehensive-summary-section">
                          <h5>📈 Comprehensive Financial Health</h5>
                          <div className="comprehensive-grid">
                            <div className="comprehensive-item">
                              <span>Total Expected Income:</span>
                              <span className="amount positive">{formatCurrency(financialSummary.comprehensive_summary.total_expected_income)}</span>
                            </div>
                            <div className="comprehensive-item">
                              <span>Total Expected Expenditure:</span>
                              <span className="amount negative">{formatCurrency(financialSummary.comprehensive_summary.total_expected_expenditure)}</span>
                            </div>
                            <div className="comprehensive-item">
                              <span>Net Worth:</span>
                              <span className="amount neutral">{formatCurrency(financialSummary.comprehensive_summary.net_worth)}</span>
                            </div>
                            <div className="comprehensive-item">
                              <span>Financial Health:</span>
                              <span className={`status ${financialSummary.comprehensive_summary.financial_health?.toLowerCase()}`}>
                                {financialSummary.comprehensive_summary.financial_health || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <button className="secondary-btn" onClick={() => generateFinancialSummaryPDF()}>
                        <FaDownload /> Download Summary PDF
                      </button>
                    </div>
                  ) : (
                    <div className="inv-no-data-message">
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
                            <span>{formatCurrency(balanceSheet.assets.current_assets)}</span>
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
                            <span>{formatCurrency(balanceSheet.equity.total_expenditure)}</span>
                          </div>
                          <div className="balance-item total">
                            <span>Net Equity:</span>
                            <span>{formatCurrency(balanceSheet.equity.net_worth)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="balance-totals">
                        <div className="total-item">
                          <span>Total Assets:</span>
                          <span>{formatCurrency(balanceSheet.totals.total_assets)}</span>
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
                    <div className="inv-no-data-message">
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
          <div className="inv-modal-overlay" onClick={() => setShowInventoryModal(false)}>
            <div className="inv-modal-content" onClick={e => e.stopPropagation()}>
              <h3>{editingItem ? 'Edit Inventory Item' : 'Register Inventory Item'}</h3>
              <form onSubmit={handleInventorySubmit} className="inventory-form">
                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      name="date"
                      value={inventoryForm.date}
                      onChange={handleInventoryFormChange}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
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

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Item Name *</label>
                    <input
                      type="text"
                      name="item_name"
                      value={inventoryForm.item_name}
                      onChange={handleInventoryFormChange}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
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

                <div className="inv-form-row">
                  <div className="inv-form-group">
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
                  <div className="inv-form-group">
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
                    <div className="inv-form-row">
                      <div className="inv-form-group">
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
                      <div className="inv-form-group">
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

                    <div className="inv-form-row">
                      <div className="inv-form-group">
                        <label>Purchase Date</label>
                        <input
                          type="date"
                          name="purchase_date"
                          value={inventoryForm.purchase_date}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                      <div className="inv-form-group">
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

                    <div className="inv-form-row">
                      <div className="inv-form-group">
                        <label>Supplier</label>
                        <input
                          type="text"
                          name="supplier"
                          value={inventoryForm.supplier}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                      <div className="inv-form-group">
                        <label>Location</label>
                        <input
                          type="text"
                          name="location"
                          value={inventoryForm.location}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                    </div>

                    <div className="inv-form-row">
                      <div className="inv-form-group">
                        <label>Warranty Expiry</label>
                        <input
                          type="date"
                          name="warranty_expiry"
                          value={inventoryForm.warranty_expiry}
                          onChange={handleInventoryFormChange}
                        />
                      </div>
                      <div className="inv-form-group">
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
                  <div className="inv-form-group">
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

                <div className="inv-form-actions">
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
          <div className="inv-modal-overlay" onClick={() => setShowBudgetModal(false)}>
                  <div className="inv-modal-content" onClick={e => e.stopPropagation()}>
              <h3>{editingBudget ? 'Edit Budget Head' : 'Create Budget Head'}</h3>
              <form onSubmit={handleBudgetSubmit} className="budget-form">
                <div className="inv-form-row">
                      <div className="inv-form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={budgetForm.name}
                      onChange={handleBudgetFormChange}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Code</label>
                    <input
                      type="text"
                      name="code"
                      value={budgetForm.code}
                      onChange={handleBudgetFormChange}
                    />
                  </div>
                      </div>
                      
                <div className="inv-form-row">
                      <div className="inv-form-group">
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
                  <div className="inv-form-group">
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
                      
                        <div className="inv-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={budgetForm.description}
                    onChange={handleBudgetFormChange}
                    rows="3"
                  />
                </div>

                <div className="inv-form-actions">
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
          <div className="inv-modal-overlay" onClick={() => setShowAssetCategoryModal(false)}>
            <div className="inv-modal-content" onClick={e => e.stopPropagation()}>
              <h3>{editingAssetCategory ? 'Edit Asset Category' : 'Create Asset Category'}</h3>
              <form onSubmit={handleAssetCategorySubmit} className="asset-category-form">
                <div className="inv-form-group">
                  <label>Name *</label>
                          <input 
                    type="text"
                    name="name"
                    value={assetCategoryForm.name}
                    onChange={handleAssetCategoryFormChange}
                    required
                  />
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
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
                  <div className="inv-form-group">
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

                <div className="inv-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={assetCategoryForm.description}
                    onChange={handleAssetCategoryFormChange}
                    rows="3"
                  />
                </div>

                <div className="inv-form-actions">
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
          <div className="inv-modal-overlay" onClick={() => setShowDepreciationModal(false)}>
            <div className="inv-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Calculate Monthly Depreciation</h3>
              <form onSubmit={handleDepreciationCalculation} className="depreciation-form">
                        <div className="inv-form-row">
                          <div className="inv-form-group">
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
                          <div className="inv-form-group">
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

                <div className="inv-form-actions">
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
          <div className="inv-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content delete-confirmation" onClick={e => e.stopPropagation()}>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete "{itemToDelete?.item_name}"? This action cannot be undone.</p>
                      <div className="inv-form-actions">
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
                  <div className="inv-receipt-wrapper">
                    <div className="inv-receipt-template">
                      {/* Header Section */}
                      <div className="report-header">
                        <div className="report-title-group">
                          <img src="/logo.png" alt="logo" className="report-logo" />
                          <div>
                            <h1>VOTECH (S7) ACADEMY</h1>
                            <h2>COMPREHENSIVE FINANCIAL SUMMARY REPORT</h2>
                            <h3>Period: {receiptData.period_value}</h3>
                          </div>
                        </div>
                        <div className="report-meta">
                          <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Core Financial Overview Table */}
                      <table className="report-table">
                          <thead>
                            <tr>
                            <th colSpan="4">CORE FINANCIAL OVERVIEW</th>
                          </tr>
                          <tr>
                            <th>Item</th>
                              <th>Amount (XAF)</th>
                              <th>Status</th>
                            <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                            <td>Total Income</td>
                            <td>{formatCurrency(receiptData.total_income)}</td>
                            <td><span className="status-badge completed">Active</span></td>
                            <td>All revenue sources</td>
                            </tr>
                            <tr>
                            <td>Total Expenditure</td>
                            <td>{formatCurrency(receiptData.total_expenditure)}</td>
                            <td><span className="status-badge uncompleted">Active</span></td>
                            <td>All operational costs</td>
                            </tr>
                            <tr>
                            <td>Asset Purchases</td>
                            <td>{formatCurrency(receiptData.total_assets)}</td>
                            <td><span className="status-badge partial">Active</span></td>
                            <td>Capital investments</td>
                            </tr>
                            <tr>
                            <td><strong>Net Balance</strong></td>
                            <td><strong>{formatCurrency(receiptData.net_income)}</strong></td>
                            <td><span className={`status-badge ${receiptData.net_income >= 0 ? 'completed' : 'uncompleted'}`}>
                                {receiptData.net_income >= 0 ? 'Positive' : 'Negative'}
                            </span></td>
                            <td><strong>Income - Expenditure</strong></td>
                            </tr>
                          </tbody>
                        </table>

                      {/* Fee Collection Reports Table */}
                      {receiptData.fee_reports && (
                        <table className="report-table">
                                <thead>
                            <tr>
                              <th colSpan="4">FEE COLLECTION REPORTS</th>
                            </tr>
                                  <tr>
                                    <th>Fee Type</th>
                                    <th>Amount (XAF)</th>
                                    <th>Payments</th>
                              <th>Status</th>
                                  </tr>
                                </thead>
                          <tbody>
                            <tr>
                              <td><strong>Total Fees Collected</strong></td>
                              <td><strong>{formatCurrency(receiptData.fee_reports.total_fees_collected)}</strong></td>
                              <td><strong>All</strong></td>
                              <td><span className="status-badge completed">Collected</span></td>
                                  </tr>
                            {receiptData.fee_reports.fee_breakdown && receiptData.fee_reports.fee_breakdown.map((fee, index) => (
                                    <tr key={index}>
                                <td>{fee.fee_type}</td>
                                <td>{formatCurrency(fee.amount)}</td>
                                <td>{fee.payment_count}</td>
                                <td><span className="status-badge completed">Paid</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                      )}

                      {/* Salary Reports Table */}
                      {receiptData.salary_reports && (
                        <table className="report-table">
                            <thead>
                            <tr>
                              <th colSpan="4">SALARY REPORTS</th>
                            </tr>
                              <tr>
                                <th>Salary Category</th>
                                <th>Amount (XAF)</th>
                              <th>Percentage</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                              <td>Total Expected Salaries</td>
                              <td>{formatCurrency(receiptData.salary_reports.total_expected)}</td>
                              <td>100%</td>
                              <td><span className="status-badge partial">Expected</span></td>
                              </tr>
                              <tr>
                              <td>Total Paid Salaries</td>
                              <td>{formatCurrency(receiptData.salary_reports.total_paid)}</td>
                              <td>{receiptData.salary_reports.payment_percentage?.toFixed(1) || 0}%</td>
                              <td><span className="status-badge completed">Paid</span></td>
                              </tr>
                              <tr>
                              <td>Outstanding Salaries</td>
                              <td>{formatCurrency(receiptData.salary_reports.total_owed)}</td>
                              <td>{((receiptData.salary_reports.total_owed / receiptData.salary_reports.total_expected) * 100).toFixed(1)}%</td>
                              <td><span className="status-badge uncompleted">Pending</span></td>
                              </tr>
                            </tbody>
                          </table>
                      )}

                      {/* Comprehensive Financial Health Table */}
                      {receiptData.comprehensive_summary && (
                        <table className="report-table">
                            <thead>
                            <tr>
                              <th colSpan="4">COMPREHENSIVE FINANCIAL HEALTH</th>
                            </tr>
                              <tr>
                                <th>Financial Metric</th>
                                <th>Amount (XAF)</th>
                              <th>Type</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                              <td>Total Expected Income</td>
                              <td>{formatCurrency(receiptData.comprehensive_summary.total_expected_income)}</td>
                              <td>Projected</td>
                              <td><span className="status-badge completed">Projected</span></td>
                              </tr>
                              <tr>
                              <td>Total Expected Expenditure</td>
                              <td>{formatCurrency(receiptData.comprehensive_summary.total_expected_expenditure)}</td>
                              <td>Projected</td>
                              <td><span className="status-badge uncompleted">Projected</span></td>
                              </tr>
                              <tr>
                              <td>Net Worth</td>
                              <td>{formatCurrency(receiptData.comprehensive_summary.net_worth)}</td>
                              <td>Current</td>
                              <td><span className={`status-badge ${receiptData.comprehensive_summary.net_worth >= 0 ? 'completed' : 'uncompleted'}`}>
                                  {receiptData.comprehensive_summary.net_worth >= 0 ? 'Positive' : 'Negative'}
                              </span></td>
                              </tr>
                              <tr>
                              <td>Financial Health</td>
                              <td>{receiptData.comprehensive_summary.financial_health || 'Unknown'}</td>
                              <td>Assessment</td>
                              <td><span className={`status-badge ${receiptData.comprehensive_summary.financial_health?.toLowerCase() === 'positive' ? 'completed' : 
                                receiptData.comprehensive_summary.financial_health?.toLowerCase() === 'balanced' ? 'partial' : 'uncompleted'}`}>
                                  {receiptData.comprehensive_summary.financial_health || 'Unknown'}
                              </span></td>
                            </tr>
                          </tbody>
                        </table>
                      )}

                      {/* Summary Table */}
                      <table className="report-table summary-table">
                        <thead>
                          <tr>
                            <th colSpan="4">FINAL SUMMARY</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Total Net Balance</strong></td>
                            <td><strong>{formatCurrency(receiptData.net_income)}</strong></td>
                            <td><strong>{receiptData.net_income >= 0 ? 'PROFIT' : 'LOSS'}</strong></td>
                            <td><span className={`status-badge ${receiptData.net_income >= 0 ? 'completed' : 'uncompleted'}`}>
                              {receiptData.net_income >= 0 ? 'PROFIT' : 'LOSS'}
                            </span></td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Footer */}
                      <div className="report-footer">
                        <p>This comprehensive financial report includes detailed analysis of fee collections, salary management, and overall financial health.</p>
                        <p>Generated on {new Date().toLocaleString()} | VOTECH(S7) ACADEMY Management System</p>
                      </div>
                    </div>
                  </div>
                )}

                {receiptType === 'balance_sheet' && (
                  <div className="inv-receipt-wrapper">
                    <div className="inv-receipt-template">
                      {/* Header Section */}
                      <div className="inv-receipt-header">
                        <div className="inv-school-name">VOTECH(S7) ACADEMY</div>
                        <h1 className="inv-receipt-title">Balance Sheet Report</h1>
                        <div className="inv-receipt-meta">
                          <div className="inv-meta-row">
                            <span className="inv-meta-label">As of:</span>
                            <span className="inv-meta-underline">{formatDate(receiptData.as_of_date)}</span>
                            <span className="inv-meta-label">Generated:</span>
                            <span className="inv-meta-underline">{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Sheet Sections */}
                      <div className="inv-fee-types-section">
                        <h3 className="inv-fee-types-title">🏢 Assets</h3>
                        <table className="inv-fee-types-table">
                          <thead>
                            <tr>
                              <th>Asset Category</th>
                              <th>Amount (XAF)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="inv-fee-type-name">Total Assets</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.assets?.total_assets || 0)}</td>
                              <td className="fee-status completed">Active</td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Current Assets</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.assets?.current_assets || 0)}</td>
                              <td className="fee-status completed">Current</td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Depreciation</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.assets?.depreciation || 0)}</td>
                              <td className="fee-status partial">Accumulated</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="inv-fee-types-section">
                        <h3 className="inv-fee-types-title">💳 Liabilities</h3>
                        <table className="inv-fee-types-table">
                          <thead>
                            <tr>
                              <th>Liability Category</th>
                              <th>Amount (XAF)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="inv-fee-type-name">Total Liabilities</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.liabilities?.total_liabilities || 0)}</td>
                              <td className="fee-status pending">Outstanding</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="inv-fee-types-section">
                        <h3 className="inv-fee-types-title">💰 Equity</h3>
                        <table className="inv-fee-types-table">
                          <thead>
                            <tr>
                              <th>Equity Category</th>
                              <th>Amount (XAF)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="inv-fee-type-name">Total Income</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.equity?.total_income || 0)}</td>
                              <td className="fee-status completed">Generated</td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Total Expenditure</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.equity?.total_expenditure || 0)}</td>
                              <td className="fee-status pending">Incurred</td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Net Worth</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.equity?.net_worth || 0)}</td>
                              <td className={`fee-status ${(receiptData.equity?.net_worth || 0) >= 0 ? 'completed' : 'pending'}`}>
                                {(receiptData.equity?.net_worth || 0) >= 0 ? 'Positive' : 'Negative'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Financial Summary */}
                      <div className="inv-fee-types-section">
                        <h3 className="inv-fee-types-title">📊 Financial Summary</h3>
                        <table className="inv-fee-types-table">
                          <thead>
                            <tr>
                              <th>Financial Metric</th>
                              <th>Amount (XAF)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="inv-fee-type-name">Total Assets</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.totals?.total_assets || 0)}</td>
                              <td className="fee-status completed">Owned</td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Total Liabilities</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.totals?.total_liabilities || 0)}</td>
                              <td className="fee-status pending">Owed</td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Total Equity</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.totals?.total_equity || 0)}</td>
                              <td className={`fee-status ${(receiptData.totals?.total_equity || 0) >= 0 ? 'completed' : 'pending'}`}>
                                {(receiptData.totals?.total_equity || 0) >= 0 ? 'Positive' : 'Negative'}
                              </td>
                            </tr>
                            <tr>
                              <td className="inv-fee-type-name">Liabilities + Equity</td>
                              <td className="inv-fee-expected">{formatCurrency(receiptData.totals?.liabilities_plus_equity || 0)}</td>
                              <td className="fee-status completed">Balanced</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Footer */}
                      <div className="inv-receipt-footer">
                        <p>This balance sheet provides a comprehensive view of the institution's financial position as of the specified date.</p>
                        <p>Generated on {new Date().toLocaleString()} | VOTECH(S7) ACADEMY Management System</p>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 