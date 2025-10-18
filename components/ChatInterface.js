'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Loader2, Clock, MessageCircle, DollarSign, 
  Wifi, Users, Calendar, CheckCircle, X, ChevronDown, 
  MapPin, Star, Coffee, Home, Phone, Smile
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
        answer: 'We offer three unique room types:\n\n🏠 Villa Room (₱8,000/22hrs, max 8 pax)\n🏢 Loft Room (₱5,000/22hrs, 2-4 pax)\n⛺ Teepee Room (₱6,000/22hrs, max 5 pax)\n\nEach includes pool access, beach access, and WiFi!',
        showBookNow: true,
      },
      {
        id: 'room_rates',
        text: '💰 What are your room rates?',
        answer: 'Our current rates for 22-hour stays:\n\n💎 Villa Room — ₱8,000 (max 8 guests)\n🏢 Loft Room — ₱5,000 (2-4 guests)\n⛺ Teepee Room — ₱6,000 (max 5 guests)\n\nAll rates include complimentary amenities!',
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
        answer: 'Get in touch with us:\n\n📘 Facebook: Charkool Leisure Beach Resort\n📧 Email: Available on our website\n📱 Phone: Contact details in booking confirmation\n\nFor immediate assistance, use our live chat!',
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
  'kumusta', 'kamusta', 'halo', 'uy'
];

// Enhanced Book Now Button Component
const BookNowButton = ({ variant = 'primary' }) => (
  <motion.button
    className={`book-now-btn ${variant}`}
    onClick={() => window.location.href = '/booking'}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <Calendar size={16} />
    Book Now
    <style jsx>{`
      .book-now-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.75rem 1.25rem;
        background: linear-gradient(135deg, #FEBE52, #f0c14b);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(254, 190, 82, 0.3);
      }
      .book-now-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(254, 190, 82, 0.4);
      }
      .book-now-btn.secondary {
        background: transparent;
        border: 2px solid #FEBE52;
        color: #FEBE52;
      }
      .book-now-btn.secondary:hover {
        background: #FEBE52;
        color: white;
      }
    `}</style>
  </motion.button>
);

