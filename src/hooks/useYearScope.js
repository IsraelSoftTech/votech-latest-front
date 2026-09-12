import { useEffect, useMemo, useState } from "react";
import api from "../components/marks-module/utils/api";

// Shared year-scoping logic for any page/modal whose data carries an
// academic_year_id (class-subject assignments, class master assignments,
// and anything else built on yearLock.util.js). The active year is
// editable; archived years are read-only.
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

  const selectedYear = years.find((y) => y.id === selectedYearId) || null;
  const activeYear = years.find((y) => y.status === "active") || null;

  const isEditable = useMemo(() => {
    if (!selectedYear) return false;
    return selectedYear.status === "active";
  }, [selectedYear]);

  const editableReason = useMemo(() => {
    if (!selectedYear) return "";
    if (selectedYear.status === "active") {
      return "This is the active academic year.";
    }
    return "This academic year is archived and read-only.";
  }, [selectedYear]);

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
