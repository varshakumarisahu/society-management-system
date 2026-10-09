import React, { useCallback, useEffect, useState } from 'react';
import { apiJson, apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Notices.css';

const blankForm = { title: '', content: '', validUntil: '' };
const mapNotice = row => ({
  id: row.notice_id,
  title: row.title,
  content: row.content,
  createdBy: row.posted_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  expiryDate: row.valid_until,
  status: row.is_archived ? 'Archived' : row.is_active ? 'Active' : 'Inactive'
});

const Notices = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [viewingNotice, setViewingNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(blankForm);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiRequest(`/api/v1/notices${isAdmin && selectedFilter !== 'active' ? '?include_archived=true' : ''}`);
      setNotices(rows.map(mapNotice));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedFilter]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const filteredNotices = notices.filter(notice => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [notice.title, notice.content, notice.createdBy]
      .some(value => value?.toLowerCase().includes(query));
    return matchesSearch && (selectedFilter === 'all' || notice.status.toLowerCase() === selectedFilter);
  });

  const openCreate = () => {
    setEditingNotice(null);
    setFormData(blankForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = notice => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      validUntil: notice.expiryDate ? new Date(notice.expiryDate).toISOString().slice(0, 10) : ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      valid_until: formData.validUntil ? `${formData.validUntil}T23:59:59` : null
    };
    try {
      await apiRequest(
        editingNotice ? `/api/v1/notices/${editingNotice.id}` : '/api/v1/notices',
        apiJson(editingNotice ? 'PATCH' : 'POST', payload)
      );
      setShowModal(false);
      await loadNotices();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this notice permanently?')) return;
    try {
      await apiRequest(`/api/v1/notices/${id}`, { method: 'DELETE' });
      await loadNotices();
    } catch (e) { setError(e.message); }
  };

  const formatDateTime = value => value ? new Date(value).toLocaleString(undefined, {
    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'No expiry';

  const getCategoryIcon = () => 'fa-bullhorn';
  const getStatusBadge = status => (
    <span className={`status-badge ${status.toLowerCase()}`}>● {status}</span>
  );

  return (
    <div className="notices-container">
      <div className="notices-header glass">
        <div className="header-left">
          <h1><i className="fas fa-bullhorn"></i> Notice Board</h1>
          <span className="total-count">Notices: {filteredNotices.length}</span>
        </div>
        {isAdmin && <div className="header-actions">
          <button className="btn-primary" onClick={openCreate}><i className="fas fa-plus"></i> Create Notice</button>
        </div>}
      </div>

      {error && <div className="complaints-error" role="alert">{error}</div>}

      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search notices by title or content..." />
        </div>
        {isAdmin && <div className="filter-group">
          <select className="filter-select" value={selectedFilter} onChange={event => setSelectedFilter(event.target.value)}>
            <option value="active">Active notices</option>
            <option value="archived">Archived notices</option>
            <option value="all">All notices</option>
          </select>
        </div>}
      </div>

      <div className="notices-grid">
        {loading ? <div className="loading-state"><div className="spinner"></div><p>Loading notices...</p></div>
          : filteredNotices.length === 0 ? <div className="empty-state glass"><i className="fas fa-bullhorn"></i><h3>No Notices Found</h3><p>There are no notices to display.</p></div>
            : filteredNotices.map(notice => (
              <div key={notice.id} className={`notice-card glass ${notice.status === 'Archived' ? 'expired-card' : ''}`}>
                <div className="notice-card-header">
                  <div className="notice-meta">
                    <span className="notice-category"><i className={`fas ${getCategoryIcon()}`}></i> Announcement</span>
                    {getStatusBadge(notice.status)}
                  </div>
                  <div className="notice-actions">
                    <button className="action-btn view" onClick={() => setViewingNotice(notice)} title="View notice"><i className="fas fa-eye"></i></button>
                    {isAdmin && <>
                      <button className="action-btn edit" onClick={() => openEdit(notice)} title="Edit notice"><i className="fas fa-edit"></i></button>
                      <button className="action-btn delete" onClick={() => handleDelete(notice.id)} title="Delete notice"><i className="fas fa-trash"></i></button>
                    </>}
                  </div>
                </div>
                <div className="notice-card-body" onClick={() => setViewingNotice(notice)}>
                  <h3 className="notice-title">{notice.title}</h3>
                  <p className="notice-content">{notice.content}</p>
                </div>
                <div className="notice-card-footer">
                  <div className="notice-info">
                    <span><i className="fas fa-user"></i> {notice.createdBy}</span>
                    <span><i className="fas fa-clock"></i> {formatDateTime(notice.createdAt)}</span>
                    {notice.expiryDate && <span><i className="fas fa-calendar-alt"></i> Expires: {formatDateTime(notice.expiryDate)}</span>}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {viewingNotice && <div className="modal-overlay" onClick={() => setViewingNotice(null)}>
        <div className="modal view-modal glass" onClick={event => event.stopPropagation()}>
          <div className="modal-header"><h2><i className="fas fa-bullhorn"></i> Notice Details</h2><button className="modal-close" onClick={() => setViewingNotice(null)}><i className="fas fa-times"></i></button></div>
          <div className="modal-body view-body">
            <div className="view-meta">{getStatusBadge(viewingNotice.status)}</div>
            <h3 className="view-title">{viewingNotice.title}</h3>
            <div className="view-content">{viewingNotice.content}</div>
            <div className="view-footer"><div className="view-info">
              <span><i className="fas fa-user"></i> Posted by {viewingNotice.createdBy}</span>
              <span><i className="fas fa-clock"></i> {formatDateTime(viewingNotice.createdAt)}</span>
              {viewingNotice.expiryDate && <span><i className="fas fa-calendar-alt"></i> Expires {formatDateTime(viewingNotice.expiryDate)}</span>}
            </div></div>
          </div>
          <div className="modal-footer"><button className="btn-secondary" onClick={() => setViewingNotice(null)}>Close</button></div>
        </div>
      </div>}

      {showModal && <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
        <div className="modal glass" onClick={event => event.stopPropagation()}>
          <form onSubmit={handleSave}>
            <div className="modal-header"><h2>{editingNotice ? 'Edit Notice' : 'Create New Notice'}</h2><button type="button" className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button></div>
            <div className="modal-body">
              {error && <div className="complaints-error" role="alert">{error}</div>}
              <div className="form-grid">
                <div className="form-group full-width"><label>Title *</label><input value={formData.title} onChange={event => setFormData({ ...formData, title: event.target.value })} required maxLength="255" /></div>
                <div className="form-group full-width"><label>Content *</label><textarea value={formData.content} onChange={event => setFormData({ ...formData, content: event.target.value })} rows="5" required /></div>
                <div className="form-group full-width"><label>Expiry date (optional)</label><input type="date" value={formData.validUntil} onChange={event => setFormData({ ...formData, validUntil: event.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingNotice ? 'Update Notice' : 'Create Notice'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
};

export default Notices;
