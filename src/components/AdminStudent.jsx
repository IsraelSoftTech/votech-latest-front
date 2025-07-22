import React, { useState, useEffect } from 'react';
import './AdminStudent.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaEnvelope, FaIdCard, FaFileExcel, FaUpload, FaPrint } from 'react-icons/fa';
import logo from '../assets/logo.png';

import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import SideTop from './SideTop';
const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt /> },
  { label: 'Students', icon: <FaUserGraduate /> },
  { label: 'Teachers', icon: <FaChalkboardTeacher /> },
  { label: 'Classes', icon: <FaBook /> },
  { label: 'Messages', icon: <FaEnvelope /> },
  { label: 'ID Cards', icon: <FaIdCard /> },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill /> },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy /> },
];

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

const students = [
  { name: 'John Paul', sex: 'M', class: 'Form 1', dob: '12/02/2014', pob: 'Bamenda', dept: 'BC' },
  { name: 'John Peter', sex: 'F', class: 'Form 2', dob: '12/02/2015', pob: 'KOM', dept: 'Elect.Engr' },
  { name: 'Mary Jane', sex: 'F', class: 'Form 3', dob: '10/05/2013', pob: 'Buea', dept: 'Science' },
  { name: 'Samuel Doe', sex: 'M', class: 'Form 4', dob: '22/08/2012', pob: 'Limbe', dept: 'Arts' },
  { name: 'Linda Smith', sex: 'F', class: 'Form 5', dob: '15/03/2011', pob: 'Yaounde', dept: 'Commerce' },
  { name: 'Peter Obi', sex: 'M', class: 'Form 1', dob: '01/01/2014', pob: 'Douala', dept: 'BC' },
  { name: 'Grace Kim', sex: 'F', class: 'Form 2', dob: '19/09/2015', pob: 'Bamenda', dept: 'Elect.Engr' },
  { name: 'James Bond', sex: 'M', class: 'Form 3', dob: '07/07/2013', pob: 'Kumba', dept: 'Science' },
  { name: 'Alice Brown', sex: 'F', class: 'Form 4', dob: '30/11/2012', pob: 'Bafoussam', dept: 'Arts' },
  { name: 'Henry Ford', sex: 'M', class: 'Form 5', dob: '25/12/2011', pob: 'Buea', dept: 'Commerce' },
  { name: 'Sarah Lee', sex: 'F', class: 'Form 1', dob: '14/02/2014', pob: 'Limbe', dept: 'BC' },
  { name: 'David Kim', sex: 'M', class: 'Form 2', dob: '21/06/2015', pob: 'Yaounde', dept: 'Elect.Engr' },
  { name: 'Julia White', sex: 'F', class: 'Form 3', dob: '09/09/2013', pob: 'Douala', dept: 'Science' },
  { name: 'Chris Green', sex: 'M', class: 'Form 4', dob: '17/04/2012', pob: 'Bamenda', dept: 'Arts' },
  { name: 'Nancy Drew', sex: 'F', class: 'Form 5', dob: '03/10/2011', pob: 'Kumba', dept: 'Commerce' },
];

