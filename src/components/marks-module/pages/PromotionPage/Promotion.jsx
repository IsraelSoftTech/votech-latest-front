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
  // Carries a class id across from the Run tab to the Requirements tab
  // (see onConfigureRequirements below) so the requirements editor for
  // that specific class opens automatically instead of the admin having
  // to find it themselves in the requirements table.
  const openReqClassIdParam = searchParams.get("openReqClassId");
  const openReqClassId = openReqClassIdParam ? Number(openReqClassIdParam) : null;

  const setActiveTab = (key) => setSearchParams({ tab: key });

  // Used by the Run tab when it finds a class with no promotion
  // requirements configured for the active year — jumps to the
  // Requirements tab with that class's editor already open, instead of
  // just failing at preview/run time with no path forward.
  const goToRequirementsFor = (classId) => {
    setSearchParams({ tab: "requirements", openReqClassId: String(classId) });
  };

  // Clears openReqClassId once the Requirements tab has consumed it, so
  // it doesn't reopen on every re-render or linger if the admin closes
  // the modal and switches tabs and back.
  const clearOpenReqClassId = () => setSearchParams({ tab: "requirements" });

  return (
    <SideTop>
      <div className="promotion-page">
        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

        <div className="promotion-tab-panel">
          {activeTab === "requirements" && (
            <PromotionRequirementsPage
              initialOpenClassId={openReqClassId}
              onInitialOpenHandled={clearOpenReqClassId}
            />
          )}
          {activeTab === "run" && (
            <PromotionRunPage onConfigureRequirements={goToRequirementsFor} />
          )}
          {activeTab === "history" && <PromotionHistoryPage />}
        </div>
      </div>
    </SideTop>
  );
};

export default PromotionPage;
