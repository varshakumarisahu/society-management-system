import React, { useState, useEffect } from 'react';
import './Maintenance.css';

// Mock Data
const MOCK_BILLS = [
  {
    id: 1,
    flatNumber: 'A-101',
    residentName: 'John Doe',
    amount: 2500,
    dueDate: '2026-07-15',
    status: 'Overdue',
    paymentDate: null,
    paymentMethod: null,
    transactionId: null,
    generatedDate: '2026-07-01',
    period: 'July 2026'
  },
  {
    id: 2,
    flatNumber: 'B-205',
    residentName: 'Sarah Smith',
    amount: 2200,
    dueDate: '2026-07-15',
    status: 'Paid',
    paymentDate: '2026-07-05',
    paymentMethod: 'Online Transfer',
    transactionId: 'TXN-12345',
    generatedDate: '2026-07-01',
    period: 'July 2026'
  },
  {
    id: 3,
    flatNumber: 'C-309',
    residentName: 'Mike Johnson',
    amount: 2800,
    dueDate: '2026-07-15',
    status: 'Pending',
    paymentDate: null,
    paymentMethod: null,
    transactionId: null,
    generatedDate: '2026-07-01',
    period: 'July 2026'
  },
  {
    id: 4,
    flatNumber: 'A-402',
    residentName: 'Emily Davis',
    amount: 2000,
    dueDate: '2026-06-15',
    status: 'Paid',
    paymentDate: '2026-06-12',
    paymentMethod: 'Cash',
    transactionId: 'TXN-12346',
    generatedDate: '2026-06-01',
    period: 'June 2026'
  },
  {
    id: 5,
    flatNumber: 'D-501',
    residentName: 'Charles Douglas',
    amount: 3000,
    dueDate: '2026-07-15',
    status: 'Overdue',
    paymentDate: null,
    paymentMethod: null,
    transactionId: null,
    generatedDate: '2026-07-01',
    period: 'July 2026'
  },
  {
    id: 6,
    flatNumber: 'A-101',
    residentName: 'John Doe',
    amount: 2500,
    dueDate: '2026-06-15',
    status: 'Paid',
    paymentDate: '2026-06-10',
    paymentMethod: 'Online Transfer',
    transactionId: 'TXN-12347',
    generatedDate: '2026-06-01',
    period: 'June 2026'
  }
];

