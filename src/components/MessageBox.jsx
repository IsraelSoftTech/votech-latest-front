import React from 'react';
import './MessageBox.css';

export default function MessageBox({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info', 
  onConfirm = null,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false 
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="message-box-overlay">
      <div className={`message-box message-box-${type}`}>
        <div className="message-box-header">
          <h3 className="message-box-title">{title}</h3>
          <button className="message-box-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="message-box-body">
          <p className="message-box-message">{message}</p>
        </div>
        
        <div className="message-box-footer">
          {showCancel && (
            <button 
              className="message-box-btn message-box-cancel-btn"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          )}
          <button 
            className="message-box-btn message-box-confirm-btn"
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
} 