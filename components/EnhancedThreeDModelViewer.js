"use client";

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress, Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import gsap from "gsap";

/* ---------- Error Boundary (unchanged) ---------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('3D Model Viewer Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
          color: '#666',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>3D Model Loading Error</div>
          <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '300px' }}>
            There was an issue loading the 3D model. This may be due to missing textures or corrupted model files.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- Enhanced loader hook (keeps your robust checks) ---------- */
function useEnhancedGLTFLoader(url) {
  const [gltf, setGltf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);

    const loadingManager = new THREE.LoadingManager();

    loadingManager.onError = (failedUrl) => {
      if (!mounted) return;
      if (failedUrl.includes('draco')) {
        setError({ userMessage: 'DRACO decoder file missing or inaccessible: ' + failedUrl });
      } else if (failedUrl.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/)) {
        setError({ userMessage: 'Texture file missing or inaccessible: ' + failedUrl });
      } else {
        setError({ userMessage: 'Resource failed to load: ' + failedUrl });
      }
      setLoading(false);
    };

    loader.manager = loadingManager;

    setLoading(true);
    setError(null);

    loader.load(
      url,
      (loadedGltf) => {
        if (!mounted) return;
        // Safety: enable frustum culling and set simple material fallbacks
        loadedGltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = true;
            // clamp large texture maps handling if needed (kept simple)
            if (child.material) {
              // avoid heavy env reflections by default
              if (child.material.envMap) {
                child.material.envMapIntensity = 0;
              }
              child.material.needsUpdate = true;
            }
          }
        });
        setGltf(loadedGltf);
        setLoading(false);
      },
      undefined,
      (err) => {
        if (!mounted) return;
        console.error('GLTF load error', err);
        setError({ userMessage: 'Failed to load 3D model', originalError: err });
        setLoading(false);
      }
    );

    return () => { mounted = false; dracoLoader.dispose(); };
  }, [url]);

  return { gltf, error, loading };
}

/* ---------- Model primitive with double-click handler ---------- */
function Model({ url, onObjectClick, onPositionsComputed, onError }) {
  const { gltf, error, loading } = useEnhancedGLTFLoader(url);
  const sceneRef = useRef();

  useEffect(() => { if (error && onError) onError(error); }, [error, onError]);

  useEffect(() => {
    if (gltf) {
      // mark clickable meshes & prepare bounding boxes
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.userData.clickable = true;
          if (!child.name) child.name = `mesh_${child.id}`;
        }
      });
    }
  }, [gltf]);

  useEffect(() => {
    if (!gltf || !onPositionsComputed) return;
    const pos = {};
    gltf.scene.traverse((child) => {
      if ((child.isMesh || child.isGroup) && child.name) {
        const box = new THREE.Box3().setFromObject(child);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) / 2;
        pos[child.name] = {
          center: [center.x, center.y, center.z],
          radius: radius * 1.5
        };
      }
    });
    const overallBox = new THREE.Box3().setFromObject(gltf.scene);
    const overallCenter = overallBox.getCenter(new THREE.Vector3());
    const overallSize = overallBox.getSize(new THREE.Vector3());
    const overallRadius = Math.max(overallSize.x, overallSize.y, overallSize.z) * 1.5;
    pos.overall = { center: [overallCenter.x, overallCenter.y, overallCenter.z], radius: overallRadius };
    onPositionsComputed(pos);
  }, [gltf, onPositionsComputed]);

  if (!gltf) return null;

  return (
    <primitive
      ref={sceneRef}
      object={gltf.scene}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // walk to find a clickable parent if the clicked object is submesh
        let src = e.object;
        while (src && !src.userData.clickable && src.parent) src = src.parent;
        if (src && src.userData.clickable && onObjectClick) {
          onObjectClick(src.name || `mesh_${src.id}`);
        }
      }}
    />
  );
}

/* ---------- Loader UI ---------- */
function Loader() {
  const { progress, errors } = useProgress();
  if (errors.length > 0) {
    return <Html center>
      <div style={{
        color: 'white', background: 'rgba(0,0,0,0.8)',
        padding: '10px', borderRadius: '5px', textAlign: 'center'
      }}>
        Loading model with fallbacks... {progress.toFixed(0)}%
      </div>
    </Html>;
  }
  return <Html center>
    <div style={{
      color: 'white', background: 'rgba(0,0,0,0.8)',
      padding: '10px', borderRadius: '5px', textAlign: 'center'
    }}>
      {progress.toFixed(0)}% loaded
    </div>
  </Html>;
}

