import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import config from "../config";

// Dedicated connection to the backend's /app namespace (see
// desktop-module/socket/index.js), kept separate from the existing
// services/socket.service.js, which connects to the default namespace
// that nothing on the server actually emits on. Not reusing that path so
// this feature doesn't inherit its pre-existing dead-connection state.
function resolveSocketBaseUrl() {
  if (config.API_URL.includes("localhost") || config.API_URL.includes("192.168")) {
    return config.API_URL.replace("/api", "");
  }
  if (config.API_URL.includes("api.votechs7academygroup.com")) {
    return "https://api.votechs7academygroup.com";
  }
  return config.API_URL.replace("/api", "");
}

/**
 * Subscribes to live promotion run progress over WebSocket, with the
 * caller responsible for polling as a fallback when `isConnected` is
 * false (e.g. on a flaky connection). This hook only handles the push
 * side.
 */
export function usePromotionSocket({
  onProgress,
  onCompleted,
  onFailed,
  onInterrupted,
} = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return undefined;

    const socket = io(`${resolveSocketBaseUrl()}/app`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", () => setIsConnected(false));

    if (onProgress) socket.on("promotionProgress", onProgress);
    if (onCompleted) socket.on("promotionRunCompleted", onCompleted);
    if (onFailed) socket.on("promotionRunFailed", onFailed);
    if (onInterrupted) socket.on("promotionRunInterrupted", onInterrupted);

    return () => {
      socket.disconnect();
    };
  }, []);

  return { isConnected };
}

export default usePromotionSocket;
