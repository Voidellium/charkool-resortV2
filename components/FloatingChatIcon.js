'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ChatbotModal from './ChatbotModal'; // This will be created next

const ChatBubbleIcon = ({ onClick }) => (
  <motion.div
    onClick={onClick}
    className="chat-bubble"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
    </svg>
    <style jsx>{`
      .chat-bubble {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        background-color: #FEBE52;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 999;
      }
      .chat-bubble svg {
        width: 32px;
        height: 32px;
        color: white;
      }
    `}</style>
  </motion.div>
);

export default function FloatingChatIcon() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  const visiblePages = ['/about-us', '/rooms', '/virtual-tour', '/'];

  useEffect(() => {
    // Check if the current path is one of the visible pages.
    // A check for '/' is included for the landing page.
    if (visiblePages.includes(pathname)) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [pathname]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <ChatBubbleIcon onClick={toggleModal} />
      <AnimatePresence>
        {isModalOpen && <ChatbotModal onClose={toggleModal} />}
      </AnimatePresence>
    </>
  );
}
