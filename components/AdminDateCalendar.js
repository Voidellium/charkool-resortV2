"use client";
import React, { useState } from 'react';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Utility to get days in month
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Utility to get first day of month (0=Sun, 1=Mon,...)
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Format date to yyyy-mm-dd string using UTC
function formatDate(date) {
  // Timezone-safe date formatting using UTC
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminDateCalendar({ disabledDates = [], onDateSelect }) {
  // disabledDates: array of date strings ['yyyy-mm-dd']
  // onDateSelect: callback with selected date

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // Generate calendar grid days with states
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Build array of date objects for calendar grid (including leading empty days)
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null); // empty cells before first day
  }
  for (let day = 1; day <= daysInMonth; day++) {
    // Create date using UTC to avoid timezone issues completely
    const date = new Date(Date.UTC(currentYear, currentMonth, day, 0, 0, 0));
    calendarDays.push(date);
  }

  // Handle date click logic
  function handleDateClick(date) {
    if (!date) return;
    
    setSelectedDate(date);
    onDateSelect && onDateSelect(date);
  }

  // Check if date is disabled
  function isDisabled(date) {
    if (!date) return false;
    const dateStr = formatDate(date);
    return disabledDates.includes(dateStr);
  }

  // Check if date is selected
  function isSelected(date) {
    if (!date || !selectedDate) return false;
    return formatDate(date) === formatDate(selectedDate);
  }

  // Navigation handlers
  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      {/* Header with month/year navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        background: 'linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%)',
        borderRadius: '12px 12px 0 0',
        color: 'white'
      }}>
        <button
          onClick={prevMonth}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          ‹
        </button>

        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: '600'
        }}>
          {monthNames[currentMonth]} {currentYear}
        </h3>

        <button
          onClick={nextMonth}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          ›
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        padding: '1rem',
        background: 'white'
      }}>
        {/* Day headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.25rem',
          marginBottom: '0.5rem'
        }}>
          {WEEK_DAYS.map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#64748b',
                padding: '0.5rem 0'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.25rem'
        }}>
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} />;
            }

            const disabled = isDisabled(date);
            const selected = isSelected(date);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                style={{
                  padding: '0.75rem',
                  border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: disabled 
                    ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                    : selected
                    ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                    : 'white',
                  color: disabled ? '#dc2626' : selected ? '#1e40af' : '#1e293b',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: selected ? '600' : '500',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!disabled && !selected) {
                    e.target.style.background = '#f8fafc';
                    e.target.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled && !selected) {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              border: '2px solid #2563eb'
            }} />
            <span style={{ color: '#64748b' }}>Selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
            }} />
            <span style={{ color: '#64748b' }}>Disabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
