'use client';

import ChatInterface from '../../../components/ChatInterface';

export default function GuestChatPage() {
  return (
    <div className="guest-chat-page">
      <h1>Chat with us!</h1>
      <ChatInterface isModal={false} />

      <style jsx>{`
        .guest-chat-page {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          height: calc(100vh - 100px); /* Adjust height as needed */
          display: flex;
          flex-direction: column;
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}