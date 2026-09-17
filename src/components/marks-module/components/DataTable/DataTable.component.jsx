import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEllipsisH,
  FaChevronRight,
  FaChevronDown,
  FaChevronLeft,
  FaSlidersH,
  FaTimes,
  FaEye,
} from "react-icons/fa";
import "./DataTable.styles.css";
import { CustomDropdown, CustomInput } from "../Inputs/CustumInputs";
import Modal from "../Modal/Modal.component";
import { Button } from "../Button/Button.component";
import { EmptyState } from "../EmptyState/EmptyState.component";

// One table for every marks-module list, same props as before (nothing a
// page passes changed): `columns`, `data`, `onEdit`/`onDelete`/`onRowClick`,
// `filterCategories` (values for one loose any-column filter), `filters`
// (exact per-field dropdowns), `extraActions`, role gates, `limit`.
//
// What changed is only how it LOOKS, on both desktop and phones (65% of
// users), chosen from the "Summary Cards" direction:
//   - desktop: bold title column, navy header, 60px zebra rows, one kebab
//     menu per row instead of icon buttons (rendered on top of the page,
//     so a short table can never clip it)
//   - phone: one card per row: title + subtitle, a strip of up to three
//     values worth scanning, a kebab, the rest behind "More"
//   - both: search + filters in one toolbar with a record count, applied
//     filters as removable chips, a footer with the shown range and pager
//
// Server-paginated lists (students) pass `server` instead of relying on
// the built-in filtering: the same toolbar/table/cards render, but search,
// filters, sort and page are controlled by the parent, which re-fetches.
//   server = { search, onSearchChange, filters: [{ key, label, options,
//              value, onChange }], sort: { accessor, direction },
//              onSortChange(accessor, direction), page, totalPages, total,
//              limit, onPageChange }
//
// The card decides its own layout from the columns it already receives
// (no page changes, no new backend data): the first column is the title,
// numeric columns and rendered badges fill the strip, everything else is
// still reachable under "More", never dropped. A page may override with a
// one-word `role` on a column: "title" | "subtitle" | "kpi" | "hidden".

const MOBILE_QUERY = "(max-width: 768px)";
const SEGMENTED_MAX_OPTIONS = 4;
const INLINE_CONTROLS_MAX = 2;
const KPI_SLOTS = 3;

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(MOBILE_QUERY).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

// Closes a floating panel on outside click / Escape.
function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

