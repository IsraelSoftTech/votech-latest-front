import { io } from "socket.io-client";
import config from "../config";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Get or create socket connection
   * @returns {Socket} Socket instance
   */
  getSocket() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    if (!token) {
      console.warn("⚠️ No token found, cannot connect to WebSocket");
      return null;
    }

    // Determine WebSocket URL based on API URL
    let socketUrl;
    if (config.API_URL.includes("localhost") || config.API_URL.includes("192.168")) {
      // Development - extract base URL
      const baseUrl = config.API_URL.replace("/api", "");
      socketUrl = baseUrl;
    } else if (config.API_URL.includes("api.votechs7academygroup.com")) {
      // Production
      socketUrl = "https://api.votechs7academygroup.com";
    } else {
      // Fallback
      const baseUrl = config.API_URL.replace("/api", "");
      socketUrl = baseUrl;
    }

    console.log("🔌 Connecting to WebSocket:", socketUrl);

    this.socket = io(socketUrl, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket disconnected:", reason);
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn("⚠️ Max reconnection attempts reached");
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log("🔌 WebSocket disconnected");
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  connected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;

