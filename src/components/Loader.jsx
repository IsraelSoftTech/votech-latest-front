import React from 'react';
import './Loader.css';

const Loader = ({ poweredBy }) => (
  <div className="loader-root">
    <div className="loader-blocks" aria-label="Loading">
      <div className="loader-box loader-box--1" />
      <div className="loader-box loader-box--2" />
      <div className="loader-box loader-box--3" />
    </div>
    <div className={`loader-powered-by${poweredBy ? ' loader-powered-by--visible' : ''}`}>
      Powered By Izzy Tech Team
    </div>
  </div>
);

export default Loader;
