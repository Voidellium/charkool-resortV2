'use client';
import { useState } from 'react';
import styles from './DataPrivacyModal.module.css';

export default function DataPrivacyModal({ isOpen, onClose, onAccept }) {
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
          <h2 className={styles.modalTitle}>Data Privacy Policy</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.privacyContent}>
            <section className={styles.introduction}>
              <p>
                Charkool Leisure Beach Resort ("we," "us," or "our") is committed to protecting your privacy and personal 
                information. This Data Privacy Policy outlines how we collect, use, store, and protect your personal data in 
                accordance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its 
                implementing rules and regulations.
              </p>
              <p>
                By submitting this booking, you consent to the collection and processing of your personal information as 
                described in this policy.
              </p>
            </section>

            <section>
              <h3>1. Information We Collect</h3>
              <p>We collect the following types of personal information when you make a booking:</p>
              <ul>
                <li><strong>Personal Identification:</strong> Full name, date of birth, email address, contact number</li>
                <li><strong>Booking Details:</strong> Check-in/check-out dates, room type, number of guests, special requests</li>
                <li><strong>Payment Information:</strong> Billing details, payment method (processed securely through our payment processor)</li>
                <li><strong>Communication Data:</strong> Records of inquiries, feedback, and correspondence with our staff</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, session data for security purposes</li>
              </ul>
            </section>

            <section>
              <h3>2. How We Use Your Information</h3>
              <p>Your personal data is collected and processed for the following legitimate purposes:</p>
              <ul>
                <li><strong>Reservation Management:</strong> To process, confirm, and manage your booking</li>
                <li><strong>Service Delivery:</strong> To provide accommodation, amenities, and services during your stay</li>
                <li><strong>Communication:</strong> To send booking confirmations, updates, and respond to inquiries</li>
                <li><strong>Payment Processing:</strong> To handle transactions and billing</li>
                <li><strong>Legal Compliance:</strong> To comply with Philippine laws, regulations, and government requirements</li>
                <li><strong>Security:</strong> To protect against fraud, unauthorized access, and ensure guest safety</li>
                <li><strong>Service Improvement:</strong> To analyze feedback and enhance our services (anonymized data only)</li>
                <li><strong>Marketing (with consent):</strong> To send promotional offers and updates about our resort (opt-in only)</li>
              </ul>
            </section>

            <section>
              <h3>3. Legal Basis for Processing</h3>
              <p>We process your personal data based on:</p>
              <ul>
                <li><strong>Consent:</strong> You have given explicit consent for processing your personal data for booking purposes</li>
                <li><strong>Contract Performance:</strong> Processing is necessary to fulfill our contractual obligations to you</li>
                <li><strong>Legal Obligation:</strong> We must process data to comply with Philippine laws and regulations</li>
                <li><strong>Legitimate Interest:</strong> To protect our business interests while respecting your privacy rights</li>
              </ul>
            </section>

            <section>
              <h3>4. Data Storage and Security</h3>
              <p>
                We implement industry-standard security measures to protect your personal information from unauthorized access, 
                disclosure, alteration, or destruction. These measures include:
              </p>
              <ul>
                <li>Encryption of data in transit and at rest</li>
                <li>Secure servers with access controls and authentication</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Staff training on data protection and confidentiality</li>
                <li>Limited access to personal data on a need-to-know basis</li>
              </ul>
              <p>
                Your data is stored on secure servers located in the Philippines or with trusted international service providers 
                who comply with Philippine data protection standards.
              </p>
            </section>

            <section>
              <h3>5. Data Retention</h3>
              <p>We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy:</p>
              <ul>
                <li><strong>Booking Records:</strong> Retained for 5 years for accounting and legal compliance purposes</li>
                <li><strong>Communication Logs:</strong> Retained for 3 years for customer service and dispute resolution</li>
                <li><strong>Payment Records:</strong> Retained for 10 years as required by Philippine tax and accounting laws</li>
                <li><strong>Marketing Consent:</strong> Retained until you withdraw consent or request deletion</li>
              </ul>
              <p>After the retention period, your data will be securely deleted or anonymized.</p>
            </section>

            <section>
              <h3>6. Data Sharing and Disclosure</h3>
              <p>We do not sell, rent, or trade your personal information. We may share your data only with:</p>
              <ul>
                <li><strong>Service Providers:</strong> Payment processors, booking platforms, and IT service providers who assist us 
                (under strict confidentiality agreements)</li>
                <li><strong>Government Authorities:</strong> When required by law, court order, or to protect legal rights</li>
                <li><strong>Business Partners:</strong> Only with your explicit consent for specific services (e.g., tours, activities)</li>
              </ul>
              <p>All third parties are required to respect the security of your data and process it in accordance with Philippine law.</p>
            </section>

            <section>
              <h3>7. Your Data Privacy Rights</h3>
              <p>Under the Philippine Data Privacy Act, you have the following rights:</p>
              <ul>
                <li><strong>Right to Access:</strong> Request a copy of your personal data we hold</li>
                <li><strong>Right to Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                <li><strong>Right to Object:</strong> Object to processing of your data for marketing purposes</li>
                <li><strong>Right to Data Portability:</strong> Request transfer of your data in a structured, commonly used format</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time (without affecting prior processing)</li>
                <li><strong>Right to Lodge a Complaint:</strong> File a complaint with the National Privacy Commission (NPC)</li>
              </ul>
              <p>
                To exercise these rights, please contact our Data Protection Officer at <strong>dpo@charkoolresort.com</strong> or 
                call our front desk at <strong>(Sample Contact Number)</strong>.
              </p>
            </section>

            <section>
              <h3>8. Cookies and Tracking Technologies</h3>
              <p>
                Our website uses cookies and similar technologies to enhance your browsing experience, analyze usage patterns, and 
                remember your preferences. You can control cookie settings through your browser, but disabling cookies may affect 
                website functionality.
              </p>
            </section>

            <section>
              <h3>9. Children's Privacy</h3>
              <p>
                Our services are not directed to children under 16 years of age. We do not knowingly collect personal information 
                from minors without parental consent. If you are under 16, please have a parent or guardian complete the booking 
                on your behalf.
              </p>
            </section>

            <section>
              <h3>10. International Data Transfers</h3>
              <p>
                If your data is transferred outside the Philippines (e.g., to cloud service providers), we ensure adequate safeguards 
                are in place, including contractual protections and adherence to international data protection standards.
              </p>
            </section>

            <section>
              <h3>11. Updates to This Policy</h3>
              <p>
                We may update this Data Privacy Policy periodically to reflect changes in our practices or legal requirements. 
                Material changes will be communicated via email or through our website. Continued use of our services after updates 
                constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h3>12. Contact Information</h3>
              <p>
                For questions, concerns, or to exercise your data privacy rights, please contact:
              </p>
              <p>
                <strong>Charkool Leisure Beach Resort - Data Protection Officer</strong><br />
                Email: <a href="mailto:dpo@charkoolresort.com">dpo@charkoolresort.com</a><br />
                Phone: (Sample Contact Number)<br />
                Address: (Sample Physical Address)
              </p>
              <p>
                You may also file a complaint with the <strong>National Privacy Commission (NPC)</strong>:<br />
                Website: <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer">www.privacy.gov.ph</a><br />
                Email: info@privacy.gov.ph<br />
                Hotline: (02) 8234-2228
              </p>
            </section>

            <section className={styles.consent}>
              <h3>13. Consent Declaration</h3>
              <p>
                By checking the box below and submitting this booking, you acknowledge that you have read, understood, and agree to 
                this Data Privacy Policy. You consent to the collection, processing, storage, and use of your personal information 
                as described above.
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
              id="privacyCheckbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className={styles.checkbox}
            />
            <label htmlFor="privacyCheckbox" className={styles.checkboxLabel}>
              I have read and agree to the Data Privacy Policy
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
