import React from "react";
import "./DetailGrid.styles.css";

// One label/value list for every marks-module "Details" popup, replacing
// the several near-identical row-list CSS blocks (one per page) that all
// drew the same label-left/value-right, border-divided list.
export function DetailGrid({ children }) {
  return <div className="vt-detail-grid">{children}</div>;
}

export function DetailRow({ label, value }) {
  return (
    <div className="vt-detail-row">
      <span className="vt-detail-label">{label}</span>
      <span className="vt-detail-value">{value}</span>
    </div>
  );
}

export default DetailGrid;
