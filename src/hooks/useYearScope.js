import { useEffect, useMemo, useState } from "react";
import api from "../components/marks-module/utils/api";

// Shared year-scoping logic for any page/modal whose data now carries an
// academic_year_id (class-subject assignments, class master assignments,
// and anything else built on top of yearLock.util.js's write-lock). Mirrors
// the backend's own rule exactly (assertYearWritable / hasLiveGrant in
// yearLock.util.js): the active year is always editable, an archived year
// is editable only for an Admin3 user holding a live grant for it, read
// only otherwise — including for Admin1, who governs grants but does not
// get a standing bypass.
export function useYearScope() {
  const authUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("authUser") || "{}");
    } catch {
      return {};
    }
  }, []);
  const role = authUser.role;

  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveGrantYearIds, setLiveGrantYearIds] = useState(new Set());
  const [selectedYearId, setSelectedYearId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/academic-years");
        const list = res.data?.data || [];
        if (cancelled) return;
        setYears(list);
        const active = list.find((y) => y.status === "active");
        setSelectedYearId(active?.id || list[0]?.id || null);
      } catch {
        if (!cancelled) setYears([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (role !== "Admin3") return;
    let cancelled = false;
    api
      .get("/academic-year-grants/mine")
      .then((res) => {
        if (cancelled) return;
        const ids = new Set(
          (res.data?.data || []).map((g) => g.academic_year_id)
        );
        setLiveGrantYearIds(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [role]);

  const selectedYear = years.find((y) => y.id === selectedYearId) || null;
  const activeYear = years.find((y) => y.status === "active") || null;

  const isEditable = useMemo(() => {
    if (!selectedYear) return false;
    if (selectedYear.status === "active") return true;
    return role === "Admin3" && liveGrantYearIds.has(selectedYear.id);
  }, [selectedYear, role, liveGrantYearIds]);

  const editableReason = useMemo(() => {
    if (!selectedYear) return "";
    if (selectedYear.status === "active") return "This is the active academic year.";
    if (isEditable) return "You have temporary access granted to this archived year.";
    return "This academic year is archived and read-only. An Admin1 must grant access before it can be edited.";
  }, [selectedYear, isEditable]);

  return {
    years,
    loading,
    role,
    selectedYearId,
    setSelectedYearId,
    selectedYear,
    activeYear,
    isEditable,
    editableReason,
  };
}
