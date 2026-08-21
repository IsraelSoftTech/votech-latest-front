import React, { useState, useEffect, useRef } from "react";
import "./AdminStudent.css";
import "./AdminStudent.page.css";
import "./StudentListReport.css";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaBook,
  FaMoneyBill,
  FaClipboardList,
  FaChartBar,
  FaFileAlt,
  FaPenFancy,
  FaTachometerAlt,
  FaSignOutAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaEnvelope,
  FaIdCard,
  FaFileExcel,
  FaUpload,
  FaPrint,
  FaUser,
} from "react-icons/fa";
import logo from "../assets/logo.png";

import api from "../services/api";
import SuccessMessage from "./SuccessMessage";
import StudentListReport from "./StudentListReport";
import * as XLSX from "xlsx";
import { useLocation } from "react-router-dom";
import SideTop from "./SideTop";
import marksApi from "./marks-module/utils/api";
import { toast } from "react-toastify";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const menuItems = [
  { label: "Dashboard", icon: <FaTachometerAlt /> },
  { label: "Students", icon: <FaUserGraduate /> },
  { label: "Staff", icon: <FaChalkboardTeacher /> },
  { label: "Classes", icon: <FaBook /> },
  { label: "Messages", icon: <FaEnvelope /> },
  { label: "ID Cards", icon: <FaIdCard /> },
  { label: "Subjects", icon: <FaBook /> },
  { label: "Finances", icon: <FaMoneyBill /> },
  { label: "Attendance", icon: <FaClipboardList /> },
  { label: "Reports", icon: <FaFileAlt /> },
  { label: "Exam/Marks", icon: <FaChartBar /> },
  { label: "Lesson Plans", icon: <FaPenFancy /> },
];
import config from "../config";

const years = Array.from({ length: 26 }, (_, i) => `20${25 + i}/20${26 + i}`);

function StudentPhoto({ student }) {
  const [imgError, setImgError] = useState(false);
  const initial = student.full_name
    ? student.full_name.charAt(0).toUpperCase()
    : "?";
  const hasSource = Boolean(student.photo || student.photo_url);
  const showImage = hasSource && !imgError;

  let src = "";
  if (showImage) {
    if (student.photo) {
      src = `${config.API_URL}/students/${student.id}/picture`;
    } else if (student.photo_url?.startsWith("http")) {
      src = student.photo_url;
    } else {
      src = `${config.API_URL.replace("/api", "")}${student.photo_url}`;
    }
  }

  return (
    <div className="student-avatar-wrap">
      {showImage ? (
        <img
          src={src}
          alt=""
          className="student-avatar"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="student-avatar-fallback">{initial}</div>
      )}
    </div>
  );
}

const students = [
  {
    name: "John Paul",
    sex: "M",
    class: "Form 1",
    dob: "12/02/2014",
    pob: "Bamenda",
    dept: "BC",
  },
  {
    name: "John Peter",
    sex: "F",
    class: "Form 2",
    dob: "12/02/2015",
    pob: "KOM",
    dept: "Elect.Engr",
  },
  {
    name: "Mary Jane",
    sex: "F",
    class: "Form 3",
    dob: "10/05/2013",
    pob: "Buea",
    dept: "Science",
  },
  {
    name: "Samuel Doe",
    sex: "M",
    class: "Form 4",
    dob: "22/08/2012",
    pob: "Limbe",
    dept: "Arts",
  },
  {
    name: "Linda Smith",
    sex: "F",
    class: "Form 5",
    dob: "15/03/2011",
    pob: "Yaounde",
    dept: "Commerce",
  },
  {
    name: "Peter Obi",
    sex: "M",
    class: "Form 1",
    dob: "01/01/2014",
    pob: "Douala",
    dept: "BC",
  },
  {
    name: "Grace Kim",
    sex: "F",
    class: "Form 2",
    dob: "19/09/2015",
    pob: "Bamenda",
    dept: "Elect.Engr",
  },
  {
    name: "James Bond",
    sex: "M",
    class: "Form 3",
    dob: "07/07/2013",
    pob: "Kumba",
    dept: "Science",
  },
  {
    name: "Alice Brown",
    sex: "F",
    class: "Form 4",
    dob: "30/11/2012",
    pob: "Bafoussam",
    dept: "Arts",
  },
  {
    name: "Henry Ford",
    sex: "M",
    class: "Form 5",
    dob: "25/12/2011",
    pob: "Buea",
    dept: "Commerce",
  },
  {
    name: "Sarah Lee",
    sex: "F",
    class: "Form 1",
    dob: "14/02/2014",
    pob: "Limbe",
    dept: "BC",
  },
  {
    name: "David Kim",
    sex: "M",
    class: "Form 2",
    dob: "21/06/2015",
    pob: "Yaounde",
    dept: "Elect.Engr",
  },
  {
    name: "Julia White",
    sex: "F",
    class: "Form 3",
    dob: "09/09/2013",
    pob: "Douala",
    dept: "Science",
  },
  {
    name: "Chris Green",
    sex: "M",
    class: "Form 4",
    dob: "17/04/2012",
    pob: "Bamenda",
    dept: "Arts",
  },
  {
    name: "Nancy Drew",
    sex: "F",
    class: "Form 5",
    dob: "03/10/2011",
    pob: "Kumba",
    dept: "Commerce",
  },
];

