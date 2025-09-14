'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function SuperAdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: '',
    price: 0,
    quantity: 1,
    image: null,
  });
  const [editingRoom, setEditingRoom] = useState(null);

  // --- Fetch Rooms ---
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

  // --- Add Room ---
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
      formData.append('price', newRoom.price);
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

  // --- Update Room ---
  const handleUpdateRoom = async (id) => {
    if (!editingRoom.name || !editingRoom.type) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editingRoom.name);
      formData.append('type', editingRoom.type);
      formData.append('price', editingRoom.price);
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

  // --- Delete Room ---
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

  return (
    <SuperAdminLayout activePage="rooms">
      <div style={{ padding: '30px', background: '#f9f9f9', minHeight: '100vh' }}>
        <h2 style={{ marginBottom: '20px' }}>🏨 Room Management</h2>

        {/* Add Room Form */}
        <form
          onSubmit={handleAddRoom}
          style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <input
            type="text"
            placeholder="Room Name"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            style={{ padding: '8px', flex: '1 1 150px' }}
          />
          <input
            type="text"
            placeholder="Type (Standard, Deluxe, Suite)"
            value={newRoom.type}
            onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
            style={{ padding: '8px', flex: '1 1 150px' }}
          />
          <input
            type="number"
            placeholder="Price"
            value={newRoom.price}
            onChange={(e) => setNewRoom({ ...newRoom, price: Number(e.target.value) })}
            style={{ padding: '8px', flex: '1 1 100px' }}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newRoom.quantity}
            onChange={(e) => setNewRoom({ ...newRoom, quantity: Number(e.target.value) })}
            style={{ padding: '8px', flex: '1 1 80px' }}
          />
          <input type="file" accept="image/*" onChange={(e) => setNewRoom({ ...newRoom, image: e.target.files[0] })} />
          <button type="submit" style={{ padding: '8px 12px', cursor: 'pointer' }}>➕ Add Room</button>
        </form>

        {/* Rooms Table */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <thead style={{ background: '#f4f4f4' }}>
            <tr>
              <th style={{ padding: '12px 10px' }}>ID</th>
              <th style={{ padding: '12px 10px' }}>Name</th>
              <th style={{ padding: '12px 10px' }}>Type</th>
              <th style={{ padding: '12px 10px' }}>Price</th>
              <th style={{ padding: '12px 10px' }}>Quantity</th>
              <th style={{ padding: '12px 10px' }}>Image</th>
              <th style={{ padding: '12px 10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length > 0 ? rooms.map((room) => (
              <tr key={room.id}>
                <td style={{ padding: '10px' }}>{room.id}</td>
                <td>
                  {editingRoom?.id === room.id ? (
                    <input value={editingRoom.name} onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })} style={{ padding: '6px', width: '100%' }} />
                  ) : room.name}
                </td>
                <td>
                  {editingRoom?.id === room.id ? (
                    <input value={editingRoom.type} onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value })} style={{ padding: '6px', width: '100%' }} />
                  ) : room.type}
                </td>
                <td>
                  {editingRoom?.id === room.id ? (
                    <input type="number" value={editingRoom.price} onChange={(e) => setEditingRoom({ ...editingRoom, price: Number(e.target.value) })} style={{ padding: '6px', width: '100px' }} />
                  ) : `₱${room.price}`}
                </td>
                <td>
                  {editingRoom?.id === room.id ? (
                    <input type="number" value={editingRoom.quantity} onChange={(e) => setEditingRoom({ ...editingRoom, quantity: Number(e.target.value) })} style={{ padding: '6px', width: '80px' }} />
                  ) : room.quantity}
                </td>
                <td>{room.image ? <img src={room.image} alt={room.name} style={{ width: '60px', height: '40px', objectFit: 'cover' }} /> : '-'}</td>
                <td style={{ display: 'flex', gap: '5px' }}>
                  {editingRoom?.id === room.id ? (
                    <>
                      <input type="file" accept="image/*" onChange={(e) => setEditingRoom({ ...editingRoom, image: e.target.files[0] })} />
                      <button onClick={() => handleUpdateRoom(room.id)}>💾 Save</button>
                      <button onClick={() => setEditingRoom(null)}>❌ Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingRoom(room)}>✏️ Edit</button>
                      <button onClick={() => handleDeleteRoom(room.id)}>🗑️ Delete</button>
                    </>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No rooms found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SuperAdminLayout>
  );
}
