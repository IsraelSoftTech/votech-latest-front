const ACTIVE_YEAR_KEY = "activeYearSnapshot";
const VIEWING_YEAR_KEY = "viewAcademicYearFilter";

export function getActiveYearSnapshot() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_YEAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveYearSnapshot(year) {
  if (!year?.id) return;
  sessionStorage.setItem(
    ACTIVE_YEAR_KEY,
    JSON.stringify({
      id: year.id,
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
      status: year.status,
      isWritable: year.isWritable !== false,
    })
  );
}

export function updateSessionActiveYearId(yearId) {
  try {
    const raw = sessionStorage.getItem("authUser");
    if (!raw) return;
    const user = JSON.parse(raw);
    user.active_year_id = yearId;
    sessionStorage.setItem("authUser", JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function notifyActiveYearChanged(activeYear) {
  if (activeYear) {
    setActiveYearSnapshot(activeYear);
    updateSessionActiveYearId(activeYear.id);
  }
  sessionStorage.removeItem(VIEWING_YEAR_KEY);
  window.dispatchEvent(
    new CustomEvent("active-year-changed", { detail: { activeYear } })
  );
  window.dispatchEvent(
    new CustomEvent("viewing-academic-year-changed", {
      detail: { viewingYear: null },
    })
  );
}

export function getViewingAcademicYearFilter() {
  try {
    const raw = sessionStorage.getItem(VIEWING_YEAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @deprecated use getViewingAcademicYearFilter */
export function getViewingAcademicYearId() {
  return getViewingAcademicYearFilter()?.id ?? null;
}

export function setViewingAcademicYearFilter(year) {
  if (!year?.id) {
    sessionStorage.removeItem(VIEWING_YEAR_KEY);
  } else {
    sessionStorage.setItem(
      VIEWING_YEAR_KEY,
      JSON.stringify({ id: year.id, name: year.name || `Year ${year.id}` })
    );
  }
  window.dispatchEvent(
    new CustomEvent("viewing-academic-year-changed", {
      detail: { viewingYear: year ?? null },
    })
  );
}

export function setViewingAcademicYearId(yearId, name) {
  if (yearId == null || yearId === "") {
    setViewingAcademicYearFilter(null);
  } else {
    setViewingAcademicYearFilter({ id: yearId, name: name || `Year ${yearId}` });
  }
}

export function clearViewingAcademicYear() {
  setViewingAcademicYearFilter(null);
}
