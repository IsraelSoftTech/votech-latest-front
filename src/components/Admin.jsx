import React, { useState, useEffect } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaChevronDown, FaMoneyCheckAlt, FaUserTie, FaChartPie, FaBoxes, FaFileInvoiceDollar, FaPlus, FaEnvelope, FaIdCard, FaCog, FaCalendarAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import ReactDOM from 'react-dom';
import SideTop from './SideTop';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Staff', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
  { label: 'ID Cards', icon: <FaIdCard />, path: '/admin-idcards' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Disciplinary Cases', icon: <FaExclamationTriangle />, path: '/admin-discipline-cases' },
  { label: 'Counselling Cases', icon: <FaFileAlt />, path: '/admin-counselling-cases' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy /> },
  { label: 'Time Table', icon: <FaCalendarAlt />, path: '/admin-timetable' },
];

const years = Array.from({length: 26}, (_, i) => `20${25+i}/20${26+i}`);

const enrolmentData = [
  { date: 'March', value: 2 },
  { date: 'April', value: 4 },
  { date: 'May', value: 37 },
  { date: 'June', value: 5 },
  { date: 'July', value: 12 },
  { date: 'August', value: 18 },
  { date: 'September', value: 25 },
  { date: 'October', value: 9 },
];

function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const navigate = useNavigate();
  const location = useLocation();

  const [studentList, setStudentList] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch students
        const students = await api.getStudents();
        setStudentList(students);
        

        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Helper to count today's students
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = studentList.filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr).length;

  // Chart data: aggregate by registration date
  const [studentChartData, setStudentChartData] = useState([]);
  useEffect(() => {
    // Build date map: {date: {date, today: count, total: cumulative}}
    const dateMap = {};
    let cumulative = 0;
    // Sort students by created_at
    const sorted = [...studentList].filter(s => s.created_at).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (const s of sorted) {
      const date = s.created_at.slice(0, 10);
      if (!dateMap[date]) dateMap[date] = { date, today: 0, total: 0 };
      dateMap[date].today += 1;
    }
    // Now build cumulative total
    const chartArr = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const d of chartArr) {
      cumulative += d.today;
      d.total = cumulative;
    }
    setStudentChartData(chartArr);
  }, [studentList]);

  return (
    <SideTop>
      {/* Place the dashboard and unique content of Admin.jsx here, excluding sidebar/topbar */}
      <div className="dashboard-cards">
        <div className="card students" style={{ padding: '24px 18px 18px 18px' }}>
          <div className="icon"><FaUserGraduate /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Today</div>
              <div className="count" style={{ fontSize: 22 }}>{loading ? '...' : todayCount}</div>
              <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Registered Students Today</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.3)', height: 48, margin: '0 10px' }}></div>
            <div style={{ textAlign: 'right', flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Total</div>
              <div className="count" style={{ fontSize: 22 }}>{loading ? '...' : studentList.length}</div>
              <div className="desc" style={{ fontSize: 13, opacity: 0.8 }}>Total Registered Students</div>
            </div>
          </div>
        </div>

      </div>
      <div className="dashboard-section" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 0 }}>
        <div style={{ flex: '1 1 320px', minWidth: 0, maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ marginBottom: 16, fontWeight: 600, color: '#204080' }}>Student Registration Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={studentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#388e3c" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#388e3c" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#204080" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#204080" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="today" stroke="#388e3c" fillOpacity={1} fill="url(#colorToday)" name="Registered Today" />
              <Area type="monotone" dataKey="total" stroke="#204080" fillOpacity={1} fill="url(#colorTotal)" name="Total Registered" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SideTop>
  );
}

export default Admin; 