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
  const [chatList, setChatList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
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

  useEffect(() => {
    setUsersLoading(true);
    setUsersError('');
    api.getChatList()
      .then(list => {
        setChatList(list);
        setHasUnread(list.some(u => u.unread > 0));
      })
      .catch(() => setUsersError('Failed to fetch users.'))
      .finally(() => setUsersLoading(false));
  }, []);

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

  // Calculate total unread messages for the card
  const totalUnread = chatList.reduce((sum, u) => sum + (u.unread || 0), 0);

  return (
    <SideTop hasUnread={hasUnread}>
      <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Unread Messages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#e53e3e', marginTop: 8 }}>{totalUnread}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Upcoming Events</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#204080', marginTop: 8 }}>{upcomingCount}</div>
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
            {chatList.map(user => {
              const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : user.username[0].toUpperCase();
              const lastMsg = user.lastMessage?.content || '';
              const lastTime = user.lastMessage?.time ? new Date(user.lastMessage.time) : null;
              const timeStr = lastTime ? lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div
                  key={user.id}
                  className="chat-list-item"
                  onClick={() => navigate(`/admin-messages/${user.id}`)}
                  style={{ userSelect: 'none', alignItems: 'center', gap: 16 }}
                >
                  <div className="avatar" style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#204080' }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#204080', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</div>
                    <div style={{ color: '#444', fontSize: 15, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.length > 32 ? lastMsg.slice(0,32) + '…' : lastMsg}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 40, paddingRight: 8 }}>
                    <div style={{ color: '#888', fontSize: 13 }}>{timeStr}</div>
                    {user.unread > 0 && <div style={{ background: '#25d366', color: '#fff', borderRadius: 12, minWidth: 22, minHeight: 22, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, padding: '0 7px' }}>{user.unread}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SideTop>
  );
} 