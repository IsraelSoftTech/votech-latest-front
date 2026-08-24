import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import {
  FaIdCard,
  FaPrint,
  FaSearch,
  FaSync,
  FaEye,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCog,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import SideTop from "./SideTop";
import api from "../services/api";
import { useActiveYear } from "../context/ActiveYearContext";
import StudentIdCardPrint from "./StudentIdCardPrint";
import StudentIdCardPrintSheet from "./StudentIdCardPrintSheet";
import {
  DEFAULT_ID_CARD_SETTINGS,
  getStudentThumbUrl,
  preloadStudentPhotoMap,
} from "../utils/studentPhoto.util";
import { printHtmlElement } from "../utils/printIdCards.util";
import "./StudentIdCards.css";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const SEARCH_DEBOUNCE_MS = 250;
const listCache = new Map();

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildCacheKey({ yearId, page, limit, search, classFilter, statusFilter }) {
  return `${yearId ?? "all"}|${page}|${limit}|${search}|${classFilter}|${statusFilter}`;
}

const StudentThumb = React.memo(function StudentThumb({ student }) {
  const [err, setErr] = useState(false);
  const initial = student.full_name?.charAt(0)?.toUpperCase() || "?";
  const hasPhoto = Boolean(student.photo_url || student.photo);
  const studentDbId = student.student_db_id || student.id;
  const thumbUrl = hasPhoto && studentDbId ? getStudentThumbUrl(studentDbId) : null;

  if (thumbUrl && !err) {
    return (
      <img
        src={thumbUrl}
        alt=""
        className="sidc-thumb"
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
      />
    );
  }

  return <div className="sidc-thumb sidc-thumb-fallback">{initial}</div>;
});

function TableSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={`sk-${i}`} className="sidc-row-skeleton" aria-hidden="true">
          {Array.from({ length: 11 }, (_, j) => (
            <td key={j}>
              <span className="sidc-skeleton-bar" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function IdCardSettingsModal({ open, settings, saving, onClose, onSave }) {
  const [form, setForm] = useState({ ...DEFAULT_ID_CARD_SETTINGS });

  useEffect(() => {
    if (open && settings) {
      setForm({ ...DEFAULT_ID_CARD_SETTINGS, ...settings });
    }
  }, [open, settings]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sidc-modal-overlay" onClick={onClose}>
      <div
        className="sidc-modal sidc-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sidc-modal-header">
          <h2>
            <FaCog /> ID Card Header Settings
          </h2>
          <button type="button" className="sidc-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sidc-settings-body">
          <p className="sidc-settings-hint">
            Configure the school name, motto, and title shown on every student ID
            card header.
          </p>
          <div className="sidc-settings-grid">
            <label className="sidc-settings-field sidc-settings-field--wide">
              <span>School Name</span>
              <input
                name="school_name"
                value={form.school_name}
                onChange={handleChange}
                placeholder="School name"
              />
            </label>
            <label className="sidc-settings-field sidc-settings-field--wide">
              <span>Motto</span>
              <input
                name="motto"
                value={form.motto}
                onChange={handleChange}
                placeholder="School motto"
              />
            </label>
            <label className="sidc-settings-field">
              <span>Motto (French)</span>
              <input
                name="motto_fr"
                value={form.motto_fr}
                onChange={handleChange}
                placeholder="PAIX - TRAVAIL - PATRIE"
              />
            </label>
            <label className="sidc-settings-field">
              <span>Motto (English)</span>
              <input
                name="motto_en"
                value={form.motto_en}
                onChange={handleChange}
                placeholder="PEACE - WORK - FATHERLAND"
              />
            </label>
            <label className="sidc-settings-field">
              <span>Card Title</span>
              <input
                name="card_title"
                value={form.card_title}
                onChange={handleChange}
                placeholder="STUDENT ID CARD"
              />
            </label>
            <label className="sidc-settings-field">
              <span>QR Caption</span>
              <input
                name="qr_caption"
                value={form.qr_caption}
                onChange={handleChange}
                placeholder="Scan for attendance"
              />
            </label>
          </div>
          <div className="sidc-settings-preview">
            <span className="sidc-settings-preview-label">Preview</span>
            <StudentIdCardPrint
              student={{
                full_name: "Sample Student Name",
                student_id: "VTC-2026-00001",
                class_name: "Form 5 A",
                specialty_name: "Building Construction",
                academic_year_name: "2025/2026",
                sex: "M",
                date_of_birth: "2010-05-12",
                place_of_birth: "Yaoundé",
                registration_date: "2025-09-01",
                father_name: "John Doe",
                mother_name: "Jane Doe",
                guardian_contact: "+237 6XX XXX XXX",
                card_number: "VTC-2026-00001",
                qr_token: "00000000-0000-4000-8000-000000000001",
              }}
              settings={form}
              showCropMarks
            />
          </div>
        </div>
        <div className="sidc-modal-footer">
          <button
            type="button"
            className="sidc-btn sidc-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="sidc-btn sidc-btn-primary"
            disabled={saving}
            onClick={() => onSave(form)}
          >
            <FaSave /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentIdCards() {
  const { activeYear } = useActiveYear();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, generated: 0, missing: 0 });
  const [classOptions, setClassOptions] = useState([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [cardSettings, setCardSettings] = useState(DEFAULT_ID_CARD_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [printJob, setPrintJob] = useState(null);
  const [printPhotoMap, setPrintPhotoMap] = useState({});
  const [printing, setPrinting] = useState(false);

  const printRef = useRef(null);
  const fetchSeq = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, classFilter, statusFilter, itemsPerPage, activeYear?.id]);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getIdCardSettings();
      setCardSettings({ ...DEFAULT_ID_CARD_SETTINGS, ...data });
    } catch (e) {
      console.warn("ID card settings load failed", e);
    }
  }, []);

  const applyListPayload = useCallback((data) => {
    setRows(Array.isArray(data?.rows) ? data.rows : []);
    setTotalFiltered(Number(data?.total) || 0);
    setTotalPages(Math.max(1, Number(data?.totalPages) || 1));
    if (data?.stats) setStats(data.stats);
    if (Array.isArray(data?.classes)) setClassOptions(data.classes);
  }, []);

  const fetchPage = useCallback(
    async ({ silent = false, bustCache = false } = {}) => {
      const cacheKey = buildCacheKey({
        yearId: activeYear?.id,
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch,
        classFilter,
        statusFilter,
      });

      if (!bustCache && listCache.has(cacheKey)) {
        applyListPayload(listCache.get(cacheKey));
        setFetching(false);
        return;
      }

      const seq = ++fetchSeq.current;
      if (!silent) setFetching(true);

      try {
        const data = await api.getStudentIdCards({
          paginated: true,
          academic_year_id: activeYear?.id,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          class_name: classFilter === "all" ? "" : classFilter,
          card_status: statusFilter === "all" ? "" : statusFilter,
        });

        if (seq !== fetchSeq.current) return;

        listCache.set(cacheKey, data);
        applyListPayload(data);
      } catch (e) {
        if (seq !== fetchSeq.current) return;
        toast.error("Failed to load student ID cards");
        console.error(e);
      } finally {
        if (seq === fetchSeq.current) setFetching(false);
      }
    },
    [
      activeYear?.id,
      applyListPayload,
      classFilter,
      currentPage,
      debouncedSearch,
      itemsPerPage,
      statusFilter,
    ]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const startIndex =
    totalFiltered === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalFiltered);

  const printableOnPage = useMemo(
    () => rows.filter((r) => r.card_status === "generated"),
    [rows]
  );

  const selectedPrintCount = selected.length;

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = printableOnPage.map((r) => r.student_db_id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

    if (allPageSelected) {
      setSelected((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handlePageChange = (page) => setCurrentPage(page);

  const handleItemsPerPageChange = (size) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleRefresh = () => {
    listCache.clear();
    fetchPage({ bustCache: true });
  };

  const openPreview = async (row) => {
    setPreviewStudent(row);
    setPreviewLoading(true);
    try {
      const full = await api.getStudentIdCard(row.student_db_id);
      setPreviewStudent(full);
    } catch (e) {
      console.warn("Preview detail fetch failed, using list row", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runPrintJob = async (students, mode) => {
    if (!students.length) return;
    setPrinting(true);
    try {
      toast.info("Preparing cards for print…");
      const photoMap = await preloadStudentPhotoMap(students);

      flushSync(() => {
        setPrintPhotoMap(photoMap);
        setPrintJob({ students, mode });
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      const cardNodes = printRef.current?.querySelectorAll(".sid-card");
      if (!cardNodes?.length) {
        throw new Error("Print layout not ready");
      }

      const title =
        mode === "single"
          ? `ID-${students[0]?.student_id || "card"}`
          : "Student-ID-Cards";

      await printHtmlElement(printRef.current, title);
    } catch (e) {
      console.error(e);
      toast.error("Failed to print ID cards");
    } finally {
      setPrintJob(null);
      setPrintPhotoMap({});
      setPrinting(false);
    }
  };

  const handlePrintSelected = async () => {
    if (!selected.length) return;
    try {
      const students = await api.getStudentIdCardsBatch(selected);
      const printable = students.filter((s) => s.card_status === "generated");
      if (!printable.length) {
        toast.warn("No printable cards in selection");
        return;
      }
      await runPrintJob(printable, "grid");
    } catch (e) {
      console.error(e);
      toast.error("Failed to prepare selected cards");
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const result = await api.backfillStudentIdCards();
      toast.success(result.message || "Backfill complete");
      listCache.clear();
      await fetchPage({ bustCache: true, silent: true });
    } catch (e) {
      toast.error(e.message || "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  };

  const handleSaveSettings = async (form) => {
    setSavingSettings(true);
    try {
      const res = await api.updateIdCardSettings(form);
      const next = res.settings || res;
      setCardSettings({ ...DEFAULT_ID_CARD_SETTINGS, ...next });
      toast.success("ID card settings saved");
      setSettingsOpen(false);
    } catch (e) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const previewPhotoSrc = previewStudent
    ? getStudentThumbUrl(previewStudent.student_db_id || previewStudent.id)
    : null;

  const showEmpty = !fetching && rows.length === 0;

  return (
    <SideTop>
      <div className="sidc-page">
        <header className="sidc-header">
          <div className="sidc-header-text">
            <h1 className="sidc-title">
              <FaIdCard className="sidc-title-icon" />
              Student ID Cards
            </h1>
            <p className="sidc-subtitle">
              View and print student ID cards with unique QR codes for attendance
              scanning. Cards are auto-generated when students are registered.
            </p>
          </div>
          <div className="sidc-header-actions">
            <button
              type="button"
              className="sidc-btn sidc-btn-secondary"
              onClick={() => setSettingsOpen(true)}
              title="ID card header settings"
            >
              <FaCog /> Settings
            </button>
            {stats.missing > 0 && (
              <button
                type="button"
                className="sidc-btn sidc-btn-secondary"
                onClick={handleBackfill}
                disabled={backfilling}
              >
                <FaSync className={backfilling ? "sidc-spin" : ""} />
                Generate missing ({stats.missing})
              </button>
            )}
            <button
              type="button"
              className="sidc-btn sidc-btn-secondary"
              onClick={handleRefresh}
              disabled={fetching}
            >
              <FaSync className={fetching ? "sidc-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              className="sidc-btn sidc-btn-primary"
              onClick={handlePrintSelected}
              disabled={selectedPrintCount === 0 || printing}
            >
              <FaPrint />
              Print selected ({selectedPrintCount})
            </button>
          </div>
        </header>

        <div className="sidc-stats">
          <div className="sidc-stat-card">
            <span className="sidc-stat-label">Total Students</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="sidc-stat-card sidc-stat-card--ok">
            <FaCheckCircle />
            <span className="sidc-stat-label">Cards Generated</span>
            <strong>{stats.generated}</strong>
          </div>
          <div className="sidc-stat-card sidc-stat-card--warn">
            <FaExclamationTriangle />
            <span className="sidc-stat-label">Missing Cards</span>
            <strong>{stats.missing}</strong>
          </div>
          {activeYear?.name && (
            <div className="sidc-stat-card">
              <span className="sidc-stat-label">Academic Year</span>
              <strong>{activeYear.name}</strong>
            </div>
          )}
        </div>

        <div className="sidc-toolbar">
          <div className="sidc-search-wrap">
            <FaSearch className="sidc-search-icon" />
            <input
              type="text"
              className="sidc-search-input"
              placeholder="Search by name, student ID, or card number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="sidc-filter-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="sidc-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="generated">Generated</option>
            <option value="missing">Missing</option>
          </select>
        </div>

        <div className={`sidc-table-wrap ${fetching ? "sidc-table-wrap--fetching" : ""}`}>
          <table className="sidc-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      printableOnPage.length > 0 &&
                      printableOnPage.every((r) =>
                        selected.includes(r.student_db_id)
                      )
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all on this page"
                    disabled={fetching || printableOnPage.length === 0}
                  />
                </th>
                <th>Photo</th>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Department</th>
                <th>Academic Year</th>
                <th>Card No.</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching && rows.length === 0 ? (
                <TableSkeleton rows={itemsPerPage} />
              ) : showEmpty ? (
                <tr>
                  <td colSpan={11} className="sidc-empty-cell">
                    No students match your filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.student_db_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(row.student_db_id)}
                        disabled={row.card_status !== "generated"}
                        onChange={() => toggleSelect(row.student_db_id)}
                        aria-label={`Select ${row.full_name}`}
                      />
                    </td>
                    <td>
                      <StudentThumb student={row} />
                    </td>
                    <td>{row.full_name}</td>
                    <td>{row.student_id}</td>
                    <td>{row.class_name || "—"}</td>
                    <td>{row.specialty_name || "—"}</td>
                    <td>{row.academic_year_name || "—"}</td>
                    <td>{row.card_number || "—"}</td>
                    <td>
                      <span
                        className={`sidc-badge sidc-badge--${row.card_status}`}
                      >
                        {row.card_status === "generated"
                          ? "Generated"
                          : "Missing"}
                      </span>
                    </td>
                    <td>{formatDate(row.registration_date)}</td>
                    <td>
                      <button
                        type="button"
                        className="sidc-action-btn"
                        title="View & print"
                        disabled={row.card_status !== "generated"}
                        onClick={() => openPreview(row)}
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {fetching && rows.length > 0 && (
                <tr className="sidc-fetch-overlay-row" aria-hidden="true">
                  <td colSpan={11}>
                    <span className="sidc-fetch-indicator">Updating…</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {(rows.length > 0 || totalFiltered > 0) && (
          <div className="sidc-pagination">
            <div className="sidc-pagination-size">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) =>
                  handleItemsPerPageChange(Number(e.target.value))
                }
                className="sidc-pagination-select"
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="sidc-pagination-info">
              Showing {startIndex} to {endIndex} of {totalFiltered} entries
            </div>

            <div className="sidc-pagination-controls">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || fetching}
                className="sidc-pagination-btn"
              >
                Previous
              </button>

              <div className="sidc-pagination-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={fetching}
                      className={`sidc-pagination-number ${
                        currentPage === pageNum ? "active" : ""
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || fetching}
                className="sidc-pagination-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {previewStudent && (
          <div
            className="sidc-modal-overlay"
            onClick={() => setPreviewStudent(null)}
          >
            <div className="sidc-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sidc-modal-header">
                <h2>ID Card — {previewStudent.full_name}</h2>
                <button
                  type="button"
                  className="sidc-modal-close"
                  onClick={() => setPreviewStudent(null)}
                >
                  ×
                </button>
              </div>
              <div className="sidc-modal-body">
                {previewLoading && (
                  <p className="sidc-preview-loading">Loading card details…</p>
                )}
                <StudentIdCardPrint
                  student={previewStudent}
                  settings={cardSettings}
                  photoSrc={previewPhotoSrc}
                  showCropMarks
                />
              </div>
              <div className="sidc-modal-footer">
                <button
                  type="button"
                  className="sidc-btn sidc-btn-secondary"
                  onClick={() => setPreviewStudent(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="sidc-btn sidc-btn-primary"
                  disabled={printing || previewStudent.card_status !== "generated"}
                  onClick={() => runPrintJob([previewStudent], "single")}
                >
                  <FaPrint /> Print Card
                </button>
              </div>
            </div>
          </div>
        )}

        <IdCardSettingsModal
          open={settingsOpen}
          settings={cardSettings}
          saving={savingSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />

        {printJob &&
          createPortal(
            <div
              ref={printRef}
              className="sid-print-root sid-print-root--portal"
              aria-hidden="true"
            >
              <StudentIdCardPrintSheet
                students={printJob.students}
                settings={cardSettings}
                photoMap={printPhotoMap}
                layout={printJob.mode === "single" ? "single" : "grid"}
              />
            </div>,
            document.body
          )}
      </div>
    </SideTop>
  );
}