const isBlank = (v) => v === null || v === undefined || v === "" || v === "-";
const isNumericValue = (v) => !isBlank(v) && typeof v !== "boolean" && !isNaN(Number(String(v).trim()));
const isSerialColumn = (col) =>
  /^(sn|s\/n|serial|#)$/i.test(String(col.accessor || "")) || /^(sn|s\/n|#)$/i.test(String(col.label || ""));

const cellText = (row, col) => (isBlank(row[col.accessor]) ? "-" : String(row[col.accessor]));

// Rows are usually API records with an `id`, but some pages hand in
// derived rows keyed by something else (class_id, sn). Every per-row
// state (open menu, expanded card, React keys) goes through this, so a
// missing `id` can never make several rows share one identity (which is
// what opened one menu per row, then closed them all on the first click).
const rowKeyOf = (row, index) => {
  for (const k of ["id", "_id", "key", "class_id", "student_id", "subject_id"]) {
    if (row && row[k] !== undefined && row[k] !== null && row[k] !== "") return `${k}:${row[k]}`;
  }
  return `i:${index}`;
};

// Works out which column plays which part on the phone card, from the
// column definitions and a sample of the data (see file header).
function inferCardRoles(columns, data) {
  const sample = data.slice(0, 50);
  const isNumericColumn = (col) =>
    !col.render &&
    sample.some((r) => isNumericValue(r[col.accessor])) &&
    sample.every((r) => isBlank(r[col.accessor]) || isNumericValue(r[col.accessor]));

  const usable = columns.filter((c) => !isSerialColumn(c) && c.role !== "hidden");
  const explicit = (role) => usable.find((c) => c.role === role);

  const title = explicit("title") || usable.find((c) => !c.render) || usable[0] || null;
  const subtitle =
    explicit("subtitle") ||
    usable.find((c) => c !== title && !c.render && !isNumericColumn(c) && !c.role) ||
    null;

  const taken = new Set([title, subtitle].filter(Boolean));
  const kpis = [];
  const push = (c) => {
    if (c && !taken.has(c) && kpis.length < KPI_SLOTS) {
      kpis.push(c);
      taken.add(c);
    }
  };
  usable.filter((c) => c.role === "kpi").forEach(push);
  usable.filter((c) => !c.role && isNumericColumn(c)).forEach(push);
  usable.filter((c) => !c.role && c.render).forEach(push);
  usable.filter((c) => !c.role).forEach(push);

  const rest = usable.filter((c) => !taken.has(c));
  return { title, subtitle, kpis, rest };
}

// Desktop row-action menu, rendered into document.body at a fixed
// position next to its button. Inside the table it would be clipped by
// the panel's overflow (a two-row table cut the menu in half); on top of
// the page nothing can hide it. Flips upward when there is no room below.
function FloatingMenu({ anchorRef, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const place = () => {
      const btn = anchorRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;
      const r = btn.getBoundingClientRect();
      const mh = menu.offsetHeight;
      const mw = menu.offsetWidth;
      const below = r.bottom + 6 + mh <= window.innerHeight;
      setPos({
        top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - mh),
        left: Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8)),
      });
    };
    place();
    window.addEventListener("resize", place);
    // Any scroll (page or the table's own horizontal scroller) moves the
    // button away from the menu, so close rather than float detached.
    // Ignored for the first moments after opening: focusing the kebab can
    // make the browser nudge its scroller into view, and that late scroll
    // event used to close the menu under the user's pointer.
    const openedAt = Date.now();
    const onScroll = () => {
      if (Date.now() - openedAt > 250) onClose();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchorRef, onClose]);

  // Outside click / Escape closes; a click on the menu's own button is
  // left to the button's toggle, otherwise dismiss-then-toggle reopens it.
  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="dt-menu dt-menu-floating"
      role="menu"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden", top: 0, left: 0 }}
    >
      {children}
    </div>,
    document.body
  );
}

// Slide-up panel for phones (filters, sort, row actions), one shape for all
// three so the gesture is learned once.
function Sheet({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="dt-sheet-overlay" onClick={onClose} role="presentation">
      <div className="dt-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="dt-sheet-grab" />
        <div className="dt-sheet-head">
          <span className="dt-sheet-title">{title}</span>
          <button type="button" className="dt-icon-btn" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>
        <div className="dt-sheet-body">{children}</div>
      </div>
    </div>
  );
}

