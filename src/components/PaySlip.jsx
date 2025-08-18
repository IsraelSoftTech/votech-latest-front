import React from 'react';
import SideTop from './SideTop';
import './PaySlip.css';

export default function PaySlip() {
  return (
    <SideTop>
      <div className="payslip-container">
        <div className="payslip-content">
          <div className="payslip-placeholder">
            <h1>Pay Slip</h1>
            <div className="placeholder-message">
              <p>Yet to be added</p>
              <span className="placeholder-subtitle">
                This feature is currently under development
              </span>
            </div>
          </div>
        </div>
      </div>
    </SideTop>
  );
} 