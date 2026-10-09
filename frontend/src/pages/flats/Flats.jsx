import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, apiJson } from '../../services/api';
import './Flats.css';

// Mock Data
const MOCK_FLATS = [
  {
    id: 1,
    flatNumber: 'A-101',
    block: 'A',
    floor: 1,
    area: '1200 sq.ft',
    status: 'Occupied',
    currentResident: 'John Doe',
    ownerName: 'John Doe',
    residentsCount: 3,
    parkingSlot: 'P-1'
  },
  {
    id: 2,
    flatNumber: 'A-102',
    block: 'A',
    floor: 1,
    area: '1100 sq.ft',
    status: 'Occupied',
    currentResident: 'Sarah Smith',
    ownerName: 'Sarah Smith',
    residentsCount: 2,
    parkingSlot: 'P-2'
  },
  {
    id: 3,
    flatNumber: 'A-201',
    block: 'A',
    floor: 2,
    area: '1400 sq.ft',
    status: 'Vacant',
    currentResident: null,
    ownerName: 'Mark Johnson',
    residentsCount: 0,
    parkingSlot: 'P-3'
  },
  {
    id: 4,
    flatNumber: 'B-205',
    block: 'B',
    floor: 2,
    area: '1300 sq.ft',
    status: 'Occupied',
    currentResident: 'Emily Davis',
    ownerName: 'Emily Davis',
    residentsCount: 1,
    parkingSlot: 'P-4'
  },
  {
    id: 5,
    flatNumber: 'C-309',
    block: 'C',
    floor: 3,
    area: '1500 sq.ft',
    status: 'Occupied',
    currentResident: 'Mike Johnson',
    ownerName: 'Mike Johnson',
    residentsCount: 4,
    parkingSlot: 'P-5'
  },
  {
    id: 6,
    flatNumber: 'D-501',
    block: 'D',
    floor: 5,
    area: '1800 sq.ft',
    status: 'Vacant',
    currentResident: null,
    ownerName: 'Available',
    residentsCount: 0,
    parkingSlot: 'P-6'
  }
];

