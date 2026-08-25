import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import Select from "react-select";
import {
  FaPlus,
  FaUserGraduate,
  FaEdit,
  FaTrash,
  FaLayerGroup,
  FaFileDownload,
  FaSpinner,
} from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api, { headers, subBaseURL } from "../../utils/api";
import SideTop from "../../../SideTop";
import { ServerListControls } from "../../components/ServerListControls/ServerListControls.component";
import { StudentFormModal } from "../../components/StudentFormModal/StudentFormModal.component";
import { StudentDetailModal } from "../../components/StudentDetailModal/StudentDetailModal.component";
import { OrientationBackfillModal } from "../../components/OrientationBackfillModal/OrientationBackfillModal.component";
import "./Students.styles.css";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
];

const SORT_OPTIONS = [
  { value: "full_name", label: "Name" },
  { value: "student_id", label: "Student ID" },
  { value: "registration_date", label: "Registration Date" },
  { value: "status", label: "Status" },
];

// Mirrors the real table's columns/row count instead of a plain "Loading…"
// line, so the layout doesn't jump once data arrives.
function StudentsTableSkeleton() {
  return (
    <table className="students-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Student ID</th>
          <th>Class</th>
          <th>Sex</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i}>
            <td>
              <div className="students-skel" style={{ width: "72%", height: 14 }} />
            </td>
            <td>
              <div className="students-skel" style={{ width: 84, height: 14 }} />
            </td>
            <td>
              <div className="students-skel" style={{ width: "60%", height: 14 }} />
            </td>
            <td>
              <div className="students-skel" style={{ width: 20, height: 14 }} />
            </td>
            <td>
              <div className="students-skel" style={{ width: 64, height: 20, borderRadius: 999 }} />
            </td>
            <td>
              <div className="students-actions-cell">
                <div className="students-skel" style={{ width: 30, height: 30, borderRadius: 7 }} />
                <div className="students-skel" style={{ width: 30, height: 30, borderRadius: 7 }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Rebuilt Students page — the old AdminStudent.jsx fetched every student
// unconditionally (active/graduated/withdrawn all mixed together) and did
// every filter client-side; this defaults to Active and does everything
// server-side, same contract as report-card sessions / promotion history
// (page, limit, search, status, sortBy, sortDir). The legacy backend
// route (/api/students) stays untouched — Fee, Finance, ID, and the
// admin dashboards still depend on it seeing everyone by default; this
// page talks to the newer /api/v1/students layer instead.
export const StudentsPage = () => {
  useRestrictTo("Admin3");
  const location = useLocation();
  const classFilterFromNav = location.state?.class_id || null;
  const departmentFilterFromNav = location.state?.department_id || null;
  // "all" is an explicit sentinel from the dashboard's "Total Students"
  // card (which counts every status combined) — distinct from "no status
  // was specified in nav state at all," which still defaults to Active,
  // matching a normal direct visit to this page.
  const statusFilterFromNav =
    location.state?.status === "all" ? "" : location.state?.status || null;
  const hasStatusFromNav = "status" in (location.state || {});
  const openBackfillFromNav = Boolean(location.state?.openBackfill);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    hasStatusFromNav ? statusFilterFromNav : "active"
  );
  const [departmentFilter, setDepartmentFilter] = useState(departmentFilterFromNav);
  const [classFilter, setClassFilter] = useState(classFilterFromNav);
  const [sortBy, setSortBy] = useState("full_name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [downloadingClassList, setDownloadingClassList] = useState(false);

  const hasOrientationClasses = classes.some((c) => c.is_orientation);

  const activeAcademicYearId = academicYears.find((y) => y.status === "active")?.id
    || academicYears[0]?.id
    || null;

  const fetchInitialData = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const [yearsRes, classesRes, deptRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/classes"),
        fetch(`${subBaseURL}/specialties`, { headers: headers() }).then((r) => r.json()),
      ]);
      setAcademicYears(yearsRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", sortBy, sortDir });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (departmentFilter) params.set("department_id", departmentFilter);
      if (classFilter) params.set("class_id", classFilter);
      const res = await api.get(`/students?${params.toString()}`);
      setStudents(res.data.data.students || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, search, statusFilter, departmentFilter, classFilter]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, departmentFilter, classFilter, sortBy, sortDir]);

  // Pre-select the department when arriving from "See Students" on the
  // Classes page (class_id only) so the two filters stay consistent
  // rather than showing a class picked with no department highlighted.
  useEffect(() => {
    if (!classFilterFromNav || !classes.length) return;
    const cls = classes.find((c) => c.id === classFilterFromNav);
    if (cls) setDepartmentFilter(cls.department_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, classFilterFromNav]);

  // Arriving from the dashboard's orientation-backfill card — open the
  // tool directly instead of making the admin find the button themselves.
  useEffect(() => {
    if (openBackfillFromNav) setBackfillModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBackfillFromNav]);

  const departmentOptions = departments.map((d) => ({ value: d.id, label: d.name }));
  const classOptions = classes
    .filter((c) => !departmentFilter || c.department_id === departmentFilter)
    .map((c) => ({ value: c.id, label: c.name }));

  const handleRegister = () => {
    setEditingStudent(null);
    setFormModalOpen(true);
  };

  const handleEdit = (student, e) => {
    e.stopPropagation();
    setEditingStudent(student);
    setFormModalOpen(true);
  };

  const handleDelete = async (student, e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${student.full_name}? This can be recovered later if needed.`)) return;
    try {
      await api.delete(`/students/${student.id}`);
      toast.success("Student removed.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove student.");
    }
  };

  const openDetail = (student) => {
    setDetailStudent(student);
    setDetailModalOpen(true);
  };

  // A plain <a href> download link gives no feedback while the PDF is
  // being generated server-side — for a large class that's several
  // real seconds with nothing visibly happening, easy to mistake for a
  // dead button. fetch()-as-blob ties the loading state to the actual
  // request lifecycle (not a fake timer), then triggers the save via a
  // throwaway object URL once the real file has arrived.
  const handleDownloadClassList = async () => {
    if (!classFilter || downloadingClassList) return;
    setDownloadingClassList(true);
    try {
      const base = api.defaults.baseURL || "http://localhost:5000/api/v1";
      const res = await fetch(
        `${base}/students/class/${classFilter}/list-pdf?disposition=attachment`,
        { headers: headers() }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to generate class list.");
      }
      const blob = await res.blob();
      const className = classes.find((c) => c.id === classFilter)?.name || "class";
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Class_List_${className.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err.message || "Failed to download class list.");
    } finally {
      setDownloadingClassList(false);
    }
  };

  return (
    <SideTop>
    <div className="students-page">
      <div className="students-header">
        <h2 className="students-title">
          <FaUserGraduate /> Students
        </h2>
        <div className="students-header-actions">
          {hasOrientationClasses && (
            <button
              className="students-backfill-btn"
              onClick={() => setBackfillModalOpen(true)}
              disabled={loadingInitial}
            >
              <FaLayerGroup /> Backfill Orientation Choices
            </button>
          )}
          <button className="students-register-btn" onClick={handleRegister} disabled={loadingInitial}>
            <FaPlus /> Register Student
          </button>
        </div>
      </div>

      <div className="students-filters-row">
        <div className="students-class-filter">
          <Select
            placeholder="Filter by department..."
            options={departmentOptions}
            value={departmentOptions.find((o) => o.value === departmentFilter) || null}
            onChange={(opt) => {
              const nextDeptId = opt?.value || null;
              setDepartmentFilter(nextDeptId);
              // A class from a different department can't stay selected
              // once the department filter changes, that combination
              // would just silently return nothing.
              if (nextDeptId && classFilter) {
                const cls = classes.find((c) => c.id === classFilter);
                if (cls && cls.department_id !== nextDeptId) setClassFilter(null);
              }
            }}
            isClearable
            classNamePrefix="students-select"
          />
        </div>
        <div className="students-class-filter">
          <Select
            placeholder="Filter by class..."
            options={classOptions}
            value={classOptions.find((o) => o.value === classFilter) || null}
            onChange={(opt) => setClassFilter(opt?.value || null)}
            isClearable
            classNamePrefix="students-select"
          />
        </div>
        {classFilter && (
          <button
            type="button"
            className="students-classlist-btn"
            onClick={handleDownloadClassList}
            disabled={downloadingClassList}
          >
            {downloadingClassList ? (
              <>
                <FaSpinner className="students-spin" /> Generating…
              </>
            ) : (
              <>
                <FaFileDownload /> Download Class List
              </>
            )}
          </button>
        )}
      </div>

      <ServerListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or student ID..."
        statusOptions={STATUS_OPTIONS}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        sortOptions={SORT_OPTIONS}
        sortValue={sortBy}
        onSortChange={setSortBy}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        loading={loading}
      />

      <div className="students-table-wrap">
        {loading && students.length === 0 ? (
          <StudentsTableSkeleton />
        ) : students.length === 0 ? (
          <div className="students-empty">No students match these filters.</div>
        ) : (
          <table className="students-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Sex</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} onClick={() => openDetail(s)} className="students-row">
                  <td>{s.full_name}</td>
                  <td>{s.student_id}</td>
                  <td>{s.Class?.name || "—"}</td>
                  <td>{s.sex}</td>
                  <td>
                    <span className={`students-status-pill ${s.status}`}>{s.status}</span>
                  </td>
                  <td className="students-actions-cell">
                    <button
                      type="button"
                      className="students-icon-btn"
                      onClick={(e) => handleEdit(s, e)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="students-icon-btn danger"
                      onClick={(e) => handleDelete(s, e)}
                      title="Remove"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        student={editingStudent}
        classes={classes}
        departments={departments}
        academicYears={academicYears}
        onSaved={fetchStudents}
      />

      <StudentDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        student={detailStudent}
        academicYearId={detailStudent?.academic_year_id || activeAcademicYearId}
      />

      <OrientationBackfillModal
        isOpen={backfillModalOpen}
        onClose={() => {
          setBackfillModalOpen(false);
          fetchStudents();
        }}
        classes={classes}
        departments={departments}
      />
    </div>
    </SideTop>
  );
};

export default StudentsPage;
