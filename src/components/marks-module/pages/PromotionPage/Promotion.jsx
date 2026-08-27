import React from "react";
import { useSearchParams } from "react-router-dom";
import { FaLayerGroup, FaGraduationCap, FaHistory } from "react-icons/fa";
import SideTop from "../../../SideTop";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import { Tabs } from "../../components/Tabs/Tabs.component";
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
        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

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
