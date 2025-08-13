import React, { useState, useEffect } from 'react';
import './UserEvents.css';
import SideTop from './SideTop';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FaCalendarAlt, FaClock, FaUsers, FaUser, FaInfoCircle, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';

export default function UserEvents({ wrap = true }) {
  const authUser = JSON.parse(sessionStorage.getItem('authUser')) || {};
  const isAdminRole = ['Admin1', 'Admin2', 'Admin3', 'Admin4', 'Discipline'].includes(authUser.role);

  // Debug logging for authUser
  console.log('SessionStorage authUser:', sessionStorage.getItem('authUser'));
  console.log('Parsed authUser:', authUser);
  console.log('Is Admin Role:', isAdminRole);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });

  // Create/Edit event modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [form, setForm] = useState({ type: 'Meeting', date: '', time: '', title: '', description: '' });
  const [formError, setFormError] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);

  // Success message state
  const [successMessage, setSuccessMessage] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  const showMessage = (message, type = 'success') => {
    setSuccessMessage({ show: true, message, type });
  };

  const hideMessage = () => {
    setSuccessMessage({ show: false, message: '', type: 'success' });
  };

  const loadUsers = async () => {
    try {
      if (isAdminRole) {
        const usersData = await api.getAllUsersForChat();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const data = isAdminRole ? await api.getEvents() : await api.getMyEvents();
      setEvents(data);
      
      // Debug logging for Admin4 events
      if (isAdminRole) {
        console.log('Current user:', authUser);
        console.log('All events:', data);
        data.forEach(event => {
          console.log(`Event "${event.title}" - created_by: ${event.created_by} (${typeof event.created_by}), current user: ${authUser.id} (${typeof authUser.id})`);
        });
      }
      
      // Calculate stats
      const now = new Date();
      const upcoming = data.filter(event => new Date(event.event_date) >= now).length;
      const past = data.filter(event => new Date(event.event_date) < now).length;
      
      setStats({
        total: data.length,
        upcoming,
        past
      });
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter(event => event.event_date === dateStr);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayEvents = getEventsForDate(date);
      if (dayEvents.length > 0) {
        return (
          <div className="calendar-event-indicator">
            <div className="event-dot user-event"></div>
            {dayEvents.length > 1 && (
              <span className="event-count">{dayEvents.length}</span>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isEventUpcoming = (eventDate) => {
    return new Date(eventDate) >= new Date();
  };

  const upcomingEvents = events.filter(event => isEventUpcoming(event.event_date));
  const pastEvents = events.filter(event => !isEventUpcoming(event.event_date));

  // Create event handlers (Admin roles only)
  const openCreateForDate = (date) => {
    if (!isAdminRole) return;
    setModalDate(date);
    setForm({ type: 'Meeting', date: date.toISOString().slice(0, 10), time: '', title: '', description: '' });
    setSelectedParticipants([]);
    setShowCreate(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleParticipantToggle = (userId, username) => {
    setSelectedParticipants(prev => {
      const isSelected = prev.some(p => p.id === userId);
      if (isSelected) {
        return prev.filter(p => p.id !== userId);
      } else {
        return [...prev, { id: userId, username }];
      }
    });
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!form.title || !form.time || !form.description) {
      setFormError('Title, time, and description are required.');
      return;
    }

    try {
      const eventData = {
        event_type: form.type,
        title: form.title,
        description: form.description,
        event_date: form.date,
        event_time: form.time,
        participants: selectedParticipants.map(p => p.username).join(', ')
      };

      await api.createEvent(eventData);
      setShowCreate(false);
      setForm({ type: 'Meeting', date: '', time: '', title: '', description: '' });
      setSelectedParticipants([]);
      await loadEvents();
      showMessage('Event created successfully!');
      
      // Dispatch custom event to update notification count
      window.dispatchEvent(new CustomEvent('eventCreated'));
    } catch (error) {
      console.error('Error creating event:', error);
      if (error.message.includes('already exists on this date')) {
        setFormError('An event already exists on this date. Please choose another date.');
      } else {
        setFormError('Failed to create event. Please try again.');
      }
    }
  };

  // Edit event handlers
  const openEditModal = (event) => {
    if (!isAdminRole) return;
    setEditingEvent(event);
    setForm({
      type: event.event_type,
      date: event.event_date,
      time: event.event_time,
      title: event.title,
      description: event.description || ''
    });
    
    // Set participants
    if (event.participants) {
      const participantNames = event.participants.split(', ').filter(p => p.trim());
      const selectedUsers = users.filter(user => participantNames.includes(user.username));
      setSelectedParticipants(selectedUsers);
    } else {
      setSelectedParticipants([]);
    }
    
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!form.title || !form.time || !form.description) {
      setFormError('Title, time, and description are required.');
      return;
    }

    try {
      const eventData = {
        event_type: form.type,
        title: form.title,
        description: form.description,
        event_date: form.date,
        event_time: form.time,
        participants: selectedParticipants.map(p => p.username).join(', ')
      };

      await api.updateEvent(editingEvent.id, eventData);
      setShowEdit(false);
      setEditingEvent(null);
      setForm({ type: 'Meeting', date: '', time: '', title: '', description: '' });
      setSelectedParticipants([]);
      await loadEvents();
      showMessage('Event updated successfully!');
      
      // Dispatch custom event to update notification count
      window.dispatchEvent(new CustomEvent('eventUpdated'));
    } catch (error) {
      console.error('Error updating event:', error);
      setFormError('Failed to update event. Please try again.');
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (eventId) => {
    if (!isAdminRole) return;
    
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await api.deleteEvent(eventId);
        await loadEvents();
        showMessage('Event deleted successfully!');
        
        // Dispatch custom event to update notification count
        window.dispatchEvent(new CustomEvent('eventDeleted'));
      } catch (error) {
        console.error('Error deleting event:', error);
        showMessage('Failed to delete event. Please try again.', 'error');
      }
    }
  };

  const content = (
    <div className="user-events-container">
      <div className="user-events-header">
        <h1>{isAdminRole ? 'Events Management' : 'My Events'}</h1>
        <p>{isAdminRole ? 'Create, view, and manage all events' : 'View events you are participating in'}</p>
      </div>

      {/* Stats Cards */}
      <div className="user-events-stats">
        <div className="stat-card total">
          <div className="stat-icon"><FaCalendarAlt /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Events</div>
          </div>
        </div>
        <div className="stat-card upcoming">
          <div className="stat-icon"><FaClock /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.upcoming}</div>
            <div className="stat-label">Upcoming</div>
          </div>
        </div>
        <div className="stat-card past">
          <div className="stat-icon"><FaInfoCircle /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.past}</div>
            <div className="stat-label">Past Events</div>
          </div>
        </div>
      </div>

      <div className="user-events-content">
        {/* Calendar Section */}
        <div className="calendar-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Event Calendar</h2>
            {isAdminRole && (
              <button 
                onClick={() => { 
                  setShowCreate(true); 
                  setModalDate(new Date()); 
                  setForm(f => ({ ...f, date: new Date().toISOString().slice(0, 10) })); 
                  setSelectedParticipants([]); 
                }}
                style={{ 
                  background: '#204080', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 6, 
                  padding: '10px 16px', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8 
                }}
              >
                <FaPlus /> Create Event
              </button>
            )}
          </div>
          <div className="calendar-wrapper">
            <Calendar 
              tileContent={tileContent}
              className="user-events-calendar"
              onClickDay={openCreateForDate}
            />
          </div>
          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-dot user-event"></div>
              <span>Events</span>
            </div>
          </div>
        </div>

        {/* Events Lists */}
        <div className="events-lists">
          {/* Upcoming Events */}
          <div className="events-section">
            <h2>{isAdminRole ? 'All Upcoming Events' : 'Upcoming Events'} ({upcomingEvents.length})</h2>
            {loading ? (
              <div className="loading">Loading events...</div>
            ) : upcomingEvents.length > 0 ? (
              <div className="events-grid">
                {upcomingEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="event-card upcoming"
                  >
                    <div className="event-header">
                      <span className="event-type">{event.event_type}</span>
                      <span className="event-date">{formatDate(event.event_date)}</span>
                    </div>
                    <div className="event-title" onClick={() => handleEventClick(event)} style={{ cursor: 'pointer' }}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                    <div className="event-details">
                      <div className="event-time">
                        <FaClock /> {formatTime(event.event_time)}
                      </div>
                      <div className="event-creator">
                        <FaUser /> Created by {event.created_by_name}
                      </div>
                    </div>
                    
                    {/* Action Buttons for Creator */}
                    {isAdminRole && (() => {
                      const eventCreatorId = parseInt(event.created_by);
                      const currentUserId = parseInt(authUser.id);
                      const shouldShow = eventCreatorId === currentUserId;
                      
                      // Debug logging for this specific event
                      console.log(`Event "${event.title}":`, {
                        eventCreatorId,
                        currentUserId,
                        shouldShow,
                        eventCreatedBy: event.created_by,
                        authUserId: authUser.id
                      });
                      
                      return shouldShow ? (
                        <div className="event-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(event)}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-events">No upcoming events</div>
            )}
          </div>

          {/* Past Events */}
          <div className="events-section">
            <h2>{isAdminRole ? 'All Past Events' : 'Past Events'} ({pastEvents.length})</h2>
            {loading ? (
              <div className="loading">Loading events...</div>
            ) : pastEvents.length > 0 ? (
              <div className="events-grid">
                {pastEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="event-card past"
                  >
                    <div className="event-header">
                      <span className="event-type">{event.event_type}</span>
                      <span className="event-date">{formatDate(event.event_date)}</span>
                    </div>
                    <div className="event-title" onClick={() => handleEventClick(event)} style={{ cursor: 'pointer' }}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                    <div className="event-details">
                      <div className="event-time">
                        <FaClock /> {formatTime(event.event_time)}
                      </div>
                      <div className="event-creator">
                        <FaUser /> Created by {event.created_by_name}
                      </div>
                    </div>
                    
                    {/* Action Buttons for Creator */}
                    {isAdminRole && (() => {
                      const eventCreatorId = parseInt(event.created_by);
                      const currentUserId = parseInt(authUser.id);
                      const shouldShow = eventCreatorId === currentUserId;
                      
                      // Debug logging for this specific event
                      console.log(`Event "${event.title}":`, {
                        eventCreatorId,
                        currentUserId,
                        shouldShow,
                        eventCreatedBy: event.created_by,
                        authUserId: authUser.id
                      });
                      
                      return shouldShow ? (
                        <div className="event-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(event)}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-events">No past events</div>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="event-modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="event-modal-close" 
              onClick={() => setShowEventModal(false)}
            >
              &times;
            </button>
            
            <div className="event-modal-header">
              <div className="event-modal-type">{selectedEvent.event_type}</div>
              <div className="event-modal-date">{formatDate(selectedEvent.event_date)}</div>
            </div>
            
            <h2 className="event-modal-title">{selectedEvent.title}</h2>
            
            {selectedEvent.description && (
              <div className="event-modal-description">
                <h3>Description</h3>
                <p>{selectedEvent.description}</p>
              </div>
            )}
            
            <div className="event-modal-details">
              <div className="detail-item">
                <FaClock />
                <span>Time: {formatTime(selectedEvent.event_time)}</span>
              </div>
              <div className="detail-item">
                <FaUser />
                <span>Created by: {selectedEvent.created_by_name}</span>
              </div>
              {selectedEvent.participants && (
                <div className="detail-item">
                  <FaUsers />
                  <span>Participants: {selectedEvent.participants}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal (Admin roles only) */}
      {isAdminRole && showCreate && (
        <div className="event-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="event-modal-content" onClick={e => e.stopPropagation()}>
            <button className="event-modal-close" onClick={() => setShowCreate(false)}>&times;</button>
            <div className="event-modal-header">
              <div className="event-modal-type">Create Event</div>
              <div className="event-modal-date">{modalDate ? modalDate.toLocaleDateString() : form.date}</div>
            </div>
            <form onSubmit={submitCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select name="type" value={form.type} onChange={handleFormChange} style={{ flex: '1 1 120px', minWidth: '120px', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }}>
                  <option value="Meeting">Meeting</option>
                  <option value="Class">Class</option>
                  <option value="Others">Others</option>
                </select>
                <input type="date" name="date" value={form.date} onChange={handleFormChange} style={{ flex: '1 1 120px', minWidth: '120px', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input type="time" name="time" value={form.time} onChange={handleFormChange} style={{ flex: '1 1 120px', minWidth: '120px', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
              </div>
              <input type="text" name="title" value={form.title} onChange={handleFormChange} placeholder="Title" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
              <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Description" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15, minHeight: 60, resize: 'vertical' }} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Select Participants:</label>
                <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, background: '#f9fafb', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
                  {users.map(user => (
                    <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 4, background: '#fff', cursor: 'pointer', border: '1px solid #e5e7eb', fontSize: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedParticipants.some(p => p.id === user.id)} 
                        onChange={() => handleParticipantToggle(user.id, user.username)} 
                        style={{ width: 14, height: 14, accentColor: '#204080' }} 
                      />
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formError && <div style={{ color: '#e53e3e', fontSize: 14 }}>{formError}</div>}
              <button type="submit" style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 0', fontSize: 16, fontWeight: 600, marginTop: 4 }}>Create Event</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal (Admin roles only) */}
      {isAdminRole && showEdit && editingEvent && (
        <div className="event-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="event-modal-content" onClick={e => e.stopPropagation()}>
            <button className="event-modal-close" onClick={() => setShowEdit(false)}>&times;</button>
            <div className="event-modal-header">
              <div className="event-modal-type">Edit Event</div>
              <div className="event-modal-date">{formatDate(editingEvent.event_date)}</div>
            </div>
            <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select name="type" value={form.type} onChange={handleFormChange} style={{ flex: '1 1 120px', minWidth: '120px', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }}>
                  <option value="Meeting">Meeting</option>
                  <option value="Class">Class</option>
                  <option value="Others">Others</option>
                </select>
                <input type="date" name="date" value={form.date} onChange={handleFormChange} style={{ flex: '1 1 120px', minWidth: '120px', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input type="time" name="time" value={form.time} onChange={handleFormChange} style={{ flex: '1 1 120px', minWidth: '120px', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
              </div>
              <input type="text" name="title" value={form.title} onChange={handleFormChange} placeholder="Title" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
              <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Description" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15, minHeight: 60, resize: 'vertical' }} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Select Participants:</label>
                <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, background: '#f9fafb', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
                  {users.map(user => (
                    <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 4, background: '#fff', cursor: 'pointer', border: '1px solid #e5e7eb', fontSize: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedParticipants.some(p => p.id === user.id)} 
                        onChange={() => handleParticipantToggle(user.id, user.username)} 
                        style={{ width: 14, height: 14, accentColor: '#204080' }} 
                      />
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formError && <div style={{ color: '#e53e3e', fontSize: 14 }}>{formError}</div>}
              <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 0', fontSize: 16, fontWeight: 600, marginTop: 4 }}>Update Event</button>
            </form>
          </div>
        </div>
      )}
      <SuccessMessage 
        show={successMessage.show} 
        message={successMessage.message} 
        type={successMessage.type} 
        onClose={hideMessage} 
      />
    </div>
  );

  return wrap ? (
    <SideTop>
      {content}
    </SideTop>
  ) : content;
} 