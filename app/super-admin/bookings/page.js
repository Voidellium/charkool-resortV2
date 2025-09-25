'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import GuestHeader from '../../../components/GuestHeader';

export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    birthdate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/guest/profile');
    }

    if (status === 'authenticated') {
      const fetchGuestData = async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/guest/me');
          if (!res.ok) {
            throw new Error('Failed to fetch profile data.');
          }
          const data = await res.json();
          const { guest } = data;

          // Pre-fill form with fetched data
          setFormData({
            firstName: guest.firstName || '',
            lastName: guest.lastName || '',
            email: guest.email || '',
            contactNumber: guest.contactNumber || '',
            // Format date for the input field (yyyy-MM-dd)
            birthdate: guest.birthdate ? new Date(guest.birthdate).toISOString().split('T')[0] : '',
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchGuestData();
    }
  }, [status, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/guest/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile.');
      }

      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="loading-container">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <GuestHeader />
      <div className="profile-container">
        <div className="profile-card">
          <h2>Edit Your Profile</h2>
          <p>Keep your personal details up to date.</p>

          {error && <div className="message error-message">{error}</div>}
          {success && <div className="message success-message">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required disabled />
              <small>Email cannot be changed.</small>
            </div>
            <div className="form-group">
              <label htmlFor="contactNumber">Contact Number</label>
              <input type="tel" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="birthdate">Birthdate</label>
              <input type="date" id="birthdate" name="birthdate" value={formData.birthdate} onChange={handleChange} />
            </div>
            <button type="submit" className="submit-btn">Save Changes</button>
          </form>
        </div>
      </div>
      <style jsx>{`
        .profile-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2rem;
          background-color: #f0f2f5;
          min-height: calc(100vh - 70px); /* Adjust based on header height */
        }
        .profile-card {
          background: #fff;
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 600px;
        }
        h2 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }
        .profile-card p {
          color: #666;
          margin-bottom: 2rem;
        }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #444; }
        input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 1rem;
        }
        input:disabled { background-color: #f0f0f0; cursor: not-allowed; }
        small { font-size: 0.8rem; color: #888; margin-top: 4px; }
        .submit-btn {
          width: 100%;
          padding: 0.8rem;
          background-color: #5c6ac4;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .submit-btn:hover { background-color: #4a55a1; }
        .message { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
        .error-message { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .success-message { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .loading-container { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 1.5rem; }
      `}</style>
    </>
  );
}