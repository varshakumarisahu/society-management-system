import React, { useState, useEffect } from 'react';
import './Complaints.css';

// Mock Data
const MOCK_COMPLAINTS = [
  {
    id: 1,
    title: 'Water Leakage in Kitchen',
    description: 'There is a severe water leakage from the ceiling in the kitchen area.',
    category: 'Plumbing',
    priority: 'High',
    submittedBy: 'John Doe',
    flatNumber: 'A-101',
    assignedTo: 'Ramesh Singh',
    status: 'In Progress',
    createdAt: '2026-07-18 09:30:00',
    updatedAt: '2026-07-19 14:20:00',
    resolvedAt: null,
    resolutionNotes: '',
    attachments: []
  },
  {
    id: 2,
    title: 'Garbage Not Collected',
    description: 'The garbage has not been collected for the past 3 days.',
    category: 'Cleaning',
    priority: 'Medium',
    submittedBy: 'Sarah Smith',
    flatNumber: 'B-205',
    assignedTo: 'Vikram Patel',
    status: 'Open',
    createdAt: '2026-07-19 10:15:00',
    updatedAt: '2026-07-19 10:15:00',
    resolvedAt: null,
    resolutionNotes: '',
    attachments: []
  },
  {
    id: 3,
    title: 'Lift Malfunction',
    description: 'The lift in block C is not working since morning.',
    category: 'Electrical',
    priority: 'High',
    submittedBy: 'Mike Johnson',
    flatNumber: 'C-309',
    assignedTo: null,
    status: 'Open',
    createdAt: '2026-07-20 08:45:00',
    updatedAt: '2026-07-20 08:45:00',
    resolvedAt: null,
    resolutionNotes: '',
    attachments: []
  },
  {
    id: 4,
    title: 'Parking Issue',
    description: 'Someone is occupying my reserved parking slot P-4.',
    category: 'Security',
    priority: 'Medium',
    submittedBy: 'Emily Davis',
    flatNumber: 'A-402',
    assignedTo: 'Ramesh Singh',
    status: 'Resolved',
    createdAt: '2026-07-15 16:00:00',
    updatedAt: '2026-07-16 11:30:00',
    resolvedAt: '2026-07-16 11:30:00',
    resolutionNotes: 'Issue resolved by security. Offender was warned.',
    attachments: []
  },
  {
    id: 5,
    title: 'Noise Complaint',
    description: 'Loud music coming from flat C-305 every night.',
    category: 'Noise',
    priority: 'Low',
    submittedBy: 'Charles Douglas',
    flatNumber: 'D-501',
    assignedTo: 'Vikram Patel',
    status: 'Closed',
    createdAt: '2026-07-10 22:00:00',
    updatedAt: '2026-07-12 09:00:00',
    resolvedAt: '2026-07-12 09:00:00',
    resolutionNotes: 'Resident was warned. Noise levels have reduced.',
    attachments: []
  }
];

