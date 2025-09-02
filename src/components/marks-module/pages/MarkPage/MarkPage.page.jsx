import "./MarksUpload.styles.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import SideTop from "../../../SideTop";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import { CustomInput } from "../../components/Inputs/CustumInputs";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FaArrowLeft } from "react-icons/fa";
import { useRestrictTo } from "../../../../hooks/restrictTo";

export const MarksUploadPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = useRestrictTo(
    "Admin1",
    "Admin2",
    "Admin3",
    "Admin4",
    "Teacher",
    "Discipline",
    "Psychosocialist"
  );

  const hasFetchedRef = useRef(false);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [exportingExcelFile, setExportingExcelFile] = useState(false);
  const [importingExcelFile, setImportingExcelFile] = useState(false);

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [subjectClasses, setSubjectClasses] = useState([]);
  const [subject, setSubject] = useState({});

  const [filters, setFilters] = useState({
    academic_year_id: null,
    department_id: null,
    class_id: null,
    term_id: null,
    sequence_id: null,
  });

  const [marks, setMarks] = useState([]);
  const [saving, setSaving] = useState(false);

  // --- FETCH FUNCTIONS ---
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${subBaseURL}/specialties`, {
        headers: headers(),
      });

      const data = await res.json();
      setDepartments(data);
      // console.log(data);
    } catch (err) {
      toast.error("Error fetching departments.");
      console.log(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get(
        `/students?class_id=${filters.class_id}&specialty_id=${
          filters.department_id || ""
        }&academic_year_id=${filters.academic_year_id}`
      );
      const list = res?.data?.data || [];
      setStudents(list);
      return list;
    } catch (err) {
      toast.error(err.response?.data?.details || "Failed to fetch students.");
      setStudents([]);
      return [];
    }
  };

  const fetchSubjectClasses = async () => {
    try {
      const res = await api.get(`/class-subjects?subject_id=${id}`);
      setSubjectClasses(res?.data?.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.details || "Failed to fetch subject classes."
      );
    }
  };

  const fetchDropdowns = useCallback(async () => {
    try {
      setLoadingPage(true);
      const subRes = await api.get(`/subjects/${id}`);

      const [yearsRes, classesRes, termsRes, sequencesRes, classSubjectRes] =
        await Promise.all([
          api.get("/academic-years"),
          api.get("/classes"),
          api.get("/marks/terms"),
          api.get("/marks/sequences"),
          api.get(`/class-subjects?teacher_id=${user.id}`),
        ]);

      const classSubjects = classSubjectRes.data.data || [];

      setAcademicYears(yearsRes?.data?.data || []);

      setClasses(
        user.role === "Admin3"
          ? classesRes.data.data
          : (classesRes?.data?.data || [])
              .map((cls) => ({
                ...cls,
                // Only include classSubjects assigned to this teacher
                classSubjects: (cls.classSubjects || []).filter((cs) =>
                  classSubjects.some(
                    (teacherCs) =>
                      teacherCs.id === cs.id && teacherCs.teacher_id === user.id
                  )
                ),
              }))
              // Only keep classes that now have classSubjects
              .filter((cls) => cls.classSubjects.length > 0)
      );
      setTerms(termsRes?.data?.data || []);
      setSequences(sequencesRes?.data?.data || []);
      setSubject(subRes?.data?.data || {});

      // console.log(yearsRes?.data?.data);
      // Fetch separately to avoid await blocking the page render
      fetchDepartments();
      fetchSubjectClasses();
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingPage(false);
    }
  });

  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchDropdowns();
  }, [id, user, fetchDropdowns]);

  const loadStudentsMarks = useCallback(async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;

    // Missing filters: reset table and exit
    if (
      !academic_year_id ||
      !class_id ||
      !term_id ||
      !sequence_id ||
      !subject?.id
    ) {
      setStudents([]);
      setMarks([]);
      return;
    }

    setLoadingTable(true);
    try {
      // Check if the subject is assigned to the selected class
      const classAssigned = subjectClasses.some(
        (sc) => Number(sc.class_id) === Number(class_id)
      );

      if (!classAssigned) {
        setStudents([
          {
            id: "none",
            full_name: "Subject has not been assigned to this class",
            student_id: "-",
          },
        ]);
        setMarks([]);
        return;
      }

      // Fetch students in this class/department/academic year
      const resStudents = await api.get(
        `/students?class_id=${class_id}&specialty_id=${
          filters.department_id || ""
        }&academic_year_id=${academic_year_id}`
      );
      const studentsList = resStudents?.data?.data || [];
      setStudents(studentsList);

      // Fetch existing marks for these students
      const resMarks = await api.get(
        `/marks?subject_id=${subject.id}&academic_year_id=${academic_year_id}&class_id=${class_id}&term_id=${term_id}&sequence_id=${sequence_id}`
      );
      setMarks(resMarks?.data?.data || []);
    } catch (err) {
      toast.error("Failed to fetch students or marks.");
    } finally {
      setLoadingTable(false);
    }
  }, [filters, subjectClasses, subject?.id]);

  useEffect(() => {
    loadStudentsMarks();
  }, [loadStudentsMarks]);

  // --- HANDLERS ---
  const handleMarkChange = (studentId, value) => {
    if (value !== "" && (Number(value) < 0 || Number(value) > 20)) {
      toast.error("Marks must be between 0 and 20.");
      return;
    }

    setMarks((prev) => {
      const exists = prev.find((m) => m.student_id === studentId);
      if (exists) {
        return prev.map((m) =>
          m.student_id === studentId
            ? { ...m, score: value === "" ? "" : Number(value) }
            : m
        );
      } else {
        return [
          ...prev,
          { student_id: studentId, score: value === "" ? "" : Number(value) },
        ];
      }
    });
  };

  const handleSave = async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;
    if (!academic_year_id || !class_id || !term_id || !sequence_id) {
      toast.error("Select all filters before saving marks.");
      return;
    }

    try {
      setSaving(true);

      const filledMarks = students
        .filter((s) => s.id !== "none")
        .map((s) => {
          const m = marks.find((mk) => mk.student_id === s.id);
          return {
            student_id: s.id,
            score: m?.score == null || m.score === "" ? 0 : Number(m.score),
          };
        });

      await api.post("/marks/save", {
        subject_id: subject.id,
        academic_year_id,
        class_id,
        term_id,
        sequence_id,
        marks: filledMarks,
      });

      toast.success("Marks saved successfully.");
      await loadStudentsMarks();
    } catch (err) {
      toast.error(err.response?.data?.details || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    setExportingExcelFile(true);
    if (!students.length || students.some((s) => s.id === "none")) {
      setExportingExcelFile(false);
      toast.warn("No valid students to export.");
      return;
    }

    // Metadata for user
    const wsData = [
      [
        "⚠️ WARNING: Do NOT edit any column except 'Score'. Leave all other columns unchanged!",
      ],
      [
        `Academic Year: ${
          academicYears.find(
            (y) => Number(y.id) === Number(filters.academic_year_id)
          )?.name || ""
        }`,
      ],
      [
        `Department: ${
          departments.find(
            (d) => Number(d.id) === Number(filters.department_id)
          )?.name || ""
        }`,
      ],
      [
        `Class: ${
          classes.find((c) => Number(c.id) === Number(filters.class_id))
            ?.name || ""
        }`,
      ],
      [`Subject: ${subject.name || ""} (${subject.code || ""})`],
      [
        `Term: ${
          terms.find((t) => Number(t.id) === Number(filters.term_id))?.name ||
          ""
        }`,
      ],
      [
        `Sequence: ${
          sequences.find((s) => Number(s.id) === Number(filters.sequence_id))
            ?.name || ""
        }`,
      ],
      [], // empty row
      ["Student Name", "Student ID", "Score"], // visible header
      // hidden IDs row for internal use
      [
        "",
        "",
        "",
        "department_id",
        "academic_year_id",
        "class_id",
        "term_id",
        "sequence_id",
        "subject_id",
      ],
      ...students.map((s) => {
        const m = marks.find((mk) => mk.student_id === s.id);
        return [
          s.full_name ?? s.name,
          s.student_id,
          m?.score ?? "",
          filters.department_id,
          filters.academic_year_id,
          filters.class_id,
          filters.term_id,
          filters.sequence_id,
          subject.id,
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Hide hidden columns (D–I)
    ws["!cols"] = [
      { wch: 25 }, // Student Name
      { wch: 15 }, // Student ID
      { wch: 10 }, // Score
      { hidden: true }, // department_id
      { hidden: true }, // academic_year_id
      { hidden: true }, // class_id
      { hidden: true }, // term_id
      { hidden: true }, // sequence_id
      { hidden: true }, // subject_id
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");

    XLSX.writeFile(
      wb,
      `Marks_${subject.code || subject.id}_${filters.class_id}_${
        filters.academic_year_id
      }.xlsx`
    );

    setExportingExcelFile(false);
  };

  // --- IMPORT EXCEL ---
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImportingExcelFile(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!students.length) {
        await fetchStudents();
      }

      if (json.length < 11) throw new Error("Excel file missing data rows.");

      // rows starting from 10th index (skip warning + metadata + header rows)
      const rows = json.slice(10);

      const newMarks = rows.map((row) => {
        const [
          fullName,
          studentId,
          score, // hidden department_id // hidden academic_year_id // hidden class_id // hidden term_id // hidden sequence_id
          ,
          ,
          ,
          ,
          ,
          subjectId,
        ] = row;

        const student = students.find((s) => s.student_id === studentId);
        if (!student) throw new Error(`Student ${fullName} not found.`);

        if (score !== "" && (Number(score) < 0 || Number(score) > 20)) {
          throw new Error(`Invalid score for ${fullName}. Must be 0–20.`);
        }

        // Set subject from hidden column (first row is enough)
        setSubject((prev) => ({ ...prev, id: subjectId }));

        return {
          student_id: student.id,
          score: score === "" ? "" : Number(score),
        };
      });

      setMarks(newMarks);
      toast.success("Excel marks loaded successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to load Excel. Check formatting.");
    } finally {
      setImportingExcelFile(false);
    }
  };

  // --- FILTERED ARRAYS ---
  const filteredTerms = filters.academic_year_id
    ? terms.filter(
        (t) => Number(t.academic_year_id) === Number(filters.academic_year_id)
      )
    : [];

  const selectedTerm = terms.find(
    (t) => Number(t.id) === Number(filters.term_id)
  );

  // console.log(sequences);

  // Key fix: filter sequences by selected term_id + academic_year_id
  const filteredSequences =
    filters.academic_year_id && selectedTerm
      ? sequences
          .filter(
            (s) =>
              Number(s.academic_year_id) === Number(filters.academic_year_id)
          )
          .filter((s) => Number(s.term_id) === Number(selectedTerm.id))
          .sort((a, b) => Number(a.order_number) - Number(b.order_number))
      : [];

  const filteredClasses = filters.department_id
    ? classes.filter(
        (c) => Number(c.department_id) === Number(filters.department_id)
      )
    : [];

  // --- RENDER ---
  return (
    <SideTop>
      <div className="marks-upload-page">
        <h2>Upload {subject.name} Marks</h2>

        {loadingPage ? (
          <Skeleton height={35} count={6} style={{ marginBottom: "10px" }} />
        ) : (
          <>
            <div>
              <button className="back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft /> <span>Go Back to Subjects</span>
              </button>
            </div>

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
                      (y) => Number(y.id) === Number(filters.academic_year_id)
                    ) && {
                      value: filters.academic_year_id,
                      label: academicYears.find(
                        (y) => Number(y.id) === Number(filters.academic_year_id)
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      academic_year_id: opt?.value || null,
                      term_id: null, // reset term when year changes
                      sequence_id: null, // reset sequence as well
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
                    filters.department_id
                      ? {
                          value: filters.department_id,
                          label: departments.find(
                            (d) =>
                              Number(d.id) === Number(filters.department_id)
                          )?.name,
                        }
                      : null
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
                  placeholder="Select Class"
                  options={filteredClasses.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={
                    filters.class_id &&
                    filteredClasses.some((c) => c.id === filters.class_id)
                      ? {
                          value: filters.class_id,
                          label: filteredClasses.find(
                            (c) => c.id === filters.class_id
                          )?.name,
                        }
                      : null // placeholder shows if class is invalid or reset
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      class_id: opt?.value || null,
                    }))
                  }
                  isClearable
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Select Term"
                  options={filteredTerms.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  value={
                    filters.term_id &&
                    filteredTerms.some((t) => t.id === filters.term_id)
                      ? {
                          value: filters.term_id,
                          label: filteredTerms.find(
                            (t) => t.id === filters.term_id
                          )?.name,
                        }
                      : null // ensures placeholder shows if term is invalid or reset
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      term_id: opt?.value || null,
                      sequence_id: null, // reset sequence when term changes
                    }))
                  }
                  isClearable
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Select Sequence"
                  options={filteredSequences.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  isDisabled={!filters.term_id}
                  value={
                    filters.sequence_id &&
                    filteredSequences.some((s) => s.id === filters.sequence_id)
                      ? {
                          value: filters.sequence_id,
                          label: filteredSequences.find(
                            (s) => s.id === filters.sequence_id
                          )?.name,
                        }
                      : null // placeholder when sequence is invalid/reset
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      sequence_id: opt?.value || null,
                    }))
                  }
                  isClearable
                />
              </div>
            </div>

            <div className="buttons-row">
              <button
                className="btn btn-create"
                onClick={handleExportExcel}
                style={{ marginBottom: 0 }}
                disabled={
                  !students.length || students.some((s) => s.id === "none")
                }
              >
                {exportingExcelFile
                  ? "Downloading Excel File..."
                  : "Export to Excel"}
              </button>

              <div className="custom-upload-wrapper">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  id="uploadExcelInput"
                  onChange={handleImportExcel}
                  className="hidden-file-input"
                />
                <button
                  type="button"
                  className="btn btn-create"
                  onClick={() =>
                    document.getElementById("uploadExcelInput").click()
                  }
                  style={{ marginBottom: 0 }}
                >
                  {importingExcelFile
                    ? "Uploading Excel File..."
                    : "Upload Excel Document"}
                </button>
              </div>
            </div>

            <div className="marks-table-wrapper">
              {loadingTable ? (
                <Skeleton count={5} height={30} />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length > 0 ? (
                      students.map((s, index) => (
                        <tr key={s.id}>
                          <td>{index + 1}</td>
                          <td>{s.student_id}</td>
                          <td>{s.full_name}</td>
                          <td style={{ maxWidth: "1rem" }}>
                            {s.id === "none" ? (
                              "-"
                            ) : (
                              <CustomInput
                                type="number"
                                value={
                                  marks.find((m) => m.student_id === s.id)
                                    ?.score ?? ""
                                }
                                onChange={(_, val) =>
                                  handleMarkChange(s.id, val)
                                }
                                onClear={() => handleMarkChange(s.id, "")}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ fontStyle: "italic", textAlign: "center" }}
                        >
                          No students found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <button
                className="btn btn-create"
                onClick={handleSave}
                style={{ width: "100%", padding: "0.8rem" }}
                disabled={students.some((s) => s.id === "none")}
              >
                {saving ? "Saving Marks..." : "Save Marks"}
              </button>
            </div>
          </>
        )}
      </div>
    </SideTop>
  );
};
