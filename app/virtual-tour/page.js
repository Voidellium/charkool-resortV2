'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const EnhancedThreeDModelViewer = dynamic(() => import('../../components/EnhancedThreeDModelViewer'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#FDD35C',
      fontSize: '1.2rem',
      fontWeight: '600'
    }}>
      Loading 3D Viewer...
    </div>
  )
});

export default function VirtualTour() {
  const [selectedObject, setSelectedObject] = useState(null);

  // Mesh names from GLTF for zoom buttons
  const objects = [
    { name: 'Stage ', displayName: 'Stage' },
    { name: 'Teepee', displayName: 'Teepee' },
    { name: 'Reception', displayName: 'Reception' },
    { name: 'Loft', displayName: 'Loft' },
    { name: 'Cottages', displayName: 'Cottages' },
    { name: 'Store & Bilyaran', displayName: 'Store & Bilyaran' },
    { name: 'Villa', displayName: 'Villa' },
    { name: 'Walkway Kubo', displayName: 'Walkway Kubo' },
    { name: 'ILoveCharkool', displayName: 'ILoveCharkool' }
  ];

  const handleObjectSelect = (objectName) => {
    setSelectedObject(objectName);
  };

  const handleObjectClickFromViewer = (objectName) => {
    setSelectedObject(objectName);
  };

  return (
    <>
      <div style={{
        width: '100%',
        height: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginTop: '0',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)'
      }}>
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Left Sidebar - Object Selection */}
          <div style={{
            width: '320px',
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
            borderRight: '1px solid rgba(253, 211, 92, 0.3)',
            boxShadow: '2px 0 12px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(253, 211, 92, 0.15) 0%, rgba(254, 190, 82, 0.1) 100%)',
              borderRadius: '16px',
              padding: '20px 16px',
              border: '1px solid rgba(253, 211, 92, 0.2)',
              boxShadow: '0 4px 16px rgba(253, 211, 92, 0.1)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <h4 style={{ 
                margin: '0 0 20px 0', 
                fontSize: '1.25rem',
                fontWeight: '700',
                textAlign: 'center',
                color: '#2e2e2e',
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                paddingBottom: '12px',
                borderBottom: '2px solid rgba(253, 211, 92, 0.3)'
              }}>
                Select Location
              </h4>
              
              {/* Scrollable buttons container */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }} className="custom-scrollbar">
                <button
                  onClick={() => handleObjectSelect(null)}
                  className="location-btn"
                  data-selected={selectedObject === null}
                >
                  <span className="btn-icon"></span>
                  <span className="btn-text">Free View</span>
                </button>
                {objects.map((obj) => (
                  <button
                    key={obj.name}
                    onClick={() => handleObjectSelect(obj.name)}
                    className="location-btn"
                    data-selected={selectedObject === obj.name}
                  >
                    <span className="btn-icon"></span>
                    <span className="btn-text">{obj.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - 3D Viewer */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            background: 'linear-gradient(135deg, #fef8ec 0%, #f8f1e0 100%)'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#fef8ec',
              borderRadius: '20px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(253, 211, 92, 0.1)',
              overflow: 'hidden',
              border: '1px solid rgba(253, 211, 92, 0.2)',
              position: 'relative'
            }}>
              <EnhancedThreeDModelViewer selectedObject={selectedObject} onSelectObject={handleObjectClickFromViewer} />
              
              {/* Instructions Overlay */}
              <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                background: 'linear-gradient(135deg, rgba(46, 46, 46, 0.92) 0%, rgba(30, 30, 30, 0.95) 100%)',
                backdropFilter: 'blur(12px)',
                color: 'white',
                padding: '18px 20px',
                borderRadius: '14px',
                fontSize: '0.875rem',
                maxWidth: '280px',
                zIndex: 10,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(253, 211, 92, 0.1)',
                border: '1px solid rgba(253, 211, 92, 0.15)'
              }}>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#FDD35C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                   Controls
                </h4>
                <p style={{ margin: '6px 0', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                   Hold & drag to rotate
                </p>
                <p style={{ margin: '6px 0', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                   Scroll or W/S to zoom
                </p>
                <p style={{ margin: '6px 0', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                   Double-click to focus
                </p>
                <p style={{ margin: '6px 0', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                   W/A/S/D keys in free view
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <footer className="footer">
        <div className="divider"></div>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>

      <style jsx>{`
        .footer {
          background: linear-gradient(135deg, #f5e6d3 0%, #e8cfa3 100%);
          text-align: center;
          padding: 1.5rem 0;
          color: rgba(18, 50, 56, 0.85);
          font-size: 0.9rem;
          border-top: 1px solid rgba(253, 211, 92, 0.2);
        }
        .divider {
          width: 80%;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #d3b885 50%, transparent 100%);
          margin: 1.5rem auto;
        }

        /* Location buttons - Responsive text sizing */
        :global(.location-btn) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 48px;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          position: relative;
          overflow: visible;
          white-space: normal;
          word-wrap: break-word;
          line-height: 1.4;
        }

        :global(.location-btn[data-selected="false"]) {
          background-color: #ffffff;
          color: #2e2e2e;
          border: 2px solid rgba(253, 211, 92, 0.3);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        :global(.location-btn[data-selected="true"]) {
          background-color: #FEBE52;
          color: #ffffff;
          border: 2px solid #f59e0b;
          box-shadow: 0 4px 12px rgba(254, 190, 82, 0.4);
        }

        :global(.location-btn[data-selected="false"]:hover) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(254, 190, 82, 0.25);
          border-color: rgba(253, 211, 92, 0.6);
        }

        :global(.location-btn[data-selected="true"]:hover) {
          box-shadow: 0 6px 16px rgba(254, 190, 82, 0.5);
        }

        :global(.btn-icon) {
          flex-shrink: 0;
          font-size: clamp(1rem, 2.5vw, 1.25rem);
          line-height: 1;
        }

        :global(.btn-text) {
          flex: 1;
          font-size: clamp(0.85rem, 1.8vw, 0.95rem);
          letter-spacing: 0.3px;
          overflow: visible;
          text-overflow: clip;
          white-space: normal;
          word-break: break-word;
        }

        /* Custom scrollbar styling */
        :global(.custom-scrollbar::-webkit-scrollbar) {
          width: 8px;
        }

        :global(.custom-scrollbar::-webkit-scrollbar-track) {
          background: rgba(253, 211, 92, 0.1);
          border-radius: 10px;
        }

        :global(.custom-scrollbar::-webkit-scrollbar-thumb) {
          background: linear-gradient(180deg, #FEBE52 0%, #f59e0b 100%);
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
          background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
        }

        /* Firefox scrollbar */
        :global(.custom-scrollbar) {
          scrollbar-width: thin;
          scrollbar-color: #FEBE52 rgba(253, 211, 92, 0.1);
        }

        /* Responsive design */
        @media (max-width: 1400px) {
          :global(.btn-text) {
            font-size: 0.9rem;
          }
        }

        @media (max-width: 1200px) {
          :global(.location-btn) {
            min-height: 44px;
            padding: 10px 14px;
            gap: 6px;
          }
          :global(.btn-text) {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 1024px) {
          :global(.custom-scrollbar) {
            padding-right: 4px;
          }
          :global(.location-btn) {
            min-height: 42px;
            padding: 10px 12px;
          }
          :global(.btn-text) {
            font-size: 0.85rem;
          }
        }

        @media (max-width: 900px) {
          :global(.location-btn) {
            min-height: 40px;
            padding: 8px 10px;
            gap: 5px;
          }
          :global(.btn-text) {
            font-size: 0.8rem;
          }
          :global(.btn-icon) {
            font-size: 1rem;
          }
        }

        @media (max-width: 768px) {
          /* Stack layout on mobile */
          div[style*="flex: 1"] {
            flex-direction: column !important;
          }
          
          div[style*="width: 320px"] {
            width: 100% !important;
            min-width: 100% !important;
            max-height: 200px;
            border-right: none !important;
            border-bottom: 1px solid rgba(253, 211, 92, 0.3);
          }

          :global(.location-btn) {
            min-height: 44px;
            padding: 10px 14px;
          }
          :global(.btn-text) {
            font-size: 0.9rem;
          }
        }

        /* Extra small screens */
        @media (max-width: 400px) {
          :global(.location-btn) {
            padding: 8px 10px;
            gap: 4px;
          }
          :global(.btn-text) {
            font-size: 0.8rem;
          }
        }

        /* Handle browser zoom - scale text appropriately */
        @media (min-resolution: 120dpi) and (max-resolution: 192dpi) {
          :global(.btn-text) {
            font-size: 0.88rem;
          }
        }

        @media (min-resolution: 192dpi) {
          :global(.btn-text) {
            font-size: 0.85rem;
          }
          :global(.location-btn) {
            padding: 10px 12px;
          }
        }
      `}</style>
    </>
  );
}
