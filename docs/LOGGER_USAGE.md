# Using the System Logger

## Quick Start

Import the logger utility:
```javascript
import { logError, logWarning, logInfo, LogCategory } from '@/lib/logger';
```

## Common Usage Examples

### 1. **API Route Error Logging**

```javascript
// app/api/example/route.js
import { NextResponse } from "next/server";
import { logError, LogCategory, extractRequestInfo } from '@/lib/logger';

export async function POST(request) {
  try {
    // Your API logic here
    const data = await request.json();
    // ... process data
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log the error
    const requestInfo = extractRequestInfo(request);
    await logError('Failed to process API request', error, {
      category: LogCategory.API,
      endpoint: '/api/example',
      metadata: { requestData: data },
      ...requestInfo
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. **Authentication Failures**

```javascript
import { logWarning, LogCategory } from '@/lib/logger';

// Failed login attempt
await logWarning('Failed login attempt', {
  category: LogCategory.AUTH,
  endpoint: '/api/auth/login',
  metadata: { email: email, reason: 'Invalid password' },
  ipAddress: req.headers.get('x-forwarded-for')
});
```

### 3. **Payment Errors**

```javascript
import { logError, LogCategory } from '@/lib/logger';

try {
  const payment = await processPayment(data);
} catch (error) {
  await logError('Payment processing failed', error, {
    category: LogCategory.PAYMENT,
    endpoint: '/api/payments',
    userId: session.user.id,
    userRole: session.user.role,
    metadata: {
      amount: data.amount,
      bookingId: data.bookingId,
      provider: 'paymongo'
    }
  });
  throw error;
}
```

### 4. **Database Errors**

```javascript
import { logError, LogCategory } from '@/lib/logger';

try {
  const result = await prisma.booking.create({ data });
} catch (error) {
  await logError('Database operation failed', error, {
    category: LogCategory.DATABASE,
    endpoint: '/api/bookings',
    metadata: {
      operation: 'create',
      model: 'Booking'
    }
  });
  throw error;
}
```

### 5. **File Upload Errors**

```javascript
import { logError, logInfo, LogCategory } from '@/lib/logger';

// Log successful upload
await logInfo('File uploaded successfully', {
  category: LogCategory.UPLOAD,
  userId: session.user.id,
  metadata: {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  }
});

// Log upload failure
await logError('File upload failed', error, {
  category: LogCategory.UPLOAD,
  userId: session.user.id,
  metadata: {
    fileName: file.name,
    reason: 'File too large'
  }
});
```

### 6. **Security Events**

```javascript
import { logWarning, LogCategory } from '@/lib/logger';

// Suspicious activity
await logWarning('Multiple failed login attempts detected', {
  category: LogCategory.SECURITY,
  endpoint: '/api/auth/login',
  metadata: {
    email: email,
    attempts: attemptCount,
    timeWindow: '5 minutes'
  },
  ipAddress: req.headers.get('x-forwarded-for')
});
```

### 7. **Booking Operations**

```javascript
import { logInfo, logError, LogCategory } from '@/lib/logger';

// Successful booking
await logInfo('Booking created successfully', {
  category: LogCategory.BOOKING,
  userId: user.id,
  userRole: user.role,
  metadata: {
    bookingId: booking.id,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalPrice: booking.totalPrice
  }
});

// Booking cancellation
await logWarning('Booking cancelled by user', {
  category: LogCategory.BOOKING,
  userId: user.id,
  metadata: {
    bookingId: bookingId,
    reason: cancellationReason
  }
});
```

## Helper Functions

### Extract Request Information
```javascript
import { extractRequestInfo } from '@/lib/logger';

const requestInfo = extractRequestInfo(request);
// Returns: { ipAddress, userAgent, endpoint }
```

### Add User Context from Session
```javascript
import { getServerSession } from "next-auth/next";

const session = await getServerSession(authOptions);

await logError('Operation failed', error, {
  category: LogCategory.API,
  userId: session?.user?.id,
  userRole: session?.user?.role,
  ...extractRequestInfo(request)
});
```

## Log Levels

| Level | When to Use |
|-------|-------------|
| **ERROR** | Application errors, exceptions, failed operations |
| **WARNING** | Unusual events, deprecated features, potential issues |
| **INFO** | Important system events, successful operations |
| **DEBUG** | Detailed debugging information (use sparingly in production) |

## Categories

- `API` - API endpoint errors
- `AUTH` - Authentication/authorization issues
- `PAYMENT` - Payment processing
- `DATABASE` - Database operations
- `UPLOAD` - File uploads
- `BOOKING` - Booking operations
- `SYSTEM` - System-level events
- `SECURITY` - Security-related events
- `CACHE` - Cache operations
- `EMAIL` - Email sending

## Best Practices

1. **Always include context**: Add metadata with relevant details
2. **Use appropriate levels**: Don't log everything as ERROR
3. **Include user info**: When available and relevant
4. **Keep messages clear**: Describe what went wrong
5. **Don't log sensitive data**: Avoid passwords, tokens, credit cards
6. **Use categories**: Makes filtering easier

## Viewing Logs

Developers can view logs at:
**Developer Dashboard → System Logs tab**

Features:
- Filter by level, category, status
- Search logs
- View stack traces
- Mark as resolved
- Pagination
- Auto-cleanup after 5 days
