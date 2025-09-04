import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FaEnvelope, FaPaperclip, FaTimes, FaFilePdf, FaImage, FaUsers } from 'react-icons/fa';
import './DeanMessage.css';
import api from '../services/api';
import SideTop from './SideTop';
import CreateGroupModal from './CreateGroupModal';
import SuccessMessage from './SuccessMessage';

export default function DeanMessage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';

  // Chat list state
  const [users, setUsers] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const canCreateGroup = authUser?.role === 'Admin4';

  // Chat view state
  const [chatUser, setChatUser] = useState(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Chat list logic
  useEffect(() => {
    if (userId) return; // Don't fetch chat list if in chat view
    setUsersLoading(true);
    setUsersError('');
    // Fetch all users for chat and groups the current user belongs to
    Promise.all([
      api.getAllUsersForChat(),
      api.getGroups()
    ])
      .then(([allUsers, groups]) => {
        const allUserChats = Array.isArray(allUsers) ? allUsers.map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          lastMessage: null,
          unread: 0,
          type: 'user'
        })) : [];
        const groupChats = Array.isArray(groups) ? groups.map(g => ({
          id: g.id,
          groupName: g.name,
          name: g.name,
          lastMessage: null,
          unread: 0,
          created_at: g.created_at,
          type: 'group'
        })) : [];
        const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
          const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : (a.created_at ? new Date(a.created_at) : new Date(0));
          const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : (b.created_at ? new Date(b.created_at) : new Date(0));
          return bTime - aTime;
        });
        setChatList(allChats);
        setHasUnread(allChats.some(u => parseInt(u.unread) > 0));
      })
      .catch(() => setUsersError('Failed to fetch users.'))
      .finally(() => setUsersLoading(false));
  }, [userId]);

  // Chat view logic
  useEffect(() => {
    if (!userId) return;
    setChatLoading(true);
    setChatError('');
    api.getAllUsersForChat()
      .then(users => {
        const found = users.find(u => String(u.id) === String(userId));
        if (found) setChatUser(found);
        else setChatError('User not found');
      })
      .catch(() => setChatError('Failed to load user'))
      .finally(() => setChatLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    api.getMessages(userId)
      .then(setMessages)
      .catch(() => setMessages([]));
    api.markMessagesRead(userId).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only images (JPEG, PNG, GIF) and PDF files are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || sending) return;
    setSending(true);
    try {
      let msg;
      if (selectedFile) {
        msg = await api.sendMessageWithFile(userId, input, selectedFile);
      } else {
        msg = await api.sendMessage(userId, input);
      }
      setMessages(msgs => [...msgs, msg]);
      setInput('');
      removeFile();
    } catch (e) {
      alert('Failed to send message');
    }
    setSending(false);
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    return (
      <div style={{ 
        position: 'relative', 
        display: 'inline-block', 
        marginBottom: 10,
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 8,
        background: '#f9f9f9'
      }}>
        <button
          onClick={removeFile}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            background: '#e53e3e',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 24,
            height: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12
          }}
        >
          <FaTimes />
        </button>
        {filePreview ? (
          <img 
            src={filePreview} 
            alt="Preview" 
            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4 }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaFilePdf style={{ color: '#e53e3e', fontSize: 24 }} />
            <span>{selectedFile.name}</span>
          </div>
        )}
      </div>
    );
  };

  const renderMessageContent = (msg) => {
    return (
      <div>
        {msg.content && <div>{msg.content}</div>}
        {msg.file_url && (
          <div style={{ marginTop: msg.content ? 8 : 0 }}>
            {msg.file_type && msg.file_type.startsWith('image/') ? (
              <img 
                src={`http://localhost:5000${msg.file_url}`} 
                alt="Attachment" 
                style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, cursor: 'pointer' }}
                onClick={() => window.open(`http://localhost:5000${msg.file_url}`, '_blank')}
              />
            ) : (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: 8, 
                  background: '#f0f0f0', 
                  borderRadius: 8, 
                  cursor: 'pointer',
                  maxWidth: 300
                }}
                onClick={() => window.open(`http://localhost:5000${msg.file_url}`, '_blank')}
              >
                <FaFilePdf style={{ color: '#e53e3e', fontSize: 20 }} />
                <span style={{ fontSize: 14, color: '#333' }}>
                  {msg.file_name || 'Document'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleCreateGroup = () => {
    setShowCreateGroupModal(true);
  };

  const handleGroupCreated = () => {
    setSuccessMsg('Group created successfully!');
    // Refresh groups list
    Promise.all([
      api.getAllUsersForChat(),
      api.getGroups()
    ]).then(([allUsers, groups]) => {
      const allUserChats = Array.isArray(allUsers) ? allUsers.map(u => ({
        id: u.id, username: u.username, name: u.name, lastMessage: null, unread: 0, type: 'user'
      })) : [];
      const groupChats = Array.isArray(groups) ? groups.map(g => ({
        id: g.id, groupName: g.name, name: g.name, lastMessage: null, unread: 0, created_at: g.created_at, type: 'group'
      })) : [];
      const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
        const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : (a.created_at ? new Date(a.created_at) : new Date(0));
        const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : (b.created_at ? new Date(b.created_at) : new Date(0));
        return bTime - aTime;
      });
      setChatList(allChats);
      setHasUnread(allChats.some(u => parseInt(u.unread) > 0));
    }).catch(() => setUsersError('Failed to fetch users.'));
  };

  // Render chat view if userId is present
  if (userId) {
    if (chatLoading) return <SideTop activeTab="Messages"><div style={{ padding: 48, textAlign: 'center' }}>Loading chat...</div></SideTop>;
    if (chatError) return <SideTop activeTab="Messages"><div style={{ padding: 48, color: '#e53e3e', textAlign: 'center' }}>{chatError}</div></SideTop>;
    return (
      <SideTop hasUnread={hasUnread} activeTab="Messages">
        <div style={{ maxWidth: 700, margin: '32px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', minHeight: 480, display: 'flex', flexDirection: 'column', height: '70vh', width: '100%', padding: '0 18px' }}>
          <div className="chat-space-header" style={{ padding: 18, borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#f7f8fa', borderBottom: '1px solid #eee' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#204080', fontWeight: 600, fontSize: 18, marginRight: 12, cursor: 'pointer' }}>{'←'}</button>
            <div className="name">{chatUser?.username}</div>
          </div>
          <div className="chat-messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>No messages yet. Say hello!</div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender_id === authUser.id;
                let ticks = null;
                if (isMe) {
                  if (msg.read) {
                    ticks = <span style={{ color: '#2196f3', marginLeft: 8, fontSize: 16 }}>✓✓</span>;
                  } else {
                    ticks = <span style={{ color: '#222', marginLeft: 8, fontSize: 16 }}>✓✓</span>;
                  }
                }
                return (
                  <div key={msg.id || idx} className={`chat-message${isMe ? ' me' : ''}`}> 
                    <div className="bubble">
                      {renderMessageContent(msg)}
                      {ticks}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row" style={{ padding: 18, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, background: '#f7f8fa' }}>
            {renderFilePreview()}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                style={{ flex: 1, fontSize: 16, border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', outline: 'none' }}
                disabled={sending}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#f0f0f0',
                  color: '#666',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                disabled={sending}
              >
                <FaPaperclip />
              </button>
              <button onClick={handleSend} style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} disabled={sending}>Send</button>
            </div>
          </div>
        </div>
      </SideTop>
    );
  }

  // Chat list view (default)
  const totalUnread = chatList.reduce((sum, u) => sum + (parseInt(u.unread) || 0), 0);

  return (
    <SideTop hasUnread={hasUnread} activeTab="Messages">
      {successMsg && (
        <SuccessMessage message={successMsg} onClose={() => setSuccessMsg('')} />
      )}
      {canCreateGroup && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={handleCreateGroup}
            style={{
              background: '#204080',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(32,64,128,0.2)'
            }}
            onMouseEnter={(e) => e.target.style.background = '#1a3668'}
            onMouseLeave={(e) => e.target.style.background = '#204080'}
          >
            <FaUsers /> Create Group
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Unread Messages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#e53e3e', marginTop: 8 }}>{totalUnread}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Upcoming Events</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#204080', marginTop: 8 }}>{0}</div>
        </div>
      </div>
      <div
        style={{
          marginTop: 32,
          maxWidth: 700,
          marginLeft: 'auto',
          marginRight: 'auto',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(32,64,128,0.06)',
          width: '100%',
          padding: window.innerWidth <= 600 ? '0 8px' : '0 18px',
        }}
      >
        {usersLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>Loading chats...</div>
        ) : usersError ? (
          <div style={{ padding: 32, color: '#e53e3e', textAlign: 'center' }}>{usersError}</div>
        ) : (
          <div>
            {chatList.map(chat => {
              let displayName, initials, isGroup = false;
              if (chat.type === 'group') {
                console.log('DeanMessage - Group chat data:', chat);
                console.log('DeanMessage - chat.groupName:', chat.groupName);
                console.log('DeanMessage - chat.name:', chat.name);
                // Ensure we get a string value for displayName
                const groupName = typeof chat.groupName === 'string' ? chat.groupName : 
                                 (typeof chat.name === 'string' ? chat.name : 'Unknown Group');
                displayName = groupName || 'Unknown Group';
                initials = displayName ? displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'GR';
                isGroup = true;
                console.log('DeanMessage - Final display name:', displayName);
              } else {
                // Ensure we get a string value for displayName
                const userName = typeof chat.name === 'string' ? chat.name : 
                               (typeof chat.username === 'string' ? chat.username : 'Unknown User');
                displayName = userName || 'Unknown User';
                initials = typeof chat.name === 'string' && chat.name ? 
                          chat.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 
                          (typeof chat.username === 'string' && chat.username ? chat.username[0].toUpperCase() : '?');
              }
              const lastMsg = chat.lastMessage?.content || '';
              const lastTime = chat.lastMessage?.time ? new Date(chat.lastMessage.time) : null;
              const timeStr = lastTime ? lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div
                  key={chat.type + '-' + chat.id}
                  className="chat-list-item"
                  onClick={() => isGroup
                    ? navigate(`/admin-group-messages/${chat.id}`)
                    : navigate(`/dean-messages/${chat.id}`)}
                  style={{ userSelect: 'none', alignItems: 'center', gap: 16 }}
                >
                  <div className="avatar" style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#204080' }}>
                    {isGroup ? <FaEnvelope /> : initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#204080', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                    <div style={{ color: '#444', fontSize: 15, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.length > 32 ? lastMsg.slice(0,32) + '\u2026' : lastMsg}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 40, paddingRight: 8 }}>
                    <div style={{ color: '#888', fontSize: 13 }}>{timeStr}</div>
                    {parseInt(chat.unread) > 0 && <div style={{ background: '#25d366', color: '#fff', borderRadius: 12, minWidth: 22, minHeight: 22, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, padding: '0 7px' }}>{parseInt(chat.unread)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </SideTop>
  );
} 