/* ---------- PERFORMANCE OPTIMIZED AnimatedControls with lerp-based smooth zoom and WASD navigation ---------- */
function AnimatedControls({ target, position, isLocked, onAnimationStart, onAnimationEnd, selectedObject, viewMode }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  // Animation state for lerp-based smooth movement (only for object selection)
  const targetPosition = useRef(new THREE.Vector3());
  const targetTarget = useRef(new THREE.Vector3());
  const isAnimating = useRef(false);
  const hasCompletedAnimation = useRef(false); // Track if we've completed the animation
  const lerpSpeed = 0.25; // Increased from 0.08 for much faster animation

  // WASD navigation state
  const keysPressed = useRef({});
  const moveSpeed = useRef(0.8);
  const isFreeView = selectedObject === null || selectedObject === undefined;

  // Scroll zoom state - direct movement, no lerp
  const zoomVelocity = useRef(0);

  // GSAP-based smooth camera and target animation for object selection
  const prevTarget = useRef(target);
  const prevPosition = useRef(position);
  useEffect(() => {
    if (controlsRef.current && (target !== prevTarget.current || position !== prevPosition.current)) {
      targetPosition.current.set(position[0], position[1], position[2]);
      targetTarget.current.set(target[0], target[1], target[2]);
      isAnimating.current = true;
      hasCompletedAnimation.current = false; // Reset completion flag on new target
      
      // IMPORTANT: Clear all WASD key presses when switching views
      keysPressed.current = {};
      
      if (onAnimationStart) onAnimationStart();
      prevTarget.current = target;
      prevPosition.current = position;
    }
  }, [target, position, onAnimationStart]);

  // WASD keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      keysPressed.current[event.code] = true;
    };

    const handleKeyUp = (event) => {
      keysPressed.current[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Scroll zoom - accumulate scroll for smooth continuous zoom like WASD
  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();
      
      // Accumulate scroll delta (like holding a key)
      // Positive deltaY (scroll down) = zoom out (negative)
      // Negative deltaY (scroll up) = zoom in (positive)
      zoomVelocity.current += -event.deltaY * 0.0005;
    };

    // Add wheel event listener to canvas
    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl]);

  // WASD movement, scroll zoom, and animation updates (optimized frame loop)
  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // Handle scroll zoom - EXACTLY like WASD movement (smooth, no lag)
    if (Math.abs(zoomVelocity.current) > 0.0001) {
      // Calculate direction from camera to target
      const direction = new THREE.Vector3();
      direction.subVectors(controlsRef.current.target, camera.position).normalize();

      // Apply zoom movement (exactly like WASD uses moveSpeed)
      const zoomAmount = zoomVelocity.current * delta * 60; // Frame-rate independent, just like WASD
      
      // Move camera along direction
      camera.position.add(direction.multiplyScalar(zoomAmount));
      
      // Apply damping (deceleration when not scrolling)
      zoomVelocity.current *= 0.9;
      
      // Stop if velocity is very small
      if (Math.abs(zoomVelocity.current) < 0.0001) {
        zoomVelocity.current = 0;
      }
    }

    // Handle WASD movement ONLY in free view AND exterior mode
    if (isFreeView && viewMode === 'exterior') {
      const direction = new THREE.Vector3();
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);

      // Get camera right vector
      camera.getWorldDirection(direction);
      right.crossVectors(direction, up).normalize();

      let moveVector = new THREE.Vector3();

      if (keysPressed.current['KeyW']) {
        moveVector.add(direction);
      }
      if (keysPressed.current['KeyS']) {
        moveVector.add(direction.clone().multiplyScalar(-1));
      }
      if (keysPressed.current['KeyA']) {
        moveVector.add(right.clone().multiplyScalar(-1));
      }
      if (keysPressed.current['KeyD']) {
        moveVector.add(right);
      }

      if (moveVector.length() > 0) {
        moveVector.normalize().multiplyScalar(moveSpeed.current * delta * 60); // Frame-rate independent
        camera.position.add(moveVector);
        controlsRef.current.target.add(moveVector);
      }
    } else if (!isFreeView && viewMode === 'exterior') {
      // When object is selected in EXTERIOR mode, W/S act as zoom in/out toward the object
      const direction = new THREE.Vector3();
      direction.subVectors(controlsRef.current.target, camera.position).normalize();

      let zoomMove = 0;

      if (keysPressed.current['KeyW']) {
        zoomMove = 1; // Zoom in
      }
      if (keysPressed.current['KeyS']) {
        zoomMove = -1; // Zoom out
      }

      if (zoomMove !== 0) {
        const zoomSpeed = 0.8; // Same speed as WASD movement
        const zoomAmount = zoomMove * zoomSpeed * delta * 60;
        camera.position.add(direction.multiplyScalar(zoomAmount));
      }
    }
    // In interior mode (viewMode === 'interior'), no WASD controls at all - only scroll zoom works

    // Handle lerp-based smooth animation - but STOP once completed (only for object selection)
    if (isAnimating.current && !hasCompletedAnimation.current) {
      // Animate camera to target position
      camera.position.lerp(targetPosition.current, lerpSpeed);
      controlsRef.current.target.lerp(targetTarget.current, lerpSpeed);

      // Check if animation is complete or close enough
      if (camera.position.distanceTo(targetPosition.current) < 0.5 &&
          controlsRef.current.target.distanceTo(targetTarget.current) < 0.5) {
        isAnimating.current = false;
        hasCompletedAnimation.current = true; // Mark as completed
        if (onAnimationEnd) onAnimationEnd();
      }
    }

    controlsRef.current.update();
  });

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.12;
      controlsRef.current.enablePan = true; // Always enable pan
      controlsRef.current.enableRotate = true; // Always allow rotation
      controlsRef.current.enableZoom = false; // Disable default zoom
      controlsRef.current.zoomSpeed = 0; // Ensure no default zoom
      controlsRef.current.rotateSpeed = 0.5;
      controlsRef.current.minDistance = 5;
      controlsRef.current.maxDistance = 200;
      controlsRef.current.maxPolarAngle = Math.PI * 0.48; // Ground lock - prevent going under the model (slightly less than 90°)
      controlsRef.current.minPolarAngle = 0.1; // Prevent flipping at top
    }
  }, [isLocked]);

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      makeDefault
    />
  );
}

