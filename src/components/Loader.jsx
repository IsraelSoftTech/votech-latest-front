import React, { useEffect } from 'react';
import './Loader.css';

const Loader = ({ poweredBy }) => (
  <div className="loader-root">
    <div className="loader-spinner">
      <div className="spinner-ring ring-blue"></div>
      <div className="spinner-ring ring-darkblue"></div>
      <div className="spinner-ring ring-orange"></div>
    </div>
    <div className={`loader-powered-by${poweredBy ? ' loader-powered-by--visible' : ''}`}>By Izzy Tech Team</div>
  </div>
);

export default Loader;