import React, { useState, useEffect } from 'react';
import './Residents.css';

// Mock Data
const MOCK_RESIDENTS = [
  {
    id: 1,
    name: 'Patrick Ferrell',
    email: 'patrick.f@email.com',
    phone: '+1 113-458-4273',
    flatNumber: 'A-102',
    block: 'A',
    role: 'Owner',
    status: 'Active',
    joinDate: '2024-07-15',
    occupation: 'Software Engineer',
    familyMembers: 3
  },
  {
    id: 2,
    name: 'Markus Bryan',
    email: 'markus.b@email.com',
    phone: '+1 113-458-4274',
    flatNumber: 'B-205',
    block: 'B',
    role: 'Tenant',
    status: 'Active',
    joinDate: '2024-07-15',
    occupation: 'Doctor',
    familyMembers: 2
  },
  {
    id: 3,
    name: 'Mark Romero',
    email: 'mark.r@email.com',
    phone: '+1 113-458-4275',
    flatNumber: 'C-309',
    block: 'C',
    role: 'Owner',
    status: 'Inactive',
    joinDate: '2024-07-15',
    occupation: 'Business Owner',
    familyMembers: 4
  },
  {
    id: 4,
    name: 'Jonathan Ortiz',
    email: 'jonathan.o@email.com',
    phone: '+1 113-458-4276',
    flatNumber: 'A-402',
    block: 'A',
    role: 'Tenant',
    status: 'Active',
    joinDate: '2024-07-15',
    occupation: 'Teacher',
    familyMembers: 1
  },
  {
    id: 5,
    name: 'Tony Jones',
    email: 'tony.j@email.com',
    phone: '+1 113-458-4277',
    flatNumber: 'B-110',
    block: 'B',
    role: 'Owner',
    status: 'Active',
    joinDate: '2024-07-15',
    occupation: 'Architect',
    familyMembers: 5
  },
  {
    id: 6,
    name: 'Charles Douglas',
    email: 'charles.d@email.com',
    phone: '+1 113-458-4278',
    flatNumber: 'D-501',
    block: 'D',
    role: 'Tenant',
    status: 'Active',
    joinDate: '2024-07-15',
    occupation: 'Engineer',
    familyMembers: 2
  }
];

const Residents = () => {
  const [residents, setResidents] = useState(MOCK_RESIDENTS);
  const [filteredResidents, setFilteredResidents] = useState(MOCK_RESIDENTS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    flatNumber: '',
    block: 'A',
    role: 'Owner',
    status: 'Active',
    emergencyContact: '',
    occupation: '',
    familyMembers: 1
  });

  // Filter residents
  useEffect(() => {
    let filtered = residents;
    
    if (searchTerm) {
      filtered = filtered.filter(resident =>
        resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.phone.includes(searchTerm)
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(resident => 
        resident.status.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    
    setFilteredResidents(filtered);
  }, [searchTerm, selectedFilter, residents]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNew = () => {
    setEditingResident(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      flatNumber: '',
      block: 'A',
      role: 'Owner',
      status: 'Active',
      emergencyContact: '',
      occupation: '',
      familyMembers: 1
    });
    setShowModal(true);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    setFormData(resident);
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingResident) {
      setResidents(residents.map(r => 
        r.id === editingResident.id ? { ...formData, id: r.id } : r
      ));
    } else {
      const newResident = {
        ...formData,
        id: residents.length + 1,
        joinDate: new Date().toISOString().split('T')[0]
      };
      setResidents([...residents, newResident]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      setResidents(residents.filter(r => r.id !== id));
    }
  };

  const handleToggleStatus = (id) => {
    setResidents(residents.map(r => 
      r.id === id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' } : r
    ));
  };

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? <span className="status-badge active">● Active</span>
      : <span className="status-badge inactive">● Inactive</span>;
  };

  return (
    <div className="residents-container">
      {/* Header */}
      <div className="residents-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-users"></i> Resident Management
          </h1>
          <span className="total-count">Total Residents: {filteredResidents.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Add Resident
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search residents by name, flat number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading residents...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="residents-table">
              <thead>
                <tr>
                  <th>RESIDENT NAME</th>
                  <th>FLAT / BLOCK</th>
                  <th>CONTACT</th>
                  <th>STATUS</th>
                  <th>JOINED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      <i className="fas fa-users-slash"></i>
                      <span>No residents found</span>
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident) => (
                    <tr key={resident.id}>
                      <td>
                        <div className="resident-name-cell">
                          <div className="resident-avatar">
                            {resident.name.charAt(0)}
                          </div>
                          <div>
                            <div className="name">{resident.name}</div>
                            <div className="role-badge-cell">{resident.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flat-info">
                          <div className="flat-number">{resident.flatNumber}</div>
                          <div className="block">Block {resident.block}</div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="email">{resident.email}</div>
                          <div className="phone">{resident.phone}</div>
                        </div>
                      </td>
                      <td>{getStatusBadge(resident.status)}</td>
                      <td>{resident.joinDate}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEdit(resident)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="action-btn toggle"
                            onClick={() => handleToggleStatus(resident.id)}
                            title={resident.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            <i className={`fas ${resident.status === 'Active' ? 'fa-pause' : 'fa-play'}`}></i>
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(resident.id)}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal (same as before) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingResident ? 'Edit Resident' : 'Add New Resident'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Enter emergency contact"
                  />
                </div>

                <div className="form-group">
                  <label>Flat Number *</label>
                  <input
                    type="text"
                    name="flatNumber"
                    value={formData.flatNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., A-101"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Block *</label>
                  <select
                    name="block"
                    value={formData.block}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="A">Block A</option>
                    <option value="B">Block B</option>
                    <option value="C">Block C</option>
                    <option value="D">Block D</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    placeholder="Enter occupation"
                  />
                </div>

                <div className="form-group">
                  <label>Family Members</label>
                  <input
                    type="number"
                    name="familyMembers"
                    value={formData.familyMembers}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingResident ? 'Update Resident' : 'Add Resident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;