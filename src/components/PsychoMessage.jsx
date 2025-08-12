import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaEnvelope, FaIdCard, FaCog, FaPlus, FaSmile, FaPaperclip, FaTimes, FaUsers } from 'react-icons/fa';
import logo from '../assets/logo.png';
import './Message.css';
import ReactDOM from 'react-dom';
import api from '../services/api';
import SideTop from './SideTop';
import CreateGroupModal from './CreateGroupModal';
import SuccessMessage from './SuccessMessage';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/psycho-dashboard' },
  { label: 'Cases', icon: <FaClipboardList />, path: '/psycho-cases' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/psycho-messages' },
  { label: 'Reports', icon: <FaFileAlt />, path: '/psycho-reports' },
  { label: 'Lesson Plan', icon: <FaPenFancy />, path: '/psychosocialist-lesson-plans' },
];

export default function PsychoMessage() {
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
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  const [users, setUsers] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 700);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chats = [];
  const unreadCount = 0;

  let filteredChats = chats;
  if (activeTab === 'Unread') filteredChats = chats.filter(c => c.unread);
  if (activeTab === 'Group') filteredChats = chats.filter(c => c.group);

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
    if (showNewChat) setSelectedUser(null);
  }, [showNewChat, chatType]);

  useEffect(() => {
    setUsersLoading(true);
    setUsersError('');
    Promise.all([
      api.getAllUsersForChat(),
      api.getChatList()
    ])
      .then(([allUsers, chatListRaw]) => {
        console.log('Raw chat list data:', chatListRaw);
        console.log('Group chats from raw data:', chatListRaw.filter(c => c.type === 'group'));
        console.log('Sample group chat raw data:', chatListRaw.filter(c => c.type === 'group')[0]);
        const chatMap = {};
        chatListRaw.forEach(c => {
          if (c.type === 'user') chatMap[c.id] = c;
        });
        const allUserChats = allUsers.map(u => {
          const chat = chatMap[u.id] || {};
          return {
            id: u.id,
            username: u.username,
            name: u.name,
            lastMessage: chat.lastMessage || null,
            unread: chat.unread || 0,
            type: 'user'
          };
        });
        const groupChats = chatListRaw.filter(c => c.type === 'group');
        console.log('Processed group chats:', groupChats);
        const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
          const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : new Date(0);
          const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : new Date(0);
          return bTime - aTime;
        });
        console.log('Final allChats with groups:', allChats.filter(c => c.type === 'group'));
        setChatList(allChats);
        setHasUnread(allChats.some(u => u.unread > 0));
      })
      .catch(() => setUsersError('Failed to fetch users.'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    const refreshChatList = async () => {
      try {
        const [allUsers, chatListRaw] = await Promise.all([
          api.getAllUsersForChat(),
          api.getChatList()
        ]);
        
        const chatMap = {};
        chatListRaw.forEach(c => {
          if (c.type === 'user') chatMap[c.id] = c;
        });
        
        const allUserChats = allUsers.map(u => {
          const chat = chatMap[u.id] || {};
          return {
            id: u.id,
            username: u.username,
            name: u.name,
            lastMessage: chat.lastMessage || null,
            unread: chat.unread || 0,
            type: 'user'
          };
        });
        
        const groupChats = chatListRaw.filter(c => c.type === 'group');
        
        const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
          const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : new Date(0);
          const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : new Date(0);
          return bTime - aTime;
        });
        
        setChatList(allChats);
        setHasUnread(allChats.some(u => u.unread > 0));
      } catch (error) {
        console.error('Failed to refresh chat list:', error);
      }
    };

    window.refreshChatList = refreshChatList;

    return () => {
      delete window.refreshChatList;
    };
  }, []);

  const handleCloseNewChat = () => {
    setShowNewChat(false);
    setChatType('private');
    setSelectedUser(null);
    setUsers([]);
    setUsersError('');
    setUsersLoading(false);
  };

  const handleSend = () => {
    if (!chatInput && chatFiles.length === 0) return;
    setChatInput('');
    setChatFiles([]);
    setShowEmoji(false);
  };

  const handleFileChange = e => {
    setChatFiles([...chatFiles, ...Array.from(e.target.files)]);
  };

  const emojiList = ['😀','😂','😍','👍','🎉','🙏','😎','😊','🔥','❤️'];

  const handleCreateGroup = () => {
    setShowCreateGroupModal(true);
  };

  const handleGroupCreated = (group) => {
    setSuccessMsg('Group created successfully!');
    Promise.all([
      api.getAllUsersForChat(),
      api.getChatList()
    ])
      .then(([allUsers, chatListRaw]) => {
        console.log('Raw chat list data after group creation:', chatListRaw);
        console.log('Group chats from raw data after group creation:', chatListRaw.filter(c => c.type === 'group'));
        const chatMap = {};
        chatListRaw.forEach(c => {
          if (c.type === 'user') chatMap[c.id] = c;
        });
        const allUserChats = allUsers.map(u => {
          const chat = chatMap[u.id] || {};
          return {
            id: u.id,
            username: u.username,
            name: u.name,
            lastMessage: chat.lastMessage || null,
            unread: chat.unread || 0,
            type: 'user'
          };
        });
        const groupChats = chatListRaw.filter(c => c.type === 'group');
        const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
          const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : new Date(0);
          const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : new Date(0);
          return bTime - aTime;
        });
        setChatList(allChats);
        setHasUnread(allChats.some(u => u.unread > 0));
      })
      .catch(() => setUsersError('Failed to fetch users.'));
  };

  const totalUnread = chatList.reduce((sum, u) => sum + (parseInt(u.unread) || 0), 0);
  const totalChats = chatList.length;
  const totalGroups = chatList.filter(chat => chat.type === 'group').length;

  console.log('Chat list:', chatList);
  console.log('Total unread:', totalUnread);
  console.log('Total chats:', totalChats);
  console.log('Groups:', chatList.filter(chat => chat.type === 'group'));

  return (
    <SideTop hasUnread={hasUnread} activeTab="Messages">
      {successMsg && (
        <SuccessMessage message={successMsg} onClose={() => setSuccessMsg('')} />
      )}
      <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Unread Messages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#e53e3e', marginTop: 8 }}>{totalUnread}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Total Chats</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#204080', marginTop: 8 }}>{totalChats}</div>
        </div>
      </div>
      
      <div style={{ marginTop: window.innerWidth <= 700 ? 16 : 24, textAlign: 'center' }}>
        <button
          onClick={handleCreateGroup}
          style={{
            background: '#204080',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: window.innerWidth <= 700 ? '10px 20px' : '12px 24px',
            fontSize: window.innerWidth <= 700 ? 14 : 16,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(32,64,128,0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#1a3668'}
          onMouseLeave={(e) => e.target.style.background = '#204080'}
        >
          <FaUsers style={{ fontSize: window.innerWidth <= 700 ? 14 : 16 }} />
          Create Group
        </button>
      </div>
      <div
        style={{
          marginTop: window.innerWidth <= 700 ? 16 : 32,
          maxWidth: 700,
          marginLeft: 'auto',
          marginRight: 'auto',
          background: '#fff',
          borderRadius: window.innerWidth <= 700 ? 0 : 12,
          boxShadow: window.innerWidth <= 700 ? 'none' : '0 2px 8px rgba(32,64,128,0.06)',
          width: '100%',
          padding: window.innerWidth <= 700 ? '0' : '0 18px',
        }}
      >
        {usersLoading ? (
          <div style={{ padding: window.innerWidth <= 700 ? 24 : 32, textAlign: 'center' }}>Loading chats...</div>
        ) : usersError ? (
          <div style={{ padding: window.innerWidth <= 700 ? 24 : 32, color: '#e53e3e', textAlign: 'center' }}>{usersError}</div>
        ) : (
          <div>
            {chatList.map(chat => {
              let displayName, initials, isGroup = false;
              if (chat.type === 'group') {
                console.log('Group chat data:', chat);
                console.log('Group chat keys:', Object.keys(chat));
                console.log('chat.groupName:', chat.groupName);
                console.log('chat.name:', chat.name);
                const groupName = typeof chat.groupName === 'string' ? chat.groupName : 
                                 (typeof chat.name === 'string' ? chat.name : 'Unknown Group');
                displayName = groupName || 'Unknown Group';
                initials = displayName ? displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'GR';
                isGroup = true;
                console.log('Final display name:', displayName);
              } else {
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
                    ? navigate(`/psycho-group-messages/${chat.id}`)
                    : navigate(`/psycho-chat/${chat.id}`)}
                  style={{ 
                    userSelect: 'none', 
                    alignItems: 'center', 
                    gap: window.innerWidth <= 700 ? 12 : 16,
                    padding: window.innerWidth <= 700 ? '12px 16px' : '16px',
                    borderBottom: window.innerWidth <= 700 ? '1px solid #f0f0f0' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <div className="avatar" style={{ 
                    width: window.innerWidth <= 700 ? 40 : 48, 
                    height: window.innerWidth <= 700 ? 40 : 48, 
                    borderRadius: '50%', 
                    background: '#e0e7ef', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: window.innerWidth <= 700 ? 16 : 20, 
                    color: '#204080' 
                  }}>
                    {isGroup ? <FaUsers style={{ fontSize: window.innerWidth <= 700 ? 14 : 16 }} /> : initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: '#204080', 
                      fontSize: window.innerWidth <= 700 ? 14 : 16, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {displayName}
                    </div>
                    <div style={{ 
                      color: '#444', 
                      fontSize: window.innerWidth <= 700 ? 13 : 15, 
                      marginTop: 2, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {lastMsg.length > (window.innerWidth <= 700 ? 25 : 32) ? lastMsg.slice(0, window.innerWidth <= 700 ? 25 : 32) + '…' : lastMsg}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 40, paddingRight: window.innerWidth <= 700 ? 0 : 8 }}>
                    <div style={{ color: '#888', fontSize: window.innerWidth <= 700 ? 11 : 13 }}>{timeStr}</div>
                    {parseInt(chat.unread) > 0 && (
                      <div style={{ 
                        background: '#25d366', 
                        color: '#fff', 
                        borderRadius: 12, 
                        minWidth: window.innerWidth <= 700 ? 18 : 22, 
                        minHeight: window.innerWidth <= 700 ? 18 : 22, 
                        fontWeight: 700, 
                        fontSize: window.innerWidth <= 700 ? 12 : 14, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginTop: 4, 
                        padding: '0 6px' 
                      }}>
                        {parseInt(chat.unread)}
                      </div>
                    )}
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