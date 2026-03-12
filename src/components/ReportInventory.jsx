import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import './ReportInventory.css';

const UOM_OPTIONS = ['Pieces', 'Kg', 'Liters', 'Cartons', 'Others'];
const CATEGORY_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expenditure', label: 'Expenditure' },
];

const INITIAL_FORM = {
  item_name: '',
  head_id: '',
  category: 'income',
  uom: 'Pieces',
  quantity: '',
  amount: '',
  support_doc: '',
  supplier: '',
};

const INITIAL_HEAD_FORM = { name: '' };

export default function ReportInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successType, setSuccessType] = useState('success');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [heads, setHeads] = useState([]);
  const [showHeadForm, setShowHeadForm] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [headForm, setHeadForm] = useState(INITIAL_HEAD_FORM);
  const [headSubmitting, setHeadSubmitting] = useState(false);
  const [showHeadDeleteModal, setShowHeadDeleteModal] = useState(false);
  const [headToDelete, setHeadToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('heads');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getReportInventory();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const fetchHeads = async () => {
    try {
      const data = await api.getReportInventoryHeads();
      setHeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setHeads([]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchHeads();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingItem(null);
    setError('');
  };

  const openAddForm = () => {
    setSuccess('');
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setSuccess('');
    const amt = item.amount != null ? item.amount : (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
    setForm({
      item_name: item.item_name || '',
      head_id: item.head_id ? String(item.head_id) : '',
      category: item.category || 'income',
      uom: item.uom || 'Pieces',
      quantity: item.quantity != null ? String(item.quantity) : '',
      amount: String(amt),
      support_doc: item.support_doc || '',
      supplier: item.supplier || '',
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.item_name?.trim()) {
      setError('Item name is required');
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt < 0) {
      setError('Valid amount is required');
      return;
    }
    const qty = form.quantity === '' || form.quantity == null ? null : parseInt(form.quantity, 10);
    if (qty !== null && (isNaN(qty) || qty < 1)) {
      setError('Quantity must be at least 1 when provided');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        item_name: form.item_name.trim(),
        head_id: form.head_id ? parseInt(form.head_id, 10) : null,
        category: form.category,
        uom: form.uom,
        quantity: qty,
        amount: amt,
        support_doc: form.support_doc?.trim() || null,
        supplier: form.category === 'income' ? (form.supplier?.trim() || null) : null,
      };
      if (editingItem) {
        const res = await api.updateReportInventoryItem(editingItem.id, payload);
        const updated = {
          ...res.item,
          head_name: heads.find((h) => h.id === res.item.head_id)?.name,
        };
        setItems((prev) =>
          prev.map((it) => (it.id === editingItem.id ? updated : it))
        );
        setSuccessType('success');
        setSuccess('Item updated successfully!');
      } else {
        const res = await api.createReportInventoryItem(payload);
        const created = {
          ...res.item,
          head_name: heads.find((h) => h.id === res.item.head_id)?.name,
        };
        setItems((prev) => [created, ...prev]);
        setSuccessType('success');
        setSuccess('Item registered successfully!');
      }
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (item) => {
    setSuccess('');
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const openAddHeadForm = () => {
    setSuccess('');
    setHeadForm(INITIAL_HEAD_FORM);
    setEditingHead(null);
    setShowHeadForm(true);
  };

  const openEditHeadForm = (head) => {
    setSuccess('');
    setHeadForm({ name: head.name || '' });
    setEditingHead(head);
    setShowHeadForm(true);
  };

  const handleHeadFormChange = (e) => {
    setHeadForm({ name: e.target.value });
  };

  const handleHeadSubmit = async (e) => {
    e.preventDefault();
    if (!headForm.name?.trim()) return;
    setHeadSubmitting(true);
    try {
      if (editingHead) {
        await api.updateReportInventoryHead(editingHead.id, { name: headForm.name.trim() });
        setHeads((prev) => prev.map((h) => (h.id === editingHead.id ? { ...h, name: headForm.name.trim() } : h)));
        setSuccessType('success');
        setSuccess('Head updated successfully!');
      } else {
        const res = await api.createReportInventoryHead({ name: headForm.name.trim() });
        setHeads((prev) => [res.head, ...prev]);
        setSuccessType('success');
        setSuccess('Head added successfully!');
      }
      setShowHeadForm(false);
      setHeadForm(INITIAL_HEAD_FORM);
      setEditingHead(null);
    } catch (err) {
      setSuccessType('error');
      setSuccess(err.message || 'Failed to save head');
    } finally {
      setHeadSubmitting(false);
    }
  };

  const openHeadDeleteModal = (head) => {
    setSuccess('');
    setHeadToDelete(head);
    setShowHeadDeleteModal(true);
  };

  const closeHeadDeleteModal = () => {
    setShowHeadDeleteModal(false);
    setHeadToDelete(null);
  };

  const confirmHeadDelete = async () => {
    if (!headToDelete) return;
    try {
      await api.deleteReportInventoryHead(headToDelete.id);
      setHeads((prev) => prev.filter((h) => h.id !== headToDelete.id));
      setSuccessType('success');
      setSuccess('Head deleted successfully!');
      closeHeadDeleteModal();
    } catch (err) {
      setSuccessType('error');
      setSuccess(err.message || 'Failed to delete head');
      closeHeadDeleteModal();
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteReportInventoryItem(itemToDelete.id);
      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
      setSuccessType('success');
      setSuccess('Item deleted successfully!');
      closeDeleteModal();
    } catch (err) {
      setSuccessType('error');
      setSuccess(err.message || 'Failed to delete item');
      closeDeleteModal();
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);

  const getItemAmount = (item) => {
    if (item.amount != null && !isNaN(Number(item.amount))) return Number(item.amount);
    return (Number(item.unit_cost_price) || 0) * (item.quantity ?? 1);
  };

  return (
    <SideTop>
      {success && <SuccessMessage message={success} type={successType} onClose={() => setSuccess('')} />}
      <div className="ri-root">
        <div className="ri-print-header">
          <img src={logo} alt="VOTECH Logo" className="ri-print-logo" />
          <span className="ri-print-school">VOTECH S7 ACADEMY</span>
        </div>
        <div className="ri-header">
          <h1 className="ri-title">Inventory</h1>
          <div className="ri-tabs">
            <button
              type="button"
              className={`ri-tab ${activeTab === 'heads' ? 'ri-tab-active' : ''}`}
              onClick={() => setActiveTab('heads')}
            >
              Heads
            </button>
            <button
              type="button"
              className={`ri-tab ${activeTab === 'items' ? 'ri-tab-active' : ''}`}
              onClick={() => setActiveTab('items')}
            >
              Items
            </button>
          </div>
        </div>

        {activeTab === 'heads' && (
          <div className="ri-tab-content">
            <div className="ri-tab-header">
              <button
                type="button"
                className="ri-add-btn ri-add-head-btn"
                onClick={openAddHeadForm}
              >
                <FaPlus className="ri-add-icon" />
                Add Head
              </button>
            </div>
            <div className="ri-content">
              {heads.length === 0 ? (
                <div className="ri-empty-state">No heads yet. Click &quot;Add Head&quot; to create one.</div>
              ) : (
                <div className="ri-heads-table-wrap">
                  <table className="ri-table ri-heads-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th className="ri-actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heads.map((head) => (
                        <tr key={head.id}>
                          <td>{head.name}</td>
                          <td className="ri-actions-cell">
                            <button
                              type="button"
                              className="ri-action-btn ri-edit"
                              onClick={() => openEditHeadForm(head)}
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className="ri-action-btn ri-delete"
                              onClick={() => openHeadDeleteModal(head)}
                              title="Delete"
                            >
                              <FaTrashAlt />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="ri-tab-content">
            <div className="ri-tab-header">
              <button
                type="button"
                className="ri-add-btn"
                onClick={openAddForm}
              >
                <FaPlus className="ri-add-icon" />
                Add Item
              </button>
            </div>
            <div className="ri-content">
          {loading ? (
            <div className="ri-loading">Loading...</div>
          ) : (
            <div className="ri-table-wrap">
              <table className="ri-table">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Item Name</th>
                    <th>Head</th>
                    <th>Category</th>
                    <th>UOM</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Support Doc</th>
                    <th>Supplier</th>
                    <th className="ri-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr className="ri-empty-row">
                      <td colSpan={10} className="ri-empty">
                        No items yet. Click &quot;Add Item&quot; to register.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="ri-id" data-label="Item ID">{item.item_id || item.id}</td>
                        <td data-label="Item Name">{item.item_name}</td>
                        <td className="ri-desc" data-label="Head">{item.head_name || '—'}</td>
                        <td data-label="Category">
                          <span
                            className={`ri-badge ri-badge-${item.category}`}
                          >
                            {item.category === 'income' ? 'Income' : 'Expenditure'}
                          </span>
                        </td>
                        <td data-label="UOM">{item.uom}</td>
                        <td data-label="Quantity">{item.quantity != null ? item.quantity : '—'}</td>
                        <td className="ri-cost" data-label="Amount">{formatCurrency(getItemAmount(item))}</td>
                        <td data-label="Support Doc">{item.support_doc || '—'}</td>
                        <td data-label="Supplier">{item.supplier || '—'}</td>
                        <td className="ri-actions-cell" data-label="">
                          <button
                            type="button"
                            className="ri-action-btn ri-edit"
                            onClick={() => openEditForm(item)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className="ri-action-btn ri-delete"
                            onClick={() => openDeleteModal(item)}
                            title="Delete"
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </div>
        )}

        {showForm && (
          <div className="ri-modal-overlay" onClick={() => !submitting && setShowForm(false)}>
            <div className="ri-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ri-modal-header">
                <h2>{editingItem ? 'Edit Item' : 'Register Item'}</h2>
                <button
                  type="button"
                  className="ri-modal-close"
                  onClick={() => !submitting && setShowForm(false)}
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="ri-form">
                {error && <div className="ri-form-error">{error}</div>}
                <div className="ri-form-row">
                  <label>Item ID</label>
                  <input
                    type="text"
                    value={editingItem ? `#${editingItem.id}` : 'Auto-generated'}
                    disabled
                    className="ri-input ri-disabled"
                  />
                </div>
                <div className="ri-form-row">
                  <label>Item Name <span className="ri-required">*</span></label>
                  <input
                    type="text"
                    name="item_name"
                    value={form.item_name}
                    onChange={handleFormChange}
                    placeholder="Enter item name"
                    className="ri-input"
                    required
                  />
                </div>
                <div className="ri-form-row">
                  <label>Head</label>
                  <select
                    name="head_id"
                    value={form.head_id}
                    onChange={handleFormChange}
                    className="ri-input ri-select"
                  >
                    <option value="">— Select Head —</option>
                    {heads.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ri-form-row">
                  <label>Category <span className="ri-required">*</span></label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="ri-input ri-select"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ri-form-row">
                  <label>Unit of Measure (UOM) <span className="ri-required">*</span></label>
                  <select
                    name="uom"
                    value={form.uom}
                    onChange={handleFormChange}
                    className="ri-input ri-select"
                  >
                    {UOM_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="ri-form-row">
                  <label>Quantity (optional)</label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleFormChange}
                    placeholder="Leave blank for services"
                    min="1"
                    step="1"
                    className="ri-input"
                  />
                </div>
                <div className="ri-form-row">
                  <label>Amount (XAF) <span className="ri-required">*</span></label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="ri-input"
                    required
                  />
                </div>
                <div className="ri-form-row">
                  <label>Support Doc Number</label>
                  <input
                    type="text"
                    name="support_doc"
                    value={form.support_doc}
                    onChange={handleFormChange}
                    placeholder="e.g. Invoice #, Receipt #"
                    className="ri-input"
                  />
                </div>
                {form.category === 'income' && (
                  <div className="ri-form-row">
                    <label>Supplier (optional)</label>
                    <input
                      type="text"
                      name="supplier"
                      value={form.supplier}
                      onChange={handleFormChange}
                      placeholder="Supplier name"
                      className="ri-input"
                    />
                  </div>
                )}
                <div className="ri-form-actions">
                  <button
                    type="button"
                    className="ri-btn ri-btn-secondary"
                    onClick={() => !submitting && setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ri-btn ri-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showHeadForm && (
          <div className="ri-modal-overlay" onClick={() => !headSubmitting && setShowHeadForm(false)}>
            <div className="ri-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ri-modal-header">
                <h2>{editingHead ? 'Edit Head' : 'Add Head'}</h2>
                <button
                  type="button"
                  className="ri-modal-close"
                  onClick={() => !headSubmitting && setShowHeadForm(false)}
                  disabled={headSubmitting}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleHeadSubmit} className="ri-form">
                <div className="ri-form-row">
                  <label>Name <span className="ri-required">*</span></label>
                  <input
                    type="text"
                    value={headForm.name}
                    onChange={handleHeadFormChange}
                    placeholder="Enter head name"
                    className="ri-input"
                    required
                  />
                </div>
                <div className="ri-form-actions">
                  <button
                    type="button"
                    className="ri-btn ri-btn-secondary"
                    onClick={() => !headSubmitting && setShowHeadForm(false)}
                    disabled={headSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ri-btn ri-btn-primary"
                    disabled={headSubmitting}
                  >
                    {headSubmitting ? 'Saving...' : editingHead ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showHeadDeleteModal && headToDelete && (
          <div className="ri-modal-overlay" onClick={closeHeadDeleteModal}>
            <div className="ri-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ri-delete-modal-header">
                <h3>Confirm Delete</h3>
              </div>
              <div className="ri-delete-modal-body">
                <p>Are you sure you want to delete &quot;{headToDelete.name}&quot;?</p>
              </div>
              <div className="ri-delete-modal-actions">
                <button
                  type="button"
                  className="ri-btn ri-btn-secondary"
                  onClick={closeHeadDeleteModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ri-btn ri-btn-delete"
                  onClick={confirmHeadDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && itemToDelete && (
          <div className="ri-modal-overlay" onClick={closeDeleteModal}>
            <div className="ri-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ri-delete-modal-header">
                <h3>Confirm Delete</h3>
              </div>
              <div className="ri-delete-modal-body">
                <p>Are you sure you want to delete &quot;{itemToDelete.item_name}&quot;?</p>
              </div>
              <div className="ri-delete-modal-actions">
                <button
                  type="button"
                  className="ri-btn ri-btn-secondary"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ri-btn ri-btn-delete"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
}
