import "./ReportCard.styles.css";
import React, { useState, useEffect } from "react";
import SideTop from "../../../SideTop";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export const ReportCardHomePage = () => {
  const navigate = useNavigate();

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);

  // --- PERSISTENT FILTERS ---
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("reportCardFilters");
    return saved
      ? JSON.parse(saved)
      : {
          academic_year_id: null,
          department_id: null,
          class_id: null,
        };
  });

  const fetchReportCards = async () => {
    try {
      const { class_id, department_id, academic_year_id } = filters;

      if (!class_id || !department_id || !academic_year_id) {
        toast.error("Filters incomplete.");
        return;
      }

      const res = await api.get(
        `/report-cards/bulk?academicYearId=${academic_year_id}&departmentId=${department_id}&classId=${class_id}`
      );

      console.log(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("reportCardFilters", JSON.stringify(filters));
  }, [filters]);

  // --- FETCH FUNCTIONS ---
  const fetchDropdowns = async () => {
    try {
      setLoadingPage(true);
      const [yearsRes, classesRes, termsRes, sequencesRes, deptRes] =
        await Promise.all([
          api.get("/academic-years"),
          api.get("/classes"),
          api.get("/marks/terms"),
          api.get("/marks/sequences"),
          fetch(`${subBaseURL}/specialties`, { headers }).then((r) => r.json()),
        ]);

      setAcademicYears(yearsRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setTerms(termsRes.data.data || []);
      setSequences(sequencesRes.data.data || []);
      setDepartments(deptRes || []);
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingPage(false);
    }
  };
  const fetchStudents = async () => {
    const { class_id, department_id, academic_year_id } = filters;
    if (!class_id || !department_id || !academic_year_id) {
      setStudents([]); // clear table if filters incomplete
      return;
    }

    setLoadingTable(true);
    try {
      const res = await api.get(
        `/students?class_id=${class_id}&specialty_id=${department_id}&academic_year_id=${academic_year_id}`
      );
      setStudents(res.data.data || []);
      fetchReportCards();
    } catch (err) {
      toast.error("Failed to fetch students.");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const { class_id, department_id, academic_year_id } = filters;
    if (class_id && department_id && academic_year_id) {
      fetchStudents();
      fetchReportCards();
    }
  }, [filters]);

  // --- NAVIGATE TO REPORT CARD PAGE ---
  const handleGoToReportCard = (student, termObj, sequenceObj) => {
    const academicYear =
      academicYears.find((y) => y.id === filters.academic_year_id) || null;
    const department =
      departments.find((d) => d.id === filters.department_id) || null;
    const klass = classes.find((c) => c.id === filters.class_id) || null;

    if (!academicYear || !department || !klass) {
      toast.error("Please select Academic Year, Department, and Class.");
      return;
    }

    navigate(`/academics/report-card/${student.id}`, {
      state: {
        // full objects (preferred)
        academicYear,
        department,
        class: klass,
        student,
        term: termObj || null,
        sequence: sequenceObj || null,

        // keep ids too (optional/back-compat)
        academic_year_id: academicYear.id,
        department_id: department.id,
        class_id: klass.id,
        ids: {
          academic_year_id: academicYear.id,
          department_id: department.id,
          class_id: klass.id,
        },
      },
    });
  };
  const handleGoToMasterSheet = () => {
    navigate(`/academics/master-sheets`, {
      state: {
        department: departments.find((d) => d.id === filters.department_id),
        class: classes.find((c) => c.id === filters.class_id),
        academic_year_id: filters.academic_year_id,
        term: terms.find((t) => t.id === filters.term_id),
        sequence: sequences.find((s) => s.id === filters.sequence_id),
      },
    });
  };

  // --- FILTERED ARRAYS ---
  const filteredClasses = filters.department_id
    ? classes.filter((c) => c.department_id === filters.department_id)
    : [];
  const filteredTerms = filters.academic_year_id
    ? terms.filter((t) => t.academic_year_id === filters.academic_year_id)
    : [];
  const filteredSequences = filters.academic_year_id
    ? sequences.filter((s) => s.academic_year_id === filters.academic_year_id)
    : [];

  const isMasterSheetReady = Boolean(
    filters.academic_year_id && filters.department_id && filters.class_id
  );
  // --- RENDER ---
  return (
    <SideTop>
      <div className="report-card-home-page">
        <h2>Generate Report Cards</h2>

        {loadingPage ? (
          <Skeleton height={35} count={6} style={{ marginBottom: "10px" }} />
        ) : (
          <>
            <div>
              <button className="back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft /> <span>Go Back</span>
              </button>
            </div>
            {/* --- FILTER ROW --- */}
            <div className="filters-row">
              <div className="form-react-select">
                <Select
                  placeholder="Academic Year"
                  options={academicYears.map((y) => ({
                    value: y.id,
                    label: y.name,
                  }))}
                  value={
                    academicYears
                      .map((y) => ({ value: y.id, label: y.name }))
                      .find((opt) => opt.value === filters.academic_year_id) ||
                    null
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      academic_year_id: opt?.value || null,
                    }))
                  }
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Department"
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  value={
                    departments.find((d) => d.id === filters.department_id) && {
                      value: filters.department_id,
                      label: departments.find(
                        (d) => d.id === filters.department_id
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      department_id: opt?.value || null,
                      class_id: null,
                    }))
                  }
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Class"
                  options={filteredClasses.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={
                    filteredClasses.find((c) => c.id === filters.class_id) && {
                      value: filters.class_id,
                      label: filteredClasses.find(
                        (c) => c.id === filters.class_id
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      class_id: opt?.value || null,
                    }))
                  }
                />
              </div>
            </div>

            <div className="master-sheet-holder">
              <button
                className="btn btn-create"
                onClick={handleGoToMasterSheet}
                disabled={!isMasterSheetReady}
                aria-disabled={!isMasterSheetReady}
              >
                View Master Sheet
              </button>
            </div>
            {/* --- STUDENTS TABLE --- */}

            <div className="students-table-wrapper">
              {loadingTable ? (
                <Skeleton count={5} height={30} />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Generate Report Card</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, index) => (
                      <tr key={s.id}>
                        <td>{index + 1}</td>
                        <td>{s.student_id}</td>
                        <td>{s.full_name ?? s.name}</td>
                        <td>
                          <Select
                            placeholder="Select Term"
                            options={filteredTerms.map((t) => ({
                              label: `${t.name} (Term)`,
                              value: { term: t, sequence: null },
                            }))}
                            onChange={(opt) =>
                              handleGoToReportCard(s, opt.value.term, null)
                            }
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </SideTop>
  );
};
