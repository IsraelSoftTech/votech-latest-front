import React, { useState } from 'react';
import './AdminStudent.css';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import logo from '../assets/logo.png';

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

// Import classes from AdminClass (for now, copy the array)
const classOptions = [
  'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5',
  'Lower Sixth', 'Upper Sixth', 'Science 1', 'Science 2', 'Commercial'
];
// Placeholder specialties array (to be replaced with real data from Specialties.jsx)
const specialtyOptions = [
  'ICT', 'Business', 'Science', 'Arts', 'Commerce', 'Elect.Engr', 'BC'
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

  // 6. Update handleRegister to add student to studentList
  const handleRegister = e => {
    e.preventDefault();
    setError('');
    setRegistering(true);
    setTimeout(() => {
      setRegistering(false);
      setSuccess('Student registered!');
      setStudentList(list => [
        ...list,
        { ...form, photo: form.photo ? URL.createObjectURL(form.photo) : null }
      ]);
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
      }, 1200);
    }, 1200);
  };

  // 7. Add edit/delete handlers
  const handleDelete = idx => {
    setStudentList(list => list.filter((_, i) => i !== idx));
  };
  // (Editing logic can be added similarly if needed)

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
            <div className="count">2000</div>
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
                  <tr key={i}>
                    <td>{s.photo ? <img src={s.photo} alt="pic" style={{borderRadius:'50%',width:40,height:40,objectFit:'cover'}} /> : '-'}</td>
                    <td>{s.studentId}</td>
                    <td>{s.fullName}</td>
                    <td>{s.sex}</td>
                    <td>{s.class}</td>
                    <td>{s.dob}</td>
                    <td>{s.pob}</td>
                    <td>{s.dept}</td>
                    <td>{s.regDate}</td>
                    <td className="actions">
                      <button className="action-btn edit"><FaEdit /></button>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            <form className="student-modal-form" onSubmit={handleRegister}>
              <h2 className="form-title">Register Student</h2>
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
                    {classOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <label className="input-label">Department/Specialty *</label>
                  <select className="input-field" name="dept" value={form.dept} onChange={handleFormChange} required>
                    <option value="">Select</option>
                    {specialtyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
    </div>
  );
}

export default AdminStudent; 