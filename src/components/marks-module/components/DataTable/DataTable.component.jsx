import React, { useState, useMemo, useEffect } from "react";
import Modal from "../Modal/Modal.component";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./DataTable.styles.css";
import { CustomDropdown, CustomInput } from "../Inputs/CustumInputs";

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
  }, [data, normalizedSearchTerm, filterCategory, columns, filterCategories]);

  // Pagination logic
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
                  {columns.map(({ accessor }) => (
                    <td key={accessor}>
                      <div className="loading-box" />
                    </td>
                  ))}
                  <td>
                    <div className="loading-box action-loading" />
                  </td>
                </tr>
              ))
          ) : filteredData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="no-data">
                No data at the moment
              </td>
            </tr>
          ) : (
            paginatedData.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                className="table-row"
              >
                {columns.map(({ accessor }) => (
                  <td
                    key={accessor}
                    className="cell-truncate"
                    title={row[accessor] || ""}
                  >
                    {row[accessor]}
                  </td>
                ))}
                <td onClick={(e) => e.stopPropagation()}>
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
                          warnDelete();
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
                            className="btn"
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
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`pagination-btn ${
                currentPage === i + 1 ? "active" : ""
              }`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={closeDeleteModal}
        title="Confirm Delete"
      >
        {deleteTarget && (
          <>
            <p
              className="delet-resource-text"
              style={{ marginBottom: "0.8rem", textAlign: "center" }}
            >
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                className="btn btn-delete-confirm"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DataTable;
