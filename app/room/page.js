'use client'
import { useState } from 'react'
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
    images: ['/images/Loft.jpg', '/images/Loft.jpg', '/images/Loft.jpg']
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
    images: ['/images/Tepee.jpg', '/images/Tepee.jpg', '/images/Tepee.jpg']
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
    images: ['/images/Villa.jpg', '/images/Villa.jpg', '/images/Villa.jpg']
  }
]

export default function RoomPage() {
  const [selectedRoom, setSelectedRoom] = useState(null)

  return (
    <>
      <Navbar />
      <section className="hero">
        <div className="hero-overlay"></div>
        <h1>Experience comfort, awaken to paradise.</h1>
      </section>

      <main className={`room-grid ${selectedRoom ? 'blurred' : ''}`}>
        {rooms.map(room => (
          <article key={room.id} className="room-card">
            <img src={room.images[0]} alt={room.name} className="room-image" />
            <div className="room-content">
              <h2>{room.name}</h2>
              <p>{room.shortDescription}</p>
              <button
                className="view-details-btn"
                onClick={() => setSelectedRoom(room)}
              >
                View Details
              </button>
            </div>
          </article>
        ))}
      </main>

      {selectedRoom && (
        <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="image-gallery">
              {selectedRoom.images.map((img, idx) => (
                <img key={idx} src={img} alt={`${selectedRoom.name} image ${idx + 1}`} />
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
            <button className="book-room-btn">Book This Room</button>
            <button className="close-btn" onClick={() => setSelectedRoom(null)}>Close</button>
          </div>
        </div>
      )}

      <section className="cta-banner">
        <h2>Begin Your Reservation Now!</h2>
        <button className="book-now-btn">Book Now</button>
      </section>

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
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          padding: 0 1rem;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 0;
        }
        .hero h1 {
          position: relative;
          z-index: 1;
          margin: 0;
          text-shadow: 0 2px 6px rgba(0,0,0,0.6);
          font-size: clamp(1.8rem, 4vw, 2.5rem);
        }
        .room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          padding: 3rem 2rem 6rem;
          max-width: 1200px;
          margin: 0 auto;
          transition: filter 0.3s ease;
        }
        .room-grid.blurred {
          filter: blur(5px);
          pointer-events: none;
          user-select: none;
        }
        .room-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .room-card:hover {
          transform: translateY(-5px);
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
          transition: background-color 0.3s ease, transform 0.2s ease;
        }
        .view-details-btn:hover {
          background-color: #e6ac3f;
          transform: translateY(-2px);
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          padding: 2rem;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          max-height: 90vh;
          overflow-y: auto;
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
          gap: 1rem;
        }
        .amenity-item {
          display: flex;
          align-items: center;
          color: #555;
        }
        .icon {
          margin-right: 0.5rem;
          color: #FEBE54;
        }
        .book-room-btn {
          background-color: #FEBE54;
          color: white;
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 1rem;
        }
        .book-room-btn:hover {
          background-color: #e6ac3f;
        }
        .close-btn {
          background-color: #ccc;
          color: #333;
          border: none;
          padding: 0.7rem 1.2rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .close-btn:hover {
          background-color: #aaa;
        }
        .cta-banner {
          background-color: #FEBE54;
          padding: 3rem 0.8rem;
          text-align: center;
          color: white;
          margin-top: 4rem;
        }
        .cta-banner h2 {
          margin: 0 0 0.75rem 0;
          font-size: 1.8rem;
        }
        .book-now-btn {
          background-color: white;
          color: #FEBE54;
          border: none;
          padding: 0.7rem 1.3rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }
        .book-now-btn:hover {
          background-color: #e6ac3f;
        }
        @media (max-width: 768px) {
          .hero {
            height: 200px;
          }
          .room-content h2 {
            font-size: 1.4rem;
          }
          .room-content p {
            font-size: 0.95rem;
          }
        }
        @media (max-width: 480px) {
          .room-image {
            height: 160px;
          }
          .view-details-btn,
          .book-room-btn,
          .close-btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          .image-gallery img {
            width: 80px;
            height: 60px;
          }
        }
      `}</style>
    </>
  )
}
