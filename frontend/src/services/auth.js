// Mock authentication service – replace with real API calls
const MOCK_USERS = [
  {
    id: 1,
    email: 'admin@society.com',
    password: 'admin123',
    name: 'Super Admin',
    role: 'Super Admin',
    token: 'mock-jwt-token-super-admin'
  },
  {
    id: 2,
    email: 'societyadmin@society.com',
    password: 'admin123',
    name: 'Society Admin',
    role: 'Society Admin',
    token: 'mock-jwt-token-society-admin'
  },
  {
    id: 3,
    email: 'security@society.com',
    password: 'security123',
    name: 'Security Guard',
    role: 'Security Guard',
    token: 'mock-jwt-token-security'
  },
  {
    id: 4,
    email: 'resident@society.com',
    password: 'resident123',
    name: 'Resident',
    role: 'Resident',
    token: 'mock-jwt-token-resident'
  }
];

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  async login(email, password) {
    await delay();
    const user = MOCK_USERS.find(
      u => u.email === email && u.password === password
    );
    if (!user) {
      throw new Error('Invalid email or password');
    }
    // Remove password before storing
    const { password: _, ...userWithoutPassword } = user;
    
    // Get permissions for the user role
    const permissions = this.getPermissions(user.role);
    const userData = {
      ...userWithoutPassword,
      permissions
    };
    
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', user.token);
    return userData;
  },

  async logout() {
    await delay();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  async changePassword(oldPassword, newPassword) {
    await delay();
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const foundUser = MOCK_USERS.find(u => u.id === user.id);
    if (!foundUser) throw new Error('User not found');
    if (foundUser.password !== oldPassword) {
      throw new Error('Current password is incorrect');
    }
    foundUser.password = newPassword;
    return { success: true, message: 'Password changed successfully' };
  },

  getPermissions(role) {
    const permissions = {
      'Super Admin': ['all'],
      'Society Admin': [
        'manage_residents',
        'manage_flats',
        'manage_visitors',
        'manage_complaints',
        'manage_notices',
        'manage_maintenance',
        'manage_settings',
        'view_notifications'
      ],
      'Security Guard': [
        'manage_visitors',
        'view_notifications'
      ],
      'Resident': [
        'view_notices',
        'submit_complaints',
        'view_maintenance',
        'view_notifications'
      ]
    };
    return permissions[role] || [];
  },

  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const perms = this.getPermissions(user.role);
    return perms.includes('all') || perms.includes(permission);
  }
};