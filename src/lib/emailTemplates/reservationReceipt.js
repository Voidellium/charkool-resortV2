/**
 * Reservation Receipt Email Template
 * Professional HTML email template for sending reservation receipts via Resend
 */

/**
 * Generate receipt number
 * Format: RCV-{timestamp}-{random}
 */
export function generateReceiptNumber() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `RCV-${timestamp}-${random}`;
}

/**
 * Format currency to PHP
 */
function formatPeso(amount) {
  const numAmount = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  // Convert from centavos to pesos if needed
  const pesos = numAmount > 10000 ? numAmount / 100 : numAmount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(pesos);
}

/**
 * Format date to readable string
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date and time
 */
function formatDateTime(date) {
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate nights between two dates
 */
function calculateNights(checkIn, checkOut) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((new Date(checkOut) - new Date(checkIn)) / msPerDay);
}

/**
 * Get room type display name
 */
function getRoomTypeName(room) {
  if (room?.type === 'LOFT') return 'Loft';
  if (room?.type === 'TEPEE') return 'Tepee';
  if (room?.type === 'VILLA') return 'Villa';
  return room?.name || 'Room';
}

/**
 * Generate HTML email template for reservation receipt
 * @param {Object} data - Receipt data
 * @param {Object} data.booking - Booking object with relations
 * @param {Object} data.payment - Payment object
 * @param {string} data.receiptNumber - Generated receipt number
 * @returns {string} HTML email content
 */
