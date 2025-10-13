'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import useChatbot from '../hooks/useChatbot';

// Expanded list of keywords kasama ang Tagalog at mga karagdagang salita
const keywordSuggestions = {
  pets: {
    keywords: [
      'pet', 'dog', 'cat', 'animal', 'puppy', 'kitten', 'pet-friendly', 'animals',
      'alaga', 'alagang hayop', 'aso', 'pusa', 'pet', 'alaga'
    ],
    suggestions: [
      {
        text: '🐾 Are pets allowed?',
        answer:
          'Pets must wear diapers at all times within the resort. The resort is not liable for any incidents caused by pets. Owners will be held responsible for any damages or legal liabilities.',
      },
      {
        text: '🐾 What are the pet policies?',
        answer:
          'Pets must wear diapers at all times. The resort is not liable for pet behavior; owners are responsible for incidents and damages.',
      },
    ],
  },
  rooms: {
    keywords: [
      'room', 'villa', 'loft', 'teepee', 'accommodation', 'stay', 'sleep', 'suite', 'lodging',
      'kwarto', 'silid', 'tahanan', 'tuluyan', 'bungalow', 'kuwarto', 'tulugan', 'presyo', 'price', 'rate'
    ],
    suggestions: [
      {
        text: '🏡 What are the room types?',
        answer:
          'We offer different room types such as Villa Rooms, Loft Rooms, and Teepee Rooms. Each room includes basic amenities such as pool access, beach access, and other inclusions depending on the room type.',
        showBookNow: true,
      },
      {
        text: '💰 What are the room rates?',
        answer:
          'Teepee Room — ₱6,000 / 22 hrs (max 5 pax)\nLoft Room — ₱5,000 / 22 hrs (2–4 pax)\nVilla Room — ₱8,000 / 22 hrs (max 8 pax)',
        showBookNow: true,
      },
      {
        text: '🛏️ What are the room inclusions?',
        answer:
          'Free amenities include the swimming pool, beach access, and free WiFi. You can also see the included amenities and available choices during the booking process for each room type.',
      },
    ],
  },
  amenities: {
    keywords: [
      'amenity', 'amenities', 'facility', 'facilities', 'pool', 'beach', 'wifi', 'activities', 'entertainment',
      'pasilidad', 'kagamitan', 'gamit', 'himpilan', 'pasilidad', 'pampalipas', 'kagamitan', 'serbisyo', 'gamit', 'kagamitang pasilidad'
    ],
    suggestions: [
      {
        text: '🏊‍♂️ What amenities are available?',
        answer: 'We offer various amenities including swimming pools, beach access, WiFi, and more. Some amenities may vary by room type.',
      },
      {
        text: '🌊 Is there beach access?',
        answer: 'Yes, we have direct beach access available for all guests.',
      },
      {
        text: '🎉 What activities can I do?',
        answer: 'Enjoy snorkeling, hiking, yoga, nightly entertainment, and other fun activities during your stay.',
      },
    ],
  },
  booking: {
    keywords: [
      'book', 'reserve', 'reservation', 'available', 'availability', 'schedule', 'dates',
      'magpa-reserve', 'pag-book', 'reservasyon', 'availability', 'petsa', 'schedule', 'paano mag-book', 'magpareserba', 'sched', 'booking', 'book'
    ],
    suggestions: [
      {
        text: '📅 How do I make a booking?',
        answer: 'You can book directly through our website by selecting your preferred dates and room type. We\'ll guide you through the process.',
        showBookNow: true,
      },
      {
        text: '❓ What\'s the booking process?',
        answer: 'Select your dates and room type, review amenities and add-ons, then proceed to payment. You\'ll receive a confirmation email with your booking details.',
        showBookNow: true,
      },
    ],
  },
  policies: {
    keywords: [
      'policy', 'rules', 'regulations', 'guidelines', 'safety', 'security', 'check-in', 'check-out', 
      'cancellation', 'refund', 'terms', 'conditions', 'policies', 'terms of service', 'terms and conditions', 'house rules', 'resort policies', 'booking policies', 'cancellation policy', 'refund policy',
      'patakaran', 'batas', 'regulasyon', 'safety', 'seguridad', 'checkin', 'checkout', 'pagsususpinde', 'refound', 'mga patakaran', 'check in', 'check out', 'corkage'
    ],
    suggestions: [
      {
        text: '📝 What are the resort policies?',
        answer: 'Our policies include no smoking in rooms, pet policies, check-in/out times, and safety guidelines. Please refer to our full policies on the website.',
      },
    ],
  },
  facilities: {
    keywords: [
      'facilities', 'features', 'services', 'activities', 'events', 'entertainment', 'pasilidad', 'kagamitan', 'serbisyo', 'kaganapan'
    ],
    suggestions: [
      {
        text: '🎉 What facilities are available?',
        answer: 'We offer a range of facilities including pools, gym, event spaces, and recreational activities.',
      },
    ],
  },
  owner: {
    keywords: [
      'owner', 'management', 'director', 'who owns', 'who is the owner', 'owner info', 'may-ari', 'management', 'direktor', 'mayari', 'admin', 'tao', 'makausap', 'totooong tao', 'totoo',
    ],
    suggestions: [
      {
        text: 'Visit our Facebook page for more information about the owner.',
        answer: (
          <a
            href="https://www.facebook.com/CharkoolLeisureBeachResort"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#333', textDecoration: 'underline' }}
          >
            Facebook Page: Charkool Leisure Beach Resort
          </a>
        ),
        showBookNow: false,
      },
    ],
  },
};

