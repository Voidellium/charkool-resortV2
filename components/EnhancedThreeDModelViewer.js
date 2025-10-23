
"use client";

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress, Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useLoader } from "@react-three/fiber";
import { useSpring } from "@react-spring/three";
import * as THREE from "three";

// Error Boundary for handling Three.js and React errors
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
    // Check if this is the specific R3F error
    if (error.message && error.message.includes('R3F: Div is not part of the THREE namespace')) {
      console.warn('React Three Fiber namespace error detected - this is likely due to improper HTML element usage in Canvas context');
    }
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

// Custom hook for loading GLTF with enhanced error handling
function useEnhancedGLTFLoader(url) {
  const [gltf, setGltf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loader = new GLTFLoader();
    // Setup DRACOLoader for compressed meshes
    const dracoLoader = new DRACOLoader();

    // Try both possible decoder paths
    let dracoPathTried = false;
    function setDracoPath(path) {
      dracoLoader.setDecoderPath(path);
      loader.setDRACOLoader(dracoLoader);
    }
    setDracoPath('/draco/');

    // If DRACO fails, try alternate path
    let triedAlternateDraco = false;

  let loadingManager = new THREE.LoadingManager();

    loadingManager.onError = (failedUrl) => {
      if (failedUrl.includes('draco') && !triedAlternateDraco) {
        // Try alternate path
        triedAlternateDraco = true;
        setDracoPath('/draco/gltf/');
        loader.load(
          url,
          (loadedGltf) => {
            setGltf(loadedGltf);
            setLoading(false);
          },
          undefined,
          (error) => {
            setError({ userMessage: 'DRACO decoder file missing or inaccessible at both /draco/ and /draco/gltf/. Please check your public folder.' });
            setLoading(false);
          }
        );
        return;
      }
      if (failedUrl.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/)) {
        setError({ userMessage: 'Texture file missing or inaccessible: ' + failedUrl });
      } else {
        setError({ userMessage: 'Resource failed to load: ' + failedUrl });
      }
      setLoading(false);
    };

    loader.manager = loadingManager;
  // Do not redeclare loadingManager, reuse the existing one

    loadingManager.onError = (failedUrl) => {
      // Show a clear error if DRACO or texture file is missing
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
        // Process the loaded GLTF to handle texture issues
        loadedGltf.scene.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];

            materials.forEach((material, index) => {
              // Create a robust material that doesn't break on texture errors
              const safeMaterial = material.clone();

              // Handle texture loading errors gracefully
              const textureProperties = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap'];

              textureProperties.forEach(prop => {
                if (safeMaterial[prop]) {
                  const texture = safeMaterial[prop];

                  // Add comprehensive error handling for textures
                  if (texture.image === undefined || texture.image === null) {
                    console.warn(`Missing texture image for ${prop} in material: ${material.name || 'unnamed'}`);
                    safeMaterial[prop] = null;
                    // Provide visual feedback with color
                    if (prop === 'map') {
                      safeMaterial.color = new THREE.Color(0x888888);
                    }
                  } else if (texture.image) {
                    // Add error event listener for runtime texture loading failures
                    const originalImage = texture.image;
                    if (originalImage.addEventListener) {
                      originalImage.addEventListener('error', () => {
                        setError({ userMessage: `Runtime texture loading error for ${prop} in material: ${material.name || 'unnamed'}` });
                        safeMaterial[prop] = null;
                        if (prop === 'map') {
                          safeMaterial.color = new THREE.Color(0x888888);
                        }
                        safeMaterial.needsUpdate = true;
                        setLoading(false);
                      });
                    }
                  }
                }
              });

              safeMaterial.needsUpdate = true;

              if (Array.isArray(child.material)) {
                child.material[index] = safeMaterial;
              } else {
                child.material = safeMaterial;
              }
            });
          }
        });

        console.log('3D Model loaded successfully with texture fallbacks applied');
        setGltf(loadedGltf);
        setLoading(false);
      },
      (progress) => {
        // Progress callback - can be used for loading indicator
      },
      (error) => {
        console.error('Error loading GLTF:', error);

        // Categorize the error for better user feedback
        let errorMessage = 'Failed to load 3D model';
        if (error.message && error.message.includes('404')) {
          errorMessage = 'Model file not found';
        } else if (error.message && error.message.includes('CSP')) {
          errorMessage = 'Content Security Policy blocking model resources';
        } else if (error.message && error.message.includes('texture')) {
          errorMessage = 'Texture loading error';
        }

        setError({ ...error, userMessage: errorMessage });
        setLoading(false);
      }
    );
  }, [url]);

  return { gltf, error, loading };
}

