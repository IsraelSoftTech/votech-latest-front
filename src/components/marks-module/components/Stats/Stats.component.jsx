import React from "react";
import PropTypes from "prop-types";
import { FaCheckCircle, FaTimesCircle, FaBan } from "react-icons/fa";
import "./Stats.styles.css";

// Every page passes its icon positionally (first = neutral headline count,
// a checkmark = something good, an X/ban = something that needs attention),
// so the tone can be inferred from the icon itself instead of every call
// site having to also pass a tone — keeps this a one-line drop-in like it
// already was.
const toneForIcon = (Icon) => {
  if (Icon === FaCheckCircle) return "good";
  if (Icon === FaTimesCircle || Icon === FaBan) return "warn";
  return "neutral";
};

function StatsSkeleton({ count }) {
  return (
    <div className="vt-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="vt-stat-skel vt-stat-skel-card" key={i} />
      ))}
    </div>
  );
}

const Stats = ({ data = [], className = "", loading = false, skeletonCount = 3 }) => {
  if (loading) return <StatsSkeleton count={skeletonCount} />;

  return (
    <div className={`vt-stats-grid ${className}`}>
      {data.map(({ title, value, icon: Icon }, idx) => (
        <article
          key={`${title}-${idx}`}
          className={`vt-stat-card tone-${toneForIcon(Icon)}`}
          aria-label={`${title} ${value}`}
        >
          <div className="vt-stat-icon" aria-hidden="true">
            {Icon && <Icon size={20} />}
          </div>

          <div className="vt-stat-content">
            <div className="vt-stat-title">{title}</div>
            <div className="vt-stat-value">{value}</div>
          </div>
        </article>
      ))}
    </div>
  );
};

Stats.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      icon: PropTypes.elementType.isRequired, // e.g. FaUsers
    })
  ).isRequired,
  className: PropTypes.string,
  loading: PropTypes.bool,
  skeletonCount: PropTypes.number,
};

export default Stats;
