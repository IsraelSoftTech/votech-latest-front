import React, { useState } from "react";
import Modal from "../Modal/Modal.component";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./DataTable.styles.css";

const DataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  onRowClick,
  loading = false,
  limit = 10, // new prop to control rows per page
  warnDelete,
}) => {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / limit);
  const startIndex = (currentPage - 1) * limit;
  const paginatedData = data.slice(startIndex, startIndex + limit);

  const openDeleteModal = (row) => setDeleteTarget(row);
  const closeDeleteModal = () => setDeleteTarget(null);
  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      closeDeleteModal();
    }
  };

  return (
    <div className="table-wrapper">
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
          ) : data.length === 0 ? (
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
                <td
                  onClick={(e) => e.stopPropagation()}
                  className="action-buttons"
                >
                  <button
                    className="btn btn-edit"
                    onClick={() => onEdit(row)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => {
                      warnDelete();
                      openDeleteModal(row);
                    }}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={closeDeleteModal}
        title="Confirm Delete"
      >
        {deleteTarget && (
          <>
            <p className="delet-resource-text">
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
