import React, { useState } from 'react';
import './Settings.css';

// Mock Settings Data
const MOCK_SETTINGS = {
  society: {
    name: 'Green Valley Society',
    address: '123, MG Road, Pune - 411001',
    phone: '+91 98765 43210',
    email: 'info@greenvalley.com',
    website: 'www.greenvalley.com',
    registrationNumber: 'SOCIETY-2024-001',
    bankName: 'HDFC Bank',
    accountNumber: 'XXXX-XXXX-1234',
    ifscCode: 'HDFC0000123'
  },
  roles: [
    { id: 1, name: 'Super Admin', permissions: ['all'] },
    { id: 2, name: 'Society Admin', permissions: ['manage_residents', 'manage_flats', 'manage_complaints', 'manage_notices'] },
    { id: 3, name: 'Security Guard', permissions: ['manage_visitors'] },
    { id: 4, name: 'Maintenance Staff', permissions: ['manage_complaints', 'view_maintenance'] },
    { id: 5, name: 'Resident', permissions: ['view_notices', 'submit_complaints', 'view_maintenance'] }
  ],
  system: {
    maintenanceMode: false,
    allowResidentRegistration: true,
    enableNotifications: true,
    autoApproveVisitors: false,
    enableOnlinePayments: true,
    maxVisitorsPerDay: 10,
    complaintAutoAssign: true
  },
  preferences: {
    theme: 'light',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
    currencySymbol: '₹',
    defaultDashboard: 'dashboard'
  }
};

