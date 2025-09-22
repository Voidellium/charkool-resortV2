'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </button>
  );
};

export default function ChatInterface({ isModal }) {
  const [qaData, setQaData] = useState({});
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const fetchQA = async () => {
      try {
        const res = await fetch('/api/chatbot');
        const data = await res.json();
        setQaData(data);
        setMessages([
          {
            sender: 'bot',
            text: 'Hello! Please select a question from the list below.',
          },
        ]);
      } catch (error) {
        console.error('Failed to load chatbot data:', error);
        setMessages([
          {
            sender: 'bot',
            text: 'Sorry, I am currently unavailable. Please try again later.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchQA();
  }, []);

  const handleQuestionClick = (qa) => {
    const newMessages = [
      ...messages,
      { sender: 'user', text: qa.question },
      {
        sender: 'bot',
        text: qa.answer,
        hasBookNow: qa.hasBookNow,
      },
    ];
    setMessages(newMessages);
  };

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={`message ${msg.sender}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="message-content">{msg.text}</div>
            {msg.hasBookNow && <BookNowButton />}
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="questions-area">
        {loading ? (
          <p>Loading questions...</p>
        ) : (
          Object.entries(qaData).map(([category, qas]) => (
            <div key={category} className="category-wrapper">
              <h4 className="category-title">{category}</h4>
              <div className="questions-grid">
                {/* This is the key change to fix the error */}
                {Array.isArray(qas) && qas.map((qa) => (
                  <button key={qa.id} className="question-button" onClick={() => handleQuestionClick(qa)}>
                    {qa.question}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
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
        }
        .message.user {
          justify-content: flex-end;
        }
        .message.bot {
          justify-content: flex-start;
        }
        .message-content {
          padding: 12px 18px;
          border-radius: 20px;
          max-width: 80%;
          line-height: 1.5;
        }
        .message.user .message-content {
          background-color: #FEBE52;
          color: white;
          border-bottom-right-radius: 5px;
        }
        .message.bot .message-content {
          background-color: #e5e5e5;
          color: #333;
          border-bottom-left-radius: 5px;
        }
        .questions-area {
          padding: 20px;
          border-top: 1px solid #eee;
          background: #fff;
          overflow-y: auto;
          max-height: ${isModal ? '45%' : '50%'};
        }
        .category-wrapper { margin-bottom: 15px; }
        .category-title { color: #FEBE52; margin: 0 0 10px 0; }
        .questions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .question-button {
          background: #f0f0f0;
          border: 1px solid #ddd;
          padding: 10px 15px;
          border-radius: 20px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .question-button:hover {
          background-color: #e0e0e0;
        }
      `}</style>
    </div>
  );
}