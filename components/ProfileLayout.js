'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // ✅ Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      // TODO: add session clear/auth logout logic here
      router.push('/login');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar button */}
      <button 
        onClick={() => setOpen(!open)} 
        className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border hover:ring-2 hover:ring-blue-400"
      >
        <img 
          src={user?.picture || "/default-avatar.png"} 
          alt="User Avatar" 
          className="w-full h-full object-cover"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border z-50">
          <button 
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => alert("Change Picture clicked")}
          >
            Change Picture
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => router.push('/welcome')}
          >
            Switch Account
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
