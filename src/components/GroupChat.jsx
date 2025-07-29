import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaPaperclip, FaTimes, FaFilePdf, FaImage, FaUsers } from 'react-icons/fa';
import SideTop from './SideTop';

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));

  // Determine if on a group chat route for active tab
  const location = window.location;
  const isGroupChat = location.pathname.includes('group-messages');

  useEffect(() => {
    api.getGroups().then(groups => {
      const g = groups.find(gr => String(gr.id) === String(groupId));
      setGroup(g);
    });
    api.getGroupParticipants(groupId).then(setParticipants);
    fetchMessages();
    // Mark group messages as read
    api.markMessagesReadGroup && api.markMessagesReadGroup(groupId).then(() => {
      // Optionally refresh chat list to update unread count
      if (typeof window.refreshChatList === 'function') window.refreshChatList();
    }).catch(() => {});
    // eslint-disable-next-line
  }, [groupId]);

  const fetchMessages = () => {
    api.getGroupMessages(groupId).then(setMessages);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only images (JPEG, PNG, GIF) and PDF files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setSelectedFile(file);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || sending) return;
    setSending(true);
    setError('');
    try {
      let msg;
      if (selectedFile) {
        msg = await api.sendGroupMessageWithFile(groupId, input, selectedFile);
      } else {
        msg = await api.sendGroupMessage(groupId, input);
      }
      setMessages(msgs => [...msgs, msg]);
      setInput('');
      removeFile();
    } catch (e) {
      setError('Failed to send message');
    }
    setSending(false);
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteGroup(groupId);
      setDeleting(false);
      // Redirect to messages page (adjust path as needed)
      navigate('/admin-messages');
    } catch (e) {
      setError('Failed to delete group');
      setDeleting(false);
    }
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;
    // On mobile, make the preview sticky above the input
    const isMobile = window.innerWidth <= 700;
    return (
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        bottom: isMobile ? 70 : undefined,
        left: isMobile ? 0 : undefined,
        width: isMobile ? '100vw' : undefined,
        zIndex: isMobile ? 1001 : undefined,
        background: isMobile ? '#fff' : '#f9f9f9',
        borderTop: isMobile ? '1px solid #eee' : undefined,
        boxShadow: isMobile ? '0 -2px 8px rgba(32,64,128,0.07)' : undefined,
        display: 'inline-block',
        marginBottom: isMobile ? 0 : 10,
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 8,
        maxWidth: isMobile ? '100vw' : 320,
      }}>
        <button
          onClick={removeFile}
          style={{ position: 'absolute', top: -8, right: -8, background: '#e53e3e', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
        >
          <FaTimes />
        </button>
        {filePreview ? (
          <img src={filePreview} alt="Preview" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4 }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaFilePdf style={{ color: '#e53e3e', fontSize: 24 }} />
            <span>{selectedFile.name}</span>
          </div>
        )}
      </div>
    );
  };

  const renderMessageContent = (msg) => (
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', maxWidth: 300 }}
              onClick={() => window.open(`http://localhost:5000${msg.file_url}`, '_blank')}
            >
              <FaFilePdf style={{ color: '#e53e3e', fontSize: 20 }} />
              <span style={{ fontSize: 14, color: '#333' }}>{msg.file_name || 'Document'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <SideTop hasUnread={true} activeTab="Messages">
      <div style={{ maxWidth: 700, margin: '32px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', minHeight: 480, display: 'flex', flexDirection: 'column', height: '70vh', width: '100%', padding: '0 18px' }}>
        <div className="chat-space-header" style={{ padding: 18, borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#f7f8fa', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 16 }}>
          <FaUsers style={{ color: '#204080', fontSize: 22 }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>{group?.name || 'Group Chat'}</div>
          <div style={{ marginLeft: 16, color: '#888', fontSize: 14, flex: 1 }}>
            {participants.length > 0 && (
              <span>Participants: {participants.map(p => p.name || p.username).join(', ')}</span>
            )}
          </div>
          {/* Show delete button if current user is group creator */}
          {group && authUser && group.creator_id === authUser.id && (
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginLeft: 8 }}
            >
              {deleting ? 'Deleting...' : 'Delete Group'}
            </button>
          )}
        </div>
        <div className="chat-messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>No messages yet. Say hello!</div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === authUser.id;
              return (
                <div key={msg.id || idx} className={`chat-message${isMe ? ' me' : ''}`}> 
                  <div className="bubble">
                    {renderMessageContent(msg)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input-row" style={{ padding: 18, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, background: '#f7f8fa', position: window.innerWidth <= 700 ? 'fixed' : 'static', bottom: window.innerWidth <= 700 ? 0 : undefined, left: window.innerWidth <= 700 ? 0 : undefined, width: window.innerWidth <= 700 ? '100vw' : undefined, zIndex: window.innerWidth <= 700 ? 1002 : undefined, boxShadow: window.innerWidth <= 700 ? '0 -2px 8px rgba(32,64,128,0.07)' : undefined }}>
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
              style={{ background: '#f0f0f0', color: '#666', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={sending}
            >
              <FaPaperclip />
            </button>
            <button onClick={handleSend} style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} disabled={sending}>Send</button>
          </div>
        </div>
        {error && <div style={{ color: '#e53e3e', textAlign: 'center', marginTop: 8 }}>{error}</div>}
      </div>
    </SideTop>
  );
} 