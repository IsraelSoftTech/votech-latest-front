import React, { useState } from 'react';
import './AdminStudent.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import logo from '../assets/logo.png';

import api from '../services/api';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt /> },
  { label: 'Students', icon: <FaUserGraduate /> },
  { label: 'Teachers', icon: <FaChalkboardTeacher /> },
  { label: 'Classes', icon: <FaBook /> },
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

function AdminStudent() {
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

  // 2. Add students state to store registered students
  const [studentList, setStudentList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState(null);

  React.useEffect(() => {
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
  React.useEffect(() => {
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
      formData.append('full_name', form.fullName);
      formData.append('sex', form.sex);
      formData.append('date_of_birth', form.dob);
      formData.append('place_of_birth', form.pob);
      formData.append('father_name', form.father);
      formData.append('mother_name', form.mother);
      formData.append('class_id', classes.find(c => c.name === form.class)?.id || '');
      formData.append('specialty_id', specialties.find(s => s.name === form.dept)?.id || '');
      formData.append('vocational_training', '');
      formData.append('guardian_contact', form.contact);
      formData.append('year', selectedYear);
      formData.append('registration_date', form.regDate);
      if (form.photo) formData.append('student_picture', form.photo);
      if (editId) {
        await api.updateStudent(editId, formData);
      } else {
        await api.createStudent(formData);
      }
      setSuccess(editId ? 'Student updated!' : 'Student registered!');
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
      setError(editId ? 'Failed to update student.' : 'Failed to register student.');
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

  // Helper to get image URL
  const getImageUrl = (pic) => {
    if (!pic) return null;
    let base = '';
    if (api.API_URL && api.API_URL.startsWith('http')) {
      base = api.API_URL.replace(/\/api$/, '');
    } else {
      base = 'http://localhost:5000';
    }
    if (pic.startsWith('/')) return base + pic;
    return pic;
  };

  return (
    <div className="admin-container">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="logo" className="sidebar-logo" />
          <span className="logo-text">VOTECH</span>
        </div>
        <nav className="menu">
          {menuItems.map((item, idx) => {
            let isActive = false;
            if (item.label === 'Dashboard' && window.location.pathname === '/admin') isActive = true;
            if (item.label === 'Students' && window.location.pathname === '/admin-student') isActive = true;
            if (item.label === 'Teachers' && window.location.pathname === '/admin-teacher') isActive = true;
            if (item.label === 'Classes' && window.location.pathname === '/admin-class') isActive = true;
            if (item.label === 'Finances' && window.location.pathname === '/admin-finance') isActive = true;
            return (
              <div
                className={`menu-item${isActive ? ' active' : ''}`}
                key={item.label}
                onClick={() => {
                  if (item.label === 'Dashboard') navigate('/admin');
                  else if (item.label === 'Students') navigate('/admin-student');
                  else if (item.label === 'Teachers') navigate('/admin-teacher');
                  else if (item.label === 'Classes') navigate('/admin-class');
                  else if (item.label === 'Finances') navigate('/admin-finance');
                }}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </div>
            );
          })}
        </nav>
        <button className="logout-btn" onClick={() => navigate('/signin')}>
          <FaSignOutAlt className="logout-icon" />
          <span>Logout</span>
        </button>
      </aside>
      <div className="main-content">
        <header className="admin-header">
          <div className="admin-header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <select className="year-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="admin-actions">
            <span className="icon notification"><span className="badge">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg></span>
            <span className="icon message"><span className="badge orange">2</span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span className="admin-name">Admin1</span>
          </div>
        </header>
        <div className="dashboard-cards">
          <div className="card students">
            <div className="icon"><FaUserGraduate /></div>
            <div className="count">{studentList.length}</div>
            <div className="desc">Registered Students</div>
          </div>
          <div className="card fees">
            <div className="icon"><FaMoneyBill /></div>
            <div className="count">1200</div>
            <div className="desc">Completed Fees</div>
          </div>
          <div className="card discipline">
            <div className="icon"><FaClipboardList /></div>
            <div className="count">29</div>
            <div className="desc">Students on Discipline</div>
          </div>
        </div>
        <div className="student-section">
          <div className="student-header-row">
            <button className="add-student-btn" onClick={() => setShowModal(true)}><FaPlus /> Add Student</button>
          </div>
          <div className="student-table-wrapper" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <table className="student-table">
              <thead>
                <tr>
                  <th>Picture</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Sex</th>
                  <th>Class</th>
                  <th>DOB</th>
                  <th>POB</th>
                  <th>Department/Specialty</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map((s, i) => (
                  <tr key={s.id || i}>
                    <td>{getImageUrl(s.student_picture)
                      ? <img src={getImageUrl(s.student_picture)} alt="pic" style={{borderRadius:'50%',width:40,height:40,objectFit:'cover'}} />
                      : '-'}</td>
                    <td>{s.student_id}</td>
                    <td>{s.full_name}</td>
                    <td>{s.sex}</td>
                    <td>{classes.find(c => c.id === s.class_id)?.name || ''}</td>
                    <td>{s.date_of_birth}</td>
                    <td>{s.place_of_birth}</td>
                    <td>{s.specialty_name || ''}</td>
                    <td>{s.created_at ? s.created_at.slice(0,10) : ''}</td>
                    <td className="actions">
                      <button className="action-btn edit" onClick={() => handleEdit(s)}><FaEdit /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(i)}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditId(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowModal(false); setEditId(null); }}><FaTimes /></button>
            <form className="student-modal-form" onSubmit={handleRegister}>
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
              {success && <div className="success-message">{success}</div>}
              <button type="submit" className="signup-btn" disabled={registering}>{registering ? 'Registering...' : 'Register'}</button>
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
              <button className="signup-btn" style={{background:'#e53e3e', color:'#fff', minWidth: 110, fontSize: 17, borderRadius: 6, padding: '12px 0', marginBottom: 8}} onClick={e => {e.preventDefault(); confirmDelete();}}>Delete</button>
              <button className="signup-btn" style={{background:'#204080', color:'#fff', minWidth: 110, fontSize: 17, borderRadius: 6, padding: '12px 0', marginBottom: 8}} onClick={e => {e.preventDefault(); cancelDelete();}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStudent; 