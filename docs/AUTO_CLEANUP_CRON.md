# Auto-Cleanup Cron Job Setup

## Overview
The system has an automated cleanup cron job that runs every 2 days to maintain database health and performance.

## What Gets Cleaned Up

### 1. **System Logs** (5-day retention)
- Deletes logs older than 5 days
- Keeps recent error tracking data

### 2. **Expired OTPs** (24-hour retention)
- Removes OTPs older than 24 hours
- Cleans up registration verification codes

### 3. **Expired Sessions**
- Removes expired user sessions
- Keeps database clean

## Configuration

### Vercel Deployment (Recommended)
The `vercel.json` file is already configured:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 */2 * *"
    }
  ]
}
```

**Schedule:** Runs at midnight (00:00) every 2 days

### Environment Variable
Add to your `.env` file:
```
CRON_SECRET=your-secure-random-secret-key-here
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Manual Cleanup

Developers can manually trigger cleanup from the Developer Dashboard:
1. Go to Developer Dashboard → System Logs tab
2. Click "🗑️ Cleanup Old" button
3. Confirm the action

## API Endpoint

**Endpoint:** `GET /api/cron/cleanup`

**Authentication:** Bearer token with CRON_SECRET

**Example Request:**
```bash
curl -X GET https://your-domain.com/api/cron/cleanup \
  -H "Authorization: Bearer your-cron-secret"
```

**Response:**
```json
{
  "success": true,
  "results": {
    "logsDeleted": 342,
    "otpsDeleted": 28,
    "sessionsDeleted": 15
  },
  "timestamp": "2025-10-23T00:00:00.000Z"
}
```

## Alternative Cron Services

If not using Vercel, you can use:

### 1. **cron-job.org**
- Free service
- Add job with URL: `https://your-domain.com/api/cron/cleanup`
- Schedule: `0 0 */2 * *`
- Add header: `Authorization: Bearer your-cron-secret`

### 2. **EasyCron**
- Similar setup to cron-job.org
- Supports custom headers

### 3. **GitHub Actions**
Create `.github/workflows/cleanup.yml`:
```yaml
name: Database Cleanup
on:
  schedule:
    - cron: '0 0 */2 * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Monitoring

Check cleanup logs in:
1. Vercel Dashboard → Functions → Logs
2. Or manually check the SystemLog table for cleanup events

## Adjusting Retention Periods

Edit `app/api/cron/cleanup/route.js`:

```javascript
// Change retention from 5 to 7 days
logCutoffDate.setDate(logCutoffDate.getDate() - 7);

// Change OTP retention from 24 hours to 48 hours
otpCutoffDate.setHours(otpCutoffDate.getHours() - 48);
```

## Security Notes

⚠️ **Important:**
- Keep CRON_SECRET secure and never commit to repository
- Use different secrets for development and production
- Rotate secrets periodically
- Monitor cleanup execution for anomalies
