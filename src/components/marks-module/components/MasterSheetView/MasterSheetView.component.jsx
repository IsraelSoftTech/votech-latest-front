import React, { useState, useMemo } from "react";
import Select from "react-select";
import {
  FaUsers,
  FaChartBar,
  FaBook,
  FaExclamationTriangle,
  FaTrophy,
  FaArrowDown,
} from "react-icons/fa";
import "./MasterSheetView.styles.css";

const TABS = [
  { key: "overview", label: "Overview", icon: <FaChartBar /> },
  { key: "students", label: "Students", icon: <FaUsers /> },
  { key: "subjects", label: "Subjects", icon: <FaBook /> },
  { key: "at-risk", label: "At Risk", icon: <FaExclamationTriangle /> },
];

function StatCard({ label, value, sub, tone }) {
  return (
    <div className={`msv-stat-card ${tone || ""}`}>
      <span className="msv-stat-value">{value}</span>
      <span className="msv-stat-label">{label}</span>
      {sub && <span className="msv-stat-sub">{sub}</span>}
    </div>
  );
}

function OverviewTab({ meta, analysis }) {
  const { overallStats, genStats, profStats, pracStats, distribution } = analysis;
  return (
    <div className="msv-tab-panel">
      <div className="msv-meta-line">
        {meta.className} · {meta.departmentName} · {meta.academicYear} ·{" "}
        {analysis.termInfo?.label}
      </div>

      <div className="msv-stat-grid">
        <StatCard label="Students" value={overallStats.totalStudents} />
        <StatCard label="Class Average" value={overallStats.classAverage} tone="primary" />
        <StatCard
          label="Highest"
          value={overallStats.highest}
          sub={overallStats.highestStudent}
          tone="good"
        />
        <StatCard
          label="Lowest"
          value={overallStats.lowest}
          sub={overallStats.lowestStudent}
          tone="bad"
        />
        <StatCard
          label="Pass Rate"
          value={`${overallStats.passRate}%`}
          sub={`${overallStats.passed} passed`}
          tone="good"
        />
        <StatCard
          label="Fail Rate"
          value={`${overallStats.failRate}%`}
          sub={`${overallStats.failed} failed`}
          tone="bad"
        />
      </div>

      <div className="msv-category-row">
        {genStats?.avg != null && (
          <div className="msv-category-card">
            <h4>General Subjects</h4>
            <span className="msv-category-avg">{genStats.avg}</span>
            <span className="msv-category-pass">{genStats.passRate}% pass rate</span>
          </div>
        )}
        {profStats?.avg != null && (
          <div className="msv-category-card">
            <h4>Professional Subjects</h4>
            <span className="msv-category-avg">{profStats.avg}</span>
            <span className="msv-category-pass">{profStats.passRate}% pass rate</span>
          </div>
        )}
        {pracStats?.avg != null && (
          <div className="msv-category-card">
            <h4>Practical Subjects</h4>
            <span className="msv-category-avg">{pracStats.avg}</span>
            <span className="msv-category-pass">{pracStats.passRate}% pass rate</span>
          </div>
        )}
      </div>

      <h4 className="msv-section-title">Grade Distribution</h4>
      <div className="msv-table-wrap">
        <table className="msv-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Range</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            {distribution.map((band) => (
              <tr key={band.label}>
                <td>{band.label}</td>
                <td>
                  {band.min}–{band.max}
                </td>
                <td>{band.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentsTab({ analysis }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("rank");
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = analysis.students;
    if (q) {
      rows = rows.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.regNo?.toLowerCase().includes(q)
      );
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [analysis.students, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const Th = ({ label, k }) => (
    <th className="msv-sortable-th" onClick={() => toggleSort(k)}>
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="msv-tab-panel">
      <input
        className="msv-search-input"
        placeholder="Search by name or registration number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="msv-table-wrap">
        <table className="msv-table">
          <thead>
            <tr>
              <Th label="Rank" k="rank" />
              <Th label="Name" k="name" />
              <th>Reg. No.</th>
              <Th label="General" k="genAvg" />
              <Th label="Professional" k="profAvg" />
              <Th label="Practical" k="pracAvg" />
              <Th label="Average" k="average" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.rank}</td>
                <td>{s.name}</td>
                <td>{s.regNo}</td>
                <td>{s.genAvg ?? "—"}</td>
                <td>{s.profAvg ?? "—"}</td>
                <td>{s.pracAvg ?? "—"}</td>
                <td className="msv-avg-cell">{s.average ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="msv-empty-cell">
                  No students match "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectsTab({ analysis }) {
  const options = analysis.allSubjects.map((s) => ({
    value: s.code,
    label: `${s.title} (${s.category})`,
  }));
  const [selected, setSelected] = useState(options[0]?.value || null);
  const subj = analysis.subjectStats.find((s) => s.code === selected);

  const rows = useMemo(() => {
    if (!subj) return [];
    return analysis.students
      .map((s) => ({ name: s.name, score: s.scores[subj.code]?.average ?? null }))
      .filter((r) => r.score != null)
      .sort((a, b) => b.score - a.score);
  }, [analysis.students, subj]);

  return (
    <div className="msv-tab-panel">
      <Select
        className="msv-subject-select"
        classNamePrefix="msv-select"
        options={options}
        value={options.find((o) => o.value === selected) || null}
        onChange={(opt) => setSelected(opt?.value || null)}
      />

      {subj && (
        <>
          <div className="msv-stat-grid msv-stat-grid-compact">
            <StatCard label="Class Average" value={subj.classAvg ?? "—"} tone="primary" />
            <StatCard label="Highest" value={subj.highest ?? "—"} tone="good" />
            <StatCard label="Lowest" value={subj.lowest ?? "—"} tone="bad" />
            <StatCard label="Pass Rate" value={`${subj.passRate}%`} tone="good" />
          </div>

          <div className="msv-leader-row">
            <div className="msv-leader-card good">
              <h4>
                <FaTrophy /> Top 3
              </h4>
              {subj.top3.map((t) => (
                <div key={t.name} className="msv-leader-item">
                  <span>{t.name}</span>
                  <span>{t.score}</span>
                </div>
              ))}
            </div>
            <div className="msv-leader-card bad">
              <h4>
                <FaArrowDown /> Bottom 3
              </h4>
              {subj.bottom3.map((t) => (
                <div key={t.name} className="msv-leader-item">
                  <span>{t.name}</span>
                  <span>{t.score}</span>
                </div>
              ))}
            </div>
          </div>

          <h4 className="msv-section-title">All Students — {subj.title}</h4>
          <div className="msv-table-wrap">
            <table className="msv-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AtRiskTab({ analysis }) {
  const students = analysis.failingStudents;
  if (!students.length) {
    return (
      <div className="msv-tab-panel">
        <div className="msv-empty-note">No students below the pass mark this term.</div>
      </div>
    );
  }
  return (
    <div className="msv-tab-panel">
      <div className="msv-at-risk-list">
        {students.map((s) => (
          <div key={s.id} className="msv-at-risk-card">
            <div className="msv-at-risk-header">
              <span className="msv-at-risk-name">{s.name}</span>
              <span className="msv-at-risk-avg">Average: {s.average}</span>
            </div>
            <div className="msv-at-risk-deficiencies">
              {s.deficiencies.map((d) => (
                <span key={d.code} className="msv-deficiency-pill">
                  {d.code}: {d.score}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MasterSheetView({ meta, analysis }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="msv-view">
      <div className="msv-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`msv-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab meta={meta} analysis={analysis} />}
      {activeTab === "students" && <StudentsTab analysis={analysis} />}
      {activeTab === "subjects" && <SubjectsTab analysis={analysis} />}
      {activeTab === "at-risk" && <AtRiskTab analysis={analysis} />}
    </div>
  );
}

export default MasterSheetView;
