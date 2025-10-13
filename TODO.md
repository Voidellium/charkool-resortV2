# Receptionist Page Update - TODO List

## Task: Update filters and UI structure for receptionist dashboard

### Steps to Complete:

- [ ] 1. Update filter variables in page.js
  - [ ] Rename `upcomingReservations` to `pendingBookings` (keep HELD and PENDING statuses)
  - [ ] Create new `confirmedBookings` variable (filter Confirmed status)
  - [ ] Remove old `currentGuests` variable reference

- [ ] 2. Update UI structure for Pending section
  - [ ] Change section title from "Upcoming Reservations" to "Pending ({pendingBookings.length})"
  - [ ] Update actions: Remove Edit and Confirm buttons
  - [ ] Add Cancel button that calls openStatusModal(booking.id, 'Cancelled')
  - [ ] Keep View Details and Print buttons

- [ ] 3. Add nested Confirmed Bookings subsection
  - [ ] Create subsection inside Pending section with title "Confirmed Bookings ({confirmedBookings.length})"
  - [ ] Add subsection-card div wrapper
  - [ ] Keep all existing actions: Edit, View Details, Check Out, Print

- [ ] 4. Update CSS styling
  - [ ] Add .subsection-card class with margin-left and border-left
  - [ ] Add .action-button.cancel class for Cancel button (red/warning color)
  - [ ] Ensure proper visual hierarchy

- [ ] 5. Testing
  - [ ] Verify PENDING and HELD bookings show in Pending section
  - [ ] Verify Confirmed bookings show in nested subsection
  - [ ] Test Cancel button functionality
  - [ ] Test all other button actions
