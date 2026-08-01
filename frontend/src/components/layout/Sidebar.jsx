import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const ALL_MENU_ITEMS = [
  { path: '/dashboard', icon: 'fa-th-large', label: 'Dashboard' },
  { path: '/residents', icon: 'fa-users', label: 'Residents' },
  { path: '/flats', icon: 'fa-building', label: 'Flats' },
  { path: '/visitors', icon: 'fa-user-friends', label: 'Visitors' },
  { path: '/complaints', icon: 'fa-exclamation-triangle', label: 'Complaints' },
  { path: '/notices', icon: 'fa-bullhorn', label: 'Notice Board' },
   { path: '/maintenance', icon: 'fa-tools', label: 'Maintenance' },
  //{ path: '/settings', icon: 'fa-cog', label: 'Settings' },
];

const Sidebar = ({
  isOpen,
  toggleSidebar,
  width,
  isMobile,
  isTablet,
  onStartResizing,
  user,
  onLogout,
}) => {
  const location = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  const menuItems = ALL_MENU_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return user?.permissions?.includes(item.permission) || user?.permissions?.includes('all');
  });

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside
      className={`sidebar ${!isOpen ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isOpen && isMobile ? 'open' : ''}`}
      style={{
        width: isOpen ? width : isMobile ? 0 : 80,
        transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}
    >
      {/* Logo */}
      <div className="sidebar-header">
        <Link to="/dashboard" className="logo-link">
          <div className="logo">
            <i className="fas fa-building"></i>
            {isOpen && <span>SocietyMS</span>}
          </div>
        </Link>

        {!isMobile && !isTablet && isOpen && (
          <button
            className="resize-handle"
            onMouseDown={onStartResizing}
            title="Drag to resize sidebar"
          >
            <i className="fas fa-grip-lines-vertical"></i>
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => isMobile && toggleSidebar()}
          >
            <i className={`fas ${item.icon}`}></i>
            {isOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom section: profile card + collapse button */}
      <div className="sidebar-bottom">
        <div className="profile-wrapper" ref={profileRef}>
          {profileMenuOpen && isOpen && (
            <div className="profile-dropdown">
              <Link to="/settings" className="profile-dropdown-item" onClick={() => setProfileMenuOpen(false)}>
                <i className="fas fa-cog"></i> Settings
              </Link>
              <button className="profile-dropdown-item logout" onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          )}

          <button
            className="profile-card"
            onClick={() => setProfileMenuOpen((p) => !p)}
          >
            <div className="user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {isOpen && (
              <div className="profile-info">
                <span className="profile-name">{user?.name || 'User'}</span>
                <span className="profile-role">{user?.role || 'ADMIN'}</span>
              </div>
            )}
            {isOpen && <i className="fas fa-chevron-down profile-chevron"></i>}
          </button>
        </div>

        <button className="collapse-btn" onClick={toggleSidebar}>
          <i className={`fas ${isOpen ? 'fa-angle-double-left' : 'fa-angle-double-right'}`}></i>
          {isOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;