const Flats = () => {
  const [flats, setFlats] = useState([]);
  const [filteredFlats, setFilteredFlats] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [flatResidents, setFlatResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsError, setResidentsError] = useState('');
  const [formData, setFormData] = useState({
    flatNumber: '',
    block: 'A',
    floor: 1,
    area: '',
    status: 'Vacant',
    ownerName: '',
    residentsCount: 0,
    parkingSlot: ''
  });

  const loadFlats = async () => {
    setLoading(true);
    try {
      const [result, blockRows] = await Promise.all([
        apiRequest('/api/v1/flats'), apiRequest('/api/v1/blocks')
      ]);
      setFlats(result.items.map(f => ({
        id: f.flat_id, flat_id: f.flat_id, block_id: f.block_id,
        flatNumber: f.flat_number, block: f.block_name.replace(/^Block\s+/i, ''),
        floor: f.floor, area: f.area_sqft ? `${f.area_sqft} sq.ft` : '',
        status: f.occupancy_status[0].toUpperCase() + f.occupancy_status.slice(1),
        ownerName: f.owner_name || '', currentResident: f.owner_name,
        residentsCount: f.residents_count, parkingSlot: f.parking_slot || ''
      })));
      setBlocks(blockRows);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadFlats(); }, []);

  // Filter flats
  useEffect(() => {
    let filtered = flats;
    
    if (searchTerm) {
      filtered = filtered.filter(flat =>
        flat.flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flat.block.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flat.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (flat.currentResident && flat.currentResident.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(flat => 
        flat.status.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    
    setFilteredFlats(filtered);
  }, [searchTerm, selectedFilter, flats]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNew = () => {
    setEditingFlat(null);
    setFlatResidents([]);
    setResidentsError('');
    setFormData({
      flatNumber: '',
      block: 'A',
      floor: 1,
      area: '',
      status: 'Vacant',
      ownerName: '',
      residentsCount: 0,
      parkingSlot: ''
    });
    setShowModal(true);
  };

  const handleEdit = (flat) => {
    setEditingFlat(flat);
    setFormData(flat);
    setFlatResidents([]);
    setResidentsError('');
    setResidentsLoading(true);
    setShowModal(true);
    apiRequest(`/residents/?flat_id=${flat.id}`)
      .then(setFlatResidents)
      .catch(e => setResidentsError(e.message))
      .finally(() => setResidentsLoading(false));
  };

  const handleSave = async () => {
    const block = blocks.find(b => b.name.replace(/^Block\s+/i, '') === formData.block);
    if (!block) { setError('Select a valid block.'); return; }
    const payload = {
      block_id: block.block_id, flat_number: formData.flatNumber,
      floor: Number(formData.floor) || 0,
      area_sqft: Number.parseFloat(formData.area) || null,
      parking_slot: formData.parkingSlot || null,
      occupancy_status: formData.status.toLowerCase()
    };
    try {
      const savedFlat = await apiRequest(editingFlat ? `/api/v1/flats/${editingFlat.id}` : '/api/v1/flats',
        apiJson(editingFlat ? 'PUT' : 'POST', payload));
      if (formData.ownerName.trim()) {
        try {
          const flatResidents = await apiRequest(`/residents/?flat_id=${savedFlat.flat_id}`);
          const owner = flatResidents.find(r => r.resident_type === 'owner');
          const ownerPayload = {
            full_name: formData.ownerName.trim(), flat_id: savedFlat.flat_id,
            resident_type: 'owner', status: 'active', is_primary_contact: true
          };
          await apiRequest(owner ? `/residents/${owner.resident_id}` : '/residents/',
            apiJson(owner ? 'PATCH' : 'POST', ownerPayload));
        } catch (ownerError) {
          setError(`Flat saved, but its owner was not saved: ${ownerError.message}`);
          await loadFlats(); setShowModal(false);
          return;
        }
      }
      await loadFlats(); setShowModal(false); setError('');
    } catch (e) { setError(e.message); }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this flat?')) {
      apiRequest(`/api/v1/flats/${id}`, { method: 'DELETE' }).then(loadFlats).catch(e => setError(e.message));
    }
  };

  const handleToggleStatus = (id) => {
    const flat = flats.find(f => f.id === id);
    apiRequest(`/api/v1/flats/${id}`, apiJson('PUT', { occupancy_status: flat.status === 'Occupied' ? 'vacant' : 'occupied' }))
      .then(loadFlats).catch(e => setError(e.message));
  };

  const getStatusBadge = (status) => {
    return status === 'Occupied' 
      ? <span className="status-badge occupied">● Occupied</span>
      : <span className="status-badge vacant">● Vacant</span>;
  };

  return (
    <div className="flats-container">
      {/* Header */}
      <div className="flats-header glass">
        <div className="header-left">
          <h1>
            <i className="fas fa-building"></i> Flat Management
          </h1>
          <span className="total-count">Total Flats: {filteredFlats.length}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Add Flat
          </button>
        </div>
      </div>
      {error && <div role="alert" className="error-message">{error}</div>}

      {/* Search and Filter */}
      <div className="search-filter-section glass">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by flat number, block, or owner..."
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
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container glass">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading flats...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="flats-table">
              <thead>
                <tr>
                  <th>FLAT NUMBER</th>
                  <th>BLOCK</th>
                  <th>FLOOR</th>
                  <th>OCCUPANCY STATUS</th>
                  <th>RESIDENT / OWNER</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlats.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      <i className="fas fa-building-slash"></i>
                      <span>No flats found</span>
                    </td>
                  </tr>
                ) : (
                  filteredFlats.map((flat) => (
                    <tr key={flat.id}>
                      <td>
                        <div className="flat-number-cell">
                          <span className="flat-number">{flat.flatNumber}</span>
                          <span className="area">{flat.area}</span>
                        </div>
                      </td>
                      <td>Block {flat.block}</td>
                      <td>{flat.floor}</td>
                      <td>{getStatusBadge(flat.status)}</td>
                      <td>
                        <div className="resident-info">
                          <div className="owner">{flat.ownerName}</div>
                          <div className="residents-count">
                            <i className="fas fa-users"></i> {flat.residentsCount} members
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEdit(flat)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="action-btn toggle"
                            onClick={() => handleToggleStatus(flat.id)}
                            title={flat.status === 'Occupied' ? 'Mark Vacant' : 'Mark Occupied'}
                          >
                            <i className={`fas ${flat.status === 'Occupied' ? 'fa-pause' : 'fa-play'}`}></i>
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(flat.id)}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingFlat ? 'Edit Flat' : 'Add New Flat'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
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
                    {blocks.map(block => {
                      const shortName = block.name.replace(/^Block\s+/i, '');
                      return <option key={block.block_id} value={shortName}>{block.name}</option>;
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Floor *</label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleInputChange}
                    min="0"
                    max="20"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Area (sq.ft)</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="e.g., 1200 sq.ft"
                  />
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Occupied">Occupied</option>
                    <option value="Vacant">Vacant</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Owner Name</label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    placeholder="Enter owner name"
                  />
                  <small>Saving an owner name also adds that person to Residents.</small>
                </div>

                <div className="form-group">
                  <label>Parking Slot</label>
                  <input
                    type="text"
                    name="parkingSlot"
                    value={formData.parkingSlot}
                    onChange={handleInputChange}
                    placeholder="e.g., P-1"
                  />
                </div>
              </div>

              {editingFlat && (
                <section className="flat-residents-section">
                  <div className="flat-residents-heading">
                    <div>
                      <h3>Residents of this flat</h3>
                      <span>{residentsLoading ? 'Loading residents...' : `${flatResidents.length} registered`}</span>
                    </div>
                    <Link to="/residents">Manage residents</Link>
                  </div>
                  {residentsError ? (
                    <p className="flat-residents-empty">Could not load residents: {residentsError}</p>
                  ) : residentsLoading ? null : flatResidents.length === 0 ? (
                    <p className="flat-residents-empty">No residents are registered for this flat yet.</p>
                  ) : (
                    <div className="flat-residents-list">
                      {flatResidents.map(resident => (
                        <div className="flat-resident-card" key={resident.resident_id}>
                          <div className="flat-resident-avatar">{resident.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
                          <div className="flat-resident-details">
                            <strong>{resident.full_name}</strong>
                            <span>{resident.resident_type.replaceAll('_', ' ')}</span>
                            <small>{[resident.phone, resident.email].filter(Boolean).join(' · ') || 'No contact details'}</small>
                          </div>
                          {resident.is_primary_contact && <span className="primary-contact-badge">Primary contact</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingFlat ? 'Update Flat' : 'Add Flat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flats;
