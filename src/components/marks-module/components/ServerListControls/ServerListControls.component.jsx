import React, { useState, useEffect } from "react";
import { FaSearch, FaSortAmountDown, FaSortAmountUp, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Select from "react-select";
import "./ServerListControls.styles.css";

// Shared search/filter/sort/pagination toolbar for server-paginated lists
// (report card sessions, promotion history). Purely controlled — this
// component owns no fetch logic, the parent page passes current values +
// onChange handlers and re-fetches from its own effect. Search is
// debounced internally so the parent's effect only re-fetches once
// typing settles, not per keystroke.
export function ServerListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  statusOptions,
  statusValue,
  onStatusChange,
  sortOptions,
  sortValue,
  onSortChange,
  sortDir,
  onSortDirChange,
  page,
  totalPages,
  onPageChange,
  loading,
}) {
  const [localSearch, setLocalSearch] = useState(searchValue || "");

  useEffect(() => setLocalSearch(searchValue || ""), [searchValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) onSearchChange(localSearch);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  return (
    <div className="slc-toolbar">
      <div className="slc-search-wrap">
        <FaSearch className="slc-search-icon" />
        <input
          type="text"
          className="slc-search-input"
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {statusOptions && (
        <Select
          className="slc-select"
          classNamePrefix="slc-select"
          placeholder="Status"
          isClearable
          options={statusOptions}
          value={statusOptions.find((o) => o.value === statusValue) || null}
          onChange={(opt) => onStatusChange(opt?.value || "")}
        />
      )}

      {sortOptions && (
        <div className="slc-sort-group">
          <Select
            className="slc-select"
            classNamePrefix="slc-select"
            placeholder="Sort by"
            options={sortOptions}
            value={sortOptions.find((o) => o.value === sortValue) || sortOptions[0]}
            onChange={(opt) => onSortChange(opt?.value)}
          />
          <button
            type="button"
            className="slc-sort-dir-btn"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
          >
            {sortDir === "asc" ? <FaSortAmountUp /> : <FaSortAmountDown />}
          </button>
        </div>
      )}

      <div className="slc-pagination">
        <button
          type="button"
          className="slc-page-btn"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <FaChevronLeft />
        </button>
        <span className="slc-page-label">
          Page {page} of {totalPages || 1}
        </span>
        <button
          type="button"
          className="slc-page-btn"
          disabled={page >= (totalPages || 1) || loading}
          onClick={() => onPageChange(page + 1)}
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
}

export default ServerListControls;
