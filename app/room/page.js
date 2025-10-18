'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { FaUsers, FaSnowflake, FaBed, FaWifi, FaSwimmingPool, FaFire, FaUtensils } from 'react-icons/fa'

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
      'Our spacious Villa offers the ultimate group experience, perfect for family gatherings or company outings. With a full kitchen, multiple beds, and direct access to resort amenities, it’s your home away from home.',
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
]

export default function RoomPage() {
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const router = useRouter()

  return (
    <>
      <Navbar />
      <section className="hero" aria-label="Resort highlight">
        <div className="hero-overlay" aria-hidden="true"></div>
        <h1>
          <span className="hero-title">Experience comfort, awaken to paradise.</span>
        </h1>
      </section>

      <main className={`room-grid ${selectedRoom ? 'blurred' : ''}`}>
        {rooms.map(room => (
          <article key={room.id} className="room-card" aria-label={`${room.name} details`}>
            <img src={room.images[0]} alt={room.name} className="room-image" />
            <div className="room-content">
              <h2>{room.name}</h2>
              <p>{room.shortDescription}</p>
              <button className="view-details-btn" onClick={() => setSelectedRoom(room)} aria-label={`View details for ${room.name}`}>
                <span className="btn-shine" aria-hidden="true"></span>
                View Room
              </button>
            </div>
          </article>
        ))}
      </main>

      {selectedRoom && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedRoom(null)}>
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
              <button className="book-room-btn" onClick={() => router.push('/booking')} aria-label="Proceed to booking">
                <span className="btn-shine" aria-hidden="true"></span>
                Book This Room
              </button>
              <button className="close-btn" onClick={() => setSelectedRoom(null)} aria-label="Close details">Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="image-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Full view" className="full-image" />
            <button className="close-image-btn" onClick={() => setSelectedImage(null)}>Close</button>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="divider"></div>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>

      <style jsx>{`
        :global(:root) {
          --brand: #FEBE54;
          --brand-warm: #FEBE52;
          --ink: #1f2937;
          --ink-soft: #4b5563;
          --surface: #ffffff;
        }
        :global(body) {
          margin: 0;
          font-family: 'Poppins', sans-serif;
          background: var(--surface);
          color: var(--ink);
        }
        .hero {
          position: relative;
          background-image: url('/images/resort-hero.jpg');
          background-size: cover;
          background-position: center;
          height: clamp(140px, 26vh, 320px); /* reduced so it doesn't dominate */
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          padding: 0 1rem;
          background-color: var(--brand);
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.4)),
            radial-gradient(120% 80% at 50% 10%, rgba(254,190,82,0.18), rgba(0,0,0,0) 60%);
          z-index: 0;
        }
        .hero h1 {
          position: relative;
          z-index: 1;
          margin: 0;
          font-size: clamp(1.6rem, 4vw, 2.4rem); /* smaller, elegant */
          line-height: 1.15;
          letter-spacing: 0.4px;
        }
        .hero-title {
          color: #fff; /* fallback */
          background: linear-gradient(100deg, #ffffff 0%, #fff7ea 35%, var(--brand) 65%, #ffffff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          background-size: 180% 100%;
          animation: heroShimmer 14s ease-in-out infinite;
        }
        @keyframes heroShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.75rem;
          padding: clamp(1rem, 3vw, 2.5rem);
          max-width: 1200px;
          margin: 0 auto;
          transition: filter 0.3s ease;
        }
        /* Ensure 3 columns on larger screens */
        @media (min-width: 1024px) {
          .room-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 1280px; }
        }
        .room-grid.blurred {
          filter: blur(5px);
          pointer-events: none;
          user-select: none;
        }
        .room-card {
          position: relative;
          background: radial-gradient(160% 140% at 0% 0%, rgba(254, 190, 82, 0.24) 0%, rgba(254, 190, 82, 0.08) 40%, rgba(255,255,255,1) 100%), var(--surface);
          border: 1px solid rgba(254, 190, 82, 0.35);
          border-radius: 16px;
          box-shadow: 0 10px 28px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.6);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          min-height: 380px;
        }
        .room-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 18px 40px rgba(0,0,0,0.16);
          border-color: rgba(254, 190, 82, 0.55);
        }
        .room-image {
          width: 100%;
          height: 220px;
          object-fit: cover;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          transition: transform 0.6s ease;
        }
        .room-card:hover .room-image { transform: scale(1.04); }
        .room-content {
          padding: 1.25rem 1.25rem 1.5rem 1.25rem;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }
        .room-content h2 {
          margin: 0 0 0.5rem 0;
          color: var(--brand);
          font-size: 1.6rem;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .room-content p {
          flex-grow: 1;
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: var(--ink-soft);
        }
        .view-details-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, var(--brand) 0%, #e6ac3f 100%);
          color: #1e1e1e;
          border: none;
          padding: 0.8rem 1.25rem;
          border-radius: 999px;
          font-weight: 700;
          cursor: pointer;
          align-self: flex-start;
          transition: transform 0.2s ease, box-shadow 0.3s ease, filter 0.2s ease;
          box-shadow: 0 6px 18px rgba(254, 190, 82, 0.4);
          outline: none;
        }
        .view-details-btn:hover { transform: translateY(-2px); filter: brightness(1.02); box-shadow: 0 10px 24px rgba(254, 190, 82, 0.5); }
        .view-details-btn:active { transform: translateY(0); }
        .view-details-btn:focus-visible { box-shadow: 0 0 0 3px rgba(254,190,82,0.35), 0 8px 20px rgba(254, 190, 82, 0.45); }
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
        .view-details-btn:hover .btn-shine,
        .book-room-btn:hover .btn-shine { transform: translateX(50%) skewX(-20deg); }
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
          background: #ffffff; /* solid for full readability */
          border-radius: 16px;
          max-width: 720px;
          width: 90%;
          padding: clamp(1rem, 3vw, 2rem);
          box-shadow: 0 10px 28px rgba(0,0,0,0.2);
          max-height: 90vh;
          overflow-y: auto;
          color: var(--ink);
        }
        .modal-content h2 { color: var(--ink); }
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
        .image-gallery img:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
        .capacity {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--ink);
          margin-bottom: 0.5rem;
        }
        .description {
          margin-bottom: 1rem;
          color: var(--ink);
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
          color: var(--ink-soft);
        }
        .icon {
          margin-right: 0.5rem;
          color: var(--brand);
        }
        .modal-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .book-room-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, var(--brand) 0%, #e6ac3f 100%);
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
        .book-room-btn:hover { transform: translateY(-2px); filter: brightness(1.02); box-shadow: 0 12px 28px rgba(254, 190, 82, 0.55); }
        .book-room-btn:active { transform: translateY(0); }
        .book-room-btn:focus-visible { box-shadow: 0 0 0 3px rgba(254,190,82,0.35), 0 8px 22px rgba(254, 190, 82, 0.5); }
        .close-btn {
          background-color: #e5e7eb;
          color: var(--ink);
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .close-btn:hover { background-color: #d1d5db; }
        .footer {
          background-color: #e8cfa3;
          text-align: center;
          padding: 1.5rem 0;
          color: rgba(18, 50, 56, 0.85);
          font-size: 0.9rem;
        }
        .divider {
          width: 80%;
          height: 1px;
          background-color: #d3b885;
          margin: 1.5rem auto;
        }
        @media (max-width: 640px) {
          .room-image { height: 160px; }
          .view-details-btn,
          .book-room-btn,
          .close-btn { width: 100%; margin-bottom: 0.5rem; }
          .image-gallery img { width: 120px; height: 80px; }
        }
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
          color: var(--ink);
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
          color: var(--ink);
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          cursor: pointer;
        }
        .close-image-btn:hover { background-color: #d1d5db; }
        @media (prefers-reduced-motion: reduce) {
          .hero-title { animation: none; }
          .room-image, .view-details-btn, .book-room-btn { transition: none; }
        }
      `}</style>
    </>
  )
}
