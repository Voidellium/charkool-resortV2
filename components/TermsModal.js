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
          <h2 className={styles.modalTitle}>Charkool Leisure Beach Resort – Terms & Conditions</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.termsContent}>
            <section className={styles.lastUpdated}>
              <p><em>Last Updated: November 2025</em></p>
            </section>
            
            <section>
              <p>By booking or using this website, you agree to the following terms:</p>
            </section>

            <section>
              <h3>1. Reservations & Payments</h3>
              <ul>
                <li>All bookings are first-come, first-served via this site or our official Facebook page.</li>
                <li>₱2,000 non-refundable down payment required to secure a reservation.</li>
                <li>Payments accepted via GCash, BPI, or Maya (PayMaya). Upload proof to confirm.</li>
                <li>We are not liable for payments made to unofficial agents or pages.</li>
              </ul>
            </section>

            <section>
              <h3>2. Cancellation & Rebooking</h3>
              <ul>
                <li>No refunds for voluntary cancellations.</li>
                <li>Rebooking allowed up to 2 times, subject to availability.</li>
                <li>Rebooking due to bad weather or natural calamity is free.</li>
                <li>Resort-initiated cancellations (e.g., double-booking) qualify for full refund or partner assistance.</li>
              </ul>
            </section>

            <section>
              <h3>3. Check-In / Check-Out</h3>
              <ul>
                <li>Check-in: 2:00 PM &nbsp;&nbsp; Check-out: 12:00 NN</li>
                <li>Early check-in / late check-out: ₱500.00 per hour, subject to availability.</li>
                <li>Valid government ID required at check-in.</li>
                <li>Max occupancy per unit:
                  <ul>
                    <li>Villa – 10 pax &nbsp;&nbsp; Teepee – 6 pax &nbsp;&nbsp; Loft – 5 pax &nbsp;&nbsp; Family Lodge – 20 pax</li>
                  </ul>
                </li>
                <li>Up to 2 children (6 years old below) may stay as excess guests if space allows per room.</li>
                <li>Overcapacity or unregistered guests may be denied entry.</li>
              </ul>
            </section>

            <section>
              <h3>4. Food, Drinks & Corkage</h3>
              <ul>
                <li>Outside food is allowed.</li>
                <li>Alcoholic beverages are subject to corkage:
                  <ul>
                    <li>₱50.00 per can/bottle</li>
                    <li>₱300.00 per case</li>
                    <li>₱100.00 per bottle of hard liquor (e.g., brandy, whiskey)</li>
                  </ul>
                </li>
                <li>Beverages available at our on-site convenience store.</li>
                <li>Grilling allowed only in designated areas.</li>
              </ul>
            </section>

            <section>
              <h3>5. Amenities & Activities</h3>
              <ul>
                <li>Room rates include access to pool, beach, kitchen wares, gas stove, billiards, and videoke (if available).</li>
                <li>Optional add-ons: ATV, banana boat, dragon boat, falls tour, island-hopping.</li>
                <li>Follow staff guidance and posted schedules.</li>
              </ul>
            </section>

            <section>
              <h3>6. Guest Behavior & Resort Rights</h3>
              <ul>
                <li>Respect other guests, staff, and facilities.</li>
                <li>Quiet hours: 12:00 AM – 7:00 AM</li>
                <li>Smoking allowed only in designated outdoor areas.</li>
                <li>Disorderly conduct or damage may result in eviction without refund.</li>
                <li>Management may refuse service or cancel bookings for safety or misconduct.</li>
              </ul>
            </section>

            <section>
              <h3>7. Pet Policy</h3>
              <ul>
                <li>Pets must wear diapers at all times.</li>
                <li>Owners are fully responsible for pet behavior.</li>
                <li>Resort is not liable for pet-related incidents or damages.</li>
              </ul>
            </section>

            <section>
              <h3>8. Swimming Pool Rules</h3>
              <ul>
                <li>Proper swimwear required.</li>
                <li>Shower before entering.</li>
                <li>No diving or rough play.</li>
              </ul>
            </section>

            <section>
              <h3>9. Lost & Found</h3>
              <ul>
                <li>Found items (e.g., keys, chargers) may be returned via courier at guest expense.</li>
                <li>Resort is not responsible for unattended valuables.</li>
              </ul>
            </section>

            <section>
              <h3>10. Rates & Promotions</h3>
              <ul>
                <li>Peak Season: November – June</li>
                <li>Off-Peak: Late June – Early September</li>
                <li>Off-peak discounts: ₱1,000–₱3,000</li>
                <li>Prices may change without notice; confirmed bookings remain honored.</li>
              </ul>
            </section>

            <section>
              <h3>11. Data Privacy</h3>
              <ul>
                <li>We collect: name, contact info, payment proof, guest count, stay dates, special requests.</li>
                <li>Used to: process bookings, verify payments, send updates, improve services.</li>
                <li>Stored securely; not shared unless required by law or booking fulfillment.</li>
                <li>You may access, correct, or request deletion of your data.</li>
                <li>For concerns, contact us or file with the National Privacy Commission (NPC).</li>
              </ul>
            </section>

            <section>
              <h3>12. Liability & Force Majeure</h3>
              <ul>
                <li>Resort is not liable for delays or damages due to natural disasters or power failures.</li>
                <li>Adventure activities are at your own risk; waivers may be required.</li>
              </ul>
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
