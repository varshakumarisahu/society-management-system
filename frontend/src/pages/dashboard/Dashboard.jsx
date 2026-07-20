import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

// ----- Mock Data from each module (replace with API calls) -----
// Residents
const MOCK_RESIDENTS = [
  { id: 1, name: 'John Doe', flatNumber: 'A-101', status: 'Active' },
  { id: 2, name: 'Sarah Smith', flatNumber: 'B-205', status: 'Active' },
  { id: 3, name: 'Mike Johnson', flatNumber: 'C-309', status: 'Inactive' },
  { id: 4, name: 'Emily Davis', flatNumber: 'A-402', status: 'Active' },
  { id: 5, name: 'Tony Jones', flatNumber: 'B-110', status: 'Active' },
  { id: 6, name: 'Charles Douglas', flatNumber: 'D-501', status: 'Active' },
];

// Flats
const MOCK_FLATS = [
  { id: 1, flatNumber: 'A-101', status: 'Occupied' },
  { id: 2, flatNumber: 'A-102', status: 'Occupied' },
  { id: 3, flatNumber: 'A-201', status: 'Vacant' },
  { id: 4, flatNumber: 'B-205', status: 'Occupied' },
  { id: 5, flatNumber: 'C-309', status: 'Occupied' },
  { id: 6, flatNumber: 'D-501', status: 'Vacant' },
];

// Visitors
const MOCK_VISITORS = [
  { id: 1, name: 'Amit Kumar', status: 'Checked Out' },
  { id: 2, name: 'Priya Sharma', status: 'In' },
  { id: 3, name: 'Sunita Gupta', status: 'In' },
];

// Complaints
const MOCK_COMPLAINTS = [
  { id: 1, title: 'Water Leakage', status: 'In Progress' },
  { id: 2, title: 'Garbage Not Collected', status: 'Open' },
  { id: 3, title: 'Lift Malfunction', status: 'Open' },
  { id: 4, title: 'Parking Issue', status: 'Resolved' },
];

// Maintenance Bills
const MOCK_MAINTENANCE = [
  { id: 1, amount: 2500, status: 'Overdue' },
  { id: 2, amount: 2200, status: 'Paid' },
  { id: 3, amount: 2800, status: 'Pending' },
  { id: 4, amount: 2000, status: 'Paid' },
  { id: 5, amount: 3000, status: 'Overdue' },
];

// Notices
const MOCK_NOTICES = [
  { id: 1, title: 'AGM Meeting', status: 'Active' },
  { id: 2, title: 'Water Supply Maintenance', status: 'Active' },
  { id: 3, title: 'Ganesh Chaturthi Celebration', status: 'Active' },
];

