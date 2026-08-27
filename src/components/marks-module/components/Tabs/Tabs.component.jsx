import React from "react";
import "./Tabs.styles.css";

// One tab strip for the whole module (Student Detail modal, Master Sheet
// view, Promotion page, Report Cards page each had their own before).
// Pure presentation — the caller owns which tab is active and what
// renders under it, this never touches that logic.
// `tabs`: [{ key, label, icon? }]
export function Tabs({ tabs, activeKey, onChange }) {
  return (
    <div className="vt-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`vt-tab ${activeKey === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
