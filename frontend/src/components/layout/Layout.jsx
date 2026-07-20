import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1200);

  const MIN_WIDTH = 200;
  const MAX_WIDTH = 350;
  const COLLAPSED_WIDTH = 72;

  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebarWidth');
    const savedState = localStorage.getItem('sidebarOpen');

    if (savedWidth) setSidebarWidth(Number(savedWidth));
    if (savedState !== null) setSidebarOpen(savedState === 'true');

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 992);
      setIsTablet(width <= 1200);
      if (width <= 992) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  const startResizing = (e) => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const handleResizeMove = (e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getSidebarWidth = () => {
    if (isMobile) return sidebarOpen ? 280 : 0;
    if (!sidebarOpen) return COLLAPSED_WIDTH;
    return sidebarWidth;
  };

  return (
    <div className={`layout ${isResizing ? 'resizing' : ''}`}>
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        width={getSidebarWidth()}
        isMobile={isMobile}
        isTablet={isTablet}
        onStartResizing={startResizing}
        user={user}
        onLogout={logout}
      />

      <main
        className="main-content"
        style={{
          marginLeft: isMobile ? 0 : (sidebarOpen ? sidebarWidth : COLLAPSED_WIDTH),
          width: isMobile ? '100%' : `calc(100% - ${sidebarOpen ? sidebarWidth : COLLAPSED_WIDTH}px)`,
        }}
      >
        <div className="content-wrapper">{children}</div>
      </main>

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </div>
  );
};

export default Layout;