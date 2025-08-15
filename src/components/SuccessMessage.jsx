import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimes, FaInfoCircle, FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';
import './SuccessMessage.css';

const SuccessMessage = ({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose, 
  show = false 
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  // Auto-show if message is provided and show is not explicitly set
  useEffect(() => {
    if (message && !show && !isVisible) {
      setIsVisible(true);
      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [message, show, duration, onClose, isVisible]);

  if (!isVisible || !message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle />;
      case 'error':
        return <FaExclamationCircle />;
      case 'warning':
        return <FaExclamationTriangle />;
      case 'info':
        return <FaInfoCircle />;
      default:
        return <FaCheckCircle />;
    }
  };

  const getMessageClass = () => {
    switch (type) {
      case 'success':
        return 'success-message success';
      case 'error':
        return 'success-message error';
      case 'warning':
        return 'success-message warning';
      case 'info':
        return 'success-message info';
      default:
        return 'success-message success';
    }
  };

  return (
    <div className={getMessageClass()}>
      <div className="message-content">
        <div className="message-icon">
          {getIcon()}
        </div>
        <div className="message-text">
          {message}
        </div>
      </div>
      <button 
        className="message-close" 
        onClick={() => {
          setIsVisible(false);
          if (onClose) onClose();
        }}
      >
        <FaTimes />
      </button>
    </div>
  );
};

export default SuccessMessage; 