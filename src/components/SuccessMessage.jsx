import React from 'react';
import './SuccessMessage.css';

export default function SuccessMessage({ message, onClose, status }) {
  if (!message && !status) return null;

  const normalize = (text) => (text || '').toString().toLowerCase();
  const deriveIsSuccess = () => {
    if (status) return status === 'success';
    const t = normalize(message);
    if (!t) return true;
    // If it mentions success and not explicitly negated, treat as success
    if (t.includes('success') && !t.includes('not')) return true;
    // Common failure indicators
    const failureHints = ['fail', 'error', 'denied', 'rejected', 'unable', 'invalid', 'not'];
    return !failureHints.some(h => t.includes(h)) ? true : false;
  };

  const isSuccess = deriveIsSuccess();
  const displayText = isSuccess ? 'Success' : 'not successful';

  return (
    <div className={`sm-wrapper ${isSuccess ? 'sm-success' : 'sm-error'}`}>
      <div className="sm-card">
        <div className="sm-text">{displayText}</div>
        {onClose && (
          <button className="sm-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
    </div>
  );
} 