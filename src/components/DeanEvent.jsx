import React, { useState, useEffect } from 'react';
import './DeanEvent.css';
import SideTop from './SideTop';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FaEdit, FaTrash } from 'react-icons/fa';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';

export default function DeanEvent() {
  const authUser = JSON.parse(sessionStorage.getItem('authUser')) || {};
  const isAdminRole = ['Admin1', 'Admin2', 'Admin3', 'Admin4', 'Discipline'].includes(authUser.role);

  // Debug logging for authUser
  console.log('DeanEvent - SessionStorage authUser:', sessionStorage.getItem('authUser'));
  console.log('DeanEvent - Parsed authUser:', authUser);
  console.log('DeanEvent - Is Admin Role:', isAdminRole);

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    time: '',
    participants: ''
  });

  // Edit/Delete modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    type: '',
    title: '',
    description: '',
    time: '',
    participants: ''
  });

  // Success message state
  const [successMessage, setSuccessMessage] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadEvents();
    loadStats();
    loadUsers();
  }, []);

  const showMessage = (message, type = 'success') => {
    setSuccessMessage({ show: true, message, type });
  };

  const hideMessage = () => {
    setSuccessMessage({ show: false, message: '', type: 'success' });
  };

  const loadEvents = async () => {
    try {
      const eventsData = await api.getEvents();
      setEvents(eventsData);
      
      // Debug logging for events
      if (isAdminRole) {
        console.log('DeanEvent - Current user:', authUser);
        console.log('DeanEvent - All events:', eventsData);
        eventsData.forEach(event => {
          console.log(`DeanEvent - Event "${event.title}" - created_by: ${event.created_by} (${typeof event.created_by}), current user: ${authUser.id} (${typeof authUser.id})`);
        });
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await api.getEventStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await api.getAllUsersForChat();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDateClick = date => {
    setSelectedDate(date);
    setFormData({
      type: '',
      title: '',
      description: '',
      time: '',
      participants: ''
    });
    setSelectedParticipants([]);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (e) => {
    const { value } = e.target;
    setSelectedDate(new Date(value));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.type || !formData.title || !formData.time) {
      showMessage('Please fill in all required fields (Type, Title, and Time)', 'error');
      return;
    }

    try {
      const eventData = {
        event_type: formData.type,
        title: formData.title,
        description: formData.description,
        event_date: selectedDate.toISOString().slice(0, 10),
        event_time: formData.time,
        participants: selectedParticipants.map(p => p.username).join(', ')
      };

      await api.createEvent(eventData);
      setShowModal(false);
      setFormData({
        type: '',
        title: '',
        description: '',
        time: '',
        participants: ''
      });
      setSelectedParticipants([]);
      
      // Reload events and stats
      await loadEvents();
      await loadStats();
      
      showMessage('Event created successfully!');
      
      // Dispatch custom event to update notification count
      window.dispatchEvent(new CustomEvent('eventCreated'));
    } catch (error) {
      console.error('Error creating event:', error);
      if (error.message.includes('already exists on this date')) {
        showMessage('An event already exists on this date. Please select a different date or modify the existing event.', 'error');
      } else {
        showMessage('Failed to create event. Please try again.', 'error');
      }
    }
  };

  // Edit event handlers
  const openEditModal = (event) => {
    if (!isAdminRole) return;
    
    setEditingEvent(event);
    setEditFormData({
      type: event.event_type,
      title: event.title,
      description: event.description || '',
      time: event.event_time,
      participants: event.participants || ''
    });
    
    // Set participants
    if (event.participants) {
      const participantNames = event.participants.split(', ').filter(p => p.trim());
      const selectedUsers = users.filter(user => participantNames.includes(user.username));
      setSelectedParticipants(selectedUsers);
    } else {
      setSelectedParticipants([]);
    }
    
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editFormData.type || !editFormData.title || !editFormData.time) {
      showMessage('Please fill in all required fields (Type, Title, and Time)', 'error');
      return;
    }

    try {
      const eventData = {
        event_type: editFormData.type,
        title: editFormData.title,
        description: editFormData.description,
        event_date: editingEvent.event_date,
        event_time: editFormData.time,
        participants: selectedParticipants.map(p => p.username).join(', ')
      };

      await api.updateEvent(editingEvent.id, eventData);
      
      // Reload events and stats
      await loadEvents();
      await loadStats();
      
      setShowEditModal(false);
      setEditingEvent(null);
      setEditFormData({
        type: '',
        title: '',
        description: '',
        time: '',
        participants: ''
      });
      setSelectedParticipants([]);
      
      showMessage('Event updated successfully!');
      
      // Dispatch custom event to update notification count
      window.dispatchEvent(new CustomEvent('eventUpdated'));
    } catch (error) {
      console.error('Error updating event:', error);
      showMessage('Failed to update event. Please try again.', 'error');
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (eventId) => {
    if (!isAdminRole) return;
    
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await api.deleteEvent(eventId);
        
        // Reload events and stats
        await loadEvents();
        await loadStats();
        
        showMessage('Event deleted successfully!');
        
        // Dispatch custom event to update notification count
        window.dispatchEvent(new CustomEvent('eventDeleted'));
      } catch (error) {
        console.error('Error deleting event:', error);
        showMessage('Failed to delete event. Please try again.', 'error');
      }
    }
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
            <div className="event-dot"></div>
            {dayEvents.length > 1 && <span className="event-count">{dayEvents.length}</span>}
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

  return (
    <SideTop>
      <div className="dean-event-container">
        <h2>Events</h2>
        <div className="dean-event-cards">
          <div className="dean-event-card total">
            <div className="dean-event-card-title">Total Events</div>
            <div className="dean-event-card-value">{stats.total}</div>
          </div>
          <div className="dean-event-card upcoming">
            <div className="dean-event-card-title">Upcoming Events</div>
            <div className="dean-event-card-value">{stats.upcoming}</div>
          </div>
        </div>
        <div className="dean-event-calendar-wrapper">
          <Calendar 
            onClickDay={handleDateClick} 
            tileContent={tileContent}
            className="dean-event-calendar"
          />
        </div>
        
        {/* Events List */}
        <div className="events-list-section">
          <h3>Recent Events</h3>
          {loading ? (
            <div className="loading">Loading events...</div>
          ) : events.length > 0 ? (
            <div className="events-list">
              {events.slice(0, 10).map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-header">
                    <span className="event-type">{event.event_type}</span>
                    <span className="event-date">{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                  <div className="event-title">{event.title}</div>
                  {event.description && <div className="event-description">{event.description}</div>}
                  <div className="event-details">
                    <span className="event-time">{formatTime(event.event_time)}</span>
                    {event.participants && <span className="event-participants">Participants: {event.participants}</span>}
                  </div>
                  
                  {/* Action Buttons for Creator */}
                  {isAdminRole && (() => {
                    const eventCreatorId = parseInt(event.created_by);
                    const currentUserId = parseInt(authUser.id);
                    const shouldShow = eventCreatorId === currentUserId;
                    
                    // Debug logging for this specific event
                    console.log(`DeanEvent - Event "${event.title}":`, {
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
            <div className="no-events">No events found. Click on a date to create an event.</div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button 
                className="modal-close" 
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
              <div className="modal-title">
                Create Event
              </div>
              <form onSubmit={handleSubmit} className="event-form">
                <div className="form-row">
                  <select 
                    name="type" 
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="event-select"
                  >
                    <option value="">Select Type</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Class">Class</option>
                    <option value="Others">Others</option>
                  </select>
                  <input 
                    name="title" 
                    placeholder="Title" 
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <textarea 
                  name="description" 
                  placeholder="Description" 
                  value={formData.description}
                  onChange={handleInputChange}
                />
                <div className="form-row">
                  <input 
                    name="date" 
                    type="date" 
                    value={selectedDate ? selectedDate.toISOString().slice(0, 10) : ''} 
                    onChange={handleDateChange}
                    className="event-date-readonly"
                  />
                  <input 
                    name="time" 
                    type="time" 
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                {/* Participants Selection */}
                <div className="participants-section">
                  <label className="participants-label">Select Participants:</label>
                  <div className="participants-list">
                    {users.map(user => (
                      <label key={user.id} className="participant-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.some(p => p.id === user.id)}
                          onChange={() => handleParticipantToggle(user.id, user.username)}
                        />
                        <span className="participant-name">{user.username}</span>
                      </label>
                    ))}
                  </div>
                  {selectedParticipants.length > 0 && (
                    <div className="selected-participants">
                      <strong>Selected:</strong> {selectedParticipants.map(p => p.username).join(', ')}
                    </div>
                  )}
                </div>
                
                <button type="submit" className="create-event-btn">
                  Create Event
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {showEditModal && editingEvent && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button 
                className="modal-close" 
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
              <div className="modal-title">
                Edit Event
              </div>
              <form onSubmit={handleEditSubmit} className="event-form">
                <div className="form-row">
                  <select 
                    name="type" 
                    value={editFormData.type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                    required
                    className="event-select"
                  >
                    <option value="">Select Type</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Class">Class</option>
                    <option value="Others">Others</option>
                  </select>
                  <input 
                    name="title" 
                    placeholder="Title" 
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <textarea 
                  name="description" 
                  placeholder="Description" 
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="form-row">
                  <input 
                    name="date" 
                    type="date" 
                    value={editingEvent.event_date} 
                    disabled
                    style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                  <input 
                    name="time" 
                    type="time" 
                    value={editFormData.time}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </div>
                
                {/* Participants Selection */}
                <div className="participants-section">
                  <label className="participants-label">Select Participants:</label>
                  <div className="participants-list">
                    {users.map(user => (
                      <label key={user.id} className="participant-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.some(p => p.id === user.id)}
                          onChange={() => handleParticipantToggle(user.id, user.username)}
                        />
                        <span className="participant-name">{user.username}</span>
                      </label>
                    ))}
                  </div>
                  {selectedParticipants.length > 0 && (
                    <div className="selected-participants">
                      <strong>Selected:</strong> {selectedParticipants.map(p => p.username).join(', ')}
                    </div>
                  )}
                </div>
                
                <button type="submit" className="create-event-btn" style={{ background: '#10b981' }}>
                  Update Event
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <SuccessMessage 
        show={successMessage.show} 
        message={successMessage.message} 
        type={successMessage.type} 
        onClose={hideMessage} 
      />
    </SideTop>
  );
} 