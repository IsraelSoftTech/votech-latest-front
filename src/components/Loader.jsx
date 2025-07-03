import React from 'react';
import './Loader.css';

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="cube-loader">
        <div className="cubes">
          <div className="cube cube1"></div>
          <div className="cube cube2"></div>
          <div className="cube cube3"></div>
        </div>
        <div className="loader-text">MPASAT</div>
      </div>
    </div>
  );
};

export default Loader; 