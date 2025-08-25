import React from "react";
import PropTypes from "prop-types";
import "./Stats.styles.css";

const StatsCards = ({ data = [], className = "" }) => {
  return (
    <div className={`stats-grid ${className}`}>
      {data.map(({ title, value, icon: Icon }, idx) => (
        <article
          key={`${title}-${idx}`}
          className="stat-card"
          aria-label={`${title} ${value}`}
        >
          <div className="stat-icon" aria-hidden="true">
            {Icon && <Icon size={23} />}
          </div>

          <div className="stat-content">
            <div className="stat-title">{title}</div>
            <div className="stat-value">{value}</div>
          </div>
        </article>
      ))}
    </div>
  );
};

StatsCards.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      icon: PropTypes.elementType.isRequired, // e.g. FaUsers
    })
  ).isRequired,
  className: PropTypes.string,
};

export default StatsCards;
