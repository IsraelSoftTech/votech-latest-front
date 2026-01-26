import React, { useState, useMemo, useEffect, useRef } from "react";
import { FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import "./DataTable.styles.css";
import { CustomDropdown, CustomInput } from "../Inputs/CustumInputs";

// Custom hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

// DataTable Modal Component (Desktop & Mobile)
const DataTableModal = ({ isOpen, onClose, title, children }) => {
  const isMobile = useIsMobile();
  const modalRef = useRef(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Touch handlers for mobile swipe to dismiss
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging) return;
    const touchY = e.touches[0].clientY;
    const diff = touchY - startY;

    if (diff > 0) {
      setCurrentY(diff);
      if (modalRef.current) {
        modalRef.current.style.transform = `translateY(${diff}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);

    if (currentY > 150) {
      onClose();
    }

    if (modalRef.current) {
      modalRef.current.style.transform = "";
    }
    setCurrentY(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`datatable-modal-overlay ${isMobile ? "mobile" : "desktop"}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`datatable-modal-container ${
          isMobile ? "mobile" : "desktop"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle - mobile only */}
        {isMobile && (
          <div className="datatable-modal-drag-handle">
            <div className="datatable-drag-bar"></div>
          </div>
        )}

        {/* Header */}
        <div className="datatable-modal-header">
          <h2 className="datatable-modal-title">{title}</h2>
          <button
            className="datatable-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="datatable-modal-body">{children}</div>
      </div>
    </div>
  );
};

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
  extraActions = [],
  editRoles,
  deleteRoles,
  userRole,
}) => {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [expandedCells, setExpandedCells] = useState({});

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

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

    if (normalizedSearchTerm) {
      filtered = filtered.filter((row) =>
        columns.some(({ accessor }) =>
          String(row[accessor]).toLowerCase().includes(normalizedSearchTerm)
        )
      );
    }

    return filtered;
  }, [data, normalizedSearchTerm, filterCategory, columns]);

  const totalPages = Math.ceil(filteredData.length / limit);
  const startIndex = (currentPage - 1) * limit;
  const paginatedData = filteredData.slice(startIndex, startIndex + limit);

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
  }, [searchTerm, filterCategory]);

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
      </div>

      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(({ label, accessor }) => (
                <th key={accessor}>{label}</th>
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
            ) : filteredData.length === 0 ? (
              <tr className="no-data-row">
                <td colSpan={columns.length + 1} className="no-data">
                  No data at the moment
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={row.id} className="table-row data-row">
                  {/* Desktop cells */}
                  {columns.map(({ accessor, label }) => (
                    <td
                      key={accessor}
                      data-label={label}
                      className="cell-truncate desktop-cell"
                      title={row[accessor] || ""}
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      {row[accessor]}
                    </td>
                  ))}
                  <td
                    className="desktop-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="action-buttons">
                      {(!editRoles || editRoles.includes(userRole)) && (
                        <button
                          className="btn btn-edit"
                          onClick={() => onEdit(row)}
                          title="Edit"
                          type="button"
                        >
                          <FaEdit />
                        </button>
                      )}

                      {(!deleteRoles || deleteRoles.includes(userRole)) && (
                        <button
                          className="btn btn-delete"
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
                        ({ icon, title, onClick, roles }, idx) =>
                          (!roles || roles.includes(userRole)) && (
                            <button
                              key={idx}
                              className="btn btn-extra"
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
                        {columns.map(({ accessor, label }) => {
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
                            ({ icon, title, onClick, roles }, idx) =>
                              (!roles || roles.includes(userRole)) && (
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
      <DataTableModal
        isOpen={!!deleteTarget}
        onClose={closeDeleteModal}
        title="Confirm Delete"
      >
        {deleteTarget && (
          <div className="datatable-delete-content">
            <p className="delete-resource-text">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="datatable-modal-buttons">
              <button
                className="datatable-btn datatable-btn-cancel"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="datatable-btn datatable-btn-delete"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </DataTableModal>
    </div>
  );
};

export default DataTable;
