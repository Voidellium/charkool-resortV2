'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Loader2, Clock, MessageCircle,
  Wifi, Users, Calendar, CheckCircle, X, ChevronDown, 
  MapPin, Star, Coffee, Home, Phone, Smile, Sun, Moon
} from 'lucide-react';
import useChatbot from '../hooks/useChatbot';

// Enhanced keyword suggestions with better structure
const keywordSuggestions = {
  pets: {
    keywords: [
      'pet', 'dog', 'cat', 'animal', 'puppy', 'kitten', 'pet-friendly', 'animals',
      'alaga', 'alagang hayop', 'aso', 'pusa', 'hayop'
    ],
    suggestions: [
      {
        id: 'pet_allowed',
        text: '🐾 Are pets allowed?',
        answer: 'Yes! Pets are welcome at Charkool Resort. However, pets must wear diapers at all times within the resort premises for hygiene purposes. Pet owners are fully responsible for their pets\' behavior and any damages that may occur.',
        showBookNow: false,
      },
      {
        id: 'pet_policy',
        text: '🐾 What are the pet policies?',
        answer: 'Our pet policy includes: \n• Pets must wear diapers at all times\n• Owners are responsible for pet behavior and damages\n• Additional cleaning fee may apply\n• Please inform us during booking if bringing pets',
        showBookNow: false,
      },
    ],
  },
  rooms: {
    keywords: [
      'room', 'rooms', 'villa', 'loft', 'teepee', 'accommodation', 'stay', 'sleep', 'suite', 'lodging',
      'kwarto', 'silid', 'tuluyan', 'bungalow', 'price', 'rate', 'magkano', 'presyo', 'how much'
    ],
    suggestions: [
      {
        id: 'room_types',
        text: '🏡 What room types do you have?',
        answer: 'We offer three unique room types:\n\n🏠 Villa Room (₱8,000/22hrs, max 8 pax)\n🏢 Loft Room (₱5,000/22hrs, 2-4 pax)\n⛺ Teepee Room (₱6,000/22hrs, max 5 pax)\n\n💡 Additional Pax: Up to 2 extra guests per room at ₱400 each\n\nEach includes pool access, beach access, and WiFi!',
        showBookNow: true,
      },
      {
        id: 'room_rates',
        text: '💰 What are your room rates?',
        answer: 'Our current rates for 22-hour stays:\n\n💎 Villa Room — ₱8,000 (max 8 guests)\n🏢 Loft Room — ₱5,000 (2-4 guests)\n⛺ Teepee Room — ₱6,000 (max 5 guests)\n\n💡 Additional Pax: Up to 2 extra guests per room at ₱400 each\n\nAll rates include complimentary amenities!',
        showBookNow: true,
      },
      {
        id: 'room_inclusions',
        text: '🎁 What\'s included with the rooms?',
        answer: 'Every room includes:\n• Swimming pool access\n• Private beach access\n• High-speed WiFi\n• Basic toiletries\n• 24/7 security\n• Parking space\n\nAdditional amenities vary by room type!',
        showBookNow: false,
      },
    ],
  },
  amenities: {
    keywords: [
      'amenity', 'amenities', 'facility', 'facilities', 'pool', 'beach', 'wifi', 'activities', 'entertainment',
      'pasilidad', 'kagamitan', 'swimming', 'gym', 'restaurant'
    ],
    suggestions: [
      {
        id: 'available_amenities',
        text: '🏊‍♂️ What amenities are available?',
        answer: 'Charkool Resort offers amazing amenities:\n\n🏊‍♂️ Multiple swimming pools\n🏖️ Private beach access\n📶 High-speed WiFi\n🍽️ Restaurant & bar\n🎾 Sports facilities\n🎪 Event spaces\n🚗 Free parking',
        showBookNow: false,
      },
      {
        id: 'beach_access',
        text: '🌊 Do you have beach access?',
        answer: 'Yes! We have direct access to a beautiful private beach. Enjoy swimming, sunbathing, water sports, and stunning sunset views. Beach chairs and umbrellas are available for guests.',
        showBookNow: false,
      },
      {
        id: 'activities',
        text: '🎉 What activities can we do?',
        answer: 'Exciting activities await:\n\n🤿 Snorkeling & diving\n🚣 Kayaking\n🧘 Yoga sessions\n🎵 Live entertainment\n🏐 Beach volleyball\n🎣 Fishing trips\n🌅 Sunset watching',
        showBookNow: false,
      },
    ],
  },
  booking: {
    keywords: [
      'book', 'booking', 'reserve', 'reservation', 'available', 'availability', 'schedule', 'dates',
      'magpa-reserve', 'pag-book', 'reservasyon', 'petsa', 'paano mag-book'
    ],
    suggestions: [
      {
        id: 'how_to_book',
        text: '📅 How do I make a reservation?',
        answer: 'Booking is easy! Here\'s how:\n\n1️⃣ Choose your preferred dates\n2️⃣ Select room type\n3️⃣ Add optional amenities\n4️⃣ Complete secure payment\n5️⃣ Receive instant confirmation\n\nBook online 24/7 through our website!',
        showBookNow: true,
      },
      {
        id: 'booking_process',
        text: '📋 What\'s the booking process?',
        answer: 'Our streamlined process:\n• Check availability for your dates\n• Review room options and pricing\n• Customize with add-on services\n• Secure payment processing\n• Instant email confirmation\n• Pre-arrival information sent',
        showBookNow: true,
      },
    ],
  },
  policies: {
    keywords: [
      'policy', 'policies', 'rules', 'regulations', 'guidelines', 'check-in', 'check-out',
      'cancellation', 'refund', 'terms', 'conditions', 'patakaran'
    ],
    suggestions: [
      {
        id: 'resort_policies',
        text: '📝 What are your policies?',
        answer: 'Key policies for your stay:\n\n🚭 No smoking in rooms\n⏰ Check-in: 2 PM, Check-out: 12 PM\n🔞 Age restrictions for certain areas\n🎵 Quiet hours: 10 PM - 7 AM\n💳 Cancellation: 48hrs advance notice\n\nFull policy details provided upon booking.',
        showBookNow: false,
      },
    ],
  },
  location: {
    keywords: [
      'location', 'address', 'where', 'directions', 'map', 'how to get there', 'saan',
      'transportation', 'airport', 'travel'
    ],
    suggestions: [
      {
        id: 'resort_location',
        text: '📍 Where are you located?',
        answer: 'Charkool Leisure Beach Resort is located in a prime beachfront location with easy access to major attractions. We provide detailed directions and GPS coordinates upon booking confirmation.',
        showBookNow: false,
      },
    ],
  },
  contact: {
    keywords: [
      'contact', 'phone', 'email', 'facebook', 'social media', 'owner', 'management',
      'makipag-ugnayan', 'tawagan', 'may-ari'
    ],
    suggestions: [
      {
        id: 'contact_info',
        text: '📞 How can I contact you?',
  answer: 'You can connect with us through our Facebook page for more information about management and direct communication:\n\n📘 **Facebook**: Charkool Leisure Beach Resort\n📘 Facebook link: https://www.facebook.com/CharkoolLeisureBeachResort\n📧 **Email**: dcharkoolhausresort@gmail.com\n\nFor immediate assistance, I\'m here to help with any questions!',
        showBookNow: false,
      },
    ],
  },
};

// Enhanced greeting responses
const greetingResponses = [
  "Hello! Welcome to Charkool Resort! 🌊 How can I help make your stay amazing?",
  "Hi there! 👋 I'm Kool, your resort concierge. What can I assist you with today?",
  "Welcome! 🏖️ Ready to discover what Charkool Resort has to offer?",
  "Greetings! 🌴 I'm here to help you plan the perfect getaway. What interests you?",
];

// Function to normalize user input
const normalizeInput = (text) => {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
};

// Greeting keywords with variations
const greetingKeywords = [
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'kumusta', 'kamusta', 'halo', 'uy', 'sup', 'wassup', 'wassap', 'wazzup', 'wasap', 'wazap', 
 "what's up", 'whats up', 'whatsup'
];

// Basic explicit-language / profanity list — remove any racial slurs
const bannedWords = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'piss', 'motherfucker', 'puta', 'oten', 'kantot', 'bobo', 'tanga', 'inutil', 'gagu', 'tite', 'tits', 'titi', 'pussy', 'ogag', 'ugag', 'obob'
  , 'nigga', 'niga', 'pepe', 'kantut', 'fck', 'btch', 'sht', 'bstard', 'bstrd', 'ass', 'nigger'
];

const containsProfanity = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return bannedWords.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower));
};

// Mask profanity in-line: replace each offending word with asterisks of same length
const maskProfanity = (text) => {
  if (!text) return text;
  let masked = text;
  bannedWords.forEach((w) => {
    const regex = new RegExp(`\\b(${w})\\b`, 'ig');
    masked = masked.replace(regex, (m) => '*'.repeat(m.length));
  });
  return masked;
};

