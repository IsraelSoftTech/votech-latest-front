import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";
import MasterSheet from "../../components/MasterSheet/MasterSheet.component";
import SideTop from "../../../SideTop";
import { FaArrowLeft } from "react-icons/fa";

const TERM_OPTIONS = [
  { value: "term1", label: "First Term" },
  { value: "term2", label: "Second Term" },
  { value: "term3", label: "Third Term" },
  { value: "annual", label: "Annual" },
];

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
          err?.response?.data?.details || "Error fetching master sheet data"
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
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => navigate(-1)} className="btn btn-secondary">
              ← Go Back
            </button>
          </div>
          <h3>Missing filters</h3>
          <p>Please return and select Academic Year, Department, and Class.</p>
        </div>
      </SideTop>
    );
  }

  return (
    <SideTop>
      <div style={{ padding: 16 }}>
        <div
          //   style={{ maxWidth: 320, marginBottom: 12 }}
          className="master-sheet-btns"
        >
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> <span>Go Back</span>
          </button>

          <Select
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
            <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>
              Loaded {loadedCount} of {totalCount}
              {chunking ? " — rendering…" : ""}
            </div>
            <Skeleton height={1200} count={1} style={{ marginBottom: 8 }} />
          </div>
        )}

        {!loading && error && (
          <div
            className="master-sheet-error"
            style={{
              padding: 12,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              borderRadius: 8,
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 6, color: "#991b1b" }}>
              Error Loading Master Sheet
            </h4>
            <p style={{ marginTop: 0 }}>{error}</p>
            <button onClick={handleRetry} className="btn btn-danger">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && !selectedTerm && (
          <div
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            <p>Please select a term to load the master sheet.</p>
          </div>
        )}

        {!loading && selectedTerm && totalCount > 0 && (
          <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>
            Loaded {loadedCount} of {totalCount}
            {chunking ? " — rendering…" : ""}
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
          <div className="master-sheet-empty">
            <p>No student data available for {selectedTerm}</p>
          </div>
        )}
      </div>
    </SideTop>
  );
};

export default MasterSheetPage;
