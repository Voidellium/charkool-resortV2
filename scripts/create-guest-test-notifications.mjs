/**
 * Create guest-specific test notifications.
 * Usage (PowerShell):
 *   node scripts/create-guest-test-notifications.mjs <USER_ID>
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const testNotifications = [
  { type: 'booking_created', message: 'Booking ID 10234 created successfully for your stay.' },
  { type: 'payment_received', message: 'Payment received: ₱3,500 for booking #10234.' },
  { type: 'system_info', message: 'Your check-in is tomorrow at 2:00 PM. See you soon!' },
  { type: 'payment_failed', message: 'Payment attempt failed. Please update your payment method.' },
  { type: 'system_alert', message: 'Maintenance in selected amenities tomorrow 10AM-12NN.' },
];

async function ensureFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

async function main() {
  const userIdArg = process.argv[2];
  if (!userIdArg || isNaN(Number(userIdArg))) {
    console.error('Please provide a numeric USER_ID. Example: node scripts/create-guest-test-notifications.mjs 12');
    process.exit(1);
  }
  const userId = Number(userIdArg);

  const $fetch = await ensureFetch();
  console.log(`\n🔔 Creating ${testNotifications.length} guest notifications for userId=${userId} ...\n`);

  for (let i = 0; i < testNotifications.length; i++) {
    const n = testNotifications[i];
    try {
      const res = await $fetch(`${baseUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...n, userId }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t}`);
      }
      const data = await res.json();
      console.log(`✅ ${i + 1}/${testNotifications.length} Created: [${data.type}] ${data.message}`);
    } catch (err) {
      console.error(`❌ Failed to create notification #${i + 1}:`, err.message);
    }
  }

  console.log('\n🎉 Done. Open the site as this user and click the bell in the guest header.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
