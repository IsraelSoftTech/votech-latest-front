import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FaArrowLeft,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaUsers,
  FaPlus,
  FaFilePdf,
  FaFileAlt,
  FaSearch,
} from 'react-icons/fa';
import SideTop from '../SideTop';
import CreateGroupModal from '../CreateGroupModal';
import SuccessMessage from '../SuccessMessage';
import api from '../../services/api';
import { prepareChatMedia } from '../../utils/messageMedia';
import {
  CHAT_EMOJIS,
  formatChatTime,
  formatMessageTime,
  getInitials,
  normalizeMessage,
  resolveMediaUrl,
} from '../../utils/chatHelpers';
import './ChatHub.css';

const POLL_MS = 3000;
const LIST_POLL_MS = 15000;

export default function ChatHub({
  messagesBase = '/admin-messages',
  groupMessagesBase = '/admin-group-messages',
  userChatBase = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const authUser = JSON.parse(sessionStorage.getItem('authUser') || '{}');

  const userChatPath = userChatBase || messagesBase;
  const activeUserId = params.userId || null;
  const activeGroupId = params.groupId || null;
  const isThreadOpen = Boolean(activeUserId || activeGroupId);

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [canCreateGroup, setCanCreateGroup] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const activeConvo = useMemo(() => {
    if (activeGroupId) {
      return conversations.find(
        (c) => c.type === 'group' && String(c.id) === String(activeGroupId)
      );
    }
    if (activeUserId) {
      return conversations.find(
        (c) => c.type === 'user' && String(c.id) === String(activeUserId)
      );
    }
    return null;
  }, [conversations, activeGroupId, activeUserId]);

  const loadConversations = useCallback(async () => {
    try {
      const [users, groups, chatList, unreadRows] = await Promise.all([
        api.getAllUsersForChat().catch(() => []),
        api.getGroups().catch(() => []),
        api.getChatList().catch(() => []),
        api.getUnreadCountsBySender().catch(() => []),
      ]);

      const unreadMap = {};
      (Array.isArray(unreadRows) ? unreadRows : []).forEach((row) => {
        unreadMap[row.sender_id] = parseInt(row.unread_count, 10) || 0;
      });

      const chatMap = {};
      (Array.isArray(chatList) ? chatList : []).forEach((c) => {
        chatMap[c.id] = c;
      });

      const userConvos = (Array.isArray(users) ? users : []).map((u) => {
        const meta = chatMap[u.id] || {};
        return {
          id: u.id,
          type: 'user',
          name: u.name || u.username,
          username: u.username,
          lastMessage: meta.last_message || null,
          lastTime: meta.last_message_time || null,
          unread: unreadMap[u.id] || 0,
        };
      });

      const groupConvos = await Promise.all(
        (Array.isArray(groups) ? groups : []).map(async (g) => {
          let unread = 0;
          let lastMessage = null;
          let lastTime = g.created_at;
          try {
            const msgs = await api.getGroupMessages(g.id);
            if (Array.isArray(msgs) && msgs.length > 0) {
              const last = msgs[msgs.length - 1];
              lastMessage = last.content || (last.file_name ? `📎 ${last.file_name}` : '');
              lastTime = last.created_at;
              unread = msgs.filter(
                (m) => !m.read_at && String(m.sender_id) !== String(authUser?.id)
              ).length;
            }
          } catch (_) {
            /* ignore */
          }
          return {
            id: g.id,
            type: 'group',
            name: g.name,
            creator_id: g.creator_id,
            lastMessage,
            lastTime,
            unread,
          };
        })
      );

      const merged = [...userConvos, ...groupConvos].sort((a, b) => {
        const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0;
        const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0;
        return tb - ta;
      });

      setConversations(merged);
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setListLoading(false);
    }
  }, [authUser?.id]);

  const loadThread = useCallback(async () => {
    if (activeGroupId) {
      const [msgs, parts] = await Promise.all([
        api.getGroupMessages(activeGroupId).catch(() => []),
        api.getGroupParticipants(activeGroupId).catch(() => []),
      ]);
      setMessages(Array.isArray(msgs) ? msgs.map(normalizeMessage) : []);
      setParticipants(Array.isArray(parts) ? parts : []);
      api.markMessagesReadGroup(activeGroupId).catch(() => {});
      window.dispatchEvent(new Event('messageReceived'));
      return;
    }
    if (activeUserId) {
      const msgs = await api.getMessages(activeUserId).catch(() => []);
      setMessages(Array.isArray(msgs) ? msgs.map(normalizeMessage) : []);
      setParticipants([]);
      api.markMessagesRead(activeUserId).catch(() => {});
      window.dispatchEvent(new Event('messageReceived'));
    }
  }, [activeGroupId, activeUserId]);

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, LIST_POLL_MS);
    return () => clearInterval(id);
  }, [loadConversations]);

  useEffect(() => {
    const determineGroupPermission = async () => {
      try {
        const role = authUser?.role;
        if (['Admin1', 'Admin2', 'Admin3', 'Admin4'].includes(role)) {
          setCanCreateGroup(true);
          return;
        }
        const hods = await api.getHODs();
        setCanCreateGroup(
          Array.isArray(hods) && hods.some((h) => String(h.hod_user_id) === String(authUser?.id))
        );
      } catch {
        setCanCreateGroup(false);
      }
    };
    determineGroupPermission();
  }, [authUser?.id, authUser?.role]);

  useEffect(() => {
    if (!isThreadOpen) {
      setMessages([]);
      return undefined;
    }
    loadThread();
    const id = setInterval(loadThread, POLL_MS);
    return () => clearInterval(id);
  }, [isThreadOpen, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    window.refreshChatList = loadConversations;
    return () => {
      delete window.refreshChatList;
    };
  }, [loadConversations]);

  const filteredConvos = useMemo(() => {
    let list = conversations;
    if (tab === 'groups') list = list.filter((c) => c.type === 'group');
    if (tab === 'chats') list = list.filter((c) => c.type === 'user');
    if (tab === 'unread') list = list.filter((c) => (c.unread || 0) > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.username && c.username.toLowerCase().includes(q))
      );
    }
    return list;
  }, [conversations, tab, search]);

  const openUser = (id) => navigate(`${userChatPath}/${id}`);
  const openGroup = (id) => navigate(`${groupMessagesBase}/${id}`);
  const goBack = () => navigate(messagesBase);

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      setCompressing(true);
      const prepared = await prepareChatMedia(file);
      setSelectedFile(prepared);
      if (prepared.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(prepared));
      } else if (prepared.type.startsWith('video/')) {
        setFilePreview(URL.createObjectURL(prepared));
      } else {
        setFilePreview(null);
      }
    } catch (err) {
      setError(err.message || 'Could not prepare file');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
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
      if (activeGroupId) {
        msg = selectedFile
          ? await api.sendGroupMessageWithFile(activeGroupId, input, selectedFile)
          : await api.sendGroupMessage(activeGroupId, input);
      } else if (activeUserId) {
        msg = selectedFile
          ? await api.sendMessageWithFile(activeUserId, input, selectedFile)
          : await api.sendMessage(activeUserId, input);
      }
      const normalized = normalizeMessage(msg);
      if (normalized) {
        setMessages((prev) => [...prev, normalized]);
      }
      setInput('');
      clearFile();
      setShowEmoji(false);
      loadConversations();
      window.dispatchEvent(new Event('messageSent'));
    } catch (e) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const renderAttachment = (msg) => {
    if (!msg.file_url) return null;
    const url = resolveMediaUrl(msg.file_url);
    const isImage = msg.file_type?.startsWith('image/');
    const isVideo = msg.file_type?.startsWith('video/');

    if (isImage) {
      return (
        <div className="wa-msg-media">
          <img src={url} alt={msg.file_name || 'Image'} onClick={() => window.open(url, '_blank')} />
        </div>
      );
    }
    if (isVideo) {
      return (
        <div className="wa-msg-media">
          <video src={url} controls playsInline preload="metadata" />
        </div>
      );
    }
    return (
      <div
        className="wa-file-chip"
        onClick={() => window.open(url, '_blank')}
        onKeyDown={(e) => e.key === 'Enter' && window.open(url, '_blank')}
        role="button"
        tabIndex={0}
      >
        {msg.file_type?.includes('pdf') ? <FaFilePdf /> : <FaFileAlt />}
        <span>{msg.file_name || 'Attachment'}</span>
      </div>
    );
  };

  const threadTitle = activeConvo?.name || (activeGroupId ? 'Group' : 'Chat');
  const threadSub = activeGroupId
    ? participants.map((p) => p.name || p.username).join(', ')
    : activeConvo?.username || '';

  return (
    <SideTop activeTab="Messages">
      {successMsg && <SuccessMessage message={successMsg} onClose={() => setSuccessMsg('')} />}
      <div className="wa-chat-page">
        <div className={`wa-chat-shell${isThreadOpen ? ' thread-open' : ''}`}>
          {/* Sidebar */}
          <aside className="wa-sidebar">
            <div className="wa-sidebar-head">
              <h2 className="wa-sidebar-title">Messages</h2>
              <div className="wa-sidebar-actions">
                {canCreateGroup && (
                  <button type="button" className="wa-btn-primary" onClick={() => setShowCreateGroup(true)}>
                    <FaUsers /> New Group
                  </button>
                )}
              </div>
            </div>
            <div className="wa-search-wrap">
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: 12, top: 12, color: '#8696a0' }} />
                <input
                  className="wa-search-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search chats..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="wa-tabs">
              {['all', 'chats', 'groups', 'unread'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`wa-tab${tab === t ? ' active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="wa-convo-list">
              {listLoading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#667781' }}>Loading…</div>
              ) : filteredConvos.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#667781' }}>No conversations</div>
              ) : (
                filteredConvos.map((c) => {
                  const isActive =
                    (c.type === 'user' && String(c.id) === String(activeUserId)) ||
                    (c.type === 'group' && String(c.id) === String(activeGroupId));
                  return (
                    <div
                      key={`${c.type}-${c.id}`}
                      className={`wa-convo-item${isActive ? ' active' : ''}`}
                      onClick={() => (c.type === 'group' ? openGroup(c.id) : openUser(c.id))}
                      onKeyDown={(e) => e.key === 'Enter' && (c.type === 'group' ? openGroup(c.id) : openUser(c.id))}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={`wa-avatar${c.type === 'group' ? ' group' : ''}`}>
                        {c.type === 'group' ? <FaUsers /> : getInitials(c.name)}
                      </div>
                      <div className="wa-convo-body">
                        <div className="wa-convo-top">
                          <span className="wa-convo-name">{c.name}</span>
                          <span className="wa-convo-time">{formatChatTime(c.lastTime)}</span>
                        </div>
                        <div className="wa-convo-preview">{c.lastMessage || 'Start a conversation'}</div>
                      </div>
                      {(c.unread || 0) > 0 && <span className="wa-unread-badge">{c.unread}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Thread */}
          <section className="wa-thread">
            {!isThreadOpen ? (
              <div className="wa-thread-empty">
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
                  <h3 style={{ margin: '0 0 8px', color: '#41525d' }}>Votech Messages</h3>
                  <p style={{ margin: 0, maxWidth: 320 }}>
                    Select a chat or group to start messaging. Send text, emojis, photos, videos, and files.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <header className="wa-thread-head">
                  <button type="button" className="wa-back-btn" onClick={goBack} aria-label="Back">
                    <FaArrowLeft />
                  </button>
                  <div className={`wa-avatar${activeGroupId ? ' group' : ''}`} style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
                    {activeGroupId ? <FaUsers /> : getInitials(threadTitle)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wa-thread-title">{threadTitle}</div>
                    {threadSub && <div className="wa-thread-sub">{threadSub}</div>}
                  </div>
                  {activeGroupId && activeConvo?.creator_id === authUser?.id && (
                    <button
                      type="button"
                      className="wa-btn-secondary"
                      style={{ color: '#e53e3e', borderColor: '#e53e3e' }}
                      onClick={async () => {
                        if (!window.confirm('Delete this group?')) return;
                        await api.deleteGroup(activeGroupId);
                        navigate(messagesBase);
                        loadConversations();
                      }}
                    >
                      Delete
                    </button>
                  )}
                </header>

                <div className="wa-messages">
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#667781', marginTop: 40 }}>
                      No messages yet. Say hello! 👋
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = String(msg.sender_id) === String(authUser?.id);
                      return (
                        <div key={msg.id || idx} className={`wa-msg-row ${isMe ? 'me' : 'other'}`}>
                          <div className="wa-bubble">
                            {activeGroupId && !isMe && (
                              <div className="wa-sender-name">
                                {msg.sender_name || msg.sender_username || 'User'}
                              </div>
                            )}
                            {msg.content && <div className="wa-msg-text">{msg.content}</div>}
                            {renderAttachment(msg)}
                            <div className="wa-msg-meta">
                              <span className="wa-msg-time">{formatMessageTime(msg.created_at)}</span>
                              {isMe && !activeGroupId && (
                                <span className={`wa-ticks${msg.read_at ? ' read' : ''}`}>✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="wa-composer-wrap">
                  {compressing && <div className="wa-compressing">Compressing media for fast send…</div>}
                  {error && <div style={{ color: '#e53e3e', fontSize: '0.85rem', marginBottom: 6 }}>{error}</div>}
                  {selectedFile && (
                    <div className="wa-attach-preview">
                      <button type="button" className="wa-attach-remove" onClick={clearFile} aria-label="Remove">
                        ×
                      </button>
                      {filePreview && selectedFile.type.startsWith('image/') && (
                        <img src={filePreview} alt="Preview" />
                      )}
                      {filePreview && selectedFile.type.startsWith('video/') && (
                        <video src={filePreview} muted playsInline />
                      )}
                      {!filePreview && (
                        <div className="wa-file-chip">
                          <FaFileAlt /> {selectedFile.name}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="wa-composer">
                    <div className="wa-composer-tools">
                      <button
                        type="button"
                        className="wa-icon-btn"
                        onClick={() => setShowEmoji((v) => !v)}
                        aria-label="Emoji"
                      >
                        <FaSmile />
                      </button>
                      <button
                        type="button"
                        className="wa-icon-btn"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Attach file"
                      >
                        <FaPaperclip />
                      </button>
                    </div>
                    <div className="wa-composer-input-wrap">
                      {showEmoji && (
                        <div className="wa-emoji-panel">
                          {CHAT_EMOJIS.map((em) => (
                            <button key={em} type="button" className="wa-emoji-btn" onClick={() => insertEmoji(em)}>
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                      <textarea
                        ref={inputRef}
                        className="wa-composer-input"
                        rows={1}
                        placeholder="Type a message"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={sending}
                      />
                    </div>
                    <button
                      type="button"
                      className="wa-send-btn"
                      onClick={handleSend}
                      disabled={sending || (!input.trim() && !selectedFile)}
                      aria-label="Send"
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                    style={{ display: 'none' }}
                    onChange={handleFilePick}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={() => {
          setSuccessMsg('Group created!');
          loadConversations();
        }}
      />
    </SideTop>
  );
}
