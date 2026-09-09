import React, { useEffect, useState } from "react";
import { FaDownload, FaFileAlt, FaUserTie, FaLock } from "react-icons/fa";
import SideTop from "./SideTop";
import SuccessMessage from "./SuccessMessage";
import api from "../services/api";
import useHodStatus from "../hooks/useHodStatus";
import { PageHeader } from "./marks-module/components/PageHeader/PageHeader.component";
import "./marks-module/components/PageHeader/PageHeader.styles.css";
import "./LessonPlan.css";
import "./HodLessonPlans.css";
import LessonPlanPagination from "./LessonPlanPagination";

const PAGE_SIZE = 15;

export default function HodLessonPlans() {
  const hod = useHodStatus();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [departmentName, setDepartmentName] = useState(hod.department_name || "");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!hod.is_hod) {
      setLoading(false);
      setPlans([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await api.getHodLessonPlans({
          search: debouncedSearch.trim() || undefined,
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (cancelled) return;
        setPlans(Array.isArray(result.items) ? result.items : []);
        setPagination({
          total: result.total ?? 0,
          totalPages: result.totalPages ?? Math.max(1, Math.ceil((result.total || 0) / PAGE_SIZE)),
        });
        if (result.hod?.department_name) {
          setDepartmentName(result.hod.department_name);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load department lesson plans");
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hod.is_hod, hod.hod_status, debouncedSearch, page]);

  const resolveFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const apiUrl =
      process.env.REACT_APP_API_URL ||
      (isDevelopment ? "http://localhost:5000" : "https://api.votechs7academygroup.com");
    return `${apiUrl}${fileUrl}`;
  };

  const handleDownload = async (plan) => {
    try {
      setError("");
      const meta = await api.downloadLessonPlan(plan.id);
      const url = resolveFileUrl(meta.file_url || plan.file_url);
      if (!url) {
        setError("No file available for download");
        return;
      }
      const filename =
        meta.file_name || `${(plan.title || "lesson_plan").replace(/[^a-z0-9_\-\s]/gi, "_")}.pdf`;
      const resp = await fetch(url, { mode: "cors" }).catch(() => null);
      if (resp && resp.ok) {
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        setSuccess("Lesson plan downloaded");
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
        setSuccess("Download started");
      }
    } catch (err) {
      setError(err.message || "Failed to download lesson plan");
    }
    setTimeout(() => setSuccess(""), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const blocked = !hod.is_hod;

  return (
    <SideTop>
      <div className="lesson-plan-page hod-lesson-plans">
        <PageHeader
          title="Department Lesson Plans"
          subtitle={
            departmentName
              ? `Approved plans for ${departmentName}`
              : "Approved lesson plans for your department"
          }
        />

        {success && (
          <SuccessMessage message={success} type="success" onClose={() => setSuccess("")} />
        )}
        {error && (
          <SuccessMessage message={error} type="error" onClose={() => setError("")} />
        )}

        {blocked ? (
          <div className="hod-lp-locked">
            <FaLock />
            <h3>
              {hod.hod_status === "suspended"
                ? "HOD access is suspended"
                : "You are not an active Head of Department"}
            </h3>
            <p>
              {hod.hod_status === "suspended"
                ? "Your Head of Department assignment is suspended. Department lesson plans are hidden until Admin4 reactivates you."
                : "This page is available only after Admin4 appoints you as Head of Department."}
            </p>
          </div>
        ) : (
          <>
            <div className="hod-lp-banner">
              <FaUserTie />
              <div>
                <strong>Head of Department</strong>
                <span>{departmentName || "Your department"} · approved plans only · download</span>
              </div>
            </div>

            <div className="lp-toolbar">
              <div className="lp-filter-grid">
                <div className="lp-filter-field lp-search-field">
                  <label htmlFor="hod-lp-search">Search</label>
                  <input
                    id="hod-lp-search"
                    type="search"
                    placeholder="Title, teacher, or filename…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="lp-panel">
              <div className="lp-panel-head">
                <h3 className="lp-panel-title">Approved Plans</h3>
                <span className="lp-panel-meta">
                  {loading
                    ? "Loading…"
                    : pagination.total > 0
                      ? `${pagination.total} record(s) total`
                      : "0 record(s)"}
                </span>
              </div>
              <div className="lp-table-scroll">
                <div className="lesson-plan-table-wrapper">
                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner" />
                      <p>Loading department lesson plans…</p>
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="empty-state">
                      <FaFileAlt className="empty-icon" />
                      <h3>No approved lesson plans</h3>
                      <p>No approved plans were found for {departmentName || "your department"}.</p>
                    </div>
                  ) : (
                    <table className="lesson-plan-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Class</th>
                          <th>Department</th>
                          <th>Period</th>
                          <th>Submitted</th>
                          <th>Teacher</th>
                          <th>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((plan) => (
                          <tr key={plan.id}>
                            <td className="title-cell">
                              <span className="title-text">{plan.title}</span>
                            </td>
                            <td>{plan.class_label || plan.class_name || "—"}</td>
                            <td>{plan.department_name || departmentName || "—"}</td>
                            <td>
                              <span className={`period-type-badge period-${plan.period_type}`}>
                                {plan.period_type}
                              </span>
                            </td>
                            <td>{formatDate(plan.submitted_at)}</td>
                            <td>{plan.teacher_name || plan.teacher_username || "—"}</td>
                            <td className="actions">
                              <button
                                type="button"
                                className="action-btn view"
                                onClick={() => handleDownload(plan)}
                                title="Download"
                              >
                                <FaDownload />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {pagination.totalPages > 1 && (
              <LessonPlanPagination
                page={page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                loading={loading}
              />
            )}
          </>
        )}
      </div>
    </SideTop>
  );
}
