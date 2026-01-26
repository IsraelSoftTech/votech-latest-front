import { useEffect, useRef, useState } from "react";
import socketService from "../services/socket.service";

/**
 * Custom hook for WebSocket connections
 * @param {Object} options - Configuration options
 * @param {Function} options.onUnreadCountUpdate - Callback for unread count updates
 * @param {Function} options.onEventsCountUpdate - Callback for events count updates
 * @param {Function} options.onPayslipCountUpdate - Callback for payslip count updates
 * @returns {Object} Socket connection state and methods
 */
export function useWebSocket({ onUnreadCountUpdate, onEventsCountUpdate, onPayslipCountUpdate } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    if (!token) {
      console.warn("⚠️ No token found, skipping WebSocket connection");
      return;
    }

    const socket = socketService.getSocket();
    socketRef.current = socket;

    if (!socket) {
      return;
    }

    // Update connection state
    const updateConnectionState = () => {
      setIsConnected(socket.connected);
    };

    // Set initial state
    updateConnectionState();

    // Listen for connection events
    socket.on("connect", () => {
      updateConnectionState();
      console.log("✅ WebSocket connected in hook");
    });

    socket.on("disconnect", () => {
      updateConnectionState();
      console.log("❌ WebSocket disconnected in hook");
    });

    // Listen for data updates
    if (onUnreadCountUpdate) {
      socket.on("unreadCountUpdate", (data) => {
        console.log("📨 Unread count update:", data);
        onUnreadCountUpdate(data.count);
      });
    }

    if (onEventsCountUpdate) {
      socket.on("eventsCountUpdate", (data) => {
        console.log("📅 Events count update:", data);
        onEventsCountUpdate(data.count);
      });
    }

    if (onPayslipCountUpdate) {
      socket.on("payslipCountUpdate", (data) => {
        console.log("💰 Payslip count update:", data);
        onPayslipCountUpdate(data.count);
      });
    }

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        if (onUnreadCountUpdate) socket.off("unreadCountUpdate");
        if (onEventsCountUpdate) socket.off("eventsCountUpdate");
        if (onPayslipCountUpdate) socket.off("payslipCountUpdate");
      }
    };
  }, [onUnreadCountUpdate, onEventsCountUpdate, onPayslipCountUpdate]);

  return {
    isConnected,
    socket: socketRef.current,
  };
}

