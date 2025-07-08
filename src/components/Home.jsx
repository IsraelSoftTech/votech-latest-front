import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import bgImg from '../assets/home-pic.jpg';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="mpasat-home-root">
      <header className="mpasat-home-header">
        <div className="mpasat-home-logo-title">
          <img src={logo} alt="MPASAT Logo" className="mpasat-home-logo" />
          <span className="mpasat-home-title">
            <span className="mpasat-home-title-full">Mbakwa Phosphate Academy of Science, Arts and Technology</span>
            <span className="mpasat-home-title-short">MPASAT</span>
          </span>
        </div>
        <nav className="mpasat-home-nav">
          <span className="mpasat-home-nav-item active">Home</span>
          <span className="mpasat-home-nav-item" onClick={() => navigate('/login')}>Get Started</span>
        </nav>
      </header>
      <main className="mpasat-home-main" style={{ backgroundImage: `url(${bgImg})` }}>
        <div className="mpasat-home-overlay">
          <div className="mpasat-home-welcome">
            <h1 className="mpasat-home-welcome-title">Welcome to MPASAT</h1>
            <p className="mpasat-home-welcome-desc">
              Merging theory and practice - changing Cameroon and the world at large.
            </p>
            <button className="mpasat-home-register-btn" onClick={() => navigate('/login')}>
              Register Now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home; 