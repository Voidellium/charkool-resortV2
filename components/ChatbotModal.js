'use client';

import { motion } from 'framer-motion';
import ChatInterface from './ChatInterface';

export default function ChatbotModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>How can we help?</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </header>
        <div className="modal-body">
          <ChatInterface isModal={true} />
        </div>
      </motion.div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          width: 95%;
          max-width: 1000px;
          height: 95vh;
          max-height: 900px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
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
          color: #333;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.2rem;
        }
        .close-button {
          background: transparent;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