const Complaints = () => {
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [filteredComplaints, setFilteredComplaints] = useState(MOCK_COMPLAINTS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Plumbing',
    priority: 'Medium',
    assignedTo: '',
    status: 'Open',
    resolutionNotes: '',
    flatNumber: '',
    submittedBy: ''
  });

  // Filter complaints
  useEffect(() => {
    let filtered = complaints;
    
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(c => 
        c.status.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    
    setFilteredComplaints(filtered);
  }, [searchTerm, selectedFilter, complaints]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNew = () => {
    setEditingComplaint(null);
    setFormData({
      title: '',
      description: '',
      category: 'Plumbing',
      priority: 'Medium',
      assignedTo: '',
      status: 'Open',
      resolutionNotes: '',
      flatNumber: '',
      submittedBy: ''
    });
    setShowModal(true);
  };

  const handleEdit = (complaint) => {
    setEditingComplaint(complaint);
    setFormData(complaint);
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingComplaint) {
      setComplaints(complaints.map(c => 
        c.id === editingComplaint.id ? { 
          ...formData, 
          id: c.id, 
          updatedAt: new Date().toLocaleString('en-US', { hour12: false }).replace(',', '')
        } : c
      ));
    } else {
      const newComplaint = {
        ...formData,
        id: complaints.length + 1,
        createdAt: new Date().toLocaleString('en-US', { hour12: false }).replace(',', ''),
        updatedAt: new Date().toLocaleString('en-US', { hour12: false }).replace(',', ''),
        resolvedAt: null,
        attachments: []
      };
      setComplaints([...complaints, newComplaint]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      setComplaints(complaints.filter(c => c.id !== id));
    }
  };

  const handleAssign = (id, assignee) => {
    setComplaints(complaints.map(c => 
      c.id === id ? { ...c, assignedTo: assignee, status: 'In Progress', updatedAt: new Date().toLocaleString('en-US', { hour12: false }).replace(',', '') } : c
    ));
  };

  const handleResolve = (id) => {
    const notes = prompt('Enter resolution notes:');
    if (notes !== null) {
      const now = new Date().toLocaleString('en-US', { hour12: false }).replace(',', '');
      setComplaints(complaints.map(c => 
        c.id === id ? { 
          ...c, 
          status: 'Resolved', 
          resolvedAt: now,
          resolutionNotes: notes,
          updatedAt: now 
        } : c
      ));
    }
  };

  const handleClose = (id) => {
    if (window.confirm('Are you sure you want to close this complaint?')) {
      setComplaints(complaints.map(c => 
        c.id === id ? { ...c, status: 'Closed', updatedAt: new Date().toLocaleString('en-US', { hour12: false }).replace(',', '') } : c
      ));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <span className="status-badge open">● Open</span>;
      case 'In Progress':
        return <span className="status-badge in-progress">● In Progress</span>;
      case 'Resolved':
        return <span className="status-badge resolved">● Resolved</span>;
      case 'Closed':
        return <span className="status-badge closed">● Closed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return <span className="priority-badge high">High</span>;
      case 'Medium':
        return <span className="priority-badge medium">Medium</span>;
      case 'Low':
        return <span className="priority-badge low">Low</span>;
      default:
        return <span>{priority}</span>;
    }
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
    <div className="complaints-container">
      {/* Header */}
      <div className="complaints-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-exclamation-triangle"></i> Complaint Management
          </h1>
          <span className="total-count">Total Complaints: {filteredComplaints.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Submit Complaint
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by title, category, resident, flat, or assignee..."
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
            <option value="open">Open</option>
            <option value="in progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading complaints...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>COMPLAINT</th>
                  <th>CATEGORY</th>
                  <th>PRIORITY</th>
                  <th>SUBMITTED BY</th>
                  <th>ASSIGNED TO</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <i className="fas fa-inbox"></i>
                      <span>No complaints found</span>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>
                        <div className="complaint-title-cell">
                          <div className="title">{complaint.title}</div>
                          <div className="meta">
                            <span>Flat {complaint.flatNumber}</span>
                            <span className="dot">•</span>
                            <span className="date">{formatDateTime(complaint.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      <td>{complaint.category}</td>
                      <td>{getPriorityBadge(complaint.priority)}</td>
                      <td>{complaint.submittedBy}</td>
                      <td>{complaint.assignedTo || 'Unassigned'}</td>
                      <td>{getStatusBadge(complaint.status)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEdit(complaint)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {complaint.status === 'Open' && (
                            <button 
                              className="action-btn assign"
                              onClick={() => {
                                const assignee = prompt('Enter assignee name:');
                                if (assignee) handleAssign(complaint.id, assignee);
                              }}
                              title="Assign"
                            >
                              <i className="fas fa-user-plus"></i>
                            </button>
                          )}
                          {(complaint.status === 'Open' || complaint.status === 'In Progress') && (
                            <button 
                              className="action-btn resolve"
                              onClick={() => handleResolve(complaint.id)}
                              title="Resolve"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          {complaint.status === 'Resolved' && (
                            <button 
                              className="action-btn close-complaint"
                              onClick={() => handleClose(complaint.id)}
                              title="Close"
                            >
                              <i className="fas fa-check-double"></i>
                            </button>
                          )}
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(complaint.id)}
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
                {editingComplaint ? 'Edit Complaint' : 'Submit New Complaint'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Brief title of the complaint"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detailed description of the issue"
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Security">Security</option>
                    <option value="Noise">Noise</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Submitted By (Resident) *</label>
                  <input
                    type="text"
                    name="submittedBy"
                    value={formData.submittedBy}
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
                  <label>Assign To</label>
                  <input
                    type="text"
                    name="assignedTo"
                    value={formData.assignedTo || ''}
                    onChange={handleInputChange}
                    placeholder="Staff name"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Resolution Notes</label>
                  <textarea
                    name="resolutionNotes"
                    value={formData.resolutionNotes || ''}
                    onChange={handleInputChange}
                    placeholder="Add resolution details if resolved"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingComplaint ? 'Update Complaint' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;