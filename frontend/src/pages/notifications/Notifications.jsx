import React, { useState, useEffect } from 'react';
import './Notifications.css';

// Mock Data
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'notice',
    title: 'New Notice: AGM Meeting',
    message: 'The Annual General Meeting has been scheduled for August 5, 2026.',
    read: false,
    createdAt: '2026-07-20 10:30:00',
    link: '/notices'
  },
  {
    id: 2,
    type: 'complaint',
    title: 'Complaint Status Updated',
    message: 'Your complaint #3 (Lift Malfunction) has been assigned to Ramesh Singh.',
    read: false,
    createdAt: '2026-07-20 09:15:00',
    link: '/complaints'
  },
  {
    id: 3,
    type: 'maintenance',
    title: 'Maintenance Bill Generated',
    message: 'Your maintenance bill for July 2026 (₹2,500) is due on July 15, 2026.',
    read: false,
    createdAt: '2026-07-19 16:45:00',
    link: '/maintenance'
  },
  {
    id: 4,
    type: 'system',
    title: 'System Maintenance',
    message: 'The system will be down for maintenance on July 25, 2026 from 2:00 AM to 5:00 AM.',
    read: true,
    createdAt: '2026-07-18 08:00:00',
    link: null
  },
  {
    id: 5,
    type: 'notice',
    title: 'New Notice: Water Supply Maintenance',
    message: 'Water supply will be suspended on July 25, 2026 from 9:00 AM to 5:00 PM.',
    read: true,
    createdAt: '2026-07-17 14:20:00',
    link: '/notices'
  },
  {
    id: 6,
    type: 'complaint',
    title: 'Complaint Resolved',
    message: 'Your complaint #1 (Water Leakage) has been resolved. Please verify and close.',
    read: false,
    createdAt: '2026-07-16 11:00:00',
    link: '/complaints'
  },
  {
    id: 7,
    type: 'maintenance',
    title: 'Maintenance Payment Received',
    message: 'We have received your maintenance payment of ₹2,500 for June 2026. Thank you!',
    read: true,
    createdAt: '2026-07-05 10:30:00',
    link: '/maintenance'
  }
];

const Notifications = () => {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filteredNotifications, setFilteredNotifications] = useState(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');

  // Filter notifications
  useEffect(() => {
    let filtered = notifications;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }
    
    if (filterRead === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filterRead === 'read') {
      filtered = filtered.filter(n => n.read);
    }
    
    setFilteredNotifications(filtered);
  }, [filterType, filterRead, notifications]);

  // Mark as read
  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  // Mark all as read
  const markAllAsRead = () => {
    if (window.confirm('Mark all notifications as read?')) {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    }
  };

  // Delete notification
  const deleteNotification = (id) => {
    if (window.confirm('Delete this notification?')) {
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  // Clear all read notifications
  const clearRead = () => {
    if (window.confirm('Delete all read notifications?')) {
      setNotifications(notifications.filter(n => !n.read));
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Get icon and color for notification type
  const getTypeInfo = (type) => {
    const types = {
      notice: { icon: 'fa-bullhorn', color: '#6366f1', label: 'Notice' },
      complaint: { icon: 'fa-exclamation-triangle', color: '#ef4444', label: 'Complaint' },
      maintenance: { icon: 'fa-tools', color: '#f59e0b', label: 'Maintenance' },
      system: { icon: 'fa-server', color: '#3b82f6', label: 'System' }
    };
    return types[type] || types.system;
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '-';
    const date = new Date(datetime);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="notifications-container">
      {/* Header */}
      <div className="notifications-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-bell"></i> Notifications
          </h1>
          <span className="unread-badge">
            {unreadCount} Unread
          </span>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllAsRead}>
              <i className="fas fa-check-double"></i> Mark All Read
            </button>
          )}
          <button className="btn-secondary" onClick={clearRead}>
            <i className="fas fa-trash-alt"></i> Clear Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section glass">
        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="notice">Notices</option>
            <option value="complaint">Complaints</option>
            <option value="maintenance">Maintenance</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filterRead} 
            onChange={(e) => setFilterRead(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state glass">
            <i className="fas fa-bell-slash"></i>
            <h3>No Notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const typeInfo = getTypeInfo(notification.type);
            return (
              <div 
                key={notification.id} 
                className={`notification-item glass ${!notification.read ? 'unread' : ''}`}
              >
                <div className="notification-icon" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                  <i className={`fas ${typeInfo.icon}`}></i>
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <div className="notification-title">
                      <span className="type-badge" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      <strong>{notification.title}</strong>
                    </div>
                    <span className="notification-time">{formatDateTime(notification.createdAt)}</span>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="action-btn mark-read"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <i className="fas fa-check"></i> Mark as Read
                      </button>
                    )}
                    {notification.link && (
                      <a href={notification.link} className="action-btn view-link">
                        <i className="fas fa-eye"></i> View
                      </a>
                    )}
                    <button 
                      className="action-btn delete"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;