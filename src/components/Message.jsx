import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaEnvelope, FaIdCard, FaCog, FaPlus, FaSmile, FaPaperclip, FaTimes, FaUsers } from 'react-icons/fa';
import logo from '../assets/logo.png';
import './Message.css';
import ReactDOM from 'react-dom';
import api from '../services/api'; // Uncomment and use for real API
import SideTop from './SideTop';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
  { label: 'ID Cards', icon: <FaIdCard />, path: '/admin-idcards' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy /> },
];

// REMOVE ALL DUMMY DATA
// const dummyUsers = [...];
// const dummyChats = [...];
// const dummyEvents = [...];

export default function Message() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatType, setChatType] = useState('private');
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Get username from sessionStorage
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 700);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Placeholder for real API data
  const chats = [];
  const unreadCount = 0;
  const upcomingCount = 0;

  // Filter chats by tab
  let filteredChats = chats;
  if (activeTab === 'Unread') filteredChats = chats.filter(c => c.unread);
  if (activeTab === 'Group') filteredChats = chats.filter(c => c.group);

  // Fetch users when New Chat modal opens and chatType is private
  useEffect(() => {
    if (showNewChat && chatType === 'private') {
      setUsersLoading(true);
      setUsersError('');
      api.getUsers()
        .then(data => {
          setUsers(data);
          setUsersError('');
        })
        .catch(() => {
          setUsers([]);
          setUsersError('Failed to load users.');
        })
        .finally(() => setUsersLoading(false));
    }
    // Reset selected user when modal opens or chatType changes
    if (showNewChat) setSelectedUser(null);
  }, [showNewChat, chatType]);

  // Reset modal state on close
  const handleCloseNewChat = () => {
    setShowNewChat(false);
    setChatType('private');
    setSelectedUser(null);
    setUsers([]);
    setUsersError('');
    setUsersLoading(false);
  };

  // Handle sending message
  const handleSend = () => {
    if (!chatInput && chatFiles.length === 0) return;
    setChatInput('');
    setChatFiles([]);
    setShowEmoji(false);
  };

  // Handle file input
  const handleFileChange = e => {
    setChatFiles([...chatFiles, ...Array.from(e.target.files)]);
  };

  // Emoji picker placeholder
  const emojiList = ['😀','😂','😍','👍','🎉','🙏','😎','😢','🔥','❤️'];

  return (
    <SideTop>
      {/* Place the main content of Message here, excluding sidebar/topbar */}
      <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Unread Messages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#e53e3e', marginTop: 8 }}>{unreadCount}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Upcoming Events</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#204080', marginTop: 8 }}>{upcomingCount}</div>
        </div>
      </div>
      <div style={{ marginTop: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', padding: 24, minHeight: 400 }}>
        {isMobile && (
          <div className="new-chat-btn-row" style={{ width: '100%', margin: '0 0 10px 0' }}>
            <button className="new-chat-btn new-chat-btn-small" onClick={() => setShowNewChat(true)}><FaPlus style={{ marginRight: 6 }} /> New Chat</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #eee', marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          {['All', 'Unread', 'Group'].map(tab => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? ' active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #204080' : '3px solid transparent',
                color: activeTab === tab ? '#204080' : '#888',
                fontWeight: 600,
                fontSize: 17,
                padding: '8px 18px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {!isMobile && (
          <div className="new-chat-btn-row" style={{ width: '100%', margin: '0 0 12px 0' }}>
            <button className="new-chat-btn" onClick={() => setShowNewChat(true)}><FaPlus style={{ marginRight: 8 }} /> New Chat</button>
          </div>
        )}
        {/* Chat List or Chat Space */}
        {!activeChat ? (
          <div style={{ marginTop: 18 }}>
            {filteredChats.map(chat => (
              <div key={chat.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 0', borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }} onClick={() => setActiveChat(chat)}>
                <img src={chat.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(chat.sender)} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', background: '#f0f0f0' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#204080', fontSize: 16 }}>{chat.sender}</div>
                  <div style={{ color: '#444', fontSize: 15, marginTop: 2 }}>{chat.message}</div>
                </div>
                {chat.unread && <span style={{ width: 12, height: 12, background: '#e53e3e', borderRadius: '50%', display: 'inline-block' }}></span>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 18, minHeight: 320, display: 'flex', flexDirection: 'column', height: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
              <img src={activeChat.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(activeChat.sender)} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#f0f0f0' }} />
              <div style={{ fontWeight: 600, color: '#204080', fontSize: 17 }}>{activeChat.sender}</div>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#204080', fontSize: 22, cursor: 'pointer' }} onClick={() => setActiveChat(null)}><FaTimes /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', margin: '18px 0', background: '#f7f8fa', borderRadius: 8, padding: 18 }}>
              {/* Dummy chat messages */}
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <img src={activeChat.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(activeChat.sender)} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div style={{ background: '#fff', borderRadius: 8, padding: '10px 16px', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', fontSize: 15, color: '#204080', maxWidth: 320 }}>
                  {activeChat.message}
                </div>
              </div>
              {/* Your message */}
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-end', gap: 10, flexDirection: 'row-reverse' }}>
                <img src={'https://ui-avatars.com/api/?name=You'} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div style={{ background: '#204080', borderRadius: 8, padding: '10px 16px', color: '#fff', fontSize: 15, maxWidth: 320 }}>
                  Sure, see you then!
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
              <button style={{ background: 'none', border: 'none', fontSize: 22, color: '#204080', cursor: 'pointer' }} onClick={() => setShowEmoji(v => !v)}><FaSmile /></button>
              {showEmoji && (
                <div style={{ position: 'absolute', bottom: 60, left: 40, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 8px rgba(32,64,128,0.13)', padding: 10, zIndex: 1000, display: 'flex', gap: 6 }}>
                  {emojiList.map(e => (
                    <span key={e} style={{ fontSize: 22, cursor: 'pointer' }} onClick={() => { setChatInput(chatInput + e); setShowEmoji(false); }}>{e}</span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              />
              <input type="file" multiple style={{ display: 'none' }} id="chat-file-input" onChange={handleFileChange} />
              <label htmlFor="chat-file-input" style={{ background: 'none', border: 'none', fontSize: 22, color: '#204080', cursor: 'pointer' }}><FaPaperclip /></label>
              <button style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={handleSend}><FaPaperPlane /></button>
            </div>
            {/* Show selected files */}
            {chatFiles.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {chatFiles.map((file, idx) => (
                  <div key={idx} style={{ background: '#f7f8fa', borderRadius: 6, padding: 6, fontSize: 13 }}>{file.name}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={handleCloseNewChat}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button onClick={handleCloseNewChat} className="modal-close">&times;</button>
            <div style={{ fontWeight: 600, fontSize: 18, color: '#204080', marginBottom: 10 }}>Start New Chat</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <button onClick={() => setChatType('private')} style={{ flex: 1, background: chatType === 'private' ? '#204080' : '#f7f8fa', color: chatType === 'private' ? '#fff' : '#204080', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Private</button>
              <button onClick={() => setChatType('group')} style={{ flex: 1, background: chatType === 'group' ? '#204080' : '#f7f8fa', color: chatType === 'group' ? '#fff' : '#204080', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}><FaUsers style={{ marginRight: 6 }} />Group</button>
            </div>
            {chatType === 'private' && (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {usersLoading ? (
                  <div>Loading users...</div>
                ) : usersError ? (
                  <div style={{ color: '#e53e3e' }}>{usersError}</div>
                ) : users.length === 0 ? (
                  <div>No users found.</div>
                ) : users.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }} onClick={() => { setSelectedUser(u); setActiveChat({ id: u.id, sender: u.name || u.username, avatar: u.avatar, message: '', unread: false, group: false }); handleCloseNewChat(); }}>
                    <img src={u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name || u.username)} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#f0f0f0' }} />
                    <div style={{ fontWeight: 600, color: '#204080', fontSize: 16 }}>{u.name || u.username}</div>
                    <div style={{ color: '#888', fontSize: 14 }}>{u.role}</div>
                  </div>
                ))}
              </div>
            )}
            {chatType === 'group' && (
              <div style={{ color: '#888', fontSize: 15, marginTop: 12 }}>Group chat coming soon.</div>
            )}
          </div>
        </div>
      )}
    </SideTop>
  );
} 