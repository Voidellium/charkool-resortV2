"use client";

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress, Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useLoader } from "@react-three/fiber";
import { useSpring } from "@react-spring/three";
import * as THREE from "three";

function Model({ url, onObjectClick, onPositionsComputed }) {
  const gltf = useLoader(GLTFLoader, url);
  const sceneRef = useRef();

  useEffect(() => {
    if (gltf) {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.userData.clickable = true;
          child.userData.name = child.name;
        }
      });
    }
  }, [gltf]);

  const positions = useMemo(() => {
    if (!gltf) return null;

    const pos = {};
    gltf.scene.traverse((child) => {
      if (child.name && (child.isMesh || child.isGroup)) {
        const box = new THREE.Box3().setFromObject(child);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) / 2;
        pos[child.name] = {
          center: [center.x, center.y, center.z],
          radius: radius * 1.5,
        };
      }
    });

    const overallBox = new THREE.Box3().setFromObject(gltf.scene);
    const overallCenter = overallBox.getCenter(new THREE.Vector3());
    const overallSize = overallBox.getSize(new THREE.Vector3());
    const overallRadius = Math.max(overallSize.x, overallSize.y, overallSize.z) * 1.5;
    pos.overall = {
      center: [overallCenter.x, overallCenter.y, overallCenter.z],
      radius: overallRadius,
    };
    return pos;
  }, [gltf]);

  useEffect(() => {
    if (positions && onPositionsComputed) {
      onPositionsComputed(positions);
    }
  }, [positions, onPositionsComputed]);

  return (
    <primitive
      ref={sceneRef}
      object={gltf.scene}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (e.object.userData.clickable) {
          onObjectClick(e.object.userData.name);
        }
      }}
    />
  );
}

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(0)} % loaded</Html>;
}

function AnimatedControls({ target, position, isLocked }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const [isAnimating, setIsAnimating] = useState(false);
  const [keys, setKeys] = useState({});

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 1200);
    return () => clearTimeout(timer);
  }, [target, position]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isLocked) return;
      setKeys(prev => ({ ...prev, [event.key.toLowerCase()]: true }));
    };
    const handleKeyUp = (event) => {
      setKeys(prev => ({ ...prev, [event.key.toLowerCase()]: false }));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isLocked]);

  const springs = useSpring({
    target: target,
    position: position,
    config: { duration: 1000 },
  });

  useFrame(() => {
    if (isAnimating) {
      const targetVec = new THREE.Vector3().fromArray(springs.target.get());
      const positionVec = new THREE.Vector3().fromArray(springs.position.get());

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetVec, 0.1);
        camera.position.lerp(positionVec, 0.1);
        controlsRef.current.update();
      }
    }

    if (!isLocked && controlsRef.current) {
      const speed = 2;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();

      if (keys['w']) {
        camera.position.add(direction.clone().multiplyScalar(speed));
        controlsRef.current.target.add(direction.clone().multiplyScalar(speed));
      }
      if (keys['s']) {
        camera.position.add(direction.clone().multiplyScalar(-speed));
        controlsRef.current.target.add(direction.clone().multiplyScalar(-speed));
      }
      if (keys['a']) {
        camera.position.add(right.clone().multiplyScalar(-speed));
        controlsRef.current.target.add(right.clone().multiplyScalar(-speed));
      }
      if (keys['d']) {
        camera.position.add(right.clone().multiplyScalar(speed));
        controlsRef.current.target.add(right.clone().multiplyScalar(speed));
      }
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={!isLocked}
      enableZoom={true}
      enableRotate={true}
      zoomSpeed={0.6}
      rotateSpeed={0.5}
      minDistance={1}
      maxDistance={500}
      maxPolarAngle={Math.PI / 2}
    />
  );
}

export default function EnhancedThreeDModelViewer({ selectedObject, onSelectObject }) {
  const [objectPositions, setObjectPositions] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const canvasRef = useRef();
  const modelPath = "/models/WholeMap_Separated_Textured.gltf";



  const handleObjectSelection = (objectName) => {
    onSelectObject(objectName);
    setIsLocked(true);
  };

  const getObjectPosition = useCallback((objectName) => {
    const name = objectName || 'overall';
    if (objectPositions[name]) {
      const { center, radius } = objectPositions[name];
      const newPosition = {
        target: center,
        position: [center[0], center[1] + radius * 0.5, center[2] + radius * 1.5],
      };
      if (name === 'overall') {
        newPosition.position = [center[0], center[1] + radius * 0.5, center[2] + radius * 1.5];
      }
      return newPosition;
    }
    return {
      target: [0, 0, 0],
      position: [0, 10, 20],
    };
  }, [objectPositions]);

  const handlePositionsComputed = useCallback((positions) => {
    setObjectPositions(positions);
  }, []);

  const { target, position } = getObjectPosition(selectedObject);

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 60, 120], fov: 75 }}
        style={{
          background: '#E09D28',
          width: '100%',
          height: '100%',
        }}
      >
        <ambientLight intensity={0.8} />
        <hemisphereLight intensity={0.6} skyColor="#E09D28" groundColor="#000000" />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        <Suspense fallback={<Loader />}>
          <Model
            url={modelPath}
            onObjectClick={handleObjectSelection}
            onPositionsComputed={handlePositionsComputed}
          />
          <AnimatedControls target={target} position={position} isLocked={isLocked} />
        </Suspense>
      </Canvas>
    </div>
  );
}
