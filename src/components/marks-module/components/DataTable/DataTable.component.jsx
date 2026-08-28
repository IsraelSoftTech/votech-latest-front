import React, { useState, useMemo, useEffect } from "react";
import { FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import "./DataTable.styles.css";
import { CustomDropdown, CustomInput } from "../Inputs/CustumInputs";
import Modal from "../Modal/Modal.component";
import { Button } from "../Button/Button.component";

// Delays applying a fast-changing value (e.g. a search input) until it's
// been stable for `delay`ms, so filtering a large table doesn't re-run on
// every keystroke.
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}


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
  // Independent, AND-combined dropdown filters, each matching one field
  // exactly rather than filterCategories' loose any-column substring
  // match: [{ key, label, accessor, options: [{value, label}] }]
  filters = [],
  extraActions = [],
  editRoles,
  deleteRoles,
  userRole,
}) => {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [fieldFilters, setFieldFilters] = useState({});
  const [expandedCells, setExpandedCells] = useState({});
  const [sort, setSort] = useState({ accessor: null, direction: null }); // direction: 'asc' | 'desc' | null

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const normalizedSearchTerm = debouncedSearchTerm.trim().toLowerCase();

  const filteredData = useMemo(() => {
    let filtered = data;

    if (filterCategory && filterCategory !== "All") {
      const normalizedFilter = filterCategory.toLowerCase();
      filtered = filtered.filter((row) =>
        columns.some(({ accessor }) =>
          String(row[accessor]).toLowerCase().includes(normalizedFilter)
        )
      );
    }

    for (const f of filters) {
      const selected = fieldFilters[f.key];
      if (selected && selected !== "All") {
        filtered = filtered.filter(
          (row) => String(row[f.accessor]) === String(selected)
        );
      }
    }

    if (normalizedSearchTerm) {
      filtered = filtered.filter((row) =>
        columns.some(({ accessor }) =>
          String(row[accessor]).toLowerCase().includes(normalizedSearchTerm)
        )
      );
    }

    return filtered;
  }, [data, normalizedSearchTerm, filterCategory, fieldFilters, filters, columns]);

  const sortedData = useMemo(() => {
    if (!sort.accessor || !sort.direction) return filteredData;
    const { accessor, direction } = sort;
    const copy = [...filteredData];
    copy.sort((a, b) => {
      const av = a[accessor];
      const bv = b[accessor];
      const aNum = Number(av);
      const bNum = Number(bv);
      const bothNumeric =
        av !== null && av !== undefined && av !== "" &&
        bv !== null && bv !== undefined && bv !== "" &&
        !isNaN(aNum) && !isNaN(bNum);
      const cmp = bothNumeric
        ? aNum - bNum
        : String(av ?? "").localeCompare(String(bv ?? ""));
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filteredData, sort]);

  const toggleSort = (accessor) => {
    setSort((prev) => {
      if (prev.accessor !== accessor) return { accessor, direction: "asc" };
      if (prev.direction === "asc") return { accessor, direction: "desc" };
      return { accessor: null, direction: null };
    });
  };

  const totalPages = Math.ceil(sortedData.length / limit);
  const startIndex = (currentPage - 1) * limit;
  const paginatedData = sortedData.slice(startIndex, startIndex + limit);

  const openDeleteModal = (row) => setDeleteTarget(row);
  const closeDeleteModal = () => setDeleteTarget(null);
  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      closeDeleteModal();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, fieldFilters]);

  // Toggle expanded state for a cell
  const toggleExpanded = (rowId, accessor) => {
    const key = `${rowId}-${accessor}`;
    setExpandedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Check if text is long (more than 50 characters)
  const isTextLong = (text) => {
    return String(text || "").length > 50;
  };

  // Get truncated text
  const getTruncatedText = (text) => {
    const textStr = String(text || "");
    return textStr.length > 50 ? textStr.substring(0, 50) : textStr;
  };

  return (
    <div className="table-wrapper">
      {/* Search & Filter */}
      <div className="table-controls">
        <div className="table-search">
          <CustomInput
            placeholder="Search..."
            value={searchTerm}
            onChange={(name, val) => setSearchTerm(val)}
            onClear={() => setSearchTerm("")}
            name="search"
          />
        </div>

        {filterCategories.length > 0 && (
          <div className="table-search">
            <CustomDropdown
              value={filterCategory}
              onChange={(name, val) => setFilterCategory(val)}
              options={["All", ...filterCategories]}
              name="filterCategory"
            />
          </div>
        )}

        {filters.map((f) => (
          <div className="table-search" key={f.key}>
            <CustomDropdown
              label={f.label}
              value={fieldFilters[f.key] || ""}
              onChange={(_, val) =>
                setFieldFilters((prev) => ({ ...prev, [f.key]: val }))
              }
              options={["All", ...f.options]}
              name={f.key}
            />
          </div>
        ))}
      </div>

      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(({ label, accessor, sortable }) => (
                <th
                  key={accessor}
                  className={sortable === false ? "" : "sortable-col"}
                  onClick={sortable === false ? undefined : () => toggleSort(accessor)}
                >
                  <span className="th-content">
                    {label}
                    {sortable !== false && (
                      <span className="sort-icon">
                        {sort.accessor === accessor ? (
                          sort.direction === "asc" ? (
                            <FaSortUp />
                          ) : (
                            <FaSortDown />
                          )
                        ) : (
                          <FaSort className="sort-icon-idle" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5)
                .fill()
                .map((_, i) => (
                  <tr key={`loading-${i}`} className="table-row loading-row">
                    {/* Desktop loading */}
                    {columns.map(({ accessor }) => (
                      <td key={accessor} className="desktop-cell">
                        <div className="loading-box" />
                      </td>
                    ))}
                    <td className="desktop-cell">
                      <div className="loading-box action-loading" />
                    </td>

                    {/* Mobile loading skeleton */}
                    <td
                      className="mobile-card-cell"
                      colSpan={columns.length + 1}
                    >
                      <div className="mobile-card skeleton-card">
                        <div className="card-body">
                          {columns.map(({ accessor }, idx) => (
                            <div
                              key={accessor || idx}
                              className="card-row skeleton-row"
                            >
                              <div className="skeleton-label"></div>
                              <div className="skeleton-value"></div>
                            </div>
                          ))}
                        </div>
                        <div className="card-footer">
                          <div className="action-buttons-mobile">
                            <div className="skeleton-btn"></div>
                            <div className="skeleton-btn"></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
            ) : sortedData.length === 0 ? (
              <tr className="no-data-row">
                <td colSpan={columns.length + 1} className="no-data">
                  No data at the moment
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={row.id} className="table-row data-row">
                  {/* Desktop cells */}
                  {columns.map(({ accessor, label, render }) => (
                    <td
                      key={accessor}
                      data-label={label}
                      className="cell-truncate desktop-cell"
                      title={render ? "" : row[accessor] || ""}
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      {render ? render(row) : row[accessor]}
                    </td>
                  ))}
                  <td
                    className="desktop-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="vt-row-actions">
                      {(!editRoles || editRoles.includes(userRole)) && (
                        <button
                          className="vt-row-action-btn vt-row-action-edit"
                          onClick={() => onEdit(row)}
                          title="Edit"
                          type="button"
                        >
                          <FaEdit />
                        </button>
                      )}

                      {(!deleteRoles || deleteRoles.includes(userRole)) && (
                        <button
                          className="vt-row-action-btn vt-row-action-delete"
                          onClick={() => {
                            if (warnDelete) warnDelete();
                            openDeleteModal(row);
                          }}
                          title="Delete"
                          type="button"
                        >
                          <FaTrash />
                        </button>
                      )}

                      {extraActions.map(
                        ({ icon, title, onClick, roles, isVisible }, idx) =>
                          (!roles || roles.includes(userRole)) &&
                          (!isVisible || isVisible(row)) && (
                            <button
                              key={idx}
                              className="vt-row-action-btn vt-row-action-extra"
                              onClick={() => onClick(row)}
                              title={title}
                              type="button"
                            >
                              {icon}
                            </button>
                          )
                      )}
                    </div>
                  </td>

                  {/* Mobile card */}
                  <td className="mobile-card-cell" colSpan={columns.length + 1}>
                    <div
                      className="mobile-card"
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      <div className="card-body">
                        {columns.map(({ accessor, label, render }) => {
                          if (render) {
                            return (
                              <div key={accessor} className="card-row">
                                {label && <span className="row-label">{label}</span>}
                                <div className="row-value-wrapper">{render(row)}</div>
                              </div>
                            );
                          }

                          const cellKey = `${row.id}-${accessor}`;
                          const isExpanded = expandedCells[cellKey];
                          const textValue = row[accessor] || "-";
                          const isLong = isTextLong(textValue);

                          return (
                            <div key={accessor} className="card-row">
                              <span className="row-label">{label}</span>
                              <div className="row-value-wrapper">
                                <span
                                  className={`row-value ${
                                    isExpanded ? "expanded" : ""
                                  }`}
                                >
                                  {isExpanded || !isLong
                                    ? textValue
                                    : getTruncatedText(textValue)}
                                </span>
                                {isLong && (
                                  <button
                                    className="toggle-text-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpanded(row.id, accessor);
                                    }}
                                  >
                                    {isExpanded ? "show less" : "...see more"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        className="card-footer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="action-buttons-mobile">
                          {(!editRoles || editRoles.includes(userRole)) && (
                            <button
                              className="btn-mobile btn-edit-mobile"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(row);
                              }}
                              type="button"
                            >
                              <FaEdit />
                              <span>Edit</span>
                            </button>
                          )}

                          {(!deleteRoles || deleteRoles.includes(userRole)) && (
                            <button
                              className="btn-mobile btn-delete-mobile"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (warnDelete) warnDelete();
                                openDeleteModal(row);
                              }}
                              type="button"
                            >
                              <FaTrash />
                              <span>Delete</span>
                            </button>
                          )}

                          {extraActions.map(
                            ({ icon, title, onClick, roles, isVisible }, idx) =>
                              (!roles || roles.includes(userRole)) &&
                              (!isVisible || isVisible(row)) && (
                                <button
                                  key={idx}
                                  className="btn-mobile btn-extra-mobile"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClick(row);
                                  }}
                                  type="button"
                                >
                                  {icon}
                                  <span>{title}</span>
                                </button>
                              )
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn nav-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>

          <div className="pagination-numbers">
            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              const showPage =
                pageNum === 1 ||
                pageNum === totalPages ||
                Math.abs(pageNum - currentPage) <= 1;

              if (!showPage && pageNum === 2 && currentPage > 3) {
                return (
                  <span key={i} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }
              if (
                !showPage &&
                pageNum === totalPages - 1 &&
                currentPage < totalPages - 2
              ) {
                return (
                  <span key={i} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }
              if (!showPage) return null;

              return (
                <button
                  key={i}
                  className={`pagination-btn ${
                    currentPage === pageNum ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className="pagination-btn nav-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={closeDeleteModal} title="Confirm Delete">
        {deleteTarget && (
          <div className="datatable-delete-content">
            <p className="delete-resource-text">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
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
