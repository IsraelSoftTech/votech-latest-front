import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";
import {
  clearViewingAcademicYear,
  getActiveYearSnapshot,
  getViewingAcademicYearFilter,
  setActiveYearSnapshot,
  setViewingAcademicYearFilter,
} from "../utils/activeYearSession";

const ActiveYearContext = createContext(null);

export async function prefetchActiveYearContext() {
  try {
    const res = await api.getAcademicYearContext();
    const data = res?.data;
    if (data?.activeYear) {
      setActiveYearSnapshot(data.activeYear);
    }
    return data ?? null;
  } catch {
    return null;
  }
}

export function ActiveYearProvider({ children }) {
  const [activeYear, setActiveYear] = useState(() => getActiveYearSnapshot());
  const [archivedYears, setArchivedYears] = useState([]);
  const [viewingYear, setViewingYear] = useState(() =>
    getViewingAcademicYearFilter()
  );
  const [loading, setLoading] = useState(false);

  const refreshContext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAcademicYearContext();
      const data = res?.data;
      if (data?.activeYear) {
        setActiveYear(data.activeYear);
        setActiveYearSnapshot(data.activeYear);
      } else {
        setActiveYear(null);
      }
      setArchivedYears(Array.isArray(data?.archivedYears) ? data.archivedYears : []);
      return data ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshContext();

    const onActiveChanged = (e) => {
      const next = e.detail?.activeYear;
      if (next) {
        setActiveYear(next);
        setActiveYearSnapshot(next);
      }
      setViewingYear(null);
    };

    const onViewingChanged = () => {
      setViewingYear(getViewingAcademicYearFilter());
    };

    window.addEventListener("active-year-changed", onActiveChanged);
    window.addEventListener("viewing-academic-year-changed", onViewingChanged);
    return () => {
      window.removeEventListener("active-year-changed", onActiveChanged);
      window.removeEventListener("viewing-academic-year-changed", onViewingChanged);
    };
  }, [refreshContext]);

  const isViewingArchived = useMemo(() => {
    if (!viewingYear?.id || !activeYear?.id) return false;
    return Number(viewingYear.id) !== Number(activeYear.id);
  }, [viewingYear, activeYear]);

  const setViewingYearFilter = useCallback((year) => {
    if (!year?.id) {
      clearViewingAcademicYear();
      setViewingYear(null);
      return;
    }
    const payload = {
      id: year.id,
      name: year.name || `Year ${year.id}`,
    };
    setViewingAcademicYearFilter(payload);
    setViewingYear(payload);
  }, []);

  const clearViewingYearFilter = useCallback(() => {
    clearViewingAcademicYear();
    setViewingYear(null);
  }, []);

  const syncViewingFromYearId = useCallback(
    (yearId, yearsList = []) => {
      if (!yearId) {
        clearViewingYearFilter();
        return;
      }
      if (activeYear?.id && Number(yearId) === Number(activeYear.id)) {
        clearViewingYearFilter();
        return;
      }
      const found = yearsList.find((y) => Number(y.id) === Number(yearId));
      if (found) {
        setViewingYearFilter({
          id: found.id,
          name: found.name,
          status: found.status,
        });
      } else {
        setViewingYearFilter({ id: yearId, name: `Year ${yearId}` });
      }
    },
    [activeYear, clearViewingYearFilter, setViewingYearFilter]
  );

  const value = useMemo(
    () => ({
      activeYear,
      archivedYears,
      viewingYear,
      isViewingArchived,
      loading,
      refreshContext,
      setViewingYearFilter,
      clearViewingYearFilter,
      syncViewingFromYearId,
    }),
    [
      activeYear,
      archivedYears,
      viewingYear,
      isViewingArchived,
      loading,
      refreshContext,
      setViewingYearFilter,
      clearViewingYearFilter,
      syncViewingFromYearId,
    ]
  );

  return (
    <ActiveYearContext.Provider value={value}>
      {children}
    </ActiveYearContext.Provider>
  );
}

export function useActiveYear() {
  const ctx = useContext(ActiveYearContext);
  if (!ctx) {
    throw new Error("useActiveYear must be used within ActiveYearProvider");
  }
  return ctx;
}

/** Safe outside SideTop — returns null when provider is absent */
export function useActiveYearOptional() {
  return useContext(ActiveYearContext);
}

/** Combined archived-year read-only flag for year-scoped modules */
export function useYearScopedReadOnly() {
  const ctx = useActiveYearOptional();
  return {
    isViewingArchived: ctx?.isViewingArchived ?? false,
    isReadOnly: ctx?.isViewingArchived ?? false,
    viewingYear: ctx?.viewingYear ?? null,
    activeYear: ctx?.activeYear ?? null,
    syncViewingFromYearId: ctx?.syncViewingFromYearId,
    clearViewingYearFilter: ctx?.clearViewingYearFilter,
  };
}

/** Academic years available in operational dropdowns (active year only when set) */
export function useSelectableAcademicYears(allYears = []) {
  const ctx = useActiveYearOptional();
  const activeYear = ctx?.activeYear ?? null;

  return useMemo(() => {
    if (!activeYear?.id) {
      return Array.isArray(allYears) ? allYears : [];
    }
    const activeId = Number(activeYear.id);
    const fromList = (allYears || []).find((y) => Number(y.id) === activeId);
    if (fromList) return [fromList];
    return [
      {
        id: activeYear.id,
        name: activeYear.name,
        status: activeYear.status,
        start_date: activeYear.start_date,
        end_date: activeYear.end_date,
      },
    ];
  }, [allYears, activeYear]);
}

/** Block client-side submits when viewing an archived year */
export function assertWritableYear(isViewingArchived, message) {
  if (isViewingArchived) {
    const err = new Error(
      message || "This academic year is read-only. Switch to the active year to make changes."
    );
    err.code = "READ_ONLY_YEAR";
    throw err;
  }
}
