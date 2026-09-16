import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaBookOpen,
  FaChalkboard,
  FaCheckCircle,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaFemale,
  FaGraduationCap,
  FaHistory,
  FaLock,
  FaMale,
  FaTimesCircle,
  FaTools,
  FaUnlockAlt,
  FaUserGraduate,
} from "react-icons/fa";
import SideTop from "../../../SideTop";
import api from "../../utils/api";
import { useActiveYear } from "../../../../context/ActiveYearContext";
import Stats from "../../components/Stats/Stats.component";
import DataTable from "../../components/DataTable/DataTable.component";
import { Badge } from "../../components/Badge/Badge.component";
import { Button } from "../../components/Button/Button.component";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import "../../components/DataTable/DataTable.styles.css";
import "../ClassPage/Class.styles.css";
import "./AcademicYear.styles.css";
import "./AcademicYearDetail.styles.css";

// Every number on this page comes from one request
// (GET /academic-years/:id/overview), computed server-side with the same
// rules the linked pages use, so what this page says can never disagree
// with where its links go.

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.details || err?.message || fallback;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "N/A");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-GB") : "N/A");
const fmtNum = (n) => Number(n || 0).toLocaleString();

const DAY_MS = 24 * 60 * 60 * 1000;
function describeTimeline(start, end) {
  if (!start || !end) return "N/A";
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now < s) return `Starts in ${Math.ceil((s - now) / DAY_MS)} days`;
  if (now > e) return `Ended ${Math.floor((now - e) / DAY_MS)} days ago`;
  const total = Math.max(1, Math.round((e - s) / DAY_MS));
  const elapsed = Math.round((now - s) / DAY_MS);
  return `Day ${elapsed} of ${total} (${Math.max(0, total - elapsed)} days left)`;
}

const LOG_ACTION_LABEL = {
  switch: { label: "Switched", tone: "info" },
  reactivate: { label: "Reactivated", tone: "warn" },
  archive: { label: "Archived", tone: "neutral" },
  grant: { label: "Access granted", tone: "good" },
  grant_revoke: { label: "Access revoked", tone: "bad" },
};

const GRANT_STATE_TONE = { active: "good", expired: "neutral", revoked: "bad" };

// Layout-shaped placeholder: the same blocks the real page renders (header
// card, stat row, then the section cards), so the page does not jump
// around when the data lands.
function DetailSkeleton() {
  return (
    <div className="ay-detail-skeleton" aria-busy="true" aria-label="Loading academic year">
      <div className="class-details-card">
        <div className="skeleton-line wide" />
        <div className="ay-skel-info-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton-block info" key={i} />
          ))}
        </div>
      </div>
      <Stats data={[]} loading skeletonCount={6} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="class-details-card" key={i}>
          <div className="skeleton-line medium" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

