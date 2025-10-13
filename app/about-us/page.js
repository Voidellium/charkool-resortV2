"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function AboutUs() {
  return (
    <div className="page-root">
      <header className="hero">
        <div className="hero-bg">
          <div className="sun-glow left" />
          <div className="sun-glow right" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="hero-inner"
        >
          <h1 className="hero-title">About Charkool Beach Resort</h1>
          <p className="hero-sub">A family's dream turned into your perfect coastal escape</p>
        </motion.div>
        <svg className="hero-wave" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
          <path d="M321.39,56.44c58-10.79,114.13-30.13,172-41.86,82.74-16.77,168.06-17.73,250.8-.39C823.46,28.09,906.38,56.7,985,82.55,1059,106,1132,126,1200,120V0H0V27.35A600.06,600.06,0,0,0,321.39,56.44Z" />
        </svg>
      </header>

      <main className="content">
        <section className="container story-section">
          <motion.div
            className="story-card"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">Our Story</h2>
            <p className="lead">
              Charkool Beach Resort began as a heartfelt dream in 2018 — a vision inspired by a mother’s desire to create her own seaside retreat. After the success of the family’s first venture, Charkool Leisure Garden Resort in Bulacan (established in 2012), the family set their sights on the coast and found a perfect home in San Felipe, Liwa-liwa, Zambales.
            </p>
            <p className="body">
              What started as a simple idea has grown into one of the region's most loved destinations, proudly featuring signature amenities and the longest pool in Liwa-liwa. Family-owned and managed, Charkool Beach Resort welcomes guests from across Luzon — from Metro Manila to Pangasinan — blending tropical relaxation, comfort, and thoughtful affordability.
            </p>
            <p className="emph">
              At Charkool Beach Resort, every guest becomes part of the family — every stay is an invitation to enjoy paradise, one wave at a time.
            </p>
          </motion.div>

          <motion.aside
            className="highlight-grid"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="highlight-card">
              <div className="icon-wrap beach-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" fill="#FDD35C" />
                  <path d="M10 22c2-4 8-4 10 0" stroke="#3B5157" strokeWidth="2" strokeLinecap="round" />
                  <rect x="14" y="14" width="4" height="8" rx="2" fill="#8ED6C1" />
                </svg>
              </div>
              <div className="highlight-body">
                <h3>Family Legacy</h3>
                <p>From our family to yours — a tradition of warm hospitality spanning years.</p>
              </div>
            </div>
            <div className="highlight-card">
              <div className="icon-wrap pool-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="16" cy="20" rx="10" ry="5" fill="#8ED6C1" />
                  <rect x="12" y="8" width="8" height="10" rx="4" fill="#FDD35C" />
                  <path d="M16 8v10" stroke="#3B5157" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="highlight-body">
                <h3>Signature Pool</h3>
                <p>Enjoy our long, elegant pool crafted for both leisure and family fun.</p>
              </div>
            </div>
            <div className="highlight-card">
              <div className="icon-wrap heart-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 28s-8-6-8-12a8 8 0 0 1 16 0c0 6-8 12-8 12z" fill="#FDD35C" stroke="#E57373" strokeWidth="2" />
                </svg>
              </div>
              <div className="highlight-body">
                <h3>Heartfelt Service</h3>
                <p>Personal, attentive service that makes every guest feel at home.</p>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="container visit-section">
          <motion.div
            className="visit-inner"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">Visit Us in Zambales</h2>
            <p className="body">
              Located along the serene coastline of San Felipe, Liwa-liwa, Zambales, Charkool Beach Resort is a few hours from Metro Manila and the perfect escape for those seeking sun, sea, and a calm shoreline. Plan your trip, enjoy our virtual tour, and arrive knowing you'll be welcomed like family.
            </p>

            <div className="location-row">
              <div className="location-left">
                <h4>📍 Our Location</h4>
                <p className="muted">Liwliwa, San Felipe, Zambales</p>
                <div className="map-links">
                  <a
                    href="https://www.waze.com/live-map/directions/ph/central-luzon/san-felipe/charkool-beach-resort?navigate=yes&to=place.ChIJeVtmpO3TlTMReawZJCvkIsg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link icon-vertical-center"
                  >
                    <span className="icon-label-wrap">
                      <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="32" cy="36" rx="24" ry="18" fill="#33CCFF" />
                        <path d="M44 44c-4-8-16-8-20 0" stroke="#1A2A32" strokeWidth="3" strokeLinecap="round" />
                        <ellipse cx="32" cy="32" rx="12" ry="10" fill="#fff" />
                        <circle cx="27" cy="31" r="2.5" fill="#1A2A32" />
                        <circle cx="37" cy="31" r="2.5" fill="#1A2A32" />
                        <path d="M29 36c1.5 2 5.5 2 7 0" stroke="#1A2A32" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>Waze</span>
                    </span>
                  </a>
                  <a
                    href="https://maps.google.com/?q=Charkool+Beach+Resort"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link icon-vertical-center"
                  >
                    <span className="icon-label-wrap">
                      <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="32" r="30" fill="#fff" />
                        <circle cx="32" cy="32" r="18" fill="#4285F4" />
                        <circle cx="32" cy="32" r="7" fill="#fff" />
                        <circle cx="32" cy="32" r="3" fill="#4285F4" />
                        <path d="M32 2v12" stroke="#EA4335" strokeWidth="2" />
                        <path d="M62 32h-12" stroke="#34A853" strokeWidth="2" />
                        <path d="M32 62V50" stroke="#FBBC05" strokeWidth="2" />
                        <path d="M2 32h12" stroke="#4285F4" strokeWidth="2" />
                      </svg>
                      <span>Google Maps</span>
                    </span>
                  </a>
                </div>
              </div>

              <div className="location-right">
                <div className="card-map">
                  {/* Carousel/Slideshow for resort images */}
                  {(() => {
                    const images = [
                      '/images/background3.jpg',
                      '/images/background4.jpg',
                      '/images/background5.jpg',
                      '/images/background6.jpg',
                      '/images/background7.jpg',
                      '/images/beachfront.jpg',
                      '/images/Pool.jpg',
                      '/images/Loft.jpg',
                      '/images/Villa.jpg',
                      '/images/Tepee.jpg',
                    ];
                    const [currentIndex, setCurrentIndex] = React.useState(0);
                    const timeoutRef = React.useRef(null);

                    React.useEffect(() => {
                      // Auto-slide every 4 seconds
                      timeoutRef.current = setTimeout(() => {
                        setCurrentIndex((prev) => (prev + 1) % images.length);
                      }, 4000);
                      return () => clearTimeout(timeoutRef.current);
                    }, [currentIndex]);

                    const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
                    const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);

                    return (
                      <div className="carousel-container">
                        <div className="carousel-image-wrapper">
                          <Image
                            src={images[currentIndex]}
                            alt="Resort view"
                            width={520}
                            height={320}
                            className="map-img"
                            style={{ borderRadius: '18px', objectFit: 'cover', transition: 'opacity 0.7s' }}
                          />
                          <button className="carousel-nav left" onClick={prevImage} aria-label="Previous image">‹</button>
                          <button className="carousel-nav right" onClick={nextImage} aria-label="Next image">›</button>
                        </div>
                        <div className="carousel-dots">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              className={`carousel-dot${i === currentIndex ? ' active' : ''}`}
                              onClick={() => setCurrentIndex(i)}
                              aria-label={`Go to image ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-social">
            <div className="footer-social-heading">Follow us on Facebook!</div>
            <a
              href="https://www.facebook.com/CharkoolLeisureBeachResort"
              target="_blank"
              rel="noopener noreferrer"
              className="facebook-link minimalist icon-vertical-center"
            >
              <span className="icon-label-wrap">
                <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#4267B2" />
                  <path d="M36 18h-4c-2.2 0-4 1.8-4 4v4h-4v6h4v12h6V32h4l1-6h-5v-4c0-0.6 0.4-1 1-1h4v-6z" fill="#fff" />
                </svg>
                <span>Charkool Leisure Beach Resort </span>
              </span>
            </a>
          </div>
          <div className="footer-line" />
          <p className="copyright">© 2025 Charkool Beach Resort. All Rights Reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        .copyright {
          font-size: 0.9rem;
          color: rgba(18, 50, 56, 0.85);
        }
        .carousel-container {
          position: relative;
          width: 520px;
          max-width: 100%;
          margin: 0 auto;
        }
        .carousel-image-wrapper {
          position: relative;
          width: 100%;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.35);
          color: #fff;
          border: none;
          font-size: 2.2rem;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 2;
        }
        .carousel-nav.left { left: 12px; }
        .carousel-nav.right { right: 12px; }
        .carousel-nav:hover { background: rgba(0,0,0,0.6); }
        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }
        .carousel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #d8d8d8;
          border: none;
          cursor: pointer;
          transition: background 0.3s, transform 0.3s;
        }
        .carousel-dot.active {
          background: #f4ae40;
          transform: scale(1.2);
        }
        @media (max-width: 600px) {
          .carousel-container {
            width: 100%;
          }
          .carousel-image-wrapper {
            height: 180px;
          }
        }
        .icon-vertical-center {
          display: flex;
          align-items: center;
        }
        .icon-label-wrap {
          display: flex;
          align-items: center;
          gap: 8px;

        }
        .footer-social-heading {
          font-size: 1.05rem;
          font-weight: 600;
          color: rgba(18, 50, 56, 0.85);
          margin-bottom: 0.5rem;
        }
        :global(body) {
          margin: 0;
          font-family: "Poppins", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: linear-gradient(180deg, #fffaf0 0%, #fff2d6 100%);
          color: #3b2e12;
        }
        .page-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .hero {
          position: relative;
          height: 40vh;
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(135deg, #fffaf0 0%, #ffd87a 12%, #ffc063 40%, #ff9f3a 100%);
          border-top: none;
        }
        .hero-bg .sun-glow {
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          filter: blur(56px);
          opacity: 0.18;
        }
        .hero-bg .sun-glow.left {
          left: 8%;
          top: 18%;
          background: radial-gradient(circle, rgba(255,243,199,1) 0%, rgba(255,188,85,0.0) 60%);
        }
        .hero-bg .sun-glow.right {
          right: 6%;
          top: 24%;
          background: radial-gradient(circle, rgba(255,243,199,1) 0%, rgba(255,188,85,0.0) 60%);
        }
        .hero-inner {
          position: relative;
          z-index: 2;
          max-width: 980px;
          text-align: center;
          padding: 20px;
        }
        .hero-title {
          font-size: clamp(28px, 4.6vw, 48px);
          margin: 0 0 12px;
          letter-spacing: -0.02em;
          color: #ffffff;
          text-shadow: 0 8px 28px rgba(0,0,0,0.12);
          font-weight: 800;
        }
        .hero-sub {
          margin: 0 0 18px;
          color: rgba(255,255,255,0.95);
          font-size: clamp(15px, 1.6vw, 18px);
          font-weight: 500;
          opacity: 0.95;
        }
        .hero-ctas {
          display: flex;
          gap: 14px;
          justify-content: center;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .hero-wave {
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 0px;
          fill: #fffaf0;
          z-index: 1;
          
        }
        .content {
          flex: 1;
          width: 100%;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 28px;
        }
        .story-section {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 36px;
          align-items: start;
          padding-top: 36px;
          padding-bottom: 56px;
        }
        .story-card {
          background: linear-gradient(180deg, rgba(255,251,242,0.9), rgba(255,249,238,0.9));
          padding: 36px;
          border-radius: 14px;
          box-shadow: 0 18px 36px rgba(22, 32, 51, 0.06);
        }
        .section-title {
          font-size: 28px;
          margin: 0 0 16px;
          color: #6a3510;
          font-weight: 800;
        }
        .lead {
          font-size: 16px;
          color: #3b2e12;
          line-height: 1.8;
          margin-bottom: 14px;
        }
        .body {
          font-size: 15px;
          color: #4a3a2a;
          line-height: 1.75;
        }
        .emph {
          margin-top: 18px;
          font-weight: 700;
          color: #8a4610;
          line-height: 1.6;
        }
        .highlight-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 32px;
          margin-top: 32px;
        }
        .highlight-card {
          background: linear-gradient(135deg, #fffbe6 0%, #e3f6ff 100%);
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(33, 150, 243, 0.10), 0 1.5px 6px rgba(76, 175, 80, 0.08);
          transition: box-shadow 0.25s, transform 0.25s;
          padding: 32px 28px 28px 28px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .highlight-card:hover {
          box-shadow: 0 16px 48px rgba(33, 150, 243, 0.18), 0 3px 12px rgba(76, 175, 80, 0.12);
          transform: translateY(-6px) scale(1.03);
        }
        .icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e3f6ff 0%, #fffbe6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 18px;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.08);
        }
        .highlight-body h3 {
          margin: 0 0 8px;
          color: #2196F3;
          font-size: 20px;
          font-weight: 700;
        }
        .highlight-body p {
          margin: 0;
          color: #4a3a2a;
          font-size: 15px;
          line-height: 1.7;
        }
        .footer-social {
          text-align: center;
          margin-bottom: 1.2rem;
        }
        .facebook-link.minimalist {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #4267B2;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: color 0.2s, transform 0.2s;
        }
        .facebook-link.minimalist:hover {
          color: #123238;
          transform: translateY(-2px) scale(1.08);
        }
        .highlight-body h3 {
          margin: 0 0 6px;
          color: #6a3510;
          font-size: 18px;
          font-weight: 700;
        }
        .highlight-body p {
          margin: 0;
          color: #4a3a2a;
          font-size: 14px;
          line-height: 1.6;
        }
        .visit-section {
          background: linear-gradient(180deg, rgba(255,252,245,0.6), rgba(255,249,238,0.6));
          padding-top: 18px;
          padding-bottom: 56px;
        }
        .visit-inner .section-title {
          margin-bottom: 12px;
        }
        .location-row {
          display: flex;
          gap: 28px;
          align-items: center;
          margin-top: 18px;
        }
        .location-left {
          flex: 1;
        }
        .location-left h4 {
          margin: 0 0 6px;
          color: #6a3510;
        }
        .muted {
          color: #6b5651;
          margin-bottom: 8px;
        }
        .map-links {
          display: flex;
          gap: 12px;
        }
        .map-link {
          display: inline-block;
          background: #fffaf0;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 600;
          color: #6a3510;
          text-decoration: none;
          box-shadow: 0 8px 16px rgba(0,0,0,0.04);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .map-link:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 28px rgba(0,0,0,0.08);
        }
        .location-right .card-map {
          width: 420px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(22,32,51,0.06);
        }
        .map-img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
        }
        .cta-section {
          padding: 56px 28px;
          background: linear-gradient(180deg, #fff1d8 0%, #ffd18b 100%);
          text-align: center;
        }
        .cta-inner {
          max-width: 980px;
          margin: 0 auto;
        }
        .cta-inner h2 {
          font-size: 28px;
          color: #6a3510;
          margin-bottom: 8px;
        }
        .cta-inner p {
          color: #4a3a2a;
          margin-bottom: 22px;
          line-height: 1.7;
        }
        .btn-ghost {
          background: rgba(255,255,255,0.12);
          color: #fff;
          border-radius: 999px;
          padding: 10px 20px;
          font-weight: 600;
        }
        .site-footer {
          background-color: #e8cfa3;
          padding: 28px 20px;
          color: rgba(255,255,255,0.95);
        }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .footer-line {
          height: 1px;
          background: rgba(255,255,255,0.12);
          margin-bottom: 12px;
          
        }
        @media (max-width: 1100px) {
          .story-section {
            grid-template-columns: 1fr;
          }
          .location-right .card-map {
            width: 100%;
          }
          .location-row {
            flex-direction: column-reverse;
            gap: 16px;
          }
        }
        @media (max-width: 720px) {
          .hero {
            height: 48vh;
            padding: 24px;
          }
          .hero-title {
            font-size: 22px;
          }
          .hero-sub {
            font-size: 14px;
          }
          .container {
            padding: 32px 18px;
          }
          .highlight-card {
            padding: 16px;
          }
          .icon-wrap {
            width: 48px;
            height: 48px;
            font-size: 18px;
          }
          .section-title {
            font-size: 20px;
          }
          .lead, .body {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