/* ---------- Main viewer inner ---------- */
function EnhancedThreeDModelViewerInner({ selectedObject: externalSelected, onSelectObject: externalOnSelect, modelPath: externalModelPath, viewMode }) {
  const [objectPositions, setObjectPositions] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [initialCameraReady, setInitialCameraReady] = useState(false);
  const modelPath = externalModelPath || "/models/WholeMap_12.glb";

  // Sync external selected object with internal state
  useEffect(() => {
    setSelectedObject(externalSelected);
  }, [externalSelected]);

  // Reset camera state when model changes
  useEffect(() => {
    setObjectPositions({});
    setInitialCameraReady(false);
    setSelectedObject(null);
    setModelError(null);
  }, [modelPath]);

  // compute camera positions from positions map
  const getObjectPosition = useCallback((objectName) => {
    const name = objectName || 'overall';
    
    // For interior views, use overall position (full room view)
    if (viewMode === 'interior') {
      if (objectPositions['overall']) {
        const { center, radius } = objectPositions['overall'];
        return {
          target: center,
          position: [center[0], center[1] + radius * 0.3, center[2] + radius * 0.8],
        };
      }
      return { target: [0, 0, 0], position: [0, 5, 15] };
    }
    
    // For exterior views, use specific mesh positions
    if (objectPositions[name]) {
      const { center, radius } = objectPositions[name];
      if (name === 'overall') {
        // Closer initial view for free view
        return {
          target: center,
          position: [center[0], center[1] + radius * 0.3, center[2] + radius * 0.6],
        };
      }
      return {
        target: center,
        position: [center[0], center[1] + radius * 0.4, center[2] + radius * 1.2],
      };
    }
    return { target: [0, 0, 0], position: [0, 10, 20] };
  }, [objectPositions, viewMode]);

  const handlePositionsComputed = useCallback((positions) => {
    setObjectPositions(positions);
    // set initial camera ready only when we have overall
    if (positions.overall) setInitialCameraReady(true);
  }, []);

  const handleModelError = useCallback((err) => setModelError(err), []);

  // When user double-clicks a model piece
  const handleObjectSelection = useCallback((objectName) => {
    setSelectedObject(objectName);
    // Don't lock - users should be able to rotate immediately
    if (externalOnSelect) externalOnSelect(objectName);
  }, [externalOnSelect]);

  // derive the target & position for AnimatedControls
  const { target, position } = useMemo(() => getObjectPosition(selectedObject || 'overall'), [getObjectPosition, selectedObject]);

  // Render error if model load failed
  if (modelError) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f0f0',
        color: '#666',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>3D Model Loading Error</div>
        <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '300px' }}>
          {modelError.userMessage || 'There was an issue loading the 3D model.'}
        </div>
        <button onClick={() => setModelError(null)} style={{
          padding: '8px 16px', background: '#007bff', color: 'white',
          border: 'none', borderRadius: '4px', cursor: 'pointer'
        }}>Retry</button>
      </div>
    );
  }

  // sensible default camera - will be overridden when positions are computed
  const defaultCamera = { position: [0, 40, 80], fov: 60 };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#505050' }}>
      <Canvas
        camera={defaultCamera}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl, camera }) => {
          // Optimize for performance - lower pixel ratio
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
          // Reduce tone mapping exposure for better performance
          gl.toneMappingExposure = 0.9;
          // Disable shadows completely for performance
          gl.shadowMap.enabled = false;
          // Disable antialiasing for better performance
          gl.antialias = false;
          // Preserve drawing buffer for screenshots if needed
          gl.preserveDrawingBuffer = false;
          // Set power preference for performance
          gl.powerPreference = 'high-performance';
        }}
        gl={{ 
          antialias: false, // Disable antialiasing for performance
          powerPreference: 'high-performance',
          alpha: false // Disable alpha for performance
        }}
      >
        {/* Sand background color */}
        <color attach="background" args={['#d4a574']} />
        
        {/* Static lighting only: ambient + single directional (no shadow updates) */}
        <ambientLight intensity={1.0} color={'#ffffff'} />
        <directionalLight
          color={'#ffe2b9'}
          intensity={1.2}
          position={[50, 80, 40]}
        />

        <Suspense fallback={<Loader />}>
          <Model
            url={modelPath}
            onObjectClick={handleObjectSelection}
            onPositionsComputed={handlePositionsComputed}
            onError={handleModelError}
          />

          {/* Only render controls after we computed overall so initial camera framing works */}
          <ControlsStarter
            initialReady={initialCameraReady}
            overall={objectPositions.overall}
            animatedTarget={target}
            animatedPosition={position}
            isLocked={isLocked}
            setIsLocked={setIsLocked}
            selectedObject={selectedObject}
            viewMode={viewMode}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ---------- Helper component to set initial camera based on overall bounding box ---------- */
