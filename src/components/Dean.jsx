import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import { FaCalendarAlt, FaUsers, FaClipboardList } from 'react-icons/fa';
import api from '../services/api';

export default function Dean() {
  const [events, setEvents] = useState([]);
  const [staffCount, setStaffCount] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch upcoming events
        const allEvents = await api.getEvents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = allEvents
          .filter(event => {
            const eventDate = new Date(event.event_date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
          })
          .slice(0, 3) // Show only 3 upcoming events
          .map(event => ({
            title: event.title,
            date: new Date(event.event_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            attendees: event.attendees || 0
          }));
        
        setEvents(upcomingEvents);
        // Fetch total users for Staff Members count
        try {
          const users = await api.getUsers();
          const totalUsers = Array.isArray(users)
            ? users.length
            : (users && Array.isArray(users.data) ? users.data.length : 0);
          setStaffCount(totalUsers);
        } catch (e) {
          console.log('Failed to fetch users for staff count', e);
          setStaffCount(0);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <SideTop>
      <div className="dashboard-cards">
        <div className="card" style={{ background: '#eaf3ff' }}>
          <div className="icon"><FaCalendarAlt /></div>
          <div className="count">{loading ? '...' : events.length}</div>
          <div className="desc">Upcoming events</div>
        </div>
        <div className="card" style={{ background: '#204080', color: '#fff' }}>
          <div className="icon" style={{ color: '#fff' }}><FaUsers /></div>
          <div className="count">{loading ? '...' : staffCount}</div>
          <div className="desc">Staff Members</div>
        </div>

      </div>
      <div className="dashboard-section">
        <div style={{ flex: 1 }} className="enrolment-chart">
          <div className="section-title">Upcoming Events</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading events...</div>
          ) : events.length > 0 ? (
            events.map((evt, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{evt.title}</div>
                  <div style={{ color: '#888', fontSize: 14 }}>{evt.date}</div>
                </div>
                <div style={{ fontWeight: 600, color: '#204080', fontSize: 15 }}>{evt.attendees} attendees</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No upcoming events</div>
          )}
        </div>
      </div>
    </SideTop>
  );
} 