export default function AdminStudent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showModal, setShowModal] = useState(false);
  const authUser = JSON.parse(sessionStorage.getItem('authUser') || localStorage.getItem('authUser') || 'null');
  const roleLower = (authUser?.role || '').toString().toLowerCase();
  const isAdmin1 = roleLower === 'admin1';
  const isAdmin4 = roleLower === 'admin4';
  const [form, setForm] = useState({
    studentId: "",
    regDate: new Date().toISOString().slice(0, 10),
    fullName: "",
    sex: "",
    dob: "",
    pob: "",
    father: "",
    mother: "",
    class: "",
    dept: "",
    fatherContact: "",
    motherContact: "",
    photo: null,
    academicYear: "",
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [successType, setSuccessType] = useState("success");
  const [errorType, setErrorType] = useState("error");
  const navigate = useNavigate();
  const location = useLocation();
  // const [successType, setSuccessType] = useState("success");

  // 2. Add students state to store registered students
  const [studentList, setStudentList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [accademicYears, setAcademicYears] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState(null);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelClass, setExcelClass] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [excelSuccess, setExcelSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printClass, setPrintClass] = useState("");
  const [isDownloadingClassList, setIsDownloadingClassList] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showStudentListReportModal, setShowStudentListReportModal] =
    useState(false);
  const [generatedStudentListReport, setGeneratedStudentListReport] =
    useState(null);
  const studentListReportRef = React.useRef();
  const [uploadManyModalOpen, setUploadManyModalOpen] = useState(false);
  const [uploadManyFile, setUploadManyFile] = useState(null);
  const [uploadManyPreview, setUploadManyPreview] = useState([]);
  const [uploadManyHeaders, setUploadManyHeaders] = useState([]);
  const [uploadManyLoading, setUploadManyLoading] = useState(false);
  const [uploadManyError, setUploadManyError] = useState("");
  const [uploadManySuccess, setUploadManySuccess] = useState("");
  const [usersCount, setUsersCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const classData = await marksApi.get("/classes");
        setClasses(classData.data.data);
        const specialtyData = await api.getSpecialties();
        setSpecialties(specialtyData);
        const students = await api.getStudents();
        setStudentList(students);
        const accademicYears = await marksApi.get("/academic-years");
        setAcademicYears(accademicYears.data.data);
        // Fetch users count for Registered Staff card
        try {
          const users = await api.getUsers();
          const count = Array.isArray(users)
            ? users.length
            : (users && Array.isArray(users.data) ? users.data.length : 0);
          setUsersCount(count);
        } catch (e) {
          console.log("Failed to fetch users for staff count", e);
          setUsersCount(0);
        }
      } catch (err) {
        // Optionally handle error
        toast.error("Failed to fetch page data");
        console.log("Fetch Error", err);
      }
    }
    fetchData();
  }, []);



  // Helper to count today's students
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount =
    studentList && Array.isArray(studentList)
      ? studentList.filter(
          (s) => s.created_at && s.created_at.slice(0, 10) === todayStr
        ).length
      : 0;

  // 3. Helper to generate student ID
  const generateStudentId = (fullName, regDate, index) => {
    if (!fullName) return "";
    const [first, ...rest] = fullName.trim().split(" ");
    const last = rest.length ? rest[rest.length - 1] : "";
    const year = regDate
      ? regDate.slice(2, 4)
      : new Date().getFullYear().toString().slice(2, 4);
    const firstPart = (first || "").slice(0, 2).toUpperCase();
    const lastPart = (last || "").slice(-2).toUpperCase();
    const seq = (index + 1).toString().padStart(3, "0");
    return `${year}-VOT-${firstPart}${lastPart}-${seq}`;
  };



  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photo: null }));
    setPhotoPreview(null);
  };

  // 4. Update studentId when fullName or regDate changes (ONLY for new students)
  useEffect(() => {
    // Only generate student ID for new students, not during editing
    if (!editId) {
      setForm((f) => ({
        ...f,
        studentId: generateStudentId(
          f.fullName,
          f.regDate,
          studentList && Array.isArray(studentList) ? studentList.length : 0
        ),
      }));
    }
  }, [form.fullName, form.regDate, studentList.length, editId]);

  // 5. Update handleFormChange to handle regDate
  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      handlePhotoChange(e);
    } else {
      setForm((f) => ({ ...f, [name]: files ? files[0] : value }));
    }
  };

  const handleEdit = (student) => {
    setEditId(student.id);
    setForm({
      studentId: student.student_id || "",
      regDate: student.registration_date || (student.created_at ? student.created_at.slice(0, 10) : ""),
      fullName: student.full_name || "",
      sex: student.sex || "",
      dob: student.date_of_birth || "",
      pob: student.place_of_birth || "",
      father: student.father_name || "",
      mother: student.mother_name || "",
      class: student.class_id || "",
      dept: student.specialty_id || "",
      fatherContact: student.guardian_contact || "",
      motherContact: "",
      academicYear: student.academic_year_id || "",
      photo: null,
    });
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setRegistering(true);
    try {
      const formData = new FormData();
      formData.append("studentId", form.studentId);
      formData.append("regDate", form.regDate);
      formData.append("fullName", form.fullName);
      formData.append("sex", form.sex);
      formData.append("dob", form.dob);
      formData.append("pob", form.pob);
      formData.append("father", form.father);
      formData.append("mother", form.mother);
      formData.append("class", Number(form.class));
      formData.append("dept", Number(form.dept));
      formData.append("fatherContact", form.fatherContact || "");
      formData.append("motherContact", form.motherContact || "");
      formData.append("academicYear", Number(form.academicYear));
      if (form.photo) formData.append("photo", form.photo);

      if (editId) {
        // Update existing student
        await api.updateStudent(editId, formData);
        setSuccess("Student updated successfully!");
      } else {
        // Register new student
        await api.createStudent(formData);
        setSuccess("Student registered successfully!");
      }

      // Refresh student list
      const students = await api.getStudents();
      setStudentList(students);
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess("");
        setForm({
          studentId: "",
          regDate: new Date().toISOString().slice(0, 10),
          fullName: "",
          sex: "",
          dob: "",
          pob: "",
          father: "",
          mother: "",
          class: "",
          dept: "",
          fatherContact: "",
          motherContact: "",
          academicYear: "",
          photo: null,
        });
        setPhotoPreview(null);
        setEditId(null);
      }, 3000);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register student.");
      setErrorType("error");
    }
    setRegistering(false);
  };

  const handleDelete = (studentId) => {
    setDeleteIdx(studentId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const studentId = deleteIdx;
    try {
      await api.deleteStudent(studentId);
      setSuccess("Student deleted successfully!");
      setSuccessType("success");
      const students = await api.getStudents();
      setStudentList(students);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete student.");
      setErrorType("error");
    }
    setShowDeleteModal(false);
    setDeleteIdx(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteIdx(null);
  };

  // Excel import handler
  const handleExcelImport = async (e) => {
    e.preventDefault();
    setExcelError("");
    setExcelSuccess("");
    if (!excelFile) {
      setExcelError("Please select an Excel file.");
      return;
    }
    setExcelLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);
      formData.append("year", selectedYear); // if you want to keep year
      // Debug: log FormData keys and values
      for (let pair of formData.entries()) {
        console.log("FormData:", pair[0], pair[1]);
      }
      await api.uploadStudents(formData);
      setExcelSuccess("Students imported successfully!");
      setExcelFile(null);
      setTimeout(() => {
        setExcelModalOpen(false);
        setExcelSuccess("");
      }, 1200);
      // Refresh student list
      const students = await api.getStudents();
      setStudentList(students);
    } catch (err) {
      setExcelError(err.message || "Failed to import students.");
    }
    setExcelLoading(false);
  };

  // Excel file change handler with preview
  const handleExcelFileChange = (e) => {
    setExcelFile(null);
    setExcelPreview([]);
    setExcelHeaders([]);
    setExcelError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rows.length) {
          setExcelError("Excel file is empty.");
          return;
        }
        // Validate headers
        const expectedHeaders = [
          "Full Names",
          "Sex",
          "Date of Birth",
          "Place of Birth",
          "Father's Name",
          "Mother's Name",
          "Specialty",
          "Contact",
          "Class",
        ];
        const fileHeaders = rows[0].map((h) => (h || "").toString().trim());
        setExcelHeaders(fileHeaders);
        const headersMatch = expectedHeaders.every(
          (h, i) => h === fileHeaders[i]
        );
        if (!headersMatch) {
          setExcelError("Excel headers do not match expected format.");
          return;
        }
        setExcelFile(file);
        setExcelPreview(rows.slice(1, 11)); // Preview first 10 rows
      } catch (err) {
        setExcelError("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };
  // Responsive search bar handler
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  // Print handler - generates PDF directly
  const generateStudentListReport = async () => {
    if (isDownloadingClassList) return;

    if (!printClass) {
      setError("Please select a class first.");
      setErrorType("error");
      return;
    }

    const classStudents = studentList.filter(
      (s) => (s.class_name || s.class || "") === printClass
    );

    if (classStudents.length === 0) {
      setError("No students found for the selected class.");
      return;
    }

    // Start visual download progress
    setIsDownloadingClassList(true);
    setDownloadProgress(0);
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      if (progress >= 90) {
        progress = 90;
        setDownloadProgress(progress);
        clearInterval(progressInterval);
      } else {
        setDownloadProgress(progress);
      }
    }, 120);

    // Sort students alphabetically by full name
    const sortedStudents = classStudents.sort((a, b) => 
      (a.full_name || '').localeCompare(b.full_name || '')
    );

    try {
      // Create PDF with A4 portrait dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Header content (same text as before)
      pdf.setFont('Times', 'Bold');
      pdf.setFontSize(18);
      pdf.setTextColor(25, 118, 210);
      pdf.text('VOTECH(S7) ACADEMY', 105, 20, { align: 'center' });

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Class List', 105, 28, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setTextColor(25, 118, 210);
      pdf.text(String(printClass), 105, 38, { align: 'center' });

      pdf.setTextColor(102, 102, 102);
      pdf.text(`Academic Year: ${selectedYear}`, 105, 44, { align: 'center' });
      pdf.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        105,
        50,
        { align: 'center' }
      );
      pdf.text(
        `Total Students: ${sortedStudents.length}`,
        105,
        56,
        { align: 'center' }
      );

      // Table data (same columns/content as HTML table)
      const tableColumn = [
        'S/N',
        'Student ID',
        'Full Name',
        'Sex',
        'Date of Birth',
        "Father's Contact",
      ];

      const tableRows = sortedStudents.map((student, index) => [
        index + 1,
        student.student_id || '',
        student.full_name || '',
        student.sex || '',
        student.date_of_birth
          ? new Date(student.date_of_birth).toLocaleDateString()
          : '',
        student.guardian_contact || '',
      ]);

      autoTable(pdf, {
        head: [tableColumn],
        body: tableRows,
        startY: 64,
        styles: {
          font: 'Times',
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        theme: 'grid',
      });

      const fileName = `class_list_${printClass.replace(
        /\s+/g,
        '_'
      )}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Close the modal
      setPrintModalOpen(false);
      setSuccess(`Class list for ${printClass} downloaded successfully!`);
      setTimeout(() => setSuccess(""), 3000);

      // Complete progress animation
      setDownloadProgress(100);
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsDownloadingClassList(false);
        setDownloadProgress(0);
      }, 400);

    } catch (error) {
      console.error('Error generating PDF:', error);
      setError("Failed to generate class list PDF.");
      setErrorType("error");
      clearInterval(progressInterval);
      setIsDownloadingClassList(false);
      setDownloadProgress(0);
    }
  };

  const closeStudentListReportModal = () => {
    setShowStudentListReportModal(false);
    setGeneratedStudentListReport(null);
  };

  // Filtered students for search and print
  const filteredStudents =
    studentList && Array.isArray(studentList)
      ? studentList
          .filter(
            (s) =>
              s.full_name &&
              s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
      : [];

  const classStudents = printClass
    ? filteredStudents.filter(
        (s) => (s.class_name || s.class || "") === printClass
      )
    : [];

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Helper to get image URL
  const baseApiUrl =
    (api.API_URL && api.API_URL.replace("/api", "")) || "http://localhost:5000";
  const getImageUrl = (pic) => {
    if (!pic) return null;
    if (pic.startsWith("/")) return baseApiUrl + pic;
    return pic;
  };

  // Add isAdmin1 logic (reuse existing authUser if present)
  const authUserAdmin1 = JSON.parse(sessionStorage.getItem("authUser") || localStorage.getItem("authUser") || "null");
  const isAdmin1Legacy = (authUserAdmin1?.role || '').toString().toLowerCase() === 'admin1';

  // Upload Many file change handler with preview
  const handleUploadManyFileChange = (e) => {
    setUploadManyFile(null);
    setUploadManyPreview([]);
    setUploadManyHeaders([]);
    setUploadManyError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rows.length) {
          setUploadManyError("Excel file is empty.");
          return;
        }
        // Validate headers
        const expectedHeaders = [
          "Full Name",
          "Sex",
          "Date of Birth",
          "Place of Birth",
          "Father's Name",
          "Mother's Name",
          "Class",
          "Department/Specialty",
          "Contact",
        ];
        const fileHeaders = rows[0].map((h) => (h || "").toString().trim());
        setUploadManyHeaders(fileHeaders);
        const headersMatch = expectedHeaders.every(
          (h, i) => h === fileHeaders[i]
        );
        if (!headersMatch) {
          setUploadManyError("Excel headers do not match expected format.");
          return;
        }
        setUploadManyFile(file);
        setUploadManyPreview(rows.slice(1, 11)); // Preview first 10 rows
      } catch (err) {
        setUploadManyError("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload Many submit handler
  const handleUploadManySubmit = async (e) => {
    e.preventDefault();
    setUploadManyError("");
    setUploadManySuccess("");
    if (!uploadManyFile) {
      setUploadManyError("Please select an Excel file.");
      return;
    }
    setUploadManyLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadManyFile);
      await api.uploadManyStudents(formData);
      setUploadManySuccess("Students uploaded successfully!");
      setUploadManyFile(null);
      setTimeout(() => {
        setUploadManyModalOpen(false);
        setUploadManySuccess("");
      }, 1200);
      // Refresh student list
      const students = await api.getStudents();
      setStudentList(students);
    } catch (err) {
      setUploadManyError(err.message || "Failed to upload students.");
    }
    setUploadManyLoading(false);
  };

  const [filters, setFilters] = useState({
    department_id: null,
    class_id: null,
  });

  // Filter classes based on department
  const filteredClasses = classes.filter(
    (c) => c.department_id === filters.department_id
  );

  return (
    <SideTop>
      <div className="students-page">
      <header className="students-page-header">
        <h1 className="students-page-title">Students</h1>
        <p className="students-page-subtitle">
          Manage registrations, records, and class lists
        </p>
      </header>

      <div className="dashboard-cards">
        <div className="card students">
          <div className="icon">
            <FaUserGraduate />
          </div>
          <div className="students-stat-split">
            <div className="students-stat-block">
              <div className="students-stat-label">Today</div>
              <div className="count">{todayCount}</div>
              <div className="desc">Registered Students Today</div>
            </div>
            <div className="students-stat-divider" aria-hidden="true" />
            <div className="students-stat-block students-stat-block--right">
              <div className="students-stat-label">Total</div>
              <div className="count">{studentList.length}</div>
              <div className="desc">Total Registered Students</div>
            </div>
          </div>
        </div>
        <div className="card teachers">
          <div className="icon">
            <FaChalkboardTeacher />
          </div>
          <div className="students-staff-meta">
            <div className="count">{usersCount}</div>
            <div className="desc">Registered Staff</div>
          </div>
        </div>
      </div>

      <div className="students-toolbar">
        {!(isAdmin1 || isAdmin4) && (
          <button
            type="button"
            className="students-btn-register add-student-fab"
            onClick={() => {
              setShowModal(true);
              setEditId(null);
            }}
            title="Register Student"
          >
            <FaPlus />
            <span>Register Student</span>
          </button>
        )}
        <div className="students-toolbar-search-wrap">
          <input
            type="text"
            className="student-search-bar"
            placeholder="Search student by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search students by name"
          />
        </div>
        <button
          type="button"
          className="students-btn-secondary"
          onClick={() => setPrintModalOpen(true)}
        >
          <FaPrint />
          Print Class List
        </button>
      </div>
      {/* Print Modal */}
      {printModalOpen && (
        <div className="modal-overlay" onClick={() => setPrintModalOpen(false)}>
          <div
            className="modal-content students-modal-compact"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setPrintModalOpen(false)}
            >
              <FaTimes />
            </button>
            <h2 className="form-title">Print Class List</h2>
            <div className="students-modal-field-group">
              <label className="input-label">Select Class</label>
              <select
                className="input-field"
                value={printClass}
                onChange={(e) => setPrintClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((opt) => (
                  <option
                    key={opt.id}
                    value={typeof opt.name === "string" ? opt.name : ""}
                  >
                    {typeof opt.name === "string" ? opt.name : "Unknown Class"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="students-download-btn signup-btn"
              onClick={generateStudentListReport}
              disabled={!printClass || isDownloadingClassList}
            >
              <span
                className="students-download-btn-progress"
                style={{ width: `${downloadProgress}%` }}
              />
              <span className="students-download-btn-label">
                {isDownloadingClassList ? "Downloading...." : "Download"}
              </span>
            </button>
          </div>
        </div>
      )}
      
      {/* Success/Error Messages show*/}
      {success && <SuccessMessage message={success} type="success" onClose={() => setSuccess("")} />}
      {error && <SuccessMessage message={error} type="error" onClose={() => setError("")} />}
      
      {/* Student Table */}
      <div className="students-table-card">
      <div className="student-table-wrapper">
        <table className="student-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Registration Date</th>
              <th>Full Name</th>
              <th>Sex</th>
              <th>Date of Birth</th>
              <th>Place of Birth</th>
              <th>Father's Name</th>
              <th>Mother's Name</th>
              <th>Class</th>
              <th>Department/Specialty</th>
              <th>Father's Contact</th>
              <th>Mother's Contact</th>
              <th className="students-col-photo">Photo</th>
              <th className="students-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="14" className="students-empty-cell">
                  <div className="students-empty-cell-inner">
                    <div className="students-empty-icon">
                      <FaUserGraduate />
                    </div>
                    <span>No students found.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td>{s.student_id}</td>
                  <td>{s.registration_date ? String(s.registration_date).slice(0,10) : (s.created_at ? String(s.created_at).slice(0,10) : "")}</td>
                  <td>{s.full_name}</td>
                  <td>{s.sex}</td>
                  <td>{s.date_of_birth ? String(s.date_of_birth).slice(0,10) : ''}</td>
                  <td>{s.place_of_birth}</td>
                  <td>{s.father_name}</td>
                  <td>{s.mother_name}</td>
                  <td>
                    {classes.find(c => c.id === s.class_id)?.name || s.class_name || ""}
                  </td>
                  <td>
                    {specialties.find(spec => spec.id === s.specialty_id)?.name || s.specialty_name || ""}
                  </td>
                  <td>{s.guardian_contact || ''}</td>
                  <td>{s.mother_contact || ''}</td>
                  <td className="students-photo-cell">
                    <StudentPhoto student={s} />
                  </td>
                  <td className="actions students-actions-cell">
                    {!(isAdmin1 || isAdmin4) && (
                      <div className="students-action-group">
                        <button
                          type="button"
                          className="action-btn edit"
                          title="Edit"
                          aria-label="Edit student"
                          onClick={() => handleEdit(s)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="action-btn delete"
                          title="Delete"
                          aria-label="Delete student"
                          onClick={() => handleDelete(s.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Professional Pagination */}
      {filteredStudents.length > 0 && (
        <div className="pagination-container">
          {/* Items per page selector */}
          <div className="pagination-items-per-page">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="pagination-select"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
          
          {/* Page info */}
          <div className="pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} entries
          </div>
          
          {/* Navigation buttons */}
          <div className="pagination-controls">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="pagination-btn pagination-btn-prev"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="pagination-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="pagination-btn pagination-btn-next"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>
      
      {showModal && (
        <div
          className="student-register-modal-overlay"
          onClick={() => {
            setShowModal(false);
            setEditId(null);
          }}
        >
          <div
            className="student-register-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-form-title"
          >
            <form
              className="student-modal-form students-register-form"
              onSubmit={handleRegister}
            >
              <header className="students-form-header">
                <div className="students-form-header-text">
                  <h2 id="student-form-title" className="students-form-title">
                    {editId ? "Edit Student" : "Register Student"}
                  </h2>
                  <p className="students-form-subtitle">
                    {editId
                      ? "Update student information below."
                      : "Complete all required fields to add a new student."}
                  </p>
                </div>
                <button
                  type="button"
                  className="students-form-close"
                  onClick={() => {
                    setShowModal(false);
                    setEditId(null);
                  }}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </header>

              <div className="students-form-body">
                <section className="students-form-section">
                  <h3 className="students-form-section-title">Registration</h3>
                  <div className="students-form-grid students-form-grid--3">
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="studentId">
                        Student ID <span className="req">*</span>
                      </label>
                      <input
                        id="studentId"
                        className="students-form-input students-form-input--readonly"
                        type="text"
                        name="studentId"
                        value={form.studentId}
                        onChange={handleFormChange}
                        placeholder="Auto-generated"
                        readOnly
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="regDate">
                        Registration Date <span className="req">*</span>
                      </label>
                      <input
                        id="regDate"
                        className="students-form-input"
                        type="date"
                        name="regDate"
                        value={form.regDate}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="academicYear">
                        Academic Year <span className="req">*</span>
                      </label>
                      <select
                        id="academicYear"
                        className="students-form-input"
                        name="academicYear"
                        value={form.academicYear}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Select year</option>
                        {accademicYears.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {typeof opt.name === "string"
                              ? opt.name
                              : "Unknown Academic Year"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="students-form-section">
                  <h3 className="students-form-section-title">Personal Details</h3>
                  <div className="students-form-grid students-form-grid--2">
                    <div className="students-form-field students-form-field--wide">
                      <label className="students-form-label" htmlFor="fullName">
                        Full Name <span className="req">*</span>
                      </label>
                      <input
                        id="fullName"
                        className="students-form-input"
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleFormChange}
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="sex">
                        Sex <span className="req">*</span>
                      </label>
                      <select
                        id="sex"
                        className="students-form-input"
                        name="sex"
                        value={form.sex}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="dob">
                        Date of Birth <span className="req">*</span>
                      </label>
                      <input
                        id="dob"
                        className="students-form-input"
                        type="date"
                        name="dob"
                        value={form.dob}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="pob">
                        Place of Birth <span className="req">*</span>
                      </label>
                      <input
                        id="pob"
                        className="students-form-input"
                        type="text"
                        name="pob"
                        value={form.pob}
                        onChange={handleFormChange}
                        placeholder="Enter place of birth"
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="students-form-section">
                  <h3 className="students-form-section-title">Family &amp; Contact</h3>
                  <div className="students-form-grid students-form-grid--2">
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="father">
                        Father&apos;s Name <span className="req">*</span>
                      </label>
                      <input
                        id="father"
                        className="students-form-input"
                        type="text"
                        name="father"
                        value={form.father}
                        onChange={handleFormChange}
                        placeholder="Enter father's name"
                        required
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="mother">
                        Mother&apos;s Name <span className="req">*</span>
                      </label>
                      <input
                        id="mother"
                        className="students-form-input"
                        type="text"
                        name="mother"
                        value={form.mother}
                        onChange={handleFormChange}
                        placeholder="Enter mother's name"
                        required
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="fatherContact">
                        Father&apos;s Contact <span className="req">*</span>
                      </label>
                      <input
                        id="fatherContact"
                        className="students-form-input"
                        type="text"
                        name="fatherContact"
                        value={form.fatherContact}
                        onChange={handleFormChange}
                        placeholder="Phone number"
                        required
                      />
                    </div>
                    <div className="students-form-field">
                      <label className="students-form-label" htmlFor="motherContact">
                        Mother&apos;s Contact
                      </label>
                      <input
                        id="motherContact"
                        className="students-form-input"
                        type="text"
                        name="motherContact"
                        value={form.motherContact}
                        onChange={handleFormChange}
                        placeholder="Phone number (optional)"
                      />
                    </div>
                  </div>
                </section>

                <div className="students-form-split">
                  <section className="students-form-section students-form-section--grow">
                    <h3 className="students-form-section-title">Class Assignment</h3>
                    <div className="students-form-grid students-form-grid--2">
                      <div className="students-form-field">
                        <label className="students-form-label" htmlFor="dept">
                          Department / Specialty <span className="req">*</span>
                        </label>
                        <select
                          id="dept"
                          className="students-form-input"
                          name="dept"
                          value={form.dept}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="">Select department</option>
                          {specialties.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="students-form-field">
                        <label className="students-form-label" htmlFor="class">
                          Class <span className="req">*</span>
                        </label>
                        <select
                          id="class"
                          className="students-form-input"
                          name="class"
                          value={form.class}
                          onChange={handleFormChange}
                          required
                          disabled={!form.dept}
                        >
                          <option value="">
                            {form.dept ? "Select class" : "Select department first"}
                          </option>
                          {classes
                            .filter((c) => c.department_id === Number(form.dept))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="students-form-section students-form-section--photo">
                    <h3 className="students-form-section-title">Photo</h3>
                    <div className="students-photo-card">
                      <div className="students-photo-preview">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="students-photo-preview-img"
                          />
                        ) : (
                          <div className="students-photo-placeholder">
                            <FaUser />
                            <span>No photo</span>
                          </div>
                        )}
                      </div>
                      <div className="students-photo-controls">
                        <label className="students-photo-btn">
                          Choose Photo
                          <input
                            type="file"
                            name="photo"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            hidden
                          />
                        </label>
                        {photoPreview && (
                          <button
                            type="button"
                            className="students-photo-remove"
                            onClick={removePhoto}
                          >
                            Remove
                          </button>
                        )}
                        <p className="students-photo-hint">
                          {form.photo ? form.photo.name : "JPG or PNG, optional"}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {error && <div className="students-form-alert students-form-alert--error">{error}</div>}
              {success && <SuccessMessage message={success} />}

              <footer className="students-form-footer">
                <button
                  type="button"
                  className="students-form-btn students-form-btn--ghost"
                  onClick={() => {
                    setShowModal(false);
                    setEditId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="students-form-btn students-form-btn--primary"
                  disabled={registering || isAdmin1 || isAdmin4}
                  title={
                    isAdmin1 || isAdmin4
                      ? "Not allowed for Admin1"
                      : editId
                      ? "Update"
                      : "Register"
                  }
                >
                  {registering
                    ? editId
                      ? "Updating..."
                      : "Registering..."
                    : editId
                    ? "Update Student"
                    : "Register Student"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
      {excelModalOpen && (
        <div className="modal-overlay" onClick={() => setExcelModalOpen(false)}>
          <div
            className="modal-content students-excel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setExcelModalOpen(false)}
            >
              <FaTimes />
            </button>
            <form onSubmit={handleExcelImport}>
              <h2 className="form-title">Import Students from Excel</h2>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">
                  Excel File (.xlsx, .xls) *
                </label>
                <input
                  className="input-field"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileChange}
                  required
                  disabled={isAdmin1}
                />
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>
                <b>Expected columns:</b> Full Names, Sex, Date of Birth, Place
                of Birth, Father's Name, Mother's Name, Specialty, Contact,{" "}
                <b>Class</b>
                <br />
                (Row 1 = headers, data from row 2; <b>Class</b> must match a
                class name in your system)
              </div>
              <a
                href={require("../assets/student_import_template.xlsx")}
                download="student_import_template.xlsx"
                style={{
                  display: "inline-block",
                  marginBottom: 12,
                  color: "#217346",
                  fontWeight: 600,
                }}
              >
                Download Excel Template
              </a>
              {excelPreview.length > 0 && (
                <div style={{ marginBottom: 12, overflowX: "auto" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Preview (first 10 rows):
                  </div>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        {excelHeaders.map((h, i) => (
                          <th
                            key={i}
                            style={{
                              border: "1px solid #ccc",
                              padding: 4,
                              background: "#f7f7f7",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.map((row, i) => (
                        <tr key={i}>
                          {excelHeaders.map((_, j) => (
                            <td
                              key={j}
                              style={{ border: "1px solid #eee", padding: 4 }}
                            >
                              {row[j]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {excelError && (
                <SuccessMessage
                  message={excelError}
                  type="error"
                  onClose={() => setExcelError("")}
                />
              )}
              {excelSuccess && (
                <SuccessMessage
                  message={excelSuccess}
                  type="success"
                  onClose={() => setExcelSuccess("")}
                />
              )}
              <button
                type="submit"
                className="signup-btn"
                style={{ background: "#217346", color: "#fff", minWidth: 120 }}
                disabled={
                  excelLoading || !excelFile || !!excelError || isAdmin1
                }
              >
                {excelLoading ? "Importing..." : "Import"}
              </button>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div
            className="modal-content delete-modal students-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="students-delete-title">Delete Student</div>
            <div className="students-delete-text">
              Are you sure you want to delete this student? This action cannot be undone.
            </div>
            <div className="students-delete-actions">
              <button
                type="button"
                className="signup-btn students-btn-danger"
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="signup-btn students-btn-cancel"
                onClick={(e) => {
                  e.preventDefault();
                  cancelDelete();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Many Modal */}
      {uploadManyModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setUploadManyModalOpen(false)}
        >
          <div
            className="modal-content students-excel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setUploadManyModalOpen(false)}
            >
              <FaTimes />
            </button>
            <form onSubmit={handleUploadManySubmit}>
              <h2 className="form-title">Upload Many Students from Excel</h2>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">
                  Excel File (.xlsx, .xls) *
                </label>
                <input
                  className="input-field"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadManyFileChange}
                  required
                  disabled={uploadManyLoading}
                />
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>
                <b>Expected columns:</b> Full Name, Sex, Date of Birth, Place of
                Birth, Father's Name, Mother's Name, Class,
                Department/Specialty, Contact
                <br />
                (Row 1 = headers, data from row 2; <b>Class</b> and{" "}
                <b>Department/Specialty</b> must match names in your system)
              </div>
              {uploadManyPreview.length > 0 && (
                <div style={{ marginBottom: 12, overflowX: "auto" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Preview (first 10 rows):
                  </div>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        {uploadManyHeaders.map((h, i) => (
                          <th
                            key={i}
                            style={{
                              border: "1px solid #ccc",
                              padding: 4,
                              background: "#f7f7f7",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadManyPreview.map((row, i) => (
                        <tr key={i}>
                          {uploadManyHeaders.map((_, j) => (
                            <td
                              key={j}
                              style={{ border: "1px solid #eee", padding: 4 }}
                            >
                              {row[j]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {uploadManyError && (
                <div className="error-message">{uploadManyError}</div>
              )}
              {uploadManySuccess && (
                <SuccessMessage message={uploadManySuccess} />
              )}
              <button
                type="submit"
                className="signup-btn"
                style={{ background: "#1976d2", color: "#fff", minWidth: 120 }}
                disabled={
                  uploadManyLoading || !uploadManyFile || !!uploadManyError
                }
              >
                {uploadManyLoading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Student List Report Modal */}
      {showStudentListReportModal && generatedStudentListReport && (
        <div
          className="student-list-report-modal-overlay"
          onClick={closeStudentListReportModal}
        >
          <div
            className="student-list-report-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <StudentListReport
              ref={studentListReportRef}
              report={generatedStudentListReport}
            />
          </div>
        </div>
      )}
      </div>
    </SideTop>
  );
}