'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

  const startSlideshow = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsTransitioning(true);
      setPrevIndex(currentIndex);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
  };

  useEffect(() => {
    startSlideshow();
    return () => clearTimeout(timeoutRef.current);
  }, [currentIndex]);

  useEffect(() => {
    const img3D = new Image();
    img3D.src = '/images/background3.jpg';
    img3D.onload = () => {
      setIs3DImageLoaded(true);
    };
  }, []);

  const handleBookNow = () => {
    if (!session) {
      alert('You must be logged in to book.');
      router.push('/login?redirect=/booking');
    } else {
      router.push('/booking');
    }
  };

  return (
    <div className="landing">
      {/* HERO / carousel */}
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
            <p className="sub">Experience paradise with luxury rooms, pristine beaches, and world-class tour.</p>

            <div className="hero-ctas">
              <button onClick={handleBookNow} className="btn primary">Book Now</button>
              <Link href="/room"><button className="btn ghost">Explore Rooms</button></Link>
              <Link href="/virtual-tour"><button className="btn outline">Virtual Tour</button></Link>
            </div>
          </div>
        </div>
      </header>

      {/* WELCOME / About Us */}
      <section className="welcome">
        <div className="welcome-inner">
          <h2>Welcome To Charkool Beach Resort</h2>
          <p>
            At Charkool Beach Resort, we believe in creating more than just a place to stay—we offer an escape where chill meets style. Our philosophy is simple: provide a comfortable, welcoming environment where you can truly relax and recharge. We've meticulously designed every aspect of our resort, from the cozy, modern rooms to the sprawling, vibrant landscapes, to ensure your stay is as seamless as it is serene.
          </p>
          <p>
            But what truly sets us apart is the breathtaking scenery. Step outside and you'll find a view that actually deserves an exclamation mark. We are perfectly situated to offer stunning vistas of the pristine beaches and lush, tropical gardens, providing a picturesque backdrop for your entire vacation. Come and experience the paradise we've cultivated just for you.
          </p>
          <Link href="/about"><button className="btn ghost-white">About Us →</button></Link>
        </div>
      </section>

      {/* EXPLORE USING 3D */}
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

      {/* EXPLORE OUR ROOMS */}
      <motion.section
  className="rooms"
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
  viewport={{ once: true }}
>
  <div className="rooms-inner">
  <h3 className="rooms-title">Explore Our Rooms</h3>
  <div className="room-gallery">
    <div className="room-card">
      <img src="/images/Loft.jpg" alt="Loft Room" />
      <div className="room-meta">
        <h4>Loft Room</h4>
        <p>·Airconditioned · 2 Bed · Mini fridge</p>
        <Link href="/room"><button className="see-room">See Room</button></Link>
      </div>
    </div>
    <div className="room-card">
      <img src="/images/Tepee.jpg" alt="Tepee Room" />
      <div className="room-meta">
        <h4>Tepee Room</h4>
        <p>Airconditioned · 5 Beds · Group Friendly</p>
        <Link href="/room"><button className="see-room">See Room</button></Link>
      </div>
    </div>
    <div className="room-card">
      <img src="/images/Villa.jpg" alt="Villa Room" />
      <div className="room-meta">
        <h4>Villa Room</h4>
        <p>Airconditioned · 10 Beds · Private Balcony</p>
        <Link href="/room"><button className="see-room">See Room</button></Link>
      </div>
    </div>
  </div>
</div>
</motion.section>


      {/* POLICIES */}
      <section className="policies">
        <div className="policies-inner">
          <h2>Resort Policies</h2>
          <p className="muted">Rules and regulations — quick, clear, and fair.</p>

          <div className="policy-list">
            <details>
              <summary>Check-in and Check-out Times</summary>
              <div className="detail-body">
                <p>Check-in from 2:00 PM. Check-out by 12:00 PM. Early check-in or late check-out may be available on request.</p>
              </div>
            </details>

            <details>
              <summary>Cancellations and Refunds</summary>
              <div className="detail-body">
                <p>Free cancellation up to 48 hours before arrival. Refunds processed within 7-10 business days.</p>
              </div>
            </details>

            <details>
              <summary>Corkage Policy</summary>
              <div className="detail-body">
                <p>Outside alcohol is allowed with a corkage fee; please check with reception for current rates and restrictions.</p>
              </div>
            </details>

            <details>
              <summary>Damage Liability</summary>
              <div className="detail-body">
                <p>Guests are responsible for damage to property caused by negligence. Charges will be applied as needed.</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-about">
            <h3>Charkool Beach Resort</h3>
            <p>Relax, explore, and make memories. Located on Paradise Island.</p>
            <div className="location-section">
              <h4>Location:</h4>
              <div className="location-links">
                <a href="https://www.waze.com/live-map/directions/ph/central-luzon/san-felipe/charkool-beach-resort?to=place.ChIJeVtmpO3TlTMReawZJCvkIsg" target="_blank" rel="noopener noreferrer" className="location-link">
                  <img src="/waze.svg" alt="Waze" className="location-icon" />
                  <span>Waze</span>
                </a>
                <a href="https://www.google.com/maps/place/Charkool+Beach+Resort/@15.0432466,120.0557804,17z/data=!3m1!4b1!4m6!3m5!1s0x3395d3eda4665b79:0xc822e42b2419ac79!8m2!3d15.0432414!4d120.0583607!16s%2Fg%2F11lgrrh93b?entry=ttu&g_ep=EgoyMDI1MDkyNC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="location-link">
                  <img src="/google-maps.svg" alt="Google Maps" className="location-icon" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link href="/room">Rooms</Link></li>
              <li><Link href="/virtual-tour">3D Tour</Link></li>
              <li><Link href="/about">About</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Contact</h4>
            <p>📍 Paradise Island</p>
            <p>📞 +63 912 345 6789</p>
            <p>📧 contact@charkoolbeachresort.com</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        /* ---------- Global ---------- */
        :global(body) {
          margin: 0;
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .landing {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          color: #222;
          background: #fff;
        }

        /* ---------- HERO / Carousel ---------- */
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
        
        /* Updated button styles */
        .btn.ghost-white {
          background: white; /* Solid white background */
          color: #0b3a4a; /* Dark text color */
          padding: 12px 28px; /* More padding for a larger pill shape */
          border: 1px solid rgba(0,0,0,0.1); /* Subtle light border */
          border-radius: 999px; /* Very high border-radius for pill shape */
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          display: inline-flex; /* Use inline-flex for proper content alignment and centering */
          align-items: center;
          gap: 8px;
          text-decoration: none; /* Ensure no underline from Link */
          transition: all 0.2s ease-in-out; /* Smooth transitions for hover */
          box-shadow: 0 4px 12px rgba(0,0,0,0.08); /* Soft shadow */
        }
        .btn.ghost-white:hover {
          background: #f8f8f8; /* Slightly darker on hover */
          transform: translateY(-2px) scale(1.02); /* Lift and slightly enlarge */
          box-shadow: 0 6px 16px rgba(0,0,0,0.12); /* Slightly more prominent shadow */
          color: #05324b; /* Darker text on hover */
        }

        .btn:hover { opacity: 0.95; transform: translateY(-2px); transition: 180ms; }
        /* Keep existing hover for other buttons if they need it */


        /* ---------- WELCOME / About Us Section ---------- */
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
          background: linear-gradient(
            180deg, 
            #eef4f8 0%, 
            #f6f8fb 100%
          );
        }
        
        .welcome-inner {
          position: relative;
          z-index: 1;
          max-width: 920px;
          width: 100%;
          padding: 30px;
          /* Removed background and blur for a cleaner look as per button style */
          /* background: rgba(255, 255, 255, 0.7); */
          /* backdrop-filter: blur(10px); */
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          /* Added display flex and center for the button */
          display: flex;
          flex-direction: column;
          align-items: center; /* Centers items horizontally */
          justify-content: center; /* Centers items vertically if height allows */
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
          margin: 0 auto 30px auto; /* Centering the paragraph */
          color: #3b5157;
        }

        .welcome-bg, .welcome-overlay {
          display: none;
        }

        /* ---------- EXPLORE 3D ---------- */
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

        /* ---------- ROOMS ---------- */
        .rooms {
  background: #f9fafb;
  padding: 80px 40px;
}

.rooms-inner {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.rooms-title {
  margin: 0 0 48px 0;
  color: #2b1f12;
  font-size: 2.5rem;
  font-weight: 800;
  text-align: center;
}

.room-gallery {
  display: flex;
  justify-content: center;
  gap: 48px;
  flex-wrap: wrap;
}

.room-card {
  flex: 1 1 320px;
  max-width: 380px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  margin-bottom: 40px;
}


.room-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.18);
}

