import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import './Dashboard.css';

const formatRole = (role = '') => role.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);

  useEffect(() => {
    let active = true;
    const role = user?.role;
    const canManageResidents = role === 'admin' || role === 'committee_member';
    const canViewVisitors = canManageResidents || role === 'security';
    const canViewComplaints = canManageResidents || role === 'resident';
    const canViewMaintenance = role !== 'security';
    const loadDashboard = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        canManageResidents ? apiRequest('/residents/') : Promise.resolve([]),
        apiRequest('/api/v1/flats'),
        canViewVisitors ? apiRequest('/visitors/') : Promise.resolve([]),
        canViewComplaints ? apiRequest('/api/v1/complaints') : Promise.resolve([]),
        apiRequest('/api/v1/notifications?limit=5'),
        apiRequest('/api/v1/notifications/unread-count'),
        canViewMaintenance ? apiRequest('/api/v1/maintenance/summary') : Promise.resolve({ pending_dues: 0 })
      ]);
      if (!active) return;

      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length === results.length) {
        setError(failures[0].reason?.message || 'Could not load dashboard data.');
      } else {
        const [residentResult, flatResult, visitorResult, complaintResult, notificationResult, unreadResult, maintenanceResult] = results;
        setResidents(residentResult.status === 'fulfilled' ? residentResult.value : []);
        setFlats(flatResult.status === 'fulfilled' ? flatResult.value.items : []);
        setVisitors(visitorResult.status === 'fulfilled' ? visitorResult.value : []);
        setComplaints(complaintResult.status === 'fulfilled' ? complaintResult.value : []);
        setNotifications(notificationResult.status === 'fulfilled' ? notificationResult.value : []);
        setUnreadNotifications(unreadResult.status === 'fulfilled' ? unreadResult.value.count : 0);
        setPendingDues(maintenanceResult.status === 'fulfilled' ? maintenanceResult.value.pending_dues : 0);
        setError(failures.length ? 'Some dashboard data could not be loaded.' : '');
      }
      setLoading(false);
    };
    loadDashboard();
    return () => { active = false; };
  }, [user?.role]);

  const today = new Date().toDateString();
  const visitorsToday = visitors.filter(visitor => new Date(visitor.check_in_time).toDateString() === today);
  const visitorsInside = visitors.filter(visitor => visitor.status === 'checked_in').length;
  const openComplaints = complaints.filter(complaint => ['open', 'assigned', 'in_progress', 'reopened'].includes(complaint.status)).length;
  const resolvedComplaints = complaints.filter(complaint => ['resolved', 'closed'].includes(complaint.status)).length;
  const quickLinks = [
    { icon: 'fa-users', label: 'Residents', path: '/residents', count: residents.length },
    { icon: 'fa-building', label: 'Flats', path: '/flats', count: flats.length },
    { icon: 'fa-exclamation-triangle', label: 'Complaints', path: '/complaints', count: openComplaints },
    { icon: 'fa-tools', label: 'Maintenance', path: '/maintenance', count: null },
    { icon: 'fa-user-friends', label: 'Visitors', path: '/visitors', count: visitors.length },
    { icon: 'fa-bullhorn', label: 'Notices', path: '/notices', count: null }
  ];

  const recentActivities = [
    ...residents.slice(0, 3).map(resident => ({
      id: `resident-${resident.resident_id}`,
      user: resident.full_name,
      action: `is registered in ${resident.flat_identifier || 'a flat'}`,
      time: 'Resident record',
      type: 'resident'
    })),
    ...complaints.slice(0, 3).map(complaint => ({
      id: `complaint-${complaint.complaint_id}`,
      user: complaint.resident_name,
      action: `submitted a complaint: ${complaint.subject}`,
      time: new Date(complaint.created_at).toLocaleString(),
      type: 'complaint',
      timestamp: new Date(complaint.created_at).getTime()
    })),
    ...visitors.slice(0, 3).map(visitor => ({
      id: `visitor-${visitor.visitor_id}`,
      user: visitor.name,
      action: visitor.status === 'checked_in' ? 'checked in as a visitor' : `visitor status: ${visitor.status.replaceAll('_', ' ')}`,
      time: visitor.check_in_time ? new Date(visitor.check_in_time).toLocaleString() : 'Visitor record',
      type: 'visitor',
      timestamp: visitor.check_in_time ? new Date(visitor.check_in_time).getTime() : 0
    }))
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 6);

  const activityIcons = { resident: 'fa-user-plus', visitor: 'fa-user-check', complaint: 'fa-exclamation-circle' };
  const activityColors = { resident: '#8b5cf6', visitor: '#3b82f6', complaint: '#ef4444' };
  const userInitials = (user?.full_name || user?.name || 'User')
    .split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="dashboard-container">
      <header className="topbar glass">
        <div className="topbar-left">
          <h1>
            Society Dashboard
            <span>Role: {formatRole(user?.role)}</span>
          </h1>
          <div className="date-time">
            <i className="fas fa-calendar-alt"></i>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        </div>
        <div className="topbar-right">
          <Link to="/notifications" className="notification-bell" aria-label="Notifications">
            <i className="fas fa-bell"></i>
            {unreadNotifications > 0 && <span className="badge">{unreadNotifications}</span>}
          </Link>
          <div className="user-avatar"><span>{userInitials}</span></div>
        </div>
      </header>

      {error && <div role="alert" className="dashboard-data-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          <section className="summary-grid">
            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}><i className="fas fa-users"></i></div>
              <div className="card-content"><div className="card-value">{residents.length}</div><div className="card-label">Total Residents</div></div>
            </div>
            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}><i className="fas fa-building"></i></div>
              <div className="card-content"><div className="card-value">{flats.length}</div><div className="card-label">Total Flats</div></div>
            </div>
            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><i className="fas fa-user-friends"></i></div>
              <div className="card-content"><div className="card-value">{visitorsToday.length}</div><div className="card-label">Visitors Today</div><div className="card-sub-label">{visitorsInside} currently inside</div></div>
            </div>
            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}><i className="fas fa-exclamation-circle"></i></div>
              <div className="card-content"><div className="card-value">{openComplaints}</div><div className="card-label">Open Complaints</div><div className="card-sub-label">{resolvedComplaints} resolved</div></div>
            </div>
            <div className="summary-card glass">
              <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}><i className="fas fa-tools"></i></div>
              <div className="card-content"><div className="card-value">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(pendingDues || 0))}</div><div className="card-label">Maintenance Due</div></div>
            </div>
          </section>

          <div className="dashboard-row">
            <section className="quick-links glass">
              <h3><i className="fas fa-rocket"></i> Quick Navigation</h3>
              <div className="links-grid">
                {quickLinks.map(link => (
                  <Link key={link.label} to={link.path} className="quick-link">
                    <div className="link-icon"><i className={`fas ${link.icon}`}></i></div>
                    <span>{link.label} <small>({link.count === null ? '—' : link.count})</small></span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="notifications glass">
              <h3><i className="fas fa-bell"></i> Notifications &amp; Alerts</h3>
              <div className="notifications-list">
                {notifications.length ? notifications.slice(0, 4).map(item => {
                  const path = item.type === 'notice' ? '/notices' : item.type === 'complaint' ? '/complaints' : item.type === 'maintenance' ? '/maintenance' : '/notifications';
                  return <Link key={item.notification_id} to={path} className={`notification-item ${item.is_read ? '' : 'unread'}`}>
                    <strong>{item.title}</strong><span>{item.message}</span>
                  </Link>;
                }) : <div className="notification-item">No notifications yet.</div>}
              </div>
            </section>
          </div>

          <section className="activity-section glass">
            <div className="activity-header"><h3><i className="fas fa-clock"></i> Recent Activities</h3></div>
            <div className="activity-list">
              {recentActivities.length ? recentActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon" style={{ background: `${activityColors[activity.type]}20`, color: activityColors[activity.type] }}>
                    <i className={`fas ${activityIcons[activity.type]}`}></i>
                  </div>
                  <div className="activity-content">
                    <span className="activity-text"><strong>{activity.user}</strong> {activity.action}</span>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              )) : <div className="notification-item">No resident or visitor records yet.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
