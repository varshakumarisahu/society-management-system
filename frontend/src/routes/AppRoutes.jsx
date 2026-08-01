import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/layout/Layout';
import Login from '../pages/auth/Login';
import ChangePassword from '../pages/auth/ChangePassword';
import Dashboard from '../pages/dashboard/Dashboard';
import Residents from '../pages/residents/Residents';
import Flats from '../pages/flats/Flats';
import Visitors from '../pages/visitors/Visitors';
import Complaints from '../pages/complaints/Complaints';
import Notices from '../pages/notices/Notices';
import Maintenance from '../pages/maintenance/Maintenance';
import Settings from '../pages/settings/Settings';
import Notifications from '../pages/notifications/Notifications';
import { useAuth } from '../context/AuthContext';

const ProtectedLayout = ({ children, requiredPermission = null }) => (
  <ProtectedRoute requiredPermission={requiredPermission}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } 
      />
      
      {/* Protected Routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/residents" 
        element={
          <ProtectedLayout requiredPermission="manage_residents">
            <Residents />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/flats" 
        element={
          <ProtectedLayout requiredPermission="manage_flats">
            <Flats />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/visitors" 
        element={
          <ProtectedLayout requiredPermission="manage_visitors">
            <Visitors />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/complaints" 
        element={
          <ProtectedLayout requiredPermission="manage_complaints">
            <Complaints />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/notices" 
        element={
          <ProtectedLayout requiredPermission="manage_notices">
            <Notices />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/maintenance" 
        element={
          <ProtectedLayout requiredPermission="manage_maintenance">
            <Maintenance />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedLayout requiredPermission="manage_settings">
            <Settings />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/notifications" 
        element={
          <ProtectedLayout requiredPermission="view_notifications">
            <Notifications />
          </ProtectedLayout>
        } 
      />
      
      <Route 
        path="/change-password" 
        element={
          <ProtectedLayout>
            <ChangePassword />
          </ProtectedLayout>
        } 
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;