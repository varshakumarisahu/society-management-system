import React, { useCallback, useEffect, useState } from 'react';
import { apiJson, apiRequest } from '../../services/api';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('society');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await apiRequest('/api/v1/settings'));
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const openEditor = group => {
    setEditingGroup(group);
    setFormData({ ...settings[group] });
    setError('');
    setSuccess('');
  };

  const handleInputChange = event => {
    const { name, value, type, checked } = event.target;
    setFormData(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const saveGroup = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await apiRequest(`/api/v1/settings/${editingGroup}`, apiJson('PATCH', formData));
      setSettings(previous => ({ ...previous, [editingGroup]: saved }));
      setEditingGroup(null);
      setSuccess('Settings saved.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const groups = {
    society: {
      title: 'Society Details',
      endpoint: 'society',
      fields: [
        { key: 'name', label: 'Society Name', type: 'text', required: true },
        { key: 'address', label: 'Address', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'website', label: 'Website', type: 'text' },
        { key: 'registrationNumber', label: 'Registration Number', type: 'text' },
        { key: 'bankName', label: 'Bank Name', type: 'text' },
        { key: 'accountNumber', label: 'Account Number', type: 'text' },
        { key: 'ifscCode', label: 'IFSC Code', type: 'text' }
      ]
    },
    system: {
      title: 'System Configuration',
      endpoint: 'system',
      fields: [
        { key: 'enableNotifications', label: 'Enable In-App Notifications', type: 'checkbox' },
        { key: 'maxVisitorsPerDay', label: 'Maximum Visitors Per Day', type: 'number', min: 0, max: 10000 },
        { key: 'complaintAutoAssign', label: 'Automatically Assign New Complaints', type: 'checkbox' }
      ]
    },
    preferences: {
      title: 'Application Preferences',
      endpoint: 'preferences',
      fields: [
        { key: 'theme', label: 'Theme', type: 'select', options: ['light', 'dark'] },
        { key: 'language', label: 'Language', type: 'select', options: ['en', 'hi', 'mr', 'gu'] },
        { key: 'dateFormat', label: 'Date Format', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
        { key: 'timezone', label: 'Timezone', type: 'select', options: ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York'] },
        { key: 'currencySymbol', label: 'Currency Symbol', type: 'text' },
        { key: 'defaultDashboard', label: 'Default Dashboard', type: 'select', options: ['dashboard'] }
      ]
    }
  };

  const renderValue = (key, value) => {
    if (typeof value === 'boolean') {
      return <span className={`toggle-badge ${value ? 'enabled' : 'disabled'}`}>{value ? 'Enabled' : 'Disabled'}</span>;
    }
    if (key === 'theme') return <span className="pref-value"><span className={`theme-dot ${value}`}></span>{value ? value[0].toUpperCase() + value.slice(1) : '—'}</span>;
    if (key === 'language') return (value || '—').toUpperCase();
    return value || '—';
  };

  const permissionLabels = {
    all: 'All Permissions', manage_residents: 'Manage Residents', manage_flats: 'Manage Flats',
    manage_visitors: 'Manage Visitors', manage_complaints: 'Manage Complaints',
    submit_complaints: 'Submit Complaints', manage_notices: 'Manage Notices',
    view_notices: 'View Notices', manage_maintenance: 'Manage Maintenance',
    view_maintenance: 'View Maintenance', manage_settings: 'Manage Settings',
    view_notifications: 'View Notifications'
  };

  const renderSettingsGroup = group => {
    const config = groups[group];
    const values = settings[group];
    return <div className="settings-tab-content"><div className="settings-card glass">
      <h3>{config.title}</h3>
      <div className="settings-grid">{config.fields.map(field => <div key={field.key} className={`setting-item ${field.type === 'checkbox' ? 'toggle-item' : ''}`}>
        <label>{field.label}</label><span>{renderValue(field.key, values[field.key])}</span>
      </div>)}</div>
      <div className="settings-actions"><button className="btn-primary" onClick={() => openEditor(group)}><i className="fas fa-edit"></i> Edit {config.title}</button></div>
    </div></div>;
  };

  const renderRoles = () => <div className="settings-tab-content">
    <div className="settings-header-actions"><h3>Application Roles</h3><p>Roles and permissions are fixed by the application and can’t be edited here.</p></div>
    <div className="table-container glass"><table className="roles-table"><thead><tr><th>Role</th><th>Permissions</th></tr></thead><tbody>
      {settings.roles.map(role => <tr key={role.id}><td><strong>{role.name}</strong></td><td><div className="permissions-list">
        {role.permissions.map(permission => <span key={permission} className="permission-tag">{permissionLabels[permission] || permission}</span>)}
      </div></td></tr>)}
    </tbody></table></div>
  </div>;

  const renderModalField = field => <div key={field.key} className="form-group">
    <label>{field.label}{field.required ? ' *' : ''}</label>
    {field.type === 'checkbox' ? <label className="toggle-switch">
      <input type="checkbox" name={field.key} checked={Boolean(formData[field.key])} onChange={handleInputChange} />
      <span className="toggle-slider"></span>
    </label> : field.type === 'select' ? <select name={field.key} value={formData[field.key] ?? ''} onChange={handleInputChange}>
      {field.options.map(option => <option key={option} value={option}>{option}</option>)}
    </select> : <input type={field.type} name={field.key} value={formData[field.key] ?? ''} onChange={handleInputChange} min={field.min} max={field.max} required={field.required} />}
  </div>;

  if (loading && !settings) return <div className="settings-container"><div className="loading-state"><div className="spinner"></div><p>Loading settings...</p></div></div>;
  if (!settings) return <div className="settings-container"><div className="settings-error" role="alert">{error || 'Settings could not be loaded.'}</div><button className="btn-secondary" onClick={loadSettings}>Retry</button></div>;

  return <div className="settings-container">
    <div className="settings-header glass"><div className="header-left"><h1><i className="fas fa-cog"></i> Settings</h1><p>Configure society details and supported application behavior.</p></div></div>
    {error && <div className="settings-error" role="alert">{error}</div>}
    {success && <div className="settings-success" role="status">{success}</div>}
    <div className="settings-tabs glass">
      <button className={`tab-btn ${activeTab === 'society' ? 'active' : ''}`} onClick={() => setActiveTab('society')}><i className="fas fa-building"></i> Society</button>
      <button className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}><i className="fas fa-user-shield"></i> Roles</button>
      <button className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}><i className="fas fa-sliders-h"></i> System</button>
      <button className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}><i className="fas fa-palette"></i> Preferences</button>
    </div>
    {activeTab === 'roles' ? renderRoles() : renderSettingsGroup(activeTab)}

    {editingGroup && <div className="modal-overlay" onClick={() => !saving && setEditingGroup(null)}><div className="modal glass" onClick={event => event.stopPropagation()}>
      <form onSubmit={saveGroup}><div className="modal-header"><h2>Edit {groups[editingGroup].title}</h2><button type="button" className="modal-close" onClick={() => setEditingGroup(null)}><i className="fas fa-times"></i></button></div>
        <div className="modal-body"><div className="form-grid">{groups[editingGroup].fields.map(renderModalField)}</div></div>
        <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setEditingGroup(null)}>Cancel</button><button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button></div>
      </form>
    </div></div>}
  </div>;
};

export default Settings;
