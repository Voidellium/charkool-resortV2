'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
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
        setFirstName(data.guest.firstName || '');
        setMiddleName(data.guest.middleName || '');
        setLastName(data.guest.lastName || '');
        setBirthdate(data.guest.birthdate ? new Date(data.guest.birthdate).toISOString().split('T')[0] : '');
        setContactNumber(data.guest.contactNumber || '');
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
        body: JSON.stringify({ firstName, middleName, lastName, birthdate, contactNumber, email, preferences }),
      });

      if (res.ok) {
        setSuccess('Profile updated successfully');
        setUser({ ...user, firstName, middleName, lastName, birthdate, contactNumber, email, preferences });
      } else {
        const data = await res.json();
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError('Something went wrong');
    }
  };

  if (!user) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 1.5rem;
            color: #555;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <main className="main-content">
        <h1>User Profile</h1>
        <div className="profile-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">First Name:</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="middleName">Middle Name:</label>
              <input
                id="middleName"
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Last Name:</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="birthdate">Birthdate:</label>
              <input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contactNumber">Contact Number:</label>
              <input
                id="contactNumber"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                maxLength={11}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email:</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="preferences">Preferences:</label>
              <textarea
                id="preferences"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g., Non-smoking room, late checkout"
                className="form-textarea"
              />
            </div>
            <button type="submit" className="submit-button">
              Update Profile
            </button>
          </form>
          {error && <p className="message error">{error}</p>}
          {success && <p className="message success">{success}</p>}
        </div>
      </main>

      {/* Since you have an existing style block, we will keep it and simply remove the Header-related styles */}
      <style jsx>{`
        .profile-container {
          background-color: #f0f2f5;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .main-content {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          font-size: 2rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #ffc107;
          padding-bottom: 0.5rem;
        }
        .profile-card {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .form-label {
          font-size: 1rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 0.5rem;
        }
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          font-size: 1rem;
          transition: border-color 0.2s ease-in-out;
        }
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        .submit-button {
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 500;
          transition: background-color 0.2s ease-in-out;
          align-self: flex-start;
        }
        .submit-button:hover {
          background-color: #0056b3;
        }
        .message {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 5px;
          font-weight: 500;
        }
        .message.success {
          background-color: #d4edda;
          color: #155724;
        }
        .message.error {
          background-color: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
}