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

// Format date to yyyy-mm-dd string
function formatDate(date) {
  // Timezone-safe date formatting
  if (!date) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getCalendarDays(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const calendarDays = [];

  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  return calendarDays;
}

export default function BookingCalendar({ availabilityData, onDateChange, disabledDates = [], maxBookingMonths = 2, minLeadDays = 1 }) {
  // availabilityData: { 'yyyy-mm-dd': boolean } true=available, false=not available
  // onDateChange: callback with { checkInDate, checkOutDate }
  // disabledDates: array of date strings ['yyyy-mm-dd'] - dates disabled by super admin
  // maxBookingMonths: number of months ahead that can be booked (default 2)

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Minimum selectable date is configurable: default keeps website behavior (tomorrow).
  const minimumSelectableDate = new Date(today);
  minimumSelectableDate.setDate(minimumSelectableDate.getDate() + Number(minLeadDays || 0));
  minimumSelectableDate.setHours(0, 0, 0, 0);

  // Maximum allowed booking date
  const maxAllowedDate = new Date(today);
  maxAllowedDate.setMonth(maxAllowedDate.getMonth() + maxBookingMonths);
  maxAllowedDate.setHours(0, 0, 0, 0);

  const minViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxFirstViewDate = new Date(maxAllowedDate.getFullYear(), maxAllowedDate.getMonth(), 1);
  maxFirstViewDate.setMonth(maxFirstViewDate.getMonth() - 1);
  if (maxFirstViewDate < minViewDate) {
    maxFirstViewDate.setTime(minViewDate.getTime());
  }

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);

  const firstMonthDate = viewDate;
  const secondMonthDate = addMonths(viewDate, 1);

  // Handle date click logic
  function handleDateClick(date) {
    if (!date) return;
    const dateStr = formatDate(date);

    // Disable dates before the minimum selectable date.
    if (date < minimumSelectableDate) return;

    // Check if date exceeds max booking window
    if (date > maxAllowedDate) return;

    // Check if date is disabled by super admin
    if (disabledDates.includes(dateStr)) return;

    if (availabilityData && availabilityData[dateStr] === false) return; // not available

    if (!checkInDate || (checkInDate && checkOutDate)) {
      // Start new selection
      setCheckInDate(date);
      setCheckOutDate(null);
      onDateChange && onDateChange({ checkInDate: date, checkOutDate: null });
    } else if (checkInDate && !checkOutDate) {
      if (date <= checkInDate) {
        // Reset check-in if clicked before or same day
        setCheckInDate(date);
        onDateChange && onDateChange({ checkInDate: date, checkOutDate: null });
      } else {
        // Set check-out date
        setCheckOutDate(date);
        onDateChange && onDateChange({ checkInDate, checkOutDate: date });
      }
    }
  }

  // Check if a date is in the stay period (between check-in and check-out)
  function isInStayPeriod(date) {
    if (!checkInDate || !checkOutDate) return false;
    return date > checkInDate && date < checkOutDate;
  }

  // Navigation handlers
  function prevMonth() {
    const prev = addMonths(viewDate, -1);
    if (prev >= minViewDate) {
      setViewDate(prev);
    }
  }

  function nextMonth() {
    const next = addMonths(viewDate, 1);
    if (next <= maxFirstViewDate) {
      setViewDate(next);
    }
  }

  const canGoPrev = viewDate > minViewDate;
  const canGoNext = viewDate < maxFirstViewDate;

  // Legend colors - updated to unique palette
  const legendColors = {
    available: '#d0f0c0',      // light green
    checkIn: '#4a90e2',        // blue
    checkOut: '#e94e77',       // pinkish-red
    stayPeriod: '#f5a623',     // yellow (kept for contrast)
    notAvailable: '#b0b0b0',  // medium gray
    invalid: '#f0e68c',        // khaki
  };

  function getDayClass(dateStr, date) {
    const isDisabledByAdmin = disabledDates.includes(dateStr);
    const isBeyondMaxBooking = date > maxAllowedDate;
    const isAvailable = availabilityData ? (Object.prototype.hasOwnProperty.call(availabilityData, dateStr) ? availabilityData[dateStr] : true) : true;
    const isCheckIn = checkInDate && formatDate(checkInDate) === dateStr;
    const isCheckOut = checkOutDate && formatDate(checkOutDate) === dateStr;
    const inStay = isInStayPeriod(date);

    let className = 'day';
    if (date < minimumSelectableDate) className += ' not-available';
    else if (isBeyondMaxBooking) className += ' not-available';
    else if (isDisabledByAdmin) className += ' invalid';
    else if (!isAvailable) className += ' not-available';
    else if (isCheckIn) className += ' check-in';
    else if (isCheckOut) className += ' check-out';
    else if (inStay) className += ' stay-period';
    else className += ' available';

    return className;
  }

  function getDayInlineStyle(dayClassName) {
    const style = {
      minHeight: '34px',
      width: '100%',
      aspectRatio: '1 / 1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontSize: '0.9rem',
      transition: 'transform 0.15s ease, background-color 0.2s ease',
      border: '1px solid transparent',
      color: '#334155',
      backgroundColor: '#fff',
      cursor: 'pointer'
    };

    if (dayClassName.includes('available')) {
      style.backgroundColor = legendColors.available;
    }
    if (dayClassName.includes('not-available')) {
      style.backgroundColor = legendColors.notAvailable;
      style.color = '#eee';
      style.cursor = 'not-allowed';
    }
    if (dayClassName.includes('invalid')) {
      style.backgroundColor = legendColors.invalid;
      style.color = '#666';
      style.cursor = 'not-allowed';
      style.fontWeight = '700';
    }
    if (dayClassName.includes('stay-period')) {
      style.backgroundColor = legendColors.stayPeriod;
      style.color = '#fff';
      style.opacity = 0.85;
    }
    if (dayClassName.includes('check-in')) {
      style.backgroundColor = legendColors.checkIn;
      style.color = '#fff';
      style.fontWeight = '700';
      style.border = '2px solid #2f5bb7';
    }
    if (dayClassName.includes('check-out')) {
      style.backgroundColor = legendColors.checkOut;
      style.color = '#fff';
      style.fontWeight = '700';
      style.border = '2px solid #b03a5a';
    }

    return style;
  }

  function renderMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const calendarDays = getCalendarDays(year, month);

    return (
      <div
        className="month-card"
        key={`${year}-${month}`}
        style={{
          border: '2px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
        <div className="month-year" style={{ textAlign: 'center', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
          {monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <div
          className="weekdays"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '4px',
            fontWeight: 'bold',
            color: '#475569'
          }}
        >
          {WEEK_DAYS.map((day) => (
            <div key={day} className="weekday" style={{ textAlign: 'center', padding: '5px 0', fontSize: '0.78rem' }}>{day}</div>
          ))}
        </div>
        <div
          className="days-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '4px',
            marginTop: '6px'
          }}
        >
          {calendarDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${year}-${month}-${idx}`} className="day empty" style={{ minHeight: '34px' }}></div>;
            }

            const dateStr = formatDate(date);
            const dayClassName = getDayClass(dateStr, date);
            const isAvailable = availabilityData ? (Object.prototype.hasOwnProperty.call(availabilityData, dateStr) ? availabilityData[dateStr] : true) : true;
            const dayStyle = getDayInlineStyle(dayClassName);

            return (
              <div
                key={dateStr}
                className={dayClassName}
                style={dayStyle}
                onClick={() => handleDateClick(date)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDateClick(date);
                  }
                }}
                aria-disabled={dayClassName.includes('not-available') || dayClassName.includes('invalid')}
                aria-label={`${
                  isAvailable ? 'Available' : 'Not available'
                } date ${date.getDate()} ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="header">
        <button
          className="nav-btn"
          onClick={prevMonth}
          aria-label="Previous Month"
          type="button"
          disabled={!canGoPrev}
        >
          &#x276E;
        </button>
        <div className="header-title">Select Dates</div>
        <button
          className="nav-btn"
          onClick={nextMonth}
          aria-label="Next Month"
          type="button"
          disabled={!canGoNext}
        >
          &#x276F;
        </button>
      </div>
      <div className="months-grid">
        {renderMonth(firstMonthDate)}
        {renderMonth(secondMonthDate)}
      </div>
      <div className="selected-dates-panel">
        <div className="selected-date-box">
          <div className="selected-label">Check-in</div>
          <div className="selected-value">
            {checkInDate ? checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
          </div>
        </div>
        <div className="selected-date-box">
          <div className="selected-label">Check-out</div>
          <div className="selected-value">
            {checkOutDate ? checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
          </div>
        </div>
      </div>
      <div className="check-times">
        Check-in: 02:00 PM | Check-out: 12:00 PM
      </div>
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color available"></span> Available Date
        </div>
        <div className="legend-item">
          <span className="legend-color check-in"></span> Check-in Date
        </div>
        <div className="legend-item">
          <span className="legend-color stay-period"></span> Period of Stay
        </div>
        <div className="legend-item">
          <span className="legend-color check-out"></span> Check-out Date
        </div>
        <div className="legend-item">
          <span className="legend-color invalid"></span> Invalid Date
        </div>
        <div className="legend-item">
          <span className="legend-color not-available"></span> Not Available
        </div>
      </div>

      <style jsx>{`
        .calendar-container {
          width: min(100%, 760px);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          font-family: Arial, sans-serif;
          user-select: none;
          background: #fff;
          padding: 16px;
          margin: 0 auto;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          padding: 10px 12px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 1rem;
        }
        .header-title {
          text-align: center;
          flex: 1;
          letter-spacing: 0.02em;
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
          background: none !important;
          -webkit-text-fill-color: #ffffff !important;
          -webkit-background-clip: initial !important;
          background-clip: initial !important;
          transform: none !important;
        }
        .nav-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 8px;
          color: white;
          width: 32px;
          height: 32px;
          font-size: 1rem;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease, opacity 0.2s ease;
        }
        .nav-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }
        .nav-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .nav-btn:focus {
          outline: 2px solid #fef3c7;
          outline-offset: 2px;
        }
        .months-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .month-card {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        .month-year {
          text-align: center;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;
        }
        .weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          font-weight: bold;
          color: #475569;
          gap: 4px;
        }
        .weekday {
          text-align: center;
          padding: 5px 0;
          font-size: 0.78rem;
        }
        .days-grid {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: 4px;
          margin-top: 6px;
        }
        .day {
          min-height: 34px;
          width: 100%;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background-color: #fff;
          color: #334155;
          border: 1px solid transparent;
          border-radius: 6px;
          user-select: none;
          transition: transform 0.15s ease, background-color 0.2s ease;
          font-size: 0.9rem;
        }
        .day:hover:not(.not-available):not(.check-in):not(.check-out):not(.invalid) {
          background-color: #e6f0ff;
          transform: translateY(-1px);
        }
        .day.empty {
          cursor: default;
          background: transparent;
          border: none;
        }
        .day.available {
          background-color: ${legendColors.available};
        }
        .day.not-available {
          background-color: ${legendColors.notAvailable};
          color: #eee;
          cursor: not-allowed;
        }
        .day.invalid {
          background-color: ${legendColors.invalid};
          color: #666;
          cursor: not-allowed;
          font-weight: bold;
        }
        .day.check-in {
          background-color: ${legendColors.checkIn};
          color: white;
          font-weight: bold;
          border: 2px solid #2f5bb7;
        }
        .day.check-out {
          background-color: ${legendColors.checkOut};
          color: white;
          font-weight: bold;
          border: 2px solid #b03a5a;
        }
        .day.stay-period {
          background-color: ${legendColors.stayPeriod};
          color: white;
          opacity: 0.7;
        }
        .check-times {
          margin-top: 12px;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          user-select: none;
          text-align: center;
        }
        .selected-dates-panel {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .selected-date-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          background: #f8fafc;
        }
        .selected-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }
        .selected-value {
          color: #0f172a;
          font-weight: 700;
          font-size: 0.92rem;
        }
        .legend {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.85rem;
          color: #333;
          user-select: none;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 140px;
        }
        .legend-color {
          width: 18px;
          height: 18px;
          border-radius: 3px;
          display: inline-block;
          border: 1px solid #ccc;
        }
        .legend-color.available {
          background-color: ${legendColors.available};
          border: 1px solid #7bb661;
        }
        .legend-color.check-in {
          background-color: ${legendColors.checkIn};
          border: 1px solid #2f5bb7;
        }
        .legend-color.check-out {
          background-color: ${legendColors.checkOut};
          border: 1px solid #b03a5a;
        }
        .legend-color.stay-period {
          background-color: ${legendColors.stayPeriod};
          opacity: 0.7;
          border: 1px solid #c4a000;
        }
        .legend-color.not-available {
          background-color: ${legendColors.notAvailable};
          border: 1px solid #7a7a7a;
        }
        .legend-color.invalid {
          background-color: ${legendColors.invalid};
          border: 1px solid #bdb76b;
        }
        @media (max-width: 720px) {
          .months-grid {
            grid-template-columns: 1fr;
          }
          .selected-dates-panel {
            grid-template-columns: 1fr;
          }
          .day {
            min-height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
