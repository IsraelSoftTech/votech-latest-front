import React, { useState } from 'react';
import './DeanEvent.css';
import SideTop from './SideTop';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function DeanEvent() {
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateClick = date => {
    setSelectedDate(date);
    setShowModal(true);
  };

  return (
    <SideTop>
      <div className="dean-event-container">
        <h2>Events</h2>
        <div className="dean-event-cards">
          <div className="dean-event-card total">
            <div className="dean-event-card-title">Total Events</div>
            <div className="dean-event-card-value">0</div>
          </div>
          <div className="dean-event-card upcoming">
            <div className="dean-event-card-title">Upcoming Events</div>
            <div className="dean-event-card-value">0</div>
          </div>
        </div>
        <div className="dean-event-calendar-wrapper">
          <Calendar onClickDay={handleDateClick} />
        </div>
        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(32,64,128,0.18)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#fff', borderRadius: 14, maxWidth: 420, width: '95vw', padding: 24, boxShadow: '0 4px 32px rgba(32,64,128,0.13)', position: 'relative', minHeight: 180 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#204080', cursor: 'pointer' }}>&times;</button>
              <div style={{ fontWeight: 600, fontSize: 18, color: '#204080', marginBottom: 10 }}>
                Create Event
              </div>
              <form style={{ marginTop: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input name="type" placeholder="Type (e.g. Meeting)" style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} />
                  <input name="title" placeholder="Title" style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} />
                </div>
                <textarea name="description" placeholder="Description" style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15, minHeight: 40 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input name="date" type="date" value={selectedDate ? selectedDate.toISOString().slice(0, 10) : ''} readOnly style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} />
                  <input name="time" type="time" style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} />
                </div>
                <input name="participants" placeholder="Participants (comma separated usernames)" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} />
                <button type="button" className="dean-event-create-btn" style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontSize: 16, fontWeight: 600, marginTop: 4 }}>Create</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 