const Settings = () => {
  const [settings, setSettings] = useState(MOCK_SETTINGS);
  const [activeTab, setActiveTab] = useState('society');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle society settings save
  const handleSocietySave = () => {
    setSettings(prev => ({
      ...prev,
      society: { ...prev.society, ...formData }
    }));
    setShowModal(false);
  };

  // Handle system config save
  const handleSystemSave = () => {
    setSettings(prev => ({
      ...prev,
      system: { ...prev.system, ...formData }
    }));
    setShowModal(false);
  };

  // Handle preferences save
  const handlePreferencesSave = () => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...formData }
    }));
    setShowModal(false);
  };

  // Role management functions
  const handleAddRole = () => {
    setEditingItem(null);
    setFormData({ name: '', permissions: [] });
    setShowModal(true);
  };

  const handleEditRole = (role) => {
    setEditingItem(role);
    setFormData({ name: role.name, permissions: role.permissions });
    setShowModal(true);
  };

  const handleDeleteRole = (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      setSettings(prev => ({
        ...prev,
        roles: prev.roles.filter(r => r.id !== id)
      }));
    }
  };

  const handleSaveRole = () => {
    if (editingItem) {
      setSettings(prev => ({
        ...prev,
        roles: prev.roles.map(r => 
          r.id === editingItem.id ? { ...r, ...formData } : r
        )
      }));
    } else {
      const newRole = {
        id: settings.roles.length + 1,
        ...formData
      };
      setSettings(prev => ({
        ...prev,
        roles: [...prev.roles, newRole]
      }));
    }
    setShowModal(false);
  };

  const togglePermission = (permission) => {
    setFormData(prev => {
      const perms = prev.permissions || [];
      if (perms.includes(permission)) {
        return { ...prev, permissions: perms.filter(p => p !== permission) };
      } else {
        return { ...prev, permissions: [...perms, permission] };
      }
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'society':
        return renderSocietyTab();
      case 'roles':
        return renderRolesTab();
      case 'system':
        return renderSystemTab();
      case 'preferences':
        return renderPreferencesTab();
      default:
        return null;
    }
  };

  const renderSocietyTab = () => {
    const s = settings.society;
    return (
      <div className="settings-tab-content">
        <div className="settings-card glass">
          <h3>Society Details</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Society Name</label>
              <span>{s.name}</span>
            </div>
            <div className="setting-item">
              <label>Address</label>
              <span>{s.address}</span>
            </div>
            <div className="setting-item">
              <label>Phone</label>
              <span>{s.phone}</span>
            </div>
            <div className="setting-item">
              <label>Email</label>
              <span>{s.email}</span>
            </div>
            <div className="setting-item">
              <label>Website</label>
              <span>{s.website}</span>
            </div>
            <div className="setting-item">
              <label>Registration Number</label>
              <span>{s.registrationNumber}</span>
            </div>
            <div className="setting-item">
              <label>Bank Name</label>
              <span>{s.bankName}</span>
            </div>
            <div className="setting-item">
              <label>Account Number</label>
              <span>{s.accountNumber}</span>
            </div>
            <div className="setting-item">
              <label>IFSC Code</label>
              <span>{s.ifscCode}</span>
            </div>
          </div>
          <div className="settings-actions">
            <button className="btn-primary" onClick={() => {
              setEditingItem('society');
              setFormData(s);
              setShowModal(true);
            }}>
              <i className="fas fa-edit"></i> Edit Society Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRolesTab = () => {
    const permissionLabels = {
      'all': 'All Permissions',
      'manage_residents': 'Manage Residents',
      'manage_flats': 'Manage Flats',
      'manage_visitors': 'Manage Visitors',
      'manage_complaints': 'Manage Complaints',
      'manage_notices': 'Manage Notices',
      'manage_maintenance': 'Manage Maintenance',
      'view_notices': 'View Notices',
      'submit_complaints': 'Submit Complaints',
      'view_maintenance': 'View Maintenance'
    };

    return (
      <div className="settings-tab-content">
        <div className="settings-header-actions">
          <h3>User Roles</h3>
          <button className="btn-primary" onClick={handleAddRole}>
            <i className="fas fa-plus"></i> Add Role
          </button>
        </div>
        <div className="table-container glass">
          <table className="roles-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.roles.map(role => (
                <tr key={role.id}>
                  <td><strong>{role.name}</strong></td>
                  <td>
                    <div className="permissions-list">
                      {role.permissions.map(p => (
                        <span key={p} className="permission-tag">
                          {permissionLabels[p] || p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEditRole(role)}
                        title="Edit Role"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteRole(role.id)}
                        title="Delete Role"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSystemTab = () => {
    const sys = settings.system;
    return (
      <div className="settings-tab-content">
        <div className="settings-card glass">
          <h3>System Configuration</h3>
          <div className="settings-grid">
            <div className="setting-item toggle-item">
              <label>Maintenance Mode</label>
              <span className={`toggle-badge ${sys.maintenanceMode ? 'enabled' : 'disabled'}`}>
                {sys.maintenanceMode ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="setting-item toggle-item">
              <label>Allow Resident Registration</label>
              <span className={`toggle-badge ${sys.allowResidentRegistration ? 'enabled' : 'disabled'}`}>
                {sys.allowResidentRegistration ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="setting-item toggle-item">
              <label>Enable Notifications</label>
              <span className={`toggle-badge ${sys.enableNotifications ? 'enabled' : 'disabled'}`}>
                {sys.enableNotifications ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="setting-item toggle-item">
              <label>Auto-Approve Visitors</label>
              <span className={`toggle-badge ${sys.autoApproveVisitors ? 'enabled' : 'disabled'}`}>
                {sys.autoApproveVisitors ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="setting-item toggle-item">
              <label>Enable Online Payments</label>
              <span className={`toggle-badge ${sys.enableOnlinePayments ? 'enabled' : 'disabled'}`}>
                {sys.enableOnlinePayments ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="setting-item">
              <label>Max Visitors Per Day</label>
              <span>{sys.maxVisitorsPerDay}</span>
            </div>
            <div className="setting-item toggle-item">
              <label>Auto-Assign Complaints</label>
              <span className={`toggle-badge ${sys.complaintAutoAssign ? 'enabled' : 'disabled'}`}>
                {sys.complaintAutoAssign ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          <div className="settings-actions">
            <button className="btn-primary" onClick={() => {
              setEditingItem('system');
              setFormData(sys);
              setShowModal(true);
            }}>
              <i className="fas fa-edit"></i> Edit System Config
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreferencesTab = () => {
    const pref = settings.preferences;
    return (
      <div className="settings-tab-content">
        <div className="settings-card glass">
          <h3>Application Preferences</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Theme</label>
              <span className="pref-value">
                <span className={`theme-dot ${pref.theme}`}></span>
                {pref.theme.charAt(0).toUpperCase() + pref.theme.slice(1)}
              </span>
            </div>
            <div className="setting-item">
              <label>Language</label>
              <span>{pref.language.toUpperCase()}</span>
            </div>
            <div className="setting-item">
              <label>Date Format</label>
              <span>{pref.dateFormat}</span>
            </div>
            <div className="setting-item">
              <label>Timezone</label>
              <span>{pref.timezone}</span>
            </div>
            <div className="setting-item">
              <label>Currency Symbol</label>
              <span>{pref.currencySymbol}</span>
            </div>
            <div className="setting-item">
              <label>Default Dashboard</label>
              <span>{pref.defaultDashboard}</span>
            </div>
          </div>
          <div className="settings-actions">
            <button className="btn-primary" onClick={() => {
              setEditingItem('preferences');
              setFormData(pref);
              setShowModal(true);
            }}>
              <i className="fas fa-edit"></i> Edit Preferences
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render modal for editing settings
  const renderModal = () => {
    if (!showModal) return null;

    let title = '';
    let fields = [];
    let onSave = null;

    if (editingItem === 'society') {
      title = 'Edit Society Details';
      fields = [
        { label: 'Society Name', name: 'name', type: 'text' },
        { label: 'Address', name: 'address', type: 'text' },
        { label: 'Phone', name: 'phone', type: 'text' },
        { label: 'Email', name: 'email', type: 'email' },
        { label: 'Website', name: 'website', type: 'text' },
        { label: 'Registration Number', name: 'registrationNumber', type: 'text' },
        { label: 'Bank Name', name: 'bankName', type: 'text' },
        { label: 'Account Number', name: 'accountNumber', type: 'text' },
        { label: 'IFSC Code', name: 'ifscCode', type: 'text' }
      ];
      onSave = handleSocietySave;
    } else if (editingItem === 'system') {
      title = 'Edit System Configuration';
      fields = [
        { label: 'Maintenance Mode', name: 'maintenanceMode', type: 'checkbox' },
        { label: 'Allow Resident Registration', name: 'allowResidentRegistration', type: 'checkbox' },
        { label: 'Enable Notifications', name: 'enableNotifications', type: 'checkbox' },
        { label: 'Auto-Approve Visitors', name: 'autoApproveVisitors', type: 'checkbox' },
        { label: 'Enable Online Payments', name: 'enableOnlinePayments', type: 'checkbox' },
        { label: 'Max Visitors Per Day', name: 'maxVisitorsPerDay', type: 'number' },
        { label: 'Auto-Assign Complaints', name: 'complaintAutoAssign', type: 'checkbox' }
      ];
      onSave = handleSystemSave;
    } else if (editingItem === 'preferences') {
      title = 'Edit Preferences';
      fields = [
        { label: 'Theme', name: 'theme', type: 'select', options: ['light', 'dark'] },
        { label: 'Language', name: 'language', type: 'select', options: ['en', 'hi', 'mr', 'gu'] },
        { label: 'Date Format', name: 'dateFormat', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
        { label: 'Timezone', name: 'timezone', type: 'select', options: ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York'] },
        { label: 'Currency Symbol', name: 'currencySymbol', type: 'text' },
        { label: 'Default Dashboard', name: 'defaultDashboard', type: 'text' }
      ];
      onSave = handlePreferencesSave;
    } else if (editingItem === null && activeTab === 'roles') {
      // Role modal
      title = editingItem ? 'Edit Role' : 'Add Role';
      const availablePermissions = [
        'manage_residents', 'manage_flats', 'manage_visitors', 
        'manage_complaints', 'manage_notices', 'manage_maintenance',
        'view_notices', 'submit_complaints', 'view_maintenance'
      ];
      const permissionLabels = {
        'manage_residents': 'Manage Residents',
        'manage_flats': 'Manage Flats',
        'manage_visitors': 'Manage Visitors',
        'manage_complaints': 'Manage Complaints',
        'manage_notices': 'Manage Notices',
        'manage_maintenance': 'Manage Maintenance',
        'view_notices': 'View Notices',
        'submit_complaints': 'Submit Complaints',
        'view_maintenance': 'View Maintenance'
      };
      return (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Role' : 'Add Role'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Role Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="Enter role name"
                />
              </div>
              <div className="form-group">
                <label>Permissions</label>
                <div className="permissions-checkboxes">
                  {availablePermissions.map(perm => (
                    <label key={perm} className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={(formData.permissions || []).includes(perm)}
                        onChange={() => togglePermission(perm)}
                      />
                      {permissionLabels[perm] || perm}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveRole}>
                {editingItem ? 'Update Role' : 'Add Role'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal glass" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              {fields.map((field) => (
                <div className="form-group" key={field.name}>
                  <label>{field.label}</label>
                  {field.type === 'checkbox' ? (
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={formData[field.name] || false}
                        onChange={handleInputChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  ) : field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                    >
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={onSave}>Save Changes</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-cog"></i> Settings
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs glass">
        <button
          className={`tab-btn ${activeTab === 'society' ? 'active' : ''}`}
          onClick={() => setActiveTab('society')}
        >
          <i className="fas fa-building"></i> Society
        </button>
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <i className="fas fa-users-cog"></i> User Roles
        </button>
        <button
          className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <i className="fas fa-server"></i> System
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <i className="fas fa-sliders-h"></i> Preferences
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default Settings;