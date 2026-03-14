/**
 * Receipt Service
 * Handles generating and sending receipts via email
 */

import { Resend } from 'resend';
import prisma from '@/lib/prisma';
import { 
  generateReservationReceiptHTML, 
  generateReservationReceiptText,
  generateReceiptNumber 
} from './emailTemplates/reservationReceipt';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Fetch complete booking data with all relations needed for receipt
 */
export async function getBookingForReceipt(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(bookingId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          firstName: true,
          lastName: true,
        }
      },
      rooms: {
        include: {
          room: true
        }
      },
      optionalAmenities: {
        include: {
          optionalAmenity: true
        }
      },
      rentalAmenities: {
        include: {
          rentalAmenity: true
        }
      },
      cottage: {
        include: {
          cottage: true
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      unitAssignments: {
        include: {
          room: true
        }
      }
    }
  });

  return booking;
}

/**
 * Send reservation receipt email to customer
 * @param {number} bookingId - The booking ID
 * @param {string} paymentId - The payment ID (optional)
 * @returns {Object} Result with success status and receipt number
 */
export async function sendReservationReceipt(bookingId, paymentId = null) {
  try {
    // Fetch booking with all relations
    const booking = await getBookingForReceipt(bookingId);

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Get recipient email
    const recipientEmail = booking.user?.email;
    if (!recipientEmail) {
      return { success: false, error: 'No email address found for this booking' };
    }

    // Get payment record
    let payment = null;
    if (paymentId) {
      payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    } else if (booking.payments && booking.payments.length > 0) {
      payment = booking.payments[0];
    }

    // Generate receipt number
    const receiptNumber = generateReceiptNumber();

    // Update payment with receipt number if payment exists
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { receiptNumber }
      });
    }

    // Generate email content
    const htmlContent = generateReservationReceiptHTML({
      booking,
      payment,
      receiptNumber
    });

    const textContent = generateReservationReceiptText({
      booking,
      payment,
      receiptNumber
    });

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return { 
        success: false, 
        error: 'Email service not configured',
        receiptNumber // Still return receipt number for logging
      };
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Charkool Resort <no-reply@charkoolresort.com>',
      to: [recipientEmail],
      subject: `Reservation Receipt - Booking #${booking.id} | Charkool Resort`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return { 
        success: false, 
        error: 'Failed to send email',
        details: error,
        receiptNumber
      };
    }

    console.log(`✅ Receipt email sent successfully to ${recipientEmail}`, data);

    // Create notification for the guest
    try {
      await prisma.notification.create({
        data: {
          message: `Your reservation receipt has been sent to ${recipientEmail}`,
          type: 'RECEIPT_SENT',
          role: 'GUEST',
          bookingId: booking.id,
          userId: booking.userId
        }
      });
    } catch (notifError) {
      console.warn('Failed to create notification:', notifError);
    }

    return { 
      success: true, 
      receiptNumber,
      emailId: data?.id,
      sentTo: recipientEmail
    };

  } catch (error) {
    console.error('Error sending reservation receipt:', error);
    return { 
      success: false, 
      error: 'Server error while sending receipt',
      details: error.message
    };
  }
}

/**
 * Resend receipt email to customer
 * @param {number} bookingId - The booking ID
 * @returns {Object} Result with success status
 */
export async function resendReservationReceipt(bookingId) {
  return sendReservationReceipt(bookingId, null);
}

/**
 * Generate receipt data for PDF/HTML view (without sending email)
 * @param {number} bookingId - The booking ID
 * @returns {Object} Receipt data
 */
export async function generateReceiptData(bookingId) {
  try {
    const booking = await getBookingForReceipt(bookingId);
    
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const payment = booking.payments?.[0] || null;
    const receiptNumber = payment?.receiptNumber || generateReceiptNumber();

    const htmlContent = generateReservationReceiptHTML({
      booking,
      payment,
      receiptNumber
    });

    return {
      success: true,
      booking,
      payment,
      receiptNumber,
      htmlContent
    };

  } catch (error) {
    console.error('Error generating receipt data:', error);
    return { 
      success: false, 
      error: 'Server error generating receipt',
      details: error.message
    };
  }
}
