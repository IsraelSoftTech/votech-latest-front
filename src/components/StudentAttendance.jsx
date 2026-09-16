import React, { useCallback, useEffect, useMemo, useState } from "react";

import {

  FaArrowRight,

  FaChartBar,

  FaCheckCircle,

  FaClipboardCheck,

  FaClock,

  FaCog,

  FaExclamationTriangle,

  FaFilePdf,

  FaFileExcel,

  FaQrcode,

  FaSave,

  FaSearch,

  FaSignInAlt,

  FaSignOutAlt,

  FaTimes,

  FaUserPlus,

  FaUserShield,

} from "react-icons/fa";

import { toast } from "react-toastify";

import SideTop from "./SideTop";

import AttendanceQrScanner from "./AttendanceQrScanner";

import api from "../services/api";

import { useActiveYear } from "../context/ActiveYearContext";

import {

  formatCameroonClock,

  formatTime12From24,

  format12PartsTo24,

  parse24To12Parts,

  buildScannerStatusFromSettings,

  HOUR12_OPTIONS,

  MINUTE_OPTIONS,

  todayIsoDateInCameroon,

} from "../utils/cameroonTimeClient.util";

import { downloadStudentAttendanceExcel, downloadStudentAttendancePdf } from "../utils/studentAttendanceExcel.util";

import "./StudentAttendance.css";



const TABS = {

  SCANNER: "scanner",

  REPORTS: "reports",

  SETTINGS: "settings",

};



