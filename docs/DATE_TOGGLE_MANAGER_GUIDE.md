# DateToggleManager Component - Complete Guide

## 📋 Overview

The `DateToggleManager` is a reusable React component for managing date availability in your booking calendar. It provides a user-friendly interface to **enable** or **disable** specific dates for bookings.

---

## ✨ Features

- **Interactive Calendar**: Visual date selection using your existing BookingCalendar component
- **Real-time Status**: Shows whether a date is currently enabled or disabled
- **Toggle Functionality**: Click once to disable, click again to enable
- **Auto-refresh**: Automatically updates the booking calendar across the entire application
- **API Integration**: Connects to your existing disabled-dates endpoints
- **Beautiful UI**: Matches your Super Admin design with smooth animations
- **Responsive**: Works on desktop, tablet, and mobile devices

---

## 📁 Files Created

1. **`components/DateToggleManager.js`** - Main component
2. **`components/DateToggleManager.module.css`** - Styling
3. **`components/DateToggleManager.EXAMPLES.js`** - Usage examples

---

## 🚀 Quick Start

### Basic Usage

```javascript
"use client";
import { useState } from 'react';
import DateToggleManager from '@/components/DateToggleManager';

export default function MyPage() {
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <button onClick={() => setShowManager(true)}>
        Manage Dates
      </button>

      {showManager && (
        <DateToggleManager
          onClose={() => setShowManager(false)}
        />
      )}
    </>
  );
}
```

---

## 🎯 Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onClose` | `function` | ✅ Yes | Callback when modal is closed |
| `onDateToggled` | `function` | ❌ No | Callback when date is toggled `(dateStr, isDisabled)` |
| `initialDate` | `Date` | ❌ No | Pre-select a date when opening the modal |

---

## 💡 How It Works

### 1. **User Opens Modal**
```javascript
setShowManager(true);
```

### 2. **User Selects Date from Calendar**
- Calendar shows all dates
- Disabled dates appear grayed out (as per BookingCalendar)
- Click any date to select it

### 3. **Component Shows Current Status**
- ✅ "Currently Available" (green badge)
- ❌ "Currently Disabled" (red badge)

### 4. **User Toggles Date**
- If **enabled** → Button shows "Disable Date" (red)
- If **disabled** → Button shows "Enable Date" (green)

### 5. **API Call is Made**
- **Enable**: `DELETE /api/super-admin/disabled-dates/{id}`
- **Disable**: `POST /api/super-admin/disabled-dates` with date

### 6. **Calendar Refreshes**
- Component automatically fetches updated disabled dates
- All BookingCalendar instances across the app reflect the change

---

## 🔧 Integration Examples

### Example 1: Add to Navigation Bar

```javascript
// In SuperAdminLayout or any navigation
<button onClick={() => setShowDateManager(true)}>
  <Calendar size={18} />
  Quick Date Toggle
</button>

{showDateManager && (
  <DateToggleManager onClose={() => setShowDateManager(false)} />
)}
```

### Example 2: Add to Date Customization Page

```javascript
// In app/super-admin/configurations/datecustomization/page.js
// Add state
const [showQuickToggle, setShowQuickToggle] = useState(false);

// Add button in your UI
<button
  onClick={() => setShowQuickToggle(true)}
  className={styles.quickToggleButton}
>
  <Calendar size={18} />
  Quick Date Toggle
</button>

// Add modal
{showQuickToggle && (
  <DateToggleManager
    onClose={() => setShowQuickToggle(false)}
    onDateToggled={() => fetchData()} // Refresh the page data
  />
)}
```

### Example 3: With Initial Date

```javascript
// Pre-select a specific date
const christmasDate = new Date('2025-12-25');

<DateToggleManager
  onClose={() => setShowManager(false)}
  initialDate={christmasDate}
/>
```

### Example 4: With Callback

```javascript
<DateToggleManager
  onClose={() => setShowManager(false)}
  onDateToggled={(dateStr, isNowDisabled) => {
    console.log(`${dateStr} is now ${isNowDisabled ? 'blocked' : 'available'}`);
    // Refresh your data, show notification, etc.
    refreshBookingCalendar();
  }}
/>
```

---

## 🎨 Styling

The component uses CSS modules (`DateToggleManager.module.css`) with these design features:

- **Colors**: 
  - Blue gradient for main actions
  - Green for "Enable" 
  - Red for "Disable"
- **Animations**: Smooth slide-up on open
- **Responsive**: Adapts to mobile screens
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Customizing Colors

Edit `DateToggleManager.module.css`:

```css
/* Change "Enable" button color */
.submitButton[data-action="enable"] {
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

/* Change "Disable" button color */
.submitButton[data-action="disable"] {
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}
```

---

