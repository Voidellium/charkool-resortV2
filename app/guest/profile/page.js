'use client';
import { useEffect, useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from "next/image";
export default function Profile() {
  const [profileImage, setProfileImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { user, setUser } = useUser();
  const { data: session, update: updateSession } = useSession();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contactError, setContactError] = useState('');
  const [birthdateError, setBirthdateError] = useState('');
  const router = useRouter();

    // Philippine mobile network prefixes
    const validPhilippinePrefixes = [
      // Smart Communications
      '0813', '0907', '0908', '0909', '0910', '0911', '0912', '0913', '0914', '0918', '0919', '0920', '0921', '0928', '0929', '0930', '0938', '0939', '0940', '0946', '0947', '0948', '0949', '0950', '0951', '0961', '0963', '0964', '0965', '0966', '0967', '0968', '0969', '0970', '0971', '0980', '0981', '0989', '0992', '0998', '0999',
      // Globe Telecom
      '0817', '0904', '0905', '0906', '0915', '0916', '0917', '0925', '0926', '0927', '0935', '0936', '0937', '0945', '0953', '0954', '0955', '0956', '0957', '0958', '0959', '0975', '0976', '0977', '0978', '0979', '0994', '0995', '0996', '0997',
      // Sun Cellular (now Dito)
      '0922', '0923', '0924', '0925', '0931', '0932', '0933', '0934', '0940', '0941', '0942', '0943',
      // Dito Telecommunity
      '0895', '0896', '0897', '0898',
      // TM (Touch Mobile - Smart)
      '0912', '0918', '0919', '0920', '0921', '0928', '0929', '0930', '0938', '0939', '0946', '0947', '0948', '0949', '0950',
      // TNT (Talk 'N Text - Smart)
      '0907', '0909', '0910', '0911', '0912', '0918', '0919', '0920', '0921', '0928', '0929', '0930', '0938', '0939', '0946', '0947', '0948', '0949', '0950',
      // Cherry Mobile
      '0997', '0998',
      // GOMO (Globe)
      '0915', '0916', '0917', '0926', '0927', '0935', '0936', '0937', '0945', '0955', '0956', '0965', '0966', '0967', '0975', '0976', '0977', '0994', '0995', '0996', '0997'
    ];

    function isValidPhilippineNumber(number) {
      // Number should be exactly 10 digits
      if (number.length !== 10) return false;
      
      // Check if the number starts with a valid Philippine prefix
      const prefix4 = '0' + number.substring(0, 3); // 4-digit prefix (e.g., 0917)
      return validPhilippinePrefixes.includes(prefix4);
    }

  const capitalizeFirst = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

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
        setBirthdate(
          data.guest.birthdate
            ? new Date(data.guest.birthdate).toISOString().split('T')[0]
            : ''
        );
        setContactNumber((data.guest.contactNumber || '').slice(-10));
        setEmail(data.guest.email);
        
        // Set profile image from database or fallback to localStorage
        if (data.guest.image) {
          setProfileImage(data.guest.image);
          localStorage.setItem('profileImage', data.guest.image);
        } else {
          const savedImage = localStorage.getItem('profileImage');
          if (savedImage) setProfileImage(savedImage);
        }
      } catch {
        router.push('/login');
      }
    }
    fetchUser();
    // eslint-disable-next-line
  }, [router, setUser]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/user/profile-picture', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.profilePicture) {
          setProfileImage(data.profilePicture);
          localStorage.setItem('profileImage', data.profilePicture);
          setSuccess('Profile picture updated successfully!');
          setShowModal(false);
          
          // Update UserContext immediately so navbar reflects the change
          setUser(prev => ({
            ...prev,
            image: data.profilePicture,
          }));
          
          // Update NextAuth session - this triggers JWT callback to refresh from database
          await updateSession();
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
            detail: { image: data.profilePicture } 
          }));
        } else {
          setError(data.error || 'Image upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setError('Image upload failed');
      }
    }
  };

  const handleFirstName = (e) => setFirstName(capitalizeFirst(e.target.value));
  const handleMiddleName = (e) => setMiddleName(capitalizeFirst(e.target.value));
  const handleLastName = (e) => setLastName(capitalizeFirst(e.target.value));
  const handleContactChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setContactNumber(digits);
    
    // Validate Philippine number as user types
    if (digits.length === 10) {
      if (!isValidPhilippineNumber(digits)) {
        setContactError('Invalid Philippine mobile number. Please use Smart, Globe, Sun, Dito, TM, or TNT numbers.');
      } else {
        setContactError('');
      }
    } else if (digits.length > 0) {
      setContactError('');
    }
  };

  const handleBirthdateChange = (e) => {
    const selectedDate = e.target.value;
    setBirthdate(selectedDate);
    
    // Calculate age
    const today = new Date();
    const birthDate = new Date(selectedDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Validate age (must be at least 16 years old)
    if (age < 16) {
      setBirthdateError('You must be at least 16 years old to register.');
    } else {
      setBirthdateError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
      // Validate contact number before submission
      if (contactNumber && !isValidPhilippineNumber(contactNumber)) {
        setError('Please enter a valid Philippine mobile number (Smart, Globe, Sun, Dito, TM, or TNT).');
        return;
      }

      // Validate age before submission
      if (birthdate) {
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 16) {
          setError('You must be at least 16 years old to update your profile.');
          return;
        }
      }

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
          email: email, // Email remains unchanged
          image: profileImage || '',
        }),
      });
      if (res.ok) {
        const responseData = await res.json();
        setSuccess('Profile updated successfully');
        
        // Update global user context for instant UI update
        const updatedUserData = {
          ...user,
          firstName,
          middleName,
          lastName,
          birthdate,
          contactNumber,
          email: email,
          image: profileImage,
          name: responseData.name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
        };
        
        setUser(updatedUserData);
        
        // Dispatch custom event to notify GuestHeader about the profile update
        window.dispatchEvent(new CustomEvent('profileDataUpdated', { 
          detail: { 
            user: updatedUserData,
            name: responseData.name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
            email: email,
            firstName,
            middleName,
            lastName,
            contactNumber,
            birthdate,
            image: profileImage
          } 
        }));
        
        // Update NextAuth session - this triggers JWT callback to refresh from database
        await updateSession();
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
    <>
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-image">
              <img
                src={profileImage || "/default-avatar.png"}
                alt="Profile"
                className="avatar"
                style={{ objectFit: 'cover' }}
                onLoad={() => setShowModal(false)}
              />
              <button className="change-btn" onClick={() => setShowModal(true)}>
                Change
              </button>
            </div>
            <h1 className="profile-title">Your Profile</h1>
          </div>

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
              <label htmlFor="birthdate">Birthdate (Must be 16 years or older)</label>
              <input 
                id="birthdate" 
                type="date" 
                value={birthdate} 
                onChange={handleBirthdateChange}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                required 
              />
              {birthdateError && <p className="validation-error">{birthdateError}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="contactNumber">Contact Number</label>
              <div className="contact-input">
                <span className="prefix">+63</span>
                <input id="contactNumber" type="tel" value={contactNumber} onChange={handleContactChange} placeholder="10 digits" required />
              </div>
              {contactError && <p className="validation-error">{contactError}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email (Cannot be changed)</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                disabled
                className="disabled-input"
              />
            </div>
            <button 
              type="submit" 
              className="submit-button"
              disabled={!!contactError || !!birthdateError}
            >
              Update Profile
            </button>
          </form>
          {error && <p className="message error">{error}</p>}
          {success && <p className="message success">{success}</p>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Select Profile Image</h2>
            <div className="choice-buttons">
              <label className="choice-btn upload-label">
                Upload Your Image
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              </label>
            </div>
            <button className="close-btn" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}
      <style jsx>{`
  :global(html, body, #__next) {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
  }
  :global(*), :global(*::before), :global(*::after) {
          box-sizing: border-box;
        }
  .profile-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #fef3c7, #e0f2fe, #dbeafe);
        }
   .profile-card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          padding: 2.5rem;
          max-width: 700px;
          width: 90%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
  .profile-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
        }
  .profile-image {
          position: relative;
          width: 130px;
          height: 130px;
          margin-bottom: 1rem;
        }
  .avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #fbbf24;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .change-btn {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #f59e0b;
          color: white;
          font-size: 0.8rem;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          box-shadow: 0 3px 8px rgba(0,0,0,0.2);
        }
        .change-btn:hover { background: #d97706; }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          padding: 1rem;
          animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(8px);
          }
        }

        .modal {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal h2 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          background: linear-gradient(135deg, #febe54, #f5a623);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .choice-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .choice-btn {
          background: linear-gradient(135deg, #f97316 0%, #facc15 40%, #fb923c 100%);
          color: white;
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
          position: relative;
          overflow: hidden;
        }

        .choice-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0));
          transform: translateX(-100%);
          transition: transform 0.45s ease;
        }

        .choice-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
        }

        .choice-btn:hover::after {
          transform: translateX(0);
        }

        .upload-label { 
          cursor: pointer; 
          text-align: center; 
          display: block;
        }
        .close-btn {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          margin-top: 1rem;
        }

        .close-btn:hover {
          background: rgba(107, 114, 128, 0.2);
          color: #374151;
          transform: translateY(-1px);
        }
  .image-options {
    position: absolute;
    bottom: -30px;
    width: 100%;
    display: flex;
    justify-content: space-around;
  }
  .upload-btn, .icon-btn {
    background: #fbbf24;
    color: white;
    font-size: 0.8rem;
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s ease;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
    border: none;
  }
  .upload-btn:hover, .icon-btn:hover {
    background: #d97706;
  }
  .profile-title {
    font-size: 1.9rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 1rem;
    margin-top: 1rem;
  }
  .profile-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
  }
  .otp-section {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    padding: 1.25rem;
    border-radius: 12px;
    border: 2px solid #fbbf24;
    animation: slideDown 0.3s ease-out;
  }
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .otp-notice {
    color: #92400e;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.6);
    padding: 0.5rem;
    border-radius: 6px;
  }
  .validation-error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.375rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .validation-error::before {
    content: '⚠';
    font-size: 1rem;
  }
  label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.3rem;
  }
  input {
    padding: 0.8rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.2s ease;
    width: 100%;
    background: #fff;
  }
  input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    outline: none;
  }
  .disabled-input {
    background: #f3f4f6 !important;
    color: #6b7280 !important;
    cursor: not-allowed !important;
    opacity: 0.7;
  }
  .disabled-input:focus {
    border-color: #d1d5db !important;
    box-shadow: none !important;
  }
  .contact-input {
    display: flex;
    align-items: center;
  }
  .contact-input .prefix {
    padding: 0.8rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-right: none;
    border-radius: 10px 0 0 10px;
    color: #374151;
    font-size: 1rem;
  }
  .contact-input input {
    flex: 1;
    border-radius: 0 10px 10px 0;
    border-left: none;
  }
  .submit-button {
    margin-top: 1rem;
    padding: 0.8rem;
    background: #f59e0b;
    color: #fff;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease;
    width: 100%;
    max-width: 320px;
    align-self: center;
  }
  .submit-button:hover:not(:disabled) {
    background: #d97706;
  }
  .submit-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
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
  @media (max-width: 980px) {
    .profile-card {
      padding: 2rem;
      width: 94%;
      margin: 1.5rem auto;
    }
  }
  @media (max-width: 640px) {
    .profile-card {
      padding: 1.5rem;
      width: 95%;
      margin: 1.25rem auto;
      border-radius: 14px;
    }
    .profile-title {
      font-size: 1.5rem;
    }
    .profile-image {
      width: 110px;
      height: 110px;
    }
    .upload-btn, .icon-btn {
      font-size: 0.75rem;
      padding: 0.3rem 0.5rem;
    }
  }
`}</style>
    </>
  );
}
