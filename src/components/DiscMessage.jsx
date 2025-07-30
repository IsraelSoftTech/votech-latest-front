import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import api from '../services/api';
import DisciplineSideTop from './DisciplineSideTop';

export default function DiscMessage() {
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
  // Remove all event-related state, fetching, and UI

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 700);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setUsersLoading(true);
    setUsersError('');
    Promise.all([
      api.getAllUsersForChat(),
      api.getChatList()
    ])
      .then(([allUsers, chatListRaw]) => {
        console.log('DiscMessage - Raw chat list data:', chatListRaw);
        console.log('DiscMessage - Group chats from raw data:', chatListRaw.filter(c => c.type === 'group'));
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
      .catch(() => setUsersError('Failed to fetch users.'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    let interval = setInterval(() => {
      api.getChatList()
        .then(list => setHasUnread(list.some(u => u.unread > 0)))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalUnread = chatList.reduce((sum, u) => sum + (parseInt(u.unread) || 0), 0);
  // Remove all event-related state, fetching, and UI

  return (
    <DisciplineSideTop hasUnread={hasUnread} activeTab="Messages">
      <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Unread Messages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#e53e3e', marginTop: 8 }}>{totalUnread}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(32,64,128,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#204080' }}>Upcoming Events</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#204080', marginTop: 8 }}>-</div>
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
                console.log('DiscMessage - Group chat data:', chat);
                console.log('DiscMessage - chat.groupName:', chat.groupName);
                console.log('DiscMessage - chat.name:', chat.name);
                // Ensure we get a string value for displayName
                const groupName = typeof chat.groupName === 'string' ? chat.groupName : 
                                 (typeof chat.name === 'string' ? chat.name : 'Unknown Group');
                displayName = groupName || 'Unknown Group';
                initials = displayName ? displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'GR';
                isGroup = true;
                console.log('DiscMessage - Final display name:', displayName);
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
                    : navigate(`/discipline-messages/${chat.id}`)}
                  style={{ userSelect: 'none', alignItems: 'center', gap: 16 }}
                >
                  <div className="avatar" style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#204080' }}>
                    {isGroup ? <FaEnvelope /> : initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#204080', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                    <div style={{ color: '#444', fontSize: 15, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.length > 32 ? lastMsg.slice(0,32) + '…' : lastMsg}</div>
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
    </DisciplineSideTop>
  );
} 