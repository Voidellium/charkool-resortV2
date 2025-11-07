"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, X, Check, AlertCircle } from 'lucide-react';
import BookingCalendar from './BookingCalendar';
import { useToast } from './Toast';
import styles from './DateToggleManager.module.css';

/**
 * DateToggleManager Component
 * 
 * A reusable component for managing disabled/enabled dates in the booking calendar.
 * Can be used anywhere in the application where date availability management is needed.
 * 
 * Props:
 * - onClose: callback when modal is closed
 * - onDateToggled: callback when a date is successfully toggled (optional)
 * - initialDate: pre-selected date to toggle (optional)
 */
export default function DateToggleManager({ onClose, onDateToggled, initialDate }) {
  const [selectedDate, setSelectedDate] = useState(initialDate || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disabledDates, setDisabledDates] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [action, setAction] = useState('disable'); // 'disable' or 'enable'
  const { showToast } = useToast();

  // Fetch disabled dates on mount
  useEffect(() => {
    fetchDisabledDates();
  }, []);

  async function fetchDisabledDates() {
    try {
      const res = await fetch('/api/super-admin/disabled-dates');
      if (!res.ok) throw new Error('Failed to fetch disabled dates');
      const data = await res.json();
      setDisabledDates(data);

      // Convert to availability map for calendar
      const availMap = {};
      data.forEach(item => {
        const dateStr = item.date.split('T')[0];
        availMap[dateStr] = false; // false = disabled/unavailable
      });
      setAvailabilityData(availMap);
    } catch (error) {
      console.error('Error fetching disabled dates:', error);
      showToast('Failed to load disabled dates', 'error');
    }
  }

  function handleCalendarDateChange({ checkInDate }) {
    // Only use check-in date for toggling
    setSelectedDate(checkInDate);
    
    // Determine if date is currently disabled
    if (checkInDate) {
      const dateStr = formatDate(checkInDate);
      const isDisabled = availabilityData[dateStr] === false;
      setAction(isDisabled ? 'enable' : 'disable');
    }
  }

  function formatDate(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  async function handleSubmit() {
    if (!selectedDate) {
      showToast('Please select a date', 'error');
      return;
    }

    const dateStr = formatDate(selectedDate);
    const isCurrentlyDisabled = availabilityData[dateStr] === false;

    setIsSubmitting(true);

    try {
      if (isCurrentlyDisabled) {
        // Enable the date (remove from disabled dates)
        const disabledDateRecord = disabledDates.find(d => d.date.split('T')[0] === dateStr);
        if (!disabledDateRecord) {
          throw new Error('Disabled date record not found');
        }

        const res = await fetch(`/api/super-admin/disabled-dates/${disabledDateRecord.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to enable date');
        
        showToast(`Date ${dateStr} has been enabled for bookings`, 'success');
      } else {
        // Disable the date (add to disabled dates)
        const res = await fetch('/api/super-admin/disabled-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates: [dateStr] }),
        });

        if (!res.ok) throw new Error('Failed to disable date');
        
        showToast(`Date ${dateStr} has been disabled from bookings`, 'success');
      }

      // Refresh disabled dates
      await fetchDisabledDates();
      
      // Callback to parent
      if (onDateToggled) {
        onDateToggled(dateStr, !isCurrentlyDisabled);
      }

      // Reset selection
      setSelectedDate(null);
      
    } catch (error) {
      console.error('Error toggling date:', error);
      showToast(error.message || 'Failed to update date availability', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDateDisabled = selectedDate ? availabilityData[formatDate(selectedDate)] === false : false;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Calendar size={24} color="#2563eb" />
            <h2 className={styles.title}>Manage Date Availability</h2>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className={styles.infoBanner}>
          <AlertCircle size={16} />
          <p>Select a date from the calendar to enable or disable it for bookings</p>
        </div>

        {/* Calendar Section */}
        <div className={styles.calendarSection}>
          <BookingCalendar 
            availabilityData={availabilityData}
            onDateChange={handleCalendarDateChange}
          />
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className={styles.selectedDateInfo}>
            <div className={styles.dateCard}>
              <div className={styles.dateLabel}>Selected Date:</div>
              <div className={styles.dateValue}>{formatDisplayDate(selectedDate)}</div>
              <div className={styles.statusBadge} data-disabled={isDateDisabled}>
                {isDateDisabled ? (
                  <>
                    <X size={14} />
                    <span>Currently Disabled</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Currently Available</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!selectedDate || isSubmitting}
            data-action={action}
          >
            {isSubmitting ? (
              <span>Processing...</span>
            ) : isDateDisabled ? (
              <>
                <Check size={18} />
                <span>Enable Date</span>
              </>
            ) : (
              <>
                <X size={18} />
                <span>Disable Date</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
