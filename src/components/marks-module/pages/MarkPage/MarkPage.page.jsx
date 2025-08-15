import "./MarksUpload.styles.css";
import React, { useState, useEffect } from "react";
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

export const MarksUploadPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

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
      const res = await fetch(`${subBaseURL}/specialties`, { headers });
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      toast.error(
        err.response?.data?.details || "Failed to fetch departments."
      );
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(
        `${subBaseURL}/students?class_id=${filters.class_id}&department_id?=${filters.department_id}`,
        { headers }
      );
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      toast.error(err.response?.data?.details || "Failed to fetch students.");
    }
  };

  const fetchSubjectClasses = async () => {
    try {
      const res = await api.get(`/class-subjects?subject_id=${id}`);
      setSubjectClasses(res.data.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.details || "Failed to fetch subject classes."
      );
    }
  };

  const fetchDropdowns = async () => {
    try {
      setLoadingPage(true);
      const subRes = await api.get(`/subjects/${id}`);
      const [yearsRes, classesRes, termsRes, sequencesRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/classes"),
        api.get("/marks/terms"),
        api.get("/marks/sequences"),
      ]);

      setAcademicYears(yearsRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setTerms(termsRes.data.data || []);
      setSequences(sequencesRes.data.data || []);
      setSubject(subRes.data.data || {});

      // Fetch separately to avoid await blocking
      fetchDepartments();
      fetchSubjectClasses();
    } catch (err) {
      toast.error("Failed to load dropdowns.");
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, [id]);

  const fetchStudentsMarks = async () => {
    const { academic_year_id, class_id, term_id, sequence_id } = filters;
    if (!academic_year_id || !class_id || !term_id || !sequence_id) return;

    setLoadingTable(true);
    try {
      const classAssigned = subjectClasses.some(
        (sc) => sc.class_id === class_id
      );

      if (!classAssigned) {
        setStudents([
          { id: "none", name: "Subject has not been assigned to this class" },
        ]);
        setMarks([]);
        return;
      }

      const resMarks = await api.get(
        `/marks?subject_id=${subject.id}&academic_year_id=${academic_year_id}&class_id=${class_id}&term_id=${term_id}&sequence_id=${sequence_id}`
      );

      const other = await api.get("/marks");

      const fetchedMarks = resMarks.data.data || [];
      setMarks(fetchedMarks);
      console.log("Fetched", fetchedMarks, other);

      await fetchStudents();

      if (fetchedMarks.length > 0) {
        const markedStudents = students.filter((s) =>
          fetchedMarks.some((m) => m.student_id === s.id)
        );
        setStudents(markedStudents);
      }
    } catch (err) {
      toast.error("Failed to fetch students or marks.");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchStudentsMarks();
  }, [filters, subjectClasses]);

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

      const filledMarks = students.map((s) => {
        const m = marks.find((mk) => mk.student_id === s.id);
        return {
          student_id: s.id,
          score: m?.score == null || m.score === "" ? 0 : Number(m.score),
        };
      });

      console.log({
        subject_id: subject.id,
        academic_year_id,
        class_id,
        term_id,
        sequence_id,
        marks: filledMarks,
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
      fetchStudentsMarks();
    } catch (err) {
      toast.error(err.response?.data?.details || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    setExportingExcelFile(true);
    if (!students.length) return;

    // Metadata for user
    const wsData = [
      [
        "⚠️ WARNING: Do NOT edit any column except 'Score'. Leave all other columns unchanged!",
      ],
      [
        `Academic Year: ${
          academicYears.find((y) => y.id === filters.academic_year_id)?.name ||
          ""
        }`,
      ],
      [
        `Department: ${
          departments.find((d) => d.id === filters.department_id)?.name || ""
        }`,
      ],
      [`Class: ${classes.find((c) => c.id === filters.class_id)?.name || ""}`],
      [`Subject: ${subject.name || ""} (${subject.code || ""})`],
      [`Term: ${terms.find((t) => t.id === filters.term_id)?.name || ""}`],
      [
        `Sequence: ${
          sequences.find((s) => s.id === filters.sequence_id)?.name || ""
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

      if (!students) {
        await fetchStudents();
      }

      if (json.length < 11) throw new Error("Excel file missing data rows.");

      // rows starting from 10th index (skip warning + metadata + header)
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

        console.log(studentId, students);
        const student = students.find((s) => s.student_id === studentId);
        if (!student) throw new Error(`Student ${fullName} not found.`);

        if (score < 0 || score > 20)
          throw new Error(`Invalid score for ${fullName}. Must be 0–20.`);

        // Set subject from hidden column (first row is enough)
        setSubject((prev) => ({ ...prev, id: subjectId }));

        return { student_id: student.id, score: Number(score) };
      });

      setMarks(newMarks);
      toast.success("Excel marks loaded successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to load Excel. Check formatting.");
    } finally {
      setImportingExcelFile(false);
    }
  };

  //   const clearFilters = () => {
  //     setFilters({
  //       academic_year_id: null,
  //       department_id: null,
  //       class_id: null,
  //       term_id: null,
  //       sequence_id: null,
  //     });
  //     setStudents([]);
  //     setMarks([]);
  //   };

  // --- FILTERED ARRAYS ---

  const filteredTerms = filters.academic_year_id
    ? terms.filter((t) => t.academic_year_id === filters.academic_year_id)
    : [];
  const filteredSequences = filters.academic_year_id
    ? sequences.filter((s) => s.academic_year_id === filters.academic_year_id)
    : [];
  const filteredClasses = filters.department_id
    ? classes.filter((c) => c.department_id === filters.department_id)
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
                      term_id: null,
                      sequence_id: null,
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

              <div className="form-react-select">
                <Select
                  placeholder="Term"
                  options={filteredTerms.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  value={
                    filteredTerms.find((t) => t.id === filters.term_id) && {
                      value: filters.term_id,
                      label: filteredTerms.find((t) => t.id === filters.term_id)
                        ?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      term_id: opt?.value || null,
                    }))
                  }
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Sequence"
                  options={filteredSequences.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  value={
                    filteredSequences.find(
                      (s) => s.id === filters.sequence_id
                    ) && {
                      value: filters.sequence_id,
                      label: filteredSequences.find(
                        (s) => s.id === filters.sequence_id
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      sequence_id: opt?.value || null,
                    }))
                  }
                />
              </div>

              {/* <button className="btn btn-warning" onClick={clearFilters}>
                Clear Filters
              </button> */}
            </div>

            <div className="buttons-row">
              <button
                className="btn btn-create"
                onClick={handleExportExcel}
                style={{ marginBottom: 0 }}
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
                    {students.map((s, index) => (
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
                              onChange={(_, val) => handleMarkChange(s.id, val)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <button
                className="btn btn-create"
                onClick={handleSave}
                style={{ width: "100%", padding: "0.8rem" }}
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