function SectionCard({ icon, title, hint, action, children }) {
  return (
    <div className="class-details-card ay-section">
      <div className="ay-section-head">
        <div>
          <h3 className="academic-section-title">
            {icon} {title}
          </h3>
          {hint && <p className="academic-section-hint">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="class-info-item">
      <span className="class-info-label">{label}</span>
      <span className="class-info-value">{value}</span>
    </div>
  );
}

export const AcademicYearDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { syncViewingFromYearId } = useActiveYear();

  const role = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("authUser") || "{}").role;
    } catch {
      return undefined;
    }
  }, []);
  const isAdmin1 = role === "Admin1";

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/academic-years/${id}/overview`)
      .then((res) => {
        if (!cancelled) setOverview(res?.data?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) setNotFound(true);
        else toast.error(getErrorMessage(err, "Failed to load the academic year overview."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Every outbound link first points the app's "viewing year" at this year
  // (the same mechanism behind the header chip / isViewingArchived), so an
  // archived year's page links to that year's data, not the active year's.
  const goTo = useCallback(
    (path) => {
      if (overview?.year) syncViewingFromYearId(overview.year.id, [overview.year]);
      navigate(path);
    },
    [navigate, overview, syncViewingFromYearId]
  );

  const backButton = (
    <div className="vt-back-row">
      <Button variant="ghost" icon={<FaArrowLeft />} onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </div>
  );

  if (loading) {
    return (
      <SideTop>
        <div className="academic-year-page ay-detail-page">
          {backButton}
          <DetailSkeleton />
        </div>
      </SideTop>
    );
  }

  if (notFound || !overview) {
    return (
      <SideTop>
        <div className="academic-year-page ay-detail-page">
          {backButton}
          <EmptyState
            title="Academic year not found"
            subtitle="It may have been deleted, or the link is out of date."
            action={<Button onClick={() => navigate("/academics/academic-years")}>All academic years</Button>}
          />
        </div>
      </SideTop>
    );
  }

  const { year, terms, enrollment, report_cards: reportCards, promotion, governance, setup_health: health } = overview;
  const isArchived = year.status === "archived";
  const showPromotion = isArchived || promotion.runs > 0;
  const annualExpected = terms.reduce((n, t) => n + t.expected_marks, 0);
  const annualFilled = terms.reduce((n, t) => n + t.filled_marks, 0);
  const annualPercent = annualExpected ? Math.round((annualFilled / annualExpected) * 100) : 0;

  const statsData = [
    { title: "Students", value: fmtNum(enrollment.total_students), icon: FaUserGraduate, tone: "neutral" },
    { title: "Male", value: fmtNum(enrollment.male), icon: FaMale, tone: "pending" },
    { title: "Female", value: fmtNum(enrollment.female), icon: FaFemale, tone: "gold" },
    { title: "Classes with students", value: fmtNum(enrollment.classes_with_students), icon: FaChalkboard, tone: "neutral" },
    {
      title: "Marks entered (year)",
      value: `${annualPercent}%`,
      icon: annualPercent >= 90 ? FaCheckCircle : FaTimesCircle,
    },
    {
      title: "Report cards generated",
      value: `${fmtNum(reportCards.classes_generated)} / ${fmtNum(reportCards.classes_total)} classes`,
      icon: reportCards.classes_generated >= reportCards.classes_total && reportCards.classes_total > 0 ? FaCheckCircle : FaBookOpen,
      tone: reportCards.classes_generated >= reportCards.classes_total && reportCards.classes_total > 0 ? "good" : "neutral",
    },
  ];

  const classColumns = [
    { label: "Department", accessor: "department_name" },
    { label: "Class", accessor: "class_name" },
    { label: "Students", accessor: "students" },
    { label: "Active", accessor: "active_students" },
    { label: "Subjects", accessor: "subjects" },
    {
      label: "Class Master",
      accessor: "has_class_master_label",
      render: (row) => (
        <Badge tone={row.has_class_master ? "good" : "warn"}>{row.has_class_master ? "Assigned" : "Missing"}</Badge>
      ),
    },
  ];
  const classRows = enrollment.classes.map((c) => ({
    ...c,
    id: c.class_id,
    department_name: c.department?.name || "N/A",
    has_class_master_label: c.has_class_master ? "Assigned" : "Missing",
  }));
  // DataTable's filter dropdown takes the values to offer, not a field name.
  const departmentFilters = [...new Set(classRows.map((r) => r.department_name))].sort();

  const logColumns = [
    { label: "When", accessor: "when", render: (row) => fmtDateTime(row.performed_at) },
    {
      label: "Action",
      accessor: "action_label",
      render: (row) => {
        const meta = LOG_ACTION_LABEL[row.action] || { label: row.action, tone: "neutral" };
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    { label: "By", accessor: "performed_by" },
    { label: "Details", accessor: "details" },
  ];
  const logRows = governance.logs.map((l) => {
    const meta = LOG_ACTION_LABEL[l.action] || { label: l.action };
    const direction =
      l.action === "switch" && l.from_year && l.to_year ? `${l.from_year.name} → ${l.to_year.name}. ` : "";
    return {
      ...l,
      when: fmtDateTime(l.performed_at),
      action_label: meta.label,
      performed_by: l.performed_by || "Unknown",
      details: `${direction}${l.reason || ""}`.trim() || "N/A",
    };
  });

  const grantColumns = [
    { label: "Granted", accessor: "granted_at_label" },
    { label: "Expires", accessor: "expires_at_label" },
    { label: "Scope", accessor: "scope" },
    { label: "By", accessor: "granted_by" },
    { label: "Reason", accessor: "reason_label" },
    {
      label: "State",
      accessor: "state",
      render: (row) => <Badge tone={GRANT_STATE_TONE[row.state] || "neutral"}>{row.state}</Badge>,
    },
  ];
  const grantRows = (governance.grants || []).map((g) => ({
    ...g,
    granted_at_label: fmtDateTime(g.granted_at),
    expires_at_label: fmtDateTime(g.expires_at),
    scope: g.is_global ? "All Admin3 users" : `${(g.admin3_user_ids || []).length} named Admin3 user(s)`,
    granted_by: g.granted_by || "Unknown",
    reason_label: g.reason || "N/A",
  }));

  const linkButton = (label, path) => (
    <Button variant="secondary" size="sm" icon={<FaExternalLinkAlt />} onClick={() => goTo(path)}>
      {label}
    </Button>
  );

  return (
    <SideTop>
      <div className="academic-year-page ay-detail-page">
        {backButton}

        {/* Header */}
        <div className="class-details-card">
          <header className="class-details-header ay-detail-header">
            <div className="class-details-title-wrapper">
              <h2 className="class-details-title">{year.name}</h2>
              <div className="ay-detail-badges">
                <span className={`class-status-badge ${isArchived ? "suspended" : "active"}`}>{year.status}</span>
                {year.is_locked_for_editing && (
                  <Badge tone="warn">
                    <FaLock /> Locked for editing
                  </Badge>
                )}
              </div>
            </div>
            <div className="class-detail-header-actions">
              {isAdmin1 && isArchived && linkButton("Manage grants", "/academics/academic-years")}
            </div>
          </header>
          <div className="class-info-group ay-info-grid">
            <InfoItem label="Start date" value={fmtDate(year.start_date)} />
            <InfoItem label="End date" value={fmtDate(year.end_date)} />
            <InfoItem label="Timeline" value={describeTimeline(year.start_date, year.end_date)} />
            <InfoItem
              label="Terms / sequences"
              value={`${terms.length} terms, ${terms.reduce((n, t) => n + t.sequences, 0)} sequences`}
            />
            <InfoItem
              label="Switched to"
              value={year.switched_at ? `${fmtDateTime(year.switched_at)} by ${year.switched_by || "Unknown"}` : "Never"}
            />
            <InfoItem
              label="Reactivated"
              value={
                year.reactivated_at ? `${fmtDateTime(year.reactivated_at)} by ${year.reactivated_by || "Unknown"}` : "Never"
              }
            />
          </div>
        </div>

        <Stats data={statsData} skeletonCount={6} />

        {/* Enrollment */}
        <SectionCard
          icon={<FaUserGraduate />}
          title="Enrollment by class"
          hint={
            enrollment.classes_without_students
              ? `${enrollment.classes_without_students} class(es) have no students registered in this year.`
              : "Every class has at least one student registered in this year."
          }
          action={linkButton("Students", "/admin-student")}
        >
          <DataTable
            columns={classColumns}
            data={classRows}
            limit={10}
            onRowClick={(row) => goTo(`/academics/classes/${row.class_id}`)}
            filterCategories={departmentFilters}
          />
        </SectionCard>

        {/* Marks coverage */}
        <SectionCard
          icon={<FaClipboardCheck />}
          title="Marks coverage"
          hint="Marks entered against every (class subject × student × sequence) expected, per term."
          action={linkButton("Marks overview", "/academics/report-cards?tab=marks-overview")}
        >
          {terms.length === 0 ? (
            <EmptyState title="No terms" subtitle="This year has no terms or sequences set up yet." />
          ) : (
            <div className="ay-coverage-grid">
              {terms.map((t) => (
                <div className="class-info-item ay-coverage-item" key={t.term_id}>
                  <span className="class-info-label">
                    {t.name} · {t.sequences} sequence{t.sequences === 1 ? "" : "s"}
                  </span>
                  <span className="class-info-value">{t.percent}%</span>
                  <div className="ay-progress-bar" role="progressbar" aria-valuenow={t.percent} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className={`ay-progress-fill ${t.percent >= 90 ? "complete" : t.percent >= 50 ? "partial" : "low"}`}
                      style={{ width: `${Math.min(100, t.percent)}%` }}
                    />
                  </div>
                  <span className="ay-progress-text">
                    {fmtNum(t.filled_marks)} of {fmtNum(t.expected_marks)} marks
                    {t.subjects_without_marks ? ` · ${fmtNum(t.subjects_without_marks)} class subjects with no marks` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Report cards */}
        <SectionCard
          icon={<FaBookOpen />}
          title="Report cards"
          action={linkButton("Sessions", "/academics/report-cards/sessions")}
        >
          <div className="class-info-group ay-info-grid">
            <InfoItem label="Sessions run" value={`${fmtNum(reportCards.sessions)} (${fmtNum(reportCards.completed_sessions)} completed)`} />
            <InfoItem label="Classes generated" value={`${fmtNum(reportCards.classes_generated)} of ${fmtNum(reportCards.classes_total)}`} />
            <InfoItem label="Last completed" value={fmtDateTime(reportCards.last_completed_at)} />
          </div>
        </SectionCard>

        {/* Promotion */}
        {showPromotion && (
          <SectionCard
            icon={<FaGraduationCap />}
            title="Promotion"
            hint={
              promotion.never_promoted_students
                ? `${fmtNum(promotion.never_promoted_students)} active student(s) in ${promotion.never_promoted_classes.length} class(es) were never promoted out of this year.`
                : "Every active student has been promoted out of this year."
            }
            action={linkButton("Promotion history", "/academics/promotion?tab=history")}
          >
            <div className="class-info-group ay-info-grid">
              <InfoItem label="Runs" value={`${fmtNum(promotion.runs)} (${fmtNum(promotion.completed_runs)} completed)`} />
              <InfoItem label="Promoted" value={fmtNum(promotion.decisions.promoted)} />
              <InfoItem label="Promoted on condition" value={fmtNum(promotion.decisions.promoted_on_condition)} />
              <InfoItem label="Failed" value={fmtNum(promotion.decisions.failed)} />
              <InfoItem label="Repeating" value={fmtNum(promotion.repeating)} />
              <InfoItem label="Last run completed" value={fmtDateTime(promotion.last_completed_at)} />
            </div>
            {promotion.never_promoted_classes.length > 0 && (
              <div className="ay-chip-list">
                {promotion.never_promoted_classes.map((c) => (
                  <button type="button" className="ay-chip" key={c.id} onClick={() => goTo(`/academics/classes/${c.id}`)}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Governance */}
        <SectionCard
          icon={<FaHistory />}
          title="Activity log"
          hint="Every switch, reactivation and access grant that touched this year."
        >
          {logRows.length === 0 ? (
            <EmptyState title="No activity yet" subtitle="Switches, reactivations and access grants for this year will appear here." />
          ) : (
            <DataTable columns={logColumns} data={logRows} limit={10} />
          )}
        </SectionCard>

        {isAdmin1 && (
          <SectionCard
            icon={<FaUnlockAlt />}
            title="Access grants"
            hint={
              governance.active_grants
                ? `${governance.active_grants} grant(s) currently open on this year.`
                : "No open grants on this year."
            }
            action={isArchived ? linkButton("Manage grants", "/academics/academic-years") : null}
          >
            {grantRows.length === 0 ? (
              <EmptyState title="No grants" subtitle="Nobody has been given temporary access to this year." />
            ) : (
              <DataTable columns={grantColumns} data={grantRows} limit={10} />
            )}
          </SectionCard>
        )}

        {/* Setup health */}
        <SectionCard
          icon={<FaTools />}
          title="Setup health"
          hint="Gaps that block marks entry or report cards for this year."
        >
          <div className="ay-health-grid">
            <div>
              <h4 className="ay-health-title">
                {health.classes_without_master.length === 0 ? <FaCheckCircle className="ay-ok" /> : <FaTimesCircle className="ay-bad" />}
                Classes without a class master ({health.classes_without_master.length})
              </h4>
              {health.classes_without_master.length > 0 && (
                <div className="ay-chip-list">
                  {health.classes_without_master.map((c) => (
                    <button type="button" className="ay-chip" key={c.class_id} onClick={() => goTo(`/academics/classes/${c.class_id}`)}>
                      {c.class_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="ay-health-title">
                {health.class_subjects_without_teacher_total === 0 ? <FaCheckCircle className="ay-ok" /> : <FaTimesCircle className="ay-bad" />}
                Class subjects without a teacher ({fmtNum(health.class_subjects_without_teacher_total)})
              </h4>
              {health.class_subjects_without_teacher.length > 0 && (
                <div className="ay-chip-list">
                  {health.class_subjects_without_teacher.map((cs) => (
                    <button
                      type="button"
                      className="ay-chip"
                      key={`${cs.class_id}-${cs.subject_id}`}
                      onClick={() => goTo(`/academics/subjects/${cs.subject_id}`)}
                    >
                      {cs.class_name} · {cs.subject_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </SideTop>
  );
};

export default AcademicYearDetail;