function Model({ url, onObjectClick, onPositionsComputed, onError }) {
  // Use custom hook with enhanced error handling
  const { gltf, error, loading } = useEnhancedGLTFLoader(url);
  const sceneRef = useRef();

  // Report errors to parent component instead of rendering HTML in Canvas
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // IMPORTANT: Do not return early before declaring hooks below.
  // Returning early conditionally would change the hooks order between renders
  // and cause "Rendered more hooks than during the previous render" errors.

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

  // Render only when gltf is ready; otherwise render nothing.
  return gltf ? (
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
  ) : null;
}

function Loader() {
  const { progress, errors, item, loaded, total } = useProgress();
  
  // Show error message if there are loading errors
  if (errors.length > 0) {
    console.warn('Loading errors detected:', errors);
    return (
      <Html center>
        <div style={{ 
          color: 'white', 
          background: 'rgba(0,0,0,0.8)', 
          padding: '10px', 
          borderRadius: '5px',
          textAlign: 'center' 
        }}>
          Loading model with texture fallbacks...
          <br />
          {progress.toFixed(0)}% loaded
        </div>
      </Html>
    );
  }
  
  return (
    <Html center>
      <div style={{ 
        color: 'white', 
        background: 'rgba(0,0,0,0.8)', 
        padding: '10px', 
        borderRadius: '5px',
        textAlign: 'center' 
      }}>
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  );
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

function EnhancedThreeDModelViewerInner({ selectedObject, onSelectObject }) {
  const [objectPositions, setObjectPositions] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [modelError, setModelError] = useState(null);
  const canvasRef = useRef();
  const modelPath = "/models/WholeMap_Final8.gltf";



  const handleObjectSelection = (objectName) => {
    onSelectObject(objectName);
    setIsLocked(true);
  };

  const getObjectPosition = useCallback((objectName) => {
    const name = objectName || 'overall';
    if (objectPositions[name]) {
      const { center, radius } = objectPositions[name];
      // For 'overall' (free view), use a closer default zoom
      if (name === 'overall') {
        return {
          target: center,
          position: [center[0], center[1] + radius * 0.5, center[2] + radius * 1.2], // less zoomed out
        };
      }
      return {
        target: center,
        position: [center[0], center[1] + radius * 0.5, center[2] + radius * 1.5],
      };
    }
    // Fallback if positions not ready
    return {
      target: [0, 0, 0],
      position: [0, 10, 20],
    };
  }, [objectPositions]);

  const handlePositionsComputed = useCallback((positions) => {
    setObjectPositions(positions);
  }, []);

  const handleModelError = useCallback((error) => {
    setModelError(error);
  }, []);

  const { target, position } = getObjectPosition(selectedObject);

  // Show error UI outside of Canvas if model fails to load
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
          {modelError.userMessage || 'There was an issue loading the 3D model. This may be due to missing textures or corrupted model files.'}
        </div>
        <button 
          onClick={() => setModelError(null)}
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

  // Camera much closer by default
  const defaultCamera = { position: [0, 20, 40], fov: 75 };

  // Sunlight direction (convert degrees to radians for rotation)
  const sunRotation = new THREE.Euler(
    THREE.MathUtils.degToRad(-202),
    THREE.MathUtils.degToRad(-147),
    THREE.MathUtils.degToRad(149)
  );
  // Sunlight color and exposure
  const sunlightColor = '#ffe2b9';
  const ambientColor = '#ffe2b9';
  const exposure = 0.8; // Brighter exposure

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#191919',
      }}
    >
      <Canvas
        camera={defaultCamera}
        style={{
          background: '#191919',
          width: '100%',
          height: '100%',
        }}
        onError={(error) => {
          console.error('Canvas Error:', error);
          setModelError({ userMessage: 'Canvas initialization failed', originalError: error });
        }}
        gl={{ toneMappingExposure: exposure }}
      >
        {/* Ambient and sunlight setup - increased intensity */}
        <ambientLight intensity={2.5} color={ambientColor} />
        <directionalLight
          color={sunlightColor}
          intensity={2.5}
          position={[0, 50, 50]}
          castShadow
        >
          <primitive object={new THREE.Object3D()} rotation={sunRotation} />
        </directionalLight>
        {/* Optionally add hemisphere light for soft fill */}
        <hemisphereLight intensity={1.2} skyColor={sunlightColor} groundColor="#191919" />

        <Suspense fallback={<Loader />}>
          <Model
            url={modelPath}
            onObjectClick={handleObjectSelection}
            onPositionsComputed={handlePositionsComputed}
            onError={handleModelError}
          />
          <AnimatedControls target={target} position={position} isLocked={isLocked} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Wrap with ErrorBoundary at the highest level
export default function EnhancedThreeDModelViewer(props) {
  return (
    <ErrorBoundary>
      <EnhancedThreeDModelViewerInner {...props} />
    </ErrorBoundary>
  );
}