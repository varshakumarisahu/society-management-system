import React, { useState, useEffect } from 'react';
import './Visitors.css';

// Mock Data
const MOCK_VISITORS = [
  {
    id: 1,
    name: 'Amit Kumar',
    contact: '+91 98765 43210',
    whomToMeet: 'John Doe',
    flatNumber: 'A-101',
    purpose: 'Family Visit',
    checkIn: '2026-07-20 09:30:00',
    checkOut: '2026-07-20 11:15:00',
    status: 'Checked Out',
    securityGuard: 'Ramesh Singh'
  },
  {
    id: 2,
    name: 'Priya Sharma',
    contact: '+91 98765 43211',
    whomToMeet: 'Sarah Smith',
    flatNumber: 'B-205',
    purpose: 'Delivery',
    checkIn: '2026-07-20 10:00:00',
    checkOut: null,
    status: 'In',
    securityGuard: 'Vikram Patel'
  },
  {
    id: 3,
    name: 'Rahul Verma',
    contact: '+91 98765 43212',
    whomToMeet: 'Mike Johnson',
    flatNumber: 'C-309',
    purpose: 'Business Meeting',
    checkIn: '2026-07-19 14:30:00',
    checkOut: '2026-07-19 16:45:00',
    status: 'Checked Out',
    securityGuard: 'Ramesh Singh'
  },
  {
    id: 4,
    name: 'Sunita Gupta',
    contact: '+91 98765 43213',
    whomToMeet: 'Emily Davis',
    flatNumber: 'A-402',
    purpose: 'Friend Visit',
    checkIn: '2026-07-20 08:45:00',
    checkOut: null,
    status: 'In',
    securityGuard: 'Vikram Patel'
  },
  {
    id: 5,
    name: 'Deepak Singh',
    contact: '+91 98765 43214',
    whomToMeet: 'Charles Douglas',
    flatNumber: 'D-501',
    purpose: 'Maintenance',
    checkIn: '2026-07-19 11:00:00',
    checkOut: '2026-07-19 13:30:00',
    status: 'Checked Out',
    securityGuard: 'Ramesh Singh'
  }
];

const Visitors = () => {
  const [visitors, setVisitors] = useState(MOCK_VISITORS);
  const [filteredVisitors, setFilteredVisitors] = useState(MOCK_VISITORS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    whomToMeet: '',
    flatNumber: '',
    purpose: '',
    checkIn: '',
    checkOut: '',
    status: 'In',
    securityGuard: ''
  });

  // Filter visitors
  useEffect(() => {
    let filtered = visitors;
    
    if (searchTerm) {
      filtered = filtered.filter(visitor =>
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.contact.includes(searchTerm) ||
        visitor.whomToMeet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(visitor => 
        visitor.status.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    
    setFilteredVisitors(filtered);
  }, [searchTerm, selectedFilter, visitors]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNew = () => {
    setEditingVisitor(null);
    setFormData({
      name: '',
      contact: '',
      whomToMeet: '',
      flatNumber: '',
      purpose: '',
      checkIn: new Date().toLocaleString('en-US', { hour12: false }).replace(',', ''),
      checkOut: '',
      status: 'In',
      securityGuard: 'Ramesh Singh' // default guard
    });
    setShowModal(true);
  };

  const handleEdit = (visitor) => {
    setEditingVisitor(visitor);
    setFormData(visitor);
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingVisitor) {
      setVisitors(visitors.map(v => 
        v.id === editingVisitor.id ? { ...formData, id: v.id } : v
      ));
    } else {
      const newVisitor = {
        ...formData,
        id: visitors.length + 1,
        checkIn: formData.checkIn || new Date().toLocaleString('en-US', { hour12: false }).replace(',', ''),
        checkOut: formData.checkOut || null,
        status: formData.status || 'In'
      };
      setVisitors([...visitors, newVisitor]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this visitor record?')) {
      setVisitors(visitors.filter(v => v.id !== id));
    }
  };

  const handleCheckOut = (id) => {
    const now = new Date().toLocaleString('en-US', { hour12: false }).replace(',', '');
    setVisitors(visitors.map(v => 
      v.id === id ? { ...v, checkOut: now, status: 'Checked Out' } : v
    ));
  };

  const getStatusBadge = (status) => {
    if (status === 'In') {
      return <span className="status-badge in">● In</span>;
    } else if (status === 'Checked Out') {
      return <span className="status-badge checked-out">● Checked Out</span>;
    }
    return <span className="status-badge">{status}</span>;
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="visitors-container">
      {/* Header */}
      <div className="visitors-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-user-friends"></i> Visitor Management
          </h1>
          <span className="total-count">Total Visitors: {filteredVisitors.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Register Visitor
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by name, contact, flat, or whom to meet..."
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
            <option value="in">In</option>
            <option value="checked out">Checked Out</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading visitors...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="visitors-table">
              <thead>
                <tr>
                  <th>VISITOR</th>
                  <th>CONTACT</th>
                  <th>MEETING WITH</th>
                  <th>FLAT</th>
                  <th>CHECK-IN</th>
                  <th>CHECK-OUT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-row">
                      <i className="fas fa-user-slash"></i>
                      <span>No visitors found</span>
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <tr key={visitor.id}>
                      <td>
                        <div className="visitor-name-cell">
                          <div className="visitor-avatar">
                            {visitor.name.charAt(0)}
                          </div>
                          <div>
                            <div className="name">{visitor.name}</div>
                            <div className="purpose">{visitor.purpose}</div>
                          </div>
                        </div>
                      </td>
                      <td>{visitor.contact}</td>
                      <td>{visitor.whomToMeet}</td>
                      <td>{visitor.flatNumber}</td>
                      <td>{formatDateTime(visitor.checkIn)}</td>
                      <td>{formatDateTime(visitor.checkOut)}</td>
                      <td>{getStatusBadge(visitor.status)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEdit(visitor)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {visitor.status === 'In' && (
                            <button 
                              className="action-btn checkout"
                              onClick={() => handleCheckOut(visitor.id)}
                              title="Check Out"
                            >
                              <i className="fas fa-sign-out-alt"></i>
                            </button>
                          )}
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(visitor.id)}
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
                {editingVisitor ? 'Edit Visitor Record' : 'Register New Visitor'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Visitor Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number *</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Whom to Meet *</label>
                  <input
                    type="text"
                    name="whomToMeet"
                    value={formData.whomToMeet}
                    onChange={handleInputChange}
                    placeholder="Resident name"
                    required
                  />
                </div>

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
                  <label>Purpose</label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="e.g., Family visit, Delivery"
                  />
                </div>

                <div className="form-group">
                  <label>Security Guard</label>
                  <input
                    type="text"
                    name="securityGuard"
                    value={formData.securityGuard}
                    onChange={handleInputChange}
                    placeholder="Guard name"
                  />
                </div>

                <div className="form-group">
                  <label>Check-In Time</label>
                  <input
                    type="text"
                    name="checkIn"
                    value={formData.checkIn}
                    onChange={handleInputChange}
                    placeholder="Auto-set on save"
                    disabled
                  />
                  <small style={{ color: 'rgba(30,41,59,0.4)', fontSize: '11px' }}>
                    Will be set to current time
                  </small>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="In">In</option>
                    <option value="Checked Out">Checked Out</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingVisitor ? 'Update Record' : 'Register Visitor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;