import React, { useState, useEffect } from 'react';
import { FaUsers, FaEye, FaClock, FaUserCheck, FaUserTimes, FaSearch, FaFilter, FaSync } from 'react-icons/fa';
import SideTop from './SideTop';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';
import './MonitorUsers.css';

export default function MonitorUsers() {
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, activitiesData, sessionsData] = await Promise.all([
        api.getMonitoredUsers(),
        api.getUserActivities(),
        api.getUserSessions()
      ]);
      
      setUsers(usersData);
      setActivities(activitiesData);
      setSessions(sessionsData);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
    setSuccess('Data refreshed successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end - start) / 1000 / 60); // minutes
    
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Logged In':
        return '#10B981';
      case 'Logged Out':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.current_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.activity_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.activity_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusCount = (status) => {
    return users.filter(user => user.current_status === status).length;
  };

  return (
    <SideTop>
      <div className="monitor-users-container">
        {/* Header */}
        <div className="monitor-header">
          <div className="header-left">
            <h1 className="monitor-title">
              <FaUsers className="title-icon" />
              Monitor Users
            </h1>
            <p className="header-subtitle">
              Track user activities, sessions, and system usage across the application
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn refresh-btn" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <FaSync className={loading ? 'spinning' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && <SuccessMessage message={success} />}
        {error && <div className="error-message">{error}</div>}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card total-users">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-content">
              <div className="stat-number">{users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          
          <div className="stat-card logged-in">
            <div className="stat-icon">
              <FaUserCheck />
            </div>
            <div className="stat-content">
              <div className="stat-number">{getStatusCount('Logged In')}</div>
              <div className="stat-label">Currently Online</div>
            </div>
          </div>
          
          <div className="stat-card logged-out">
            <div className="stat-icon">
              <FaUserTimes />
            </div>
            <div className="stat-content">
              <div className="stat-number">{getStatusCount('Logged Out')}</div>
              <div className="stat-label">Offline</div>
            </div>
          </div>
          
          <div className="stat-card total-activities">
            <div className="stat-icon">
              <FaClock />
            </div>
            <div className="stat-content">
              <div className="stat-number">{activities.length}</div>
              <div className="stat-label">Total Activities</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="monitor-tabs">
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers />
            Users ({users.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <FaClock />
            Activities ({activities.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <FaEye />
            Sessions ({sessions.length})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="monitor-filters">
          <div className="search-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users, activities, or sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          {activeTab === 'users' && (
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="Logged In">Logged In</option>
                <option value="Logged Out">Logged Out</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="monitor-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading monitoring data...</p>
            </div>
          ) : (
            <>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="table-container">
                  <table className="monitor-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>IP Address</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className={`user-row ${user.suspended ? 'suspended' : ''}`}>
                          <td className="user-cell">
                            <div className="user-info">
                              <div className="user-avatar">
                                {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="user-details">
                                <div className="user-name">{user.name || 'N/A'}</div>
                                <div className="user-username">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="role-badge">{user.role}</span>
                          </td>
                          <td>
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(user.current_status) }}
                            >
                              <span className="status-dot"></span>
                              {user.current_status || 'Unknown'}
                            </span>
                          </td>
                          <td className="date-cell">
                            {user.last_login ? formatDate(user.last_login) : 'Never'}
                          </td>
                          <td className="ip-cell">
                            {user.last_ip || 'N/A'}
                          </td>
                          <td className="actions-cell">
                            <button 
                              className="action-btn view-btn"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Activities Tab */}
              {activeTab === 'activities' && (
                <div className="table-container">
                  <table className="monitor-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Activity</th>
                        <th>Type</th>
                        <th>Entity</th>
                        <th>IP Address</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((activity) => (
                        <tr key={activity.id} className="activity-row">
                          <td className="user-cell">
                            <div className="user-info">
                              <div className="user-avatar">
                                {activity.user_name ? activity.user_name.charAt(0).toUpperCase() : activity.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="user-details">
                                <div className="user-name">{activity.user_name || 'N/A'}</div>
                                <div className="user-username">@{activity.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="activity-cell">
                            <div className="activity-content">
                              <span className="activity-icon">{getActivityIcon(activity.activity_type)}</span>
                              <span className="activity-description">{activity.activity_description}</span>
                            </div>
                          </td>
                          <td>
                            <span className="activity-type-badge">{activity.activity_type}</span>
                          </td>
                          <td className="entity-cell">
                            {activity.entity_name ? (
                              <span className="entity-badge">
                                {activity.entity_type}: {activity.entity_name}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="ip-cell">
                            {activity.ip_address || 'N/A'}
                          </td>
                          <td className="date-cell">
                            {formatDate(activity.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === 'sessions' && (
                <div className="table-container">
                  <table className="monitor-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Session Start</th>
                        <th>Session End</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="session-row">
                          <td className="user-cell">
                            <div className="user-info">
                              <div className="user-avatar">
                                {session.user_name ? session.user_name.charAt(0).toUpperCase() : session.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="user-details">
                                <div className="user-name">{session.user_name || 'N/A'}</div>
                                <div className="user-username">@{session.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="date-cell">
                            {formatDate(session.session_start)}
                          </td>
                          <td className="date-cell">
                            {session.session_end ? formatDate(session.session_end) : 'Active'}
                          </td>
                          <td className="duration-cell">
                            {formatDuration(session.session_start, session.session_end)}
                          </td>
                          <td>
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: session.status === 'active' ? '#10B981' : '#6B7280' }}
                            >
                              <span className="status-dot"></span>
                              {session.status}
                            </span>
                          </td>
                          <td className="ip-cell">
                            {session.ip_address || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowUserDetails(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>User Details</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowUserDetails(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="user-detail-grid">
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedUser.name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Username:</label>
                    <span>@{selectedUser.username}</span>
                  </div>
                  <div className="detail-item">
                    <label>Role:</label>
                    <span className="role-badge">{selectedUser.role}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedUser.current_status) }}
                    >
                      {selectedUser.current_status || 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Last Login:</label>
                    <span>{selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}</span>
                  </div>
                  <div className="detail-item">
                    <label>IP Address:</label>
                    <span>{selectedUser.last_ip || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Account Created:</label>
                    <span>{formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 