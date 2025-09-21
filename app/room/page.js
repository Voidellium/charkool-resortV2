'use client';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { FaUsers, FaSnowflake, FaBed, FaWifi, FaSwimmingPool, FaFire, FaUtensils } from 'react-icons/fa';

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
      { icon: <FaFire />, label: 'Grill Access' },
    ],
    images: [
      '/images/Loft.jpg',
      '/images/Loft.jpg',
      '/images/Loft.jpg',
    ],
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
      { icon: <FaFire />, label: 'Grill Access' },
    ],
    images: [
      '/images/Tepee.jpg',
      '/images/Tepee.jpg',
      '/images/Tepee.jpg',
    ],
  },
  {
    id: 'villa',
    name: 'Villa',
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
      { icon: <FaFire />, label: 'Grill Access' },
    ],
    images: [
      '/images/Villa.jpg',
      '/images/Villa.jpg',
      '/images/Villa.jpg',
    ],
  },
];

export default function RoomPage() {
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedRoomId(expandedRoomId === id ? null : id);
  };

  return (
    <>
      <Navbar />
      <section className="hero">
        <div className="hero-overlay"></div>
        <h1>Stay in Comfort, Wake up to Paradise</h1>
      </section>

      <main className="room-grid">
        {rooms.map((room) => (
          <article key={room.id} className="room-card">
            <img src={room.images[0]} alt={room.name} className="room-image" />
            <div className="room-content">
              <h2>{room.name}</h2>
              <p>{room.shortDescription}</p>
              <button className="view-details-btn" onClick={() => toggleExpand(room.id)}>
                {expandedRoomId === room.id ? 'Hide Details' : 'View Details'}
              </button>
              {expandedRoomId === room.id && (
                <div className="room-details">
                  <div className="image-gallery">
                    {room.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`${room.name} image ${idx + 1}`} />
                    ))}
                  </div>
                  <p className="capacity"><FaUsers /> {room.capacity}</p>
                  <p className="description">{room.description}</p>
                  <ul className="amenities">
                    {room.amenities.map((amenity, idx) => (
                      <li key={idx} className="amenity-item">
                        <span className="icon">{amenity.icon}</span> {amenity.label}
                      </li>
                    ))}
                  </ul>
                  <button className="book-room-btn">Book This Room</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </main>

      <section className="cta-banner">
        <h2>Ready to Book Your Stay?</h2>
        <button className="book-now-btn">Book Now</button>
      </section>

      {/* Correct placement of the styled-jsx block */}
      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: 'Poppins', sans-serif;
          background: #fff;
          color: #333;
        }
        .hero {
          position: relative;
          background-image: url('/images/resort-hero.jpg');
          background-size: cover;
          background-position: center;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 0 1rem;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 0;
        }
        .hero h1 {
          position: relative;
          z-index: 1;
          margin: 0;
          text-shadow: 0 2px 6px rgba(0,0,0,0.7);
          font-size: clamp(2rem, 5vw, 3rem);
        }
        .room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          padding: 3rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .room-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.3s ease;
        }
        .room-card:hover {
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        .room-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        .room-content {
          padding: 1.5rem;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }
        .room-content h2 {
          margin: 0 0 0.5rem 0;
          color: #FEBE54;
          font-size: 1.8rem;
          font-weight: 700;
        }
        .room-content p {
          flex-grow: 1;
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #555;
        }
        .view-details-btn {
          background-color: #FEBE54;
          color: white;
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
          transition: background-color 0.3s ease;
        }
        .view-details-btn:hover {
          background-color: #e6ac3f;
        }
        .room-details {
          margin-top: 1rem;
          border-top: 1px solid #eee;
          padding-top: 1rem;
          animation: fadeIn 0.3s ease forwards;
        }
        .image-gallery {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          margin-bottom: 1rem;
        }
        .image-gallery img {
          width: 100px;
          height: 70px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }
        .image-gallery img:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .capacity {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #333;
          margin-bottom: 0.5rem;
        }
        .description {
          margin-bottom: 1rem;
          color: #444;
          line-height: 1.4;
        }
        .amenities {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem 0;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .amenity-item {
          background-color: #FEBE54;
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .amenity-item .icon {
          display: flex;
          align-items: center;
          font-size: 1.1rem;
        }
        .book-room-btn {
          background-color: #FEBE54;
          color: white;
          border: none;
          padding: 0.9rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          width: 100%;
          transition: background-color 0.3s ease;
        }
        .book-room-btn:hover {
          background-color: #e6ac3f;
        }
        .cta-banner {
          background: linear-gradient(90deg, #FEBE54 0%, #e6ac3f 100%);
          padding: 3rem 1rem;
          text-align: center;
          color: white;
          border-radius: 12px;
          max-width: 1200px;
          margin: 3rem auto;
        }
        .cta-banner h2 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          letter-spacing: 0.05em;
        }
        .book-now-btn {
          background: white;
          color: #FEBE54;
          border: none;
          padding: 1rem 3rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .book-now-btn:hover {
          background-color: #f0d9a1;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .hero {
            height: 250px;
            font-size: 2rem;
          }
          .room-grid {
            padding: 2rem 1rem;
            gap: 1.5rem;
          }
          .room-image {
            height: 180px;
          }
          .view-details-btn {
            padding: 0.6rem 1rem;
            font-size: 0.9rem;
          }
          .book-room-btn {
            font-size: 1rem;
            padding: 0.8rem 1.2rem;
          }
          .cta-banner h2 {
            font-size: 1.8rem;
          }
          .book-now-btn {
            font-size: 1rem;
            padding: 0.8rem 2rem;
          }
        }
      `}</style>
    </>
  );
}