.room-card img {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.room-meta {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.room-meta h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #102a2a;
}

.room-meta p {
  margin: 0;
  font-size: 1rem;
  color: #4a6a6a;
}

.see-room {
  margin-top: 10px;
  padding: 12px 20px;
  background: #f4ae40;
  border: none;
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.25s ease;
}

.see-room:hover {
  background: #d8922e;
  transform: scale(1.05);
  box-shadow: 0 6px 14px rgba(0,0,0,0.15);
  color: #000;
}



@media (max-width: 768px) {
  .rooms-title {
    font-size: 2rem;
  }

  .room-card img {
    height: 180px;
  }
}

@media (max-width: 520px) {
  .rooms-title {
    font-size: 1.6rem;
  }

  .room-card img {
    height: 160px;
  }
}



        /* ---------- POLICIES ---------- */
.policies {
  background: #f6f8fa;
  padding: 60px 30px;
  display: flex;
  justify-content: center;
}
.policies-inner {
  max-width: 880px;
  width: 100%;
  text-align: left;
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
  list-style: none; /* Hide the default triangle/arrow */
  font-weight: 600;
  color: #0b3a4a;
  outline: none;
  display: flex; /* Use flexbox to align content and icon */
  justify-content: space-between; /* Push content and icon to opposite ends */
  align-items: center; /* Vertically center them */
}

/* Styles for the animated plus/minus icon */
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

/* Vertical line of the plus icon */
.policy-list summary .icon::before {
  width: 2px;
  height: 12px;
}

/* Horizontal line of the plus icon */
.policy-list summary .icon::after {
  width: 12px;
  height: 2px;
}

/* Rotate the icon when the details element is open to create the minus sign */
.policy-list details[open] summary .icon {
  transform: rotate(90deg); /* This rotation creates a minus sign */
}

/* Scale the vertical bar to 0 when open, leaving only the horizontal bar */
.policy-list details[open] summary .icon::before {
  transform: scaleY(0);
}

.policy-list .detail-body {
  margin-top: 10px;
  color: #3b5157;
  line-height: 1.5;
  font-size: 0.95rem;
  padding-right: 20px; /* Add some space so the text isn't too close to the edge */
}

/* Responsiveness adjustments for a single column on smaller screens */
@media (max-width: 900px) {
  .policy-list {
    grid-template-columns: 1fr;
  }
}

        /* ---------- FOOTER ---------- */
        .site-footer {
          background: #e8cfa3;
          padding: 36px 20px 18px 20px;
          color: #123238;
        }
        .footer-top {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          gap: 40px;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .footer-about, .footer-links, .footer-contact {
          min-width: 220px;
        }
        .footer-about h3 {
          margin: 0 0 8px 0;
        }
        .footer-links ul {
          padding: 0;
          margin: 6px 0 0 0;
          list-style: none;
        }
        .footer-links li {
          margin: 6px 0;
        }
        .footer-links a, .footer-contact p {
          color: inherit;
          text-decoration: none;
        }

        .location-section {
          margin-top: 20px;
        }
        .location-section h4 {
          margin: 0 0 8px 0;
          font-size: 1rem;
          font-weight: 600;
        }
        .location-links {
          display: flex;
          gap: 16px;
        }

        .location-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: inherit;
          text-decoration: none;
        }

        .location-icon {
          width: 20px;
          height: 20px;
        }

        .footer-bottom {
          max-width: 1100px;
          margin: 18px auto 0;
          text-align: center;
          color: rgba(18,50,56,0.85);
          font-size: 0.95rem;
        }

        /* ---------- Responsiveness ---------- */
        @media (max-width: 900px) {
          .hero-text { padding: 18px; }
          .hero { height: auto; min-height: 640px; padding: 48px 0; }
          .footer-top { gap: 18px; }
          .room-gallery { gap: 12px; overflow-x: auto; padding-bottom: 8px; }
          .policy-list { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .hero h1 { font-size: 28px; }
          .hero .sub { font-size: 14px; }
          .explore-3d { padding: 48px 14px; }
          .welcome { padding: 48px 14px; min-height: 380px; }
          .welcome-inner h2 { font-size: 28px; }
          .welcome-inner p { font-size: 0.95rem; }
          .room-card { width: 200px; }
        }
      `}</style>
    </div>
  );
}
