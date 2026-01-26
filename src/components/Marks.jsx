import React from 'react';
import SideTop from './SideTop';
import './Marks.css';

export default function Marks() {
  return (
    <SideTop>
      <div className="marks-container">
        <div className="marks-content">
          <h2>Marks Management</h2>
          <div className="yet-to-be-added">
            <p>Yet to be added</p>
          </div>
        </div>
      </div>
    </SideTop>
  );
} 