// Notifications (from your Notifications module)
const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'notice', title: 'New Notice: AGM Meeting', read: false },
  { id: 2, type: 'complaint', title: 'Complaint Status Updated', read: false },
  { id: 3, type: 'maintenance', title: 'Maintenance Bill Generated', read: false },
  { id: 4, type: 'system', title: 'System Maintenance', read: true },
];

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [userRole] = useState('Society Admin');

  // In a real app, you'd fetch these from API
  const residents = MOCK_RESIDENTS;
  const flats = MOCK_FLATS;
  const visitors = MOCK_VISITORS;
  const complaints = MOCK_COMPLAINTS;
  const maintenance = MOCK_MAINTENANCE;
  const notices = MOCK_NOTICES;
  const notifications = MOCK_NOTIFICATIONS;

  // Compute summary stats
  const summary = {
    residents: residents.length,
    flats: flats.length,
    visitors: {
      today: visitors.filter(v => v.status === 'In').length,
      pending: visitors.filter(v => v.status === 'Pending').length || 0,
    },
    complaints: {
      open: complaints.filter(c => c.status === 'Open' || c.status === 'In Progress').length,
      resolved: complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length,
    },
    maintenance: {
      due: maintenance.filter(m => m.status === 'Pending').length,
      overdue: maintenance.filter(m => m.status === 'Overdue').length,
    },
  };

  // Recent activities – combine from various modules
  const recentActivities = [
    ...residents.slice(0, 2).map(r => ({
      id: `resident-${r.id}`,
      user: r.name,
      action: `registered as resident in Flat ${r.flatNumber}`,
      time: 'Today',
      type: 'resident',
    })),
    ...complaints.slice(0, 2).map(c => ({
      id: `complaint-${c.id}`,
      user: 'Resident',
      action: `raised complaint: "${c.title}"`,
      time: 'Today',
      type: 'complaint',
    })),
    ...visitors.slice(0, 1).map(v => ({
      id: `visitor-${v.id}`,
      user: 'Security',
      action: `checked in visitor: ${v.name}`,
      time: 'Today',
      type: 'visitor',
    })),
  ];

  // Quick links (with counts)
  const quickLinks = [
    { icon: 'fa-users', label: 'Residents', path: '/residents', count: summary.residents },
    { icon: 'fa-building', label: 'Flats', path: '/flats', count: summary.flats },
    { icon: 'fa-exclamation-triangle', label: 'Complaints', path: '/complaints', count: summary.complaints.open },
    { icon: 'fa-tools', label: 'Maintenance', path: '/maintenance', count: summary.maintenance.due },
    { icon: 'fa-user-friends', label: 'Visitors', path: '/visitors', count: summary.visitors.today },
    { icon: 'fa-bullhorn', label: 'Notices', path: '/notices', count: notices.filter(n => n.status === 'Active').length },
  ];

  // Notifications for the sidebar
  const notificationItems = notifications.slice(0, 3).map(n => ({
    id: n.id,
    type: n.type === 'notice' ? 'info' : n.type === 'complaint' ? 'alert' : 'success',
    message: n.title,
    priority: n.read ? 'low' : 'high',
  }));

  // Helper functions for icons and colors
  const getActivityIcon = (type) => {
    const icons = {
      complaint: 'fa-exclamation-circle',
      visitor: 'fa-user-check',
      maintenance: 'fa-wrench',
      payment: 'fa-credit-card',
      resident: 'fa-user-plus',
      notice: 'fa-bullhorn',
    };
    return icons[type] || 'fa-clock';
  };

  const getActivityColor = (type) => {
    const colors = {
      complaint: '#ef4444',
      visitor: '#3b82f6',
      maintenance: '#f59e0b',
      payment: '#10b981',
      resident: '#8b5cf6',
      notice: '#6366f1',
    };
    return colors[type] || '#60a5fa';
  };

  const getNotificationIcon = (type) => {
    const icons = {
      alert: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
      success: 'fa-check-circle',
    };
    return icons[type] || 'fa-bell';
  };

  const getNotificationColor = (type) => {
    const colors = {
      alert: '#ef4444',
      info: '#3b82f6',
      success: '#10b981',
    };
    return colors[type] || '#60a5fa';
  };

  // Unread count for bell
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="dashboard-container">
      {/* Top Bar */}
      <header className="topbar glass">
        <div className="topbar-left">
          <h1>
            Society Dashboard
            <span>• Role: {userRole}</span>
          </h1>
          <div className="date-time">
            <i className="fas fa-calendar-alt"></i>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
        <div className="topbar-right">
          <Link to="/notifications" className="notification-bell">
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </Link>
          <div className="user-avatar">
            <span>AD</span>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <section className="summary-grid">
            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <i className="fas fa-users"></i>
              </div>
              <div className="card-content">
                <div className="card-value">{summary.residents}</div>
                <div className="card-label">Total Residents</div>
              </div>
            </div>

            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <i className="fas fa-building"></i>
              </div>
              <div className="card-content">
                <div className="card-value">{summary.flats}</div>
                <div className="card-label">Total Flats</div>
              </div>
            </div>

            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <i className="fas fa-user-friends"></i>
              </div>
              <div className="card-content">
                <div className="card-value">{summary.visitors.today}</div>
                <div className="card-label">Visitors Today</div>
                <div className="card-sub-label">
                  {summary.visitors.pending} pending approval
                </div>
              </div>
            </div>

            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="card-content">
                <div className="card-value">{summary.complaints.open}</div>
                <div className="card-label">Open Complaints</div>
                <div className="card-sub-label">
                  {summary.complaints.resolved} resolved
                </div>
              </div>
            </div>

            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <i className="fas fa-tools"></i>
              </div>
              <div className="card-content">
                <div className="card-value">{summary.maintenance.due}</div>
                <div className="card-label">Maintenance Due</div>
                <div className="card-sub-label">
                  {summary.maintenance.overdue} overdue
                </div>
              </div>
            </div>
          </section>

          {/* Quick Navigation & Notifications Row */}
          <div className="dashboard-row">
            {/* Quick Links */}
            <section className="quick-links glass">
              <h3>
                <i className="fas fa-rocket"></i> Quick Navigation
              </h3>
              <div className="links-grid">
                {quickLinks.map((link) => (
                  <Link key={link.label} to={link.path} className="quick-link">
                    <div className="link-icon">
                      <i className={`fas ${link.icon}`}></i>
                    </div>
                    <span>{link.label} <small>({link.count})</small></span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Notifications */}
            <section className="notifications glass">
              <h3>
                <i className="fas fa-bell"></i> Notifications & Alerts
              </h3>
              <div className="notifications-list">
                {notificationItems.length > 0 ? (
                  notificationItems.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item priority-${notif.priority}`}
                    >
                      <div
                        className="notification-icon"
                        style={{ color: getNotificationColor(notif.type) }}
                      >
                        <i className={`fas ${getNotificationIcon(notif.type)}`}></i>
                      </div>
                      <div className="notification-content">
                        <p>{notif.message}</p>
                        <span className="notification-priority">
                          {notif.priority}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notification-item">No new notifications</div>
                )}
              </div>
            </section>
          </div>

          {/* Recent Activities */}
          <section className="activity-section glass">
            <div className="activity-header">
              <h3>
                <i className="fas fa-clock"></i> Recent Activities
              </h3>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="activity-list">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div
                    className="activity-icon"
                    style={{
                      background: `${getActivityColor(activity.type)}20`,
                      color: getActivityColor(activity.type),
                    }}
                  >
                    <i className={`fas ${getActivityIcon(activity.type)}`}></i>
                  </div>
                  <div className="activity-content">
                    <span className="activity-text">
                      <strong>{activity.user}</strong> {activity.action}
                    </span>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;