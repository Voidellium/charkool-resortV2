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
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          border-radius: 12px 12px 0 0;
          color: #fff;
        }
        .header-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .nav-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .calendar-body {
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 12px 12px;
          padding: 1rem;
          background: #fff;
        }
        .months-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .month-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .month-title {
          margin: 0 0 0.6rem;
          text-align: center;
          font-size: 0.96rem;
          color: #334155;
        }
        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
          margin-bottom: 0.35rem;
        }
        .weekday {
          text-align: center;
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          padding: 0.3rem 0;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
        }
        .day {
          min-height: 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          color: #1e293b;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .day:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .day.empty {
          border: none;
          background: transparent;
          cursor: default;
        }
        .day.selected {
          border: 2px solid #2563eb;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          font-weight: 700;
        }
        .day.disabled {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
        }
        .legend {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          color: #64748b;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        .legend-color.selected {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 2px solid #2563eb;
        }
        .legend-color.disabled {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        }
        @media (max-width: 760px) {
          .months-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
