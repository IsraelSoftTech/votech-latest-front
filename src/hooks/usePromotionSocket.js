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

  // The socket itself only connects once (see the [] effect below), but
  // the caller's callbacks close over render-time state (e.g. the current
  // `run`) and get recreated every render. Without this, the listeners
  // registered on mount would keep calling the FIRST render's versions
  // forever — e.g. PromotionRun.jsx's onCompleted closes over `run`,
  // which is still null on mount, so a stale handler would silently
  // no-op on every real "run completed" event instead of refreshing.
  // Refs always hold the latest callback; the stable wrappers below read
  // through them, so the socket connection itself never needs to reset.
  const callbacksRef = useRef({});
  useEffect(() => {
    callbacksRef.current = { onProgress, onCompleted, onFailed, onInterrupted };
  });

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

    socket.on("promotionProgress", (...args) => callbacksRef.current.onProgress?.(...args));
    socket.on("promotionRunCompleted", (...args) => callbacksRef.current.onCompleted?.(...args));
    socket.on("promotionRunFailed", (...args) => callbacksRef.current.onFailed?.(...args));
    socket.on("promotionRunInterrupted", (...args) => callbacksRef.current.onInterrupted?.(...args));

    return () => {
      socket.disconnect();
    };
  }, []);

  return { isConnected };
}

export default usePromotionSocket;
