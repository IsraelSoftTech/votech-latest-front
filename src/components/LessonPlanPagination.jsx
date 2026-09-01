import React from 'react';
import PropTypes from 'prop-types';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PAGE_WINDOW = 2;

function buildPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total]);
  for (let i = current - PAGE_WINDOW; i <= current + PAGE_WINDOW; i += 1) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  return [...pages].sort((a, b) => a - b);
}

export default function LessonPlanPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  loading = false,
}) {
  if (!total || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="lp-pagination" aria-label="Lesson plan pagination">
      <span className="lp-pagination-summary">
        Showing {start}–{end} of {total}
      </span>
      <div className="lp-pagination-controls">
        <button
          type="button"
          className="lp-pagination-btn"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <FaChevronLeft aria-hidden="true" />
          <span>Prev</span>
        </button>

        <div className="lp-pagination-numbers">
          {pages.map((pageNum, idx) => {
            const prev = pages[idx - 1];
            const showEllipsis = prev && pageNum - prev > 1;
            return (
              <React.Fragment key={pageNum}>
                {showEllipsis && <span className="lp-pagination-ellipsis">…</span>}
                <button
                  type="button"
                  className={`lp-pagination-number${pageNum === page ? ' active' : ''}`}
                  disabled={loading}
                  onClick={() => onPageChange(pageNum)}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          className="lp-pagination-btn"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

LessonPlanPagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
