'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const keywordSuggestions = {
  pets: {
    keywords: ['pet', 'dog', 'cat', 'animal'],
    suggestions: [
      { text: '🐾 Are pets allowed?', answer: 'Pets must wear diapers at all times within the resort. The resort is not liable for any incidents caused by pets. Owners will be held responsible for any damages or legal liabilities.' },
      { text: '🐾 What are the pet policies?', answer: 'Pets must wear diapers at all times. The resort is not liable for pet behavior; owners are responsible for incidents and damages.' },
    ]
  },
  rooms: {
    keywords: ['room', 'villa', 'loft', 'teepee', 'accommodation'],
    suggestions: [
      { text: '🏡 What are the room types?', answer: 'We offer different room types such as Villa Rooms, Loft Rooms, and Teepee Rooms. Each room includes basic amenities such as pool access, beach access, and other inclusions depending on the room type.' },
      { text: '💰 What are the room rates?', answer: 'Teepee Room — ₱6,000 / 22 hrs (max 5 pax)\nLoft Room — ₱5,000 / 22 hrs (2–4 pax)\nVilla Room — ₱8,000 / 22 hrs (max 8 pax)' },
      { text: '🛏️ What are the room inclusions?', answer: 'Free amenities include the swimming pool, beach access, and free WiFi. You can also see the included amenities and available choices during the booking process for each room type.' },
    ]
  },
  booking: {
    keywords: ['book', 'reserve', 'reservation', 'check-in', 'down payment'],
    suggestions: [
      { text: '📅 How to Book a Room', answer: 'You can book online through our system by choosing your room, selecting your dates, and making a down payment via PayMongo. Walk-ins are also accepted, but online booking ensures availability.' },
      { text: '💵 How much is the Down Payment?', answer: 'The standard down payment is ₱2,000 for reservation.' },
      { text: '⏳ Can I book on the same day?', answer: 'Yes, same-day bookings are allowed as long as the rooms are still available. We recommend checking online before visiting.' },
      { text: '🔒 What if two guests book the same room?', answer: 'Our system temporarily locks the room during payment to prevent double booking. If payment fails or times out, the room becomes available again.' },
    ]
  },
  amenities: {
    keywords: ['amenities', 'services', 'pool', 'wifi', 'cooking'],
    suggestions: [
      { text: '🌊 What amenities are free?', answer: 'Free amenities include the swimming pool, beach access, and free WiFi. You can also see the included amenities and available choices during the booking process for each room type.' },
      { text: '🎱 What amenities have extra charges?', answer: 'Some special amenities or equipment may require additional fees. You can also see all amenities and extra activities during the booking process when selecting your room.' },
      { text: '🍖 Are there grillers, billiards, and videoke?', answer: 'Yes, grillers, billiards, and videoke are available for guests. Grillers are part of the free amenities.' },
    ]
  },
  activities: {
    keywords: ['activity', 'fun', 'water', 'island', 'banana boat'],
    suggestions: [
      { text: '🚤 Banana Boat', answer: 'Banana boat rides can be arranged upon arrival with our staff.' },
      { text: '🛶 Dragon Boat', answer: 'Dragon boat activities can be arranged upon arrival with our staff.' },
      { text: '🏝️ Island Hopping', answer: 'Island hopping tours are available and can be selected during the booking process or arranged upon arrival.' },
    ]
  },
  payments: {
    keywords: ['payment', 'pay', 'gcash', 'bank', 'online'],
    suggestions: [
      { text: '💳 What payment methods are accepted?', answer: 'We accept online payments through PayMongo, which supports GCash, Maya, BPI, and other real-time payment options (except OTC payments). Walk-ins may pay in cash.' },
      { text: '🌐 How do I pay online?', answer: 'Once you complete your booking details, you’ll be redirected to PayMongo where you can choose your preferred payment method. A receipt will appear, which you can download, and it will also be sent to your email or account.' },
      { text: '🔄 What is the cancellation & rebooking policy?', answer: 'Down payment is non-refundable. Reschedule is allowed 2 weeks prior to the check-in date. No-shows are considered forfeited. However, in case of emergencies, you may rebook up to 2 times or contact management for special arrangements.' },
    ]
  },
  location: {
    keywords: ['location', 'address', 'map', 'where'],
    suggestions: [
      { text: '📍 What is the exact address?', answer: 'We are located at: Sitio Liwliwa, Brgy. Sto Niño, San Felipe, Zambales, Philippines.' },
      { text: '🗺️ Do you have a Google Maps/Waze Link?', answer: 'Yes, you can find us on Google Maps or Waze under "Charkool Beach Resort" or "Charkool Leisure Beach Resort".' },
    ]
  },
};

