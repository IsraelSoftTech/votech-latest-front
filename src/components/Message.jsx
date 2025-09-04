import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaEnvelope, FaIdCard, FaCog, FaPlus, FaSmile, FaPaperclip, FaTimes, FaUsers } from 'react-icons/fa';
import logo from '../assets/logo.png';
import './Message.css';
import ReactDOM from 'react-dom';
import api from '../services/api'; // Uncomment and use for real API
import SideTop from './SideTop';
import CreateGroupModal from './CreateGroupModal';
import SuccessMessage from './SuccessMessage';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Staff', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [canCreateGroup, setCanCreateGroup] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 700);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine permission to create group using backend (Admins 1-4 or any HOD)
  useEffect(() => {
    const determinePermission = async () => {
      try {
        const role = authUser?.role;
        const allowedAdminRoles = ['Admin1', 'Admin2', 'Admin3', 'Admin4'];
        if (allowedAdminRoles.includes(role)) {
          setCanCreateGroup(true);
          return;
        }
        const hods = await api.getHODs();
        const isHOD = Array.isArray(hods) && hods.some(h => String(h.hod_user_id) === String(authUser?.id));
        setCanCreateGroup(!!isHOD);
      } catch (e) {
        setCanCreateGroup(false);
      }
    };
    determinePermission();
  }, []);

  // Placeholder for real API data
  const chats = [];
  const unreadCount = 0;

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
    // Fetch chats and compute unread for groups
    (async () => {
      try {
        const [allUsers, groups] = await Promise.all([
          api.getAllUsersForChat(),
          api.getGroups()
        ]);
        const authUser = JSON.parse(sessionStorage.getItem('authUser') || 'null');
        const allUserChats = Array.isArray(allUsers) ? allUsers.map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          lastMessage: null,
          unread: 0,
          type: 'user'
        })) : [];
        const groupChats = Array.isArray(groups) ? await Promise.all(groups.map(async (g) => {
          let unread = 0;
          try {
            const msgs = await api.getGroupMessages(g.id);
            unread = Array.isArray(msgs) ? msgs.filter(m => !m.read_at && String(m.sender_id) !== String(authUser?.id)).length : 0;
          } catch (_) { unread = 0; }
          return { id: g.id, groupName: g.name, name: g.name, lastMessage: null, unread, created_at: g.created_at, type: 'group' };
        })) : [];
        const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
          const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : (a.created_at ? new Date(a.created_at) : new Date(0));
          const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : (b.created_at ? new Date(b.created_at) : new Date(0));
          return bTime - aTime;
        });
        setChatList(allChats);
        setHasUnread(allChats.some(u => parseInt(u.unread) > 0));
      } catch (e) {
        setUsersError('Failed to fetch users.');
      } finally {
        setUsersLoading(false);
      }
    })();
  }, []);

  // Add refresh function to window for other components to use
  useEffect(() => {
    const refreshChatList = async () => {
      try {
        const [allUsers, groups] = await Promise.all([
          api.getAllUsersForChat(),
          api.getGroups()
        ]);
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
      } catch (error) {
        console.error('Failed to refresh chat list:', error);
      }
    };

    // Make refresh function available globally
    window.refreshChatList = refreshChatList;

    // Cleanup on unmount
    return () => {
      delete window.refreshChatList;
    };
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
  const emojiList = ['😀','😂','😍','👍','🎉','🙏','😎','','🔥','❤️'];

  // Group creation handlers
  const handleCreateGroup = () => {
    setShowCreateGroupModal(true);
  };

  const handleGroupCreated = (group) => {
    setSuccessMsg('Group created successfully!');
    // Refresh chat list to include the new group using groups endpoint
    (async () => {
      try {
        const [allUsers, groups] = await Promise.all([
          api.getAllUsersForChat(),
          api.getGroups()
        ]);
        const authUser = JSON.parse(sessionStorage.getItem('authUser') || 'null');
        const allUserChats = Array.isArray(allUsers) ? allUsers.map(u => ({ id: u.id, username: u.username, name: u.name, lastMessage: null, unread: 0, type: 'user' })) : [];
        const groupChats = Array.isArray(groups) ? await Promise.all(groups.map(async (g) => {
          let unread = 0;
          try {
            const msgs = await api.getGroupMessages(g.id);
            unread = Array.isArray(msgs) ? msgs.filter(m => !m.read_at && String(m.sender_id) !== String(authUser?.id)).length : 0;
          } catch (_) { unread = 0; }
          return { id: g.id, groupName: g.name, name: g.name, lastMessage: null, unread, created_at: g.created_at, type: 'group' };
        })) : [];
        const allChats = [...allUserChats, ...groupChats].sort((a, b) => {
          const aTime = a.lastMessage?.time ? new Date(a.lastMessage.time) : (a.created_at ? new Date(a.created_at) : new Date(0));
          const bTime = b.lastMessage?.time ? new Date(b.lastMessage.time) : (b.created_at ? new Date(b.created_at) : new Date(0));
          return bTime - aTime;
        });
        setChatList(allChats);
        setHasUnread(allChats.some(u => parseInt(u.unread) > 0));
      } catch (e) {
        setUsersError('Failed to fetch users.');
      }
    })();
  };

  // Calculate total unread messages for the card
  const totalUnread = chatList.reduce((sum, u) => sum + (parseInt(u.unread) || 0), 0);
  // Calculate total chats (users + groups)
  const totalChats = chatList.length;
  // Calculate total groups
  const totalGroups = chatList.filter(chat => chat.type === 'group').length;

  // Debug logging
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
      
      {/* Create Group Button (visible only to Admin1-4 and HODs) */}
      {canCreateGroup && (
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
      )}
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
                // Ensure we get a string value for displayName
                const groupName = typeof chat.groupName === 'string' ? chat.groupName : 
                                 (typeof chat.name === 'string' ? chat.name : 'Unknown Group');
                displayName = groupName || 'Unknown Group';
                initials = displayName ? displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'GR';
                isGroup = true;
                console.log('Final display name:', displayName);
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
                    : navigate(`/admin-messages/${chat.id}`)}
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
      
      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </SideTop>
  );
} 