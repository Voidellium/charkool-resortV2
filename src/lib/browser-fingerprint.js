/**
 * Browser Fingerprinting Utility
 * Creates a unique fingerprint for each browser/device combination
 */

export function generateBrowserFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = 200;
  canvas.height = 50;

  // Draw some text and shapes to create a unique pattern
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Browser Fingerprint Test', 2, 2);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillRect(100, 5, 80, 20);

  // Get canvas data as fingerprint
  const canvasData = canvas.toDataURL();

  // Get other browser characteristics
  const screenInfo = {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
  };

  const navigatorInfo = {
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    maxTouchPoints: navigator.maxTouchPoints,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Combine all data into a single string
  const fingerprintData = JSON.stringify({
    canvasData,
    screenInfo,
    navigatorInfo,
    timezone,
    language: navigator.language,
    userAgent: navigator.userAgent,
  });

  // Create a hash of the fingerprint data
  return btoa(fingerprintData).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

export function getClientIP() {
  // This is a placeholder - in a real application, you'd get the IP from the server
  // For now, we'll use a combination of other factors
  return 'client-side-fingerprint';
}

export function getUserAgentInfo() {
  const ua = navigator.userAgent;
  return {
    userAgent: ua,
    isMobile: /Mobi|Android/i.test(ua),
    isTablet: /Tablet|iPad/i.test(ua),
    isDesktop: !/Mobi|Android|Tablet|iPad/i.test(ua),
    browser: getBrowserName(ua),
    os: getOSName(ua),
  };
}

function getBrowserName(ua) {
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function getOSName(ua) {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

export function isIncognitoMode() {
  // Check for various incognito/private mode indicators
  const fs = (window.webkitRequestFileSystem || window.mozRequestFileSystem);

  if (fs) {
    // Test for Chrome/Safari incognito
    return new Promise((resolve) => {
      const testSize = 100;
      fs(0, 0, () => resolve(false), () => resolve(true));
    });
  }

  // Check for Firefox private mode
  if ('MozAppearance' in document.documentElement.style) {
    const db = indexedDB.open('test', 1);
    return new Promise((resolve) => {
      db.onerror = () => resolve(true);
      db.onsuccess = () => resolve(false);
    });
  }

  return Promise.resolve(false);
}
