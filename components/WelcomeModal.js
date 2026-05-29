'use client';
import { useEffect, useState } from 'react';
import styles from './WelcomeModal.module.css';

export default function WelcomeModal() {
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [isOpeningClosing, setIsOpeningClosing] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [isNoticeClosing, setIsNoticeClosing] = useState(false);

  useEffect(() => {
    // Check if modal has been shown before in this session
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcomeModal');

    if (!hasSeenWelcome) {
      const showTimer = setTimeout(() => {
        setShowOpeningModal(true);
      }, 100);

      const startCloseTimer = setTimeout(() => {
        setIsOpeningClosing(true);
      }, 3500);

      const transitionTimer = setTimeout(() => {
        setShowOpeningModal(false);
        setIsOpeningClosing(false);
        setShowNoticeModal(true);
      }, 4300); // 3500ms + 800ms fade-out animation

      return () => {
        clearTimeout(showTimer);
        clearTimeout(startCloseTimer);
        clearTimeout(transitionTimer);
      };
    }
  }, []);

  const closeNotice = () => {
    setIsNoticeClosing(true);

    setTimeout(() => {
      setShowNoticeModal(false);
      sessionStorage.setItem('hasSeenWelcomeModal', 'true');
    }, 300);
  };

  const visitFacebookPage = () => {
    window.open('https://www.facebook.com/CharkoolLeisureBeachResort', '_blank', 'noopener,noreferrer');
    closeNotice();
  };

  if (!showOpeningModal && !showNoticeModal) return null;

  if (showNoticeModal) {
    return (
      <div className={`${styles.modalOverlay} ${isNoticeClosing ? styles.fadeOutQuick : ''}`}>
        <div className={`${styles.noticeContent} ${isNoticeClosing ? styles.slideOutQuick : ''}`}>
          <h3 className={styles.noticeTitle}>Important Notice</h3>
          <p className={styles.noticeMessage}>
            This website is currently under development and is not yet the official booking and payment platform of Charkool Leisure Beach Resort.
          </p>
          <p className={styles.noticeMessageSecondary}>
            Information shown here is for preview and testing purposes only, and may not reflect actual room availability, rates, or confirmed transactions.
          </p>
          <div className={styles.noticeActions}>
            <button type="button" className={styles.viewWebsiteButton} onClick={closeNotice}>
              View Website
            </button>
            <button type="button" className={styles.facebookButton} onClick={visitFacebookPage}>
              Visit Facebook Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.modalOverlay} ${isOpeningClosing ? styles.fadeOut : ''}`}>
      <div className={`${styles.modalContent} ${isOpeningClosing ? styles.slideOut : ''}`}>
        <div className={styles.logoContainer}>
          <div className={styles.sparkle} style={{ top: '-20%', left: '10%' }}></div>
          <div className={styles.sparkle} style={{ top: '-10%', right: '15%' }}></div>
          <div className={styles.sparkle} style={{ bottom: '0%', left: '20%' }}></div>
          <div className={styles.sparkle} style={{ bottom: '10%', right: '10%' }}></div>
          <img
            src="/images/logo.png"
            alt="Charkool Leisure Beach Resort Logo"
            className={styles.logo}
          />
        </div>
        <h1 className={styles.welcomeTitle}>Welcome to</h1>
        <h2 className={styles.resortName}>Charkool Leisure Beach Resort</h2>
      </div>
    </div>
  );
}
