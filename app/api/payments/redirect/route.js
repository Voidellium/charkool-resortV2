import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const bookingId = searchParams.get('bookingId');

  // HTML page that closes itself and sends message to parent window
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Completed</title>
        <script>
          window.onload = function() {
            if (window.opener) {
              window.opener.postMessage({
                type: 'PAYMENT_COMPLETED',
                status: '${status}',
                bookingId: '${bookingId}'
              }, '*');
              window.close();
            } else {
              window.location.href = '${status === 'success' 
                ? `/confirmation?bookingId=${bookingId}` 
                : `/checkout?error=failed&bookingId=${bookingId}`}';
            }
          };
        </script>
      </head>
      <body>
        <p>Processing payment result...</p>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}