import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const bookingId = searchParams.get('bookingId');

  // Best-effort: mark the latest payment for this booking as Failed if provider indicates failure
  try {
    if (status === 'failed' && bookingId) {
      // Lazy import to avoid top-level Prisma import in an edge-like runtime; keep consistent with other routes
      const { default: prisma } = await import('@/lib/prisma');
      const last = await prisma.payment.findFirst({
        where: { bookingId: parseInt(bookingId) },
        orderBy: { createdAt: 'desc' },
      });
      if (last && last.status !== 'Paid') {
        await prisma.payment.update({ where: { id: last.id }, data: { status: 'Failed' } });
      }
    }
  } catch (e) {
    console.error('Failed to mark payment as failed on redirect:', e);
  }

  // HTML page that closes itself and sends message to parent window
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Completed</title>
        <script>
          let pollAttempts = 0;
          const maxPollAttempts = 30; // 30 attempts = 15 seconds
          
          function pollPaymentStatus() {
            if (pollAttempts >= maxPollAttempts) {
              console.log('Payment polling timeout');
              notifyParent('timeout');
              return;
            }
            
            pollAttempts++;
            console.log(\`Polling attempt \${pollAttempts}/\${maxPollAttempts}\`);
            
            fetch('/api/payments/poll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookingId: '${bookingId}' })
            })
            .then(response => response.json())
            .then(data => {
              console.log('Poll result:', data);
              
              if (data.success && data.status === 'paid') {
                console.log('Payment completed successfully!');
                notifyParent('success');
              } else if (data.status === 'failed') {
                console.log('Payment failed');
                notifyParent('failed');
              } else {
                // Still pending, continue polling
                setTimeout(pollPaymentStatus, 500); // Poll every 500ms
              }
            })
            .catch(error => {
              console.error('Poll error:', error);
              setTimeout(pollPaymentStatus, 1000); // Retry after 1 second on error
            });
          }
          
          function notifyParent(result) {
            if (window.opener) {
              window.opener.postMessage({
                type: 'PAYMENT_COMPLETED',
                status: 'returned',
                result: result,
                bookingId: '${bookingId}'
              }, '*');
              window.close();
            } else {
              window.location.href = '/checkout?error=returned&bookingId=${bookingId}';
            }
          }

          window.onload = function() {
            if ('${status}' === 'success') {
              console.log('Payment returned as success, starting polling...');
              // Start polling immediately for successful returns
              pollPaymentStatus();
            } else {
              console.log('Payment returned as failed');
              notifyParent('failed');
            }
          };
        </script>
      </head>
      <body>
        <p>Processing payment result...</p>
        <p id="status">Checking payment status...</p>
        <script>
          // Update status message
          setInterval(() => {
            const statusEl = document.getElementById('status');
            if (statusEl && pollAttempts > 0) {
              statusEl.textContent = \`Verifying payment... (\${pollAttempts}/\${maxPollAttempts})\`;
            }
          }, 100);
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}