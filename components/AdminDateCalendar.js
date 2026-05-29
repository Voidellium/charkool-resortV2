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

function addMonthsUTC(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0));
}

function getCalendarDaysUTC(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const calendarDays = [];

  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(Date.UTC(year, month, day, 0, 0, 0)));
  }

  return calendarDays;
}

export default function AdminDateCalendar({ disabledDates = [], onDateSelect }) {
  // disabledDates: array of date strings ['yyyy-mm-dd']
  // onDateSelect: callback with selected date

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1, 0, 0, 0)));
  const [selectedDate, setSelectedDate] = useState(null);

  const firstMonthDate = viewDate;
  const secondMonthDate = addMonthsUTC(viewDate, 1);

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
    setViewDate(addMonthsUTC(viewDate, -1));
  }

  function nextMonth() {
    setViewDate(addMonthsUTC(viewDate, 1));
  }

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function renderMonth(monthDate) {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    const calendarDays = getCalendarDaysUTC(year, month);

    return (
      <div className="month-card" key={`month-${year}-${month}`}>
        <h3 className="month-title">
          {monthNames[month]} {year}
        </h3>

        <div className="weekdays">
          {WEEK_DAYS.map(day => (
            <div key={`${year}-${month}-${day}`} className="weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="days-grid">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${year}-${month}-${index}`} className="day empty" />;
            }

            const disabled = isDisabled(date);
            const selected = isSelected(date);
            const className = `day${disabled ? ' disabled' : ''}${selected ? ' selected' : ''}`;

            return (
              <button
                key={`day-${formatDate(date)}`}
                onClick={() => handleDateClick(date)}
                className={className}
                type="button"
                aria-pressed={selected}
              >
                {date.getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-wrapper">
      <div className="header">
        <button
          onClick={prevMonth}
          className="nav-btn"
          type="button"
          aria-label="Previous Month"
        >
          ‹
        </button>

        <h3 className="header-title">Date Management</h3>

        <button
          onClick={nextMonth}
          className="nav-btn"
          type="button"
          aria-label="Next Month"
        >
          ›
        </button>
      </div>

      <div className="calendar-body">
        <div className="months-grid">
          {renderMonth(firstMonthDate)}
          {renderMonth(secondMonthDate)}
        </div>

        <div className="legend">
          <div className="legend-item">
            <div className="legend-color selected" />
            <span>Selected</span>
          </div>
          <div className="legend-item">
            <div className="legend-color disabled" />
            <span>Disabled</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .calendar-wrapper {
          width: min(100%, 860px);
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: #fff;
        }
        .header-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          text-align: center;
          flex: 1;
          letter-spacing: 0.02em;
        }
        .nav-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          color: #fff;
          font-size: 1.3rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
        }
        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .calendar-body {
          padding: 16px;
          background: #fff;
        }
        .months-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .month-card {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .month-title {
          margin: 0 0 8px 0;
          text-align: center;
          font-weight: 700;
          color: #334155;
          font-size: 0.95rem;
        }
        .weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: 4px;
          margin-bottom: 4px;
        }
        .weekday {
          text-align: center;
          padding: 5px 0;
          font-size: 0.78rem;
          font-weight: bold;
          color: #475569;
        }
        .days-grid {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: 4px;
        }
        .day {
          min-height: 34px;
          width: 100%;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #fff;
          color: #1e293b;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .day:hover:not(.empty):not(.disabled) {
          background: #e6f0ff;
          transform: translateY(-1px);
        }
        .day.empty {
          border: none;
          background: transparent;
          cursor: default;
        }
        .day.selected {
          border: 2px solid #2563eb;
          background: #dbeafe;
          color: #1e40af;
          font-weight: 700;
        }
        .day.disabled {
          background: #fee2e2;
          color: #dc2626;
          font-weight: 600;
        }
        .legend {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
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
        .legend-color.selected {
          background: #dbeafe;
          border: 2px solid #2563eb;
        }
        .legend-color.disabled {
          background: #fee2e2;
        }
        @media (max-width: 760px) {
          .months-grid {
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
