import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Notifications.css';

const NotificationPage = () => {
  const { user } = useAuth();
  const canAnnounce = user?.role === 'admin';
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, count] = await Promise.all([
        apiRequest('/api/v1/notifications?limit=200'),
        apiRequest('/api/v1/notifications/unread-count')
      ]);
      setNotifications(rows.map(row => ({
        id: row.notification_id,
        type: row.type,
        title: row.title,
        message: row.message || '',
        referenceId: row.reference_id,
        read: row.is_read,
        createdAt: row.created_at
      })));
      setUnreadCount(count.count);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const filteredNotifications = useMemo(() => notifications.filter(item => (
    (filterType === 'all' || item.type === filterType)
      && (filterRead === 'all' || (filterRead === 'unread' ? !item.read : item.read))
  )), [notifications, filterRead, filterType]);

  const markAsRead = async id => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(items => items.map(item => item.id === id ? { ...item, read: true } : item));
      setUnreadCount(count => Math.max(0, count - 1));
    } catch (e) { setError(e.message); }
  };

  const markAllAsRead = async () => {
    try { await apiRequest('/api/v1/notifications/read-all', { method: 'PATCH' }); await loadNotifications(); }
    catch (e) { setError(e.message); }
  };

  const deleteNotification = async id => {
    try {
      await apiRequest(`/api/v1/notifications/${id}`, { method: 'DELETE' });
      setNotifications(items => items.filter(item => item.id !== id));
      await loadUnreadCount();
    } catch (e) { setError(e.message); }
  };

  const loadUnreadCount = async () => {
    try { const result = await apiRequest('/api/v1/notifications/unread-count'); setUnreadCount(result.count); }
    catch (e) { setError(e.message); }
  };

  const clearRead = async () => {
    try { await apiRequest('/api/v1/notifications/read', { method: 'DELETE' }); await loadNotifications(); }
    catch (e) { setError(e.message); }
  };

  const sendAnnouncement = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await apiRequest('/api/v1/notifications/announcements', apiJson('POST', {
        title: announcement.title.trim(), message: announcement.message.trim()
      }));
      setShowAnnouncement(false);
      setAnnouncement({ title: '', message: '' });
      setSuccess(`Announcement sent to ${result.sent} active user(s).`);
      await loadNotifications();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const typeInfo = type => ({
    notice: { icon: 'fa-bullhorn', color: '#6366f1', label: 'Notice', link: '/notices' },
    complaint: { icon: 'fa-exclamation-triangle', color: '#ef4444', label: 'Complaint', link: '/complaints' },
    maintenance: { icon: 'fa-tools', color: '#f59e0b', label: 'Maintenance', link: '/maintenance' },
    visitor: { icon: 'fa-user-friends', color: '#3b82f6', label: 'Visitor', link: '/visitors' },
    system: { icon: 'fa-bullhorn', color: '#0ea5e9', label: 'System', link: null }
  }[type] || { icon: 'fa-bell', color: '#64748b', label: 'Notification', link: null });

  const formatDateTime = value => {
    const date = new Date(value);
    const elapsed = Date.now() - date.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(elapsed / 3600000);
    const days = Math.floor(elapsed / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header glass">
        <div className="header-left"><h1><i className="fas fa-bell"></i> Notifications</h1><span className="unread-badge">{unreadCount} Unread</span></div>
        <div className="header-actions">
          {canAnnounce && <button className="btn-primary" onClick={() => setShowAnnouncement(true)}><i className="fas fa-bullhorn"></i> New Announcement</button>}
          {unreadCount > 0 && <button className="btn-secondary" onClick={markAllAsRead}><i className="fas fa-check-double"></i> Mark All Read</button>}
          {notifications.some(item => item.read) && <button className="btn-secondary" onClick={clearRead}><i className="fas fa-trash-alt"></i> Clear Read</button>}
        </div>
      </div>

      {error && <div className="notifications-message" role="alert">{error}</div>}
      {success && <div className="notifications-success" role="status">{success}</div>}

      <div className="filters-section glass">
        <div className="filter-group"><label>Type:</label><select value={filterType} onChange={event => setFilterType(event.target.value)} className="filter-select">
          <option value="all">All Types</option><option value="notice">Notices</option><option value="complaint">Complaints</option><option value="maintenance">Maintenance</option><option value="system">System</option>
        </select></div>
        <div className="filter-group"><label>Status:</label><select value={filterRead} onChange={event => setFilterRead(event.target.value)} className="filter-select">
          <option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option>
        </select></div>
      </div>

      <div className="notifications-list">
        {loading ? <div className="loading-state"><div className="spinner"></div><p>Loading notifications...</p></div>
          : filteredNotifications.length === 0 ? <div className="empty-state glass"><i className="fas fa-bell-slash"></i><h3>No Notifications</h3><p>You're all caught up!</p></div>
            : filteredNotifications.map(item => {
              const type = typeInfo(item.type);
              return <div key={item.id} className={`notification-item glass ${!item.read ? 'unread' : ''}`}>
                <div className="notification-icon" style={{ background: `${type.color}15`, color: type.color }}><i className={`fas ${type.icon}`}></i></div>
                <div className="notification-content">
                  <div className="notification-header"><div className="notification-title"><span className="type-badge" style={{ background: `${type.color}15`, color: type.color }}>{type.label}</span><strong>{item.title}</strong></div><span className="notification-time">{formatDateTime(item.createdAt)}</span></div>
                  <p className="notification-message">{item.message}</p>
                  <div className="notification-actions">
                    {!item.read && <button className="action-btn mark-read" onClick={() => markAsRead(item.id)}><i className="fas fa-check"></i> Mark as Read</button>}
                    {type.link && <Link to={type.link} className="action-btn view-link" onClick={() => !item.read && markAsRead(item.id)}><i className="fas fa-eye"></i> View</Link>}
                    <button className="action-btn delete" onClick={() => deleteNotification(item.id)} title="Delete notification"><i className="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>;
            })}
      </div>

      {showAnnouncement && <div className="modal-overlay" onClick={() => !saving && setShowAnnouncement(false)}><div className="modal glass" onClick={event => event.stopPropagation()}>
        <form onSubmit={sendAnnouncement}><div className="modal-header"><h2>Send System Announcement</h2><button type="button" className="modal-close" onClick={() => setShowAnnouncement(false)}><i className="fas fa-times"></i></button></div>
          <div className="modal-body">{error && <div className="notifications-message">{error}</div>}<div className="form-grid">
            <div className="form-group full-width"><label>Title *</label><input value={announcement.title} onChange={event => setAnnouncement({ ...announcement, title: event.target.value })} maxLength="255" required /></div>
            <div className="form-group full-width"><label>Announcement *</label><textarea value={announcement.message} onChange={event => setAnnouncement({ ...announcement, message: event.target.value })} rows="5" required /></div>
            <small className="full-width">This will notify all active user accounts.</small>
          </div></div>
          <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowAnnouncement(false)}>Cancel</button><button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Sending...' : 'Send Announcement'}</button></div>
        </form>
      </div></div>}
    </div>
  );
};

export default NotificationPage;
