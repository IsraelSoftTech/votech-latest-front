import React, { useState, useEffect } from 'react';
import { FaTimes, FaUsers, FaCheck } from 'react-icons/fa';
import api from '../services/api';

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const usersData = await api.getAllUsersForChat();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.createGroup(groupName.trim(), selectedUsers);
      onGroupCreated(result.group);
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      setError(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        maxWidth: 500,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="modal-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          borderBottom: '1px solid #eee',
          paddingBottom: 16
        }}>
          <h2 style={{ margin: 0, color: '#204080', fontSize: 20, fontWeight: 600 }}>
            <FaUsers style={{ marginRight: 8 }} />
            Create Group Chat
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#666',
              padding: 4
            }}
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 16,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Select Participants ({selectedUsers.length} selected)
            </label>
            <div style={{
              maxHeight: 300,
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 8
            }}>
              {users.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 12,
                    cursor: 'pointer',
                    borderRadius: 6,
                    marginBottom: 4,
                    background: selectedUsers.includes(user.id) ? '#e3f2fd' : 'transparent',
                    border: selectedUsers.includes(user.id) ? '1px solid #2196f3' : '1px solid transparent'
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#e0e7ef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#204080',
                    marginRight: 12
                  }}>
                    {user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : user.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#333' }}>
                      {user.name || user.username}
                    </div>
                    <div style={{ fontSize: 14, color: '#666' }}>
                      {user.role}
                    </div>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <FaCheck style={{ color: '#2196f3', fontSize: 16 }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              padding: 12,
              background: '#ffebee',
              color: '#c62828',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Sticky footer for mobile */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            borderTop: '1px solid #eee',
            paddingTop: 16,
            background: '#fff',
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            marginLeft: -24,
            marginRight: -24,
            paddingLeft: 24,
            paddingRight: 24,
            boxShadow: '0 -2px 8px rgba(32,64,128,0.06)',
            // Responsive: on desktop, static; on mobile, sticky
            ...(window.innerWidth <= 600 ? { position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', borderRadius: 0, margin: 0, padding: 16 } : {})
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '1px solid #ddd',
              background: '#fff',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16,
              color: '#666'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedUsers.length === 0}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: loading || !groupName.trim() || selectedUsers.length === 0 ? '#ccc' : '#204080',
              borderRadius: 8,
              cursor: loading || !groupName.trim() || selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 16,
              color: '#fff',
              fontWeight: 600
            }}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
} 