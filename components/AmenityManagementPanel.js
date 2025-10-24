'use client';
import { useState, useEffect } from 'react';

export default function AmenityManagementPanel({ userRole }) {
  const [activeTab, setActiveTab] = useState('optional');
  const [optionalAmenities, setOptionalAmenities] = useState([]);
  const [rentalAmenities, setRentalAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showOptionalForm, setShowOptionalForm] = useState(false);
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [optionalForm, setOptionalForm] = useState({
    name: '',
    description: '',
    maxQuantity: 1
  });

  const [rentalForm, setRentalForm] = useState({
    name: '',
    description: '',
    pricePerUnit: '',
    pricePerHour: '',
    unitType: ''
  });

  useEffect(() => {
    loadAmenities();
  }, []);

  const loadAmenities = async () => {
    try {
      setLoading(true);

      const [optionalRes, rentalRes] = await Promise.all([
        fetch('/api/amenities/optional'),
        fetch('/api/amenities/rental')
      ]);

      if (optionalRes.ok) {
        const optionalData = await optionalRes.json();
        setOptionalAmenities(optionalData);
      }

      if (rentalRes.ok) {
        const rentalData = await rentalRes.json();
        setRentalAmenities(rentalData);
      }

    } catch (err) {
      console.error('Error loading amenities:', err);
      setError('Failed to load amenities');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionalSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingItem
        ? `/api/amenities/optional/${editingItem.id}`
        : '/api/amenities/optional';

      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optionalForm),
      });

      if (response.ok) {
        await loadAmenities();
        resetOptionalForm();
        setShowOptionalForm(false);
        setEditingItem(null);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error saving optional amenity:', err);
      alert('Failed to save optional amenity');
    }
  };

  const handleRentalSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingItem
        ? `/api/amenities/rental/${editingItem.id}`
        : '/api/amenities/rental';

      const method = editingItem ? 'PUT' : 'POST';

      const body = {
        ...rentalForm,
        pricePerUnit: Math.round(parseFloat(rentalForm.pricePerUnit) * 100),
        pricePerHour: rentalForm.pricePerHour ? Math.round(parseFloat(rentalForm.pricePerHour) * 100) : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadAmenities();
        resetRentalForm();
        setShowRentalForm(false);
        setEditingItem(null);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error saving rental amenity:', err);
      alert('Failed to save rental amenity');
    }
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    if (type === 'optional') {
      setOptionalForm({
        name: item.name,
        description: item.description || '',
        maxQuantity: item.maxQuantity,
      });
      setShowOptionalForm(true);
    } else {
      setRentalForm({
        name: item.name,
        description: item.description || '',
        pricePerUnit: item.pricePerUnit / 100,
        pricePerHour: item.pricePerHour ? item.pricePerHour / 100 : '',
        unitType: item.unitType,
      });
      setShowRentalForm(true);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return;

    try {
      const response = await fetch(`/api/amenities/${type}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAmenities();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error deleting amenity:', err);
      alert('Failed to delete amenity');
    }
  };

  const resetOptionalForm = () => {
    setOptionalForm({
      name: '',
      description: '',
      maxQuantity: 1
    });
  };

  const resetRentalForm = () => {
    setRentalForm({
      name: '',
      description: '',
      pricePerUnit: '',
      pricePerHour: '',
      unitType: ''
    });
  };

  if (loading) {
    return (
      <div className="amenity-management-loading">
        <p>Loading amenities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="amenity-management-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="amenity-management-panel">
      <div className="panel-header">
        <h3>Amenity Management</h3>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'optional' ? 'active' : ''}`}
            onClick={() => setActiveTab('optional')}
          >
            Optional Amenities
          </button>
          <button
            className={`tab-btn ${activeTab === 'rental' ? 'active' : ''}`}
            onClick={() => setActiveTab('rental')}
          >
            Rental Services
          </button>
        </div>
      </div>

      <div className="panel-content">
        {activeTab === 'optional' && (
          <div className="tab-content">
            <div className="content-header">
              <h4>Optional Amenities</h4>
              <button
                className="add-btn"
                onClick={() => {
                  setEditingItem(null);
                  resetOptionalForm();
                  setShowOptionalForm(true);
                }}
              >
                Add Optional Amenity
              </button>
            </div>

            <div className="amenities-list">
              {optionalAmenities.map((amenity) => (
                <div key={amenity.id} className="amenity-item">
                  <div className="amenity-info">
                    <h5>{amenity.name}</h5>
                    <p>{amenity.description}</p>
                    <span className="max-quantity">Max Quantity: {amenity.maxQuantity}</span>
                  </div>
                  <div className="amenity-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(amenity, 'optional')}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(amenity.id, 'optional')}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rental' && (
          <div className="tab-content">
            <div className="content-header">
              <h4>Rental Services</h4>
              <button
                className="add-btn"
                onClick={() => {
                  setEditingItem(null);
                  resetRentalForm();
                  setShowRentalForm(true);
                }}
              >
                Add Rental Service
              </button>
            </div>

            <div className="amenities-list">
              {rentalAmenities.map((amenity) => (
                <div key={amenity.id} className="amenity-item">
                  <div className="amenity-info">
                    <h5>{amenity.name}</h5>
                    <p>{amenity.description}</p>
                    <div className="pricing-info">
                      <span>₱{(amenity.pricePerUnit / 100).toFixed(0)} per {amenity.unitType}</span>
                      {amenity.pricePerHour && (
                        <span>₱{(amenity.pricePerHour / 100).toFixed(0)} per hour</span>
                      )}
                    </div>
                  </div>
                  <div className="amenity-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(amenity, 'rental')}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(amenity.id, 'rental')}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Optional Amenity Form Modal */}
      {showOptionalForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>{editingItem ? 'Edit' : 'Add'} Optional Amenity</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setShowOptionalForm(false);
                  setEditingItem(null);
                  resetOptionalForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleOptionalSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={optionalForm.name}
                  onChange={(e) => setOptionalForm({...optionalForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={optionalForm.description}
                  onChange={(e) => setOptionalForm({...optionalForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Max Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={optionalForm.maxQuantity}
                  onChange={(e) => setOptionalForm({...optionalForm, maxQuantity: parseInt(e.target.value) || 1})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowOptionalForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rental Amenity Form Modal */}
      {showRentalForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>{editingItem ? 'Edit' : 'Add'} Rental Service</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setShowRentalForm(false);
                  setEditingItem(null);
                  resetRentalForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRentalSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={rentalForm.name}
                  onChange={(e) => setRentalForm({...rentalForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={rentalForm.description}
                  onChange={(e) => setRentalForm({...rentalForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Price per Unit *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={rentalForm.pricePerUnit}
                  onChange={(e) => setRentalForm({...rentalForm, pricePerUnit: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Price per Hour</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={rentalForm.pricePerHour}
                  onChange={(e) => setRentalForm({...rentalForm, pricePerHour: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Unit Type *</label>
                <input
                  type="text"
                  value={rentalForm.unitType}
                  onChange={(e) => setRentalForm({...rentalForm, unitType: e.target.value})}
                  placeholder="e.g., piece, set, day"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowRentalForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .amenity-management-panel {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1px solid rgba(254, 190, 82, 0.1);
          overflow: hidden;
        }

        .panel-header {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f9fafb 0%, #fff 100%);
        }

        .panel-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .tab-buttons {
          display: flex;
          gap: 12px;
        }

        .tab-btn {
          padding: 10px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          color: #6b7280;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #febe52 0%, #f59e0b 100%);
          color: white;
          border-color: #f59e0b;
          box-shadow: 0 4px 12px rgba(254, 190, 82, 0.3);
        }

        .tab-btn:hover:not(.active) {
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-1px);
        }

        .panel-content {
          padding: 24px;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .content-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .add-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .add-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .amenities-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .amenity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: all 0.3s ease;
        }

        .amenity-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: rgba(254, 190, 82, 0.3);
        }

        .amenity-info h5 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .amenity-info p {
          margin: 0 0 8px 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .max-quantity, .price-info {
          font-size: 0.85rem;
          color: #374151;
          font-weight: 600;
        }

        .pricing-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .amenity-actions {
          display: flex;
          gap: 8px;
        }

        .edit-btn, .delete-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .edit-btn {
          background: #007bff;
          color: white;
        }

        .edit-btn:hover {
          background: #0056b3;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
        }

        .modal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          border: 1px solid rgba(254, 190, 82, 0.1);
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f9fafb 0%, #fff 100%);
        }

        .modal-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-form {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .cancel-btn, .submit-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }

        .cancel-btn {
          background: #6c757d;
          color: white;
        }

        .cancel-btn:hover {
          background: #5a6268;
        }

        .submit-btn {
          background: #28a745;
          color: white;
        }

        .submit-btn:hover {
          background: #218838;
        }

        .amenity-management-loading,
        .amenity-management-error {
          padding: 40px;
          text-align: center;
          color: #666;
        }

        .amenity-management-error {
          color: #dc3545;
        }

        @media (max-width: 768px) {
          .panel-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .tab-buttons {
            width: 100%;
          }

          .tab-btn {
            flex: 1;
          }

          .content-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .amenity-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .amenity-actions {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
