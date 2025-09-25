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

export default function BookingCalendar({ availabilityData, onDateChange }) {
  // availabilityData: { 'yyyy-mm-dd': boolean } true=available, false=not available
  // onDateChange: callback with { checkInDate, checkOutDate }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);

  // Generate calendar grid days with states
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Build array of date objects for calendar grid (including leading empty days)
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null); // empty cells before first day
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentYear, currentMonth, day));
  }

  // Handle date click logic
  function handleDateClick(date) {
    if (!date) return;
    const dateStr = formatDate(date);

    // Disable past dates
    if (date < today) return;

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

  // Legend colors - updated to unique palette
  const legendColors = {
    available: '#d0f0c0',      // light green
    checkIn: '#4a90e2',        // blue
    checkOut: '#e94e77',       // pinkish-red
    stayPeriod: '#f5a623',     // yellow (kept for contrast)
    notAvailable: '#b0b0b0',  // medium gray
    invalid: '#f0e68c',        // khaki
  };

  return (
    <div className="calendar-container">
      <div className="header">
        <button className="nav-btn" onClick={prevMonth} aria-label="Previous Month" type="button">&#x276E;</button>
        <div className="month-year">
          {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button className="nav-btn" onClick={nextMonth} aria-label="Next Month" type="button">&#x276F;</button>
      </div>
      <div className="weekdays">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>
      <div className="days-grid">
        {calendarDays.map((date, idx) => {
          if (!date) {
            return <div key={'empty-' + idx} className="day empty"></div>;
          }
          const dateStr = formatDate(date);
          const isAvailable = availabilityData ? (availabilityData.hasOwnProperty(dateStr) ? availabilityData[dateStr] : true) : true;
          const isCheckIn = checkInDate && formatDate(checkInDate) === dateStr;
          const isCheckOut = checkOutDate && formatDate(checkOutDate) === dateStr;
          const inStay = isInStayPeriod(date);

          let className = 'day';
          if (date < today) className += ' not-available'; // disable past dates visually
          else if (!isAvailable) className += ' not-available';
          else if (isCheckIn) className += ' check-in';
          else if (isCheckOut) className += ' check-out';
          else if (inStay) className += ' stay-period';
          else className += ' available'; // Add available class for styling

          return (
            <div
              key={dateStr}
              className={className}
              onClick={() => handleDateClick(date)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDateClick(date); }}
              aria-label={`${
                isAvailable ? 'Available' : 'Not available'
              } date ${date.getDate()} ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`}
            >
              {date.getDate()}
            </div>
          );
        })}
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
          width: 320px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-family: Arial, sans-serif;
          user-select: none;
          background: #fff;
          padding: 16px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #0071bc;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .nav-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          user-select: none;
        }
        .nav-btn:focus {
          outline: 2px solid #f5a623;
        }
        .month-year {
          flex-grow: 1;
          text-align: center;
        }
        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-top: 12px;
          font-weight: bold;
          color: #333;
        }
        .weekday {
          text-align: center;
          padding: 6px 0;
          font-size: 0.85rem;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-top: 8px;
        }
        .day {
          width: 36px;
          height: 36px;
          line-height: 36px;
          text-align: center;
          cursor: pointer;
          background-color: #fff;
          color: #333;
          border: 1px solid transparent;
          border-radius: 4px;
          user-select: none;
          transition: background-color 0.3s ease;
        }
        .day:hover:not(.not-available):not(.check-in):not(.check-out) {
          background-color: #e6f0ff;
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
          background-color: #0071bc;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          user-select: none;
          text-align: center;
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
          min-width: 120px;
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
      `}</style>
    </div>
  );
}