## 🔄 How It Updates BookingCalendar

The `DateToggleManager` works seamlessly with `BookingCalendar.js`:

1. **On Mount**: Fetches disabled dates from `/api/super-admin/disabled-dates`
2. **Converts to Availability Map**: 
   ```javascript
   { '2025-12-25': false } // false = disabled
   ```
3. **Passes to BookingCalendar**:
   ```javascript
   <BookingCalendar availabilityData={availabilityData} />
   ```
4. **BookingCalendar Renders**: Shows disabled dates with gray styling
5. **After Toggle**: Re-fetches and updates availability map
6. **Calendar Refreshes**: All instances automatically update

---

## 🌐 API Endpoints Used

### 1. GET Disabled Dates
```
GET /api/super-admin/disabled-dates
```
Response: Array of disabled date objects

### 2. Disable a Date
```
POST /api/super-admin/disabled-dates
Body: { dates: ['2025-12-25'] }
```

### 3. Enable a Date
```
DELETE /api/super-admin/disabled-dates/{id}
```

---

## ✅ Benefits Over Existing Date Customization Page

| Feature | Date Customization Page | DateToggleManager |
|---------|------------------------|-------------------|
| **Quick Access** | Navigate through menu | Open anywhere with button |
| **Single Date Toggle** | Add + Delete separately | One-click toggle |
| **Visual Feedback** | Table view only | Calendar + Status badge |
| **Reusability** | Fixed page location | Use in any component |
| **Speed** | Multiple steps | 2 clicks (select + toggle) |

---

## 🎯 Use Cases

1. **Quick Holiday Management**: Disable Christmas, New Year, etc.
2. **Emergency Closures**: Quickly block a date due to maintenance
3. **Seasonal Updates**: Enable/disable dates for peak/off-peak seasons
4. **Event Management**: Block dates for private events
5. **Walk-in Booking**: Staff can quickly check/modify date availability

---

## 🔮 Future Enhancements (Optional)

- [ ] Multi-select (toggle multiple dates at once)
- [ ] Add reason field for disabling dates
- [ ] History log of date changes
- [ ] Keyboard shortcuts (e.g., press 'D' to disable)
- [ ] Export disabled dates to CSV
- [ ] Recurring patterns (e.g., "disable every Monday")

---

## 🐛 Troubleshooting

### Component not showing?
```javascript
// Make sure state is initialized
const [showManager, setShowManager] = useState(false);

// Check if conditional rendering is correct
{showManager && <DateToggleManager ... />}
```

### Dates not updating?
```javascript
// Add onDateToggled callback to refresh your data
onDateToggled={(dateStr, isDisabled) => {
  fetchYourData(); // Refresh parent component data
}}
```

### Calendar not showing disabled dates?
- Ensure BookingCalendar receives `availabilityData` prop
- Check API is returning dates in correct format: `{ "2025-12-25": false }`

---

## 📝 Complete Integration Example

```javascript
'use client';
import { useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import DateToggleManager from '@/components/DateToggleManager';
import { Calendar } from 'lucide-react';

export default function ManagementPage({ user }) {
  const [showDateManager, setShowDateManager] = useState(false);
  const [bookingsData, setBookingsData] = useState([]);

  async function refreshBookings() {
    // Your data refresh logic
    const res = await fetch('/api/bookings');
    const data = await res.json();
    setBookingsData(data);
  }

  return (
    <SuperAdminLayout activePage="bookings" user={user}>
      <div className="page-header">
        <h1>Booking Management</h1>
        
        {/* Quick Date Toggle Button */}
        <button 
          className="quick-action-btn"
          onClick={() => setShowDateManager(true)}
        >
          <Calendar size={18} />
          Toggle Date Availability
        </button>
      </div>

      {/* Your page content */}
      <div className="content">
        {/* ... booking list, calendar, etc. ... */}
      </div>

      {/* Date Toggle Manager Modal */}
      {showDateManager && (
        <DateToggleManager
          onClose={() => setShowDateManager(false)}
          onDateToggled={(dateStr, isDisabled) => {
            console.log(`Date ${dateStr} toggled`);
            refreshBookings(); // Refresh your data
          }}
        />
      )}
    </SuperAdminLayout>
  );
}
```

---

## 🎉 Summary

The `DateToggleManager` is a **powerful, reusable component** that makes managing date availability **quick and intuitive**. It integrates seamlessly with your existing booking system and can be added anywhere in your application with just a few lines of code!

**Key Takeaways:**
- ✅ Reusable across your entire application
- ✅ One-click toggle (disable/enable)
- ✅ Real-time calendar updates
- ✅ Beautiful, responsive UI
- ✅ Full API integration
- ✅ Easy to implement

Enjoy managing your booking dates! 🚀
