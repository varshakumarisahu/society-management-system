import React, { useCallback, useEffect, useState } from 'react';
import { apiJson, apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Maintenance.css';

const emptyGenerateForm = { amount: '', billingPeriodStart: '', billingPeriodEnd: '', dueDate: '', flatId: '' };
const emptyPaymentForm = { amountPaid: '', paymentMode: 'upi', transactionRef: '' };

const Maintenance = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'committee_member';
  const [bills, setBills] = useState([]);
  const [flats, setFlats] = useState([]);
  const [summary, setSummary] = useState({ total_billed: 0, total_paid: 0, pending_dues: 0, pending_bills: 0, overdue_bills: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [historyBill, setHistoryBill] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentBill, setPaymentBill] = useState(null);
  const [generateForm, setGenerateForm] = useState(emptyGenerateForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billRows, summaryData, flatResponse] = await Promise.all([
        apiRequest('/api/v1/maintenance'),
        apiRequest('/api/v1/maintenance/summary'),
        canManage ? apiRequest('/api/v1/flats') : Promise.resolve({ items: [] })
      ]);
      setBills(billRows);
      setSummary(summaryData);
      setFlats(flatResponse.items || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredBills = bills.filter(bill => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [bill.flat_number, bill.block_name, bill.resident_names]
      .some(value => value?.toLowerCase().includes(query)) || String(bill.bill_id).includes(query);
    const matchesStatus = selectedFilter === 'all' || bill.status === selectedFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = amount => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2
  }).format(Number(amount || 0));

  const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '—';

  const periodName = bill => `${formatDate(bill.billing_period_start)} – ${formatDate(bill.billing_period_end)}`;
  const statusLabel = status => ({ unpaid: 'Pending', partially_paid: 'Partially Paid', paid: 'Paid', overdue: 'Overdue' }[status] || status);
  const statusClass = status => ({ unpaid: 'pending', partially_paid: 'partial', paid: 'paid', overdue: 'overdue' }[status] || 'pending');

  const openGenerate = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const due = new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().slice(0, 10);
    setGenerateForm({ ...emptyGenerateForm, billingPeriodStart: start, billingPeriodEnd: end, dueDate: due });
    setNotice('');
    setError('');
    setShowGenerateModal(true);
  };

  const submitGeneration = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/api/v1/maintenance/generate', apiJson('POST', {
        amount: Number(generateForm.amount),
        billing_period_start: generateForm.billingPeriodStart,
        billing_period_end: generateForm.billingPeriodEnd,
        due_date: generateForm.dueDate,
        ...(generateForm.flatId ? { flat_id: Number(generateForm.flatId) } : {})
      }));
      setShowGenerateModal(false);
      setNotice(`Generated ${result.generated} bill(s); skipped ${result.skipped} duplicate bill(s).`);
      await loadData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openPayment = bill => {
    setPaymentBill(bill);
    setPaymentForm({ ...emptyPaymentForm, amountPaid: String(bill.outstanding) });
    setError('');
    setShowPaymentModal(true);
  };

  const submitPayment = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/v1/maintenance/${paymentBill.bill_id}/payments`, apiJson('POST', {
        amount_paid: Number(paymentForm.amountPaid),
        payment_mode: paymentForm.paymentMode,
        transaction_ref: paymentForm.transactionRef.trim() || null
      }));
      setShowPaymentModal(false);
      setNotice('Payment recorded and bill status updated.');
      await loadData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const showHistory = async bill => {
    setError('');
    try {
      const rows = await apiRequest(`/api/v1/maintenance/${bill.bill_id}/payments`);
      setPayments(rows);
      setHistoryBill(bill);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="maintenance-container">
      <div className="maintenance-header glass">
        <div className="header-left"><h1><i className="fas fa-tools"></i> Maintenance Management</h1><span className="total-count">Bills: {filteredBills.length}</span></div>
        {canManage && <div className="header-actions"><button className="btn-primary" onClick={openGenerate}><i className="fas fa-plus"></i> Generate Bills</button></div>}
      </div>

      {error && <div className="maintenance-error" role="alert">{error}</div>}
      {notice && <div className="maintenance-notice" role="status">{notice}</div>}

      <div className="summary-grid">
        <div className="summary-card glass"><div className="summary-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}><i className="fas fa-file-invoice-dollar"></i></div><div className="summary-content"><div className="summary-value">{formatCurrency(summary.total_billed)}</div><div className="summary-label">Total Billed</div></div></div>
        <div className="summary-card glass"><div className="summary-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}><i className="fas fa-check-circle"></i></div><div className="summary-content"><div className="summary-value">{formatCurrency(summary.total_paid)}</div><div className="summary-label">Payments Received</div></div></div>
        <div className="summary-card glass"><div className="summary-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}><i className="fas fa-clock"></i></div><div className="summary-content"><div className="summary-value">{formatCurrency(summary.pending_dues)}</div><div className="summary-label">Pending Dues</div></div></div>
        <div className="summary-card glass"><div className="summary-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}><i className="fas fa-exclamation-triangle"></i></div><div className="summary-content"><div className="summary-value">{summary.overdue_bills}</div><div className="summary-label">Overdue Bills</div></div></div>
      </div>

      <div className="search-filter-section glass">
        <div className="search-box"><i className="fas fa-search"></i><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search by flat, block, or resident..." /></div>
        <div className="filter-group"><select value={selectedFilter} onChange={event => setSelectedFilter(event.target.value)} className="filter-select">
          <option value="all">All Status</option><option value="unpaid">Pending</option><option value="partially_paid">Partially Paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
        </select></div>
      </div>

      <div className="table-container glass">
        {loading ? <div className="loading-state"><div className="spinner"></div><p>Loading bills...</p></div> : <div className="table-wrapper">
          <table className="maintenance-table"><thead><tr><th>BILL</th><th>FLAT</th><th>RESIDENTS</th><th>PERIOD</th><th>AMOUNT</th><th>PAID / DUE</th><th>DUE DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>{filteredBills.length === 0 ? <tr><td colSpan="9" className="empty-row"><i className="fas fa-receipt"></i><span>No bills found</span></td></tr> : filteredBills.map(bill => (
              <tr key={bill.bill_id} className={bill.status === 'overdue' ? 'overdue-row' : ''}>
                <td>#{bill.bill_id}</td><td>{bill.flat_number}<small className="maintenance-subtext">{bill.block_name}</small></td><td>{bill.resident_names || 'No active resident'}</td><td>{periodName(bill)}</td>
                <td><strong>{formatCurrency(bill.amount)}</strong></td><td>{formatCurrency(bill.amount_paid)} paid<small className="maintenance-subtext">{formatCurrency(bill.outstanding)} due</small></td><td>{formatDate(bill.due_date)}</td>
                <td><span className={`status-badge ${statusClass(bill.status)}`}>● {statusLabel(bill.status)}</span></td>
                <td><div className="action-buttons">
                  <button className="action-btn view" onClick={() => showHistory(bill)} title="Payment history"><i className="fas fa-history"></i></button>
                  {canManage && Number(bill.outstanding) > 0 && <button className="action-btn mark-paid" onClick={() => openPayment(bill)} title="Record payment"><i className="fas fa-money-bill-wave"></i></button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </div>

      {showGenerateModal && <div className="modal-overlay" onClick={() => !saving && setShowGenerateModal(false)}><div className="modal glass" onClick={event => event.stopPropagation()}>
        <form onSubmit={submitGeneration}><div className="modal-header"><h2>Generate Maintenance Bills</h2><button type="button" className="modal-close" onClick={() => setShowGenerateModal(false)}><i className="fas fa-times"></i></button></div>
          <div className="modal-body">{error && <div className="maintenance-error">{error}</div>}<div className="form-grid">
            <div className="form-group full-width"><label>Flat</label><select value={generateForm.flatId} onChange={event => setGenerateForm({ ...generateForm, flatId: event.target.value })}><option value="">All flats</option>{flats.map(flat => <option key={flat.flat_id} value={flat.flat_id}>{flat.flat_number} — {flat.block_name}</option>)}</select><small>Existing bills for the same flat and period are skipped.</small></div>
            <div className="form-group"><label>Charge amount (₹) *</label><input type="number" min="0.01" step="0.01" value={generateForm.amount} onChange={event => setGenerateForm({ ...generateForm, amount: event.target.value })} required /></div>
            <div className="form-group"><label>Due date *</label><input type="date" value={generateForm.dueDate} onChange={event => setGenerateForm({ ...generateForm, dueDate: event.target.value })} required /></div>
            <div className="form-group"><label>Period starts *</label><input type="date" value={generateForm.billingPeriodStart} onChange={event => setGenerateForm({ ...generateForm, billingPeriodStart: event.target.value })} required /></div>
            <div className="form-group"><label>Period ends *</label><input type="date" value={generateForm.billingPeriodEnd} onChange={event => setGenerateForm({ ...generateForm, billingPeriodEnd: event.target.value })} required /></div>
          </div></div>
          <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowGenerateModal(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Generating...' : 'Generate Bills'}</button></div>
        </form>
      </div></div>}

      {showPaymentModal && paymentBill && <div className="modal-overlay" onClick={() => !saving && setShowPaymentModal(false)}><div className="modal glass" onClick={event => event.stopPropagation()}>
        <form onSubmit={submitPayment}><div className="modal-header"><h2>Record Payment — Flat {paymentBill.flat_number}</h2><button type="button" className="modal-close" onClick={() => setShowPaymentModal(false)}><i className="fas fa-times"></i></button></div>
          <div className="modal-body">{error && <div className="maintenance-error">{error}</div>}<p>Outstanding balance: <strong>{formatCurrency(paymentBill.outstanding)}</strong></p><div className="form-grid">
            <div className="form-group"><label>Payment amount (₹) *</label><input type="number" min="0.01" max={paymentBill.outstanding} step="0.01" value={paymentForm.amountPaid} onChange={event => setPaymentForm({ ...paymentForm, amountPaid: event.target.value })} required /></div>
            <div className="form-group"><label>Payment method *</label><select value={paymentForm.paymentMode} onChange={event => setPaymentForm({ ...paymentForm, paymentMode: event.target.value })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="net_banking">Net Banking</option><option value="other">Other</option></select></div>
            <div className="form-group full-width"><label>Transaction reference</label><input value={paymentForm.transactionRef} onChange={event => setPaymentForm({ ...paymentForm, transactionRef: event.target.value })} maxLength="150" /></div>
          </div></div>
          <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button></div>
        </form>
      </div></div>}

      {historyBill && <div className="modal-overlay" onClick={() => setHistoryBill(null)}><div className="modal glass" onClick={event => event.stopPropagation()}>
        <div className="modal-header"><h2>Payment History — Flat {historyBill.flat_number}</h2><button className="modal-close" onClick={() => setHistoryBill(null)}><i className="fas fa-times"></i></button></div>
        <div className="modal-body">{payments.length ? <div className="payment-history-list">{payments.map(payment => <div className="payment-history-item" key={payment.payment_id}><strong>{formatCurrency(payment.amount_paid)}</strong><span>{payment.payment_mode.replaceAll('_', ' ').toUpperCase()}</span><span>{new Date(payment.payment_date).toLocaleString()}</span><span>{payment.recorded_by_name || 'System'}{payment.transaction_ref ? ` · ${payment.transaction_ref}` : ''}</span></div>)}</div> : <div className="empty-row">No payments recorded for this bill.</div>}</div>
        <div className="modal-footer"><button className="btn-secondary" onClick={() => setHistoryBill(null)}>Close</button></div>
      </div></div>}
    </div>
  );
};

export default Maintenance;
