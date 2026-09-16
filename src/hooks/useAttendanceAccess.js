import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const CACHE_KEY = "attendanceAccess";

// Cached so the sidebar renders the Attendance item on the first paint
// instead of popping it in once the check returns.
function readCached() {
  try {
    return sessionStorage.getItem(CACHE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCached(value) {
  try {
    sessionStorage.setItem(CACHE_KEY, value ? "true" : "false");
  } catch {
    /* ignore storage errors */
  }
}

export default function useAttendanceAccess() {
  const [hasAccess, setHasAccess] = useState(readCached);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getMyAttendanceAccess();
      const granted = data?.has_access === true;
      writeCached(granted);
      setHasAccess(granted);
    } catch {
      /* keep the last known answer */
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(refresh, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  return { hasAccess, refresh };
}
