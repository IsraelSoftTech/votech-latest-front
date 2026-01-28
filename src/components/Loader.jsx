import React, { useEffect } from 'react';
import './Loader.css';

const Loader = ({ poweredBy }) => (
  <div className="loader-root">
    <div className="loader-spinner">
      <div className="spinner-line"></div>
    </div>
    <div className={`loader-powered-by${poweredBy ? ' loader-powered-by--visible' : ''}`}>Powered By Izzy Tech Team</div>
  </div>
);

export default Loader;