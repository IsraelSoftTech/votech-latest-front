/**
 * Where each role lands after signing in. Shared by the sign-in page and the
 * super admin role chooser so the two can never drift apart.
 */
export function dashboardPathForRole(role) {
  if (["Admin1", "Admin2", "Admin3"].includes(role)) return "/admin";
  if (role === "Admin4") return "/dean";
  if (role === "Discipline") return "/discipline";
  if (role === "Teacher") return "/teacher-dashboard";
  if (role === "Psychosocialist") return "/psycho-dashboard";
  return "/dashboard";
}
