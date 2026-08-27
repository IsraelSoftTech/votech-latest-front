import React from "react";
import "./PageHeader.styles.css";

// One header shape for every marks-module page — title + optional
// subtitle on the left, optional action(s) on the right. Replaces the
// ~15 separately hand-rolled title blocks that all did this same layout
// with their own one-off class names.
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="vt-page-header">
      <div>
        <h2 className="vt-page-header-title">{title}</h2>
        {subtitle && <span className="vt-page-header-subtitle">{subtitle}</span>}
      </div>
      {actions && <div className="vt-page-header-actions">{actions}</div>}
    </div>
  );
}

export default PageHeader;
