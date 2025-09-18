"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
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

export default function ThreeDModelViewer({ modelPath }) {
  return (
    <Canvas style={{ height: "600px", width: "100%" }} camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 0, 5]} />
      <Suspense fallback={<Loader />}>
        <Model url={modelPath} />
        <OrbitControls />
      </Suspense>
    </Canvas>
  );
}
