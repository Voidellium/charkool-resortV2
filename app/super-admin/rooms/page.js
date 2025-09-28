'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function SuperAdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: '',
    price: '',
    quantity: 1,
    image: null,
  });
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error fetching rooms: ${res.status}`);
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
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
  <h2 style={styles.header}>Room Management</h2>

        {/* Add Room Form with unified inputs */}
        <form onSubmit={handleAddRoom} style={styles.unifiedForm}>
          <div style={styles.unifiedInputGroup}>
            <label style={styles.label}>Room Name</label>
            <input
              type="text"
              placeholder="Room Name"
              value={newRoom.name}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              style={styles.unifiedInput}
            />
          </div>
          <div style={styles.unifiedInputGroup}>
            <label style={styles.label}>Type</label>
            <input
              type="text"
              placeholder="Standard, Deluxe..."
              value={newRoom.type}
              onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
              style={styles.unifiedInput}
            />
          </div>
          <div style={styles.unifiedInputGroup}>
            <label style={styles.label}>Price</label>
            <input
              type="number"
              placeholder="Price"
              value={newRoom.price}
              onChange={(e) => setNewRoom({ ...newRoom, price: Number(e.target.value) })}
              style={styles.unifiedInput}
            />
          </div>
          <div style={styles.unifiedInputGroup}>
            <label style={styles.label}>Quantity</label>
            <input
              type="number"
              placeholder="Quantity"
              value={newRoom.quantity}
              onChange={(e) => setNewRoom({ ...newRoom, quantity: Number(e.target.value) })}
              style={styles.unifiedInput}
            />
          </div>
          <div style={styles.unifiedInputGroup}>
            <label style={styles.label}>Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewRoom({ ...newRoom, image: e.target.files[0] })}
              style={styles.unifiedInput}
            />
            {newRoom.image && <span style={styles.fileName}>{newRoom.image.name}</span>}
          </div>
        </form>
        {/* Centered Add Room Button */}
        <div style={styles.addButtonContainer}>
          <button
            onClick={handleAddRoom}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '25px',
              backgroundColor: '#007bff',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s, transform 0.2s',
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#0069d9')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
            type="button"
          >
            Add Room
          </button>
        </div>
        {/* Rooms Table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Image</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <tr key={room.id} style={styles.tr}>
                    <td style={styles.td}>{room.id}</td>
                    <td>
                      {editingRoom?.id === room.id ? (
                        <input
                          style={styles.editInput}
                          value={editingRoom.name}
                          onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        />
                      ) : (
                        room.name
                      )}
                    </td>
                    <td>
                      {editingRoom?.id === room.id ? (
                        <input
                          style={styles.editInput}
                          value={editingRoom.type}
                          onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value })}
                        />
                      ) : (
                        room.type
                      )}
                    </td>
                    <td>
                      {editingRoom?.id === room.id ? (
                        <input
                          type="number"
                          style={styles.editInput}
                          value={editingRoom.price}
                          onChange={(e) => setEditingRoom({ ...editingRoom, price: Number(e.target.value) })}
                        />
                      ) : (
                        `₱${(room.price / 100).toFixed(2)}`
                      )}
                    </td>
                    <td>
                      {editingRoom?.id === room.id ? (
                        <input
                          type="number"
                          style={styles.editInput}
                          value={editingRoom.quantity}
                          onChange={(e) => setEditingRoom({ ...editingRoom, quantity: Number(e.target.value) })}
                        />
                      ) : (
                        room.quantity
                      )}
                    </td>
                    <td>
                      {room.image ? (
                        <img src={room.image} alt={room.name} style={styles.image} />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={styles.actions}>
                      {editingRoom?.id === room.id ? (
                        <div style={styles.editActions}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setEditingRoom({ ...editingRoom, image: e.target.files[0] })}
                            style={styles.fileInputInline}
                          />
                          <input
                            type="number"
                            style={styles.editNumberInput}
                            value={editingRoom.quantity}
                            onChange={(e) => setEditingRoom({ ...editingRoom, quantity: Number(e.target.value) })}
                          />
                          <div style={styles.buttonGroup}>
                              <button
                                onClick={() => handleUpdateRoom(room.id)}
                                style={{ ...buttonStyle, ...successBtn }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRoom(null)}
                                style={{ ...buttonStyle, ...dangerBtn }}
                              >
                                Cancel
                              </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingRoom({ ...room, price: room.price / 100, quantity: room.quantity })}
                            style={{ ...buttonStyle, ...warningBtn }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            style={{ ...buttonStyle, ...secondaryBtn }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={styles.noData}>No rooms found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

// ==================== Styles ====================
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#f0f2f5',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  },
  header: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '30px',
    textAlign: 'center',
    color: '#222',
  },
  // Unified form layout
  unifiedForm: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    alignItems: 'center',
    marginBottom: '40px',
  },
  // Each input group unified style
  unifiedInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '150px',
    flex: '1', // makes all inputs equal width
  },
  label: {
    marginBottom: '4px',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#333',
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
  // For the row layout (Price, Quantity, Image)
  rowContainer: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  // Style for inputs in the row for uniform height
  numberInput: {
    padding: '10px 14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '0.95rem',
    width: '100px',
    boxSizing: 'border-box',
  },
  fileInput: {
    padding: '8px',
  },
  fileName: {
    marginLeft: '8px',
    fontSize: '0.85rem',
    color: '#555',
  },
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
};