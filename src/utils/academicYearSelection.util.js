/**
 * When an active academic year is configured, operational modules should only
 * offer that year in dropdowns (not archived / historical years).
 */

export function getSelectableAcademicYears(allYears, activeYear) {
  if (!activeYear?.id) {
    return Array.isArray(allYears) ? allYears : [];
  }

  const activeId = Number(activeYear.id);
  const fromList = (allYears || []).find((y) => Number(y.id) === activeId);

  if (fromList) {
    return [fromList];
  }

  return [
    {
      id: activeYear.id,
      name: activeYear.name,
      status: activeYear.status,
      start_date: activeYear.start_date,
      end_date: activeYear.end_date,
    },
  ];
}

export function getActiveYearId(activeYear) {
  return activeYear?.id != null ? Number(activeYear.id) : null;
}

export function academicYearSelectOptions(years) {
  return (years || []).map((y) => ({
    value: y.id,
    label: y.name,
  }));
}
