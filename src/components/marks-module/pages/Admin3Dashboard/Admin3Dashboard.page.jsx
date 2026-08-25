import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Select from "react-select";
import Chart from "react-apexcharts";
import {
  FaUserGraduate,
  FaMale,
  FaFemale,
  FaLayerGroup,
  FaBook,
  FaCalendarAlt,
  FaClipboardList,
  FaGraduationCap,
  FaBookOpen,
  FaExclamationTriangle,
  FaBell,
  FaChevronRight,
} from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api from "../../utils/api";
import SideTop from "../../../SideTop";
import "./Admin3Dashboard.styles.css";

const PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_academic_year", label: "This Academic Year" },
  { value: "all_time", label: "All Time" },
];

const STATUS_LABELS = { active: "Active", graduated: "Graduated", withdrawn: "Withdrawn" };

// Not a new palette — these are the app's own existing tokens (SideTop.css's
// brand navy, and the status-pill colors already shipping on the Students
// and Promotion History pages), so this dashboard reads as part of the same
// app instead of introducing colors that only exist here.
const PALETTE = {
  primary: "#204080", // brand navy — SideTop.css, used 400+ times app-wide
  primaryTint: "#ebf4ff",
  accent: "#3b82f6", // secondary blue — already used in Admin.css / ReportCard.styles.css
  success: "#38a169",
  successTint: "#f0fff4",
  danger: "#c53030",
  dangerTint: "#fdecec",
  warning: "#b7791f",
  warningTint: "#fffaf0",
  textStrong: "#2d3748",
  textSoft: "#718096",
  muted: "#a0aec0",
  grid: "#edf2f7",
};

const AXIS_LABEL_STYLE = { colors: PALETTE.textSoft, fontSize: "11px" };

// Fixes ApexCharts' tooltip-flickers-then-vanishes bug: inside a flex/grid
// panel, the tooltip's own DOM insertion nudges the parent element's size,
// which fires ApexCharts' built-in ResizeObserver and redraws the chart
// mid-hover — killing the tooltip a frame after it appears.
const CHART_BASE = { redrawOnParentResize: false, redrawOnWindowResize: false, fontFamily: "inherit" };

