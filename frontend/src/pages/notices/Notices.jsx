import React, { useState, useEffect } from 'react';
import './Notices.css';

// Mock Data
const MOCK_NOTICES = [
  {
    id: 1,
    title: 'Annual General Meeting 2026',
    content: 'The Annual General Meeting of the society will be held on August 5, 2026 at 10:00 AM in the community hall. All residents are requested to attend.',
    category: 'Meeting',
    priority: 'High',
    createdBy: 'Admin',
    createdAt: '2026-07-15 09:00:00',
    updatedAt: '2026-07-15 09:00:00',
    expiryDate: '2026-08-06',
    status: 'Active',
    isPinned: true
  },
  {
    id: 2,
    title: 'Water Supply Maintenance',
    content: 'Water supply will be temporarily suspended on July 25, 2026 from 9:00 AM to 5:00 PM for maintenance work. Please store sufficient water in advance.',
    category: 'Maintenance',
    priority: 'High',
    createdBy: 'Admin',
    createdAt: '2026-07-18 14:30:00',
    updatedAt: '2026-07-18 14:30:00',
    expiryDate: '2026-07-26',
    status: 'Active',
    isPinned: false
  },
  {
    id: 3,
    title: 'Ganesh Chaturthi Celebration',
    content: 'We are organizing Ganesh Chaturthi celebration on September 7, 2026. Please register your participation at the society office by August 30.',
    category: 'Event',
    priority: 'Medium',
    createdBy: 'Admin',
    createdAt: '2026-07-10 11:00:00',
    updatedAt: '2026-07-10 11:00:00',
    expiryDate: '2026-09-08',
    status: 'Active',
    isPinned: false
  },
  {
    id: 4,
    title: 'COVID-19 Booster Drive',
    content: 'Free COVID-19 booster vaccination drive will be held on July 20, 2026 from 10:00 AM to 4:00 PM at the community hall. All residents are encouraged to participate.',
    category: 'Health',
    priority: 'High',
    createdBy: 'Admin',
    createdAt: '2026-07-05 08:00:00',
    updatedAt: '2026-07-05 08:00:00',
    expiryDate: '2026-07-19',
    status: 'Expired',
    isPinned: false
  },
  {
    id: 5,
    title: 'Diwali Decoration Competition',
    content: 'Society Diwali decoration competition will be held on October 20, 2026. Register your flat by October 15. Exciting prizes to be won!',
    category: 'Event',
    priority: 'Low',
    createdBy: 'Admin',
    createdAt: '2026-07-01 16:00:00',
    updatedAt: '2026-07-01 16:00:00',
    expiryDate: '2026-10-21',
    status: 'Active',
    isPinned: false
  },
  {
    id: 6,
    title: 'Society By-Laws Update',
    content: 'The society by-laws have been updated. Please collect the updated copy from the society office or download from the resident portal.',
    category: 'Policy',
    priority: 'Medium',
    createdBy: 'Admin',
    createdAt: '2026-06-20 10:30:00',
    updatedAt: '2026-06-20 10:30:00',
    expiryDate: '2026-07-01',
    status: 'Archived',
    isPinned: false
  }
];

