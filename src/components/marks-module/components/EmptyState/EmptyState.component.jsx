import React from "react";
import { FaInbox } from "react-icons/fa";
import "./EmptyState.styles.css";

// One empty state for every marks-module page — only the text (and
// optionally the icon/action) changes per call site, so a user who's
// learned what "no results" looks like on one page recognizes it
// everywhere else instead of re-learning a new visual per page.
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="vt-empty">
      <div className="vt-empty-icon">{icon || <FaInbox />}</div>
      <p className="vt-empty-title">{title}</p>
      {subtitle && <span className="vt-empty-subtitle">{subtitle}</span>}
      {action && <div className="vt-empty-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
