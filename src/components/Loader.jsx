
import React, { useEffect } from 'react';
import './Loader.css';

const Loader = ({ poweredBy }) => (
  <div className="loader-root">
    <div className="loader-dots">
      <span className="dot dot-blue"></span>
      <span className="dot dot-darkblue"></span>
      <span className="dot dot-orange"></span>
    </div>
    <div className={`loader-powered-by${poweredBy ? ' loader-powered-by--visible' : ''}`}>Powered by Izzy Tech Team...</div>
  </div>
);

export default Loader; 