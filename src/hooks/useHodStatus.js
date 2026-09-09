import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";
import config from "../config";

const EMPTY = {
  hod_status: "none",
  is_hod: false,
  hod_id: null,
  department_name: null,
  department_id: null,
};

function readStoredHod() {
  try {
    const user = JSON.parse(sessionStorage.getItem("authUser") || "null") || {};
    return {
      hod_status: user.hod_status || "none",
      is_hod: user.is_hod === true || user.hod_status === "active",
      hod_id: user.hod_id || null,
      department_name: user.hod_department_name || null,
      department_id: user.hod_department_id || null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function persistHodStatus(hod) {
  const assignment = {
    hod_status: hod?.hod_status || "none",
    is_hod: hod?.is_hod === true || hod?.hod_status === "active",
    hod_id: hod?.hod_id || null,
    hod_department_name: hod?.department_name || hod?.hod_department_name || null,
    hod_department_id: hod?.department_id || hod?.hod_department_id || null,
  };
  try {
    const raw = sessionStorage.getItem("authUser");
    const user = raw ? JSON.parse(raw) : {};
    const unchanged =
      user.hod_status === assignment.hod_status &&
      user.is_hod === assignment.is_hod &&
      String(user.hod_id || "") === String(assignment.hod_id || "") &&
      user.hod_department_name === assignment.hod_department_name &&
      String(user.hod_department_id || "") === String(assignment.hod_department_id || "");
    if (unchanged && user.id) {
      return assignment;
    }
    const next = { ...user, ...assignment };
    sessionStorage.setItem("authUser", JSON.stringify(next));
    if (api.user) api.user = { ...api.user, ...assignment };
    window.dispatchEvent(new Event("authUserChanged"));
    window.dispatchEvent(new CustomEvent("hod-status-updated", { detail: assignment }));
  } catch (_) {
    /* ignore storage errors */
  }
  return assignment;
}

function resolveSocketBaseUrl() {
  if (config.API_URL.includes("localhost") || config.API_URL.includes("192.168")) {
    return config.API_URL.replace("/api", "");
  }
  if (config.API_URL.includes("api.votechs7academygroup.com")) {
    return "https://api.votechs7academygroup.com";
  }
  return config.API_URL.replace("/api", "");
}

export default function useHodStatus() {
  const [hod, setHod] = useState(readStoredHod);

  const apply = (data) => {
    const next = persistHodStatus(data);
    setHod({
      hod_status: next.hod_status,
      is_hod: next.is_hod,
      hod_id: next.hod_id,
      department_name: next.hod_department_name,
      department_id: next.hod_department_id,
    });
  };

  const refresh = async () => {
    try {
      const data = await api.getMyHodStatus();
      apply(data);
    } catch (_) {
      /* keep last known status */
    }
  };

  useEffect(() => {
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onAuth = () => setHod(readStoredHod());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("authUserChanged", onAuth);
    const interval = setInterval(refresh, 45000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("authUserChanged", onAuth);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return undefined;

    const socket = io(`${resolveSocketBaseUrl()}/app`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socket.on("hodStatusUpdate", (data) => apply(data));
    return () => socket.disconnect();
  }, []);

  return { ...hod, refresh };
}
