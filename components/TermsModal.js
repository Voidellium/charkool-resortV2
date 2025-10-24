'use client';
import { useState } from 'react';
import styles from './TermsModal.module.css';

export default function TermsModal({ isOpen, onClose, onAccept }) {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (isChecked) {
      onAccept();
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Terms and Agreement</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.termsContent}>
            <section>
              <h3>1. Acceptance of Terms</h3>
              <p>
                By creating an account with Charkool Leisure Beach Resort ("the Resort"), you agree to be bound by these Terms and Conditions. 
                Please read them carefully before proceeding with your registration.
              </p>
            </section>

            <section>
              <h3>2. Account Registration</h3>
              <p>
                You must provide accurate, complete, and current information during registration. You are responsible for maintaining 
                the confidentiality of your account credentials and for all activities that occur under your account. You agree to 
                notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h3>3. Booking and Reservations</h3>
              <p>
                All bookings are subject to availability. The Resort reserves the right to accept or decline any reservation at its discretion. 
                Room rates and amenity prices are subject to change without prior notice. Special requests are not guaranteed and will be 
                fulfilled based on availability at check-in.
              </p>
            </section>

            <section>
              <h3>4. Payment Terms</h3>
              <p>
                Full payment or a deposit (as specified during booking) is required to confirm your reservation. Accepted payment methods 
                include cash, credit/debit cards, and other methods as indicated on our platform. All prices are in Philippine Peso (PHP) 
                unless otherwise stated. Additional charges may apply for extra services, amenities, or incidental damages.
              </p>
            </section>

            <section>
              <h3>5. Cancellation and Refund Policy</h3>
              <p>
                Cancellations must be made through your account or by contacting our reception. Cancellation fees may apply depending on 
                the timing of your cancellation:
              </p>
              <ul>
                <li>Cancellations made 7 days or more before check-in: Full refund minus processing fee</li>
                <li>Cancellations made 3-6 days before check-in: 50% refund</li>
                <li>Cancellations made less than 3 days before check-in: No refund</li>
                <li>No-shows: No refund and full charge applies</li>
              </ul>
              <p>
                Refunds will be processed within 7-14 business days to the original payment method.
              </p>
            </section>

            <section>
              <h3>6. Check-In and Check-Out</h3>
              <p>
                Standard check-in time is 2:00 PM and check-out time is 12:00 PM. Early check-in and late check-out are subject to 
                availability and may incur additional charges. Valid government-issued identification is required at check-in. 
                The Resort reserves the right to refuse check-in if proper identification is not presented.
              </p>
            </section>

            <section>
              <h3>7. Guest Conduct and Liability</h3>
              <p>
                Guests are expected to conduct themselves in a respectful manner and comply with all Resort policies and Philippine laws. 
                The Resort is not liable for any loss, theft, or damage to personal belongings. Guests are responsible for any damage 
                caused to Resort property during their stay and will be charged accordingly.
              </p>
            </section>

            <section>
              <h3>8. Amenities and Services</h3>
              <p>
                Access to amenities and services is subject to availability, operating hours, and weather conditions. The Resort reserves 
                the right to temporarily close or modify amenities for maintenance or safety reasons without prior notice. Some amenities 
                may require additional fees or advance booking.
              </p>
            </section>

            <section>
              <h3>9. Privacy and Data Protection</h3>
              <p>
                Your personal information will be collected, stored, and processed in accordance with our Data Privacy Policy and the 
                Philippine Data Privacy Act of 2012. By creating an account, you consent to the collection and use of your information 
                as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h3>10. Force Majeure</h3>
              <p>
                The Resort shall not be liable for any failure to perform its obligations due to circumstances beyond its reasonable control, 
                including but not limited to natural disasters, typhoons, government actions, pandemics, or other acts of God.
              </p>
            </section>

            <section>
              <h3>11. Modifications to Terms</h3>
              <p>
                The Resort reserves the right to modify these Terms and Conditions at any time. Continued use of your account after 
                modifications constitutes acceptance of the updated terms. Material changes will be communicated via email or through 
                your account dashboard.
              </p>
            </section>

            <section>
              <h3>12. Dispute Resolution</h3>
              <p>
                Any disputes arising from these terms shall be resolved through good-faith negotiation. If resolution cannot be reached, 
                disputes shall be subject to the exclusive jurisdiction of the courts in the Philippines.
              </p>
            </section>

            <section>
              <h3>13. Contact Information</h3>
              <p>
                For questions or concerns regarding these Terms and Conditions, please contact us at:
              </p>
              <p>
                <strong>Charkool Leisure Beach Resort</strong><br />
                Email: info@charkoolresort.com<br />
                Phone: (Sample Contact Number)
              </p>
            </section>

            <section className={styles.lastUpdated}>
              <p><em>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</em></p>
            </section>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="termsCheckbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className={styles.checkbox}
            />
            <label htmlFor="termsCheckbox" className={styles.checkboxLabel}>
              I have read and agree to the Terms and Agreement
            </label>
          </div>
          <div className={styles.buttonGroup}>
            <button
              onClick={onClose}
              className={styles.declineButton}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={!isChecked}
              className={styles.acceptButton}
              type="button"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
