import React from 'react';
import SideTop from './SideTop';

export default function DscDash() {
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  if (!authUser || authUser.role !== 'Discipline') {
    return <div className="dscdash-unauthorized">Unauthorized</div>;
  }
  return (
    <SideTop>
      <div style={{ padding: 32 }}>
        <h2>Welcome, Discipline Officer</h2>
        <p>Select a menu item to begin.</p>
      </div>
    </SideTop>
  );
} 