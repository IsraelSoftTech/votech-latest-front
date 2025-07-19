import React from 'react';

const SuccessMessage = ({ message }) => (
  <div style={{
    position: 'fixed',
    top: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    background: '#fff',
    color: '#1a7f37',
    boxShadow: '0 6px 32px rgba(32,64,128,0.13)',
    border: '1px solid #b7e0c2',
    padding: '14px 32px',
    borderRadius: 10,
    fontWeight: 600,
    textAlign: 'center',
    minWidth: 220,
    maxWidth: '90vw',
    fontSize: 16,
    letterSpacing: 0.2,
    transition: 'all 0.3s',
    boxSizing: 'border-box',
  }}>
    {message}
  </div>
);

export default SuccessMessage; 