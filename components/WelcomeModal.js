'use client';
import { useEffect, useState } from 'react';
import styles from './WelcomeModal.module.css';

export default function WelcomeModal() {
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if modal has been shown before in this session
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcomeModal');
    
    if (!hasSeenWelcome) {
      // Show modal after a brief delay
      setTimeout(() => {
        setShowModal(true);
      }, 100);

      // Start fade-out animation after 3.5 seconds
      setTimeout(() => {
        setIsClosing(true);
      }, 3500);

      // Remove modal from DOM after fade-out completes
      setTimeout(() => {
        setShowModal(false);
        sessionStorage.setItem('hasSeenWelcomeModal', 'true');
      }, 4300); // 3500ms + 800ms fade-out animation
    }
  }, []);

  if (!showModal) return null;

  return (
    <div className={`${styles.modalOverlay} ${isClosing ? styles.fadeOut : ''}`}>
      <div className={`${styles.modalContent} ${isClosing ? styles.slideOut : ''}`}>
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