// Function to normalize user input for better matching
const normalizeInput = (text) => {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
};

// List of greeting keywords
const greetingKeywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];

// Button component for "Book Now"
const BookNowButton = () => (
  <button
    className="book-now-btn"
    onClick={() => (window.location.href = '/booking')}
  >
    Book Now!
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
        transition: all 0.2s ease;
      }
      .book-now-btn:hover {
        background-color: #e0a840;
        transform: translateY(-1px);
      }
    `}</style>
  </button>
);

export default function ChatInterface({ isModal }) {
  const [messages, setMessages] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { categories, isLoading, error, fetchAnswer } = useChatbot();

  // Initialize with greeting
  useEffect(() => {
    setMessages([{ type: 'bot', text: 'Hi! How can I assist you today?' }]);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle click on category
  const handleCategoryClick = (category) => {
    setCurrentCategory(category);
    setShowCategories(false);
    setMessages((prev) => [
      ...prev,
      { type: 'bot', text: `Here are some questions about ${category.name}:` },
    ]);
  };

  // Handle click on question
  const handleQuestionClick = async (question) => {
    setMessages((prev) => [...prev, { type: 'user', text: question.text }]);
    const answer = await fetchAnswer(question.id);
    setMessages((prev) => [
      ...prev,
      { type: 'bot', text: answer, showBookNow: question.showBookNow },
    ]);
  };

  // Handle back to categories
  const handleBackToCategories = () => {
    setCurrentCategory(null);
    setShowCategories(true);
  };

  // Handle click on suggestion
  const handleSuggestionClick = (suggestion) => {
    setMessages((prev) => [
      ...prev,
      { type: 'user', text: suggestion.text },
      { type: 'bot', text: suggestion.answer, showBookNow: suggestion.showBookNow },
    ]);
  };

  // Handle user message send
 const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Add user's message
    setMessages((prev) => [...prev, { type: 'user', text: trimmedInput }]);

    const lowerInput = normalizeInput(trimmedInput);

    // Check for greetings
    if (greetingKeywords.some((greet) => lowerInput.includes(greet))) {
      setMessages((prev) => [
        ...prev,
        { type: 'bot', text: 'Hello! How can I assist you today?' },
      ]);
      setInput('');
      return;
    }

    // Check if user asks about owner
    const ownerKeywords = ['owner', 'management', 'director', 'who owns', 'who is the owner', 'owner info'];
    if (ownerKeywords.some((kw) => lowerInput.includes(kw))) {
      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          text: 'Visit our Facebook page for more info about the owner.',
        },
        {
          type: 'bot',
          text: (
            <a
              href="https://www.facebook.com/CharkoolLeisureBeachResort"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#333', textDecoration: 'underline' }}
            >
              Facebook Page: Charkool Leisure Beach Resort
            </a>
          ),
          showBookNow: false,
        },
      ]);
      setInput('');
      return;
    }

    // Check for keyword suggestions
    let suggestionMatched = false;
    for (const categoryKey in keywordSuggestions) {
      const category = keywordSuggestions[categoryKey];
      if (category.keywords.some((kw) => lowerInput.includes(kw))) {
        // Show suggestions
        setMessages((prev) => [
          ...prev,
          { type: 'bot', text: 'Here are some quick answers that might help:' },
          ...category.suggestions.map((s) => ({
            type: 'suggestion',
            text: s.text,
            answer: s.answer,
            showBookNow: s.showBookNow,
          })),
        ]);
        suggestionMatched = true;
        break;
      }
    }

    // If no suggestion match, try matching user input to questions
    if (!suggestionMatched) {
      const matchedCategories = categories.filter((category) =>
        category.questions.some((q) =>
          normalizeInput(q.text).includes(lowerInput)
        )
      );

      if (matchedCategories.length > 0) {
        setMessages((prev) => [
          ...prev,
          { type: 'bot', text: 'Here are some questions that might help:' },
        ]);
        matchedCategories.forEach((category) => {
          const relevantQuestions = category.questions.filter((q) =>
            normalizeInput(q.text).includes(lowerInput)
          );
          setCurrentCategory({ ...category, questions: relevantQuestions });
        });
      } else {
        // No match found, show categories
        setMessages((prev) => [
          ...prev,
          { type: 'bot', text: "I'm not sure about that. Here are all the categories I can help you with:" },
        ]);
        setShowCategories(true);
      }
    }

    setInput('');
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={`message ${msg.type}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.type === 'suggestion' ? (
              <div className="message-wrapper">
                <button
                  className="suggestion-btn"
                  onClick={() => handleSuggestionClick(msg)}
                >
                  {msg.text}
                </button>
              </div>
            ) : (
              <div className={`message-wrapper ${msg.type}`}>
                <div className="message-bubble">
                  <p>{msg.text}</p>
                  {msg.showBookNow && <BookNowButton />}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="interaction-area">
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>

        {currentCategory ? (
          <div className="questions-list">
            <button className="back-button" onClick={handleBackToCategories}>
              ← Back to Categories
            </button>
            {currentCategory.questions.map((question, index) => (
              <button
                key={index}
                className="question-btn"
                onClick={() => handleQuestionClick(question)}
              >
                {question.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="categories-list">
            {categories.map((category, index) => (
              <button
                key={index}
                className="category-btn"
                onClick={() => handleCategoryClick(category)}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        /* Styles for chat container */
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ffffff;
        }

        /* Messages area styling */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px 0;
        }

        /* Individual message styles */
        .message {
          display: flex;
          padding: 4px 16px;
          margin-bottom: 2px;
        }

        /* Wrapper for message content */
        .message-wrapper {
          max-width: 70%;
          width: fit-content;
          display: flex;
          margin: 2px 0;
        }

        /* User messages aligned right */
        .message-wrapper.user {
          margin-left: auto;
        }

        /* Bot messages aligned left */
        .message-wrapper.bot {
          margin-right: auto;
        }

        /* Suggestions styled similarly to user messages */
        .message-wrapper.suggestion {
          margin-right: auto;
          max-width: 85%;
        }

        /* Bubble styling */
        .message-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          line-height: 1.4;
          animation: fadeIn 0.3s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          max-width: 100%;
        }

        /* Text inside bubbles */
        .message-bubble p {
          margin: 0;
          white-space: pre-wrap;
        }

        /* User message bubble style */
        .message-wrapper.user .message-bubble {
          background-color: #FEBE52;
          color: #333;
          border-bottom-left-radius: 4px;
        }

        /* Bot message bubble style */
        .message-wrapper.bot .message-bubble {
          background-color: #e5e5e5;
          color: #333;
          border-bottom-right-radius: 4px;
        }

        /* Interaction area styling */
        .interaction-area {
          border-top: 1px solid #e0e0e0;
          padding: 12px;
          background: #ffffff;
        }

        /* List of categories and questions */
        .categories-list,
        .questions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* Category and question buttons */
        .category-btn,
        .question-btn {
          padding: 10px 16px;
          background-color: #FEBE52;
          color: #333;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          text-align: left;
        }

        /* Question button style */
        .question-btn {
          width: 100%;
          background-color: #f5f5f5;
        }

        /* Hover effects for buttons */
        .category-btn:hover,
        .question-btn:hover {
          background-color: #e0a840;
          transform: translateY(-1px);
        }

        /* Back button styling */
        .back-button {
          width: 100%;
          padding: 10px;
          margin-bottom: 8px;
          background: transparent;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          color: #666;
          transition: all 0.2s ease;
        }

        /* Hover effect for back button */
        .back-button:hover {
          background: #f5f5f5;
        }

        /* Suggestion button styling */
        .suggestion-btn {
          width: 100%;
          padding: 12px 16px;
          margin: 4px 0;
          background-color: #FEBE52;
          color: #333;
          border: none;
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        /* Hover for suggestion buttons */
        .suggestion-btn:hover {
          background-color: #e0e0e0;
          transform: translateY(-1px);
        }

        /* Input area styling */
        .input-area {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: #ffffff;
        }

        /* Input styling */
        .input-area input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
        }

        /* Focus state for input */
        .input-area input:focus {
          border-color: #FEBE52;
        }

        /* Send button styling */
        .input-area button {
          padding: 10px 20px;
          background-color: #FEBE52;
          color: #333;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        /* Hover for send button */
        .input-area button:hover {
          background-color: #e0a840;
          transform: translateY(-1px);
        }

        /* Fade in animation */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}