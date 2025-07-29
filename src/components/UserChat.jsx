import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperclip, FaTimes, FaFilePdf, FaImage } from 'react-icons/fa';
import api from '../services/api';
import './Message.css';
import SideTop from './SideTop';

export default function UserChat() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  // For now, always show the red dot if there are unread messages (improve later with context or state)
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

  // Fetch messages
  useEffect(() => {
    if (!userId) return;
    api.getMessages(userId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [userId]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!userId) return;
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

  if (loading) return <SideTop><div style={{ padding: 48, textAlign: 'center' }}>Loading chat...</div></SideTop>;
  if (error) return <SideTop><div style={{ padding: 48, color: '#e53e3e', textAlign: 'center' }}>{error}</div></SideTop>;

  return (
    <SideTop hasUnread={hasUnread} activeTab="Messages">
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