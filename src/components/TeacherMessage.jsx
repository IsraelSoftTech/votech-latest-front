import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import './Message.css';
import ReactDOM from 'react-dom';
import api from '../services/api';
import SideTop from './SideTop';

export default function TeacherMessage() {
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

  // Chat view state
  const [chatUser, setChatUser] = useState(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  // Chat list logic
  useEffect(() => {
    if (userId) return; // Don't fetch chat list if in chat view
    setUsersLoading(true);
    setUsersError('');
    api.getChatList()
      .then(list => {
        setChatList(list);
        setHasUnread(list.some(u => u.unread > 0));
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

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(userId, input);
      setMessages(msgs => [...msgs, msg]);
      setInput('');
    } catch (e) {
      alert('Failed to send message');
    }
    setSending(false);
  };

  // Render chat view if userId is present
  if (userId) {
    if (chatLoading) return <SideTop><div style={{ padding: 48, textAlign: 'center' }}>Loading chat...</div></SideTop>;
    if (chatError) return <SideTop><div style={{ padding: 48, color: '#e53e3e', textAlign: 'center' }}>{chatError}</div></SideTop>;
    return (
      <SideTop hasUnread={hasUnread}>
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
                    <div className="bubble">{msg.content}{ticks}</div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row" style={{ padding: 18, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, background: '#f7f8fa' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type a message..."
              style={{ flex: 1, fontSize: 16, border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', outline: 'none' }}
              disabled={sending}
            />
            <button onClick={handleSend} style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 16, marginLeft: 8, cursor: 'pointer' }} disabled={sending}>Send</button>
          </div>
        </div>
      </SideTop>
    );
  }

  // Chat list view (default)
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
            {chatList.map(user => {
              const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : user.username[0].toUpperCase();
              const lastMsg = user.lastMessage?.content || '';
              const lastTime = user.lastMessage?.time ? new Date(user.lastMessage.time) : null;
              const timeStr = lastTime ? lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div
                  key={user.id}
                  className="chat-list-item"
                  onClick={() => navigate(`/teacher-messages/${user.id}`)}
                  style={{ userSelect: 'none', alignItems: 'center', gap: 16 }}
                >
                  <div className="avatar" style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#204080' }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#204080', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</div>
                    <div style={{ color: '#444', fontSize: 15, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.length > 32 ? lastMsg.slice(0,32) + '\u2026' : lastMsg}</div>
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