import { apiRequest, apiJson } from './api';

const rolePermissions = {
  admin: ['all'],
  committee_member: ['manage_residents', 'manage_flats', 'manage_visitors', 'manage_complaints', 'submit_complaints', 'manage_notices', 'view_notices', 'manage_maintenance', 'view_maintenance', 'view_notifications'],
  security: ['manage_visitors', 'view_notifications'],
  resident: ['view_notices', 'submit_complaints', 'view_maintenance', 'view_notifications']
};

const toFrontendUser = (user) => ({
  ...user,
  id: user.user_id,
  name: user.full_name,
  permissions: rolePermissions[user.role] || []
});

export const authService = {
  async login(username, password) {
    const result = await apiRequest('/api/v1/auth/login', apiJson('POST', { username, password }));
    const user = toFrontendUser(result.user);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', result.access_token);
    return user;
  },
  async logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },
  getCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      // Discard sessions created by the old mock authentication service.
      if (!user?.user_id || !token || token.startsWith('mock-')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
      }
      return user;
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  },
  getToken() { return localStorage.getItem('token'); },
  isAuthenticated() { return !!this.getToken() && !!this.getCurrentUser(); },
  async changePassword(currentPassword, newPassword) {
    return apiRequest('/api/v1/auth/change-password', apiJson('POST', {
      current_password: currentPassword,
      new_password: newPassword
    }));
  },
  getPermissions(role) { return rolePermissions[role] || []; },
  hasPermission(permission) {
    const permissions = this.getPermissions(this.getCurrentUser()?.role);
    return permissions.includes('all') || permissions.includes(permission);
  }
};
