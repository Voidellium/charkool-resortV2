'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { DoorOpen, Plus, Edit2, Trash2, Search, Upload, Eye, RefreshCw, BedDouble, Users, DollarSign } from 'lucide-react';

export default function SuperAdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: '',
    price: '',
    quantity: 1,
    image: null,
  });
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ROOMS_PER_PAGE = 6;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  // Filter rooms based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRooms(filtered);
    }
  }, [rooms, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRooms.length / ROOMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROOMS_PER_PAGE;
  const paginatedRooms = filteredRooms.slice(startIndex, startIndex + ROOMS_PER_PAGE);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchRooms = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      if (!showRefresh) setLoading(true);
      
      const res = await fetch('/api/rooms', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error fetching rooms: ${res.status}`);
      const data = await res.json();
      setRooms(data);
      setFilteredRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.name || !newRoom.type) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newRoom.name);
      formData.append('type', newRoom.type);
      formData.append('price', newRoom.price * 100);
      formData.append('quantity', newRoom.quantity);
      if (newRoom.image) formData.append('image', newRoom.image);

      const res = await fetch('/api/rooms', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed to add room');

      const addedRoom = await res.json();
      setRooms((prev) => [...prev, addedRoom]);
      setNewRoom({ name: '', type: '', price: 0, quantity: 1, image: null });
    } catch (err) {
      console.error('Error adding room:', err);
    }
  };

  const handleUpdateRoom = async (id) => {
    if (!editingRoom?.name || !editingRoom?.type) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editingRoom.name);
      formData.append('type', editingRoom.type);
      formData.append('price', editingRoom.price * 100);
      formData.append('quantity', editingRoom.quantity);
      if (editingRoom.image) formData.append('image', editingRoom.image);

      const res = await fetch(`/api/rooms/${id}`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error('Failed to update room');

      const updatedRoom = await res.json();
      setRooms((prev) => prev.map((room) => (room.id === id ? updatedRoom : room)));
      setEditingRoom(null);
    } catch (err) {
      console.error('Error updating room:', err);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete room');
      setRooms((prev) => prev.filter((room) => room.id !== id));
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  // Button styles
  const buttonStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  };

  const primaryBtn = { ...buttonStyle, backgroundColor: '#007bff', color: '#fff' };
  const secondaryBtn = { ...buttonStyle, backgroundColor: '#6c757d', color: '#fff' };
  const successBtn = { ...buttonStyle, backgroundColor: '#28a745', color: '#fff' };
  const dangerBtn = { ...buttonStyle, backgroundColor: '#dc3545', color: '#fff' };
  const warningBtn = { ...buttonStyle, backgroundColor: '#ffc107', color: '#212529' };

  return (
    <SuperAdminLayout activePage="rooms">
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.titleSection}>
              <div style={styles.iconContainer}>
                <DoorOpen size={32} style={{ color: 'white' }} />
              </div>
              <div>
                <h1 style={styles.title}>Room Management</h1>
                <p style={styles.subtitle}>Manage hotel rooms, types, and pricing</p>
              </div>
            </div>
            <div style={styles.headerActions}>
              <button
                onClick={() => fetchRooms(true)}
                disabled={refreshing}
                style={{
                  ...styles.refreshButton,
                  opacity: refreshing ? 0.7 : 1,
                  cursor: refreshing ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={16} style={{ 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none' 
                }} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={styles.addButton}
              >
                <Plus size={16} />
                Add Room
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <DoorOpen size={24} style={{ color: '#667eea' }} />
            </div>
            <div>
              <div style={styles.statValue}>{rooms.length}</div>
              <div style={styles.statLabel}>Total Rooms</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <BedDouble size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={styles.statValue}>
                {rooms.reduce((sum, room) => sum + room.quantity, 0)}
              </div>
              <div style={styles.statLabel}>Available Units</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <DollarSign size={24} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={styles.statValue}>
                ₱{Math.round(rooms.reduce((sum, room) => sum + (room.price / 100), 0) / rooms.length || 0)}
              </div>
              <div style={styles.statLabel}>Avg. Price</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Users size={24} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <div style={styles.statValue}>
                {new Set(rooms.map(room => room.type)).size}
              </div>
              <div style={styles.statLabel}>Room Types</div>
            </div>
          </div>
        </div>

        {/* Search and Add Form */}
        <div style={styles.controlsSection}>
          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <Search size={20} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search rooms by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Add Room Form */}
        {showAddForm && (
          <div style={styles.formContainer}>
            <div style={styles.formHeader}>
              <h3 style={styles.formTitle}>
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h3>
            </div>
            <form onSubmit={editingRoom ? () => handleUpdateRoom(editingRoom.id) : handleAddRoom} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Room Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Presidential Suite"
                    value={editingRoom ? editingRoom.name : newRoom.name}
                    onChange={(e) => {
                      if (editingRoom) {
                        setEditingRoom({ ...editingRoom, name: e.target.value });
                      } else {
                        setNewRoom({ ...newRoom, name: e.target.value });
                      }
                    }}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Room Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Deluxe, Standard"
                    value={editingRoom ? editingRoom.type : newRoom.type}
                    onChange={(e) => {
                      if (editingRoom) {
                        setEditingRoom({ ...editingRoom, type: e.target.value });
                      } else {
                        setNewRoom({ ...newRoom, type: e.target.value });
                      }
                    }}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Price per Night (₱)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editingRoom ? editingRoom.price : newRoom.price}
                    onChange={(e) => {
                      if (editingRoom) {
                        setEditingRoom({ ...editingRoom, price: Number(e.target.value) });
                      } else {
                        setNewRoom({ ...newRoom, price: Number(e.target.value) });
                      }
                    }}
                    style={styles.input}
                    min="0"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Quantity</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={editingRoom ? editingRoom.quantity : newRoom.quantity}
                    onChange={(e) => {
                      if (editingRoom) {
                        setEditingRoom({ ...editingRoom, quantity: Number(e.target.value) });
                      } else {
                        setNewRoom({ ...newRoom, quantity: Number(e.target.value) });
                      }
                    }}
                    style={styles.input}
                    min="1"
                    required
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Room Image</label>
                <div style={styles.fileInputContainer}>
                  <Upload size={20} style={{ color: '#9ca3af' }} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (editingRoom) {
                        setEditingRoom({ ...editingRoom, image: e.target.files[0] });
                      } else {
                        setNewRoom({ ...newRoom, image: e.target.files[0] });
                      }
                    }}
                    style={styles.fileInput}
                  />
                  <span style={styles.fileInputText}>
                    {(editingRoom?.image || newRoom.image) 
                      ? (editingRoom?.image?.name || newRoom.image?.name)
                      : 'Choose image file'
                    }
                  </span>
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="submit" style={styles.submitButton} disabled={loading}>
                  <Plus size={16} />
                  {editingRoom ? 'Update Room' : 'Add Room'}
                </button>
                {editingRoom && (
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => {
                      setEditingRoom(null);
                      setShowAddForm(false);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Rooms Grid */}
        <div style={styles.gridContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading rooms...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div style={styles.emptyState}>
              <DoorOpen size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
              <h3 style={styles.emptyTitle}>
                {searchTerm ? 'No rooms found' : 'No rooms yet'}
              </h3>
              <p style={styles.emptyText}>
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Start by adding your first room to the inventory'
                }
              </p>
            </div>
          ) : (
            paginatedRooms.map((room) => (
              <div key={room.id} style={styles.roomCard}>
                <div style={styles.roomImageContainer}>
                  {room.imageUrl ? (
                    <img
                      src={room.imageUrl}
                      alt={room.name}
                      style={styles.roomImage}
                    />
                  ) : (
                    <div style={styles.roomImagePlaceholder}>
                      <DoorOpen size={40} style={{ color: '#9ca3af' }} />
                    </div>
                  )}
                  <div style={styles.roomImageOverlay}>
                    <button
                      onClick={() => {
                        setEditingRoom(room);
                        setShowAddForm(true);
                      }}
                      style={styles.quickEditButton}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={styles.roomContent}>
                  <div style={styles.roomHeader}>
                    <h3 style={styles.roomName}>{room.name}</h3>
                    <span style={styles.roomType}>{room.type}</span>
                  </div>

                  <div style={styles.roomStats}>
                    <div style={styles.roomStat}>
                      <DollarSign size={16} style={{ color: '#10b981' }} />
                      <span style={styles.roomPrice}>₱{(room.price / 100).toLocaleString()}</span>
                      <span style={styles.roomPriceLabel}>per night</span>
                    </div>
                    <div style={styles.roomStat}>
                      <BedDouble size={16} style={{ color: '#febe52' }} />
                      <span style={styles.roomQuantity}>{room.quantity}</span>
                      <span style={styles.roomQuantityLabel}>units</span>
                    </div>
                  </div>

                  <div style={styles.roomMeta}>
                    <span style={styles.roomMetaText}>
                      Added {new Date(room.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={styles.roomActions}>
                    <button
                      onClick={() => {
                        setEditingRoom(room);
                        setShowAddForm(true);
                      }}
                      style={styles.editActionButton}
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      style={styles.deleteActionButton}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
              Showing {startIndex + 1}-{Math.min(startIndex + ROOMS_PER_PAGE, filteredRooms.length)} of {filteredRooms.length} rooms
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: currentPage === 1 ? '#f9fafb' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else {
                  if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === page ? 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' : 'white',
                      color: currentPage === page ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: currentPage === totalPages ? '#f9fafb' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .controls-responsive {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          
          .form-responsive {
            flex-direction: column !important;
          }
          
          .stats-responsive {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        @media (max-width: 480px) {
          .stats-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </SuperAdminLayout>
  );
}

// Professional hotel dashboard styles
const styles = {
  container: {
    width: '100%',
    padding: '2rem 1.5rem',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  // Header Section
  header: {
    background: 'rgba(255,255,255,0.95)',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: '2rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconContainer: {
    background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: '1.2',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    margin: '0.5rem 0 0 0',
    fontWeight: '400',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Statistics Cards
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
    className: 'stats-responsive',
  },
  statCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  statIcon: {
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '10px',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Controls Section
  controlsSection: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '1.5rem 2rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: '2rem',
    className: 'controls-responsive',
  },
  searchContainer: {
    position: 'relative',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    background: 'white',
  },

  // Form Container
  formContainer: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: '2rem',
  },
  formHeader: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: 0,
    color: '#1f2937',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    className: 'form-responsive',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    background: 'white',
  },
  fileInputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    background: 'rgba(249, 250, 251, 0.5)',
  },
  fileInput: {
    display: 'none',
  },
  fileInputText: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  formActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    paddingTop: '1rem',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cancelButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Grid Container
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
    className: 'grid-responsive',
  },

  // Loading States
  loadingContainer: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #febe52',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '1rem',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '1rem',
    margin: 0,
  },

  // Room Cards
  roomCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    animation: 'fadeIn 0.5s ease-out',
  },
  roomImageContainer: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden',
  },
  roomImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  roomImagePlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomImageOverlay: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  quickEditButton: {
    background: 'rgba(255,255,255,0.9)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem',
    cursor: 'pointer',
    color: '#374151',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomContent: {
    padding: '1.5rem',
  },
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  roomName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    lineHeight: '1.3',
  },
  roomType: {
    background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
  },
  roomStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    gap: '1rem',
  },
  roomStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
  },
  roomPrice: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#10b981',
  },
  roomPriceLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  roomQuantity: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#febe52',
  },
  roomQuantityLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  roomMeta: {
    paddingTop: '1rem',
    borderTop: '1px solid #f3f4f6',
    marginBottom: '1rem',
  },
  roomMetaText: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  roomActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  editActionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteActionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Unified form styles
  unifiedInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '150px',
    flex: '1',
  },
  unifiedInput: {
    padding: '10px 14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  
  // Additional styles for room management
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
    background: '#fff',
  },
  th: {
    padding: '14px 12px',
    backgroundColor: '#f4f4f4',
    fontWeight: 600,
    fontSize: '0.95rem',
    textAlign: 'left',
  },
  td: {
    padding: '14px 12px',
    fontSize: '0.9rem',
    color: '#333',
    verticalAlign: 'middle',
  },
  tr: {
    transition: 'background 0.2s',
  },
  noData: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
  },
  image: {
    width: '60px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  editActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  editInput: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '0.9rem',
  },
  editNumberInput: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    width: '80px',
    fontSize: '0.9rem',
  },
  fileName: {
    marginLeft: '8px',
    fontSize: '0.85rem',
    color: '#555',
  },
};