# Cashier Module API Documentation

## Overview
The Cashier module provides comprehensive payment management and verification capabilities for the hotel booking system. All endpoints require proper authentication with CASHIER or SUPERADMIN roles.

## API Endpoints

### 1. Payment Verification
**Endpoint:** `POST /api/cashier/verify`

**Purpose:** Verify payment transactions and mark them as legitimate

**Authentication:** CASHIER or SUPERADMIN roles required

**Request Body:**
```json
{
  "paymentId": "string (required)",
  "note": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "string",
    "verificationStatus": "Verified",
    "verifiedById": "string",
    "verifiedAt": "timestamp"
  }
}
```

**Features:**
- Updates payment verification status to "Verified"
- Records verifier ID and timestamp
- Creates notifications for RECEPTIONIST and SUPERADMIN roles
- Allows optional booking remarks
- Generates audit trail entry

---

### 2. Payment Flagging
**Endpoint:** `POST /api/cashier/flag`

**Purpose:** Flag suspicious or problematic payments for review

**Authentication:** CASHIER or SUPERADMIN roles required

**Request Body:**
```json
{
  "paymentId": "string (required)",
  "reason": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "string",
    "verificationStatus": "Flagged",
    "flagReason": "string"
  }
}
```

**Features:**
- Marks payment as flagged with reason
- Creates notification for SUPERADMIN
- Records audit trail with flag reason
- Prevents payment from being processed until reviewed

---

### 3. Full Payment Confirmation
**Endpoint:** `POST /api/cashier/confirm-full`

**Purpose:** Process full payment for on-site bookings

**Authentication:** CASHIER or SUPERADMIN roles required

**Request Body:**
```json
{
  "bookingId": "number (required)",
  "amountPaid": "number (required)",
  "method": "string (required)",
  "referenceNo": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "string",
    "amount": "number",
    "status": "Paid",
    "method": "string",
    "provider": "onsite"
  }
}
```

**Features:**
- Creates new payment record for on-site transactions
- Supports multiple payment methods (cash, card, etc.)
- Updates booking payment status
- Generates audit trail for financial tracking
- Handles reference number for card/digital payments

---

### 4. Upcoming Reservations
**Endpoint:** `GET /api/cashier/upcoming-reservations`

**Purpose:** Fetch upcoming reservations with future check-in dates

**Authentication:** CASHIER or SUPERADMIN roles required

**Query Parameters:** None

**Response:**
```json
{
  "reservations": [
    {
      "id": "number",
      "checkIn": "date",
      "checkOut": "date",
      "paymentStatus": "Reservation",
      "user": {
        "name": "string",
        "email": "string"
      },
      "payments": [
        {
          "amount": "number",
          "status": "string",
          "method": "string"
        }
      ]
    }
  ]
}
```

**Features:**
- Filters bookings with paymentStatus: 'Reservation'
- Only shows future check-in dates (from today onwards)
- Includes complete booking and user information
- Returns associated payment details
- Supports pagination for large datasets

---

### 5. Payment Reports
**Endpoint:** `GET /api/cashier/reports`

**Purpose:** Generate payment reports for specific dates

**Authentication:** CASHIER or SUPERADMIN roles required

**Query Parameters:**
- `date`: ISO date string (default: today)
- `format`: 'json' | 'csv' | 'pdf' (default: 'json')

**Response (JSON format):**
```json
{
  "date": "date",
  "payments": [
    {
      "paymentId": "string",
      "bookingId": "number",
      "amount": "number",
      "method": "string",
      "status": "string",
      "timestamp": "date"
    }
  ],
  "summary": {
    "totalAmount": "number",
    "totalCount": "number",
    "byMethod": {
      "cash": "number",
      "card": "number",
      "online": "number"
    }
  }
}
```

**Features:**
- Supports multiple export formats (JSON, CSV, PDF)
- Date-range filtering capabilities
- Comprehensive payment summaries
- Breakdown by payment methods
- Financial reconciliation data

---

## Error Handling

All endpoints follow consistent error response patterns:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (missing/invalid parameters)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (payment/booking not found)
- `500`: Internal Server Error

---

## Security Features

1. **Role-Based Access Control**: All endpoints verify CASHIER or SUPERADMIN roles
2. **Audit Logging**: Every transaction creates an audit trail entry
3. **Session Validation**: Uses NextAuth session verification
4. **Input Validation**: Comprehensive request body validation
5. **Database Transactions**: Ensures data consistency

---

## Integration Notes

### Frontend Integration
The Cashier frontend component (`/app/cashier/page.js`) integrates with these APIs to provide:
- Real-time payment verification
- Upcoming reservations dashboard (15-day view)
- Notification system with dividers
- Modern UI with enhanced UX

### Notification System
Payment actions trigger notifications to relevant user roles:
- **Verification**: Notifies RECEPTIONIST and SUPERADMIN
- **Flagging**: Notifies SUPERADMIN only
- **Full Payment**: Creates system audit records

### Database Schema
The APIs interact with the following database models:
- `Payment`: Core payment records
- `Booking`: Reservation information
- `User`: Customer and staff data
- `Notification`: System notifications
- `BookingRemark`: Additional notes and comments
- `AuditLog`: Security and compliance tracking