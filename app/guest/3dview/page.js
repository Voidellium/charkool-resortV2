'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const ThreeDModelViewer = dynamic(() => import('../../../components/ThreeDModelViewer'), {
  ssr: false,
  loading: () => <div>Loading 3D Viewer...</div>
});

export default function ThreeDView() {
  const [modelPath, setModelPath] = useState('/models/Teepee.obj'); // Default to Teepee.obj

  return (
    <>
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>3D Resort Viewing</h1>
        <p>Explore our resort in 3D!</p>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="modelSelect">Select Model:</label>
          <select
            id="modelSelect"
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="/models/Teepee.obj">Teepee Model</option>
            <option value="/models/BilyaranStore.obj">Bilyaran Store Model</option>
            <option value="/models/PoolsideKubo.obj">Poolside Kubo Model</option>
            <option value="/models/Stage.obj">Stage Model</option>
          </select>
        </div>

        <ThreeDModelViewer modelPath={modelPath} />
      </div>
    </>
  );
}
