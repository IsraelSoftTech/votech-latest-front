import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FaFileAlt, FaTable, FaLayerGroup } from "react-icons/fa";
import SideTop from "../../../SideTop";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import ReportCardHomePage from "../ReportCardHomePage/ReportCardHome.page";
import ReportCardSessionsPage from "../ReportCardSessionsPage/ReportCardSessions.page";
import MasterSheetDownloadPage from "../MasterSheetDownloadPage/MasterSheetDownload.page";
import "./ReportCards.styles.css";

const TABS = [
  { key: "print", label: "Print Report Cards", icon: <FaFileAlt /> },
  { key: "sessions", label: "Bulk Sessions", icon: <FaTable /> },
  { key: "master-sheets", label: "Master Sheets", icon: <FaLayerGroup /> },
];

// Single sidebar entry covering individual printing, bulk generation
// sessions, and master sheets, same pattern as PromotionPage's tab bar.
// Bulk sessions keeps its own URL segment (rather than a ?tab= query param)
// so the backend's job-notification deep_link
// (/academics/report-cards/sessions/:id) still resolves straight to the
// right tab; the other two are cheap enough to switch via query param.
export const ReportCardsPage = () => {
  useRestrictTo("Admin3");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeTab = location.pathname.includes("/sessions")
    ? "sessions"
    : searchParams.get("tab") === "master-sheets"
    ? "master-sheets"
    : "print";

  const goToTab = (key) => {
    if (key === "sessions") navigate("/academics/report-cards/sessions");
    else if (key === "master-sheets") navigate("/academics/report-cards?tab=master-sheets");
    else navigate("/academics/report-cards");
  };

  return (
    <SideTop>
      <div className="report-cards-hub-page">
        <div className="report-cards-hub-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`report-cards-hub-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => goToTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="report-cards-hub-panel">
          {activeTab === "print" && <ReportCardHomePage />}
          {activeTab === "sessions" && <ReportCardSessionsPage />}
          {activeTab === "master-sheets" && <MasterSheetDownloadPage />}
        </div>
      </div>
    </SideTop>
  );
};

export default ReportCardsPage;
