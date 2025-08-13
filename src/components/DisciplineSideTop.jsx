import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DisciplineSideTop.css';
import logo from '../assets/logo.png';
import { FaTachometerAlt, FaEnvelope, FaUserGraduate, FaClipboardList, FaGavel, FaFileAlt, FaComments, FaShieldAlt, FaCog, FaBars, FaSignOutAlt, FaUser, FaCamera, FaTimes, FaBell } from 'react-icons/fa';
import ReactDOM from 'react-dom';
import api from '../services/api';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/discipline' },
  { label: 'Application', icon: <FaClipboardList />, path: '/application' },
  { label: 'My Classes', icon: <FaClipboardList />, path: '/discipline-my-classes' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/discipline-messages' },
  { label: 'Attendance', icon: <FaClipboardList />, path: '/attendance' },
  { label: 'Disciplinary Cases', icon: <FaGavel />, path: '/discipline-cases' },
  { label: 'Events', icon: <FaClipboardList />, path: '/discipline-events' }
];

export default function DisciplineSideTop({ children, hasUnread = false, activeTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    profileImage: null,
    profileImageUrl: null
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

  // Profile management functions
  const openProfileModal = () => {
    setProfileData({
      username: authUser?.username || '',
      profileImage: null,
      profileImageUrl: authUser?.profileImageUrl || null
    });
    setShowProfileModal(true);
    setUserMenuOpen(false);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          profileImage: file,
          profileImageUrl: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileData.username.trim()) return;
    
    setIsUpdating(true);
    try {
      // Here you would typically send the data to your API
      // For now, we'll just update the local state
      const updatedUser = {
        ...authUser,
        username: profileData.username,
        profileImageUrl: profileData.profileImageUrl
      };
      
      // Update sessionStorage
      sessionStorage.setItem('authUser', JSON.stringify(updatedUser));
      
      // Close modal
      setShowProfileModal(false);
      
      // Force re-render
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const removeProfileImage = () => {
    setProfileData(prev => ({
      ...prev,
      profileImage: null,
      profileImageUrl: null
    }));
  };

  // Fetch upcoming events count
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        // Use the dedicated upcoming events endpoint
        const events = await api.getUpcomingEvents();
        
        console.log('DisciplineSideTop: Fetched upcoming events:', events);
        
        if (Array.isArray(events)) {
          setUpcomingEventsCount(events.length);
          console.log('DisciplineSideTop: Upcoming events count:', events.length);
        } else {
          console.log('DisciplineSideTop: Events is not an array:', events);
          setUpcomingEventsCount(0);
        }
      } catch (error) {
        console.error('DisciplineSideTop: Error fetching upcoming events:', error);
        // Fallback to regular events if upcoming events fails
        try {
          const allEvents = await api.getEvents();
          if (Array.isArray(allEvents)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const upcomingEvents = allEvents.filter(event => {
              if (!event.date) return false;
              const eventDate = new Date(event.date);
              eventDate.setHours(0, 0, 0, 0);
              return eventDate >= today;
            });
            
            setUpcomingEventsCount(upcomingEvents.length);
            console.log('DisciplineSideTop: Fallback events count:', upcomingEvents.length);
          } else {
            setUpcomingEventsCount(0);
          }
        } catch (fallbackError) {
          console.error('DisciplineSideTop: Fallback also failed:', fallbackError);
          setUpcomingEventsCount(0);
        }
      }
    };

    // Fetch on mount
    fetchUpcomingEvents();

    // Set up periodic refresh (every hour)
    const interval = setInterval(fetchUpcomingEvents, 60 * 60 * 1000);

    // Listen for custom events
    const handleEventCreated = () => {
      console.log('DisciplineSideTop: Event created, refreshing count');
      fetchUpcomingEvents();
    };
    const handleEventUpdated = () => {
      console.log('DisciplineSideTop: Event updated, refreshing count');
      fetchUpcomingEvents();
    };
    const handleEventDeleted = () => {
      console.log('DisciplineSideTop: Event deleted, refreshing count');
      fetchUpcomingEvents();
    };

    window.addEventListener('eventCreated', handleEventCreated);
    window.addEventListener('eventUpdated', handleEventUpdated);
    window.addEventListener('eventDeleted', handleEventDeleted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('eventCreated', handleEventCreated);
      window.removeEventListener('eventUpdated', handleEventUpdated);
      window.removeEventListener('eventDeleted', handleEventDeleted);
    };
  }, []);

  // Function to refresh events count
  const refreshEventsCount = async () => {
    try {
      // Use the dedicated upcoming events endpoint
      const events = await api.getUpcomingEvents();
      
      if (Array.isArray(events)) {
        setUpcomingEventsCount(events.length);
      } else {
        setUpcomingEventsCount(0);
      }
    } catch (error) {
      console.error('DisciplineSideTop: Error refreshing events count:', error);
      // Fallback to regular events if upcoming events fails
      try {
        const allEvents = await api.getEvents();
        if (Array.isArray(allEvents)) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const upcomingEvents = allEvents.filter(event => {
            if (!event.date) return false;
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
          });
          
          setUpcomingEventsCount(upcomingEvents.length);
        } else {
          setUpcomingEventsCount(0);
        }
      } catch (fallbackError) {
        console.error('DisciplineSideTop: Fallback also failed:', fallbackError);
        setUpcomingEventsCount(0);
      }
    }
  };

  // Handle bell click
  const handleBellClick = () => {
    navigate('/discipline-events');
  };

  return (
    <div className="ds-container">
      <aside className={`ds-sidebar${sidebarOpen ? ' open' : ''}`}> 
        <div className="ds-logo">
          <img src={logo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', marginRight: 8 }} />
          <span className="ds-logo-text">VOTECH</span>
        </div>
        <nav className="ds-menu">
          {menuItems.map(item => (
            <div
              key={item.label}
              className={`ds-menu-item${(activeTab && item.label === activeTab) || location.pathname === item.path || (item.path && location.pathname.startsWith(item.path + '/')) ? ' active' : ''}`}
              onClick={() => {
                console.log('DisciplineSideTop navigation:', item.label, 'to path:', item.path);
                navigate(item.path);
              }}
              style={{ position: 'relative' }}
            >
              {item.icon}
              {item.label === 'Messages' && hasUnread && (
                <span style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, background: '#e53e3e', borderRadius: '50%', display: 'inline-block' }}></span>
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>
      <div className="ds-main">
        <header className="ds-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100, width: '100%' }}>
          <div className="ds-header-left" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button className="ds-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={logo} alt="logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              <span style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: 1.5, color: '#204080' }}>VOTECH</span>
            </div>
          </div>
          <div className="ds-actions">
            {/* Notification Bell */}
            <div className="notification-bell" onClick={handleBellClick}>
              <FaBell />
              {upcomingEventsCount > 0 && (
                <div className="notification-badge">
                  {upcomingEventsCount}
                </div>
              )}
            </div>
            
            <button
              style={{ background: 'none', border: 'none', color: '#204080', fontWeight: 600, fontSize: 17, cursor: 'pointer', position: 'relative', padding: '4px 12px', borderRadius: 6 }}
              onClick={() => setUserMenuOpen(v => !v)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 180)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {authUser?.profileImageUrl ? (
                  <img 
                    src={authUser.profileImageUrl} 
                    alt="Profile" 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      objectFit: 'cover',
                      border: '2px solid #eaf3ff'
                    }} 
                  />
                ) : (
                  <span>{username}</span>
                )}
              </div>
            </button>
            {userMenuOpen && ReactDOM.createPortal(
              <div style={{ position: 'fixed', top: 64, right: 24, background: '#fff', borderRadius: 10, boxShadow: '0 4px 24px rgba(32,64,128,0.13)', minWidth: 160, zIndex: 99999, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'stretch', overflow: 'visible' }}>
                <button 
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#204080', fontWeight: 500, fontSize: 16, padding: '10px 18px', cursor: 'pointer', borderRadius: 0, textAlign: 'left' }}
                  onClick={openProfileModal}
                >
                  <FaCog style={{ fontSize: 17 }} /> Settings
                </button>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#e53e3e', fontWeight: 500, fontSize: 16, padding: '10px 18px', cursor: 'pointer', borderRadius: 0, textAlign: 'left' }}
                  onClick={() => {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('authUser');
                    window.location.href = '/signin';
                  }}
                >
                  <FaSignOutAlt style={{ fontSize: 17 }} /> Logout
                </button>
              </div>, document.body
            )}
          </div>
        </header>
        <div style={{ marginTop: 32 }}>{children}</div>
      </div>
      {sidebarOpen && <div className="ds-sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Profile Settings Modal */}
      {showProfileModal && ReactDOM.createPortal(
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Profile Settings</h2>
              <button 
                className="profile-modal-close" 
                onClick={() => setShowProfileModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="profile-modal-body">
              {/* Profile Image Section */}
              <div className="profile-image-section">
                <div className="profile-image-preview">
                  {profileData.profileImageUrl ? (
                    <img 
                      src={profileData.profileImageUrl} 
                      alt="Profile Preview" 
                      className="profile-preview-img"
                    />
                  ) : (
                    <div className="profile-placeholder">
                      <FaUser />
                    </div>
                  )}
                  <div className="profile-image-overlay">
                    <label htmlFor="profile-image-input" className="camera-icon">
                      <FaCamera />
                    </label>
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
                {profileData.profileImageUrl && (
                  <button 
                    className="remove-image-btn"
                    onClick={removeProfileImage}
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {/* Username Section */}
              <div className="profile-input-section">
                <label htmlFor="username-input">Username</label>
                <input
                  id="username-input"
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-modal-footer">
              <button 
                className="profile-cancel-btn"
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
              <button 
                className="profile-update-btn"
                onClick={handleProfileUpdate}
                disabled={isUpdating || !profileData.username.trim()}
              >
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
