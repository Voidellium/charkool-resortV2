"use client";

import React, { useState } from 'react';

const ModelSelectorPanel = ({ isOpen, onClose, onModelSelect, currentModel }) => {
  const [isHovered, setIsHovered] = useState(false);

  const models = [
    { name: 'Teepee Model', path: '/models/Teepee.obj', icon: '⛺' },
    { name: 'Bilyaran Store Model', path: '/models/BilyaranStore.obj', icon: '🏪' },
    { name: 'Poolside Kubo Model', path: '/models/PoolsideKubo.obj', icon: '🏖️' },
    { name: 'Stage Model', path: '/models/Stage.obj', icon: '🎭' },
    { name: 'Villa Model', path: '/models/Villa.gltf', icon: '🏘️' }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="panel-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}

      {/* Side Panel */}
      <div
        className="model-selector-panel"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-320px',
          width: '300px',
          height: '100vh',
          backgroundColor: isHovered || isOpen ? 'white' : 'transparent',
          boxShadow: (isHovered || isOpen) ? '2px 0 10px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'left 0.3s ease-in-out, background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          zIndex: 1001,
          padding: '20px',
          overflowY: 'auto'
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: isHovered || isOpen ? '#333' : 'transparent' }}>Choose Model</h3>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: isHovered || isOpen ? '#666' : 'transparent',
              opacity: isHovered || isOpen ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out, color 0.3s ease-in-out'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {models.map((model) => (
            <button
              key={model.path}
              onClick={() => {
                onModelSelect(model.path);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                border: currentModel === model.path ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: currentModel === model.path ? '#f0f8ff' : (isHovered || isOpen ? 'white' : 'transparent'),
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                opacity: isHovered || isOpen ? 1 : 0,
                transform: isHovered || isOpen ? 'translateX(0)' : 'translateX(-20px)'
              }}
              onMouseEnter={(e) => {
                if (currentModel !== model.path && (isHovered || isOpen)) {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#007bff';
                }
              }}
              onMouseLeave={(e) => {
                if (currentModel !== model.path && (isHovered || isOpen)) {
                  e.target.style.backgroundColor = isHovered || isOpen ? 'white' : 'transparent';
                  e.target.style.borderColor = '#ddd';
                }
              }}
            >
              <span style={{ fontSize: '24px', marginRight: '15px' }}>
                {model.icon}
              </span>
              <div>
                <div style={{ fontWeight: 'bold', color: isHovered || isOpen ? '#333' : 'transparent' }}>
                  {model.name}
                </div>
                <div style={{ fontSize: '12px', color: isHovered || isOpen ? '#666' : 'transparent' }}>
                  {currentModel === model.path ? 'Currently Selected' : 'Click to select'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ModelSelectorPanel;
