import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useRestrictTo(...allowedRoles) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

    if (!allowedRoles.includes(authUser.role)) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    setUser(authUser);
  }, [allowedRoles, navigate]);

  return user;
}