function ScannerTab({ settingsRefreshKey = 0 }) {

  const [clock, setClock] = useState(() => formatCameroonClock());

  const [hoursSettings, setHoursSettings] = useState(null);

  const [hoursLoading, setHoursLoading] = useState(true);

  const [cameraOpen, setCameraOpen] = useState(false);

  const [cameraMode, setCameraMode] = useState("check_in");

  const [processing, setProcessing] = useState(false);

  const [lastResult, setLastResult] = useState(null);

  const [recent, setRecent] = useState([]);



  const loadStatus = useCallback(async () => {

    try {

      const data = await api.getSchoolHours();

      setHoursSettings(data || null);

    } catch {

      /* keep previous */

    } finally {

      setHoursLoading(false);

    }

  }, []);



  useEffect(() => {
    loadStatus();
    const statusTimer = window.setInterval(loadStatus, 30000);
    return () => window.clearInterval(statusTimer);
  }, [loadStatus, settingsRefreshKey]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadStatus]);

  useEffect(() => {
    const tick = () => setClock(formatCameroonClock());
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const scannerStatus = useMemo(
    () => buildScannerStatusFromSettings(hoursSettings),
    [hoursSettings, clock]
  );



  const checkInAllowed = Boolean(scannerStatus.check_in_allowed);

  const checkOutAllowed = Boolean(scannerStatus.check_out_allowed);



  const openCamera = (mode) => {

    if (mode === "check_in" && !checkInAllowed) {

      if (scannerStatus.check_in_before_open) {
        toast.warn(
          `Check-in opens at ${scannerStatus.check_in_opens_at_display}`
        );
      } else {
        toast.warn(
          `Check-in is closed for today (school ends at ${scannerStatus.school_end_time_display})`
        );
      }

      return;

    }

    if (mode === "check_out" && !checkOutAllowed) {

      if (scannerStatus.check_out_after_close) {
        toast.warn(
          `Check-out is closed for today (window ended at ${scannerStatus.checkout_closes_at_display})`
        );
      } else if (
        !scannerStatus.allow_checkout_before_end &&
        scannerStatus.check_out_before_school_end
      ) {
        toast.warn(
          `Check-out opens at ${scannerStatus.school_end_time_display}`
        );
      } else {
        toast.warn(
          `Check-out opens at ${scannerStatus.check_in_opens_at_display}`
        );
      }

      return;

    }

    setCameraMode(mode);

    setCameraOpen(true);

  };



  const closeCamera = useCallback((opts = {}) => {

    setCameraOpen(false);

    if (opts.error) toast.error(opts.error);

  }, []);



  const handleDetected = async (token) => {

    if (processing) return;

    setProcessing(true);

    setCameraOpen(false);



    try {

      const result = await api.scanStudentAttendance(token, cameraMode);

      const entry = {

        ...result,

        at: formatCameroonClock(),

        ok: true,

      };

      setLastResult(entry);

      setRecent((prev) => [entry, ...prev].slice(0, 15));



      if (result.action === "check_out") {

        toast.info(`${result.student_name} — checked out at ${result.time}`);

      } else if (result.late || result.status === "late") {

        toast.warn(

          `${result.student_name} — late check-in at ${result.time} (+${result.minutes_late} min)`

        );

      } else {

        toast.success(`${result.student_name} — on time at ${result.time}`);

      }

    } catch (e) {

      const entry = {

        ok: false,

        error: e.message || "Scan failed",

        at: formatCameroonClock(),

      };

      setLastResult(entry);

      setRecent((prev) => [entry, ...prev].slice(0, 15));

      toast.error(e.message || "Scan failed");

    } finally {

      setProcessing(false);

      loadStatus();

    }

  };



  const lastClass =

    lastResult?.ok === false

      ? "satt-result--error"

      : lastResult?.action === "check_out"

        ? "satt-result--out"

        : lastResult?.status === "late"

          ? "satt-result--late"

          : lastResult?.ok

            ? "satt-result--in"

            : "";



  return (

    <div className="satt-scanner">

      <div className="satt-scanner-hero">

        <div className="satt-clock-block">

          <FaClock className="satt-clock-icon" aria-hidden="true" />

          <div>

            <span className="satt-clock-label">Cameroon time</span>

            <strong className="satt-clock-value">{clock}</strong>

          </div>

        </div>

        {!hoursLoading && hoursSettings && (

          <div className="satt-status-grid">

            <div

              className={`satt-status-card ${checkInAllowed ? "satt-status-card--ok" : "satt-status-card--wait"}`}

            >

              <span>Check-in window</span>

              <strong>
                {scannerStatus.check_in_opens_at_display} – {scannerStatus.school_end_time_display}
              </strong>

              <em>
                {checkInAllowed
                  ? "Open now"
                  : scannerStatus.check_in_before_open
                    ? "Not yet open"
                    : "Closed for today"}
              </em>

            </div>

            <div

              className={`satt-status-card ${checkOutAllowed ? "satt-status-card--ok" : "satt-status-card--wait"}`}

            >

              <span>Check-out window</span>

              <strong>

                {scannerStatus.allow_checkout_before_end

                  ? `${scannerStatus.check_in_opens_at_display} – ${scannerStatus.checkout_closes_at_display}`

                  : `${scannerStatus.school_end_time_display} – ${scannerStatus.checkout_closes_at_display}`}

              </strong>

              <em>
                {checkOutAllowed
                  ? "Available"
                  : scannerStatus.check_out_after_close
                    ? "Closed for today"
                    : scannerStatus.allow_checkout_before_end
                      ? "Not yet open"
                      : "After school end"}
              </em>

            </div>

          </div>

        )}

      </div>



      <div className="satt-scan-actions">

        <button

          type="button"

          className="satt-scan-btn satt-scan-btn--in"

          onClick={() => openCamera("check_in")}

          disabled={!checkInAllowed || processing || hoursLoading}

        >

          Scan In

        </button>



        <button

          type="button"

          className="satt-scan-btn satt-scan-btn--out"

          onClick={() => openCamera("check_out")}

          disabled={!checkOutAllowed || processing || hoursLoading}

        >

          Scan Out

        </button>

      </div>



      <p className="satt-scan-note">

        <FaQrcode aria-hidden="true" /> Point the back camera at the student ID card QR code.

        Scanning is automatic and usually completes in under a second.

      </p>



      {lastResult && (

        <div className={`satt-result ${lastClass}`}>

          {lastResult.ok ? (

            <>

              <div className="satt-result-head">

                {lastResult.action === "check_out" ? (

                  <FaSignOutAlt />

                ) : lastResult.status === "late" ? (

                  <FaExclamationTriangle />

                ) : (

                  <FaCheckCircle />

                )}

                <h3>

                  {lastResult.action === "check_out"

                    ? "Check-out recorded"

                    : lastResult.status === "late"

                      ? "Late check-in"

                      : "On-time check-in"}

                </h3>

              </div>

              <p className="satt-result-name">{lastResult.student_name}</p>

              {lastResult.class_name && (

                <p className="satt-result-meta">{lastResult.class_name}</p>

              )}

              <p className="satt-result-time">

                {lastResult.action === "check_out" ? "Check-out" : "Check-in"}:{" "}

                <strong>{lastResult.time}</strong>

              </p>

              {lastResult.action === "check_in" && lastResult.status === "late" && (

                <p className="satt-result-meta">Late by {lastResult.minutes_late} minute(s)</p>

              )}

              {lastResult.action === "check_out" && lastResult.check_in_time && (

                <p className="satt-result-meta">Checked in at {lastResult.check_in_time}</p>

              )}

            </>

          ) : (

            <>

              <div className="satt-result-head">

                <FaExclamationTriangle />

                <h3>Scan rejected</h3>

              </div>

              <p className="satt-result-meta">{lastResult.error}</p>

            </>

          )}

        </div>

      )}



      {recent.length > 0 && (

        <div className="satt-recent">

          <h4>Recent activity</h4>

          <ul className="satt-recent-list">

            {recent.map((item, idx) => (

              <li key={`${item.at}-${idx}`}>

                <span className="satt-recent-main">

                  {item.ok ? (

                    <>

                      <span

                        className={`satt-recent-tag ${item.action === "check_out" ? "satt-recent-tag--out" : "satt-recent-tag--in"}`}

                      >

                        {item.action === "check_out" ? "Out" : "In"}

                      </span>

                      {item.student_name} · {item.time}

                    </>

                  ) : (

                    item.error

                  )}

                </span>

                <span className="satt-recent-time">{item.at}</span>

              </li>

            ))}

          </ul>

        </div>

      )}



      <AttendanceQrScanner

        open={cameraOpen}

        mode={cameraMode}

        onClose={closeCamera}

        onDetected={handleDetected}

      />

    </div>

  );

}



function ReportsTab({ activeYear }) {

  const [from, setFrom] = useState(todayIsoDateInCameroon());

  const [to, setTo] = useState(todayIsoDateInCameroon());

  const [classId, setClassId] = useState("all");

  const [classes, setClasses] = useState([]);

  const [rows, setRows] = useState([]);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);



  useEffect(() => {

    api

      .getStudentAttendanceReportClasses(activeYear?.id)

      .then((data) => setClasses(Array.isArray(data) ? data : []))

      .catch(() => setClasses([]));

  }, [activeYear?.id]);



  const loadReport = async () => {

    setLoading(true);

    try {

      const data = await api.getStudentAttendanceReport({

        from,

        to,

        class_id: classId === "all" ? "" : classId,

        academic_year_id: activeYear?.id,

      });

      setRows(Array.isArray(data?.rows) ? data.rows : []);

      setSummary(data?.summary || null);

    } catch (e) {

      toast.error(e.message || "Failed to load report");

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    loadReport();

  }, [activeYear?.id]);



  const loadExportPayload = async () => {

    const data = await api.getStudentAttendanceReport({

      from,

      to,

      class_id: classId === "all" ? "" : classId,

      academic_year_id: activeYear?.id,

    });

    const exportRows = Array.isArray(data?.rows) ? data.rows : [];

    if (!exportRows.length) {

      throw new Error("No attendance records for this period.");

    }

    const classLabel =

      classId === "all"

        ? "All classes"

        : classes.find((c) => String(c.id) === String(classId))?.name || "Selected class";

    return {

      rows: exportRows,

      summary: data?.summary || {},

      from,

      to,

      classLabel,

      yearName: activeYear?.name || "",

    };

  };



  const handlePdfExport = async () => {

    setExportingPdf(true);

    try {

      const payload = await loadExportPayload();

      downloadStudentAttendancePdf(payload);

      toast.success("Attendance PDF downloaded");

    } catch (e) {

      toast.error(e.message || "Failed to download PDF");

    } finally {

      setExportingPdf(false);

    }

  };



  const handleExcelExport = async () => {

    setExporting(true);

    try {

      const payload = await loadExportPayload();

      await downloadStudentAttendanceExcel(payload);

      toast.success("Attendance Excel downloaded");

    } catch (e) {

      toast.error(e.message || "Failed to export Excel");

    } finally {

      setExporting(false);

    }

  };



  return (

    <div className="satt-reports">

      <div className="satt-filters satt-no-print">

        <div className="satt-field">

          <label htmlFor="satt-from">From</label>

          <input

            id="satt-from"

            type="date"

            value={from}

            onChange={(e) => setFrom(e.target.value)}

          />

        </div>

        <div className="satt-field">

          <label htmlFor="satt-to">To</label>

          <input

            id="satt-to"

            type="date"

            value={to}

            onChange={(e) => setTo(e.target.value)}

          />

        </div>

        <div className="satt-field satt-field--grow">

          <label htmlFor="satt-class">Class</label>

          <select

            id="satt-class"

            value={classId}

            onChange={(e) => setClassId(e.target.value)}

          >

            <option value="all">All classes</option>

            {classes.map((c) => (

              <option key={c.id} value={c.id}>

                {c.name}

              </option>

            ))}

          </select>

        </div>

        <button

          type="button"

          className="satt-btn satt-btn-primary"

          onClick={loadReport}

          disabled={loading}

        >

          <FaSearch /> {loading ? "Loading…" : "Load report"}

        </button>

        <button

          type="button"

          className="satt-btn satt-btn-pdf"

          onClick={handlePdfExport}

          disabled={exportingPdf || exporting || loading}

        >

          <FaFilePdf /> {exportingPdf ? "Preparing…" : "Download PDF"}

        </button>

        <button

          type="button"

          className="satt-btn satt-btn-excel"

          onClick={handleExcelExport}

          disabled={exporting || exportingPdf || loading}

        >

          <FaFileExcel /> {exporting ? "Preparing…" : "Excel"}

        </button>

      </div>



      <div className="satt-print-area">

        <h2 className="satt-report-title">Student Attendance Report</h2>

        <p className="satt-report-range">

          {from} to {to}

          {` · ${classId === "all" ? "All classes" : classes.find((c) => String(c.id) === String(classId))?.name || "Selected class"}`}

          {activeYear?.name ? ` · ${activeYear.name}` : ""}

        </p>



        {summary && (

          <div className="satt-stats">

            <div className="satt-stat">

              <span>Present</span>

              <strong>{summary.total_present}</strong>

            </div>

            <div className="satt-stat satt-stat--green">

              <span>On time</span>

              <strong>{summary.on_time}</strong>

            </div>

            <div className="satt-stat satt-stat--amber">

              <span>Late</span>

              <strong>{summary.late}</strong>

            </div>

            <div className="satt-stat satt-stat--blue">

              <span>Checked out</span>

              <strong>{summary.checked_out}</strong>

            </div>

            {summary.absent != null && (

              <div className="satt-stat">

                <span>Absent slots</span>

                <strong>{summary.absent}</strong>

              </div>

            )}

          </div>

        )}



        <div className="satt-table-wrap">

          {!rows.length ? (

            <div className="satt-empty">

              <FaChartBar className="satt-empty-icon" />

              <p>No attendance records for this period.</p>

            </div>

          ) : (

            <table className="satt-table">

              <thead>

                <tr>

                  <th>Date</th>

                  <th>Student</th>

                  <th>Student ID</th>

                  <th>Class</th>

                  <th>Check-in</th>

                  <th>Check-out</th>

                  <th>Status</th>

                  <th>Late (min)</th>

                </tr>

              </thead>

              <tbody>

                {rows.map((row) => (

                  <tr key={row.id}>

                    <td>{row.date_display}</td>

                    <td>{row.full_name}</td>

                    <td>{row.student_id}</td>

                    <td>{row.class_name}</td>

                    <td>{row.check_in}</td>

                    <td>{row.check_out}</td>

                    <td>

                      {row.status && row.status !== "—" ? (

                        <span className={`satt-badge satt-badge--${row.status}`}>

                          {row.status.replace("_", " ")}

                        </span>

                      ) : (

                        "—"

                      )}

                    </td>

                    <td>{row.minutes_late || "—"}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </div>

  );

}



function Time12Field({ id, label, hint, value24, onChange, disabled }) {
  const { hour12, minute, period } = parse24To12Parts(value24);

  const setPart = (part, val) => {
    const next = {
      hour12,
      minute,
      period,
      [part]:
        part === "period" ? val : Number(val),
    };
    onChange(format12PartsTo24(next.hour12, next.minute, next.period));
  };

  return (
    <div className="satt-field">
      <label htmlFor={`${id}-hour`}>
        {label} ({formatTime12From24(value24)})
      </label>
      <div className="satt-time-12" id={id}>
        <select
          id={`${id}-hour`}
          value={hour12}
          onChange={(e) => setPart("hour12", e.target.value)}
          disabled={disabled}
          aria-label={`${label} hour`}
        >
          {HOUR12_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="satt-time-sep">:</span>
        <select
          value={minute}
          onChange={(e) => setPart("minute", e.target.value)}
          disabled={disabled}
          aria-label={`${label} minute`}
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPart("period", e.target.value)}
          disabled={disabled}
          aria-label={`${label} AM or PM`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      {hint ? <span className="satt-field-hint">{hint}</span> : null}
    </div>
  );
}



function SettingsTab({ canEdit, onSettingsSaved }) {

  const [form, setForm] = useState({

    school_start_time: "07:30",

    school_end_time: "17:00",

    check_in_opens_at: "06:00",

    allow_checkout_before_end: false,

    checkout_grace_minutes_after_end: 30,

  });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);



  useEffect(() => {

    api

      .getSchoolHours()

      .then((data) => {

        const start = String(data.school_start_time || "07:30:00").slice(0, 5);

        const end = String(data.school_end_time || "17:00:00").slice(0, 5);

        const checkInOpens = String(data.check_in_opens_at || "06:00:00").slice(0, 5);

        setForm({

          school_start_time: start,

          school_end_time: end,

          check_in_opens_at: checkInOpens,

          allow_checkout_before_end: Boolean(data.allow_checkout_before_end),

          checkout_grace_minutes_after_end: Number(
            data.checkout_grace_minutes_after_end ?? 30
          ),

        });

      })

      .catch(() => {})

      .finally(() => setLoading(false));

  }, []);



  const handleCheckboxChange = (e) => {

    const { name, checked } = e.target;

    setForm((prev) => ({ ...prev, [name]: checked }));

  };



  const handleTimeChange = (name, value24) => {

    setForm((prev) => ({ ...prev, [name]: value24 }));

  };



  const handleNumberChange = (e) => {

    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

  };



  const handleSave = async () => {

    if (!canEdit) return;

    setSaving(true);

    try {

      const res = await api.updateSchoolHours({
        ...form,
        checkout_grace_minutes_after_end: Number(
          form.checkout_grace_minutes_after_end
        ),
      });

      const settings = res.settings || res;

      toast.success("Attendance settings saved");

      const start = String(settings.school_start_time || form.school_start_time).slice(0, 5);

      const end = String(settings.school_end_time || form.school_end_time).slice(0, 5);

      const checkInOpens = String(settings.check_in_opens_at || form.check_in_opens_at).slice(0, 5);

      setForm({

        school_start_time: start,

        school_end_time: end,

        check_in_opens_at: checkInOpens,

        allow_checkout_before_end: Boolean(settings.allow_checkout_before_end),

        checkout_grace_minutes_after_end: Number(
          settings.checkout_grace_minutes_after_end ??
            form.checkout_grace_minutes_after_end
        ),

      });

      onSettingsSaved?.();

    } catch (e) {

      toast.error(e.message || "Failed to save");

    } finally {

      setSaving(false);

    }

  };



  if (loading) {

    return <div className="satt-empty">Loading settings…</div>;

  }



  return (

    <div className="satt-settings">

      <div className="satt-settings-intro">

        <h3>School hours & scanner rules</h3>

      </div>



      <div className="satt-settings-grid">

        <Time12Field
          id="check_in_opens_at"
          label="Check-in opens at"
          hint="Scan In button activates at this time"
          value24={form.check_in_opens_at}
          onChange={(v) => handleTimeChange("check_in_opens_at", v)}
          disabled={!canEdit}
        />

        <Time12Field
          id="school_start_time"
          label="School start — lateness"
          hint="Arrivals after this time are marked late"
          value24={form.school_start_time}
          onChange={(v) => handleTimeChange("school_start_time", v)}
          disabled={!canEdit}
        />

        <Time12Field
          id="school_end_time"
          label="School end"
          hint="Default check-out window opens here"
          value24={form.school_end_time}
          onChange={(v) => handleTimeChange("school_end_time", v)}
          disabled={!canEdit}
        />

        <label className="satt-checkbox">

          <input

            type="checkbox"

            name="allow_checkout_before_end"

            checked={form.allow_checkout_before_end}

            onChange={handleCheckboxChange}

            disabled={!canEdit}

          />

          <span>

            <strong>Allow checkout before school end time</strong>

            <em>When enabled, Scan Out is available from check-in open time until the checkout window closes</em>

          </span>

        </label>

        <div className="satt-field">

          <label htmlFor="checkout_grace_minutes_after_end">

            Minutes after school end to close Scan Out
          </label>

          <input

            id="checkout_grace_minutes_after_end"

            name="checkout_grace_minutes_after_end"

            type="number"

            min={0}

            max={1440}

            step={1}

            value={form.checkout_grace_minutes_after_end}

            onChange={handleNumberChange}

            disabled={!canEdit}

          />

          <span className="satt-field-hint">

            e.g. school end 5:00 PM + 30 min → Scan Out disabled after 5:30 PM

          </span>

        </div>

      </div>



      {canEdit ? (

        <button

          type="button"

          className="satt-btn satt-btn-primary satt-settings-save"

          onClick={handleSave}

          disabled={saving}

        >

          <FaSave /> {saving ? "Saving…" : "Save settings"}

        </button>

      ) : (

        <p className="satt-settings-readonly">Only Admin3 can edit these settings.</p>

      )}

    </div>

  );

}



// Admin3 only: hand the attendance page to any user on the system. A granted
// user gets the same Scanner and Reports tabs the Discipline account has.
function AttendanceAccessCard() {
  const [users, setUsers] = useState([]);
  const [granted, setGranted] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [allUsers, accessList] = await Promise.all([
        api.getUsers(),
        api.getAttendanceAccessUsers(),
      ]);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
      setGranted(Array.isArray(accessList) ? accessList : []);
    } catch (e) {
      toast.error(e.message || "Failed to load attendance access");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grantedIds = useMemo(
    () => new Set(granted.map((g) => Number(g.id))),
    [granted]
  );

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => !grantedIds.has(Number(u.id)))
      .filter((u) =>
        term
          ? `${u.name || ""} ${u.username || ""} ${u.role || ""}`
              .toLowerCase()
              .includes(term)
          : true
      );
  }, [users, grantedIds, search]);

  const handleGrant = async () => {
    const userId = Number(selectedId);
    if (!userId) {
      toast.error("Select a user first");
      return;
    }
    setSaving(true);
    try {
      const res = await api.grantAttendanceAccess(userId);
      toast.success(res.message || "Attendance access granted");
      setSelectedId("");
      setSearch("");
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to grant access");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (user) => {
    setSaving(true);
    try {
      await api.revokeAttendanceAccess(user.id);
      toast.success(`Attendance access removed for ${user.name}`);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to remove access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="satt-settings satt-access">
      <div className="satt-settings-intro">
        <h3>
          <FaUserShield className="satt-access-icon" /> Attendance access
        </h3>
        <p>
          Give any user the attendance page. They get the same Scanner and
          Reports tabs the Discipline account has — Settings stays with Admin3.
        </p>
      </div>

      <div className="satt-filters">
        <div className="satt-field satt-field--grow">
          <label htmlFor="satt-access-search">Find user</label>
          <input
            id="satt-access-search"
            type="text"
            placeholder="Search by name, username or role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="satt-field satt-field--grow">
          <label htmlFor="satt-access-user">User</label>
          <select
            id="satt-access-user"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">
              {loading ? "Loading users…" : "Select a user"}
            </option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.username}) — {u.role}
              </option>
            ))}
          </select>
          <span className="satt-field-hint">
            {candidates.length} user{candidates.length === 1 ? "" : "s"} without
            attendance access
          </span>
        </div>

        <button
          type="button"
          className="satt-btn satt-btn-primary"
          onClick={handleGrant}
          disabled={saving || !selectedId}
        >
          <FaUserPlus /> Give access
        </button>
      </div>

      {loading ? (
        <div className="satt-empty">Loading attendance access…</div>
      ) : granted.length === 0 ? (
        <div className="satt-empty">
          No extra users have attendance access yet.
        </div>
      ) : (
        <div className="satt-table-wrap">
          <table className="satt-table satt-access-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Given by</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {granted.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.granted_by_name || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="satt-btn satt-btn-secondary satt-access-revoke"
                      onClick={() => handleRevoke(u)}
                      disabled={saving}
                    >
                      <FaTimes /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StudentAttendance({

  defaultTab = TABS.SCANNER,

  embedded = false,

}) {

  const { activeYear } = useActiveYear();

  const [tab, setTab] = useState(defaultTab);

  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);



  const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");

  // Settings belongs to Admin3 alone. Everyone else who can reach this page —
  // Discipline, Dean, Admin4, or a user granted access — gets Scanner and
  // Reports only.
  const canManageSettings = authUser?.role === "Admin3";

  useEffect(() => {
    if (!canManageSettings && tab === TABS.SETTINGS) setTab(TABS.SCANNER);
  }, [canManageSettings, tab]);



  const content = (

    <div className="satt-page">

      <header className="satt-header">

        <div className="satt-header-text">

          <h1 className="satt-title">

            <FaClipboardCheck className="satt-title-icon" />

            Student Attendance

          </h1>

          <p className="satt-subtitle">

            Daily check-in and check-out with student ID QR codes. Times recorded in

            12-hour format (Cameroon).

          </p>

        </div>

        {activeYear?.name && (

          <div className="satt-year-pill">

            <FaArrowRight aria-hidden="true" /> {activeYear.name}

          </div>

        )}

      </header>

      <div className="satt-body">
      <div className="satt-tabs satt-no-print">

        <button

          type="button"

          className={`satt-tab ${tab === TABS.SCANNER ? "active" : ""}`}

          onClick={() => {
            setTab(TABS.SCANNER);
            setSettingsRefreshKey((k) => k + 1);
          }}

        >

          <FaQrcode /> Scanner

        </button>

        <button

          type="button"

          className={`satt-tab ${tab === TABS.REPORTS ? "active" : ""}`}

          onClick={() => setTab(TABS.REPORTS)}

        >

          <FaChartBar /> Reports

        </button>

        {canManageSettings && (
          <button
            type="button"
            className={`satt-tab ${tab === TABS.SETTINGS ? "active" : ""}`}
            onClick={() => setTab(TABS.SETTINGS)}
          >
            <FaCog /> Settings
          </button>
        )}

      </div>



      <div className="satt-panel">

        {tab === TABS.SCANNER && (
          <ScannerTab settingsRefreshKey={settingsRefreshKey} />
        )}

        {tab === TABS.REPORTS && <ReportsTab activeYear={activeYear} />}

        {tab === TABS.SETTINGS && canManageSettings && (
          <>
            <SettingsTab
              canEdit={canManageSettings}
              onSettingsSaved={() => setSettingsRefreshKey((k) => k + 1)}
            />
            <AttendanceAccessCard />
          </>
        )}

      </div>
      </div>

    </div>

  );



  if (embedded) return content;

  return <SideTop>{content}</SideTop>;

}


