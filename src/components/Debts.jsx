import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import logo from '../assets/logo.png';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaMoneyBillWave,
  FaDownload,
  FaPrint,
  FaHandHoldingUsd,
  FaBalanceScale,
  FaExclamationCircle,
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SuccessMessage from './SuccessMessage';
import { useActiveYear } from '../context/ActiveYearContext';
import './Finance.css';
import './ReportFinances.css';
import './Debts.css';

const SCHOOL_NAME = 'VOTECH S7 ACADEMY';
const TAB_TYPES = {
  owed_by_school: 'Debts We Owe',
  owed_to_school: 'Debts Owed To Us',
};

const EMPTY_SUMMARY = {
  owed_by_school: { total_balance: 0, open_count: 0, record_count: 0 },
  owed_to_school: { total_balance: 0, open_count: 0, record_count: 0 },
};

const EMPTY_FORM = {
  party_name: '',
  amount: '',
  description: '',
  reference_number: '',
  date_recorded: new Date().toISOString().slice(0, 10),
  due_date: '',
  academic_year_id: '',
  status: 'open',
};

function formatXaf(value) {
  return (
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0) + ' XAF'
  );
}

function statusLabel(status) {
  if (status === 'written_off') return 'Written off';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
}

export default function Debts() {
  const { activeYear } = useActiveYear();
  const [activeTab, setActiveTab] = useState('owed_by_school');
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
    search: '',
  });
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('success');

  const notify = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [paymentDebt, setPaymentDebt] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        type: activeTab,
        ...filters,
      };
      Object.keys(query).forEach((key) => {
        if (!query[key]) delete query[key];
      });

      const [list, summaryData] = await Promise.all([
        api.getDebts(query),
        api.getDebtsSummary({ from: filters.from || undefined, to: filters.to || undefined }),
      ]);

      setDebts(Array.isArray(list) ? list : []);
      setSummary(summaryData || EMPTY_SUMMARY);
    } catch (err) {
      setDebts([]);
      setSummary(EMPTY_SUMMARY);
      notify(err.message || 'Failed to load debts', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    if (!activeYear?.id) {
      notify('No active academic year is configured. Contact Admin3.', 'error');
      return;
    }
    setEditingDebt(null);
    setFormData({
      ...EMPTY_FORM,
      status: 'open',
      academic_year_id: String(activeYear.id),
    });
    setFormModalOpen(true);
  };

  const openEditModal = (debt) => {
    setEditingDebt(debt);
    setFormData({
      party_name: debt.party_name || '',
      amount: String(debt.amount ?? ''),
      description: debt.description || '',
      reference_number: debt.reference_number || '',
      date_recorded: debt.date_recorded
        ? String(debt.date_recorded).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      due_date: debt.due_date ? String(debt.due_date).slice(0, 10) : '',
      academic_year_id: debt.academic_year_id ? String(debt.academic_year_id) : '',
      status: debt.status || 'open',
    });
    setFormModalOpen(true);
  };

  const openPaymentModal = (debt) => {
    setPaymentDebt(debt);
    setPaymentAmount('');
    setPaymentModalOpen(true);
  };

  const handleSaveDebt = async (e) => {
    e.preventDefault();
    const yearId = editingDebt
      ? editingDebt.academic_year_id || activeYear?.id
      : activeYear?.id;

    if (!yearId) {
      notify('No active academic year is configured. Contact Admin3.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: activeTab,
        party_name: formData.party_name.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || null,
        reference_number: formData.reference_number.trim() || null,
        date_recorded: formData.date_recorded,
        due_date: formData.due_date || null,
        academic_year_id: Number(yearId),
        status: formData.status,
      };

      if (editingDebt) {
        await api.updateDebt(editingDebt.id, payload);
        notify('Debt record updated successfully.');
      } else {
        await api.createDebt(payload);
        notify('Debt record created successfully.');
      }

      setFormModalOpen(false);
      await loadData();
    } catch (err) {
      notify(err.message || 'Failed to save debt record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentDebt) return;
    setSaving(true);
    try {
      await api.recordDebtPayment(paymentDebt.id, {
        amount: parseFloat(paymentAmount),
      });
      notify('Payment recorded successfully.');
      setPaymentModalOpen(false);
      await loadData();
    } catch (err) {
      notify(err.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (debt) => {
    if (!window.confirm(`Delete debt record for "${debt.party_name}"?`)) return;
    try {
      await api.deleteDebt(debt.id);
      notify('Debt record deleted.');
      await loadData();
    } catch (err) {
      notify(err.message || 'Failed to delete debt record', 'error');
    }
  };

  const exportRows = useMemo(
    () =>
      debts.map((debt, index) => [
        index + 1,
        debt.party_name,
        debt.reference_number || '—',
        formatXaf(debt.amount),
        formatXaf(debt.amount_paid),
        formatXaf(debt.balance),
        statusLabel(debt.status),
        debt.due_date ? String(debt.due_date).slice(0, 10) : '—',
        debt.date_recorded ? String(debt.date_recorded).slice(0, 10) : '—',
      ]),
    [debts]
  );

  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = TAB_TYPES[activeTab];
    doc.setFontSize(16);
    doc.setTextColor(32, 64, 128);
    doc.text(SCHOOL_NAME, 14, 16);
    doc.setFontSize(12);
    doc.text(title, 14, 24);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [
        [
          '#',
          'Party',
          'Reference',
          'Amount',
          'Paid',
          'Balance',
          'Status',
          'Due Date',
          'Recorded',
        ],
      ],
      body: exportRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [32, 64, 128], textColor: 255 },
    });

    doc.save(`${title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrint = () => {
    const esc = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const rowsHtml = debts
      .map(
        (debt, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(debt.party_name)}</td>
        <td>${esc(debt.reference_number || '—')}</td>
        <td class="amt">${esc(formatXaf(debt.amount))}</td>
        <td class="amt">${esc(formatXaf(debt.amount_paid))}</td>
        <td class="amt">${esc(formatXaf(debt.balance))}</td>
        <td>${esc(statusLabel(debt.status))}</td>
        <td>${esc(debt.due_date ? String(debt.due_date).slice(0, 10) : '—')}</td>
        <td>${esc(debt.date_recorded ? String(debt.date_recorded).slice(0, 10) : '—')}</td>
      </tr>`
      )
      .join('');

    const logoSrc = logo
      ? String(logo).startsWith('http')
        ? logo
        : window.location.origin +
          (String(logo).startsWith('/') ? logo : '/' + logo)
      : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(TAB_TYPES[activeTab])}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
  .hdr { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; border-bottom: 2px solid #204080; padding-bottom: 12px; }
  .hdr img { width: 56px; height: 56px; object-fit: contain; }
  h1 { color: #204080; margin: 0; font-size: 20px; }
  h2 { margin: 4px 0 0; font-size: 14px; color: #555; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #204080; color: #fff; padding: 8px; text-align: left; }
  td { border: 1px solid #ddd; padding: 7px 8px; }
  .amt { text-align: right; }
</style></head><body>
  <div class="hdr">
    <img src="${logoSrc}" alt="Logo" />
    <div><h1>${esc(SCHOOL_NAME)}</h1><h2>${esc(TAB_TYPES[activeTab])}</h2></div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Party</th><th>Reference</th><th>Amount</th><th>Paid</th>
      <th>Balance</th><th>Status</th><th>Due Date</th><th>Recorded</th>
    </tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="9">No records</td></tr>'}</tbody>
  </table>
  <script>window.onload=function(){window.print();};</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('Please allow pop-ups to print the report.');
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const totalOpen =
    (summary.owed_by_school?.open_count || 0) +
    (summary.owed_to_school?.open_count || 0);

  return (
    <SideTop>
      {showToast && (
        <SuccessMessage
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
      <div className="rf-root">
        <div className="rf-print-header">
          <img src={logo} alt="VOTECH Logo" className="rf-print-logo" />
          <span className="rf-print-school">{SCHOOL_NAME}</span>
        </div>

        <div className="rf-page-header">
          <h1 className="rf-page-title">Debt Recording</h1>
          <div className="rf-statement-actions">
            <button type="button" className="rf-download-pdf-btn" onClick={handleExportPdf}>
              <FaDownload /> Export PDF
            </button>
            <button type="button" className="rf-print-btn rf-print-btn-top" onClick={handlePrint}>
              <FaPrint /> Print
            </button>
          </div>
        </div>

        <div className="finance-container debts-cards-row" style={{ maxWidth: '100%', padding: 0 }}>
          <div className="dashboard-cards">
            <div className="card we-owe">
              <div className="icon"><FaHandHoldingUsd /></div>
              <div className="count">{formatXaf(summary.owed_by_school?.total_balance)}</div>
              <div className="desc">Debts We Owe (balance)</div>
            </div>
            <div className="card owed-to-us">
              <div className="icon"><FaBalanceScale /></div>
              <div className="count">{formatXaf(summary.owed_to_school?.total_balance)}</div>
              <div className="desc">Debts Owed To Us (balance)</div>
            </div>
            <div className="card open-debts">
              <div className="icon"><FaExclamationCircle /></div>
              <div className="count">{totalOpen}</div>
              <div className="desc">Open / Partial Records</div>
            </div>
          </div>
        </div>

        <div className="rf-tabs">
          {Object.entries(TAB_TYPES).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rf-tab ${activeTab === key ? 'rf-tab-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="debts-toolbar">
          <div className="debts-toolbar-group">
            <label htmlFor="debts-search">Search</label>
            <input
              id="debts-search"
              type="text"
              placeholder="Party, reference, description…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div className="debts-toolbar-group">
            <label htmlFor="debts-status">Status</label>
            <select
              id="debts-status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="written_off">Written off</option>
            </select>
          </div>
          <div className="debts-toolbar-group">
            <label htmlFor="debts-from">From</label>
            <input
              id="debts-from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="debts-toolbar-group">
            <label htmlFor="debts-to">To</label>
            <input
              id="debts-to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div className="debts-toolbar-actions">
            <button type="button" className="debts-btn debts-btn-primary" onClick={openCreateModal}>
              <FaPlus /> New Debt
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rf-loading">Loading debt records…</div>
        ) : (
          <div className="rf-table-wrap">
            <table className="rf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Party</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.length === 0 ? (
                  <tr className="rf-empty-row">
                    <td colSpan={9} className="rf-empty">
                      No debt records for this tab and filter.
                    </td>
                  </tr>
                ) : (
                  debts.map((debt, index) => (
                    <tr key={debt.id}>
                      <td data-label="#">{index + 1}</td>
                      <td data-label="Party">{debt.party_name}</td>
                      <td data-label="Reference">{debt.reference_number || '—'}</td>
                      <td className="rf-amount-cell" data-label="Amount">
                        {formatXaf(debt.amount)}
                      </td>
                      <td className="rf-amount-cell" data-label="Paid">
                        {formatXaf(debt.amount_paid)}
                      </td>
                      <td className="rf-amount-cell" data-label="Balance">
                        {formatXaf(debt.balance)}
                      </td>
                      <td data-label="Status">
                        <span className={`debts-status debts-status-${debt.status}`}>
                          {statusLabel(debt.status)}
                        </span>
                      </td>
                      <td data-label="Due Date">
                        {debt.due_date ? String(debt.due_date).slice(0, 10) : '—'}
                      </td>
                      <td data-label="Actions">
                        <div className="debts-actions-cell">
                          {debt.status !== 'paid' && debt.status !== 'written_off' && (
                            <button
                              type="button"
                              className="debts-btn debts-btn-success debts-btn-sm"
                              onClick={() => openPaymentModal(debt)}
                            >
                              <FaMoneyBillWave /> Pay
                            </button>
                          )}
                          <button
                            type="button"
                            className="debts-btn debts-btn-secondary debts-btn-sm"
                            onClick={() => openEditModal(debt)}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            type="button"
                            className="debts-btn debts-btn-danger debts-btn-sm"
                            onClick={() => handleDelete(debt)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formModalOpen && (
        <div className="debts-modal-overlay" onClick={() => !saving && setFormModalOpen(false)}>
          <div className="debts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="debts-modal-header">
              <h2>{editingDebt ? 'Edit Debt Record' : 'New Debt Record'}</h2>
              <button
                type="button"
                className="debts-modal-close"
                onClick={() => !saving && setFormModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveDebt}>
              <div className="debts-modal-body">
                <div className="debts-form-row">
                  <label htmlFor="party_name">Party Name *</label>
                  <input
                    id="party_name"
                    required
                    value={formData.party_name}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, party_name: e.target.value }))
                    }
                  />
                </div>
                <div className="debts-form-grid">
                  <div className="debts-form-row">
                    <label htmlFor="amount">Amount (XAF) *</label>
                    <input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, amount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="debts-form-row">
                    <label htmlFor="reference_number">Reference #</label>
                    <input
                      id="reference_number"
                      value={formData.reference_number}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, reference_number: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="debts-form-grid">
                  <div className="debts-form-row">
                    <label htmlFor="date_recorded">Date Recorded</label>
                    <input
                      id="date_recorded"
                      type="date"
                      required
                      value={formData.date_recorded}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, date_recorded: e.target.value }))
                      }
                    />
                  </div>
                  <div className="debts-form-row">
                    <label htmlFor="due_date">Due Date</label>
                    <input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, due_date: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="debts-form-grid">
                  <div className="debts-form-row">
                    <label htmlFor="academic_year_display">Academic Year *</label>
                    <input
                      id="academic_year_display"
                      type="text"
                      readOnly
                      className="debts-readonly-field"
                      value={
                        editingDebt
                          ? editingDebt.academic_year_name ||
                            activeYear?.name ||
                            `Year ${editingDebt.academic_year_id}`
                          : activeYear?.name || 'No active academic year'
                      }
                    />
                  </div>
                  {editingDebt && (
                    <div className="debts-form-row">
                      <label htmlFor="status">Status</label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, status: e.target.value }))
                        }
                      >
                        <option value="open">Open</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="written_off">Written off</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="debts-form-row">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="debts-modal-footer">
                <button
                  type="button"
                  className="debts-btn debts-btn-secondary"
                  onClick={() => setFormModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="debts-btn debts-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingDebt ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentModalOpen && paymentDebt && (
        <div className="debts-modal-overlay" onClick={() => !saving && setPaymentModalOpen(false)}>
          <div className="debts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="debts-modal-header">
              <h2>Record Payment</h2>
              <button
                type="button"
                className="debts-modal-close"
                onClick={() => !saving && setPaymentModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="debts-modal-body">
                <p>
                  <strong>{paymentDebt.party_name}</strong>
                  <br />
                  Remaining balance: <strong>{formatXaf(paymentDebt.balance)}</strong>
                </p>
                <div className="debts-form-row">
                  <label htmlFor="payment_amount">Payment Amount (XAF) *</label>
                  <input
                    id="payment_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={paymentDebt.balance}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="debts-modal-footer">
                <button
                  type="button"
                  className="debts-btn debts-btn-secondary"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="debts-btn debts-btn-success" disabled={saving}>
                  {saving ? 'Recording…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SideTop>
  );
}
