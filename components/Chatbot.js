'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ChatInterface from './ChatInterface';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();

  const visibleRoutes = ['/about-us', '/rooms', '/room', '/virtual-tour', '/'];
  const shouldShowIcon = visibleRoutes.includes(pathname);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

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
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>How can we help?</h3>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <ChatInterface isModal={true} />
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
          max-width: 800px;
          height: 80vh;
          max-height: 1000px;
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
          padding: 0; /* Remove padding to allow ChatInterface to fill */
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