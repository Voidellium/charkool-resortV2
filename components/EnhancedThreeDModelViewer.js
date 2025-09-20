"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress, Html } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { useLoader } from "@react-three/fiber";

function Model({ url }) {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} />;
}

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(0)} % loaded</Html>;
}

function CustomControls({ isInteracting }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    if (isInteracting) {
      gl.domElement.style.cursor = 'none';
    } else {
      gl.domElement.style.cursor = 'crosshair';
    }
  }, [isInteracting, gl.domElement]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={isInteracting}
      zoomSpeed={0.6}
      rotateSpeed={0.5}
      minDistance={0.1}
      maxDistance={100}
    />
  );
}

export default function EnhancedThreeDModelViewer({ modelPath }) {
  const [isInteracting, setIsInteracting] = useState(false);
  const canvasRef = useRef();

  const handleCanvasClick = () => {
    setIsInteracting(!isInteracting);
  };

  const handleMouseMove = (event) => {
    if (isInteracting && canvasRef.current) {
      // Mouse movement is handled by OrbitControls when enabled
    }
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
  };

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isInteracting ? 'none' : 'crosshair',
        overflow: 'hidden'
      }}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{
          background: 'linear-gradient(to bottom, #87CEEB, #98FB98)',
          width: '100%',
          height: '100%'
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        <Suspense fallback={<Loader />}>
          <Model url={modelPath} />
          <CustomControls isInteracting={isInteracting} />
        </Suspense>
      </Canvas>
    </div>
  );
}
