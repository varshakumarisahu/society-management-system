import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const userData = await authService.login(email, password);
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    setError(null);
    try {
      const result = await authService.changePassword(oldPassword, newPassword);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    return authService.hasPermission(permission);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    hasPermission,
    isAuthenticated: !!user,
    role: user?.role || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};