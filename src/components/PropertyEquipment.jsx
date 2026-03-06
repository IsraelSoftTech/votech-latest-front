import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import { FaPlus, FaEdit, FaTrashAlt, FaFileAlt } from 'react-icons/fa';
import jsPDF from 'jspdf';
import './PropertyEquipment.css';

const SCHOOL_NAME = 'VOTECH S7 ACADEMY';

export default function PropertyEquipment() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', cost: '', department_location: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successType, setSuccessType] = useState('success');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const fetchDepartments = async () => {
    try {
      const data = await api.getSpecialties();
      const list = Array.isArray(data) ? data : [];
      const fromApi = list.map((d) => ({ value: String(d.id), label: d.name || d.abbreviation || String(d.id) }));
      const legacy = [{ value: 'ME', label: 'ME' }, { value: 'CE', label: 'CE' }, { value: 'EE', label: 'EE' }, { value: 'HCE', label: 'HCE' }, { value: 'TE', label: 'TE' }, { value: 'General', label: 'General' }];
      const seen = new Set(fromApi.map((d) => d.value));
      const extra = legacy.filter((d) => !seen.has(d.value));
      setDepartments([...fromApi, ...extra]);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setDepartments([{ value: 'ME', label: 'ME' }, { value: 'CE', label: 'CE' }, { value: 'EE', label: 'EE' }, { value: 'HCE', label: 'HCE' }, { value: 'TE', label: 'TE' }, { value: 'General', label: 'General' }]);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getPropertyEquipment();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      setError('Failed to load property & equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchItems();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const resetForm = () => {
    const firstDept = departments[0]?.value ?? '';
    setForm({ name: '', cost: '', department_location: firstDept });
    setEditingItem(null);
    setError('');
  };

  const getDepartmentLabel = (item) => {
    if (item?.department_display) return item.department_display;
    const id = item?.department_location ?? item;
    if (!id) return '—';
    const d = departments.find((dep) => dep.value === String(id));
    return d?.label ?? id;
  };

  const openAddForm = () => {
    setSuccess('');
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setSuccess('');
    setForm({
      name: item.name || '',
      cost: String(item.cost ?? ''),
      department_location: item.department_location ? String(item.department_location) : (departments[0]?.value ?? ''),
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name?.trim()) {
      setError('Equipment/Property name is required');
      return;
    }
    const cost = parseFloat(form.cost);
    if (isNaN(cost) || cost < 0) {
      setError('Valid cost is required');
      return;
    }
    if (!form.department_location) {
      setError('Please select a department');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        cost,
        department_location: form.department_location,
      };
      if (editingItem) {
        const res = await api.updatePropertyEquipment(editingItem.id, payload);
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? res.item : it)));
        setSuccessType('success');
        setSuccess('Updated successfully!');
      } else {
        const res = await api.createPropertyEquipment(payload);
        setItems((prev) => [res.item, ...prev]);
        setSuccessType('success');
        setSuccess('Registered successfully!');
      }
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save');
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

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deletePropertyEquipment(itemToDelete.id);
      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
      setSuccessType('success');
      setSuccess('Deleted successfully!');
      closeDeleteModal();
    } catch (err) {
      setSuccessType('error');
      setSuccess(err.message || 'Failed to delete');
      closeDeleteModal();
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handleDownloadReportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(32, 64, 128);
    doc.text(SCHOOL_NAME, 20, y);
    y += 10;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Property & Equipment Registry', 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment/Property Name', 20, y);
    doc.text('Cost (XAF)', 120, y);
    doc.text('Department', 160, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    doc.line(20, y, 190, y);
    y += 8;

    const sorted = [...items].sort((a, b) =>
      (getDepartmentLabel(a) || '').localeCompare(getDepartmentLabel(b) || '') ||
      (a.name || '').localeCompare(b.name || '')
    );

    sorted.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text((item.name || '').substring(0, 45), 20, y);
      doc.text(formatCurrency(item.cost), 120, y, { align: 'right' });
      doc.text(getDepartmentLabel(item), 160, y);
      y += 7;
    });

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${items.length} item(s)`, 20, y);
    const totalCost = items.reduce((s, i) => s + (Number(i.cost) || 0), 0);
    doc.text(`Total Value: ${formatCurrency(totalCost)} XAF`, 120, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    doc.save(`Property-Equipment-Registry-${new Date().toISOString().slice(0, 10)}.pdf`);
    setShowReport(false);
  };

  return (
    <SideTop>
      {success && <SuccessMessage message={success} type={successType} onClose={() => setSuccess('')} />}
      <div className="pe-root">
        <div className="pe-header">
          <h1 className="pe-title">Property & Equipment Registry</h1>
          <div className="pe-actions">
            <button type="button" className="pe-generate-btn" onClick={handleGenerateReport}>
              <FaFileAlt /> Generate Report
            </button>
            <button type="button" className="pe-add-btn" onClick={openAddForm}>
              <FaPlus /> Add Equipment/Property
            </button>
          </div>
        </div>

        <div className="pe-content">
          {loading ? (
            <div className="pe-loading">Loading...</div>
          ) : (
            <div className="pe-table-wrap">
              <table className="pe-table">
                <thead>
                  <tr>
                    <th>Equipment/Property Name</th>
                    <th>Cost (XAF)</th>
                    <th>Department Location</th>
                    <th className="pe-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="pe-empty">
                        No property or equipment registered yet. Click &quot;Add Equipment/Property&quot; to register.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td className="pe-cost">{formatCurrency(item.cost)}</td>
                        <td><span className="pe-badge">{getDepartmentLabel(item)}</span></td>
                        <td className="pe-actions-cell">
                          <button
                            type="button"
                            className="pe-action-btn pe-edit"
                            onClick={() => openEditForm(item)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className="pe-action-btn pe-delete"
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

        {showForm && (
          <div className="pe-modal-overlay" onClick={() => !submitting && setShowForm(false)}>
            <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pe-modal-header">
                <h2>{editingItem ? 'Edit' : 'Register'} Equipment/Property</h2>
                <button
                  type="button"
                  className="pe-modal-close"
                  onClick={() => !submitting && setShowForm(false)}
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="pe-form">
                {error && <div className="pe-form-error">{error}</div>}
                <div className="pe-form-row">
                  <label>Equipment/Property Name <span className="pe-required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Laptop, Projector"
                    className="pe-input"
                    required
                  />
                </div>
                <div className="pe-form-row">
                  <label>Cost (XAF) <span className="pe-required">*</span></label>
                  <input
                    type="number"
                    name="cost"
                    value={form.cost}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="pe-input"
                    required
                  />
                </div>
                <div className="pe-form-row">
                  <label>Department Location <span className="pe-required">*</span></label>
                  <select
                    name="department_location"
                    value={form.department_location}
                    onChange={handleFormChange}
                    className="pe-input pe-select"
                    required
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="pe-form-actions">
                  <button
                    type="button"
                    className="pe-btn pe-btn-secondary"
                    onClick={() => !submitting && setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="pe-btn pe-btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReport && (
          <div className="pe-modal-overlay" onClick={() => setShowReport(false)}>
            <div className="pe-report-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pe-report-header">
                <h2>All School Properties</h2>
                <button type="button" className="pe-modal-close" onClick={() => setShowReport(false)}>×</button>
              </div>
              <div className="pe-report-body">
                <table className="pe-report-table">
                  <thead>
                    <tr>
                      <th>Equipment/Property Name</th>
                      <th>Cost (XAF)</th>
                      <th>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...items]
                      .sort((a, b) =>
                        (a.department_location || '').localeCompare(b.department_location || '') ||
                        (a.name || '').localeCompare(b.name || '')
                      )
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td className="pe-cost">{formatCurrency(item.cost)}</td>
                          <td>{item.department_location}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="pe-report-summary">
                  Total: {items.length} item(s) • Total Value: {formatCurrency(items.reduce((s, i) => s + (Number(i.cost) || 0), 0))} XAF
                </div>
              </div>
              <div className="pe-report-actions">
                <button type="button" className="pe-btn pe-btn-secondary" onClick={() => setShowReport(false)}>
                  Close
                </button>
                <button type="button" className="pe-btn pe-btn-primary" onClick={handleDownloadReportPDF}>
                  <FaFileAlt /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && itemToDelete && (
          <div className="pe-modal-overlay" onClick={closeDeleteModal}>
            <div className="pe-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pe-delete-modal-header">
                <h3>Confirm Delete</h3>
              </div>
              <div className="pe-delete-modal-body">
                <p>Are you sure you want to delete &quot;{itemToDelete.name}&quot;?</p>
              </div>
              <div className="pe-delete-modal-actions">
                <button type="button" className="pe-btn pe-btn-secondary" onClick={closeDeleteModal}>
                  Cancel
                </button>
                <button type="button" className="pe-btn pe-btn-delete" onClick={confirmDelete}>
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
