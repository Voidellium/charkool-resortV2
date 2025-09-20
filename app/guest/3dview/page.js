'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const EnhancedThreeDModelViewer = dynamic(() => import('../../../components/EnhancedThreeDModelViewer'), {
  ssr: false,
  loading: () => <div>Loading 3D Viewer...</div>
});

const ModelSelectorPanel = dynamic(() => import('../../../components/ModelSelectorPanel'), {
  ssr: false,
  loading: null
});

export default function ThreeDView() {
  const [modelPath, setModelPath] = useState('/models/Teepee.obj'); // Default to Teepee.obj
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Main Content Container - Two Column Layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Column - 35% width */}
        <div style={{
          width: '35%',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          gap: '20px',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #ddd'
        }}>
          {/* Instructions Box */}
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>3D Viewer Controls</h4>
              <p style={{ margin: '8px 0' }}>• Click model to enable mouse look</p>
              <p style={{ margin: '8px 0' }}>• Hold left mouse button to rotate</p>
              <p style={{ margin: '8px 0' }}>• Scroll to zoom in/out</p>
              <p style={{ margin: '8px 0', fontSize: '12px', opacity: 0.8 }}>
                Click the model to start interaction
              </p>
            </div>
          </div>

          {/* Choose Model Button */}
          <button
            onClick={() => setIsPanelOpen(true)}
            style={{
              padding: '14px 28px',
              backgroundColor: '#28a745',
              color: 'white',
              border: '2px solid #218838',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(40, 167, 69, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(40, 167, 69, 0.4)';
            }}
          >
            Choose Model
          </button>
        </div>

        {/* Right Column - 65% width */}
        <div style={{
          width: '65%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#f0f0f0'
        }}>
          {/* 3D Model Container */}
          <div style={{
            width: '100%',
            height: '100%',
            maxWidth: '800px',
            maxHeight: '600px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            border: '2px solid #ddd'
          }}>
            <EnhancedThreeDModelViewer modelPath={modelPath} />
          </div>
        </div>
      </div>

      {/* Model Selector Panel */}
      <ModelSelectorPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onModelSelect={setModelPath}
        currentModel={modelPath}
      />
    </div>
  );
}