function Segmented({ options, value, onChange, counts }) {
  return (
    <div className="dt-segmented" role="tablist">
      {options.map((opt) => (
        <button
          type="button"
          key={String(opt.value)}
          role="tab"
          aria-selected={String(value) === String(opt.value)}
          className={`dt-seg-item${String(value) === String(opt.value) ? " on" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {counts && counts[opt.value] !== undefined && <span className="dt-seg-count">{counts[opt.value]}</span>}
        </button>
      ))}
    </div>
  );
}

// Filter options arrive as plain strings (client mode) or {value, label}
// pairs (server mode, react-select style); everything below works on pairs.
const normalizeOptions = (options = []) =>
  options.map((o) => (o && typeof o === "object" ? { value: o.value, label: String(o.label ?? o.value) } : { value: o, label: String(o) }));
const ALL = { value: "All", label: "All" };
const isAll = (v) => v === "" || v === null || v === undefined || v === "All";

const DataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  onRowClick,
  loading = false,
  limit = 10,
  warnDelete,
  filterCategories = [],
  filters = [],
  extraActions = [],
  editRoles,
  deleteRoles,
  userRole,
  server,
  // Extra page-level buttons rendered at the end of the toolbar (e.g. a
  // "Download class list" that only makes sense next to the filters).
  toolbarActions,
  // Pages that run their own "are you sure" flow set this so Delete calls
  // onDelete straight away instead of opening the built-in confirmation.
  skipDeleteConfirm = false,
  searchPlaceholder = "Search...",
  // Row selection for bulk actions: a checkbox per row (and select-all on
  // desktop); `bulkActions` renders in a bar while something is selected
  // and receives the selected rows. Selection lives here, keyed the same
  // way menus and cards are (rowKeyOf), and clears when the data changes.
  selectable = false,
  bulkActions,
}) => {
  const isMobile = useIsMobile();
  const isServer = !!server;
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(server?.search || "");
  const [filterCategory, setFilterCategory] = useState("");
  const [fieldFilters, setFieldFilters] = useState({});
  const [sort, setSort] = useState({ accessor: null, direction: null }); // direction: 'asc' | 'desc' | null
  const [expandedRows, setExpandedRows] = useState({});
  const [menuRowId, setMenuRowId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [data]);

  const filtersRef = useRef(null);
  const menuButtonRef = useRef(null);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const closeMenu = useCallback(() => setMenuRowId(null), []);
  useDismiss(filtersOpen && !isMobile, closeFilters, filtersRef);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const normalizedSearchTerm = debouncedSearchTerm.trim().toLowerCase();

  // Server mode: typing is debounced here, the parent only re-fetches once
  // it settles; an outside reset of server.search (nav state) is mirrored.
  const serverSearchChange = server?.onSearchChange;
  const serverSearch = server?.search;
  useEffect(() => {
    if (isServer && serverSearchChange && debouncedSearchTerm !== (serverSearch || "")) {
      serverSearchChange(debouncedSearchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);
  useEffect(() => {
    if (isServer) setSearchTerm(serverSearch || "");
  }, [isServer, serverSearch]);

  // ── Filtering / sorting / paging (unchanged behavior) ─────────────────
  const matchesCategory = useCallback(
    (row, category) => {
      const normalizedFilter = String(category).toLowerCase();
      return columns.some(({ accessor }) => String(row[accessor]).toLowerCase().includes(normalizedFilter));
    },
    [columns]
  );

  const filteredData = useMemo(() => {
    if (isServer) return data;
    let filtered = data;
    if (filterCategory && filterCategory !== "All") {
      filtered = filtered.filter((row) => matchesCategory(row, filterCategory));
    }
    for (const f of filters) {
      const selected = fieldFilters[f.key];
      if (selected && selected !== "All") {
        filtered = filtered.filter((row) => String(row[f.accessor]) === String(selected));
      }
    }
    if (normalizedSearchTerm) {
      filtered = filtered.filter((row) =>
        columns.some(({ accessor }) => String(row[accessor]).toLowerCase().includes(normalizedSearchTerm))
      );
    }
    return filtered;
  }, [isServer, data, normalizedSearchTerm, filterCategory, fieldFilters, filters, columns, matchesCategory]);

  const sortedData = useMemo(() => {
    if (isServer || !sort.accessor || !sort.direction) return filteredData;
    const { accessor, direction } = sort;
    const copy = [...filteredData];
    copy.sort((a, b) => {
      const av = a[accessor];
      const bv = b[accessor];
      const aNum = Number(av);
      const bNum = Number(bv);
      const bothNumeric = !isBlank(av) && !isBlank(bv) && !isNaN(aNum) && !isNaN(bNum);
      const cmp = bothNumeric ? aNum - bNum : String(av ?? "").localeCompare(String(bv ?? ""));
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [isServer, filteredData, sort]);

  const effectiveSort = isServer ? server.sort || { accessor: null, direction: null } : sort;
  const nextSort = (prev, accessor) => {
    if (prev.accessor !== accessor) return { accessor, direction: "asc" };
    if (prev.direction === "asc") return { accessor, direction: "desc" };
    return { accessor: null, direction: null };
  };
  const toggleSort = (accessor) => {
    if (isServer) {
      const n = nextSort(effectiveSort, accessor);
      if (server.onSortChange) server.onSortChange(n.accessor, n.direction);
      return;
    }
    setSort((prev) => nextSort(prev, accessor));
  };
  const clearSort = () => {
    if (isServer) {
      if (server.onSortChange) server.onSortChange(null, null);
      return;
    }
    setSort({ accessor: null, direction: null });
  };

  const pageSize = isServer ? server.limit || limit : limit;
  const page = isServer ? server.page || 1 : currentPage;
  const totalRecords = isServer ? server.total ?? data.length : sortedData.length;
  const totalPages = isServer ? server.totalPages || 1 : Math.ceil(sortedData.length / limit);
  const startIndex = (page - 1) * pageSize;
  const paginatedData = isServer ? data : sortedData.slice(startIndex, startIndex + limit);
  const goToPage = (p) => {
    if (isServer) {
      if (server.onPageChange) server.onPageChange(p);
      return;
    }
    setCurrentPage(p);
  };

  useEffect(() => {
    if (!isServer) setCurrentPage(1);
  }, [isServer, searchTerm, filterCategory, fieldFilters]);

  // ── Selection ─────────────────────────────────────────────────────────
  const pageKeys = paginatedData.map((r, i) => rowKeyOf(r, startIndex + i));
  const allOnPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.has(k));
  const toggleKey = (key) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAllOnPage = () =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageKeys.forEach((k) => next.delete(k));
      else pageKeys.forEach((k) => next.add(k));
      return next;
    });
  const clearSelection = () => setSelectedKeys(new Set());
  const selectedRows = data.filter((r, i) => selectedKeys.has(rowKeyOf(r, i)));

  const openDeleteModal = (row) => setDeleteTarget(row);
  const closeDeleteModal = () => setDeleteTarget(null);
  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      closeDeleteModal();
    }
  };

  // ── Toolbar model ─────────────────────────────────────────────────────
  // One list of "controls" covering both filter props, so the toolbar
  // can decide presentation (segmented / dropdown / collapsed panel)
  // without caring which prop a control came from.
  const controls = useMemo(() => {
    const list = [];
    if (isServer) {
      for (const f of server.filters || []) {
        list.push({
          key: f.key,
          label: f.label || f.key,
          options: normalizeOptions(f.options),
          value: isAll(f.value) ? "" : f.value,
          set: (v) => f.onChange(isAll(v) ? "" : v),
          count: null,
        });
      }
      return list;
    }
    if (filterCategories.length > 0) {
      list.push({
        key: "__category",
        label: "Filter",
        options: normalizeOptions(filterCategories),
        value: filterCategory,
        set: (v) => setFilterCategory(isAll(v) ? "" : v),
        count: (opt) => data.filter((row) => matchesCategory(row, opt)).length,
      });
    }
    for (const f of filters) {
      list.push({
        key: f.key,
        label: f.label || f.key,
        options: normalizeOptions(f.options),
        value: fieldFilters[f.key] || "",
        set: (v) => setFieldFilters((prev) => ({ ...prev, [f.key]: isAll(v) ? "" : v })),
        count: (opt) => data.filter((row) => String(row[f.accessor]) === String(opt)).length,
      });
    }
    return list;
  }, [isServer, server, filterCategories, filters, filterCategory, fieldFilters, data, matchesCategory]);

  const appliedFilters = controls.filter((c) => !isAll(c.value));
  const labelOf = (c) => c.options.find((o) => String(o.value) === String(c.value))?.label ?? String(c.value);
  const clearAllFilters = () => {
    if (isServer) {
      controls.forEach((c) => c.set("All"));
      return;
    }
    setFilterCategory("");
    setFieldFilters({});
  };

  const sortableColumns = columns.filter((c) => c.sortable !== false);
  const sortedColumn = columns.find((c) => c.accessor === effectiveSort.accessor);

  // Inline when there are few controls, else one "Filters" button opening
  // a panel (popover on desktop, sheet on phones). On phones a single small
  // control still fits inline as a segmented row.
  const showInline = isMobile
    ? controls.length === 1 && controls[0].options.length <= SEGMENTED_MAX_OPTIONS
    : controls.length <= INLINE_CONTROLS_MAX;

  const renderControl = (c, { inPanel = false } = {}) => {
    const segmented = c.options.length <= SEGMENTED_MAX_OPTIONS && !inPanel;
    if (segmented) {
      let counts = null;
      if (c.count) {
        counts = { All: data.length };
        c.options.forEach((opt) => {
          counts[opt.value] = c.count(opt.value);
        });
      }
      return (
        <Segmented
          key={c.key}
          options={[ALL, ...c.options]}
          value={isAll(c.value) ? "All" : c.value}
          onChange={c.set}
          counts={counts}
        />
      );
    }
    // CustomDropdown speaks labels; map back to the option's value.
    const labels = ["All", ...c.options.map((o) => o.label)];
    return (
      <div className="dt-control" key={c.key}>
        <CustomDropdown
          label={inPanel ? c.label : undefined}
          value={isAll(c.value) ? "All" : labelOf(c)}
          onChange={(_, val) => c.set(val === "All" ? "All" : c.options.find((o) => o.label === val)?.value ?? val)}
          options={labels}
          name={c.key}
        />
      </div>
    );
  };

  const filtersPanelBody = (
    <div className="dt-filters-panel-body">
      {controls.map((c) => (
        <div className="dt-filters-panel-row" key={c.key}>
          {c.options.length <= SEGMENTED_MAX_OPTIONS ? (
            <>
              <span className="dt-panel-label">{c.label}</span>
              {renderControl(c)}
            </>
          ) : (
            renderControl(c, { inPanel: true })
          )}
        </div>
      ))}
      <div className="dt-filters-panel-foot">
        <Button variant="ghost" size="sm" onClick={clearAllFilters} disabled={appliedFilters.length === 0}>
          Clear all
        </Button>
        <Button size="sm" onClick={closeFilters}>
          Done
        </Button>
      </div>
    </div>
  );

  // ── Row actions ───────────────────────────────────────────────────────
  const canEdit = onEdit && (!editRoles || editRoles.includes(userRole));
  const canDelete = onDelete && (!deleteRoles || deleteRoles.includes(userRole));
  const actionsFor = (row) => {
    const list = [];
    if (onRowClick) list.push({ key: "view", icon: <FaEye />, title: "View", onClick: () => onRowClick(row) });
    if (canEdit) list.push({ key: "edit", icon: <FaEdit />, title: "Edit", onClick: () => onEdit(row) });
    extraActions.forEach(({ icon, title, onClick, roles, isVisible }, idx) => {
      if ((!roles || roles.includes(userRole)) && (!isVisible || isVisible(row))) {
        list.push({ key: `extra-${idx}`, icon, title, onClick: () => onClick(row) });
      }
    });
    if (canDelete) {
      list.push({
        key: "delete",
        icon: <FaTrash />,
        title: "Delete",
        danger: true,
        onClick: () => {
          if (warnDelete) warnDelete();
          if (skipDeleteConfirm) onDelete(row);
          else openDeleteModal(row);
        },
      });
    }
    return list;
  };
  const hasAnyAction = !!(onRowClick || canEdit || canDelete || extraActions.length);

  const renderMenuItems = (row) =>
    actionsFor(row).map((a) => (
      <button
        type="button"
        key={a.key}
        className={`dt-menu-item${a.danger ? " danger" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          // Action first, then close: the action (often a navigation) must
          // never depend on the menu still being mounted.
          a.onClick();
          closeMenu();
        }}
      >
        <span className="dt-menu-icon">{a.icon}</span>
        {a.title}
      </button>
    ));

  const roles = useMemo(() => inferCardRoles(columns, data), [columns, data]);
  const titleOf = (row) => (roles.title ? cellText(row, roles.title) : "");
  const menuRow =
    menuRowId !== null ? paginatedData.find((r, i) => rowKeyOf(r, startIndex + i) === menuRowId) : null;

  // ── Render ────────────────────────────────────────────────────────────
  const rangeText =
    totalRecords === 0
      ? "No records"
      : `Showing ${startIndex + 1} to ${Math.min(startIndex + paginatedData.length, totalRecords)} of ${totalRecords}`;
  const countText = isServer
    ? `${totalRecords} ${totalRecords === 1 ? "record" : "records"}`
    : sortedData.length === data.length
    ? `${data.length} ${data.length === 1 ? "record" : "records"}`
    : `${sortedData.length} of ${data.length} records`;

  const sortIcon = (accessor) =>
    effectiveSort.accessor === accessor ? (
      effectiveSort.direction === "asc" ? (
        <FaSortUp />
      ) : (
        <FaSortDown />
      )
    ) : (
      <FaSort className="dt-sort-idle" />
    );

  return (
    <div className="table-wrapper dt">
      {/* Toolbar */}
      <div className="dt-toolbar">
        <div className="dt-search">
          <CustomInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(name, val) => setSearchTerm(val)}
            onClear={() => setSearchTerm("")}
            name="search"
          />
        </div>

        {controls.length > 0 && showInline && (
          <div className="dt-inline-controls">{controls.map((c) => renderControl(c))}</div>
        )}

        {controls.length > 0 && !showInline && (
          <div className="dt-filters-anchor" ref={filtersRef}>
            <button
              type="button"
              className={`dt-tool-btn${appliedFilters.length ? " on" : ""}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <FaSlidersH />
              Filters
              {appliedFilters.length > 0 && <span className="dt-tool-count">{appliedFilters.length}</span>}
            </button>
            {filtersOpen && !isMobile && <div className="dt-popover">{filtersPanelBody}</div>}
          </div>
        )}

        {isMobile && sortableColumns.length > 0 && (
          <button
            type="button"
            className={`dt-tool-btn${effectiveSort.accessor ? " on" : ""}`}
            onClick={() => setSortOpen(true)}
          >
            {effectiveSort.direction === "desc" ? <FaSortDown /> : <FaSortUp />}
            {sortedColumn ? `Sort: ${sortedColumn.label}` : "Sort"}
          </button>
        )}

        {toolbarActions && <div className="dt-toolbar-actions">{toolbarActions}</div>}

        {!isMobile && <span className="dt-count">{loading ? "" : countText}</span>}
      </div>

      {(appliedFilters.length > 0 || isMobile) && !loading && (
        <div className="dt-chips-row">
          {appliedFilters.map((c) => (
            <button type="button" key={c.key} className="dt-chip" onClick={() => c.set("All")}>
              {c.label !== "Filter" ? `${c.label}: ` : ""}
              {labelOf(c)}
              <FaTimes />
            </button>
          ))}
          {appliedFilters.length > 1 && (
            <button type="button" className="dt-chip ghost" onClick={clearAllFilters}>
              Clear all
            </button>
          )}
          {isMobile && <span className="dt-count">{countText}</span>}
        </div>
      )}

      {selectable && selectedRows.length > 0 && !isMobile && (
        <div className="dt-bulk-bar" role="region" aria-label="Selected rows">
          <span className="dt-bulk-count">
            {selectedRows.length} selected
          </span>
          <div className="dt-bulk-actions">{typeof bulkActions === "function" ? bulkActions(selectedRows, clearSelection) : bulkActions}</div>
          <button type="button" className="dt-chip ghost" onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

      {/* Desktop table */}
      {!isMobile && (
        <div className="dt-panel">
          <div className="table-scroll-container">
            <table className={`data-table${onRowClick ? "" : " no-row-click"}`}>
              <thead>
                <tr>
                  {selectable && (
                    <th className="dt-select-th">
                      <input
                        type="checkbox"
                        className="dt-checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        aria-label="Select all rows on this page"
                        disabled={loading || paginatedData.length === 0}
                      />
                    </th>
                  )}
                  {columns.map(({ label, accessor, sortable }) => (
                    <th
                      key={accessor}
                      className={sortable === false ? "" : "sortable-col"}
                      onClick={sortable === false ? undefined : () => toggleSort(accessor)}
                      aria-sort={
                        effectiveSort.accessor === accessor
                          ? effectiveSort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <span className="th-content">
                        {label}
                        {sortable !== false && <span className="sort-icon">{sortIcon(accessor)}</span>}
                      </span>
                    </th>
                  ))}
                  {hasAnyAction && <th className="dt-actions-th" aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`loading-${i}`} className="table-row loading-row">
                      {selectable && <td className="dt-select-td" />}
                      {columns.map(({ accessor }, idx) => (
                        <td key={accessor}>
                          <div className={`loading-box${idx === 0 ? " wide" : ""}`} />
                        </td>
                      ))}
                      {hasAnyAction && (
                        <td>
                          <div className="loading-box action-loading" />
                        </td>
                      )}
                    </tr>
                  ))
                ) : paginatedData.length === 0 ? (
                  <tr className="no-data-row">
                    <td colSpan={columns.length + (hasAnyAction ? 1 : 0) + (selectable ? 1 : 0)} className="no-data">
                      <EmptyState
                        title="No data at the moment"
                        subtitle={appliedFilters.length || normalizedSearchTerm ? "Try clearing the search or filters." : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIndex) => {
                    const rowKey = rowKeyOf(row, startIndex + rowIndex);
                    return (
                    <tr
                      key={rowKey}
                      className={`table-row data-row${selectedKeys.has(rowKey) ? " selected" : ""}`}
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      {selectable && (
                        <td className="dt-select-td" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="dt-checkbox"
                            checked={selectedKeys.has(rowKey)}
                            onChange={() => toggleKey(rowKey)}
                            aria-label={`Select ${titleOf(row)}`}
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const { accessor, label, render } = col;
                        const isTitle = col === roles.title;
                        const text = render ? "" : cellText(row, col);
                        return (
                          <td
                            key={accessor}
                            data-label={label}
                            className={`cell-truncate${isTitle ? " dt-identity-cell" : ""}`}
                            title={render ? "" : text}
                          >
                            {isTitle && !render ? (
                              <span className="dt-identity-text">{text}</span>
                            ) : render ? (
                              render(row)
                            ) : (
                              text
                            )}
                          </td>
                        );
                      })}
                      {hasAnyAction && (
                        <td className="dt-actions-td" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`dt-icon-btn dt-kebab${menuRowId === rowKey ? " on" : ""}`}
                            aria-haspopup="menu"
                            aria-expanded={menuRowId === rowKey}
                            aria-label="Row actions"
                            onClick={(e) => {
                              menuButtonRef.current = e.currentTarget;
                              setMenuRowId((cur) => (cur === rowKey ? null : rowKey));
                            }}
                          >
                            <FaEllipsisH />
                          </button>
                          {menuRowId === rowKey && (
                            <FloatingMenu anchorRef={menuButtonRef} onClose={closeMenu}>
                              {renderMenuItems(row)}
                            </FloatingMenu>
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phone cards */}
      {isMobile && (
        <div className="dt-cards">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div className="dt-card skeleton" key={`skel-${i}`}>
                <div className="dt-card-head">
                  <div className="dt-card-titles">
                    <div className="loading-box title" />
                    <div className="loading-box sub" />
                  </div>
                </div>
                <div className="dt-kpis">
                  {Array.from({ length: 3 }).map((__, k) => (
                    <div className="dt-kpi" key={k}>
                      <div className="loading-box kpi-label" />
                      <div className="loading-box kpi-value" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : paginatedData.length === 0 ? (
            <EmptyState
              title="No data at the moment"
              subtitle={appliedFilters.length || normalizedSearchTerm ? "Try clearing the search or filters." : undefined}
            />
          ) : (
            paginatedData.map((row, rowIndex) => {
              const rowKey = rowKeyOf(row, startIndex + rowIndex);
              const expanded = !!expandedRows[rowKey];
              const title = titleOf(row);
              const pressable = !!onRowClick;
              return (
                <div
                  className={`dt-card${pressable ? " pressable" : ""}${selectedKeys.has(rowKey) ? " selected" : ""}`}
                  key={rowKey}
                  onClick={pressable ? () => onRowClick(row) : undefined}
                  role={pressable ? "button" : undefined}
                  tabIndex={pressable ? 0 : undefined}
                  onKeyDown={
                    pressable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="dt-card-head">
                    {selectable && (
                      <label className="dt-card-select" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="dt-checkbox"
                          checked={selectedKeys.has(rowKey)}
                          onChange={() => toggleKey(rowKey)}
                          aria-label={`Select ${title}`}
                        />
                      </label>
                    )}
                    <div className="dt-card-titles">
                      <div className="dt-card-title">{title || "-"}</div>
                      {roles.subtitle && (
                        <div className="dt-card-sub">
                          {roles.subtitle.render ? roles.subtitle.render(row) : cellText(row, roles.subtitle)}
                        </div>
                      )}
                    </div>
                    {hasAnyAction && (
                      <button
                        type="button"
                        className="dt-icon-btn dt-kebab"
                        aria-label="Row actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuRowId(rowKey);
                        }}
                      >
                        <FaEllipsisH />
                      </button>
                    )}
                    {pressable && !hasAnyAction && <FaChevronRight className="dt-card-chevron" />}
                  </div>

                  {roles.kpis.length > 0 && (
                    <div className="dt-kpis">
                      {roles.kpis.map((col) => (
                        <div className="dt-kpi" key={col.accessor}>
                          <span className="dt-kpi-label">{col.label}</span>
                          <span className="dt-kpi-value">{col.render ? col.render(row) : cellText(row, col)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {roles.rest.length > 0 && (
                    <>
                      {expanded && (
                        <div className="dt-more">
                          {roles.rest.map((col) => (
                            <div className="dt-more-row" key={col.accessor}>
                              <span className="dt-more-label">{col.label}</span>
                              <span className="dt-more-value">{col.render ? col.render(row) : cellText(row, col)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="dt-more-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
                        }}
                        aria-expanded={expanded}
                      >
                        {expanded ? "Less" : `More (${roles.rest.length})`}
                        <FaChevronDown className={`dt-more-icon${expanded ? " up" : ""}`} />
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {selectable && selectedRows.length > 0 && isMobile && (
        <div className="dt-bulk-bar" role="region" aria-label="Selected rows">
          <span className="dt-bulk-count">{selectedRows.length} selected</span>
          <div className="dt-bulk-actions">{typeof bulkActions === "function" ? bulkActions(selectedRows, clearSelection) : bulkActions}</div>
          <button type="button" className="dt-chip ghost" onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

      {/* Footer */}
      {!loading && paginatedData.length > 0 && (
        <div className="dt-footer">
          <span className="dt-range">{rangeText}</span>
          {totalPages > 1 && (
            <div className="dt-pager">
              <button
                type="button"
                className="dt-page-btn"
                disabled={page === 1}
                onClick={() => goToPage(page - 1)}
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>
              {isMobile ? (
                <span className="dt-page-status">
                  {page} / {totalPages}
                </span>
              ) : (
                Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  const showPage = pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - page) <= 1;
                  if (!showPage && pageNum === 2 && page > 3) {
                    return (
                      <span key={i} className="dt-page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  if (!showPage && pageNum === totalPages - 1 && page < totalPages - 2) {
                    return (
                      <span key={i} className="dt-page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  if (!showPage) return null;
                  return (
                    <button
                      type="button"
                      key={i}
                      className={`dt-page-btn${page === pageNum ? " active" : ""}`}
                      onClick={() => goToPage(pageNum)}
                      aria-current={page === pageNum ? "page" : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })
              )}
              <button
                type="button"
                className="dt-page-btn"
                disabled={page === totalPages}
                onClick={() => goToPage(page + 1)}
                aria-label="Next page"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phone sheets */}
      {isMobile && (
        <>
          <Sheet open={filtersOpen} title="Filters" onClose={closeFilters}>
            {filtersPanelBody}
          </Sheet>

          <Sheet open={sortOpen} title="Sort by" onClose={() => setSortOpen(false)}>
            <div className="dt-sort-list">
              {sortableColumns.map((c) => {
                const active = effectiveSort.accessor === c.accessor;
                return (
                  <button
                    type="button"
                    key={c.accessor}
                    className={`dt-menu-item${active ? " on" : ""}`}
                    onClick={() => toggleSort(c.accessor)}
                  >
                    <span className="dt-menu-icon">{active ? sortIcon(c.accessor) : <FaSort className="dt-sort-idle" />}</span>
                    {c.label}
                    {active && (
                      <span className="dt-sort-dir">{effectiveSort.direction === "asc" ? "Ascending" : "Descending"}</span>
                    )}
                  </button>
                );
              })}
              {effectiveSort.accessor && (
                <button type="button" className="dt-menu-item" onClick={clearSort}>
                  <span className="dt-menu-icon">
                    <FaTimes />
                  </span>
                  Clear sort
                </button>
              )}
            </div>
          </Sheet>

          <Sheet open={!!menuRow} title={menuRow ? titleOf(menuRow) : ""} onClose={closeMenu}>
            {menuRow && <div className="dt-sort-list">{renderMenuItems(menuRow)}</div>}
          </Sheet>
        </>
      )}

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={closeDeleteModal} title="Confirm Delete">
        {deleteTarget && (
          <div className="datatable-delete-content">
            <p className="delete-resource-text">
              Are you sure you want to delete <strong>{deleteTarget.name || titleOf(deleteTarget)}</strong>?
            </p>
            <div className="datatable-modal-buttons">
              <Button variant="secondary" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DataTable;
