import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useRestrictTo(...allowedRoles) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  // Rest params produce a new array on every render, so depending on
  // `allowedRoles` directly re-ran this effect (and its setUser call, and
  // the resulting re-render) on every single frame — an infinite loop
  // invisible on plain tables but visible as constant flicker on anything
  // that animates on re-render (chart tooltips/data-labels). Depending on
  // this string instead only re-runs when the role list actually changes.
  const rolesKey = allowedRoles.join(",");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const authUserRaw = sessionStorage.getItem("authUser");

    if (!token || !authUserRaw) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    let authUser;
    try {
      authUser = JSON.parse(authUserRaw);
    } catch (err) {
      console.error("Failed to parse authUser:", err);
      navigate("/unauthorized", { replace: true });
      return;
    }

    if (!rolesKey.split(",").includes(authUser.role)) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    setUser((prev) =>
      prev && prev.id === authUser.id && prev.role === authUser.role ? prev : authUser
    );
  }, [rolesKey, navigate]);

  return user;
}
