import { useEffect, useRef } from 'react';

// Global interval manager to prevent multiple intervals
const globalIntervals = new Map();

const useOptimizedIntervals = () => {
  const intervalsRef = useRef(new Set());

  // Cleanup function
  const cleanup = () => {
    intervalsRef.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    intervalsRef.current.clear();
  };

  // Optimized setInterval that prevents duplicates
  const setOptimizedInterval = (key, callback, delay) => {
    // Clear existing interval with same key
    if (globalIntervals.has(key)) {
      clearInterval(globalIntervals.get(key));
    }

    const intervalId = setInterval(callback, delay);
    globalIntervals.set(key, intervalId);
    intervalsRef.current.add(intervalId);
    
    return intervalId;
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return { setOptimizedInterval, cleanup };
};

export default useOptimizedIntervals;
