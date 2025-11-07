/**
 * EXAMPLE USAGE: DateToggleManager Component
 * 
 * This file demonstrates how to use the DateToggleManager component
 * in various parts of your application.
 */

// ========================================
// Example 1: Using in a Page Component
// ========================================

"use client";
import { useState } from 'react';
import DateToggleManager from '@/components/DateToggleManager';
import { Calendar } from 'lucide-react';

export default function ExamplePage() {
  const [showDateManager, setShowDateManager] = useState(false);

  function handleDateToggled(dateStr, isNowDisabled) {
    console.log(`Date ${dateStr} is now ${isNowDisabled ? 'disabled' : 'enabled'}`);
    // Optionally refresh your data or update state
  }

  return (
    <div>
      <h1>Booking Management</h1>
      
      {/* Trigger Button */}
      <button onClick={() => setShowDateManager(true)}>
        <Calendar size={18} />
        <span>Manage Date Availability</span>
      </button>

      {/* Date Toggle Manager Modal */}
      {showDateManager && (
        <DateToggleManager
          onClose={() => setShowDateManager(false)}
          onDateToggled={handleDateToggled}
        />
      )}
    </div>
  );
}


// ========================================
// Example 2: Using with Initial Date
// ========================================

"use client";
import { useState } from 'react';
import DateToggleManager from '@/components/DateToggleManager';

export default function BookingCalendarPage() {
  const [showDateManager, setShowDateManager] = useState(false);
  const [selectedInitialDate, setSelectedInitialDate] = useState(null);

  function openDateManagerWithDate(date) {
    setSelectedInitialDate(date);
    setShowDateManager(true);
  }

  return (
    <div>
      {/* Your booking calendar or date picker */}
      <button onClick={() => openDateManagerWithDate(new Date('2025-12-25'))}>
        Manage Dec 25, 2025
      </button>

      {/* Date Toggle Manager with initial date */}
      {showDateManager && (
        <DateToggleManager
          onClose={() => {
            setShowDateManager(false);
            setSelectedInitialDate(null);
          }}
          initialDate={selectedInitialDate}
          onDateToggled={(dateStr, isDisabled) => {
            console.log(`${dateStr} toggled to ${isDisabled ? 'disabled' : 'enabled'}`);
          }}
        />
      )}
    </div>
  );
}


// ========================================
// Example 3: Integration in Super Admin Layout
// ========================================

"use client";
import { useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import DateToggleManager from '@/components/DateToggleManager';
import { Calendar } from 'lucide-react';

export default function SuperAdminDashboard({ user }) {
  const [showDateManager, setShowDateManager] = useState(false);

  return (
    <SuperAdminLayout activePage="dashboard" user={user}>
      <div className="dashboard-content">
        <h1>Dashboard</h1>
        
        <div className="quick-actions">
          <button 
            className="action-card"
            onClick={() => setShowDateManager(true)}
          >
            <Calendar size={24} />
            <span>Toggle Date Availability</span>
          </button>
        </div>

        {/* Date Manager Modal */}
        {showDateManager && (
          <DateToggleManager
            onClose={() => setShowDateManager(false)}
            onDateToggled={(date, isDisabled) => {
              // Optionally show notification or refresh dashboard stats
              console.log(`Date ${date} availability changed`);
            }}
          />
        )}
      </div>
    </SuperAdminLayout>
  );
}


// ========================================
// Example 4: Add to Date Customization Page
// ========================================

// In app/super-admin/configurations/datecustomization/page.js
// Add this button to your existing page:

/*
<div style={{ marginTop: '20px' }}>
  <button
    onClick={() => setShowQuickToggle(true)}
    style={{
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}
  >
    <Calendar size={18} />
    <span>Quick Date Toggle</span>
  </button>
</div>

{showQuickToggle && (
  <DateToggleManager
    onClose={() => setShowQuickToggle(false)}
    onDateToggled={() => {
      // Refresh your disabled dates list
      fetchDisabledDates();
    }}
  />
)}
*/


// ========================================
// Example 5: Programmatic Usage
// ========================================

"use client";
import { useState } from 'react';
import DateToggleManager from '@/components/DateToggleManager';

export default function ProgrammaticExample() {
  const [managerState, setManagerState] = useState({
    show: false,
    initialDate: null
  });

  // Function to open manager with specific date
  function toggleDateAvailability(dateString) {
    const date = new Date(dateString);
    setManagerState({
      show: true,
      initialDate: date
    });
  }

  // Function to close manager
  function closeManager() {
    setManagerState({
      show: false,
      initialDate: null
    });
  }

  return (
    <div>
      <h1>Date Management</h1>
      
      {/* Example: Toggle specific dates programmatically */}
      <button onClick={() => toggleDateAvailability('2025-12-24')}>
        Toggle Christmas Eve
      </button>
      <button onClick={() => toggleDateAvailability('2025-12-25')}>
        Toggle Christmas Day
      </button>
      <button onClick={() => toggleDateAvailability('2025-12-31')}>
        Toggle New Year's Eve
      </button>

      {/* Date Manager */}
      {managerState.show && (
        <DateToggleManager
          onClose={closeManager}
          initialDate={managerState.initialDate}
          onDateToggled={(dateStr, isDisabled) => {
            console.log(`Date ${dateStr} is now ${isDisabled ? 'disabled' : 'enabled'}`);
            closeManager();
          }}
        />
      )}
    </div>
  );
}