function StatCard({ icon, label, value, sub, tone, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`a3d-stat-card ${tone || ""} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="a3d-stat-icon">{icon}</div>
      <div className="a3d-stat-body">
        <span className="a3d-stat-value">{value}</span>
        <span className="a3d-stat-label">{label}</span>
        {sub && <span className="a3d-stat-sub">{sub}</span>}
      </div>
      {onClick && <FaChevronRight className="a3d-stat-arrow" />}
    </Tag>
  );
}

// Combo chart: daily registrations as columns against the left axis,
// cumulative growth as a smooth line against the right axis — reads at a
// glance instead of forcing two very different scales onto one line.
function TrendChart({ trend }) {
  const categories = trend.map((t) => t.date);

  const options = useMemo(
    () => ({
      chart: { ...CHART_BASE, type: "line", toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { width: [0, 3], curve: "smooth" },
      plotOptions: { bar: { columnWidth: "60%", borderRadius: 3 } },
      colors: [PALETTE.accent, PALETTE.primary],
      fill: {
        type: ["solid", "gradient"],
        opacity: [0.85, 1],
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: { style: AXIS_LABEL_STYLE, rotate: -30, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: [
        { title: { text: "Registered", style: { color: PALETTE.textSoft, fontSize: "11px", fontWeight: 600 } }, labels: { style: AXIS_LABEL_STYLE } },
        { opposite: true, title: { text: "Cumulative", style: { color: PALETTE.textSoft, fontSize: "11px", fontWeight: 600 } }, labels: { style: AXIS_LABEL_STYLE } },
      ],
      grid: { borderColor: PALETTE.grid, strokeDashArray: 4 },
      legend: { position: "top", horizontalAlign: "right", fontSize: "12px", labels: { colors: PALETTE.textSoft }, markers: { radius: 4 } },
      tooltip: { theme: "light", shared: true, intersect: false },
    }),
    [categories]
  );

  const series = [
    { name: "Registered", type: "column", data: trend.map((t) => t.registered) },
    { name: "Cumulative", type: "line", data: trend.map((t) => t.cumulative) },
  ];

  return <Chart options={options} series={series} type="line" height={300} />;
}

function GenderDonut({ byGender }) {
  const male = byGender.M || 0;
  const female = byGender.F || 0;
  const otherCount = Object.entries(byGender).reduce(
    (sum, [key, count]) => (key === "M" || key === "F" ? sum : sum + count),
    0
  );
  const total = male + female + otherCount;
  const labels = otherCount ? ["Male", "Female", "Other"] : ["Male", "Female"];
  const series = otherCount ? [male, female, otherCount] : [male, female];

  const options = useMemo(
    () => ({
      chart: { ...CHART_BASE, type: "donut" },
      labels,
      colors: [PALETTE.primary, PALETTE.accent, PALETTE.textSoft],
      stroke: { width: 2, colors: ["#fff"] },
      dataLabels: { enabled: true, formatter: (val) => `${Math.round(val)}%` },
      legend: { position: "bottom", fontSize: "12px", labels: { colors: PALETTE.textSoft }, markers: { radius: 4 } },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              total: { show: true, label: "Total Students", color: PALETTE.textStrong, formatter: () => total },
              value: { color: PALETTE.textStrong, fontSize: "24px", fontWeight: 700 },
            },
          },
        },
      },
      tooltip: { theme: "light" },
    }),
    [labels, total]
  );

  return <Chart options={options} series={series} type="donut" height={280} />;
}

function DistributionBarChart({ title, rows, nameKey, onRowClick, color }) {
  if (!rows.length) {
    return (
      <div className="a3d-panel">
        <h4 className="a3d-panel-title">{title}</h4>
        <p className="a3d-empty">No data for this period.</p>
      </div>
    );
  }

  const categories = rows.map((r) => r[nameKey]);
  const data = rows.map((r) => r.count);
  const height = Math.max(200, rows.length * 40 + 40);

  const options = useMemo(
    () => ({
      chart: {
        ...CHART_BASE,
        type: "bar",
        toolbar: { show: false },
        events: {
          dataPointSelection: (_event, _chartContext, config) => onRowClick(rows[config.dataPointIndex]),
        },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
      colors: [color],
      dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "11px", fontWeight: 600 } },
      xaxis: { categories, labels: { style: AXIS_LABEL_STYLE } },
      yaxis: { labels: { style: { colors: PALETTE.textSoft, fontSize: "12px" } } },
      grid: { borderColor: PALETTE.grid, strokeDashArray: 4 },
      tooltip: { theme: "light" },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories.join("|"), color]
  );

  return (
    <div className="a3d-panel a3d-chart-clickable">
      <h4 className="a3d-panel-title">{title}</h4>
      <Chart options={options} series={[{ name: "Students", data }]} type="bar" height={height} />
    </div>
  );
}

function RadialGauge({ pct, label }) {
  const color = pct >= 75 ? PALETTE.success : pct >= 40 ? PALETTE.warning : PALETTE.danger;
  const options = useMemo(
    () => ({
      chart: { ...CHART_BASE, type: "radialBar" },
      colors: [color],
      labels: [label],
      plotOptions: {
        radialBar: {
          hollow: { size: "62%" },
          track: { background: PALETTE.grid },
          dataLabels: {
            name: { show: true, fontSize: "11px", color: PALETTE.textSoft, offsetY: -6 },
            value: { show: true, fontSize: "26px", fontWeight: 700, color: PALETTE.textStrong, offsetY: 6, formatter: (val) => `${val}%` },
          },
        },
      },
    }),
    [color, label]
  );
  return <Chart options={options} series={[pct]} type="radialBar" height={190} />;
}

function SkeletonStatCard() {
  return (
    <div className="a3d-skel-card">
      <div className="a3d-skel a3d-skel-icon" />
      <div className="a3d-skel-body">
        <div className="a3d-skel a3d-skel-line" style={{ width: "55%", height: 22 }} />
        <div className="a3d-skel a3d-skel-line" style={{ width: "75%", height: 12, marginTop: 8 }} />
      </div>
    </div>
  );
}

function SkeletonPanel({ height = 260, title = true }) {
  return (
    <div className="a3d-panel">
      {title && (
        <div className="a3d-skel a3d-skel-line" style={{ width: 160, height: 16, marginBottom: 16 }} />
      )}
      <div className="a3d-skel a3d-skel-block" style={{ height }} />
    </div>
  );
}

// Mirrors the finished page's actual sections/proportions (not a generic
// spinner) so the layout doesn't visibly jump once real data arrives.
function DashboardSkeleton() {
  return (
    <div className="a3d-page">
      <div className="a3d-header">
        <div>
          <div className="a3d-skel a3d-skel-line" style={{ width: 140, height: 26, marginBottom: 8 }} />
          <div className="a3d-skel a3d-skel-line" style={{ width: 280, height: 14 }} />
        </div>
        <div className="a3d-skel a3d-skel-line" style={{ width: 210, height: 42, borderRadius: 10 }} />
      </div>

      <section className="a3d-section">
        <div className="a3d-skel a3d-skel-line" style={{ width: 180, height: 18, marginBottom: 16 }} />
        <div className="a3d-stat-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <SkeletonPanel height={300} />
        <div className="a3d-two-col">
          <SkeletonPanel height={220} />
          <SkeletonPanel height={220} />
        </div>
        <SkeletonPanel height={260} />
      </section>

      <section className="a3d-section">
        <div className="a3d-skel a3d-skel-line" style={{ width: 200, height: 18, marginBottom: 16 }} />
        <div className="a3d-stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <div
          className="a3d-skel a3d-skel-block"
          style={{ height: 110, borderRadius: 14, marginBottom: "1.1rem" }}
        />
        <SkeletonPanel height={220} />
      </section>

      <section className="a3d-section">
        <div className="a3d-skel a3d-skel-line" style={{ width: 190, height: 18, marginBottom: 16 }} />
        <div className="a3d-stat-grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      </section>

      <section className="a3d-section">
        <div className="a3d-skel a3d-skel-line" style={{ width: 190, height: 18, marginBottom: 16 }} />
        <div className="a3d-stat-grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Admin3's own dashboard — real academic data only (no fees, discipline,
// or attendance, per explicit scope decision), replacing the generic
// Admin.jsx that Admin1 still sees at the same /admin route. The period
// selector scopes ACTIVITY (registrations, promotion runs, report-card
// sessions); structural counts (classes/subjects/departments/years) stay
// current-state totals regardless of period — filtering "how many
// subjects exist" by a date range doesn't correspond to a real question.
// Charts are ApexCharts throughout (swapped from Recharts) for a more
// finished, "real dashboard" look with a single shared color palette.
export const Admin3Dashboard = () => {
  useRestrictTo("Admin3");
  const navigate = useNavigate();

  const [period, setPeriod] = useState("this_academic_year");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/academics-dashboard/summary?period=${period}`);
      setData(res.data.data);
    } catch (err) {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const goToStudents = (state) => navigate("/admin-student", { state });

  if (loading && !data) {
    return (
      <SideTop>
        <DashboardSkeleton />
      </SideTop>
    );
  }
  if (!data) return <SideTop><div className="a3d-page" /></SideTop>;

  const { students, structure, promotion, reportCards } = data;
  const orientationPct = structure.orientation.total
    ? Math.round((structure.orientation.withChoice / structure.orientation.total) * 100)
    : null;

  return (
    <SideTop>
      <div className="a3d-page">
        <div className="a3d-header">
          <div>
            <h2 className="a3d-title">Dashboard</h2>
            <p className="a3d-subtitle">Real-time overview of students, classes, promotion, and report cards</p>
          </div>
          <Select
            className="a3d-period-select"
            classNamePrefix="a3d-select"
            options={PERIOD_OPTIONS}
            value={PERIOD_OPTIONS.find((o) => o.value === period)}
            onChange={(opt) => setPeriod(opt?.value || "all_time")}
            isSearchable={false}
          />
        </div>

        {/* ── Student population ── */}
        <section className="a3d-section">
          <h3 className="a3d-section-title">Student Population</h3>
          <div className="a3d-stat-grid">
            <StatCard
              icon={<FaUserGraduate />}
              label="Total Students"
              value={students.total}
              onClick={() => goToStudents({ status: "all" })}
            />
            <StatCard icon={<FaMale />} label="Male" value={students.byGender.M || 0} />
            <StatCard icon={<FaFemale />} label="Female" value={students.byGender.F || 0} tone="accent" />
            {Object.entries(students.byStatus).map(([status, count]) => (
              <StatCard
                key={status}
                icon={<FaClipboardList />}
                label={STATUS_LABELS[status] || status}
                value={count}
                onClick={() => goToStudents({ status })}
              />
            ))}
          </div>

          {students.trend.length > 0 && (
            <div className="a3d-panel">
              <h4 className="a3d-panel-title">Registration Trend</h4>
              <TrendChart trend={students.trend} />
            </div>
          )}

          <div className="a3d-two-col">
            <div className="a3d-panel">
              <h4 className="a3d-panel-title">Gender Distribution</h4>
              <GenderDonut byGender={students.byGender} />
            </div>
            <DistributionBarChart
              title="By Department"
              rows={students.byDepartment}
              nameKey="department_name"
              color={PALETTE.accent}
              onRowClick={(row) => goToStudents({ department_id: row.department_id, status: "all" })}
            />
          </div>

          <DistributionBarChart
            title="By Class"
            rows={students.byClass.slice(0, 10)}
            nameKey="class_name"
            color={PALETTE.primary}
            onRowClick={(row) => goToStudents({ class_id: row.class_id, status: "all" })}
          />
        </section>

        {/* ── Academic structure ── */}
        <section className="a3d-section">
          <h3 className="a3d-section-title">Academic Structure</h3>
          <div className="a3d-stat-grid">
            <StatCard
              icon={<FaLayerGroup />}
              label="Classes"
              value={structure.classCount}
              onClick={() => navigate("/academics/classes")}
            />
            <StatCard
              icon={<FaBook />}
              label="Subjects"
              value={structure.subjectCount}
              onClick={() => navigate("/academics/subjects")}
            />
            <StatCard
              icon={<FaCalendarAlt />}
              label="Academic Years"
              value={structure.academicYearCount}
              sub={structure.activeAcademicYear ? `Active: ${structure.activeAcademicYear}` : null}
              onClick={() => navigate("/academics/academic-years")}
            />
            <StatCard
              icon={<FaClipboardList />}
              label="Departments"
              value={structure.departmentCount}
              onClick={() => navigate("/admin-specialty")}
            />
          </div>

          {structure.orientation.total > 0 && (
            <button
              type="button"
              className="a3d-orientation-card"
              onClick={() => goToStudents({ openBackfill: true })}
            >
              <div className="a3d-orientation-gauge">
                <RadialGauge pct={orientationPct} label="Complete" />
              </div>
              <div className="a3d-orientation-text">
                <span className="a3d-orientation-title">Orientation Department Choices</span>
                <span className="a3d-orientation-sub">
                  {structure.orientation.withChoice} of {structure.orientation.total} orientation
                  students have a department choice recorded
                </span>
              </div>
              <FaChevronRight className="a3d-stat-arrow" />
            </button>
          )}

          {structure.classesByDepartment.length > 0 && (
            <DistributionBarChart
              title="Classes by Department"
              rows={structure.classesByDepartment}
              nameKey="department_name"
              color={PALETTE.textSoft}
              onRowClick={() => navigate("/academics/classes")}
            />
          )}
        </section>

        {/* ── Promotion activity ── */}
        <section className="a3d-section">
          <h3 className="a3d-section-title">Promotion Activity</h3>
          <div className="a3d-stat-grid">
            {promotion.latestRun ? (
              <StatCard
                icon={<FaGraduationCap />}
                label={`Latest Run — ${promotion.latestRun.status}`}
                value={promotion.latestRun.processed_students}
                sub={`${promotion.latestRun.academic_year_from} → ${promotion.latestRun.academic_year_to}`}
                tone={
                  promotion.latestRun.status === "failed"
                    ? "bad"
                    : promotion.latestRun.status === "completed"
                    ? "good"
                    : "warn"
                }
                onClick={() => navigate("/academics/promotion?tab=history")}
              />
            ) : (
              <StatCard icon={<FaGraduationCap />} label="No promotion runs in this period" value="—" />
            )}
            {promotion.stalledCount > 0 && (
              <StatCard
                icon={<FaExclamationTriangle />}
                label="Stalled/Interrupted Runs"
                value={promotion.stalledCount}
                tone="warn"
                onClick={() => navigate("/academics/promotion?tab=history")}
              />
            )}
          </div>
        </section>

        {/* ── Report card activity ── */}
        <section className="a3d-section">
          <h3 className="a3d-section-title">Report Card Activity</h3>
          <div className="a3d-stat-grid">
            {reportCards.latestSession ? (
              <StatCard
                icon={<FaBookOpen />}
                label={`Latest Session — ${reportCards.latestSession.status}`}
                value={`${reportCards.latestSession.completed_classes}/${reportCards.latestSession.total_classes}`}
                sub={`${reportCards.latestSession.academic_year} · ${reportCards.latestSession.term}`}
                tone={
                  reportCards.latestSession.status === "failed"
                    ? "bad"
                    : reportCards.latestSession.status === "completed"
                    ? "good"
                    : "warn"
                }
                onClick={() => navigate("/academics/report-cards/sessions")}
              />
            ) : (
              <StatCard icon={<FaBookOpen />} label="No report card sessions in this period" value="—" />
            )}
            <StatCard
              icon={<FaBell />}
              label="Unread Job Notifications"
              value={reportCards.unreadNotifications}
              tone={reportCards.unreadNotifications > 0 ? "warn" : undefined}
              onClick={() => navigate("/academics/report-cards/sessions")}
            />
          </div>
        </section>
      </div>
    </SideTop>
  );
};

export default Admin3Dashboard;
