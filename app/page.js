'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PromotionPopup from '@/components/PromotionPopup';
import PolicyList from '@/components/PolicyList';
import WelcomeModal from '@/components/WelcomeModal';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const images = [
    '/images/background.jpg',
    '/images/background7.jpg',
    '/images/background4.jpg',
    '/images/background3.jpg',
    '/images/background6.jpg',
    '/images/background5.jpg'
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);

  const [is3DImageLoaded, setIs3DImageLoaded] = useState(false);

  const rooms = [
    { image: '/images/Loft.jpg', title: 'Loft Room', desc: 'Airconditioned · 2 Beds · Mini fridge' },
    { image: '/images/Tepee.jpg', title: 'Tepee Room', desc: 'Airconditioned · 5 Beds · Group Friendly' },
    { image: '/images/Villa.jpg', title: 'Villa Room', desc: 'Airconditioned · 10 Beds · Private Balcony' }
  ];

  const [roomIndex, setRoomIndex] = useState(0);
  const roomTimeoutRef = useRef(null);

  const [promotions, setPromotions] = useState([]);

  const startSlideshow = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsTransitioning(true);
      setPrevIndex(currentIndex);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
  };

  const startRoomSlideshow = () => {
    clearTimeout(roomTimeoutRef.current);
    roomTimeoutRef.current = setTimeout(() => {
      setRoomIndex((prev) => (prev + 1) % rooms.length);
    }, 4000);
  };

  useEffect(() => {
    startSlideshow();
    return () => clearTimeout(timeoutRef.current);
  }, [currentIndex]);

  useEffect(() => {
    startRoomSlideshow();
    return () => clearTimeout(roomTimeoutRef.current);
  }, [roomIndex]);

  useEffect(() => {
    const img3D = new Image();
    img3D.src = '/images/background3.jpg';
    img3D.onload = () => {
      setIs3DImageLoaded(true);
    };
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'customer') {
      router.push('/guest/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const res = await fetch('/api/promotions');
        if (res.ok) {
          const data = await res.json();
          setPromotions(data);
        }
      } catch (error) {
        console.error('Failed to fetch promotions:', error);
      }
    };
    fetchPromotions();
  }, []);

  const handleBookNow = () => {
    if (!session) {
      alert('You must be logged in to book.');
      router.push('/login?redirect=/booking');
    } else {
      router.push('/booking');
    }
  };

  const prevRoom = () => setRoomIndex((prev) => (prev - 1 + rooms.length) % rooms.length);
  const nextRoom = () => setRoomIndex((prev) => (prev + 1) % rooms.length);

  return (
    <>
      <WelcomeModal />
      <div className="landing">
        <header className="hero">
          <div className="background-images-container" aria-hidden>
            {images.map((image, i) => (
              <div
                key={image + i}
              className={`background-image ${i === currentIndex ? 'active' : ''} ${i === prevIndex && isTransitioning ? 'previous' : ''}`}
              onTransitionEnd={() => setIsTransitioning(false)}
            >
              <img src={image} alt="" />
            </div>
          ))}
          <div className="hero-overlay" />
        </div>

        <div className="hero-inner">
          <div className="hero-text">
            <h1>Charkool Beach Resort</h1>
            <p className="sub">Your island escape — where every wave brings new memories.</p>

            <div className="hero-ctas">
              <button onClick={handleBookNow} className="btn primary">Book Now</button>
              <Link href="/room"><button className="btn ghost">Explore Rooms</button></Link>
              <Link href="/virtual-tour"><button className="btn outline">Virtual Tour</button></Link>
            </div>
          </div>
        </div>
      </header>

      <section className="welcome">
        <div className="welcome-inner">
          <h2>Welcome To Charkool Beach Resort</h2>
          <p>
            At Charkool Beach Resort, we believe in creating more than just a place to stay—we offer an escape where chill meets style. Our philosophy is simple: provide a comfortable, welcoming environment where you can truly relax and recharge. We've meticulously designed every aspect of our resort, from the cozy, modern rooms to the sprawling, vibrant landscapes, to ensure your stay is as seamless as it is serene.
          </p>
          <p>
            But what truly sets us apart is the breathtaking scenery. Step outside and you'll find a view that actually deserves an exclamation mark. We are perfectly situated to offer stunning vistas of the pristine beaches and lush, tropical gardens, providing a picturesque backdrop for your entire vacation. Come and experience the paradise we've cultivated just for you.
          </p>
          <Link href="/about-us"><button className="btn ghost-white">About Us →</button></Link>
        </div>
      </section>

      <section className="explore-3d">
        <img
          src="/images/background3.jpg"
          alt=""
          className={`explore-bg ${is3DImageLoaded ? 'loaded' : ''}`}
        />
        <div className="explore-overlay"></div>
        <div className="explore-inner">
          <h2>Explore using 3D</h2>
          <p className="explore-note">Take a virtual walk through our resort — check rooms, amenities, and layout before you arrive.</p>
          <Link href="/virtual-tour"><button className="btn primary big">Start 3D Tour</button></Link>
        </div>
      </section>

     <motion.section
        className="rooms"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
      >
        <div className="rooms-inner">
          <h3 className="rooms-title">Explore Our Rooms</h3>
          <div className="room-carousel">
            <div className="room-slides" style={{ transform: `translateX(-${roomIndex * 100}%)` }}>
              {rooms.map((r, i) => (
                <div className="room-slide" key={i}>
                  <img src={r.image} alt={r.title} className="room-image" />
                  <div className="room-info">
                    <h4>{r.title}</h4>
                    <p>{r.desc}</p>
                    <Link href="/room"><button className="see-room">See Room</button></Link>
                  </div>
                </div>
              ))}
            </div>
            <button className="nav-btn left" onClick={prevRoom}>‹</button>
            <button className="nav-btn right" onClick={nextRoom}>›</button>
            <div className="dots">
              {rooms.map((_, i) => (
                <button key={i} className={`dot ${i === roomIndex ? 'active' : ''}`} onClick={() => setRoomIndex(i)} />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <section className="policies">
        <div className="policies-inner card">
          <h2>Resort Policies</h2>
          <p className="muted">Rules and regulations — quick, clear, and fair.</p>

          <PolicyList />
        </div>
      </section>

    <footer className="site-footer">
  <div className="footer-top">
    <div className="footer-about">
      <h3>Charkool Beach Resort</h3>
      <p>Your island escape — where every wave brings new memories.</p>

      <div className="location-section">
        <h4>Follow us on facebook!</h4>
        <a
          href="https://www.facebook.com/CharkoolLeisureBeachResort"
          target="_blank"
          rel="noopener noreferrer"
          className="facebook-link"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="facebook-icon"
          >
            <path d="M22.675 0h-21.35C.597 0 0 .597 0 
              1.326v21.348C0 23.403.597 24 1.326 
              24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 
              1.893-4.788 4.659-4.788 1.325 0 
              2.464.099 2.796.143v3.24l-1.92.001c-1.505 
              0-1.796.716-1.796 1.765v2.315h3.587l-.467 
              3.622h-3.12V24h6.116C23.403 24 24 
              23.403 24 22.674V1.326C24 .597 23.403 
              0 22.675 0z" />
          </svg>
          <span>Charkool Leisure Beach Resort</span>
        </a>
      </div>

      <div className="location-section">
        <h4>Our Location</h4>
        <div className="location-links">
          <a
            href="https://www.waze.com/live-map/directions/ph/central-luzon/san-felipe/charkool-beach-resort?navigate=yes&to=place.ChIJeVtmpO3TlTMReawZJCvkIsg"
            target="_blank"
            rel="noopener noreferrer"
            className="location-link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 512 512"
              fill="#33CCFF"
            >
              <path d="M256 32C132.3 32 32 132.3 32 256c0 46.5 14.3 89.7 38.7 125.3C92 408.5 115 427.5 139 441c10 5.5 20.5 10 31.5 13.5 14.5 4.5 29.5 7 45 7 18.5 0 36.5-3 53.5-8.5 46.5-15 85.5-47 108-88 9-16 14.5-34 14.5-53 0-61.5-50-111.5-111.5-111.5-17.5 0-34.5 4.5-49.5 12.5-5.5 3-11.5 6.5-16.5 10.5-1.5 1.5-3 2-4.5 2-3.5 0-6.5-3-6.5-6.5v-17.5c0-3.5 2-6.5 5.5-8 22.5-9.5 46-14.5 70-14.5 79.5 0 144 64.5 144 144 0 25.5-6.5 50-17.5 71.5-22 42-61 75.5-108.5 91.5-19 6.5-39 10-60 10-26 0-51-5-74-15.5-31-14-57.5-36-77-63-28.5-38.5-45-86-45-137.5C32 132.3 132.3 32 256 32z" />
            </svg>
            <span>Waze</span>
          </a>

          <a
            href="https://maps.google.com/?q=Charkool+Beach+Resort"
            target="_blank"
            rel="noopener noreferrer"
            className="location-link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 384 512"
              fill="#4285F4"
            >
              <path d="M168 0C75.2 0 0 75.2 0 168c0 86.4 152 344 168 344s168-257.6 168-344C336 75.2 260.8 0 168 0zM168 232c-35.3 0-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64z" />
            </svg>
            <span>Google Maps</span>
          </a>
        </div>
      </div>
    </div>

   <div className="footer-links modern-footer-links">
  <h4>Quick Links</h4>
  <ul className="modern-links">
    <li>
      <Link href="/room">
        <div className="link-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 10V21H20V10L12 3L4 10ZM6 11.5L12 6L18 11.5V19H6V11.5Z" />
          </svg>
          <span>Rooms</span>
        </div>
      </Link>
    </li>
    <li>
      <Link href="/virtual-tour">
        <div className="link-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 3H3V17H7V21L12 17H21V3Z" />
          </svg>
          <span>3D Tour</span>
        </div>
      </Link>
    </li>
    <li>
      <Link href="/about-us">
        <div className="link-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" />
          </svg>
          <span>About</span>
        </div>
      </Link>
    </li>
  </ul>
</div>

    <div className="footer-contact">
      <h4>Contact</h4>
      <p>📍 Liwliwa, San Felipe, Zambales 2204</p>
      <p>📞 +63 967 217 6539</p>
      <p>📧 contact@charkoolbeachresort.com</p>
    </div>
  </div>

  <div className="footer-bottom">
    <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
  </div>
</footer>
      <PromotionPopup promotions={promotions} />
      <style jsx>{`
         :global(body) {
    margin: 0;
    font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: linear-gradient(90deg, #FDD35C 0%, #F9F5D0 100%);
  }
     .about-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    color: #2e2e2e;
  }
        .landing {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          color: #222;
          background: #fff;
        }
        .hero {
          position: relative;
          height: 92vh;
          min-height: 640px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: white;
          background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.22));
        }
        .background-images-container {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .background-image {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: translateX(0);
          transition: opacity 1s ease-in-out, transform 1s ease-in-out;
          will-change: opacity, transform;
        }
        .background-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .background-image.active {
          opacity: 1;
          z-index: 1;
        }
        .background-image.previous {
          opacity: 0;
          transform: translateX(-8%);
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(6, 40, 61, 0.35), rgba(6, 40, 61, 0.55));
          z-index: 2;
        }
        .hero-inner {
          position: relative;
          z-index: 3;
          width: 100%;
          padding: 3rem 1.5rem;
          display: flex;
          justify-content: center;
        }
        .hero-text {
          max-width: 980px;
          text-align: left;
          padding: 2.5rem;
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
          border-radius: 10px;
        }
        .hero h1 {
          margin: 0 0 0.6rem 0;
          font-size: clamp(28px, 4.6vw, 52px);
          line-height: 1.02;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .hero .sub {
          margin: 0 0 1.2rem 0;
          color: rgba(255,255,255,0.92);
          font-size: clamp(14px, 1.6vw, 18px);
        }
        .hero-ctas {
          display: flex;
          gap: 14px;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .btn {
          border: 0;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .btn.primary { background: #FEBE54; color: #102a2a; }
        .btn.ghost { background: rgba(255,255,255,0.12); color: white; }
        .btn.outline { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: white; }
        .btn.big { padding: 14px 28px; font-size: 1.05rem; }
        .btn.ghost-white {
          background: white;
          color: #0b3a4a;
          padding: 12px 28px;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 999px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .btn.ghost-white:hover {
          background: #f8f8f8;
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
          color: #05324b;
        }
        .btn:hover { opacity: 0.95; transform: translateY(-2px); transition: 180ms; }
        .welcome {
          position: relative;
          color: #0b3a4a;
          padding: 100px 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          text-align: center;
          min-height: 480px;
          background: linear-gradient(180deg, #eef4f8 0%, #f6f8fb 100%);
        }
        .welcome-inner {
          position: relative;
          z-index: 1;
          max-width: 920px;
          width: 100%;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .welcome-inner h2 {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: clamp(32px, 4vw, 56px);
          margin: 0 0 20px 0;
          font-weight: 700;
          color: #0b3a4a;
          line-height: 1.2;
        }
        .welcome-inner p {
          font-size: clamp(1rem, 1.3vw, 1.15rem);
          line-height: 1.6;
          max-width: 780px;
          margin: 0 auto 30px auto;
          color: #3b5157;
        }
        .welcome-bg, .welcome-overlay {
          display: none;
        }
        .explore-3d {
          position: relative;
          color: white;
          padding: 100px 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 0;
        }
        .explore-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: -2;
          opacity: 0;
          transition: opacity 0.7s ease-in-out;
        }
        .explore-bg.loaded {
          opacity: 1;
        }
        .explore-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.7));
          z-index: -1;
        }
        .explore-inner {
          position: relative;
          z-index: 1;
          max-width: 920px;
          text-align: center;
          padding: 50px;
        }
        .explore-inner h2 {
          margin: 0 0 8px 0;
          font-size: clamp(22px, 3.4vw, 36px);
          color: #fff;
          text-shadow: 0 6px 18px rgba(0,0,0,0.6);
        }
        .explore-note {
          color: #f0f0f0;
          margin: 0 0 24px 0;
          font-size: 1.1rem;
        }
        .rooms {
          background: #f9fafb;
          padding: 140px 40px 150px; /* increased bottom padding to give breathing room before policies */
        }
        .rooms-inner {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .rooms-title {
          margin-bottom: 60px;
          font-size: 2.6rem;
          font-weight: 800;
          color: #2b1f12;
        }
        .room-carousel {
          position: relative;
          overflow: hidden;
          max-width: 1000px;
          margin: 0 auto;
          border-radius: 18px;
          box-shadow: 0 10px 26px rgba(0,0,0,0.08);
        }
        .room-slides {
          display: flex;
          transition: transform 0.6s ease-in-out;
        }
        .room-slide {
          flex: 0 0 100%;
          position: relative;
          background: #fff;
        }
        .room-image {
          width: 100%;
          height: 460px;
          object-fit: cover;
          object-position: center;
          transform: scale(0.98);
        }
        .room-info {
          padding: 24px;
          text-align: center;
        }
        .room-info h4 {
          font-size: 1.6rem;
          margin-bottom: 10px;
          color: #0b3a4a;
        }
        .room-info p {
          color: #4a6a6a;
          font-size: 1rem;
          margin-bottom: 16px;
        }
        .see-room {
          padding: 12px 22px;
          background: #f4ae40;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .see-room:hover {
          background: #d8922e;
          transform: scale(1.05);
          box-shadow: 0 6px 14px rgba(0,0,0,0.15);
        }
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.4);
          color: #fff;
          border: none;
          font-size: 2.2rem;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          transition: 0.3s;
        }
        .nav-btn:hover { background: rgba(0,0,0,0.6); }
        .nav-btn.left { left: 16px; }
        .nav-btn.right { right: 16px; }
        .dots {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 18px 0 0;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #d8d8d8;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }
        .dot.active { background: #f4ae40; transform: scale(1.2); }
        @media (max-width: 1024px) {
          .room-image { height: 380px; }
        }
        @media (max-width: 768px) {
          .rooms { padding: 100px 20px 70px; }
          .room-image { height: 280px; }
          .rooms-title { font-size: 2rem; margin-bottom: 40px; }
        }
        @media (max-width: 520px) {
          .nav-btn { display: none; }
          .room-image { height: 220px; }
          .rooms-title { font-size: 1.8rem; }
        }
        .policies {
          background: #f6f8fa;
          padding: 80px 30px; /* slightly increased top padding to separate from rooms */
          display: flex;
          justify-content: center;
        }
        .policies-inner {
          max-width: 1000px;
          width: 100%;
          text-align: left;
        }
        /* card treatment so policies feel separated from the content above */
        .policies-inner.card {
          background: white;
          border-radius: 14px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(12, 40, 60, 0.08);
          transform: translateY(-28px);
        }
        .policies h2 {
          margin: 0 0 12px 0;
          color: #0b3a4a;
          font-size: 1.35rem;
        }
        .policies .muted {
          margin: 12px 0 28px 0;
          color: #546b72;
          font-size: 0.95rem;
        }
        .policy-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px 24px;
          justify-content: center;
        }
        .policy-list details {
          background: white;
          padding: 14px 16px;
          border-radius: 6px;
          margin-bottom: 10px;
          border: 1px solid #e6eaec;
          transition: all 0.3s ease-in-out;
        }
        .policy-list details:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .policy-list summary {
          cursor: pointer;
          list-style: none;
          font-weight: 600;
          color: #0b3a4a;
          outline: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .policy-list summary .icon {
          position: relative;
          width: 20px;
          height: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.3s ease-in-out;
        }
        .policy-list summary .icon::before,
        .policy-list summary .icon::after {
          content: '';
          position: absolute;
          background-color: #0b3a4a;
          transition: transform 0.3s ease-in-out;
        }
        .policy-list summary .icon::before {
          width: 2px;
          height: 12px;
        }
        .policy-list summary .icon::after {
          width: 12px;
          height: 2px;
        }
        .policy-list details[open] summary .icon {
          transform: rotate(90deg);
        }
        .policy-list details[open] summary .icon::before {
          transform: scaleY(0);
        }
        .policy-list .detail-body {
          margin-top: 10px;
          color: #3b5157;
          line-height: 1.5;
          font-size: 0.95rem;
          padding-right: 20px;
        }
        @media (max-width: 900px) {
          .policy-list {
            grid-template-columns: 1fr;
          }
        }
        .site-footer {
  background: #e8cfa3;
  color: #123238;
  padding: 60px 20px 30px;
}
.footer-top {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 40px;
  align-items: start;
}
.footer-about h3,
.footer-links h4,
.footer-contact h4 {
  margin: 0 0 12px 0;
  font-weight: 700;
}
.footer-about p,
.footer-contact p {
  margin: 6px 0;
  font-size: 0.95rem;
  line-height: 1.6;
}
.modern-footer-links {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modern-footer-links h4 {
  margin-bottom: 12px;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #0b3a4a;
}

.modern-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  gap: 24px;
  flex-wrap: wrap;
}

.link-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #123238;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.link-item::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(254,190,84,0.4), transparent 70%);
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.4s ease;
  border-radius: 50%;
  z-index: 0;
}

.link-item svg,
.link-item span {
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
  opacity: 0.85;
}

.link-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px) scale(1.02);
}

.link-item:hover::before {
  opacity: 1;
  transform: scale(1);
}

.link-item:hover svg {
  transform: scale(1.3);
  opacity: 1;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}

.link-item:hover span {
  color: #FEBE54;
}

@media (max-width: 768px) {
  .modern-links {
    flex-direction: column;
    gap: 12px;
  }
  .link-item {
    font-size: 0.95rem;
    padding: 8px 12px;
  }
}

@media (max-width: 768px) {
  .modern-links {
    flex-direction: column; /* vertical on mobile */
    gap: 12px;
  }
  .link-item {
    font-size: 0.95rem;
    padding: 8px 12px;
  }
}

@media (max-width: 768px) {
  .modern-footer-links {
    align-items: flex-start;
  }
  .link-item {
    font-size: 0.95rem;
    padding: 8px 12px;
  }
}
.location-section {
  margin-top: 18px;
}

.location-section h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.location-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.location-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  text-decoration: none;
  color: #123238;
  font-weight: 600;
  transition: transform 0.2s ease;
}

.location-link:hover {
  transform: translateY(-2px);
  opacity: 0.8;
}

.location-link svg {
  width: 22px;
  height: 22px;
}

.facebook-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #123238;
  text-decoration: none;
  font-weight: 600;
  margin-top: 8px;
  transition: transform 0.2s ease, color 0.2s ease;
}

.facebook-link:hover {
  color: #4267B2;
  transform: translateY(-2px);
}

.facebook-icon {
  color: #4267B2;
  transition: transform 0.2s ease;
}

.facebook-link:hover .facebook-icon {
  transform: scale(1.15);
}
.footer-bottom {
  max-width: 1200px;
  margin: 40px auto 0;
  text-align: center;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 20px;
  font-size: 0.9rem;
  color: rgba(18, 50, 56, 0.85);
}
@media (max-width: 600px) {
  .site-footer {
    padding: 40px 16px 20px;
  }
  .footer-top {
    gap: 24px;
  }
  .footer-about h3 {
    font-size: 1.2rem;
  }
}

        }
        @media (max-width: 900px) {
          .hero-text { padding: 18px; }
          .hero { height: auto; min-height: 640px; padding: 48px 0; }
          .footer-top { gap: 18px; }
        }
        @media (max-width: 520px) {
          .hero h1 { font-size: 28px; }
          .hero .sub { font-size: 14px; }
          .explore-3d { padding: 48px 14px; }
          .welcome { padding: 48px 14px; min-height: 380px; }
          .welcome-inner h2 { font-size: 28px; }
          .welcome-inner p { font-size: 0.95rem; }
        }
      `}</style>
      </div>
    </>
  );
}
