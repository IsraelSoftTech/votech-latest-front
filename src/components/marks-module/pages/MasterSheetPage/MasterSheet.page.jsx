import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import Select from "react-select";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";
import MasterSheet from "../../components/MasterSheet/MasterSheet.component";
import SideTop from "../../../SideTop";
import { EmptyState } from "../../components/EmptyState/EmptyState.component";
import { FaArrowLeft, FaTable } from "react-icons/fa";
import "./MasterSheet.page.styles.css";

const TERM_OPTIONS = [
  { value: "term1", label: "First Term" },
  { value: "term2", label: "Second Term" },
  { value: "term3", label: "Third Term" },
  { value: "annual", label: "Annual" },
];

// Mirrors the real MasterSheet card (meta row + wide spreadsheet table)
// instead of one flat gray box, so the layout doesn't jump once the
// (often large, chunk-loaded) roster finishes arriving.
function MasterSheetSkeleton() {
  const dataCols = 8;
  return (
    <div className="msp-skel-card">
      <div className="msp-skel-meta">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="msp-skel msp-skel-chip" />
        ))}
      </div>
      <div className="msp-skel-table-wrapper">
        <div className="msp-skel-row msp-skel-header-row">
          {Array.from({ length: 3 + dataCols }).map((_, i) => (
            <div key={i} className="msp-skel msp-skel-th" />
          ))}
        </div>
        {Array.from({ length: 12 }).map((_, r) => (
          <div key={r} className="msp-skel-row">
            {Array.from({ length: 3 + dataCols }).map((_, i) => (
              <div key={i} className="msp-skel msp-skel-td" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function extractIds(state = {}) {
  const ids = state?.ids || {};
  const academicYearId =
    ids.academic_year_id ||
    state.academic_year_id ||
    state.academicYearId ||
    state.academicYear?.id ||
    null;
  const departmentId =
    ids.department_id ||
    state.department_id ||
    state.departmentId ||
    state.department?.id ||
    null;
  const classId =
    ids.class_id || state.class_id || state.classId || state.class?.id || null;

  return {
    academicYearId,
    departmentId,
    classId,
    academicYearObj: state.academicYear || null,
    departmentObj: state.department || null,
    classObj: state.class || null,
  };
}

const MasterSheetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state || {};

  const {
    academicYearId,
    departmentId,
    classId,
    academicYearObj,
    departmentObj,
    classObj,
  } = useMemo(() => extractIds(routeState), [routeState]);

  const ready = Boolean(academicYearId && departmentId && classId);

  const [selectedTerm, setSelectedTerm] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [error, setError] = useState(null);

  const [displayedData, setDisplayedData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [chunking, setChunking] = useState(false);

  const requestIdRef = useRef(0);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!ready || !selectedTerm) return;

    const fetchMasterSheetData = async () => {
      const reqId = ++requestIdRef.current;

      setError(null);
      setDisplayedData([]);
      setTotalCount(0);
      setLoadedCount(0);
      setChunking(false);
      setLoading(true);

      try {
        const url = `/report-cards/bulk?academicYearId=${academicYearId}&departmentId=${departmentId}&classId=${classId}`;
        const res = await api.get(url);

        const payload = res?.data?.data;
        let reportCards = [];
        if (Array.isArray(payload)) reportCards = payload;
        else if (Array.isArray(payload?.reportCards))
          reportCards = payload.reportCards;
        else if (Array.isArray(payload?.items)) reportCards = payload.items;

        if (reqId !== requestIdRef.current) return;

        if (!reportCards.length) {
          throw new Error("No student data found");
        }

        const firstStudent = reportCards[0]?.student || {};
        const extractedMetadata = {
          schoolName: routeState.schoolName || "School Name",
          departmentName:
            departmentObj?.name || firstStudent.option || "Department",
          className: classObj?.name || firstStudent.class || "Class",
          academicYear:
            academicYearObj?.name || firstStudent.academicYear || "—",
          term: selectedTerm,
          totalStudents: reportCards.length,
        };
        setMetadata(extractedMetadata);
        setTotalCount(reportCards.length);

        // Chunked rendering
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        const CHUNK_SIZE = 100;
        let index = 0;
        setChunking(true);

        const pushNext = () => {
          if (reqId !== requestIdRef.current) return;
          if (index >= reportCards.length) {
            setChunking(false);
            setLoading(false);
            return;
          }
          const end = Math.min(index + CHUNK_SIZE, reportCards.length);
          const chunk = reportCards.slice(index, end);

          startTransition(() => {
            setDisplayedData((prev) => {
              const next = prev.concat(chunk);
              setLoadedCount(next.length);
              return next;
            });
          });

          if (index === 0) setLoading(false);

          index = end;
          const t = setTimeout(pushNext, 0);
          timersRef.current.push(t);
        };

        setDisplayedData([]);
        setLoadedCount(0);
        pushNext();
      } catch (err) {
        console.log(err);
        if (reqId !== requestIdRef.current) return;
        setError(
          err.response?.data?.details ||
            err.response?.data?.message ||
            "Error fetching master sheet data"
        );
        toast.error("Error fetching master sheet data");
        setLoading(false);
      }
    };

    fetchMasterSheetData();
  }, [
    selectedTerm,
    academicYearId,
    departmentId,
    classId,
    routeState,
    academicYearObj,
    departmentObj,
    classObj,
    ready,
  ]);

  const handleRetry = () => {
    if (selectedTerm && ready) {
      requestIdRef.current++;
      setDisplayedData([]);
      setError(null);
      setTotalCount(0);
      setLoadedCount(0);
      setLoading(true);
    }
  };

  const termValue = TERM_OPTIONS.find((o) => o.value === selectedTerm) || null;

  if (!ready) {
    return (
      <SideTop>
        <div className="msp-page">
          <div className="msp-controls">
            <button onClick={() => navigate(-1)} className="back-btn">
              <FaArrowLeft /> <span>Go Back</span>
            </button>
          </div>
          <EmptyState
            title="Missing filters"
            subtitle="Please return and select Academic Year, Department, and Class."
          />
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div className="msp-page">
        <div className="msp-controls">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> <span>Go Back</span>
          </button>

          <Select
            className="msp-term-select"
            placeholder="Select term to load…"
            options={TERM_OPTIONS}
            value={termValue}
            onChange={(opt) => setSelectedTerm(opt?.value || null)}
            menuPortalTarget={document.body}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            }}
          />
        </div>

        {loading && (
          <div style={{ marginTop: 8 }}>
            <div className="msp-loading-note">
              Loaded {loadedCount} of {totalCount}
              {chunking ? ", rendering…" : ""}
            </div>
            <MasterSheetSkeleton />
          </div>
        )}

        {!loading && error && (
          <div className="msp-error">
            <h4>Error Loading Master Sheet</h4>
            <p>{error}</p>
            <button onClick={handleRetry} className="msp-retry-btn">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && !selectedTerm && (
          <EmptyState
            icon={<FaTable />}
            title="Select a term to load the master sheet"
          />
        )}

        {!loading && selectedTerm && totalCount > 0 && (
          <div className="msp-loading-note">
            Loaded {loadedCount} of {totalCount}
            {chunking ? ", rendering…" : ""}
          </div>
        )}

        {!loading && !error && selectedTerm && displayedData.length > 0 && (
          <MasterSheet
            data={displayedData}
            metadata={metadata}
            term={selectedTerm}
          />
        )}

        {!loading && !error && selectedTerm && totalCount === 0 && (
          <EmptyState title={`No student data available for ${selectedTerm}`} />
        )}
      </div>
    </SideTop>
  );
};

export default MasterSheetPage;
