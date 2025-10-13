'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const EnhancedThreeDModelViewer = dynamic(() => import('../../components/EnhancedThreeDModelViewer'), {
  ssr: false,
  loading: () => <div>Loading 3D Viewer...</div>
});

export default function VirtualTour() {
  const [selectedObject, setSelectedObject] = useState(null);

  const objects = [
    { name: 'Villa', displayName: 'Villa' },
    { name: 'Stage ', displayName: 'Stage' },
    { name: 'Poolside Kubo', displayName: 'Poolside Kubo' },
    { name: 'Teepee', displayName: 'Teepee' },
    { name: 'FamilyLodge', displayName: 'Family Lodge' },
    { name: 'Store & Bilyaran', displayName: 'Store & Bilyaran' },
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
        marginTop: '0'
      }}>
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}>
          <div style={{
            width: '35%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            gap: '20px',
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #ddd'
          }}>
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Select Object</h4>
              <button
                onClick={() => handleObjectSelect(null)}
                style={{
                  backgroundColor: selectedObject === null ? '#FEBE52' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                }}
              >
                Free View
              </button>
              {objects.map((obj) => (
                <button
                  key={obj.name}
                  onClick={() => handleObjectSelect(obj.name)}
                  style={{
                    backgroundColor: selectedObject === obj.name ? '#FEBE52' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                  }}
                >
                  {obj.displayName}
                </button>
              ))}
            </div>
          </div>
          <div style={{
            width: '65%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#E09D28'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              maxWidth: '800px',
              maxHeight: '600px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              border: '2px solid #ddd',
              position: 'relative'
            }}>
              <EnhancedThreeDModelViewer selectedObject={selectedObject} onSelectObject={handleObjectClickFromViewer} />
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '14px',
                maxWidth: '250px',
                zIndex: 10
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>3D Viewer Controls</h4>
                <p style={{ margin: '5px 0' }}>• Hold left mouse button to rotate</p>
                <p style={{ margin: '5px 0' }}>• Scroll to zoom in/out</p>
                <p style={{ margin: '5px 0' }}>• Double-click model to zoom to it</p>
                <p style={{ margin: '5px 0' }}>• Use W/A/S/D to move in free view</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{
        backgroundColor: '#e8cfa3',
        textAlign: 'center',
        padding: '1.5rem 0',
        color: '#123238',
        fontSize: '0.95rem',
        borderTop: '1px solid #d3b885'
      }}>
        © 2025 Charkool Beach Resort. All Rights Reserved.
      </footer>
    </>
  );
}
