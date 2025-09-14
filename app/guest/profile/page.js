'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/guest/me');
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        setUser(data.guest);
        setName(data.guest.name);
        setEmail(data.guest.email);
        setPreferences(data.guest.preferences || '');
      } catch (err) {
        console.error(err);
        router.push('/login');
      }
    }
    fetchUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, preferences }),
      });

      if (res.ok) {
        setSuccess('Profile updated successfully');
        setUser({ ...user, name, email, preferences });
      } else {
        const data = await res.json();
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError('Something went wrong');
    }
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>User Profile</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Preferences:</label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="e.g., Non-smoking room, late checkout"
            style={{ width: '100%', padding: '8px', marginTop: '5px', height: '100px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          Update Profile
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
}
