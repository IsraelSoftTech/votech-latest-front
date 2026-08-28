import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { FaBell, FaCheckDouble, FaCheckCircle, FaExclamationCircle, FaTasks } from "react-icons/fa";
import config from "../config";
import "./AcademicJobNotificationBell.css";

const UNREAD_POLL_MS = 20000;

function iconForType(type) {
  if (type?.includes("failed")) return <FaExclamationCircle className="ajnb-item-icon bad" />;
  if (type?.includes("session_completed")) return <FaCheckDouble className="ajnb-item-icon good" />;
  return <FaCheckCircle className="ajnb-item-icon good" />;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Job notifications for long-running academics background work (report card
// sessions today, promotion runs later — see academic_job_notifications).
// Deliberately separate from the existing NotificationBell (calendar events)
// and MessageIcon (chat) — different domain, own polling, own read state.
export default function AcademicJobNotificationBell() {
  const navigate = useNavigate();
  const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");
  const isAdmin3 = authUser?.role === "Admin3";

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const btnRef = useRef(null);

  const authHeaders = useCallback(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${config.API_V1_URL}/academic-notifications/unread-count`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const body = await res.json();
      setUnreadCount(body?.data?.count || 0);
    } catch (err) {
      // Non-critical indicator, fail silently.
    }
  }, [authHeaders]);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${config.API_V1_URL}/academic-notifications`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const body = await res.json();
      setNotifications(body?.data || []);
    } catch (err) {
      // Non-critical, leave list as-is.
    } finally {
      setLoadingList(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!isAdmin3) return undefined;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [isAdmin3, fetchUnreadCount]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) && !e.target.closest(".ajnb-panel")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!isAdmin3) return null;

  const handleToggle = () => {
    if (!open && btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
      fetchList();
    }
    setOpen((v) => !v);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${config.API_V1_URL}/academic-notifications/mark-all-read`, {
        method: "POST",
        headers: authHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      // Non-critical, user can retry.
    }
  };

  const handleItemClick = async (n) => {
    if (!n.read_at) {
      try {
        await fetch(`${config.API_V1_URL}/academic-notifications/${n.id}/read`, {
          method: "POST",
          headers: authHeaders(),
        });
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Non-critical, deep link still navigates.
      }
    }
    setOpen(false);
    if (n.deep_link) navigate(n.deep_link);
  };

  return (
    <>
      <button
        ref={btnRef}
        className="ajnb-bell-btn"
        onClick={handleToggle}
        title="Job Notifications"
        aria-label="Job Notifications"
      >
        <FaTasks />
        {unreadCount > 0 && <span className="ajnb-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open &&
        anchorRect &&
        ReactDOM.createPortal(
          <div
            className="ajnb-panel"
            style={{
              top: anchorRect.bottom + 8,
              right: Math.max(12, window.innerWidth - anchorRect.right),
            }}
          >
            <div className="ajnb-panel-header">
              <span>Job Notifications</span>
              {unreadCount > 0 && (
                <button className="ajnb-mark-all-btn" onClick={handleMarkAllRead}>
                  <FaCheckDouble /> Mark all read
                </button>
              )}
            </div>
            <div className="ajnb-panel-list">
              {loadingList ? (
                <div className="ajnb-empty">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="ajnb-empty">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    className={`ajnb-item ${!n.read_at ? "unread" : ""}`}
                    onClick={() => handleItemClick(n)}
                  >
                    {iconForType(n.type)}
                    <span className="ajnb-item-body">
                      <span className="ajnb-item-title">{n.title}</span>
                      {n.message && <span className="ajnb-item-message">{n.message}</span>}
                      <span className="ajnb-item-time">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="ajnb-item-dot" />}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