export default function AdminStudent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    regDate: new Date().toISOString().slice(0, 10),
    fullName: '',
    sex: '',
    dob: '',
    pob: '',
    father: '',
    mother: '',
    class: '',
    dept: '',
    contact: '',
    photo: null
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // 2. Add students state to store registered students
  const [studentList, setStudentList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState(null);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelClass, setExcelClass] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [excelSuccess, setExcelSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printClass, setPrintClass] = useState('');
  const [printing, setPrinting] = useState(false);
  const printRef = React.useRef();
  const [uploadManyModalOpen, setUploadManyModalOpen] = useState(false);
  const [uploadManyFile, setUploadManyFile] = useState(null);
  const [uploadManyPreview, setUploadManyPreview] = useState([]);
  const [uploadManyHeaders, setUploadManyHeaders] = useState([]);
  const [uploadManyLoading, setUploadManyLoading] = useState(false);
  const [uploadManyError, setUploadManyError] = useState('');
  const [uploadManySuccess, setUploadManySuccess] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const classData = await api.getClasses();
        setClasses(classData);
        const specialtyData = await api.getSpecialties();
        setSpecialties(specialtyData);
        const students = await api.getStudents();
        setStudentList(students);
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchData();
  }, []);

  // Helper to count today's students
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = studentList.filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr).length;

  // 3. Helper to generate student ID
  const generateStudentId = (fullName, regDate, index) => {
    if (!fullName) return '';
    const [first, ...rest] = fullName.trim().split(' ');
    const last = rest.length ? rest[rest.length - 1] : '';
    const year = regDate ? regDate.slice(2, 4) : new Date().getFullYear().toString().slice(2, 4);
    const firstPart = (first || '').slice(0, 2).toUpperCase();
    const lastPart = (last || '').slice(-2).toUpperCase();
    const seq = (index + 1).toString().padStart(3, '0');
    return `${year}-VOT-${firstPart}${lastPart}-${seq}`;
  };

  // 4. Update studentId when fullName or regDate changes
  useEffect(() => {
    setForm(f => ({
      ...f,
      studentId: generateStudentId(f.fullName, f.regDate, studentList.length)
    }));
  }, [form.fullName, form.regDate, studentList.length]);

  // 5. Update handleFormChange to handle regDate
  const handleFormChange = e => {
    const { name, value, files } = e.target;
    setForm(f => ({ ...f, [name]: files ? files[0] : value }));
  };

  const handleEdit = (student) => {
    setEditId(student.id);
    setForm({
      studentId: student.student_id || '',
      regDate: student.created_at ? student.created_at.slice(0, 10) : '',
      fullName: student.full_name || '',
      sex: student.sex || '',
      dob: student.date_of_birth || '',
      pob: student.place_of_birth || '',
      father: student.father_name || '',
      mother: student.mother_name || '',
      class: classes.find(c => c.id === student.class_id)?.name || '',
      dept: specialties.find(s => s.id === student.specialty_id)?.name || '',
      contact: student.guardian_contact || '',
      photo: null
    });
    setShowModal(true);
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    try {
      const formData = new FormData();
      formData.append('studentId', form.studentId);
      formData.append('regDate', form.regDate);
      formData.append('fullName', form.fullName);
      formData.append('sex', form.sex);
      formData.append('dob', form.dob);
      formData.append('pob', form.pob);
      formData.append('father', form.father);
      formData.append('mother', form.mother);
      formData.append('class', form.class);
      formData.append('dept', form.dept);
      formData.append('contact', form.contact);
      if (form.photo) formData.append('photo', form.photo);
      await api.createStudent(formData);
      setSuccess('Student registered!');
      const students = await api.getStudents();
      setStudentList(students);
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setForm({
          studentId: '',
          regDate: new Date().toISOString().slice(0, 10),
          fullName: '',
          sex: '',
          dob: '',
          pob: '',
          father: '',
          mother: '',
          class: '',
          dept: '',
          contact: '',
          photo: null
        });
        setEditId(null);
      }, 1200);
    } catch (err) {
      setError('Failed to register student.');
    }
    setRegistering(false);
  };

  const handleDelete = (idx) => {
    setDeleteIdx(idx);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const studentToDelete = studentList[deleteIdx];
    try {
      await api.deleteStudent(studentToDelete.id);
      setSuccess('Student deleted successfully!');
      const students = await api.getStudents();
      setStudentList(students);
    } catch (err) {
      setError('Failed to delete student.');
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
    setExcelError('');
    setExcelSuccess('');
    if (!excelFile) {
      setExcelError('Please select an Excel file.');
      return;
    }
    setExcelLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('year', selectedYear); // if you want to keep year
      // Debug: log FormData keys and values
      for (let pair of formData.entries()) {
        console.log('FormData:', pair[0], pair[1]);
      }
      await api.uploadStudents(formData);
      setExcelSuccess('Students imported successfully!');
      setExcelFile(null);
      setTimeout(() => {
        setExcelModalOpen(false);
        setExcelSuccess('');
      }, 1200);
      // Refresh student list
      const students = await api.getStudents();
      setStudentList(students);
    } catch (err) {
      setExcelError(err.message || 'Failed to import students.');
    }
    setExcelLoading(false);
  };

  // Excel file change handler with preview
  const handleExcelFileChange = (e) => {
    setExcelFile(null);
    setExcelPreview([]);
    setExcelHeaders([]);
    setExcelError('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rows.length) {
          setExcelError('Excel file is empty.');
          return;
        }
        // Validate headers
        const expectedHeaders = [
          'Full Names', 'Sex', 'Date of Birth', 'Place of Birth',
          "Father's Name", "Mother's Name", 'Specialty', 'Contact', 'Class'
        ];
        const fileHeaders = rows[0].map(h => (h || '').toString().trim());
        setExcelHeaders(fileHeaders);
        const headersMatch = expectedHeaders.every((h, i) => h === fileHeaders[i]);
        if (!headersMatch) {
          setExcelError('Excel headers do not match expected format.');
          return;
        }
        setExcelFile(file);
        setExcelPreview(rows.slice(1, 11)); // Preview first 10 rows
      } catch (err) {
        setExcelError('Failed to parse Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  // Responsive search bar handler
  const handleSearchChange = e => setSearchQuery(e.target.value);

  // Print handler
  const handlePrintList = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  // Filtered students for search and print
  const filteredStudents = studentList
    .filter(s => s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const classStudents = printClass
    ? filteredStudents.filter(s => (s.class_name || s.class || '') === printClass)
    : [];

  // Helper to get image URL
  const baseApiUrl = (api.API_URL && api.API_URL.replace('/api','')) || 'http://localhost:5000';
  const getImageUrl = (pic) => {
    if (!pic) return null;
    if (pic.startsWith('/')) return baseApiUrl + pic;
    return pic;
  };

  // Add isAdmin1 logic
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin1 = authUser?.role === 'Admin1';

  // Upload Many file change handler with preview
  const handleUploadManyFileChange = (e) => {
    setUploadManyFile(null);
    setUploadManyPreview([]);
    setUploadManyHeaders([]);
    setUploadManyError('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rows.length) {
          setUploadManyError('Excel file is empty.');
          return;
        }
        // Validate headers
        const expectedHeaders = [
          'Full Name', 'Sex', 'Date of Birth', 'Place of Birth',
          "Father's Name", "Mother's Name", 'Class', 'Department/Specialty', 'Contact'
        ];
        const fileHeaders = rows[0].map(h => (h || '').toString().trim());
        setUploadManyHeaders(fileHeaders);
        const headersMatch = expectedHeaders.every((h, i) => h === fileHeaders[i]);
        if (!headersMatch) {
          setUploadManyError('Excel headers do not match expected format.');
          return;
        }
        setUploadManyFile(file);
        setUploadManyPreview(rows.slice(1, 11)); // Preview first 10 rows
      } catch (err) {
        setUploadManyError('Failed to parse Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload Many submit handler
  const handleUploadManySubmit = async (e) => {
    e.preventDefault();
    setUploadManyError('');
    setUploadManySuccess('');
    if (!uploadManyFile) {
      setUploadManyError('Please select an Excel file.');
      return;
    }
    setUploadManyLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadManyFile);
      await api.uploadManyStudents(formData);
      setUploadManySuccess('Students uploaded successfully!');
      setUploadManyFile(null);
      setTimeout(() => {
        setUploadManyModalOpen(false);
        setUploadManySuccess('');
      }, 1200);
      // Refresh student list
      const students = await api.getStudents();
      setStudentList(students);
    } catch (err) {
      setUploadManyError(err.message || 'Failed to upload students.');
    }
    setUploadManyLoading(false);
  };

  return (
    <SideTop>
      <div className="dashboard-cards">
        <div className="card students" style={{ padding: '24px 18px 18px 18px' }}>
          <div className="icon"><FaUserGraduate /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Today</div>
              <div className="count" style={{ fontSize: 22 }}>{todayCount}</div>
              <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Registered Students Today</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.3)', height: 48, margin: '0 10px' }}></div>
            <div style={{ textAlign: 'right', flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Total</div>
              <div className="count" style={{ fontSize: 22 }}>{studentList.length}</div>
              <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Total Registered Students</div>
            </div>
          </div>
        </div>
        <div className="card teachers">
          <div className="icon"><FaChalkboardTeacher /></div>
          <div className="count">47</div>
          <div className="desc">Registered Teachers</div>
        </div>
        <div className="card fees">
          <div className="icon"><FaMoneyBill /></div>
          <div className="count">2000000 XAF</div>
          <div className="desc">Total Fee Paid</div>
        </div>
      </div>
      {/* Add Button below cards, aligned left */}
      <div style={{ margin: '0 0 18px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <button
          className="add-student-fab"
          onClick={() => { setShowModal(true); setEditId(null); }}
          title="Register Student"
          style={{ position: 'static', marginLeft: 0 }}
        >
          <FaPlus style={{ fontSize: 28, color: '#fff' }} />
        </button>
        {/* Responsive Search Bar */}
        <input
          type="text"
          className="student-search-bar"
          placeholder="Search student by name..."
          value={searchQuery}
          onChange={handleSearchChange}
          style={{ flex: 1, minWidth: 180, maxWidth: 340, padding: '8px 14px', borderRadius: 6, border: '1.5px solid #1976d2', fontSize: 15 }}
        />
        {/* Upload Many Button */}
        <button
          className="upload-many-btn"
          style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          title="Upload Many"
          onClick={() => setUploadManyModalOpen(true)}
        >
          <FaUpload /> Upload Many
        </button>
        {/* Print List Button */}
        <button
          className="print-list-btn"
          style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          title="Print Class List"
          onClick={() => setPrintModalOpen(true)}
        >
          <FaPrint /> Print List
        </button>
      </div>
      {/* Print Modal */}
      {printModalOpen && (
        <div className="modal-overlay" onClick={() => setPrintModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 400, width: '98vw', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPrintModalOpen(false)}><FaTimes /></button>
            <h2 className="form-title">Print Class List</h2>
            <div style={{ margin: '18px 0' }}>
              <label className="input-label">Select Class</label>
              <select
                className="input-field"
                value={printClass}
                onChange={e => setPrintClass(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1.5px solid #1976d2', fontSize: 15 }}
              >
                <option value=''>Select Class</option>
                {classes.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
              </select>
            </div>
            <button
              className="signup-btn"
              style={{ background: '#388e3c', color: '#fff', minWidth: 120, fontSize: 16, borderRadius: 6, padding: '12px 0', marginBottom: 8 }}
              onClick={handlePrintList}
              disabled={!printClass}
            >
              Print
            </button>
          </div>
        </div>
      )}
      {/* Print Area (hidden except for print) */}
      <div style={{ display: printing ? 'block' : 'none' }}>
        <div ref={printRef} className="print-class-list-area">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
            <img src={logo} alt="logo" style={{ width: 70, height: 70, objectFit: 'contain', marginRight: 18 }} />
            <div style={{ fontSize: 32, fontWeight: 700, color: '#204080', flex: 1, textAlign: 'left' }}>VOTECH (S7) ACADEMY</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#1976d2', textAlign: 'right' }}>Academic Year: 2025/2026</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 18, color: '#333' }}>Class List: {printClass}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ background: '#f7f8fa' }}>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>#</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Photo</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Student ID</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Full Name</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Sex</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Date of Birth</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Place of Birth</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Father's Name</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Mother's Name</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Department/Specialty</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>
                    {s.photo_url ? (
                      <img src={s.photo_url.startsWith('http') ? s.photo_url : `${api.API_URL.replace('/api','')}${s.photo_url}`} alt="student" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : ''}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.student_id}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.full_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.sex}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.date_of_birth}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.place_of_birth}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.father_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.mother_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.specialty_name || s.dept || ''}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{s.guardian_contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Student Table */}
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
              <th>Contact</th>
              <th>Photo</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr><td colSpan="13" style={{ textAlign: 'center' }}>No students found.</td></tr>
            ) : (
              filteredStudents.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td>{s.student_id}</td>
                  <td>{s.created_at ? s.created_at.slice(0, 10) : ''}</td>
                  <td>{s.full_name}</td>
                  <td>{s.sex}</td>
                  <td>{s.date_of_birth}</td>
                  <td>{s.place_of_birth}</td>
                  <td>{s.father_name}</td>
                  <td>{s.mother_name}</td>
                  <td>{s.class_name || s.class || ''}</td>
                  <td>{s.specialty_name || s.dept || ''}</td>
                  <td>{s.guardian_contact}</td>
                  <td>{s.photo_url ? (
                    <img src={s.photo_url.startsWith('http') ? s.photo_url : `${api.API_URL.replace('/api','')}${s.photo_url}`} alt="student" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : ''}</td>
                  <td className="actions">
                    <button className="action-btn edit" title="Edit" onClick={() => handleEdit(s)}><FaEdit /></button>
                    <button className="action-btn delete" title="Delete" onClick={() => handleDelete(idx)}><FaTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="student-register-modal-overlay" onClick={() => { setShowModal(false); setEditId(null); }}>
          <div className="student-register-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close thin-x" onClick={() => { setShowModal(false); setEditId(null); }} aria-label="Close">&#10005;</button>
            <form className="student-modal-form" onSubmit={handleRegister} style={{marginTop: '24px'}}>
              <h2 className="form-title">{editId ? 'Edit Student' : 'Register Student'}</h2>
              <div className="modal-form-grid">
                <div>
                  <label className="input-label">Student ID *</label>
                  <input className="input-field" type="text" name="studentId" value={form.studentId} onChange={handleFormChange} placeholder="Auto-generated" readOnly />
                  <label className="input-label">Registration Date *</label>
                  <input className="input-field" type="date" name="regDate" value={form.regDate} onChange={handleFormChange} required />
                  <label className="input-label">Full Name *</label>
                  <input className="input-field" type="text" name="fullName" value={form.fullName} onChange={handleFormChange} placeholder="Enter Full Name" required />
                  <label className="input-label">Sex *</label>
                  <select className="input-field" name="sex" value={form.sex} onChange={handleFormChange} required>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  <label className="input-label">Date of Birth *</label>
                  <input className="input-field" type="date" name="dob" value={form.dob} onChange={handleFormChange} required />
                  <label className="input-label">Place of Birth *</label>
                  <input className="input-field" type="text" name="pob" value={form.pob} onChange={handleFormChange} placeholder="Enter Place of Birth" required />
                  <label className="input-label">Father's Name *</label>
                  <input className="input-field" type="text" name="father" value={form.father} onChange={handleFormChange} placeholder="Enter Father's Name" required />
                </div>
                <div>
                  <label className="input-label">Mother's Name *</label>
                  <input className="input-field" type="text" name="mother" value={form.mother} onChange={handleFormChange} placeholder="Enter Mother's Name" required />
                  <label className="input-label">Class *</label>
                  <select className="input-field" name="class" value={form.class} onChange={handleFormChange} required>
                    <option value="">Select</option>
                    {classes.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                  </select>
                  <label className="input-label">Department/Specialty *</label>
                  <select className="input-field" name="dept" value={form.dept} onChange={handleFormChange} required>
                    <option value="">Select</option>
                    {specialties.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                  </select>
                  <label className="input-label">Contact *</label>
                  <input className="input-field" type="text" name="contact" value={form.contact} onChange={handleFormChange} placeholder="Enter Contact" required />
                  <label className="input-label">Photo</label>
                  <input className="input-field" type="file" name="photo" accept="image/*" onChange={handleFormChange} />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && <SuccessMessage message={success} />}
              <button type="submit" className="signup-btn" disabled={registering || isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : (editId ? 'Update' : 'Register')}>{registering ? (editId ? 'Updating...' : 'Registering...') : (editId ? 'Update' : 'Register')}</button>
            </form>
          </div>
        </div>
      )}
      {excelModalOpen && (
        <div className="modal-overlay" onClick={() => setExcelModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 500, width: '98vw' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setExcelModalOpen(false)}><FaTimes /></button>
            <form onSubmit={handleExcelImport}>
              <h2 className="form-title">Import Students from Excel</h2>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Excel File (.xlsx, .xls) *</label>
                <input
                  className="input-field"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileChange}
                  required
                  disabled={isAdmin1}
                />
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                <b>Expected columns:</b> Full Names, Sex, Date of Birth, Place of Birth, Father's Name, Mother's Name, Specialty, Contact, <b>Class</b><br />
                (Row 1 = headers, data from row 2; <b>Class</b> must match a class name in your system)
              </div>
              <a
                href={require('../assets/student_import_template.xlsx')}
                download="student_import_template.xlsx"
                style={{ display: 'inline-block', marginBottom: 12, color: '#217346', fontWeight: 600 }}
              >
                Download Excel Template
              </a>
              {excelPreview.length > 0 && (
                <div style={{ marginBottom: 12, overflowX: 'auto' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Preview (first 10 rows):</div>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {excelHeaders.map((h, i) => (
                          <th key={i} style={{ border: '1px solid #ccc', padding: 4, background: '#f7f7f7' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.map((row, i) => (
                        <tr key={i}>
                          {excelHeaders.map((_, j) => (
                            <td key={j} style={{ border: '1px solid #eee', padding: 4 }}>{row[j]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {excelError && <div className="error-message">{excelError}</div>}
              {excelSuccess && <SuccessMessage message={excelSuccess} />}
              <button
                type="submit"
                className="signup-btn"
                style={{ background: '#217346', color: '#fff', minWidth: 120 }}
                disabled={excelLoading || !excelFile || !!excelError || isAdmin1}
              >
                {excelLoading ? 'Importing...' : 'Import'}
              </button>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content delete-modal" style={{maxWidth: 380, width: '90%', textAlign: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 4px 32px rgba(32,64,128,0.13)', padding: '32px 20px 24px 20px', margin: '0 auto'}} onClick={e => e.stopPropagation()}>
            <div style={{fontSize: 20, marginBottom: 22, color: '#204080', fontWeight: 600}}>Delete Student</div>
            <div style={{fontSize: 16, marginBottom: 24, color: '#444'}}>Are you sure you want to delete this student? This action cannot be undone.</div>
            <div style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18}}>
              <button className="signup-btn" style={{background:'#e53e3e', color:'#fff', minWidth: 110, fontSize: 17, borderRadius: 6, padding: '12px 0', marginBottom: 8}} onClick={e => {e.preventDefault(); confirmDelete();}} disabled={isAdmin1} title={isAdmin1 ? 'Not allowed for Admin1' : 'Delete'}>Delete</button>
              <button className="signup-btn" style={{background:'#204080', color:'#fff', minWidth: 110, fontSize: 17, borderRadius: 6, padding: '12px 0', marginBottom: 8}} onClick={e => {e.preventDefault(); cancelDelete();}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Upload Many Modal */}
      {uploadManyModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadManyModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 500, width: '98vw' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setUploadManyModalOpen(false)}><FaTimes /></button>
            <form onSubmit={handleUploadManySubmit}>
              <h2 className="form-title">Upload Many Students from Excel</h2>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Excel File (.xlsx, .xls) *</label>
                <input
                  className="input-field"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadManyFileChange}
                  required
                  disabled={uploadManyLoading}
                />
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                <b>Expected columns:</b> Full Name, Sex, Date of Birth, Place of Birth, Father's Name, Mother's Name, Class, Department/Specialty, Contact<br />
                (Row 1 = headers, data from row 2; <b>Class</b> and <b>Department/Specialty</b> must match names in your system)
              </div>
              {uploadManyPreview.length > 0 && (
                <div style={{ marginBottom: 12, overflowX: 'auto' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Preview (first 10 rows):</div>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {uploadManyHeaders.map((h, i) => (
                          <th key={i} style={{ border: '1px solid #ccc', padding: 4, background: '#f7f7f7' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadManyPreview.map((row, i) => (
                        <tr key={i}>
                          {uploadManyHeaders.map((_, j) => (
                            <td key={j} style={{ border: '1px solid #eee', padding: 4 }}>{row[j]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {uploadManyError && <div className="error-message">{uploadManyError}</div>}
              {uploadManySuccess && <SuccessMessage message={uploadManySuccess} />}
              <button
                type="submit"
                className="signup-btn"
                style={{ background: '#1976d2', color: '#fff', minWidth: 120 }}
                disabled={uploadManyLoading || !uploadManyFile || !!uploadManyError}
              >
                {uploadManyLoading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .student-register-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(32,64,128,0.13);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-y: auto;
        }
        .student-register-modal-content {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(32,64,128,0.18);
          padding: 56px 28px 28px 28px;
          max-width: 600px;
          width: 98vw;
          min-width: 0;
          position: relative;
          margin-top: 64px;
        }
        .modal-close.thin-x {
          position: absolute;
          top: 16px;
          right: 22px;
          background: none;
          border: none;
          color: #222;
          font-size: 1.5rem;
          font-weight: 200;
          line-height: 1;
          cursor: pointer;
          z-index: 1001;
          padding: 0 6px;
          transition: color 0.15s;
        }
        .modal-close.thin-x:hover {
          color: #1976d2;
        }
      `}</style>
    </SideTop>
  );
} 
