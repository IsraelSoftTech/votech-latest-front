import React, { useEffect } from 'react';
import './Loader.css';

const Loader = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="loader-root">
      <div className="dot dot-blue"></div>
      <div className="dot dot-darkblue"></div>
      <div className="dot dot-orange"></div>
    </div>
  );
};

export default Loader; 