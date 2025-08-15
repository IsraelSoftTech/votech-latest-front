import React from 'react';
import './MessageIcon.css';

const MessageIcon = ({ count = 0, onClick, className = '' }) => {
  return (
    <div 
      className={`custom-message-icon ${className}`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Main blue circle background */}
      <div className="message-background">
        {/* White message/envelope icon */}
        <svg 
          className="message-icon" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Envelope body */}
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
        
        {/* Unread message badge */}
        {count > 0 && (
          <div className="message-badge">
            <span className="badge-number">{count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageIcon; 