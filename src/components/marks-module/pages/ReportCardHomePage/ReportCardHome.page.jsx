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
    const { class_id, department_id } = filters;
    if (!class_id || !department_id) return;

    setLoadingTable(true);
    try {
      const res = await fetch(
        `${subBaseURL}/students?class_id=${class_id}&department_id=${department_id}`,
        { headers }
      );
      const data = await res.json();
      setStudents(data || []);
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
    fetchStudents();
  }, [filters.class_id, filters.department_id]);

  // --- NAVIGATE TO REPORT CARD PAGE ---
  const handleGoToReportCard = (student, termObj, sequenceObj) => {
    navigate(`/academics/report-card/${student.id}`, {
      state: {
        student,
        department: departments.find((d) => d.id === filters.department_id),
        class: classes.find((c) => c.id === filters.class_id),
        term: termObj || null,
        sequence: sequenceObj || null,
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
                    academicYears.find(
                      (y) => y.id === filters.academic_year_id
                    ) && {
                      value: filters.academic_year_id,
                      label: academicYears.find(
                        (y) => y.id === filters.academic_year_id
                      )?.name,
                    }
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
