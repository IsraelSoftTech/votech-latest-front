import React, { useState, useEffect } from 'react';
import './Welcome.css';

function Welcome({ onComplete }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Start fade in
    setTimeout(() => setOpacity(1), 100);

    // After 10 seconds, trigger the completion callback
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(onComplete, 1000); // Wait for fade out before completing
    }, 10000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="welcome-screen" style={{ opacity }}>
      <h1>WELCOME</h1>
    </div>
  );
}

export default Welcome; 