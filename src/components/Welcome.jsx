import React from 'react';
import './Welcome.css';
import { FaArrowRight } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import buildingImg from '../assets/home.jpg';
import logo from '../assets/logo.png';

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const role = params.get('role');
  return (
    <div className="welcome-exact-root">
      <header className="welcome-header">
        <div className="header-left">
          <img src={logo} alt="VOLTECH Logo" className="header-logo" />
          <span className="header-voltech">VOLTECH</span>
        </div>
        <button className="footer-arrow-btn header-arrow-btn" onClick={() => navigate('/signin')}>
          <FaArrowRight />
        </button>
      </header>
      <main className="welcome-main-img">
        <div className="welcome-text-overlay">
          {role ? `Welcome to ${role} dashboard` : 'WELCOME TO VOLTECH MANAGEMENT SYSTEM'}
        </div>
        <img src={buildingImg} alt="Main" />
      </main>
      <footer className="welcome-footer">
        <button className="footer-arrow-btn footer-arrow-desktop" onClick={() => navigate('/signin')}>
          <FaArrowRight />
        </button>
      </footer>
    </div>
  );
};

export default Welcome; 