import React, { useState } from 'react';
import SideTop from './SideTop';
import { FaCalendarAlt, FaUsers, FaBoxes, FaTasks } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dean() {
  // Placeholder data
  const events = [
    { title: 'Parent-Teacher Meeting', date: 'Dec 20, 2024 at 10:00 AM', attendees: 150 },
    { title: 'Staff Training Workshop', date: 'Dec 22, 2024 at 2:00 PM', attendees: 25 },
    { title: 'Year-End Celebration', date: 'Dec 25, 2024 at 6:00 PM', attendees: 500 },
  ];
  // Enrollment chart data (example, monthly)
  const enrollmentData = [
    { month: 'Jan', value: 11 },
    { month: 'Feb', value: 10 },
    { month: 'Mar', value: 8 },
    { month: 'Apr', value: 6 },
    { month: 'May', value: 13 },
    { month: 'Jun', value: 17 },
    { month: 'Jul', value: 3 },
    { month: 'Aug', value: 17 },
    { month: 'Sep', value: 16 },
    { month: 'Oct', value: 12 },
    { month: 'Nov', value: 9 },
    { month: 'Dec', value: 12 },
  ];
  return (
    <SideTop>
      <div className="dashboard-cards">
        <div className="card" style={{ background: '#eaf3ff' }}>
          <div className="icon"><FaCalendarAlt /></div>
          <div className="count">8</div>
          <div className="desc">Upcoming events</div>
        </div>
        <div className="card" style={{ background: '#204080', color: '#fff' }}>
          <div className="icon" style={{ color: '#fff' }}><FaUsers /></div>
          <div className="count">47</div>
          <div className="desc">Staff Members</div>
        </div>
        <div className="card" style={{ background: '#388e3c', color: '#fff' }}>
          <div className="icon"><FaBoxes /></div>
          <div className="count">89%</div>
          <div className="desc">Inventory Status</div>
        </div>
        <div className="card" style={{ background: '#1b3a4b', color: '#fff' }}>
          <div className="icon"><FaTasks /></div>
          <div className="count">12</div>
          <div className="desc">Scheduled Tasks</div>
        </div>
      </div>
      <div className="dashboard-section">
        <div style={{ flex: 2 }} className="enrolment-chart">
          <div className="section-title">Upcoming Events</div>
          {events.map(evt => (
            <div key={evt.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{evt.title}</div>
                <div style={{ color: '#888', fontSize: 14 }}>{evt.date}</div>
              </div>
              <div style={{ fontWeight: 600, color: '#204080', fontSize: 15 }}>{evt.attendees} attendees</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} className="enrolment-chart">
          <div className="section-title">Students Enrollment</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={enrollmentData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDean" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#204080" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#204080" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#204080" fillOpacity={1} fill="url(#colorDean)" name="Enrollment" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="enrolment-info">50 enrollment this month</div>
        </div>
      </div>
    </SideTop>
  );
} 