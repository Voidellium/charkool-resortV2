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
        setFirstName(capitalizeFirst(data.guest.firstName || ''));
        setMiddleName(capitalizeFirst(data.guest.middleName || ''));
        setLastName(capitalizeFirst(data.guest.lastName || ''));
        setBirthdate(data.guest.birthdate ? new Date(data.guest.birthdate).toISOString().split('T')[0] : '');
        setContactNumber((data.guest.contactNumber || '').slice(-10));
        setEmail(data.guest.email);
      } catch (err) {
        router.push('/login');
      }
    }
    fetchUser();
  }, [router]);

  const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleFirstName = (e) => setFirstName(capitalizeFirst(e.target.value));
  const handleMiddleName = (e) => setMiddleName(capitalizeFirst(e.target.value));
  const handleLastName = (e) => setLastName(capitalizeFirst(e.target.value));

  const handleContactChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setContactNumber(digits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          birthdate,
          contactNumber: '+63' + contactNumber,
          email
        }),
      });
      if (res.ok) {
        setSuccess('Profile updated successfully');
        setUser({ ...user, firstName, middleName, lastName, birthdate, contactNumber, email });
      } else {
        const data = await res.json();
        setError(data.error || 'Update failed');
      }
    } catch {
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
    <div className="profile-wrapper">
      <div className="profile-card">
        <h1 className="profile-title">Your Profile</h1>
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" type="text" value={firstName} onChange={handleFirstName} required />
          </div>
          <div className="form-group">
            <label htmlFor="middleName">Middle Name</label>
            <input id="middleName" type="text" value={middleName} onChange={handleMiddleName} />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" type="text" value={lastName} onChange={handleLastName} required />
          </div>
          <div className="form-group">
            <label htmlFor="birthdate">Birthdate</label>
            <input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="contactNumber">Contact Number</label>
            <div className="contact-input">
              <span className="prefix">+63</span>
              <input
                id="contactNumber"
                type="tel"
                value={contactNumber}
                onChange={handleContactChange}
                placeholder="10 digits"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="submit-button">Update Profile</button>
        </form>
        {error && <p className="message error">{error}</p>}
        {success && <p className="message success">{success}</p>}
      </div>

      <style jsx>{`
        .profile-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          background: linear-gradient(135deg, #fde68a, #fef3c7, #dbeafe);
          padding: 1rem;
        }
        .profile-card {
          background: #fff;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          margin-left: 2rem;
        }
        .profile-title {
          text-align: center;
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #111827;
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        input {
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        .contact-input {
          display: flex;
          align-items: center;
        }
        .contact-input .prefix {
          padding: 0.75rem 0.5rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-right: none;
          border-radius: 8px 0 0 8px;
          font-size: 1rem;
          color: #374151;
        }
        .contact-input input {
          flex: 1;
          border-radius: 0 8px 8px 0;
        }
        input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.2);
          outline: none;
        }
        .submit-button {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f59e0b;
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .submit-button:hover {
          background: #d97706;
        }
        .message {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
          font-weight: 500;
        }
        .message.error {
          background: #fee2e2;
          color: #991b1b;
        }
        .message.success {
          background: #d1fae5;
          color: #065f46;
        }
        @media (max-width: 640px) {
          .profile-card {
            padding: 1.5rem;
          }
          .profile-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
