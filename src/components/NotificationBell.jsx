import React from 'react';
import './NotificationBell.css';

const NotificationBell = ({ count = 0, onClick, className = '' }) => {
  return (
    <div 
      className={`custom-notification-bell ${className}`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Main blue circle background */}
      <div className="bell-background">
        {/* White bell icon */}
        <svg 
          className="bell-icon" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bell body */}
          <path d="M12 2C8.13 2 5 5.13 5 9v3.5c0 1.1-.45 2.1-1.17 2.83C2.61 16.61 2 17.7 2 19c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2 0-1.3-.61-2.39-1.83-3.67C19.45 15.1 19 14.1 19 12.5V9c0-3.87-3.13-7-7-7z"/>
          {/* Bell clapper/tongue */}
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/>
        </svg>
        
        {/* Notification badge */}
        {count > 0 && (
          <div className="notification-badge">
            <span className="badge-number">{count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationBell; 