const Notices = () => {
  const [notices, setNotices] = useState(MOCK_NOTICES);
  const [filteredNotices, setFilteredNotices] = useState(MOCK_NOTICES);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [viewingNotice, setViewingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    priority: 'Medium',
    expiryDate: '',
    isPinned: false,
    status: 'Active'
  });

  // Auto-archive expired notices
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    setNotices(prevNotices => 
      prevNotices.map(notice => {
        if (notice.status === 'Active' && notice.expiryDate) {
          const expiry = new Date(notice.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          if (expiry < today) {
            return { ...notice, status: 'Expired' };
          }
        }
        return notice;
      })
    );
  }, []);

  // Filter notices
  useEffect(() => {
    let filtered = notices;
    
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(n => 
        n.status.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    
    setFilteredNotices(filtered);
  }, [searchTerm, selectedFilter, notices]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddNew = () => {
    setEditingNotice(null);
    const today = new Date();
    const defaultExpiry = new Date(today);
    defaultExpiry.setDate(today.getDate() + 30);
    setFormData({
      title: '',
      content: '',
      category: 'General',
      priority: 'Medium',
      expiryDate: defaultExpiry.toISOString().split('T')[0],
      isPinned: false,
      status: 'Active'
    });
    setShowModal(true);
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      priority: notice.priority,
      expiryDate: notice.expiryDate,
      isPinned: notice.isPinned || false,
      status: notice.status
    });
    setShowModal(true);
  };

  const handleView = (notice) => {
    setViewingNotice(notice);
  };

  const closeViewModal = () => {
    setViewingNotice(null);
  };

  const handleSave = () => {
    const now = new Date().toLocaleString('en-US', { hour12: false }).replace(',', '');
    
    if (editingNotice) {
      setNotices(notices.map(n => 
        n.id === editingNotice.id ? { 
          ...formData, 
          id: n.id, 
          createdBy: n.createdBy,
          createdAt: n.createdAt,
          updatedAt: now,
          status: formData.status || 'Active'
        } : n
      ));
    } else {
      const newNotice = {
        ...formData,
        id: notices.length + 1,
        createdBy: 'Admin',
        createdAt: now,
        updatedAt: now,
        status: formData.status || 'Active'
      };
      setNotices([newNotice, ...notices]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this notice permanently?')) {
      setNotices(notices.filter(n => n.id !== id));
    }
  };

  const handleArchive = (id) => {
    setNotices(notices.map(n => 
      n.id === id ? { ...n, status: 'Archived' } : n
    ));
  };

  const handleRestore = (id) => {
    setNotices(notices.map(n => 
      n.id === id ? { ...n, status: 'Active' } : n
    ));
  };

  const handleTogglePin = (id) => {
    setNotices(notices.map(n => 
      n.id === id ? { ...n, isPinned: !n.isPinned } : n
    ));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="status-badge active">● Active</span>;
      case 'Expired':
        return <span className="status-badge expired">● Expired</span>;
      case 'Archived':
        return <span className="status-badge archived">● Archived</span>;
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

  const getCategoryIcon = (category) => {
    const icons = {
      'Meeting': 'fa-handshake',
      'Maintenance': 'fa-tools',
      'Event': 'fa-calendar-check',
      'Health': 'fa-heartbeat',
      'Policy': 'fa-gavel',
      'General': 'fa-bullhorn'
    };
    return icons[category] || 'fa-bullhorn';
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

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  return (
    <div className="notices-container">
      {/* Header */}
      <div className="notices-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-bullhorn"></i> Notice Board
          </h1>
          <span className="total-count">Total Notices: {filteredNotices.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Create Notice
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by title, category, or content..."
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
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Notices Grid */}
      <div className="notices-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notices...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="empty-state glass">
            <i className="fas fa-bullhorn"></i>
            <h3>No Notices Found</h3>
            <p>Try adjusting your search or create a new notice</p>
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div 
              key={notice.id} 
              className={`notice-card glass ${notice.isPinned ? 'pinned' : ''} ${notice.status === 'Expired' ? 'expired-card' : ''}`}
            >
              {notice.isPinned && (
                <div className="pinned-badge">
                  <i className="fas fa-thumbtack"></i> Pinned
                </div>
              )}
              <div className="notice-card-header">
                <div className="notice-meta">
                  <span className="notice-category">
                    <i className={`fas ${getCategoryIcon(notice.category)}`}></i>
                    {notice.category}
                  </span>
                  {getPriorityBadge(notice.priority)}
                  {getStatusBadge(notice.status)}
                </div>
                <div className="notice-actions">
                  <button 
                    className="action-btn pin"
                    onClick={() => handleTogglePin(notice.id)}
                    title={notice.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <i className={`fas ${notice.isPinned ? 'fa-thumbtack' : 'fa-thumbtack'}`} 
                       style={{ color: notice.isPinned ? '#6366f1' : 'rgba(30,41,59,0.3)' }}></i>
                  </button>
                  <button 
                    className="action-btn view"
                    onClick={() => handleView(notice)}
                    title="View"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEdit(notice)}
                    title="Edit"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  {notice.status === 'Active' && (
                    <button 
                      className="action-btn archive"
                      onClick={() => handleArchive(notice.id)}
                      title="Archive"
                    >
                      <i className="fas fa-archive"></i>
                    </button>
                  )}
                  {notice.status === 'Archived' && (
                    <button 
                      className="action-btn restore"
                      onClick={() => handleRestore(notice.id)}
                      title="Restore"
                    >
                      <i className="fas fa-undo"></i>
                    </button>
                  )}
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDelete(notice.id)}
                    title="Delete"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div className="notice-card-body" onClick={() => handleView(notice)}>
                <h3 className="notice-title">{notice.title}</h3>
                <p className="notice-content">{notice.content}</p>
              </div>
              <div className="notice-card-footer">
                <div className="notice-info">
                  <span>
                    <i className="fas fa-user"></i> {notice.createdBy}
                  </span>
                  <span>
                    <i className="fas fa-clock"></i> {formatDateTime(notice.createdAt)}
                  </span>
                  <span>
                    <i className="fas fa-calendar-alt"></i> Expires: {notice.expiryDate}
                  </span>
                </div>
                {isExpired(notice.expiryDate) && notice.status === 'Active' && (
                  <span className="expiry-warning">⚠️ Expired</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Notice Modal */}
      {viewingNotice && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal view-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-bullhorn" style={{ color: '#6366f1' }}></i> Notice Details
              </h2>
              <button className="modal-close" onClick={closeViewModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body view-body">
              <div className="view-meta">
                <span className="view-category">
                  <i className={`fas ${getCategoryIcon(viewingNotice.category)}`}></i>
                  {viewingNotice.category}
                </span>
                {getPriorityBadge(viewingNotice.priority)}
                {getStatusBadge(viewingNotice.status)}
                {viewingNotice.isPinned && (
                  <span className="pinned-tag"><i className="fas fa-thumbtack"></i> Pinned</span>
                )}
              </div>
              <h3 className="view-title">{viewingNotice.title}</h3>
              <div className="view-content">{viewingNotice.content}</div>
              <div className="view-footer">
                <div className="view-info">
                  <span><i className="fas fa-user"></i> Created by: {viewingNotice.createdBy}</span>
                  <span><i className="fas fa-clock"></i> Created: {formatDateTime(viewingNotice.createdAt)}</span>
                  {viewingNotice.updatedAt !== viewingNotice.createdAt && (
                    <span><i className="fas fa-edit"></i> Updated: {formatDateTime(viewingNotice.updatedAt)}</span>
                  )}
                  <span><i className="fas fa-calendar-alt"></i> Expires: {viewingNotice.expiryDate}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingNotice ? 'Edit Notice' : 'Create New Notice'}
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
                    placeholder="Enter notice title"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Content *</label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Enter notice content"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="General">General</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Event">Event</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Health">Health</option>
                    <option value="Policy">Policy</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="form-group full-width" style={{ flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
                  <label style={{ marginBottom: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isPinned"
                      checked={formData.isPinned}
                      onChange={handleInputChange}
                      style={{ marginRight: '8px' }}
                    />
                    <i className="fas fa-thumbtack" style={{ color: '#6366f1' }}></i> Pin this notice
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingNotice ? 'Update Notice' : 'Create Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notices;