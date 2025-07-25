import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Message.css';
import DisciplineSideTop from './DisciplineSideTop';

export default function DiscUserChat() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getAllUsersForChat()
      .then(users => {
        const found = users.find(u => String(u.id) === String(userId));
        if (found) setUser(found);
        else setError('User not found');
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    api.getMessages(userId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
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

  if (loading) return <DisciplineSideTop><div style={{ padding: 48, textAlign: 'center' }}>Loading chat...</div></DisciplineSideTop>;
  if (error) return <DisciplineSideTop><div style={{ padding: 48, color: '#e53e3e', textAlign: 'center' }}>{error}</div></DisciplineSideTop>;

  return (
    <DisciplineSideTop hasUnread={hasUnread}>
      <div style={{ maxWidth: 700, margin: '32px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', minHeight: 480, display: 'flex', flexDirection: 'column', height: '70vh', width: '100%', padding: '0 18px' }}>
        <div className="chat-space-header" style={{ padding: 18, borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#f7f8fa', borderBottom: '1px solid #eee' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#204080', fontWeight: 600, fontSize: 18, marginRight: 12, cursor: 'pointer' }}>{'←'}</button>
          <div className="name">{user?.username}</div>
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
                  ticks = <span style={{ color: '#2196f3', marginLeft: 8, fontSize: 16 }}>✓✓</span>; // blue
                } else {
                  ticks = <span style={{ color: '#222', marginLeft: 8, fontSize: 16 }}>✓✓</span>; // black
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
    </DisciplineSideTop>
  );
} 