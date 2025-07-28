import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './SuccessMessage.css';

const SuccessMessage = ({ message = "Success", onClose, duration = 7000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="success-message-overlay">
      <div className="success-message-container">
        <span className="success-message-text">{message}</span>
        <button className="success-message-close" onClick={handleClose}>
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default SuccessMessage; 