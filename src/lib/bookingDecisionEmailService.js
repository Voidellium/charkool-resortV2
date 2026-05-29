import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDate(value) {
  if (!value) return 'N/A';
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function sendBookingDecisionEmail({
  to,
  guestName,
  bookingId,
  requestType,
  action,
  reason,
  oldCheckIn,
  oldCheckOut,
  newCheckIn,
  newCheckOut,
}) {
  if (!to) {
    return { success: false, error: 'Missing recipient email' };
  }

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const safeReason = (reason || '').trim() || 'No reason provided';
  const decisionWord = action === 'APPROVE' ? 'approved' : 'disapproved';
  const typeLabel = requestType === 'cancellation' ? 'Cancellation' : 'Reschedule';

  const summaryLine = requestType === 'cancellation'
    ? `Booking #${bookingId} cancellation request has been ${decisionWord}.`
    : `Booking #${bookingId} reschedule request has been ${decisionWord}.`;

  const dateDetailsHtml = requestType === 'reschedule'
    ? `
      <p style="margin: 0 0 8px;"><strong>Old Dates:</strong> ${formatDate(oldCheckIn)} to ${formatDate(oldCheckOut)}</p>
      <p style="margin: 0 0 8px;"><strong>Requested New Dates:</strong> ${formatDate(newCheckIn)} to ${formatDate(newCheckOut)}</p>
    `
    : `
      <p style="margin: 0 0 8px;"><strong>Check-in:</strong> ${formatDate(oldCheckIn)}</p>
      <p style="margin: 0 0 8px;"><strong>Check-out:</strong> ${formatDate(oldCheckOut)}</p>
    `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="margin-bottom: 8px; color: #6b4700;">Charkool Leisure Beach Resort</h2>
      <p style="margin-top: 0;">Hello ${guestName || 'Guest'},</p>
      <p>${summaryLine}</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Request Type:</strong> ${typeLabel}</p>
        <p style="margin: 0 0 8px;"><strong>Decision:</strong> ${action === 'APPROVE' ? 'Approved' : 'Disapproved'}</p>
        <p style="margin: 0 0 8px;"><strong>Booking ID:</strong> ${bookingId}</p>
        ${dateDetailsHtml}
        <p style="margin: 0;"><strong>Admin Reason:</strong> ${safeReason}</p>
      </div>
      <p style="margin-bottom: 0;">If you have questions, please contact the resort directly.</p>
    </div>
  `;

  const textLines = [
    'Charkool Leisure Beach Resort',
    '',
    `Hello ${guestName || 'Guest'},`,
    summaryLine,
    `Request Type: ${typeLabel}`,
    `Decision: ${action === 'APPROVE' ? 'Approved' : 'Disapproved'}`,
    `Booking ID: ${bookingId}`,
  ];

  if (requestType === 'reschedule') {
    textLines.push(`Old Dates: ${formatDate(oldCheckIn)} to ${formatDate(oldCheckOut)}`);
    textLines.push(`Requested New Dates: ${formatDate(newCheckIn)} to ${formatDate(newCheckOut)}`);
  } else {
    textLines.push(`Check-in: ${formatDate(oldCheckIn)}`);
    textLines.push(`Check-out: ${formatDate(oldCheckOut)}`);
  }

  textLines.push(`Admin Reason: ${safeReason}`);
  textLines.push('');
  textLines.push('If you have questions, please contact the resort directly.');

  const { data, error } = await resend.emails.send({
    from: 'Charkool Resort <no-reply@charkoolresort.com>',
    to: [to],
    subject: `${typeLabel} Request ${action === 'APPROVE' ? 'Approved' : 'Disapproved'} - Booking #${bookingId}`,
    html,
    text: textLines.join('\n'),
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to send email', details: error };
  }

  return { success: true, id: data?.id };
}