function ControlsStarter({ initialReady, overall, animatedTarget, animatedPosition, isLocked, setIsLocked, selectedObject, viewMode }) {
  const { camera } = useThree();
  const [appliedInitial, setAppliedInitial] = useState(false);

  // Apply initial camera framing when overall bounding box becomes available
  useEffect(() => {
    if (!initialReady || !overall || appliedInitial) return;
    const [cx, cy, cz] = overall.center;
    const radius = overall.radius;
    // Closer initial framing - reduced distance multiplier
    const distance = radius * 0.6; // Much closer to the model
    const startPos = [cx, cy + radius * 0.3, cz + distance];
    camera.position.set(...startPos);
    camera.lookAt(cx, cy, cz);
    setAppliedInitial(true);
  }, [initialReady, overall, camera, appliedInitial]);

  // handle animation start/end callbacks - DON'T lock controls, rotation should always work
  const handleAnimStart = () => {
    // Don't lock controls - users should be able to rotate immediately
  };
  const handleAnimEnd = () => {
    setIsLocked(false);
  };

  return (
    <AnimatedControls
      target={animatedTarget}
      position={animatedPosition}
      isLocked={isLocked}
      onAnimationStart={handleAnimStart}
      onAnimationEnd={handleAnimEnd}
      selectedObject={selectedObject}
      viewMode={viewMode}
    />
  );
}

/* ---------- Export wrapper ---------- */
export default function EnhancedThreeDModelViewer(props) {
  return (
    <ErrorBoundary>
      <EnhancedThreeDModelViewerInner {...props} />
    </ErrorBoundary>
  );
}
