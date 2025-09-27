'use client';

import ChatInterface from '../../../components/ChatInterface';

export default function GuestChatPage() {
  return (
    <div className="guest-chat-page">
      <ChatInterface isModal={false} />

      <style jsx>{`
        .guest-chat-page {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          height: calc(100vh - 100px);
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}