export function generateReservationReceiptHTML(data) {
  const { booking, payment, receiptNumber } = data;
  
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const totalRooms = booking.rooms?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 1;
  const reservationFee = totalRooms * 2000; // ₱2,000 per room
  
  // Calculate room breakdown
  const roomBreakdown = booking.rooms?.map(roomBooking => {
    const roomName = getRoomTypeName(roomBooking.room);
    const pricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
    const roomTotal = pricePerNight * nights;
    const additionalPaxFee = (roomBooking.additionalPax || 0) * 400 * nights;
    
    return {
      name: roomName,
      quantity: roomBooking.quantity || 1,
      pricePerNight,
      nights,
      subtotal: roomTotal,
      adults: roomBooking.adults || 1,
      additionalPax: roomBooking.additionalPax || 0,
      children: roomBooking.children || 0,
      additionalPaxFee,
    };
  }) || [];

  // Calculate totals
  const roomsSubtotal = roomBreakdown.reduce((sum, r) => sum + r.subtotal, 0);
  const additionalPaxTotal = roomBreakdown.reduce((sum, r) => sum + r.additionalPaxFee, 0);
  
  // Optional amenities
  const optionalAmenities = booking.optionalAmenities?.map(a => ({
    name: a.optionalAmenity?.name || 'Amenity',
    quantity: a.quantity || 1,
    price: (Number(a.optionalAmenity?.price) || 0) / 100,
    total: ((Number(a.optionalAmenity?.price) || 0) / 100) * (a.quantity || 1),
  })) || [];
  
  // Rental amenities
  const rentalAmenities = booking.rentalAmenities?.map(a => ({
    name: a.rentalAmenity?.name || 'Rental',
    quantity: a.quantity || 1,
    price: (Number(a.totalPrice) || 0) / 100,
  })) || [];
  
  // Cottages
  const cottages = booking.cottage?.map(c => ({
    name: c.cottage?.name || 'Cottage',
    quantity: c.quantity || 1,
    price: (Number(c.totalPrice) || 0) / 100,
  })) || [];

  const amenitiesTotal = optionalAmenities.reduce((sum, a) => sum + a.total, 0) +
                        rentalAmenities.reduce((sum, a) => sum + a.price, 0) +
                        cottages.reduce((sum, c) => sum + c.price, 0);

  const grandTotal = roomsSubtotal + additionalPaxTotal + amenitiesTotal;
  const balanceDue = grandTotal - reservationFee;
  
  // Payment method display
  const paymentMethodDisplay = {
    gcash: 'GCash',
    grab_pay: 'GrabPay',
    paymaya: 'PayMaya',
    card: 'Credit/Debit Card',
    cash: 'Cash',
  }[payment?.method] || payment?.method || 'Online Payment';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Receipt - Charkool Resort</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">
                🏖️ CHARKOOL LEISURE BEACH RESORT
              </h1>
              <p style="color: #bee3f8; margin: 10px 0 0 0; font-size: 16px;">
                Official Reservation Receipt
              </p>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background-color: #c6f6d5; padding: 20px 40px; text-align: center; border-bottom: 3px solid #38a169;">
              <p style="margin: 0; color: #22543d; font-size: 18px; font-weight: 600;">
                ✓ Payment Successful - Reservation Confirmed
              </p>
            </td>
          </tr>

          <!-- Receipt Details -->
          <tr>
            <td style="padding: 30px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f7fafc; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #4a5568; font-size: 14px; padding: 5px 0;">
                          <strong>Receipt #:</strong>
                        </td>
                        <td style="color: #2d3748; font-size: 14px; padding: 5px 0; text-align: right; font-family: monospace;">
                          ${receiptNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #4a5568; font-size: 14px; padding: 5px 0;">
                          <strong>Date Issued:</strong>
                        </td>
                        <td style="color: #2d3748; font-size: 14px; padding: 5px 0; text-align: right;">
                          ${formatDateTime(new Date())}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #4a5568; font-size: 14px; padding: 5px 0;">
                          <strong>Booking ID:</strong>
                        </td>
                        <td style="color: #2d3748; font-size: 14px; padding: 5px 0; text-align: right; font-weight: 600;">
                          #${booking.id}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Guest Information -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                👤 Guest Information
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 8px 0; width: 40%;">Name:</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 8px 0; font-weight: 600;">
                    ${booking.guestName || booking.user?.name || 'Guest'}
                  </td>
                </tr>
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 8px 0;">Email:</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 8px 0;">
                    ${booking.user?.email || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 8px 0;">Contact:</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 8px 0;">
                    ${booking.user?.contactNumber || 'N/A'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reservation Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                📅 Reservation Details
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ebf8ff; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #2c5282; font-size: 14px; padding: 8px 0;">
                          <strong>Check-in:</strong>
                        </td>
                        <td style="color: #2d3748; font-size: 14px; padding: 8px 0; text-align: right;">
                          ${formatDate(booking.checkIn)} <span style="color: #4a5568;">(2:00 PM)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #2c5282; font-size: 14px; padding: 8px 0;">
                          <strong>Check-out:</strong>
                        </td>
                        <td style="color: #2d3748; font-size: 14px; padding: 8px 0; text-align: right;">
                          ${formatDate(booking.checkOut)} <span style="color: #4a5568;">(12:00 PM)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #2c5282; font-size: 14px; padding: 8px 0;">
                          <strong>Duration:</strong>
                        </td>
                        <td style="color: #2d3748; font-size: 14px; padding: 8px 0; text-align: right; font-weight: 600;">
                          ${nights} night${nights > 1 ? 's' : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Room Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                🛏️ Room Details
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${roomBreakdown.map(room => `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 15px;">${room.name}</div>
                    <div style="color: #4a5568; font-size: 13px; margin-top: 4px;">
                      ${room.adults} Adult${room.adults > 1 ? 's' : ''}
                      ${room.additionalPax > 0 ? ` + ${room.additionalPax} Extra Pax` : ''}
                      ${room.children > 0 ? `, ${room.children} Child${room.children > 1 ? 'ren' : ''}` : ''}
                    </div>
                    <div style="color: #718096; font-size: 12px; margin-top: 2px;">
                      ${formatPeso(room.pricePerNight)} × ${room.nights} night${room.nights > 1 ? 's' : ''}
                    </div>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top;">
                    <div style="font-weight: 600; color: #2d3748;">${formatPeso(room.subtotal)}</div>
                    ${room.additionalPaxFee > 0 ? `
                    <div style="color: #718096; font-size: 12px; margin-top: 4px;">
                      +${formatPeso(room.additionalPaxFee)} (extra pax)
                    </div>
                    ` : ''}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          ${optionalAmenities.length > 0 || rentalAmenities.length > 0 || cottages.length > 0 ? `
          <!-- Amenities -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                🎯 Additional Amenities
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${optionalAmenities.map(a => `
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 8px 0;">${a.name} × ${a.quantity}</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 8px 0; text-align: right;">${formatPeso(a.total)}</td>
                </tr>
                `).join('')}
                ${rentalAmenities.map(a => `
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 8px 0;">${a.name} × ${a.quantity}</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 8px 0; text-align: right;">${formatPeso(a.price)}</td>
                </tr>
                `).join('')}
                ${cottages.map(c => `
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 8px 0;">${c.name} × ${c.quantity}</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 8px 0; text-align: right;">${formatPeso(c.price)}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Payment Breakdown -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                💳 Payment Breakdown
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 10px 0;">Rooms Subtotal:</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 10px 0; text-align: right;">${formatPeso(roomsSubtotal)}</td>
                </tr>
                ${additionalPaxTotal > 0 ? `
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 10px 0;">Additional Pax Fees:</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 10px 0; text-align: right;">${formatPeso(additionalPaxTotal)}</td>
                </tr>
                ` : ''}
                ${amenitiesTotal > 0 ? `
                <tr>
                  <td style="color: #4a5568; font-size: 14px; padding: 10px 0;">Amenities:</td>
                  <td style="color: #2d3748; font-size: 14px; padding: 10px 0; text-align: right;">${formatPeso(amenitiesTotal)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td colspan="2" style="padding: 10px 0;">
                    <div style="border-top: 2px solid #e2e8f0;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="color: #2d3748; font-size: 16px; padding: 10px 0; font-weight: 700;">GRAND TOTAL:</td>
                  <td style="color: #2d3748; font-size: 16px; padding: 10px 0; text-align: right; font-weight: 700;">${formatPeso(grandTotal)}</td>
                </tr>
              </table>
              
              <!-- Paid Amount -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #c6f6d5; border-radius: 8px; margin-top: 15px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #22543d; font-size: 15px; font-weight: 600;">
                          Reservation Fee Paid (${totalRooms} room${totalRooms > 1 ? 's' : ''} × ₱2,000):
                        </td>
                        <td style="color: #22543d; font-size: 15px; font-weight: 700; text-align: right;">
                          ${formatPeso(reservationFee)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Balance Due -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #feebc8; border-radius: 8px; margin-top: 10px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #744210; font-size: 15px; font-weight: 600;">
                          Balance Due on Arrival:
                        </td>
                        <td style="color: #744210; font-size: 18px; font-weight: 700; text-align: right;">
                          ${formatPeso(balanceDue > 0 ? balanceDue : 0)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Method -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f7fafc; border-radius: 8px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #4a5568; font-size: 14px; padding: 5px 0;">Payment Method:</td>
                        <td style="color: #2d3748; font-size: 14px; padding: 5px 0; text-align: right; font-weight: 600;">${paymentMethodDisplay}</td>
                      </tr>
                      ${payment?.referenceId ? `
                      <tr>
                        <td style="color: #4a5568; font-size: 14px; padding: 5px 0;">Reference ID:</td>
                        <td style="color: #2d3748; font-size: 12px; padding: 5px 0; text-align: right; font-family: monospace;">${payment.referenceId}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #4a5568; font-size: 14px; padding: 5px 0;">Status:</td>
                        <td style="padding: 5px 0; text-align: right;">
                          <span style="background-color: #c6f6d5; color: #22543d; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            ✓ PAID
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Reminders -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
                📌 Important Reminders
              </h2>
              <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px; line-height: 1.8;">
                <li>Check-in time is at <strong>2:00 PM</strong></li>
                <li>Check-out time is at <strong>12:00 PM</strong></li>
                <li>Please bring a valid ID upon check-in</li>
                <li>Balance must be settled upon arrival</li>
                <li>Present this receipt at the front desk</li>
                <li>Cancellation policy: 48 hours notice required for full refund of reservation fee</li>
              </ul>
            </td>
          </tr>

          <!-- Contact Information -->
          <tr>
            <td style="background-color: #f7fafc; padding: 25px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #2d3748; font-weight: 600; font-size: 15px;">
                      📍 Charkool Leisure Beach Resort
                    </p>
                    <p style="margin: 0 0 5px 0; color: #4a5568; font-size: 13px;">
                      Lobo, Batangas, Philippines
                    </p>
                    <p style="margin: 0 0 5px 0; color: #4a5568; font-size: 13px;">
                      📞 Contact us for inquiries
                    </p>
                    <p style="margin: 0; color: #4a5568; font-size: 13px;">
                      🌐 www.charkoolresort.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a365d; padding: 20px 40px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #a0aec0; font-size: 12px;">
                This is a computer-generated receipt. No signature required.
              </p>
              <p style="margin: 0; color: #718096; font-size: 11px;">
                © ${new Date().getFullYear()} Charkool Leisure Beach Resort. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function generateReservationReceiptText(data) {
  const { booking, payment, receiptNumber } = data;
  
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const totalRooms = booking.rooms?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 1;
  const reservationFee = totalRooms * 2000;

  return `
CHARKOOL LEISURE BEACH RESORT
Official Reservation Receipt
================================

Receipt #: ${receiptNumber}
Date: ${formatDateTime(new Date())}
Booking ID: #${booking.id}

GUEST INFORMATION
-----------------
Name: ${booking.guestName || booking.user?.name || 'Guest'}
Email: ${booking.user?.email || 'N/A'}

RESERVATION DETAILS
-------------------
Check-in: ${formatDate(booking.checkIn)} (2:00 PM)
Check-out: ${formatDate(booking.checkOut)} (12:00 PM)
Duration: ${nights} night(s)

PAYMENT
-------
Reservation Fee Paid: ${formatPeso(reservationFee)}
Payment Method: ${payment?.method || 'Online'}
Reference: ${payment?.referenceId || 'N/A'}
Status: PAID ✓

IMPORTANT REMINDERS
-------------------
• Check-in: 2:00 PM | Check-out: 12:00 PM
• Please bring valid ID
• Balance due on arrival

Thank you for choosing Charkool Resort!
================================
This is a computer-generated receipt.
`;
}
