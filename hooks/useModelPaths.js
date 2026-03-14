import { useState, useEffect } from 'react';

export function useModelPaths() {
  const [modelPaths, setModelPaths] = useState({
    resortMap: '/models/WholeMap_12.glb',
    interiors: {
      Teepee: '/models/Interior_Teepee.glb',
      Villa: '/models/Interior_Villa.glb',
      Loft: '/models/Interior_Loft.glb'
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModelPaths = async () => {
      try {
        const response = await fetch('/api/models/paths');
        if (response.ok) {
          const data = await response.json();
          setModelPaths(data);
        } else {
          console.warn('Failed to fetch model paths, using defaults');
        }
      } catch (err) {
        console.error('Error fetching model paths:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModelPaths();
  }, []);

  return { modelPaths, loading, error };
}