const Maintenance = () => {
  const [bills, setBills] = useState(MOCK_BILLS);
  const [filteredBills, setFilteredBills] = useState(MOCK_BILLS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({
    flatNumber: '',
    residentName: '',
    amount: '',
    dueDate: '',
    period: '',
    status: 'Pending'
  });

  // Calculate summary stats
  const [summary, setSummary] = useState({
    totalDues: 0,
    overdue: 0,
    paidThisMonth: 0,
    pending: 0
  });

  useEffect(() => {
    // Update summary
    const totalDues = bills.reduce((sum, b) => sum + b.amount, 0);
    const overdue = bills.filter(b => b.status === 'Overdue').length;
    const pending = bills.filter(b => b.status === 'Pending').length;
    const paidThisMonth = bills.filter(b => 
      b.status === 'Paid' && 
      new Date(b.paymentDate).getMonth() === new Date().getMonth() &&
      new Date(b.paymentDate).getFullYear() === new Date().getFullYear()
    ).reduce((sum, b) => sum + b.amount, 0);

    setSummary({ totalDues, overdue, pending, paidThisMonth });
  }, [bills]);

  // Filter bills
  useEffect(() => {
    let filtered = bills;
    
    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(b => 
        b.status.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    
    setFilteredBills(filtered);
  }, [searchTerm, selectedFilter, bills]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateBill = () => {
    // Set default due date to 15th of next month
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    const defaultDue = nextMonth.toISOString().split('T')[0];
    const period = nextMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    setEditingBill(null);
    setFormData({
      flatNumber: '',
      residentName: '',
      amount: '',
      dueDate: defaultDue,
      period: period,
      status: 'Pending'
    });
    setShowModal(true);
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setFormData({
      flatNumber: bill.flatNumber,
      residentName: bill.residentName,
      amount: bill.amount.toString(),
      dueDate: bill.dueDate,
      period: bill.period,
      status: bill.status
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const now = new Date().toISOString().split('T')[0];
    if (editingBill) {
      setBills(bills.map(b => 
        b.id === editingBill.id ? { 
          ...b, 
          flatNumber: formData.flatNumber,
          residentName: formData.residentName,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate,
          period: formData.period,
          status: formData.status
        } : b
      ));
    } else {
      const newBill = {
        id: bills.length + 1,
        flatNumber: formData.flatNumber,
        residentName: formData.residentName,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        period: formData.period,
        status: formData.status || 'Pending',
        paymentDate: null,
        paymentMethod: null,
        transactionId: null,
        generatedDate: now
      };
      setBills([...bills, newBill]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      setBills(bills.filter(b => b.id !== id));
    }
  };

  const handleMarkPaid = (id) => {
    const method = prompt('Enter payment method (e.g., Online Transfer, Cash, Cheque):');
    if (method !== null && method.trim() !== '') {
      const now = new Date().toISOString().split('T')[0];
      const txnId = 'TXN-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      setBills(bills.map(b => 
        b.id === id ? { 
          ...b, 
          status: 'Paid', 
          paymentDate: now, 
          paymentMethod: method.trim(),
          transactionId: txnId
        } : b
      ));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <span className="status-badge paid">● Paid</span>;
      case 'Pending':
        return <span className="status-badge pending">● Pending</span>;
      case 'Overdue':
        return <span className="status-badge overdue">● Overdue</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'Paid') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="maintenance-container">
      {/* Header */}
      <div className="maintenance-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-tools"></i> Maintenance Management
          </h1>
          <span className="total-count">Total Bills: {filteredBills.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleGenerateBill}>
            <i className="fas fa-plus"></i> Generate Bill
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card glass">
          <div className="summary-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{formatCurrency(summary.totalDues)}</div>
            <div className="summary-label">Total Dues</div>
          </div>
        </div>

        <div className="summary-card glass">
          <div className="summary-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{summary.overdue}</div>
            <div className="summary-label">Overdue Bills</div>
          </div>
        </div>

        <div className="summary-card glass">
          <div className="summary-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{summary.pending}</div>
            <div className="summary-label">Pending Bills</div>
          </div>
        </div>

        <div className="summary-card glass">
          <div className="summary-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{formatCurrency(summary.paidThisMonth)}</div>
            <div className="summary-label">Paid This Month</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by flat, resident, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading bills...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>BILL ID</th>
                  <th>FLAT</th>
                  <th>RESIDENT</th>
                  <th>AMOUNT</th>
                  <th>DUE DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <i className="fas fa-receipt"></i>
                      <span>No bills found</span>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className={bill.status === 'Overdue' ? 'overdue-row' : ''}>
                      <td>#{bill.id}</td>
                      <td>{bill.flatNumber}</td>
                      <td>{bill.residentName}</td>
                      <td><strong>{formatCurrency(bill.amount)}</strong></td>
                      <td>
                        {formatDate(bill.dueDate)}
                        {bill.status === 'Overdue' && (
                          <span className="overdue-icon"> ⚠️</span>
                        )}
                      </td>
                      <td>{getStatusBadge(bill.status)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view"
                            onClick={() => {
                              const details = `
                                Bill ID: #${bill.id}
                                Flat: ${bill.flatNumber}
                                Resident: ${bill.residentName}
                                Amount: ${formatCurrency(bill.amount)}
                                Period: ${bill.period}
                                Due Date: ${formatDate(bill.dueDate)}
                                Status: ${bill.status}
                                ${bill.status === 'Paid' ? `
                                Payment Date: ${formatDate(bill.paymentDate)}
                                Payment Method: ${bill.paymentMethod}
                                Transaction ID: ${bill.transactionId}
                                ` : ''}
                              `;
                              alert(details);
                            }}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          {bill.status !== 'Paid' && (
                            <button 
                              className="action-btn mark-paid"
                              onClick={() => handleMarkPaid(bill.id)}
                              title="Mark as Paid"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEdit(bill)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(bill.id)}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingBill ? 'Edit Bill' : 'Generate New Bill'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Flat Number *</label>
                  <input
                    type="text"
                    name="flatNumber"
                    value={formData.flatNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., A-101"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Resident Name *</label>
                  <input
                    type="text"
                    name="residentName"
                    value={formData.residentName}
                    onChange={handleInputChange}
                    placeholder="Enter resident name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="Enter amount"
                    min="0"
                    step="100"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Period</label>
                  <input
                    type="text"
                    name="period"
                    value={formData.period}
                    onChange={handleInputChange}
                    placeholder="e.g., July 2026"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingBill ? 'Update Bill' : 'Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;