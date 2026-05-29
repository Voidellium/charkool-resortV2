'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useModelPaths } from '@/hooks/useModelPaths';

const EnhancedThreeDModelViewer = dynamic(() => import('../../../components/EnhancedThreeDModelViewer'), {
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

export default function GuestVirtualTour() {
  const { modelPaths } = useModelPaths();
  const [selectedObject, setSelectedObject] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [viewMode, setViewMode] = useState('exterior'); // 'exterior' or 'interior'
  const [modelPath, setModelPath] = useState(null);

  // Initialize modelPath when modelPaths is loaded
  useEffect(() => {
    if (modelPaths.resortMap && !modelPath) {
      setModelPath(modelPaths.resortMap);
    }
  }, [modelPaths, modelPath]);

  // Mesh names from GLTF for zoom buttons
  const objects = [
    { name: 'Teepee', displayName: 'Teepee', hasInterior: true },
    { name: 'Reception', displayName: 'Reception', hasInterior: false },
    { name: 'Loft', displayName: 'Loft', hasInterior: true },
    { name: 'Cottages', displayName: 'Cottages', hasInterior: false },
    { name: 'Villa', displayName: 'Villa', hasInterior: true },
    { name: 'ILoveCharkool', displayName: 'ILoveCharkool', hasInterior: false }
  ];

  const handleObjectSelect = (objectName) => {
    if (viewMode === 'interior') {
      setViewMode('exterior');
      setModelPath(modelPaths.resortMap);
    }
    setSelectedObject(objectName);
    setOpenDropdown(null); // Close any open dropdown
  };

  const handleObjectClickFromViewer = (objectName) => {
    setSelectedObject(objectName);
  };

  const handleDropdownToggle = (objectName) => {
    setOpenDropdown(openDropdown === objectName ? null : objectName);
  };

  const handleInteriorView = (objectName) => {
    setOpenDropdown(null);
    setViewMode('interior');
    
    if (modelPaths.interiors[objectName]) {
      setModelPath(modelPaths.interiors[objectName]);
      setSelectedObject(null);
    }
  };

  const handleBackToExterior = () => {
    setViewMode('exterior');
    setModelPath(modelPaths.resortMap);
    setSelectedObject(null);
  };

  return (
    <div className="virtual-tour-container">
      <div className="virtual-tour-header">
        <h1>Virtual Tour</h1>
        <p>Explore Charkool Beach Resort in 3D</p>
      </div>

      <div className="viewer-wrapper">
        {/* Location Selector Panel */}
        <div className="location-selector">
          <h3>Select Location</h3>
          
          {/* Free View Button */}
          <button 
            className={`location-btn ${selectedObject === null && viewMode === 'exterior' ? 'active' : ''}`}
            onClick={() => {
              setSelectedObject(null);
              setOpenDropdown(null);
              if (viewMode === 'interior') {
                handleBackToExterior();
              }
            }}
          >
            Free View
          </button>

          {/* Location Buttons with Dropdowns */}
          {objects.map((obj) => (
            <div key={obj.name} className="location-item">
              <button 
                className={`location-btn ${selectedObject === obj.name ? 'active' : ''}`}
                onClick={() => handleObjectSelect(obj.name)}
              >
                {obj.displayName}
              </button>
              
              {obj.hasInterior && (
                <button 
                  className="dropdown-toggle"
                  onClick={() => handleDropdownToggle(obj.name)}
                  aria-label={`Toggle ${obj.displayName} options`}
                >
                  ▼
                </button>
              )}
              
              {obj.hasInterior && openDropdown === obj.name && (
                <div className="dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={() => handleInteriorView(obj.name)}
                  >
                    View Interior
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Back to Exterior Button */}
          {viewMode === 'interior' && (
            <button 
              className="back-btn"
              onClick={handleBackToExterior}
            >
              <ArrowLeft size={16} style={{ marginRight: 6 }} />
              Back to Exterior
            </button>
          )}
        </div>

        {/* 3D Viewer */}
        <div className="viewer-container">
          <EnhancedThreeDModelViewer
            modelPath={modelPath}
            selectedObject={selectedObject}
            onObjectClick={handleObjectClickFromViewer}
            viewMode={viewMode}
          />
        </div>
      </div>

      <style jsx>{`
        .virtual-tour-container {
          width: 100%;
          min-height: calc(100vh - 80px);
          background: linear-gradient(135deg, #FFF8E1 0%, #FFEAA7 100%);
          padding: 1.5rem 2rem 2rem;
        }

        .virtual-tour-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .virtual-tour-header h1 {
          font-size: 2.5rem;
          color: #8B4513;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .virtual-tour-header p {
          font-size: 1.2rem;
          color: #A0826D;
        }

        .viewer-wrapper {
          display: flex;
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          height: calc(100vh - 250px);
          min-height: 600px;
        }

        .location-selector {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          width: 280px;
          height: fit-content;
          max-height: 100%;
          overflow-y: auto;
        }

        .location-selector h3 {
          color: #8B4513;
          font-size: 1.3rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .location-item {
          position: relative;
          margin-bottom: 0.5rem;
        }

        .location-btn {
          width: 100%;
          padding: 0.9rem 1rem;
          background: #FFF8E1;
          border: 2px solid #D4AF37;
          border-radius: 8px;
          color: #8B4513;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .location-btn:hover {
          background: #FFEAA7;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
        }

        .location-btn.active {
          background: #D4AF37;
          color: white;
          border-color: #B8941F;
        }

        .dropdown-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #8B4513;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0.5rem;
          transition: transform 0.2s ease;
        }

        .dropdown-toggle:hover {
          transform: translateY(-50%) scale(1.2);
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #D4AF37;
          border-radius: 8px;
          margin-top: 4px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          z-index: 10;
          overflow: hidden;
        }

        .dropdown-item {
          width: 100%;
          padding: 0.8rem 1rem;
          background: white;
          border: none;
          color: #8B4513;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease;
        }

        .dropdown-item:hover {
          background: #FFF8E1;
        }

        .back-btn {
          width: 100%;
          padding: 0.9rem 1rem;
          background: #6C757D;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-btn:hover {
          background: #5A6268;
          transform: translateY(-2px);
        }

        .viewer-container {
          flex: 1;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 968px) {
          .virtual-tour-container {
            padding-top: 1rem;
          }

          .viewer-wrapper {
            flex-direction: column;
            height: auto;
          }

          .location-selector {
            width: 100%;
            max-height: 300px;
          }

          .viewer-container {
            height: 500px;
          }

          .virtual-tour-header h1 {
            font-size: 2rem;
          }
        }

        @media (max-width: 640px) {
          .virtual-tour-container {
            padding: 1rem;
          }

          .virtual-tour-header h1 {
            font-size: 1.8rem;
          }

          .viewer-container {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
}