const bubbleCategories = [
  {
    icon: '🏡',
    title: 'Rooms & Rates',
    questions: [
      {
        text: 'What types of rooms do you offer?',
        answer: 'We offer different room types such as Villa Rooms, Loft Rooms, and Teepee Rooms. Each room includes basic amenities such as pool access, beach access, and other inclusions depending on the room type.',
      },
      {
        text: 'What are your room rates?',
        answer: 'Teepee Room — ₱6,000 / 22 hrs (max 5 pax)\nLoft Room — ₱5,000 / 22 hrs (2–4 pax)\nVilla Room — ₱8,000 / 22 hrs (max 8 pax)',
        bookNow: true,
      },
      {
        text: 'Do you offer promos or discounts?',
        answer: 'Yes, we occasionally offer seasonal promotions. You can check our Facebook page, our website, or contact our staff for the latest deals.',
      },
    ],
  },
  {
    icon: '📅',
    title: 'Booking & Reservations',
    questions: [
      {
        text: 'How do I book a room?',
        answer: 'You can book online through our system by choosing your room, selecting your dates, and making a down payment via PayMongo. Walk-ins are also accepted, but online booking ensures availability.\nTo continue booking, you must log in with your email and password or sign up and fill out your details.',
      },
      {
        text: 'How much is the down payment?',
        answer: 'The standard down payment is ₱2,000 for reservation.',
        bookNow: true,
      },
      {
        text: 'Can I book on the same day?',
        answer: 'Yes, same-day bookings are allowed as long as the rooms are still available.',
      },
      {
        text: 'What happens if two guests try to book the same room?',
        answer: 'Our system temporarily locks the room during payment to prevent double booking. If payment fails or times out, the room becomes available again.',
      },
    ],
  },
  {
    icon: '🎉',
    title: 'Amenities & Activities',
    questions: [
        { text: 'What amenities are free to use?', answer: 'Free amenities include the swimming pool, beach access, and free WiFi. You can also see the included amenities and available choices during the booking process for each room type.' },
        { text: 'What amenities have extra charges?', answer: 'Some special amenities or equipment may require additional fees. You can also see all amenities and extra activities during the booking process when selecting your room.' },
        { text: 'Do you have grillers, billiards, and videoke?', answer: 'Yes, grillers, billiards, and videoke are available for guests. Grillers are part of the free amenities.' },
        { text: 'What activities do you offer?', answer: 'Guests can enjoy water activities such as banana boat rides, dragon boat, and island hopping. These can be arranged separately with our staff upon arrival or selected during the booking process.' },
    ]
  },
  {
    icon: '💳',
    title: 'Payments & Cancellations',
    questions: [
        { text: 'What payment methods do you accept?', answer: 'We accept online payments through PayMongo, which supports GCash, Maya, BPI, and other real-time payment options (except OTC payments). Walk-ins may pay in cash.' },
        { text: 'How do I pay online?', answer: 'Once you complete your booking details, you’ll be redirected to PayMongo where you can choose your preferred payment method. A receipt will appear, which you can download, and it will also be sent to your email or account.' },
        { text: 'What is your cancellation policy?', answer: 'Down payment is non-refundable. Reschedule is allowed 2 weeks prior to the check-in date. No-shows are considered forfeited. However, in case of emergencies, you may rebook up to 2 times or contact management for special arrangements.' },
    ]
  },
  {
    icon: '📍',
    title: 'Location & Policies',
    questions: [
        { text: 'Where is Charkool Beach Resort located?', answer: 'We are located at: Sitio Liwliwa, Brgy. Sto Niño, San Felipe, Zambales, Philippines. You can find us on Google Maps or Waze under Charkool Beach Resort or Charkool Leisure Beach Resort.' },
        { text: 'Do you allow walk-in guests?', answer: 'Yes, we accept walk-in guests, but we recommend booking online first to secure your room and avoid unavailability.', bookNow: true },
        { text: 'Do you have corkage fees?', answer: 'Yes. Corkage applies as follows:\n₱100.00 for hard liquor\n₱300.00 per beer case\n₱50.00 per bottle/in can' },
        { text: 'Do you allow pets?', answer: 'Pets must wear diapers at all times within the resort. The resort is not liable for any incidents caused by pets. Owners will be held responsible for any damages or legal liabilities.' },
    ]
  }
];

const BookNowButton = () => {
  const router = useRouter();
  return (
    <button className="book-now-btn" onClick={() => router.push('/booking')}>
      Book Now
      <style jsx>{`
        .book-now-btn {
          display: inline-block;
          margin-top: 10px;
          padding: 8px 16px;
          background-color: #FEBE52;
          color: #333;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .book-now-btn:hover {
            background-color: #e0a840;
        }
      `}</style>
    </button>
  );
};

