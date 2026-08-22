import React from "react";
import { useSearchParams } from "react-router-dom";
import { FaLayerGroup, FaGraduationCap, FaHistory } from "react-icons/fa";
import SideTop from "../../../SideTop";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import PromotionRequirementsPage from "../PromotionRequirementsPage/PromotionRequirements";
import PromotionRunPage from "../PromotionRunPage/PromotionRun";
import PromotionHistoryPage from "../PromotionHistoryPage/PromotionHistory";
import "./Promotion.styles.css";

const TABS = [
  { key: "requirements", label: "Requirements", icon: <FaLayerGroup /> },
  { key: "run", label: "Run Promotion", icon: <FaGraduationCap /> },
  { key: "history", label: "History", icon: <FaHistory /> },
];

export const PromotionPage = () => {
  useRestrictTo("Admin3");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "requirements";

  const setActiveTab = (key) => setSearchParams({ tab: key });

  return (
    <SideTop>
      <div className="promotion-page">
        <div className="promotion-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`promotion-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="promotion-tab-panel">
          {activeTab === "requirements" && <PromotionRequirementsPage />}
          {activeTab === "run" && <PromotionRunPage />}
          {activeTab === "history" && <PromotionHistoryPage />}
        </div>
      </div>
    </SideTop>
  );
};

export default PromotionPage;
