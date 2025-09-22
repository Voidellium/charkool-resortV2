'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [cannedResponse, setCannedResponse] = useState('');

  const pathname = usePathname();
  const router = useRouter();

  const visibleRoutes = ['/about-us', '/rooms', '/room', '/virtual-tour', '/'];
  const shouldShowIcon = visibleRoutes.includes(pathname);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchQuestions();
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/chatbot');
      const data = await res.json();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to fetch chatbot questions:', error);
    }
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(activeCategory === category ? null : category);
    setActiveQuestion(null); // Close any open question when a new category is clicked
  };

  const handleQuestionClick = (questionId) => {
    setActiveQuestion(activeQuestion === questionId ? null : questionId);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (cannedResponse) setCannedResponse('');
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setCannedResponse("I'm here to help with predefined questions only. Please select a question from the list above.");
    }
  };

  if (!shouldShowIcon) {
    return null;
  }

  return (
    <>
      <button className="chat-icon" onClick={() => setIsOpen(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>How can we help?</h3>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {Object.keys(questions).map((category) => (
                <div key={category} className="category-group">
                  <button className="category-header" onClick={() => handleCategoryClick(category)}>
                    <span>{category}</span>
                    <span className={`chevron ${activeCategory === category ? 'open' : ''}`}>&#9660;</span>
                  </button>
                  {activeCategory === category && (
                    <div className="questions-list">
                      {questions[category].map((q) => (
                        <div key={q.id} className="question-item">
                          <button className="question" onClick={() => handleQuestionClick(q.id)}>
                            {q.question}
                          </button>
                          {activeQuestion === q.id && (
                            <div className="answer">
                              <p>{q.answer}</p>
                              {q.showBookNowButton && (
                                <button className="book-now-btn" onClick={() => router.push('/booking')}>
                                  Book Now
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <form onSubmit={handleInputSubmit}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type your question here..."
                />
                <button type="submit">Send</button>
              </form>
              {cannedResponse && <p className="canned-response">{cannedResponse}</p>}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .chat-icon {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          background-color: #FEBE52;
          color: white;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          z-index: 999;
          transition: transform 0.2s ease-in-out;
        }
        .chat-icon:hover {
          transform: scale(1.1);
        }
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          width: 90%;
          max-width: 500px;
          height: 70vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          background-color: #FEBE52;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #1a1a1a;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
        }
        .close-button {
          background: none;
          border: none;
          font-size: 1.8rem;
          line-height: 1;
          cursor: pointer;
          color: #1a1a1a;
          opacity: 0.7;
        }
        .close-button:hover {
          opacity: 1;
        }
        .modal-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .category-group {
          margin-bottom: 12px;
          border-bottom: 1px solid #eee;
        }
        .category-header {
          width: 100%;
          background: none;
          border: none;
          padding: 12px 0;
          text-align: left;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chevron {
          transition: transform 0.2s;
          display: inline-block;
        }
        .chevron.open {
          transform: rotate(180deg);
        }
        .questions-list {
          padding-left: 10px;
        }
        .question-item {
          margin-bottom: 8px;
        }
        .question {
          width: 100%;
          background: none;
          border: none;
          text-align: left;
          padding: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #333;
          border-radius: 6px;
        }
        .question:hover {
          background-color: #f5f5f5;
        }
        .answer {
          padding: 12px;
          background-color: #f9f9f9;
          border-radius: 6px;
          margin-top: 4px;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .answer p {
          margin: 0 0 10px 0;
        }
        .book-now-btn {
          background-color: #FEBE52;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .book-now-btn:hover {
          opacity: 0.9;
        }
        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eee;
        }
        .modal-footer form {
          display: flex;
          gap: 8px;
        }
        .modal-footer input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 0.9rem;
        }
        .modal-footer button {
          background-color: #FEBE52;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .canned-response {
          margin-top: 10px;
          font-size: 0.85rem;
          color: #555;
        }
      `}</style>
    </>
  );
};

export default Chatbot;