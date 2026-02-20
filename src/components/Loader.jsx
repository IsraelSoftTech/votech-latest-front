import React from 'react';
import './Loader.css';

const Loader = ({ poweredBy }) => (
  <div className="loader-root">
    <div className="loader-blocks" aria-label="Loading">
      <div className="loader-block loader-block--1" />
      <div className="loader-block loader-block--2" />
      <div className="loader-block loader-block--3" />
      <div className="loader-block loader-block--4" />
      <div className="loader-block loader-block--5" />
    </div>
    <div className={`loader-powered-by${poweredBy ? ' loader-powered-by--visible' : ''}`}>
      Powered By Izzy Tech Team
    </div>
  </div>
);

export default Loader;