export default function ChatInterface({ isModal }) {
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { categories, isLoading, error, fetchAnswer } = useChatbot();

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
        text: "I'm Kool, your AI resort concierge! 🏖️ I'm here to help you discover our amazing rooms, amenities, and make your booking process seamless.",
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

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  };

  // Handle suggestion clicks from predefined suggestions
  const handleSuggestionClick = async (suggestion) => {
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
  };

  // Enhanced quick reply handler
  const handleQuickReply = async (replyType) => {
    let userText = '';
    let response = '';
    let responseData = {};
    
    // Define user message and response based on reply type
    switch(replyType) {
      case 'room_rates':
        userText = '💰 What are your room rates?';
        response = 'Here are our current room rates for 22-hour stays:\n\n🏠 **Villa Room** — ₱8,000 (max 8 guests)\n🏢 **Loft Room** — ₱5,000 (2-4 guests) \n⛺ **Teepee Room** — ₱6,000 (max 5 guests)\n\n✨ All rooms include:\n• Swimming pool access\n• Private beach access  \n• High-speed WiFi\n• Complimentary parking\n\nReady to book your perfect getaway?';
        responseData = { showBookNow: true };
        break;
        
      case 'amenities':
        userText = '🏊‍♂️ What amenities do you offer?';
        response = 'Charkool Resort offers incredible amenities:\n\n🏊‍♂️ **Multiple Swimming Pools**\n🏖️ **Private Beach Access**\n📶 **High-Speed WiFi**\n🍽️ **Restaurant & Bar**\n🎾 **Sports Facilities**\n🎪 **Event Spaces**\n🚗 **Free Parking**\n🛡️ **24/7 Security**\n\nWould you like details about any specific amenity?';
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
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setShowQuickReplies(false);
    setUserTyping(false);
    
    // Message status simulation
    setMessageStatus(prev => ({ ...prev, [messageId]: 'sending' }));
    setTimeout(() => {
      setMessageStatus(prev => ({ ...prev, [messageId]: 'delivered' }));
    }, 500);

    const lowerInput = normalizeInput(trimmedInput);
    
    // Simulate realistic response delay
    const delay = getResponseDelay(trimmedInput.length);
    await simulateTyping(delay);

    // Update last seen
    setLastSeen(new Date());

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
        text: 'You can connect with us through our Facebook page for more information about management and direct communication:\n\n📘 **Facebook**: Charkool Leisure Beach Resort\n🌐 **Website**: Contact form available\n📧 **Email**: Provided in booking confirmation\n\nFor immediate assistance, I\'m here to help with any questions!',
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
    const responseId = Date.now();
    const defaultResponse = {
      type: 'bot',
      text: 'I\'d love to help you with that! 😊 Here are some popular topics I can assist with, or feel free to ask me anything about Charkool Resort:',
      timestamp: new Date(),
      id: responseId
    };
    
    setMessages((prev) => [...prev, defaultResponse]);
    setMessageStatus(prev => ({ ...prev, [responseId]: 'delivered' }));
    setShowQuickReplies(true);
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
                {msg.type === 'suggestion' ? (
                  <button
                    className="suggestion-card"
                    onClick={() => handleSuggestionClick(msg)}
                  >
                    <div className="suggestion-text">{msg.text}</div>
                    <div className="suggestion-arrow">→</div>
                  </button>
                ) : msg.type === 'question-list' ? (
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
                  <div className="message-bubble">
                    <div className="message-text">{msg.text}</div>
                    {msg.timestamp && (
                      <div className="message-time">
                        {msg.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {msg.type === 'user' && messageStatus[msg.id] && (
                          <span className={`message-status ${messageStatus[msg.id]}`}>
                            {messageStatus[msg.id] === 'sending' && <Clock size={10} />}
                            {messageStatus[msg.id] === 'delivered' && <CheckCircle size={10} />}
                          </span>
                        )}
                      </div>
                    )}
                    {msg.showBookNow && (
                      <div className="message-actions">
                        <BookNowButton />
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
              <button onClick={() => handleQuickReply('Room rates?')} className="quick-reply-btn">
                <DollarSign size={14} />
                <span>Room rates</span>
              </button>
              <button onClick={() => handleQuickReply('Available amenities?')} className="quick-reply-btn">
                <Wifi size={14} />
                <span>Amenities</span>
              </button>
              <button onClick={() => handleQuickReply('Pet policies?')} className="quick-reply-btn">
                <Users size={14} />
                <span>Pet policies</span>
              </button>
              <button onClick={() => handleQuickReply('How to book?')} className="quick-reply-btn">
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
          height: 100%;
          max-height: 600px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .chat-header {
          background: linear-gradient(135deg, #FEBE52 0%, #f0c14b 100%);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          position: relative;
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
          color: #FEBE52;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.9);
        }

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
        }

        .chat-action-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          transform: translateY(-1px);
        }

        .messages-container {
          flex: 1;
          padding: 1rem 1rem 2rem 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
          scroll-behavior: smooth;
        }

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
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .message-content.user .message-bubble {
          background: linear-gradient(135deg, #FEBE52, #f0c14b);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .message-content.bot .message-bubble {
          background: white;
          color: #333;
          border: 1px solid #e9ecef;
          border-bottom-left-radius: 6px;
        }

        .message-text {
          font-size: 0.9rem;
          white-space: pre-wrap;
          margin-bottom: 0.25rem;
        }

        .message-time {
          font-size: 0.7rem;
          opacity: 0.7;
          text-align: right;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          justify-content: flex-end;
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
          color: #6c757d;
          animation: pulse 1s infinite;
        }

        .message-status.delivered {
          color: #28a745;
        }

        .message-actions {
          margin-top: 0.5rem;
        }

        .suggestion-card {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border: 1px solid #dee2e6;
          border-radius: 12px;
          padding: 1rem;
          margin: 0.25rem 0;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
          width: 100%;
        }

        .suggestion-card:hover {
          background: linear-gradient(135deg, #FEBE52, #f0c14b);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(254, 190, 82, 0.3);
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
          border: 1px solid #e9ecef;
          border-radius: 18px;
          padding: 1rem;
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
          padding: 1rem;
          background: rgba(254, 190, 82, 0.05);
          border-top: 1px solid rgba(254, 190, 82, 0.2);
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
          border: 1px solid #dee2e6;
          border-radius: 20px;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .quick-reply-btn:hover {
          background: linear-gradient(135deg, #FEBE52, #f0c14b);
          color: white;
          border-color: #FEBE52;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(254, 190, 82, 0.3);
        }

        .quick-reply-btn span {
          font-weight: 500;
        }

        .chat-input-container {
          padding: 1rem 1.5rem;
          background: white;
          border-top: 1px solid #e9ecef;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f8f9fa;
          border-radius: 25px;
          padding: 0.5rem;
          border: 1px solid #dee2e6;
          transition: all 0.2s ease;
        }

        .input-wrapper:focus-within {
          border-color: #FEBE52;
          box-shadow: 0 0 0 3px rgba(254, 190, 82, 0.1);
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
          background: #e9ecef;
          color: #6c757d;
        }

        .send-btn.active {
          background: #FEBE52;
          color: white;
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .send-btn:disabled {
          opacity: 0.5;
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
            height: 100vh;
            border-radius: 0;
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