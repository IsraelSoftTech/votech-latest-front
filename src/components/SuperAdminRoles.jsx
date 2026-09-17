import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaShieldAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import logo from "../assets/logo.png";
import api from "../services/api";
import { prefetchActiveYearContext } from "../context/ActiveYearContext";
import { dashboardPathForRole } from "../utils/roleRoutes";
import "./SuperAdminRoles.css";

const ROLE_LABELS = {
  Admin1: "Admin 1",
  Admin2: "Admin 2",
  Admin3: "Admin 3",
  Admin4: "Admin 4 (Dean)",
  Teacher: "Teacher",
  Discipline: "Discipline",
  Psychosocialist: "Psychosocialist",
};

/**
 * After the master login, the super admin picks a role and enters a dedicated
 * workspace for that role — never another staff member's account.
 */
export default function SuperAdminRoles() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entering, setEntering] = useState(null);

  const currentRole = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("authUser") || "null")?.role || null;
    } catch {
      return null;
    }
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getSuperAdminRoles();
      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setUsername(data?.username || "");
    } catch (err) {
      setError(err.message || "Could not load the available roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!api.isSuperAdminSession()) {
      navigate("/signin", { replace: true });
      return;
    }
    load();
  }, [load, navigate]);

  const enterRole = async (role, accounts) => {
    if (!accounts.length || entering) return;

    setEntering(role);
    setError("");
    try {
      const { user } = await api.assumeRole(role);
      await prefetchActiveYearContext();
      navigate(dashboardPathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Could not enter that role");
      setEntering(null);
      if (!api.isSuperAdminSession()) {
        navigate("/signin", { replace: true });
      }
    }
  };

  const signOut = () => {
    api.clearToken();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="sar-root">
      <header className="sar-header">
        <div className="sar-header-inner">
          <div className="sar-brand">
            <img src={logo} alt="VOTECH" className="sar-brand-logo" />
            <span className="sar-brand-name">VOTECH</span>
          </div>
          <button type="button" className="sar-signout" onClick={signOut}>
            <FaSignOutAlt /> Sign out
          </button>
        </div>
      </header>

      <main className="sar-main">
        <div className="sar-shell">
          <div className="sar-intro">
            <span className="sar-badge">
              <FaShieldAlt /> Super admin
            </span>
            <h1 className="sar-title">Choose a role to enter</h1>
            <p className="sar-subtitle">
              {username ? `Signed in as ${username}. ` : ""}
              Each role has a dedicated VOTECH workspace. You never log into
              another user&apos;s account. You can come back and switch at any time.
            </p>
          </div>

          {error && <div className="sar-error">{error}</div>}

          {loading ? (
            <div className="sar-state">Loading roles…</div>
          ) : roles.length === 0 ? (
            <div className="sar-state">No roles are available yet.</div>
          ) : (
            <div className="sar-grid">
              {roles.map(({ role, description, accounts }) => {
                const available = accounts.length > 0;
                const workspace = accounts[0];
                const isCurrent = currentRole === role;

                return (
                  <div
                    key={role}
                    className={`sar-card ${available ? "" : "disabled"} ${
                      isCurrent ? "current" : ""
                    }`}
                  >
                    <div className="sar-card-head">
                      <div>
                        <h2 className="sar-card-title">
                          {ROLE_LABELS[role] || role}
                          {isCurrent && <span className="sar-current">Current</span>}
                        </h2>
                        {description && (
                          <p className="sar-card-desc">{description}</p>
                        )}
                      </div>
                    </div>

                    {available ? (
                      <>
                        <div className="sar-account">
                          <span className="sar-avatar">SA</span>
                          <div className="sar-account-meta">
                            <span className="sar-account-name">
                              {workspace.name || `VOTECH ${ROLE_LABELS[role] || role}`}
                            </span>
                            <span className="sar-account-username">
                              Dedicated workspace
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="sar-enter"
                          onClick={() => enterRole(role, accounts)}
                          disabled={Boolean(entering)}
                        >
                          {entering === role ? (
                            "Entering…"
                          ) : (
                            <>
                              Enter as {ROLE_LABELS[role] || role} <FaArrowRight />
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <p className="sar-empty">
                        This workspace is not ready yet. Restart the server to create it.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