// Enhanced Book Now Button Component (updated UI)
const BookNowButton = ({ variant = 'primary' }) => (
  <motion.button
    type="button"
    role="button"
    className={`book-now-btn chat-booknow-btn ${variant}`}
    onClick={() => window.location.href = '/booking'}
    aria-label="Book Now"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    style={{
      background: 'linear-gradient(180deg, #FFD66B 0%, #FEBE52 100%)',
      color: '#1f2937',
      border: 'none',
      padding: '0.75rem 0.9rem',
      width: '100%',
      borderRadius: '14px',
      boxShadow: '0 12px 30px rgba(254, 190, 82, 0.22)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem'
    }}
  >
    <div
      className="btn-left"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: 'white', borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', flexShrink: 0 }}
    >
      <Calendar size={18} />
    </div>
    <div className="btn-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
      <div className="btn-title" style={{ fontSize: 15, color: '#1f2937', fontWeight: 800 }}>Book Now</div>
      <div className="btn-sub" style={{ fontSize: 12, opacity: 0.95, color: '#334155', marginTop: 2, fontWeight: 700 }}>Instant confirmation</div>
    </div>
    <div className="btn-badge" style={{ marginLeft: 'auto', background: '#f59e0b', color: '#fff', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>Best rate</div>

    <style jsx>{`
      /* Ensure message bubble places the button as a card */
      .message-actions {
        margin-top: 0.75rem;
        display: flex;
        gap: 0.5rem;
      }

      .message-actions .chat-booknow-btn {
        width: 100% !important;
        padding: 0.6rem !important;
        border-radius: 14px !important;
      }

      .book-now-btn, .chat-booknow-btn {
        display: flex !important;
        align-items: center !important;
        gap: 0.75rem !important;
        padding: 0.6rem 0.9rem !important;
        background: linear-gradient(180deg, #FFD66B 0%, #FEBE52 100%) !important;
        color: #1f2937 !important;
        border: none !important;
        border-radius: 14px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease !important;
        box-shadow: 0 10px 30px rgba(254, 190, 82, 0.18) !important;
      }

      .book-now-btn .btn-left, .chat-booknow-btn .btn-left {
        width: 40px !important;
        height: 40px !important;
        border-radius: 10px !important;
      }

      .book-now-btn .btn-badge, .chat-booknow-btn .btn-badge {
        background: #f59e0b !important;
        color: #fff !important;
        padding: 6px 10px !important;
        font-weight: 800 !important;
      }

      .book-now-btn:hover, .chat-booknow-btn:hover {
        transform: translateY(-3px) !important;
        box-shadow: 0 18px 50px rgba(254, 190, 82, 0.22) !important;
      }

      @media (max-width: 640px) {
        .message-actions .chat-booknow-btn {
          padding: 0.5rem !important;
        }
        .book-now-btn .btn-sub, .chat-booknow-btn .btn-sub { display: none !important; }
      }
    `}</style>
  </motion.button>
);

export default function ChatInterface({ isModal, onClose }) {
  const [messages, setMessages] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentOnline, setAgentOnline] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [messageStatus, setMessageStatus] = useState({});
  const [lastSeen, setLastSeen] = useState(new Date());
  const [conversationStarted, setConversationStarted] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [responseTime, setResponseTime] = useState('Usually replies instantly');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [awaitingGuestCount, setAwaitingGuestCount] = useState(false);
  const [awaitingCustomization, setAwaitingCustomization] = useState(false);
  const [awaitingBookingDate, setAwaitingBookingDate] = useState(false);
  const [lastGuestCount, setLastGuestCount] = useState(0);
  const [pendingBookingDate, setPendingBookingDate] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const didWelcomeRef = useRef(false);
  const { categories, isLoading, error, fetchAnswer } = useChatbot();

  // theme removed: component uses single light appearance

  // Enhanced welcome sequence
  useEffect(() => {
    const welcomeSequence = async () => {
      // Simulate realistic connection time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await simulateTyping(1500);
      const welcomeMessage = { 
        type: 'bot', 
        text: "Hello! Welcome to Charkool Leisure Beach Resort! 🌊",
        timestamp: new Date(),
        id: Date.now()
      };
      setMessages([welcomeMessage]);
      setMessageStatus({ [welcomeMessage.id]: 'delivered' });
      
      await simulateTyping(2500);
      const introMessage = {
        type: 'bot', 
        text: "I'm Kool, your chatbot resort concierge! 🏖️ I'm here to help you discover our amazing rooms, amenities, and make your booking process seamless.",
        timestamp: new Date(),
        id: Date.now() + 1
      };
      setMessages(prev => [...prev, introMessage]);
      setMessageStatus(prev => ({ ...prev, [introMessage.id]: 'delivered' }));
      
      await simulateTyping(2000);
      const helpMessage = {
        type: 'bot',
        text: "Feel free to ask me about room rates, amenities, booking procedures, or anything else about your perfect beach getaway! 🏄‍♂️",
        timestamp: new Date(),
        id: Date.now() + 2
      };
      setMessages(prev => [...prev, helpMessage]);
      setMessageStatus(prev => ({ ...prev, [helpMessage.id]: 'delivered' }));
      
      setShowQuickReplies(true);
      setConversationStarted(true);
      setLastSeen(new Date());
    };
    
    if (didWelcomeRef.current) return;
    didWelcomeRef.current = true;
    welcomeSequence();
  }, []);

  // Simulate typing indicator
  const simulateTyping = (duration = 2000) => {
    setIsTyping(true);
    return new Promise(resolve => {
      setTimeout(() => {
        setIsTyping(false);
        resolve();
      }, duration);
    });
  };

  // Handle user typing detection
  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    // Show user typing indicator
    if (!userTyping) {
      setUserTyping(true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setUserTyping(false);
    }, 1000);
  };

  // Generate more realistic response times
  const getResponseDelay = (messageLength) => {
    const baseDelay = 1000;
    const readingTime = messageLength * 50; // 50ms per character
    const thinkingTime = Math.random() * 1500; // Random thinking time
    return Math.min(baseDelay + readingTime + thinkingTime, 4000); // Max 4 seconds
  };

  // Fetch real-time room availability for a specific date
  const fetchRoomAvailability = async (checkInDate) => {
    try {
      console.log('[ChatInterface] Fetching availability for date:', checkInDate);
      const url = `/api/rooms/availability?date=${checkInDate}`;
      console.log('[ChatInterface] Full URL:', url);
      
      const response = await fetch(url);
      console.log('[ChatInterface] Response status:', response.status);
      console.log('[ChatInterface] Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatInterface] Error response:', errorText);
        throw new Error(`Failed to fetch availability: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[ChatInterface] Availability data received:', data);
      return data; // Expected format: { villa: 3, loft: 2, teepee: 4 }
    } catch (error) {
      console.error('[ChatInterface] Error fetching room availability:', error);
      console.error('[ChatInterface] Error details:', error.message);
      // Return default availability on error
      return { villa: 4, loft: 4, teepee: 4 };
    }
  };

  // Parse natural language date input and validate
  const parseDate = (input) => {
    const lowerInput = input.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let parsedDate = null;
    
    // Handle "today"
    if (lowerInput === 'today') {
      parsedDate = new Date(today);
    }
    // Handle "tomorrow"
    else if (lowerInput === 'tomorrow') {
      parsedDate = new Date(today);
      parsedDate.setDate(parsedDate.getDate() + 1);
    }
    // Handle "next week"
    else if (lowerInput.includes('next week')) {
      parsedDate = new Date(today);
      parsedDate.setDate(parsedDate.getDate() + 7);
    }
    // Try parsing standard date formats
    else {
      parsedDate = new Date(input);
      if (isNaN(parsedDate.getTime())) {
        return { valid: false, error: 'format' }; // Invalid format
      }
    }
    
    // Set to start of day for comparison
    parsedDate.setHours(0, 0, 0, 0);
    
    // Validate date is not in the past
    if (parsedDate < today) {
      return { valid: false, error: 'past' }; // Date is in the past
    }
    
    // Validate date is within reasonable booking window (e.g., within 1 year)
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (parsedDate > oneYearFromNow) {
      return { valid: false, error: 'too_far' }; // Date is too far in future
    }
    
    return { valid: true, date: parsedDate.toISOString().split('T')[0] };
  };

  // Render message content with clickable links and emails
  // Render message content with clickable links and emails
  const renderMessageContent = (text) => {
    if (!text) return null;

    // Helper: parse **bold** tokens into React nodes
    const parseBold = (str, keyBase) => {
      const nodes = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let last = 0;
      let m;
      let idx = 0;
      while ((m = boldRegex.exec(str)) !== null) {
        if (m.index > last) nodes.push(str.slice(last, m.index));
        nodes.push(<strong key={`${keyBase}-b-${idx}`}>{m[1]}</strong>);
        last = m.index + m[0].length;
        idx += 1;
      }
      if (last < str.length) nodes.push(str.slice(last));
      // If no matches, return original string (not array)
      return nodes.length === 1 && typeof nodes[0] === 'string' ? nodes[0] : nodes;
    };

    // Convert URLs and emails into anchors, and parse bold formatting in non-link segments
    const linkRegex = /(https?:\/\/[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/ig;
    const parts = [];
    let lastIndex = 0;
    let match;
    let pieceKey = 0;
    while ((match = linkRegex.exec(text)) !== null) {
      const url = match[0];
      const index = match.index;
      if (index > lastIndex) {
        const pre = text.slice(lastIndex, index);
        const parsed = parseBold(pre, `pre-${pieceKey}`);
        if (Array.isArray(parsed)) parsed.forEach((p, i) => parts.push(<span key={`pre-${pieceKey}-${i}`}>{p}</span>));
        else parts.push(parsed);
        pieceKey += 1;
      }
      const isUrl = /^https?:\/\//i.test(url);
      if (isUrl) {
        parts.push(
          <a key={`link-${pieceKey}`} href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        );
      } else {
        parts.push(
          <a key={`email-${pieceKey}`} href={`mailto:${url}`}>{url}</a>
        );
      }
      lastIndex = index + url.length;
      pieceKey += 1;
    }
    if (lastIndex < text.length) {
      const rest = text.slice(lastIndex);
      const parsed = parseBold(rest, `rest-${pieceKey}`);
      if (Array.isArray(parsed)) parsed.forEach((p, i) => parts.push(<span key={`rest-${pieceKey}-${i}`}>{p}</span>));
      else parts.push(parsed);
    }
    return parts;
  };

  // Helper to format timestamps consistently (accepts Date or string)
  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = ts instanceof Date ? ts : new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep input focused after interactions (quick replies, suggestions, questions)
  useEffect(() => {
    if (isTyping) return; // don't focus while bot is typing
    // small delay to allow any DOM updates
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [messages, isTyping]);

  // Handle category clicks from database
  const handleCategoryClick = async (category) => {
    const userMessage = {
      type: 'user',
      text: `Tell me about ${category.name}`,
      timestamp: new Date(),
      id: Date.now()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setMessageStatus(prev => ({ ...prev, [userMessage.id]: 'delivered' }));
    
    await simulateTyping(1500);
    
    const botMessage = {
      type: 'bot', 
      text: `Here are some popular questions about ${category.name}:`,
      timestamp: new Date(),
      id: Date.now() + 1,
      category: category,
      showQuestions: true
    };
    
    setMessages((prev) => [...prev, botMessage]);
    setMessageStatus(prev => ({ ...prev, [botMessage.id]: 'delivered' }));
    setCurrentCategory(category);
  };

  // Handle specific question clicks from database
  const handleQuestionClick = async (question) => {
    const userMessage = {
      type: 'user', 
      text: question.text,
      timestamp: new Date(),
      id: Date.now()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setMessageStatus(prev => ({ ...prev, [userMessage.id]: 'delivered' }));
    
    await simulateTyping(2000);
    
    try {
      const answer = await fetchAnswer(question.id);
      const botMessage = {
        type: 'bot', 
        text: answer,
        showBookNow: question.showBookNow,
        timestamp: new Date(),
        id: Date.now() + 1
      };
      
      setMessages((prev) => [...prev, botMessage]);
      setMessageStatus(prev => ({ ...prev, [botMessage.id]: 'delivered' }));
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        text: "I apologize, but I'm having trouble accessing that information right now. Please try asking in a different way or contact our staff directly.",
        timestamp: new Date(),
        id: Date.now() + 1
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      setMessageStatus(prev => ({ ...prev, [errorMessage.id]: 'delivered' }));
    }
    // keep input focused after question response
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Handle suggestion clicks from predefined suggestions
  const handleSuggestionClick = async (suggestion) => {
    // If suggestion has no prepared answer, map it to an appropriate quick-reply
    if (!suggestion.answer || String(suggestion.answer).trim() === '') {
      const text = (suggestion.id || suggestion.text || '').toString().toLowerCase();
      if (text.includes('room') || text.includes('rate')) {
        await handleQuickReply('room_rates');
        setShowSuggestions(false);
        return;
      }
      if (text.includes('book') || text.includes('booking') || text.includes('how to book')) {
        await handleQuickReply('booking_process');
        setShowSuggestions(false);
        return;
      }
      if (text.includes('amenit') || text.includes('pool') || text.includes('beach')) {
        await handleQuickReply('amenities');
        setShowSuggestions(false);
        return;
      }

      // No mapping found: show polite fallback
      const botMessage = {
        type: 'bot',
        text: "Sorry, I don't have a prepared answer for that suggestion right now. Try another suggestion or ask about rooms, rates, or booking.",
        timestamp: new Date(),
        id: Date.now() + 1
      };
      setMessages((prev) => [...prev, botMessage]);
      setMessageStatus(prev => ({ ...prev, [botMessage.id]: 'delivered' }));
      setShowSuggestions(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Normal path: suggestion has an answer string
    const userMessage = {
      type: 'user', 
      text: suggestion.text, 
      timestamp: new Date(),
      id: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageStatus(prev => ({ ...prev, [userMessage.id]: 'delivered' }));

    await simulateTyping(1800);

    const botMessage = {
      type: 'bot', 
      text: suggestion.answer, 
      showBookNow: suggestion.showBookNow, 
      timestamp: new Date(),
      id: Date.now() + 1
    };

    setMessages((prev) => [...prev, botMessage]);
    setMessageStatus(prev => ({ ...prev, [botMessage.id]: 'delivered' }));
    setShowSuggestions(false);
    // keep the input focused so the user can continue typing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Enhanced quick reply handler
  const handleQuickReply = async (replyType) => {
    let userText = '';
    let response = '';
    let responseData = {};
    
    // Define user message and response based on reply type
    switch(replyType) {
      case 'room_suggestions':
        userText = '🏨 Can you suggest a room?';
        response = "I'd be happy to suggest the perfect room for you! 🏖️\n\nHow many guests will be staying?";
        responseData = { showBookNow: false };
        setAwaitingGuestCount(true);
        break;

      case 'room_rates':
        userText = '💰 What are your room rates?';
        response = 'Here are our current room rates for 22-hour stays:\n\n🏠 **Villa Room** — ₱8,000 (8 guests + up to 2 additional pax)\n🏢 **Loft Room** — ₱5,000 (2 guests + up to 2 additional pax) \n⛺ **Teepee Room** — ₱6,000 (5 guests + up to 2 additional pax)\n\n💡 **Additional Pax:** ₱400 per person (max 2 per room)\n\n✨ All rooms include:\n• Swimming pool access\n• Private beach access  \n• High-speed WiFi\n• Complimentary parking';
        responseData = { showBookNow: true };
        break;
        
      case 'amenities':
        userText = '🏊‍♂️ What amenities do you offer?';
        response = 'Charkool Resort offers incredible amenities:\n\n🏊‍♂️ **Multiple Swimming Pools**\n🏖️ **Private Beach Access**\n📶 **High-Speed WiFi**\n🍽️ **Restaurant & Bar**\n🎾 **Sports Facilities**\n🎪 **Event Spaces**\n🚗 **Free Parking**\n🛡️ **24/7 Security**';
        responseData = { showBookNow: false };
        break;
        
      case 'pet_policy':
        userText = '🐾 What are your pet policies?';
        response = 'We welcome your furry family members! 🐕🐱\n\n**Pet Policy:**\n• Pets must wear diapers at all times\n• Owners responsible for pet behavior\n• Additional cleaning fee may apply\n• Must inform us during booking\n• Designated pet-friendly areas available\n\n**We want everyone to have a pawsome stay!** 🐾';
        responseData = { showBookNow: false };
        break;
        
      case 'booking_process':
        userText = '📅 How do I make a booking?';
        response = 'Booking your dream vacation is easy! 🌴\n\n**Simple Steps:**\n1️⃣ **Choose dates** - Select your preferred stay\n2️⃣ **Pick room type** - Villa, Loft, or Teepee\n3️⃣ **Add amenities** - Customize your experience\n4️⃣ **Secure payment** - Safe & encrypted\n5️⃣ **Get confirmation** - Instant booking receipt\n\n**Available 24/7 online!** Ready to start?';
        responseData = { showBookNow: true };
        break;
        
      case 'location':
        userText = '📍 Where are you located?';
        response = 'We\'re located at a stunning beachfront location! 🏖️\n\n**Getting Here:**\n• Detailed directions provided upon booking\n• GPS coordinates in confirmation email\n• Transportation assistance available\n• Easy access from major highways\n\nOnce you book, we\'ll send you everything you need for a smooth arrival!';
        responseData = { showBookNow: false };
        break;
        
      default:
        userText = replyType;
        response = 'I\'d be happy to help! Could you please be more specific about what you\'d like to know?';
        responseData = { showBookNow: false };
    }
    
    // Add user message
    const userMessage = {
      type: 'user', 
      text: userText,
      timestamp: new Date(),
      id: Date.now()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setMessageStatus(prev => ({ ...prev, [userMessage.id]: 'delivered' }));
    setShowQuickReplies(false);
    
    // Simulate bot thinking
    await simulateTyping(2000);
    
    // Add bot response
    const botMessage = { 
      type: 'bot', 
      text: response,
      timestamp: new Date(),
      id: Date.now() + 1,
      ...responseData
    };
    
    setMessages((prev) => [...prev, botMessage]);
    setMessageStatus(prev => ({ ...prev, [botMessage.id]: 'delivered' }));
  };

  // Function to suggest rooms based on guest count
  const suggestRoomsByGuestCount = async (guestCount, bookingDate = null) => {
    let roomSuggestion = '';
    
    // If no booking date provided, ask for it first
    if (!bookingDate) {
      roomSuggestion = `Great! For ${guestCount} guest${guestCount > 1 ? 's' : ''}, I can help you find the perfect room. 🏖️\n\nTo check real-time availability, please tell me:\n\n📅 **When would you like to check in?**\n\nYou can provide the date in formats like:\n• "December 25, 2024"\n• "12/25/2024"\n• "2024-12-25"\n• "tomorrow"\n• "next week"`;
      
      const responseId = Date.now();
      const response = {
        type: 'bot',
        text: roomSuggestion,
        timestamp: new Date(),
        id: responseId,
        showBookNow: false
      };
      
      setMessages((prev) => [...prev, response]);
      setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
      setAwaitingBookingDate(true);
      setLastGuestCount(guestCount);
      return;
    }
    
    // Fetch real-time availability for the booking date
    const availability = await fetchRoomAvailability(bookingDate);
    
    // Room availability from API
    const AVAILABLE_ROOMS = {
      villa: { count: availability.villa || 0, capacity: 8, basePrice: 8000, name: 'Villa Room' },
      loft: { count: availability.loft || 0, capacity: 2, basePrice: 5000, name: 'Loft Room' },
      teepee: { count: availability.teepee || 0, capacity: 5, basePrice: 6000, name: 'Teepee Room' }
    };
    
    // Maximum capacity calculation (with 2 additional pax per room)
    const maxCapacity = (AVAILABLE_ROOMS.villa.count * (AVAILABLE_ROOMS.villa.capacity + 2)) +
                        (AVAILABLE_ROOMS.loft.count * (AVAILABLE_ROOMS.loft.capacity + 2)) +
                        (AVAILABLE_ROOMS.teepee.count * (AVAILABLE_ROOMS.teepee.capacity + 2));
    
    // Maximum capacity without additional pax
    const standardCapacity = (AVAILABLE_ROOMS.villa.count * AVAILABLE_ROOMS.villa.capacity) +
                             (AVAILABLE_ROOMS.loft.count * AVAILABLE_ROOMS.loft.capacity) +
                             (AVAILABLE_ROOMS.teepee.count * AVAILABLE_ROOMS.teepee.capacity);
    
    if (guestCount <= 0 || isNaN(guestCount)) {
      roomSuggestion = "Please provide a valid number of guests so I can suggest the perfect room for you! 😊";
    } else if (guestCount > maxCapacity) {
      // Exceeds maximum capacity
      roomSuggestion = `I apologize, but we currently don't have enough capacity for ${guestCount} guests. 😔\n\n**Our Resort Capacity:**\n🏠 4 Villa Rooms (8 guests + up to 2 additional each)\n🏢 4 Loft Rooms (2 guests + up to 2 additional each)\n⛺ 4 Teepee Rooms (5 guests + up to 2 additional each)\n\n**Maximum Total Capacity:** ${maxCapacity} guests\n**Standard Capacity:** ${standardCapacity} guests\n\n💡 **Suggestions:**\n• Split your group and book on different dates\n• Consider booking for a smaller group\n• Contact us for special arrangements\n\n📧 Email: dcharkoolhausresort@gmail.com\n📘 Facebook: Charkool Leisure Beach Resort\n\nWe'd love to accommodate your group in the best way possible!`;
    } else if (guestCount >= 1 && guestCount <= 4) {
      // Loft Room: Standard capacity 2 pax, can add up to 2 more
      const baseCost = 5000;
      const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      roomSuggestion = `For ${guestCount} guest${guestCount > 1 ? 's' : ''}, I recommend:\n\n🏢 **Loft Room** — ₱5,000/22hrs (2 pax + up to 2 additional)\n✨ Perfect for small groups or couples\n• Swimming pool access\n• Private beach access\n• High-speed WiFi\n• Cozy and comfortable\n\n💰 **Total Cost: ₱${baseCost.toLocaleString()}**\n� **Check-in Date:** ${formattedDate}\n�📊 **Available:** ${AVAILABLE_ROOMS.loft.count} Loft Room${AVAILABLE_ROOMS.loft.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.loft.count === 0 ? '⚠️ SOLD OUT' : '✅'}`;
    } else if (guestCount === 5) {
      // Teepee Room: Standard capacity 5 pax OR Villa with extra space
      const teepeeCost = 6000;
      const villaCost = 8000;
      const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      roomSuggestion = `For ${guestCount} guests, I have two great options:\n\n⛺ **Teepee Room** — ₱6,000/22hrs (5 pax + up to 2 additional)\n💰 **Total Cost: ₱${teepeeCost.toLocaleString()}**\n� **Check-in Date:** ${formattedDate}\n�📊 **Available:** ${AVAILABLE_ROOMS.teepee.count} Teepee Room${AVAILABLE_ROOMS.teepee.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.teepee.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n\n🏠 **Villa Room** — ₱8,000/22hrs (8 pax + up to 2 additional)\n💰 **Total Cost: ₱${villaCost.toLocaleString()}** (extra space!)\n📊 **Available:** ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.villa.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n\n✨ Both include:\n• Swimming pool access\n• Private beach access\n• High-speed WiFi`;
    } else if (guestCount === 6) {
      // Villa Room: Standard capacity 8 pax, or Loft + additional pax
      const villaCost = 8000;
      const loftBase = 5000;
      const additionalPax = 2;
      const additionalCost = additionalPax * 400;
      const loftTotal = loftBase + additionalCost;
      const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      roomSuggestion = `For ${guestCount} guests, here are your options:\n\n**OPTION 1 (Recommended):**\n🏠 **Villa Room** — ₱8,000/22hrs (8 pax + up to 2 additional)\n💰 **Total Cost: ₱${villaCost.toLocaleString()}**\n✨ Spacious with room for 2 more guests!\n\n**OPTION 2:**\n🏢 **Loft Room** (2 pax + 2 additional pax) + 2 additional pax\nBase Rate: ₱${loftBase.toLocaleString()}\nAdditional Pax (2 × ₱400): ₱${additionalCost.toLocaleString()}\n💰 **Total Cost: ₱${loftTotal.toLocaleString()}**\n\n� **Check-in Date:** ${formattedDate}\n�📊 **Room Availability:**\n• ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.villa.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n• ${AVAILABLE_ROOMS.loft.count} Loft Room${AVAILABLE_ROOMS.loft.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.loft.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n\n✨ All rooms include pool access, beach access & WiFi!`;
    } else if (guestCount === 7) {
      // Villa Room OR Teepee + additional pax
      const villaCost = 8000;
      const teepeeBase = 6000;
      const additionalPax = 2;
      const additionalCost = additionalPax * 400;
      const teepeeTotal = teepeeBase + additionalCost;
      const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      roomSuggestion = `For ${guestCount} guests, here are your options:\n\n**OPTION 1 (Recommended):**\n🏠 **Villa Room** — ₱8,000/22hrs (8 pax + up to 2 additional)\n💰 **Total Cost: ₱${villaCost.toLocaleString()}**\n✨ Spacious with room for 1 more guest!\n\n**OPTION 2:**\n⛺ **Teepee Room** (5 pax + 2 additional pax)\nBase Rate: ₱${teepeeBase.toLocaleString()}\nAdditional Pax (2 × ₱400): ₱${additionalCost.toLocaleString()}\n💰 **Total Cost: ₱${teepeeTotal.toLocaleString()}**\n\n� **Check-in Date:** ${formattedDate}\n�📊 **Room Availability:**\n• ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.villa.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n• ${AVAILABLE_ROOMS.teepee.count} Teepee Room${AVAILABLE_ROOMS.teepee.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.teepee.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n\n✨ All rooms include pool access, beach access & WiFi!`;
    } else if (guestCount === 8) {
      // Villa Room: Perfect fit
      const villaCost = 8000;
      const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      roomSuggestion = `For ${guestCount} guests, I recommend:\n\n🏠 **Villa Room** — ₱8,000/22hrs (8 pax + up to 2 additional)\n✨ Perfect for larger groups and families\n• Spacious accommodation\n• Swimming pool access\n• Private beach access\n• High-speed WiFi\n• Room for everyone to relax\n\n💰 **Total Cost: ₱${villaCost.toLocaleString()}**\n📅 **Check-in Date:** ${formattedDate}\n📊 **Available:** ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.villa.count === 0 ? '⚠️ SOLD OUT' : '✅'}`;
    } else if (guestCount === 9 || guestCount === 10) {
      // Villa + additional pax OR multiple rooms
      const villaBase = 8000;
      const additionalPax = guestCount - 8;
      const additionalCost = additionalPax * 400;
      const villaTotal = villaBase + additionalCost;
      
      const twoLoftsCost = 5000 * 2;
      const loftPlusVillaCost = 5000 + 8000;
      const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      roomSuggestion = `For ${guestCount} guests, here are your best options:\n\n**OPTION 1 (Most Affordable):**\n🏠 **Villa Room** (8 pax + ${additionalPax} additional)\nBase Rate: ₱${villaBase.toLocaleString()}\nAdditional Pax (${additionalPax} × ₱400): ₱${additionalCost.toLocaleString()}\n💰 **Total Cost: ₱${villaTotal.toLocaleString()}**\n\n**OPTION 2 (More Space):**\n🏠 **Villa Room** (8 pax) + 🏢 **Loft Room** (2 pax)\n💰 **Total Cost: ₱${loftPlusVillaCost.toLocaleString()}**\n\n${guestCount === 10 ? `**OPTION 3:**\n🏢 **2 Loft Rooms** (2 pax each + 2 additional per room)\nBase Rate: ₱${twoLoftsCost.toLocaleString()}\nAdditional Pax (2 × ₱400): ₱800\n💰 **Total Cost: ₱${(twoLoftsCost + 800).toLocaleString()}**\n\n` : ''}� **Check-in Date:** ${formattedDate}\n�📊 **Room Availability:**\n• ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.villa.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n• ${AVAILABLE_ROOMS.loft.count} Loft Room${AVAILABLE_ROOMS.loft.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.loft.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n• ${AVAILABLE_ROOMS.teepee.count} Teepee Room${AVAILABLE_ROOMS.teepee.count !== 1 ? 's' : ''} ${AVAILABLE_ROOMS.teepee.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n\n✨ All rooms include pool access, beach access & WiFi!`;
    } else {
      // Large groups: Check if exceeds villa availability
      const villaCount = Math.floor(guestCount / 8);
      
      if (villaCount > AVAILABLE_ROOMS.villa.count) {
        // Needs more villas than available - offer full resort booking
        const totalCost = (AVAILABLE_ROOMS.villa.count * 8000) + (AVAILABLE_ROOMS.loft.count * 5000) + (AVAILABLE_ROOMS.teepee.count * 6000);
        const totalCapacity = (AVAILABLE_ROOMS.villa.count * 8) + (AVAILABLE_ROOMS.loft.count * 2) + (AVAILABLE_ROOMS.teepee.count * 5);
        const additionalNeeded = Math.max(0, guestCount - totalCapacity);
        const additionalCost = additionalNeeded * 400;
        const grandTotal = totalCost + additionalCost;
        const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        roomSuggestion = `For ${guestCount} guests, you'll need most or all of our available rooms:\n\n**Full Resort Booking:**\n🏠 ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} (${AVAILABLE_ROOMS.villa.count * 8} pax) — ₱${(AVAILABLE_ROOMS.villa.count * 8000).toLocaleString()}\n🏢 ${AVAILABLE_ROOMS.loft.count} Loft Room${AVAILABLE_ROOMS.loft.count !== 1 ? 's' : ''} (${AVAILABLE_ROOMS.loft.count * 2} pax) — ₱${(AVAILABLE_ROOMS.loft.count * 5000).toLocaleString()}\n⛺ ${AVAILABLE_ROOMS.teepee.count} Teepee Room${AVAILABLE_ROOMS.teepee.count !== 1 ? 's' : ''} (${AVAILABLE_ROOMS.teepee.count * 5} pax) — ₱${(AVAILABLE_ROOMS.teepee.count * 6000).toLocaleString()}\n${additionalNeeded > 0 ? `\nAdditional Pax (${additionalNeeded} × ₱400): ₱${additionalCost.toLocaleString()}` : ''}\n\n💰 **Total Cost: ₱${grandTotal.toLocaleString()}**\n📅 **Check-in Date:** ${formattedDate}\n\n📊 **Total Capacity:** ${totalCapacity + (AVAILABLE_ROOMS.villa.count + AVAILABLE_ROOMS.loft.count + AVAILABLE_ROOMS.teepee.count) * 2} guests maximum\n\n✨ This includes exclusive use of the resort!\n\n📞 For large bookings, we recommend:\n📧 Email: dcharkoolhausresort@gmail.com\n📘 Facebook: Charkool Leisure Beach Resort`;
        
        setAwaitingCustomization(true);
        setLastGuestCount(guestCount);
      } else {
        // Normal large group calculation
        const remaining = guestCount % 8;
        
        let option1Cost = villaCount * 8000;
        let option1Text = `${villaCount} Villa Room${villaCount > 1 ? 's' : ''} (${villaCount * 8} pax)`;
        
        if (remaining > 0) {
          if (remaining <= 2) {
            // Add as additional pax to last villa
            const additionalCost = remaining * 400;
            option1Cost += additionalCost;
            option1Text += ` + ${remaining} additional pax (₱${additionalCost.toLocaleString()})`;
          } else if (remaining <= 4) {
            // Add a Loft room
            option1Cost += 5000;
            option1Text += ` + 1 Loft Room (${remaining} pax)`;
          } else if (remaining === 5) {
            // Add a Teepee room
            option1Cost += 6000;
            option1Text += ` + 1 Teepee Room (${remaining} pax)`;
          } else {
            // Add another Villa
            option1Cost += 8000;
            option1Text += ` + 1 Villa Room (${remaining} pax)`;
          }
        }
        
        const totalVillas = Math.ceil(guestCount / 8);
        const option2Cost = totalVillas * 8000;
        const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        roomSuggestion = `For ${guestCount} guests, you'll need multiple rooms:\n\n**OPTION 1 (Optimized):**\n🏠 ${option1Text}\n💰 **Total Cost: ₱${option1Cost.toLocaleString()}**\n\n**OPTION 2 (All Villas):**\n🏠 ${totalVillas} Villa Room${totalVillas > 1 ? 's' : ''}\n💰 **Total Cost: ₱${option2Cost.toLocaleString()}**\n\n� **Check-in Date:** ${formattedDate}\n�📊 **Room Availability:**\n• ${AVAILABLE_ROOMS.villa.count} Villa Room${AVAILABLE_ROOMS.villa.count !== 1 ? 's' : ''} available ${AVAILABLE_ROOMS.villa.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n• ${AVAILABLE_ROOMS.loft.count} Loft Room${AVAILABLE_ROOMS.loft.count !== 1 ? 's' : ''} available ${AVAILABLE_ROOMS.loft.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n• ${AVAILABLE_ROOMS.teepee.count} Teepee Room${AVAILABLE_ROOMS.teepee.count !== 1 ? 's' : ''} available ${AVAILABLE_ROOMS.teepee.count === 0 ? '⚠️ SOLD OUT' : '✅'}\n\n✨ All rooms include:\n• Swimming pool access\n• Private beach access\n• High-speed WiFi\n\n💡 **Note:** Each room can accommodate up to 2 additional guests at ₱400/person.`;
        
        setAwaitingCustomization(true);
        setLastGuestCount(guestCount);
      }
    }

    const responseId = Date.now();
    const response = {
      type: 'bot',
      text: roomSuggestion,
      timestamp: new Date(),
      id: responseId,
      showBookNow: guestCount <= maxCapacity
    };

    setMessages((prev) => [...prev, response]);
    setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
    setAwaitingGuestCount(false);
  };

  // Enhanced message handling with better AI responses
  const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isTyping) return;

    const messageId = Date.now();
    
    // Add user's message
    const userMessage = { 
      type: 'user', 
      text: trimmedInput,
      timestamp: new Date(),
      id: messageId
    };
    
    // Check for explicit language and mask the offending words inline
    if (containsProfanity(trimmedInput)) {
      const maskedText = maskProfanity(trimmedInput);
      const maskedMessage = { ...userMessage, text: maskedText, masked: true };
      setMessages((prev) => [...prev, maskedMessage]);
      setInput('');
      setShowQuickReplies(false);
      setUserTyping(false);

      // Add moderation bot response
      await simulateTyping(1000);
      const modMessage = {
        type: 'bot',
        text: "I'm sorry, but I can't respond to explicit language. Please rephrase your question.",
        timestamp: new Date(),
        id: Date.now() + 1
      };
      setMessages((prev) => [...prev, modMessage]);
      setMessageStatus(prev => ({ ...prev, [modMessage.id]: 'delivered' }));
      // keep input focused so user can re-type
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setShowQuickReplies(false);
    setUserTyping(false);
    
    // Message status simulation
    setMessageStatus(prev => ({ ...prev, [messageId]: 'sending' }));
    setTimeout(() => {
      setMessageStatus(prev => ({ ...prev, [messageId]: 'delivered' }));
    }, 500);

    // Keep focus on input after sending so typing continues
    setTimeout(() => inputRef.current?.focus(), 60);

    const lowerInput = normalizeInput(trimmedInput);
    
    // Simulate realistic response delay
    const delay = getResponseDelay(trimmedInput.length);
    await simulateTyping(delay);

    // Update last seen
    setLastSeen(new Date());

    // Check for affirmative responses when awaiting customization
    if (awaitingCustomization) {
      const affirmativeKeywords = ['yes', 'yeah', 'yup', 'sure', 'ok', 'okay', 'oo', 'sige', 'please', 'help', 'yep', 'yah', 'salamat', 'thanks', 'go', 'proceed'];
      const negativeKeywords = ['no', 'nope', 'nah', 'hindi', 'wag', 'not', 'never mind', 'cancel'];
      
      if (affirmativeKeywords.some((keyword) => lowerInput.includes(keyword))) {
        const responseId = Date.now();
        const response = {
          type: 'bot',
          text: `Great! I'd love to help you customize the perfect room combination for ${lastGuestCount} guests! 🏖️\n\nTo create the best arrangement for your group, please let me know:\n\n1️⃣ Do you prefer staying in the same building or separate rooms is fine?\n2️⃣ Any budget preference?\n3️⃣ Special requirements? (families with kids, privacy needs, etc.)\n\n💡 Or simply tell me your preference and I'll suggest the best combination!\n\nYou can also proceed directly to booking where you can customize your selection.`,
          timestamp: new Date(),
          id: responseId,
          showBookNow: true
        };
        setMessages((prev) => [...prev, response]);
        setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
        setAwaitingCustomization(false);
        return;
      } else if (negativeKeywords.some((keyword) => lowerInput.includes(keyword))) {
        const responseId = Date.now();
        const response = {
          type: 'bot',
          text: "No problem! Feel free to ask me anything else about our rooms, amenities, or proceed to booking when you're ready! 😊",
          timestamp: new Date(),
          id: responseId,
          showBookNow: true
        };
        setMessages((prev) => [...prev, response]);
        setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
        setAwaitingCustomization(false);
        setShowQuickReplies(true);
        return;
      }
    }

    // If waiting for booking date, parse and check availability
    if (awaitingBookingDate) {
      const dateResult = parseDate(trimmedInput);
      
      if (dateResult.valid) {
        // Valid date parsed
        await simulateTyping(1500);
        setPendingBookingDate(dateResult.date);
        setAwaitingBookingDate(false);
        
        // Now fetch availability and suggest rooms
        await suggestRoomsByGuestCount(lastGuestCount, dateResult.date);
        return;
      } else {
        // Invalid date - provide specific error message
        let errorMessage = '';
        
        if (dateResult.error === 'past') {
          errorMessage = "⚠️ That date has already passed. Please choose a future date for your check-in.\n\nTry:\n• \"today\" or \"tomorrow\"\n• \"December 25, 2025\"\n• \"12/25/2025\"\n• \"next week\"";
        } else if (dateResult.error === 'too_far') {
          errorMessage = "⚠️ That date is too far in the future. We accept bookings up to 1 year in advance.\n\nPlease choose a date within the next 12 months.";
        } else {
          errorMessage = "I couldn't understand that date format. 😕\n\nPlease try again with:\n• \"December 25, 2025\"\n• \"12/25/2025\"\n• \"2025-12-25\"\n• \"today\" or \"tomorrow\"\n• \"next week\"";
        }
        
        const responseId = Date.now();
        const response = {
          type: 'bot',
          text: errorMessage,
          timestamp: new Date(),
          id: responseId
        };
        setMessages((prev) => [...prev, response]);
        setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
        return;
      }
    }

    // If waiting for guest count, parse the number
    if (awaitingGuestCount) {
      // Try to extract number from the message (handles "i said 21", "21 persons", etc.)
      const numberMatch = trimmedInput.match(/\b(\d+)\b/);
      const guestCount = numberMatch ? parseInt(numberMatch[1]) : parseInt(trimmedInput);
      
      if (!isNaN(guestCount) && guestCount > 0) {
        await suggestRoomsByGuestCount(guestCount);
        return;
      } else {
        const responseId = Date.now();
        const response = {
          type: 'bot',
          text: "I need a number to suggest the best rooms for you. How many guests will be staying? (e.g., 2, 5, 8)",
          timestamp: new Date(),
          id: responseId
        };
        setMessages((prev) => [...prev, response]);
        setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
        return;
      }
    }

    // Check for room suggestion keywords - Enhanced with more trigger words
    const roomSuggestionKeywords = [
      'suggest room', 'recommend room', 'room suggestion', 'which room', 'what room', 
      'room recommend', 'irecommend', 'isuggest', 'room for', 'best room', 'room ako',
      'suggest', 'recommendation', 'ano room', 'anong room', 'good room', 'perfect room',
      'fit room', 'kami room', 'room kami', 'room ba', 'suitable room', 'ideal room',
      'room nyo', 'room ninyo', 'maganda room', 'room suggestion', 'rooms for',
      'we are', 'kami ay', 'kaming', 'grupo', 'group of', 'party of',
      'ilang tao', 'how many', 'pang ilang', 'people', 'persons', 'pax',
      'need room', 'looking for room', 'find room', 'search room', 'gusto room',
      'hanap room', 'kailangan room', 'pabooking', 'pabook', 'help choose',
      'help me choose', 'help select', 'choose room', 'pick room', 'select room',
      'suggest for', 'recommend for', 'for person', 'for people', 'for guest'
    ];
    
    // Check if message contains room suggestion triggers
    if (roomSuggestionKeywords.some((keyword) => lowerInput.includes(keyword))) {
      // Try to extract number from the message
      const numberMatch = trimmedInput.match(/\b(\d+)\b/);
      
      if (numberMatch) {
        // If a number is found in the message, use it directly
        const guestCount = parseInt(numberMatch[1]);
        await suggestRoomsByGuestCount(guestCount);
        return;
      } else {
        // No number found, ask for guest count
        const responseId = Date.now();
        const response = {
          type: 'bot',
          text: "I'd be happy to suggest the perfect room for you! 🏖️\n\nHow many guests will be staying?",
          timestamp: new Date(),
          id: responseId
        };
        setMessages((prev) => [...prev, response]);
        setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
        setAwaitingGuestCount(true);
        return;
      }
    }

    // Check for greetings first
    if (greetingKeywords.some((greet) => lowerInput.includes(greet))) {
      const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
      const responseId = Date.now();
      const response = { 
        type: 'bot', 
        text: randomGreeting,
        timestamp: new Date(),
        id: responseId
      };
      setMessages((prev) => [...prev, response]);
      setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
      setShowQuickReplies(true);
      return;
    }

    // Check for contact/owner information
    if (lowerInput.includes('owner') || lowerInput.includes('contact') || lowerInput.includes('facebook') || 
        lowerInput.includes('management') || lowerInput.includes('may-ari') || lowerInput.includes('makipag-ugnayan')) {
      const responseId = Date.now();
      const response = {
        type: 'bot',
        text: 'You can connect with us through our Facebook page for more information about management and direct communication:\n\n📘 Facebook: Charkool Leisure Beach Resort\n📘 Facebook link: https://www.facebook.com/CharkoolLeisureBeachResort\n📧 Email: dcharkoolhausresort@gmail.com\n\nFor immediate assistance, I\'m here to help with any questions!',
        timestamp: new Date(),
        id: responseId
      };
      setMessages((prev) => [...prev, response]);
      setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
      return;
    }

    // Check for keyword matches in predefined suggestions
    let suggestionMatched = false;
    let matchedSuggestions = [];
    
    for (const categoryKey in keywordSuggestions) {
      const category = keywordSuggestions[categoryKey];
      if (category.keywords.some((kw) => lowerInput.includes(kw))) {
        matchedSuggestions = category.suggestions;
        suggestionMatched = true;
        break;
      }
    }

    if (suggestionMatched && matchedSuggestions.length > 0) {
      const responseId = Date.now();
      const response = {
        type: 'bot',
        text: 'Here are some answers that might help you:',
        timestamp: new Date(),
        id: responseId,
        suggestions: matchedSuggestions
      };
      
      setMessages((prev) => [...prev, response]);
      setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
      setCurrentSuggestions(matchedSuggestions);
      setShowSuggestions(true);
      return;
    }

    // Try to match with database questions if available
    if (categories && categories.length > 0) {
      let foundMatch = false;
      
      for (const category of categories) {
        const matchedQuestions = category.questions.filter(q => 
          normalizeInput(q.text).includes(lowerInput) || 
          lowerInput.includes(normalizeInput(q.text.substring(0, 10)))
        );
        
        if (matchedQuestions.length > 0) {
          const responseId = Date.now();
          const response = {
            type: 'bot',
            text: `I found some relevant information about ${category.name}:`,
            timestamp: new Date(),
            id: responseId,
            category: category,
            questions: matchedQuestions.slice(0, 3)
          };
          
          setMessages((prev) => [...prev, response]);
          setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
          foundMatch = true;
          break;
        }
      }
      
      if (foundMatch) return;
    }

    // Default response with helpful suggestions
      // If nothing matched, use the unknown input handler
      handleUnknownInput();
  };

    // Fallback handler when input is not detected/matched
    const handleUnknownInput = () => {
      const now = Date.now();
      const predefinedId = now;
      const predefinedMessage = {
        type: 'bot',
        text: "I'm a predefined chatbot — I can help with room rates, bookings, and amenities. Tap a suggestion to continue.",
        timestamp: new Date(),
        id: predefinedId
      };

      const noticeId = now + 1;
      const noticeMessage = {
        type: 'bot',
        text: "I can't answer like that — here are some suggestions that might help:",
        timestamp: new Date(),
        id: noticeId
      };

      const responseId = now + 2;
      const fallbackText = "I couldn't find a direct match, but I can help with these common requests. Try one of the suggestions below or ask me about rooms, rates, amenities, or bookings.";
      const fallbackMessage = {
        type: 'bot',
        text: fallbackText,
        timestamp: new Date(),
        id: responseId,
        suggestions: [
          { id: 'room_rates_suggestion', text: '💰 Room rates', answer: '', showBookNow: true },
          { id: 'how_to_book_suggestion', text: '📅 How to book', answer: '', showBookNow: true },
          { id: 'amenities_suggestion', text: '🏊‍♂️ Amenities', answer: '', showBookNow: false },
        ]
      };

      setMessages((prev) => [...prev, predefinedMessage, noticeMessage, fallbackMessage]);
      setMessageStatus(prev => ({ ...prev, [predefinedId]: 'delivered', [noticeId]: 'delivered', [responseId]: 'delivered' }));
      setCurrentSuggestions(fallbackMessage.suggestions);
      setShowSuggestions(true);
    };

  if (isLoading) return (
    <div className="chat-loading">
      <div className="loading-spinner">
        <Loader2 className="animate-spin" size={24} />
      </div>
      <p>Connecting to chat...</p>
    </div>
  );
  
  if (error) return (
    <div className="chat-error">
      <p>Unable to connect to chat service</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <>
      {isModal && <div className="chat-modal-backdrop" onClick={onClose}></div>}
      <div className="modern-chat-container">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="agent-info">
            <div className="agent-avatar">
              <MessageCircle size={20} />
            </div>
            <div className="agent-details">
              <h4>Kool - Resort Concierge</h4>
              <div className="agent-status">
                <div className={`status-dot ${agentOnline ? 'online' : 'offline'}`}></div>
                <span>{agentOnline ? 'Active now' : 'Away'}</span>
                {conversationStarted && (
                  <span className="response-time">• {responseTime}</span>
                )}
              </div>
            </div>
          </div>
          <div className="chat-actions">
            {isModal && onClose && (
              <button 
                className="chat-action-btn close-chat-btn"
                onClick={onClose}
                title="Close chat"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

      {/* Messages Area */}
  <div className="messages-container">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={`${msg.id}-${index}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`message-row ${msg.type}`}
            >              
              <div className={`message-content ${msg.type}`}>
                {msg.suggestions ? (
                  <div className="suggestions-list">
                    {msg.suggestions.map((suggestion, sIndex) => (
                      <button
                        key={suggestion.id || sIndex}
                        className="suggestion-card"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="suggestion-text">{suggestion.text}</div>
                        <div className="suggestion-arrow">→</div>
                      </button>
                    ))}
                  </div>
                ) : (msg.showQuestions || msg.questions) ? (
                  <div className="question-list-container">
                    <div className="question-list-header">{msg.text}</div>
                    <div className="question-buttons">
                      {msg.questions?.map((question, qIndex) => (
                        <button
                          key={qIndex}
                          className="question-button"
                          onClick={() => handleQuestionClick(question)}
                        >
                          {question.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`message-bubble ${msg.masked ? 'masked' : ''}`}>
                      <div className="message-text">{renderMessageContent(msg.text)}</div>
                    {msg.masked && (
                      <div className="masked-note">Some words were hidden due to explicit language.</div>
                    )}
                    {msg.showBookNow && (
                      <div className="message-actions">
                        <BookNowButton />
                      </div>
                    )}
                    {msg.timestamp && (
                      <div className="message-time">
                        <span className="time-text">{formatTime(msg.timestamp)}</span>
                        {msg.type === 'user' && messageStatus[msg.id] && (
                          <span className={`message-status ${messageStatus[msg.id]}`}>
                            {messageStatus[msg.id] === 'sending' && <Clock size={12} />}
                            {messageStatus[msg.id] === 'delivered' && <CheckCircle size={12} />}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="typing-indicator"
            >
              <div className="typing-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="quick-replies"
          >
            <div className="quick-replies-title">Quick replies:</div>
            <div className="quick-replies-buttons">
              <button onClick={() => handleQuickReply('room_suggestions')} className="quick-reply-btn">
                <Home size={14} />
                <span>Suggest a room</span>
              </button>
              <button onClick={() => handleQuickReply('room_rates')} className="quick-reply-btn">
                <span style={{fontSize: '14px', fontWeight: 'bold'}}>₱</span>
                <span>Room rates</span>
              </button>
              <button onClick={() => handleQuickReply('amenities')} className="quick-reply-btn">
                <Wifi size={14} />
                <span>Amenities</span>
              </button>
              <button onClick={() => handleQuickReply('booking_process')} className="quick-reply-btn">
                <Calendar size={14} />
                <span>How to book</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="chat-input-container">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isTyping ? "Kool is typing..." : "Type your message..."}
            disabled={isTyping}
            className="chat-input"
          />
          <div className="input-actions">
            <button 
              className={`send-btn ${input.trim() ? 'active' : ''}`}
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>





      <style jsx>{`
        /* Define variables on the component container so styled-jsx scopes work correctly */
        .modern-chat-container {
          --chat-bg: linear-gradient(135deg, #ffffff 0%, #fbfbfd 100%);
          --page-bg: #ffffff;
          --surface: #ffffff;
          --accent-1: #FEBE52; /* primary brand yellow */
          --accent-2: #FFD66B; /* secondary yellow */
          --accent-strong: #f59e0b; /* badge */
          --muted: #6b7280; /* subtle text */
          --primary-text: #111827; /* main text */
          --bubble-user-start: #FEBE52;
          --bubble-user-end: #f0c14b;
          --bubble-bot-bg: #ffffff;
          --bubble-bot-border: #e9ecef;
          --link: #0b66c3;
          --shadow-1: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        /* Use a modern system font stack with improved weights for better readability */
        .modern-chat-container {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 14px;
          color: var(--primary-text);
        }

        .chat-loading, .chat-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          height: 400px;
        }

        .loading-spinner {
          margin-bottom: 1rem;
          color: #FEBE52;
        }

        .chat-error button {
          background: #FEBE52;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          margin-top: 1rem;
          cursor: pointer;
        }

        .modern-chat-container {
          display: flex;
          flex-direction: column;
          height: 85vh;
          max-height: 750px;
          width: 90vw;
          max-width: 480px;
          background: var(--chat-bg);
          border-radius: 16px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          margin: auto;
        }

        /* Modal backdrop with blur */
        .chat-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }

        .chat-header {
          background: linear-gradient(135deg, var(--accent-1) 0%, var(--accent-2) 100%);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-radius: 16px 16px 0 0;
          flex-shrink: 0;
        }

        .chat-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .agent-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .agent-avatar {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header-subtitle {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255,255,255,0.95);
          opacity: 0.95;
          max-width: 320px;
          line-height: 1.15;
        }

        .agent-details h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: white;
        }

        .agent-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.95);
        }

        .status-meta { display: flex; gap: 0.4rem; align-items: center; }
        .status-text { font-weight: 600; }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #28a745;
          animation: pulse 2s infinite;
        }

        .status-dot.offline {
          background: #6c757d;
          animation: none;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .response-time {
          font-size: 0.75rem;
          opacity: 0.8;
          margin-left: 0.5rem;
        }

        .chat-actions {
          display: flex;
          gap: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .chat-action-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: rgba(255, 255, 255, 0.9);
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-action-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          transform: translateY(-1px);
        }

        .close-chat-btn {
          width: 32px;
          height: 32px;
        }

        /* theme toggle removed */

        .messages-container {
          flex: 1;
          padding: 1.5rem 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: #f0f2f5;
          scroll-behavior: smooth;
          min-height: 0;
        }

        /* dark theme removed */

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: rgba(254, 190, 82, 0.3);
          border-radius: 3px;
        }

        .message-row {
          display: flex;
          margin-bottom: 0.75rem;
          width: 100%;
          align-items: flex-end;
        }

        .message-row.user {
          justify-content: flex-end;
          padding-right: 0.5rem;
        }

        .message-row.bot {
          justify-content: flex-start;
          padding-left: 0.5rem;
        }

        .message-content {
          max-width: 75%;
          display: flex;
          flex-direction: column;
        }

        .message-content.user {
          align-items: flex-end;
          margin-left: auto;
        }

        .message-content.bot {
          align-items: flex-start;
          margin-right: auto;
        }

        .message-bubble {
          padding: 0.75rem 1rem;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          line-height: 1.5;
          box-shadow: var(--shadow-1);
          backdrop-filter: blur(10px);
        }

        .message-avatar {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255,255,255,0.6);
          color: var(--accent-1);
          box-shadow: 0 4px 12px rgba(2,6,23,0.06);
          margin-top: 2px;
        }

        .message-body { flex: 1; }

        /* Masked inline profanity: replace words with asterisks */
        .message-bubble.masked .message-text {
          opacity: 1;
        }

        .message-bubble.masked .masked-note {
          display: block;
          font-size: 0.75rem;
          opacity: 0.85;
          margin-top: 0.25rem;
          color: rgba(0,0,0,0.7);
        }

        .message-content.user .message-bubble {
          background: linear-gradient(135deg, var(--bubble-user-start), var(--bubble-user-end));
          color: white;
          border-bottom-right-radius: 6px;
        }

        .message-content.bot .message-bubble {
          background: var(--bubble-bot-bg);
          color: var(--primary-text);
          border: 1px solid var(--bubble-bot-border);
          border-bottom-left-radius: 6px;
        }

        .message-text {
          font-size: 0.95rem;
          white-space: pre-wrap;
          margin-bottom: 0.25rem;
          color: inherit;
        }

        .message-text a {
          color: var(--link);
          text-decoration: underline;
          word-break: break-all;
        }

        .message-time {
          font-size: 0.7rem;
          opacity: 0.6;
          text-align: right;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          justify-content: flex-end;
          margin-top: 0.25rem;
          color: #65676b;
        }

        .message-content.bot .message-time {
          text-align: left;
          justify-content: flex-start;
        }

        .message-status {
          display: inline-flex;
          align-items: center;
          margin-left: 0.25rem;
        }

        .message-status.sending {
          color: #65676b;
          opacity: 0.6;
        }

        .message-status.delivered {
          color: #0084ff;
        }

        .message-actions {
          margin-top: 0.5rem;
        }

        .suggestion-card {
          background: linear-gradient(180deg, var(--surface), #fbfbfd);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 14px;
          padding: 0.85rem 0.9rem;
          margin: 0.25rem 0;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(.2,.9,.3,1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
          width: 100%;
          box-shadow: 0 6px 18px rgba(2,6,23,0.04);
        }

        .suggestion-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 50px rgba(2,6,23,0.08);
        }

        .suggestion-text {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .suggestion-arrow {
          font-size: 1rem;
          opacity: 0.7;
        }

        .question-list-container {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .question-list-header {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 1rem;
          text-align: center;
        }

        .question-buttons {
          display: grid;
          gap: 0.75rem;
        }

        .question-button {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border: 1px solid #dee2e6;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          font-weight: 500;
          color: #495057;
          position: relative;
          overflow: hidden;
        }

        .question-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(254, 190, 82, 0.1), transparent);
          transition: left 0.5s;
        }

        .question-button:hover::before {
          left: 100%;
        }

        .question-button:hover {
          background: linear-gradient(135deg, #FEBE52, #f0c14b);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(254, 190, 82, 0.3);
          border-color: #FEBE52;
        }

        .question-button:active {
          transform: translateY(0);
        }

        .typing-indicator {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .typing-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FEBE52, #f0c14b);
          color: white;
          flex-shrink: 0;
        }

        .typing-bubble {
          background: white;
          border: 1px solid rgba(15,23,42,0.04);
          border-radius: 18px;
          padding: 0.85rem 1rem;
          border-bottom-left-radius: 6px;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
        }

        .typing-dots span {
          width: 8px;
          height: 8px;
          background: #6c757d;
          border-radius: 50%;
          animation: typing 1.4s ease-in-out infinite;
        }

        .typing-dots span:nth-child(1) { animation-delay: 0ms; }
        .typing-dots span:nth-child(2) { animation-delay: 200ms; }
        .typing-dots span:nth-child(3) { animation-delay: 400ms; }

        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }

        .quick-replies {
          padding: 0.75rem 1rem;
          background: white;
          border-top: 1px solid #e4e6eb;
          flex-shrink: 0;
        }

        .quick-replies-title {
          font-size: 0.8rem;
          color: #6c757d;
          margin-bottom: 0.75rem;
          font-weight: 500;
        }

        .quick-replies-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .quick-reply-btn {
          background: white;
          border: 1px solid #ccc;
          border-radius: 20px;
          padding: 0.5rem 0.9rem;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0084ff;
          font-weight: 500;
        }

        .quick-reply-btn:hover {
          background: #f0f2f5;
          border-color: #0084ff;
          transform: scale(1.02);
        }

        /* Focus visible for keyboard users */
        :focus-visible {
          outline: 3px solid rgba(254,190,82,0.28);
          outline-offset: 2px;
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }

        .quick-reply-btn span {
          font-weight: 500;
        }

        .chat-input-container {
          padding: 1rem 1.5rem;
          background: white;
          border-top: 1px solid #e4e6eb;
          border-radius: 0 0 16px 16px;
          flex-shrink: 0;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f0f2f5;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          border: none;
          transition: all 0.2s ease;
        }

        .input-wrapper:focus-within {
          background: #e4e6eb;
        }

        .chat-input {
          flex: 1;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          font-size: 0.9rem;
          outline: none;
          resize: none;
        }

        .input-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .input-action-btn, .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .input-action-btn {
          background: transparent;
          color: #6c757d;
        }

        .input-action-btn:hover {
          background: rgba(108, 117, 125, 0.1);
          color: #495057;
          transform: scale(1.1);
        }

        .send-btn {
          background: transparent;
          color: #0084ff;
        }

        .send-btn.active {
          background: #0084ff;
          color: white;
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .categories-section, .questions-section {
          padding: 1rem;
          background: rgba(248, 249, 250, 0.5);
          border-top: 1px solid #e9ecef;
        }

        .categories-title, .questions-header h4 {
          font-size: 0.9rem;
          color: #495057;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .categories-grid, .questions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .category-card, .question-card {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 12px;
          padding: 1rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8rem;
        }

        .category-card:hover, .question-card:hover {
          background: linear-gradient(135deg, #FEBE52, #f0c14b);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(254, 190, 82, 0.3);
        }

        .category-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .category-name {
          font-weight: 500;
        }

        .questions-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .back-btn {
          background: none;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: #f8f9fa;
        }

        @media (max-width: 768px) {
          .modern-chat-container {
            height: 95vh;
            width: 95vw;
            max-width: none;
          }
          
          .chat-header {
            padding: 0.75rem 1rem;
          }
          
          .agent-avatar {
            width: 36px;
            height: 36px;
          }
          
          .agent-details h4 {
            font-size: 0.95rem;
          }
          
          .categories-grid, .questions-grid {
            grid-template-columns: 1fr;
          }
          
          .message-content {
            max-width: 85%;
          }
          
          .quick-replies-buttons {
            justify-content: center;
          }
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
          padding: 0.75rem 1rem;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          line-height: 1.5;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08);
          max-width: 100%;
        }

        /* Text inside bubbles */
        .message-bubble p {
          margin: 0;
          white-space: pre-wrap;
        }

        /* User message bubble style */
        .message-content.user .message-bubble {
          background: #0084ff;
          color: white;
          border-bottom-right-radius: 4px;
        }

        /* Bot message bubble style */
        .message-content.bot .message-bubble {
          background: #e4e6eb;
          color: #050505;
          border-bottom-left-radius: 4px;
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
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Slightly nicer scrollbar for desktop */
        .messages-container::-webkit-scrollbar {
          width: 10px;
        }
        .messages-container::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(254, 190, 82, 0.12), rgba(254, 190, 82, 0.2));
          border-radius: 8px;
        }
      `}</style>
    </div>
    </>
  );
}