export default function ChatInterface({ isModal }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initial bot message
    setMessages([{ sender: 'bot', text: 'Hello! How can I help you today?' }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const lowerInput = input.toLowerCase();
    let suggestionsFound = false;

    // Add user message first
    setMessages((prev) => [
      ...prev,
      { sender: 'bot', text: input, isUserMessage: true }
    ]);

    for (const category in keywordSuggestions) {
      if (keywordSuggestions[category].keywords.some(kw => lowerInput.includes(kw))) {
        const options = keywordSuggestions[category].suggestions;
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Here are some suggestions based on your question:', isSuggestionPrompt: true, isBotMessage: true },
          ...options.map((opt) => ({
            sender: 'bot',
            text: opt.text,
            answer: opt.answer,
            isSuggestion: true,
            isBotMessage: true
          })),
        ]);
        suggestionsFound = true;
        break;
      }
    }

    if (!suggestionsFound) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I didn’t understand that. Please choose one topic below to continue:', isSuggestionPrompt: true, isBotMessage: true },
      ]);
    }

    setInput('');
  };

  const handleSuggestionClick = (suggestion) => {
    const userMessage = { sender: 'bot', text: suggestion.text, isUserMessage: true };
    const botResponseMessage = { sender: 'bot', text: suggestion.answer, bookNow: suggestion.bookNow, isBotMessage: true };
    setMessages((prev) => {
      // Filter out old suggestions
      const filtered = prev.filter(m => !m.isSuggestion && !m.isSuggestionPrompt);
      return [...filtered, userMessage, botResponseMessage];
    });
  };

  const handleBubbleClick = (category) => {
    setMessages((prev) => {
        const filtered = prev.filter(m => !m.isSuggestion && !m.isSuggestionPrompt);
        return [
            ...filtered,
            { sender: 'bot', text: `Here are some questions about ${category.title}:`, isSuggestionPrompt: true, isBotMessage: true },
            ...category.questions.map((q) => ({ 
              sender: 'bot', 
              text: q.text, 
              answer: q.answer, 
              bookNow: q.bookNow, 
              isSuggestion: true,
              isBotMessage: true 
            })),
        ];
    });
  };

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={`message ${msg.sender} ${msg.isUserMessage ? 'isUserMessage' : ''} ${msg.isBotMessage ? 'isBotMessage' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="message-content">
              {msg.isSuggestion ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button className="suggestion-btn" onClick={() => handleSuggestionClick(msg)}>
                    {msg.text}
                  </button>
                </div>
              ) : (
                <>
                  <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{msg.text}</p>
                  {msg.bookNow && <BookNowButton />}
                </>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bubble-area">
        {bubbleCategories.map((category, index) => (
          <button
            key={index}
            className="bubble-btn"
            onClick={() => handleBubbleClick(category)}
          >
            {category.icon} {category.title}
          </button>
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          background: #f9f9f9;
          height: 100%;
        }
        .messages-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: #f9f9f9;
        }
        .message {
          margin-bottom: 15px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .message.user, .message.isUserMessage {
          flex-direction: row;
          margin-right: auto;
          max-width: 85%;
        }
        .message.bot:not(.isUserMessage), .message.isBotMessage {
          flex-direction: row-reverse;
          margin-left: auto;
          max-width: 85%;
        }
        .message-content {
          padding: 12px 18px;
          border-radius: 20px;
          line-height: 1.5;
          word-wrap: break-word;
          position: relative;
          max-width: 100%;
        }
        .message.user .message-content, .message.isUserMessage .message-content {
          background-color: #e5e5e5;
          color: #333;
          border-bottom-left-radius: 4px;
          margin-left: 8px;
        }
        .message.bot .message-content, .message.isBotMessage .message-content {
          background-color: #FEBE52;
          color: white;
          border-bottom-right-radius: 4px;
          margin-right: 8px;
        }
        .message.bot .suggestion-btn, .message.isBotMessage .suggestion-btn {
          text-align: left;
          padding: 10px 15px;
          background-color: #f0f0f0;
          color: #333;
          border: none;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          margin: 2px 0;
          width: auto;
          display: inline-block;
        }
        .message.user .message-content::before,
        .message.bot .message-content::before,
        .message.isUserMessage .message-content::before,
        .message.isBotMessage .message-content::before {
          content: '';
          position: absolute;
          bottom: 0;
          width: 12px;
          height: 12px;
        }
        .message.user .message-content::before, .message.isUserMessage .message-content::before {
          left: -6px;
          background: radial-gradient(circle at top right, transparent 12px, #e5e5e5 0);
        }
        .message.bot .message-content::before, .message.isBotMessage .message-content::before {
          right: -6px;
          background: radial-gradient(circle at top left, transparent 12px, #FEBE52 0);
        }
        .bubble-area {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          gap: 8px;
          padding: 10px;
          border-top: 1px solid #e0e0e0;
          background: #fff;
        }
        .bubble-btn {
          padding: 10px 15px;
          background-color: #FEBE52;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .bubble-btn:hover {
          background-color: #e0a840;
        }
        .input-area {
          display: flex;
          padding: 10px;
          border-top: 1px solid #e0e0e0;
          background: #fff;
        }
        .input-area input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 20px;
          margin-right: 10px;
        }
        .input-area button {
          padding: 10px 20px;
          background-color: #FEBE52;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
        }
        .input-area button:hover {
            background-color: #e0a840;
        }
        .suggestion-btn {
          width: 100%;
          text-align: left;
          padding: 10px 15px;
          background-color: #f0f0f0;
          color: #333;
          border: none;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          margin: 2px 0;
          position: relative;
          overflow: hidden;
        }
        .suggestion-btn:hover {
          background-color: #e8e8e8;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}