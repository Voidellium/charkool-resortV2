'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PromotionPopup from '@/components/PromotionPopup';
import PolicyList from '@/components/PolicyList';
import WelcomeModal from '@/components/WelcomeModal';
import { Playfair_Display, Manrope } from 'next/font/google';
import { FaUsers, FaSnowflake, FaBed, FaWifi, FaSwimmingPool, FaFire, FaUtensils } from 'react-icons/fa';

// Premium font pairing: elegant display + modern sans
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});
const sans = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

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
    {
      id: 'loft',
      name: 'Loft Room',
      shortDescription: 'Comfortable and cozy room ideal for solo travelers or couples.',
      description:
        'Perfect for couples or small groups, our Loft Room offers comfort and convenience. Enjoy a cozy stay with easy access to the pool and grilling area for a relaxing getaway.',
      capacity: 'Up to 2-3 pax',
      amenities: [
        { icon: <FaSnowflake />, label: 'Airconditioned' },
        { icon: <FaBed />, label: '2 Beds' },
        { icon: <FaUtensils />, label: 'Mini Fridge' },
        { icon: <FaWifi />, label: 'Wi-Fi Access' },
        { icon: <FaSwimmingPool />, label: 'Pool Access' },
        { icon: <FaFire />, label: 'Grill Access' }
      ],
      images: ['/images/Loft.jpg', '/images/LoftInterior1.jpg', '/images/LoftInterior2.jpg']
    },
    {
      id: 'tepee',
      name: 'Tepee Room',
      shortDescription: 'Perfect for groups and friends.',
      description:
        'Designed for larger groups, the Tepee Room blends comfort and space for a memorable stay. Ideal for group or barkada trips, complete with cooking facilities and a private grilling area.',
      capacity: 'Up to 5 pax',
      amenities: [
        { icon: <FaSnowflake />, label: 'Airconditioned' },
        { icon: <FaBed />, label: '5 Beds' },
        { icon: <FaUtensils />, label: 'Mini Fridge' },
        { icon: <FaWifi />, label: 'Wi-Fi Access' },
        { icon: <FaSwimmingPool />, label: 'Pool Access' },
        { icon: <FaUtensils />, label: 'Gas and Stove' },
        { icon: <FaFire />, label: 'Grill Access' }
      ],
      images: ['/images/Tepee.jpg', '/images/TepeeInterior1.jpg', '/images/TepeeInterior2.jpg']
    },
    {
      id: 'villa',
      name: 'Villa Room',
      shortDescription: 'Spacious room with a balcony and luxurious amenities for families.',
      description:
        'Our spacious Villa offers the ultimate group experience, perfect for family gatherings or company outings. With a full kitchen, multiple beds, and direct access to resort amenities, it\'s your home away from home.',
      capacity: 'Up to 10 pax',
      amenities: [
        { icon: <FaSnowflake />, label: 'Airconditioned' },
        { icon: <FaBed />, label: '10 Beds (5 Double Decks)' },
        { icon: <FaUtensils />, label: 'Full-Size Fridge' },
        { icon: <FaWifi />, label: 'Wi-Fi Access' },
        { icon: <FaSwimmingPool />, label: 'Pool Access' },
        { icon: <FaUtensils />, label: 'Gas and Stove' },
        { icon: <FaFire />, label: 'Grill Access' }
      ],
      images: ['/images/Villa.jpg', '/images/VillaInterior1.jpg', '/images/VillaInterior2.jpg']
    }
  ];

  const [roomIndex, setRoomIndex] = useState(0);
  const roomTimeoutRef = useRef(null);

  // Modal state for room details
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [promotions, setPromotions] = useState([]);
  // Footer inquiry state
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);

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
    // Role-based redirection for authenticated users
    if (session?.user?.role) {
      const role = session.user.role;
      switch (role) {
        case 'CUSTOMER':
          router.push('/guest/dashboard');
          break;
        case 'SUPERADMIN':
          router.push('/super-admin/dashboard');
          break;
        case 'ADMIN':
          router.push('/admin/dashboard');
          break;
        case 'RECEPTIONIST':
          router.push('/receptionist');
          break;
        case 'CASHIER':
          router.push('/cashier');
          break;
        case 'AMENITYINVENTORYMANAGER':
          router.push('/amenityinventorymanager');
          break;
        default:
          // Unknown role, stay on landing page
          break;
      }
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
    } else if (session.user.role !== 'CUSTOMER') {
      alert('Only customers can make bookings. Please contact the front desk if you need assistance.');
    } else {
      router.push('/booking');
    }
  };

  const prevRoom = () => setRoomIndex((prev) => (prev - 1 + rooms.length) % rooms.length);
  const nextRoom = () => setRoomIndex((prev) => (prev + 1) % rooms.length);

  // Modal functions
  const openRoom = (room) => {
    setSelectedRoom(room);
  };
  const closeRoom = () => {
    setSelectedRoom(null);
    setSelectedImage(null);
  };

  // Send inquiry to super admin
  const submitInquiry = async (e) => {
    e?.preventDefault?.();
    const message = inquiryMessage.trim();
    if (!message) return;
    try {
      setIsSendingInquiry(true);
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send');
      }
      setInquiryMessage('');
      alert('Thanks! Your message was sent to our super admin.');
    } catch (err) {
      console.error('Inquiry error', err);
      alert('Sorry, we could not send your message. Please try again later.');
    } finally {
      setIsSendingInquiry(false);
    }
  };

  return (
    <>
      <WelcomeModal />
      <div className="landing">
        <header className={`hero ${display.variable} ${sans.variable}`}>
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

  <section className={`explore-3d ${display.variable} ${sans.variable}`}>
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
      id="rooms"
      className={`rooms ${display.variable} ${sans.variable}`}
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
                <div className={`room-slide ${i === roomIndex ? 'active' : ''}`} key={i}>
                  <img src={r.images[0]} alt={r.name} className="room-image" />
                  <div className="room-info">
                    <h4>{r.name}</h4>
                    <button className="see-room" onClick={() => openRoom(r)}>See Room</button>
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
          <PolicyList />
        </div>
      </section>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeRoom}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="image-gallery">
              {selectedRoom.images.map((img, idx) => (
                <img key={idx} src={img} alt={`${selectedRoom.name} image ${idx + 1}`} onClick={() => setSelectedImage(img)} style={{ cursor: 'pointer' }} />
              ))}
            </div>
            <h2>{selectedRoom.name}</h2>
            <p className="capacity"><FaUsers /> {selectedRoom.capacity}</p>
            <p className="description">{selectedRoom.description}</p>
            <ul className="amenities">
              {selectedRoom.amenities.map((amenity, idx) => (
                <li key={idx} className="amenity-item">
                  <span className="icon">{amenity.icon}</span> {amenity.label}
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="book-room-btn" onClick={handleBookNow} aria-label="Proceed to booking">
                <span className="btn-shine" aria-hidden="true"></span>
                Book This Room
              </button>
              <button className="close-btn" onClick={closeRoom} aria-label="Close details">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Full view" className="full-image" />
            <button className="close-image-btn" onClick={() => setSelectedImage(null)}>Close</button>
          </div>
        </div>
      )}

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
      <a href="#rooms" onClick={(e) => { e.preventDefault(); const roomsSection = document.getElementById('rooms'); if (roomsSection) { roomsSection.scrollIntoView({ behavior: 'smooth' }); } }} style={{ cursor: 'pointer' }}>
        <div className="link-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 10V21H20V10L12 3L4 10ZM6 11.5L12 6L18 11.5V19H6V11.5Z" />
          </svg>
          <span>Rooms</span>
        </div>
      </a>
    </li>
    <li>
      <Link href="/about-us">
        <div className="link-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" />
          </svg>
          <span>About Us</span>
        </div>
      </Link>
    </li>
    <li>
      <Link href="/virtual-tour">
        <div className="link-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 3H3V17H7V21L12 17H21V3Z" />
          </svg>
          <span>Virtual Tour</span>
        </div>
      </Link>
    </li>
  </ul>
</div>

    <div className="footer-contact">
      <h4>Contact</h4>
      <p>📍Sitio Liwliwa, Brgy. Sto Niño, Zambales 2204 San Felipe, Philippines</p>
      <p>📞 +63 967 217 6539</p>
      <p>📧 contact@charkoolbeachresort.com</p>
      <div className="footer-inquiry">
        <h5 className="inquiry-heading">Send us a message!</h5>
        <form className="inquiry-form" onSubmit={submitInquiry}>
          <textarea
            className="inquiry-textarea"
            rows={4}
            placeholder="Write your message here…"
            value={inquiryMessage}
            onChange={(e) => setInquiryMessage(e.target.value)}
            maxLength={1000}
          />
          <button type="submit" className="inquiry-button" disabled={isSendingInquiry || !inquiryMessage.trim()}>
            {isSendingInquiry ? 'Sending…' : 'Send Message'}
          </button>
        </form>
        <p className="inquiry-note">Messages go straight to our super admin. We’ll get back to you via your account email.</p>
      </div>
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
          font-family: inherit; /* unified heading font */
          font-size: clamp(32px, 5vw, 68px);
          line-height: 1.02;
          font-weight: 700;
          letter-spacing: -0.01em;
          text-shadow: 0 10px 30px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25);
        }
        .hero .sub {
          margin: 0 0 1.2rem 0;
          color: rgba(255,255,255,0.94);
          font-family: var(--font-sans), 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: clamp(15px, 1.8vw, 20px);
          letter-spacing: 0.01em;
          text-shadow: 0 6px 16px rgba(0,0,0,0.28);
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
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.98rem;
          font-family: var(--font-sans), 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          transition: all 220ms ease;
        }
        /* Hero-specific CTAs with premium finish */
        .hero-ctas .btn.primary {
          background: linear-gradient(135deg, #FBD669 0%, #FEBE54 60%, #F7A83A 100%);
          color: #0b2a2e;
          box-shadow: 0 10px 26px rgba(255, 191, 84, 0.35), 0 2px 8px rgba(0,0,0,0.18);
          text-shadow: 0 1px 0 rgba(255,255,255,0.3);
        }
        .hero-ctas .btn.primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 36px rgba(255, 191, 84, 0.45), 0 4px 12px rgba(0,0,0,0.22);
          filter: saturate(1.05);
        }
        .hero-ctas .btn.ghost {
          background: rgba(255,255,255,0.14);
          color: #ffffff;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 20px rgba(0,0,0,0.15);
        }
        .hero-ctas .btn.ghost:hover {
          transform: translateY(-3px) scale(1.02);
          background: rgba(255,255,255,0.18);
        }
        .hero-ctas .btn.outline {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.22);
          color: #ffffff;
          text-shadow: 0 1px 0 rgba(0,0,0,0.15);
        }
        .hero-ctas .btn.outline:hover { background: rgba(255,255,255,0.12); transform: translateY(-3px) scale(1.02); }
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
        .btn:hover { opacity: 0.98; }
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
          background: linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.7));
          z-index: -1;
        }
        .explore-inner {
          position: relative;
          z-index: 1;
          max-width: 920px;
          text-align: center;
          padding: 50px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px;
          backdrop-filter: blur(6px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }
        .explore-inner h2 {
          margin: 0 0 10px 0;
          font-size: clamp(26px, 3.8vw, 42px);
          color: #fff;
          font-family: inherit; /* unified heading font */
          text-shadow: 0 10px 28px rgba(0,0,0,0.55);
        }
        .explore-note {
          color: #f3f6f7;
          margin: 0 0 26px 0;
          font-size: 1.08rem;
          font-family: var(--font-sans), 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        }
        .explore-inner .btn.primary.big {
          background: linear-gradient(135deg, #FBD669 0%, #FEBE54 60%, #F7A83A 100%);
          color: #0b2a2e;
          box-shadow: 0 12px 28px rgba(255, 191, 84, 0.35), 0 2px 8px rgba(0,0,0,0.2);
          text-shadow: 0 1px 0 rgba(255,255,255,0.3);
        }
        .explore-inner .btn.primary.big:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px rgba(255,191,84,0.45), 0 6px 14px rgba(0,0,0,0.25); }
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
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 700; /* unified heading weight */
          color: #2b1f12;
          font-family: inherit; /* unified heading font */
        }
        @keyframes floatCarousel {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .room-carousel {
          position: relative;
          overflow: hidden;
          max-width: 1000px;
          margin: 0 auto;
          border-radius: 18px;
          box-shadow: 0 10px 26px rgba(0,0,0,0.08);
          background: #fff;
          animation: floatCarousel 3s ease-in-out infinite;
          padding-bottom: 8px;
        }
        .room-slides {
          display: flex;
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .room-slide {
          flex: 0 0 100%;
          position: relative;
          background: #fff;
        }
        .room-image {
          width: 100%;
          height: 420px;
          object-fit: cover;
          object-position: center;
          transform: scale(0.985);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease;
        }
        .room-slide.active .room-image { transform: scale(1.02); filter: saturate(1.02) contrast(1.02); }
        .room-info {
          padding: 24px;
          text-align: center;
        }
        .room-info h4 {
          font-size: 1.6rem;
          margin-bottom: 10px;
          color: #0b3a4a;
          font-family: var(--font-display), Georgia, 'Times New Roman', serif;
        }
        .room-info p {
          color: #4a6a6a;
          font-size: 1rem;
          font-family: var(--font-sans), 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          margin-bottom: 16px;
        }
        .see-room {
          padding: 12px 22px;
          background: linear-gradient(135deg, #FBD669 0%, #FEBE54 60%, #F7A83A 100%);
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          color: #0b2a2e;
          box-shadow: 0 10px 22px rgba(255,191,84,0.28), 0 2px 8px rgba(0,0,0,0.16);
          text-shadow: 0 1px 0 rgba(255,255,255,0.35);
        }
        .see-room:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 16px 36px rgba(255,191,84,0.34), 0 8px 16px rgba(0,0,0,0.18);
        }
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.35);
          color: #fff;
          border: none;
          font-size: 2.2rem;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 8px 18px rgba(0,0,0,0.25);
          backdrop-filter: blur(4px);
        }
        .nav-btn:hover { background: rgba(0,0,0,0.55); transform: translateY(-50%) scale(1.05); }
        .nav-btn.left { left: 16px; }
        .nav-btn.right { right: 16px; }
        .dots {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 20px 0 24px 0;
          padding: 0 10px;
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
        .dot.active { background: #f4ae40; transform: scale(1.25); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
        @media (max-width: 1024px) {
          .room-image { height: 360px; }
          .dots { margin: 18px 0 20px 0; }
        }
        @media (max-width: 768px) {
          .rooms { padding: 100px 20px 70px; }
          .room-image { height: 260px; }
          .rooms-title { font-size: 2rem; margin-bottom: 40px; }
          .room-carousel { padding-bottom: 6px; }
          .dots { margin: 16px 0 20px 0; gap: 8px; }
          @keyframes floatCarousel {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
        }
        @media (max-width: 520px) {
          .nav-btn { display: none; }
          .room-image { height: 200px; }
          .rooms-title { font-size: 1.8rem; }
          .room-carousel { padding-bottom: 4px; }
          .dots { margin: 14px 0 18px 0; gap: 7px; }
          .dot { width: 10px; height: 10px; }
          @keyframes floatCarousel {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
        }
        .policies {
          background: #ffffff; /* plain white background */
          padding: 80px 30px; /* space around the centered card */
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden; /* Prevent any overflow */
        }
        .policies-inner {
          max-width: 1000px;
          width: 100%;
          text-align: left;
          overflow: hidden; /* Prevent content overflow */
        }
        /* card treatment so policies feel separated from the content above */
        .policies-inner.card {
          /* darken yellow tones slightly for better comfort */
          background: linear-gradient(135deg, #D9B752 0%, #EED79A 100%);
          border-radius: 14px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(12, 40, 60, 0.08);
          margin: 0 auto; /* centered within white background */
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
        
        /* Responsive styles for policies section */
        @media (max-width: 768px) {
          .policies {
            padding: 60px 20px;
          }
          .policies-inner.card {
            padding: 20px;
            margin: 0 10px; /* keep centered with modest gutters */
          }
          .policies h2 {
            font-size: 1.2rem;
          }
        }
        
        @media (max-width: 480px) {
          .policies {
            padding: 40px 15px;
          }
          .policies-inner.card {
            padding: 16px;
            margin: 0 5px; /* keep centered with small gutters */
          }
          .policies h2 {
            font-size: 1.1rem;
          }
          .policies .muted {
            font-size: 0.9rem;
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
  background: none; /* remove yellow glow */
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
  transform: translateY(-2px); /* subtle float only */
}

.link-item:hover::before { opacity: 0; transform: none; }

.link-item:hover svg { transform: scale(1.06); opacity: 1; box-shadow: none; }

.link-item:hover span { color: #123238; }

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

/* Footer inquiry form */
.footer-inquiry { margin-top: 14px; }
.inquiry-heading { margin: 8px 0; font-size: 1rem; color: #0b3a4a; }
.inquiry-form { display: flex; flex-direction: column; gap: 10px; }
.inquiry-textarea {
  width: 100%;
  resize: vertical;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.85);
  color: #123238;
  font-family: inherit;
}
.inquiry-textarea:focus {
  outline: none;
  border-color: rgba(18,50,56,0.3);
  box-shadow: 0 0 0 4px rgba(18,50,56,0.08);
}
.inquiry-button {
  align-self: flex-start;
  background: #123238;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.inquiry-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0,0,0,0.15); }
.inquiry-button:disabled { opacity: 0.6; cursor: not-allowed; }
.inquiry-note { color: rgba(18,50,56,0.8); font-size: 0.88rem; margin: 4px 0 0; }

@media (max-width: 768px) {
  .footer-inquiry { margin-top: 12px; }
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

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          max-width: 720px;
          width: 90%;
          padding: clamp(1rem, 3vw, 2rem);
          box-shadow: 0 10px 28px rgba(0,0,0,0.2);
          max-height: 90vh;
          overflow-y: auto;
          color: #0b3a4a;
        }
        .modal-content h2 { 
          color: #FEBE54; 
          margin: 0 0 0.5rem 0;
          font-size: 1.6rem;
          font-weight: 700;
        }
        .image-gallery {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          margin-bottom: 1rem;
          scroll-snap-type: x mandatory;
        }
        .image-gallery img {
          width: 180px;
          height: 110px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          scroll-snap-align: start;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .image-gallery img:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 16px rgba(0,0,0,0.18); 
        }
        .capacity {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0b3a4a;
          margin-bottom: 0.5rem;
        }
        .description {
          margin-bottom: 1rem;
          color: #0b3a4a;
          line-height: 1.5;
        }
        .amenities {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem 0;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .amenity-item {
          display: flex;
          align-items: center;
          color: #4b5563;
        }
        .icon {
          margin-right: 0.5rem;
          color: #FEBE54;
        }
        .modal-actions { 
          display: flex; 
          gap: 0.75rem; 
          flex-wrap: wrap; 
        }
        .book-room-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #FEBE54 0%, #e6ac3f 100%);
          color: #1e1e1e;
          border: none;
          padding: 0.85rem 1.4rem;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          margin-right: 0.5rem;
          transition: transform 0.2s ease, box-shadow 0.3s ease, filter 0.2s ease;
          box-shadow: 0 8px 22px rgba(254, 190, 82, 0.45);
          outline: none;
        }
        .book-room-btn:hover { 
          transform: translateY(-2px); 
          filter: brightness(1.02); 
          box-shadow: 0 12px 28px rgba(254, 190, 82, 0.55); 
        }
        .book-room-btn:active { transform: translateY(0); }
        .book-room-btn:focus-visible { 
          box-shadow: 0 0 0 3px rgba(254,190,82,0.35), 0 8px 22px rgba(254, 190, 82, 0.5); 
        }
        .btn-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 200%;
          height: 100%;
          background: linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%);
          transform: skewX(-20deg);
          transition: transform 0.6s ease;
          pointer-events: none;
        }
        .book-room-btn:hover .btn-shine { 
          transform: translateX(50%) skewX(-20deg); 
        }
        .close-btn {
          background-color: #e5e7eb;
          color: #0b3a4a;
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .close-btn:hover { background-color: #d1d5db; }
        
        /* Image Modal */
        .image-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          backdrop-filter: blur(4px);
        }
        .image-modal-content {
          background: #fff;
          border-radius: 16px;
          max-width: 90%;
          max-height: 90%;
          padding: 1rem;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #0b3a4a;
        }
        .full-image {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 6px;
        }
        .close-image-btn {
          margin-top: 1rem;
          background-color: #e5e7eb;
          color: #0b3a4a;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          cursor: pointer;
        }
        .close-image-btn:hover { background-color: #d1d5db; }
        
        @media (max-width: 640px) {
          .book-room-btn,
          .close-btn { 
            width: 100%; 
            margin-bottom: 0.5rem; 
          }
          .image-gallery img { 
            width: 120px; 
            height: 80px; 
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
