import React, { useEffect, useState } from 'react';
import { apiJson, apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Complaints.css';

const titleCase = value => (value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const mapComplaint = complaint => ({
  id: complaint.complaint_id,
  title: complaint.subject,
  description: complaint.description || '',
  category: complaint.category || 'Other',
  priority: titleCase(complaint.priority),
  statusKey: complaint.status,
  status: complaint.status === 'assigned' ? 'In Progress' : titleCase(complaint.status),
  submittedBy: complaint.resident_name,
  residentId: complaint.resident_id,
  flatId: complaint.flat_id,
  flatNumber: `${complaint.flat_number} (${complaint.block_name})`,
  assignedTo: complaint.assigned_to_name,
  assignedToId: complaint.assigned_to,
  createdAt: complaint.created_at,
  updatedAt: complaint.updated_at,
  resolvedAt: complaint.resolved_at,
  resolutionNotes: complaint.resolution_notes || ''
});

const emptyForm = {
  title: '', description: '', category: 'Plumbing', priority: 'Medium', residentId: ''
};

const Complaints = () => {
  const { user } = useAuth();
  const isResident = user?.role === 'resident';
  const [complaints, setComplaints] = useState([]);
  const [residents, setResidents] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [complaintRows, residentRows, assigneeRows] = await Promise.all([
        apiRequest('/api/v1/complaints'),
        isResident ? Promise.resolve([]) : apiRequest('/residents/?status=active'),
        isResident ? Promise.resolve([]) : apiRequest('/api/v1/complaints/assignees')
      ]);
      setComplaints(complaintRows.map(mapComplaint));
      setResidents(residentRows);
      setAssignees(assigneeRows);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [isResident]);

  const filteredComplaints = complaints.filter(complaint => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [
      complaint.title, complaint.description, complaint.category,
      complaint.submittedBy, complaint.flatNumber, complaint.assignedTo
    ].some(value => value?.toLowerCase().includes(query));
    return matchesSearch && (selectedFilter === 'all' || complaint.statusKey === selectedFilter);
  });

  const handleInputChange = event => {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
  };

  const handleAddNew = () => {
    setEditingComplaint(null);
    setFormData(emptyForm);
    setError('');
    setShowModal(true);
  };

  const handleEdit = complaint => {
    setEditingComplaint(complaint);
    setFormData({
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      residentId: String(complaint.residentId)
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async event => {
    event.preventDefault();
    const resident = isResident ? null : residents.find(item => item.resident_id === Number(formData.residentId));
    if (!isResident && !resident) {
      setError('Choose an active resident. The resident must be linked to a flat.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        subject: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority.toLowerCase(),
        ...(!isResident ? { resident_id: resident.resident_id, flat_id: resident.flat_id } : {})
      };
      await apiRequest(
        editingComplaint ? `/api/v1/complaints/${editingComplaint.id}` : '/api/v1/complaints',
        apiJson(editingComplaint ? 'PATCH' : 'POST', payload)
      );
      await loadData();
      setShowModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleHistory = async id => {
    try {
      const history = await apiRequest(`/api/v1/complaints/${id}/history`);
      window.alert(history.length ? history.map(item => `${formatDateTime(item.created_at)} — ${item.changed_by_name}: ${titleCase(item.old_status || 'submitted')} → ${titleCase(item.new_status)}${item.note ? `\n${item.note}` : ''}`).join('\n\n') : 'No history available.');
    } catch (e) { setError(e.message); }
  };

  const handleAssign = async id => {
    if (!assignees.length) { setError('There are no active user accounts to assign this complaint to.'); return; }
    const choices = assignees.map((assignee, index) => `${index + 1}. ${assignee.full_name} (${titleCase(assignee.role)})`).join('\n');
    const answer = window.prompt(`Enter the number of the staff member to assign:\n${choices}`);
    if (answer === null) return;
    const selected = assignees[Number(answer) - 1];
    if (!selected) { setError('Enter a number from the assignee list.'); return; }
    try {
      await apiRequest(`/api/v1/complaints/${id}/assign`, apiJson('PATCH', { assignee_id: selected.user_id }));
      await loadData();
      setError('');
    } catch (e) { setError(e.message); }
  };

  const handleResolve = async id => {
    const note = window.prompt('Enter resolution notes:');
    if (note === null) return;
    try {
      await apiRequest(`/api/v1/complaints/${id}/status`, apiJson('PATCH', { status: 'resolved', note }));
      await loadData();
      setError('');
    } catch (e) { setError(e.message); }
  };

  const handleClose = async id => {
    if (!window.confirm('Close this complaint?')) return;
    try {
      await apiRequest(`/api/v1/complaints/${id}/status`, apiJson('PATCH', { status: 'closed' }));
      await loadData();
      setError('');
    } catch (e) { setError(e.message); }
  };

  const getStatusBadge = status => {
    const style = status === 'Open' ? 'open'
      : status === 'In Progress' ? 'in-progress'
        : status === 'Resolved' ? 'resolved' : status === 'Closed' ? 'closed'
          : status === 'Reopened' ? 'reopened' : '';
    return <span className={`status-badge ${style}`}>{status}</span>;
  };

  const getPriorityBadge = priority => (
    <span className={`priority-badge ${priority.toLowerCase()}`}>{priority}</span>
  );

  const formatDateTime = value => value ? new Date(value).toLocaleString(undefined, {
    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '-';

  return (
    <div className="complaints-container">
      <div className="complaints-header glass">
        <div className="header-left">
          <h1><i className="fas fa-exclamation-triangle"></i> Complaint Management</h1>
          <span className="total-count">Total Complaints: {filteredComplaints.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Submit Complaint
          </button>
        </div>
      </div>

      {error && <div className="complaints-error" role="alert">{error}</div>}

      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by title, category, resident, flat, or assignee..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={selectedFilter} onChange={event => setSelectedFilter(event.target.value)} className="filter-select">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="reopened">Reopened</option>
          </select>
        </div>
      </div>

      <div className="table-container glass">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading complaints...</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="complaints-table">
              <thead><tr>
                <th>COMPLAINT</th><th>CATEGORY</th><th>PRIORITY</th><th>SUBMITTED BY</th>
                <th>ASSIGNED TO</th><th>STATUS</th><th>ACTIONS</th>
              </tr></thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr><td colSpan="7" className="empty-row"><i className="fas fa-inbox"></i><span>No complaints found</span></td></tr>
                ) : filteredComplaints.map(complaint => (
                  <tr key={complaint.id}>
                    <td><div className="complaint-title-cell">
                      <div className="title">{complaint.title}</div>
                      <div className="meta"><span>Flat {complaint.flatNumber}</span><span className="dot">·</span><span className="date">{formatDateTime(complaint.createdAt)}</span></div>
                      {complaint.resolutionNotes && <div className="complaint-resolution-note">Resolution: {complaint.resolutionNotes}</div>}
                    </div></td>
                    <td>{complaint.category}</td>
                    <td>{getPriorityBadge(complaint.priority)}</td>
                    <td>{complaint.submittedBy}</td>
                    <td>{complaint.assignedTo || 'Unassigned'}</td>
                    <td>{getStatusBadge(complaint.status)}</td>
                    <td><div className="action-buttons">
                      <button className="action-btn edit" onClick={() => handleHistory(complaint.id)} title="View history"><i className="fas fa-history"></i></button>
                      {!isResident && <button className="action-btn edit" onClick={() => handleEdit(complaint)} title="Edit"><i className="fas fa-edit"></i></button>}
                      {!isResident && complaint.statusKey !== 'resolved' && complaint.statusKey !== 'closed' && (
                        <button className="action-btn assign" onClick={() => handleAssign(complaint.id)} title="Assign"><i className="fas fa-user-plus"></i></button>
                      )}
                      {!isResident && (complaint.statusKey === 'open' || complaint.statusKey === 'assigned' || complaint.statusKey === 'in_progress' || complaint.statusKey === 'reopened') && (
                        <button className="action-btn resolve" onClick={() => handleResolve(complaint.id)} title="Resolve"><i className="fas fa-check"></i></button>
                      )}
                      {!isResident && complaint.statusKey === 'resolved' && (
                        <button className="action-btn close-complaint" onClick={() => handleClose(complaint.id)} title="Close"><i className="fas fa-check-double"></i></button>
                      )}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass" onClick={event => event.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h2>{editingComplaint ? 'Edit Complaint' : 'Submit New Complaint'}</h2>
                <button type="button" className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <div className="modal-body">
                {error && <div className="complaints-error" role="alert">{error}</div>}
                <div className="form-grid">
                  {!isResident && <div className="form-group full-width">
                    <label>Title *</label>
                    <input name="title" value={formData.title} onChange={handleInputChange} placeholder="Brief title of the complaint" required maxLength="255" />
                  </div>}
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe the issue" rows="3" />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange}>
                      <option>Plumbing</option><option>Electrical</option><option>Cleaning</option>
                      <option>Security</option><option>Noise</option><option>Maintenance</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority *</label>
                    <select name="priority" value={formData.priority} onChange={handleInputChange} required>
                      <option value="Low">Low</option><option value="Medium">Medium</option>
                      <option value="High">High</option><option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Resident *</label>
                    <select name="residentId" value={formData.residentId} onChange={handleInputChange} required>
                      <option value="">Select a resident</option>
                      {residents.map(resident => (
                        <option key={resident.resident_id} value={resident.resident_id}>
                          {resident.full_name} - {resident.flat_number} ({resident.block_name})
                        </option>
                      ))}
                    </select>
                    {!residents.length && <small>Add an active resident before submitting a complaint.</small>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving || !residents.length}>
                  {saving ? 'Saving...' : editingComplaint ? 'Update Complaint' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
