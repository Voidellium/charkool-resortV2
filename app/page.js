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
    '/images/background4.jpg',
    '/images/background3.jpg',
    '/images/background6.jpg',
    '/images/background5.jpg'
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);

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
}, [currentIndex, images]); // Corrected dependency arrayIndex, images.length]);

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
      <header className="hero">
        <div className="background-images-container">
          {images.map((image, i) => (
            <div
              key={image}
              className={`background-image ${i === currentIndex ? 'active' : ''} ${i === prevIndex && isTransitioning ? 'previous' : ''}`}
              style={{ backgroundImage: `url(${image})` }}
              onTransitionEnd={() => setIsTransitioning(false)}
            ></div>
          ))}
          <div className="image-overlay"></div>
        </div>

        {/* This motion.div and its content from the first version is a duplicate
            and should be combined. The second version's structure is better,
            so we'll use a single hero-content div.
        */}
        {/*
         <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        ></motion.div>
        */}

        <div className="hero-content">
          <h1>Charkool Leisure Beach Resort</h1>
          <h3>Experience paradise with luxury rooms, pristine beaches, and world-class amenities.</h3>
          <div className="cta-buttons">
            <button onClick={handleBookNow}>Book Now</button>
            <Link href="/rooms"><button>Explore Rooms</button></Link>
            <Link href="/virtual-tour"><button>Virtual Tour</button></Link>
          </div>
        </div>
      </header>

      <motion.section
        className="room-preview"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2>Accommodations</h2>
        <div className="room-grid">
          <div className="room-card">
            <img src="/images/room1.jpg" alt="Standard Room" />
            <h3>Standard Room</h3>
            <p>Comfortable and cozy room ideal for solo travelers or couples.</p>
            <Link href="/rooms/standard" className="see-more">See More</Link>
          </div>
          <div className="room-card">
            <img src="/images/room2.jpg" alt="Deluxe Room" />
            <h3>Deluxe Room</h3>
            <p>Spacious room with a balcony and luxurious amenities for families.</p>
            <Link href="/rooms/deluxe" className="see-more">See More</Link>
          </div>
        </div>
      </motion.section>


      <div className="flex-grow-spacer"></div>

      <footer className="contact">
        <h2>Contact Us</h2>
        <p>📍 Charkool Beach Resort, Paradise Island</p>
        <p>📞 +63 912 345 6789</p>
        <p>📧 contact@charkoolbeachresort.com</p>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>

      <style jsx>{`
        .landing {
          font-family: 'Poppins', sans-serif;
          color: white;
          text-align: center;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        /* ... all of the styles from your original file ... */
        .background-images-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }

        .background-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transform: translateX(100%);
          transition: transform 1s ease-in-out, opacity 1s ease-in-out;
          z-index: 1;
        }

        .background-image.active {
          opacity: 1;
          transform: translateX(0%);
          z-index: 2;
        }

        .background-image.previous {
          transform: translateX(-100%);
          opacity: 0;
          z-index: 1;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 3;
        }

        .hero, .flex-grow-spacer, .contact {
          position: relative;
          z-index: 4;
        }

        .hero {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 2rem;
          text-align: center;
        }

        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
          margin-left: 0;
          margin-right: auto;
        }

        .hero h3 {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
          margin-left: 0;
          margin-right: auto;
        }

        .hero button {
          background: #3498db;
          color: white;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .hero button:hover {
          background: #2980b9;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-buttons button {
          background: #3498db;
          color: white;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .cta-buttons button:hover {
          background: #2980b9;
        }

        .hero-content {
          z-index: 1;
          position: relative;
        }

        .flex-grow-spacer {
          flex-grow: 1;
        }

        .room-preview {
          z-index: 4;
          position: relative;
          padding: 4rem 2rem;
          text-align: center;
          background: #ffffff;
          color: #333;
          width: 100%;
          isolation: isolate;
        }

        .room-preview h2 {
          font-size: 2rem;
          margin-bottom: 2rem;
          color: #2980b9;
        }

        .room-grid {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .room-card {
          background: #ffffff;
          color: #333;
          border-radius: 10px;
          overflow: hidden;
          width: 300px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .room-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
        }

        .room-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .room-card h3 {
          margin: 1rem 0 0.5rem;
           color: #333;
        }

        .room-card p {
          padding: 0 1rem;
          font-size: 0.95rem;
           color: #333;
        }

        .see-more {
          display: inline-block;
          margin: 1rem auto 1.5rem;
          padding: 0.5rem 1.2rem;
          background: #3498db;
          color: white;
          border-radius: 5px;
          text-decoration: none;
          transition: background 0.3s ease;
        }

        .see-more:hover {
          background: #2980b9;
        }

        .contact {
          background: rgb(52, 152, 219);
          padding: 1rem 1rem;
          text-align: left;
        }

        .contact h2 {
          margin-bottom: 1rem;
        }

        .contact p {
          margin: 0.5rem 0;
          font-size: 1rem;
        }

        @media (max-width: 1024px) {
          .hero {
            padding: 10rem 3rem;
            max-width: 100%;
            margin: 0 auto;
          }
        }

        @media (max-width: 768px) {
          .hero {
            padding: 5rem 1.5rem;
          }
          .hero h1 {
            font-size: 2rem;
          }
          .hero h3 {
            font-size: 1rem;
          }
          .hero button {
            padding: 0.8rem 1.5rem;
            font-size: 0.9rem;
          }
          .contact {
            padding: 2rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 3rem 1rem;
          }
          .hero h1 {
            font-size: 1.5rem;
          }
          .hero h3 {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}