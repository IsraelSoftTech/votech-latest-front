import React, { useState, useEffect } from 'react';
import './Admin.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaClipboardList, FaChartBar, FaFileAlt, FaPenFancy, FaTachometerAlt, FaSignOutAlt, FaChevronDown, FaMoneyCheckAlt, FaUserTie, FaChartPie, FaBoxes, FaFileInvoiceDollar, FaPlus, FaEnvelope, FaIdCard, FaCog } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../services/api';
import ReactDOM from 'react-dom';
import SideTop from './SideTop';

const menuItems = [
  { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { label: 'Students', icon: <FaUserGraduate />, path: '/admin-student' },
  { label: 'Teachers', icon: <FaChalkboardTeacher />, path: '/admin-teacher' },
  { label: 'Classes', icon: <FaBook />, path: '/admin-class' },
  { label: 'Messages', icon: <FaEnvelope />, path: '/admin-messages' },
  { label: 'ID Cards', icon: <FaIdCard />, path: '/admin-idcards' },
  { label: 'Subjects', icon: <FaBook /> },
  { label: 'Finances', icon: <FaMoneyBill />, path: '/admin-finance' },
  { label: 'Attendance', icon: <FaClipboardList /> },
  { label: 'Reports', icon: <FaFileAlt /> },
  { label: 'Exam/Marks', icon: <FaChartBar /> },
  { label: 'Lesson Plans', icon: <FaPenFancy /> },
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

const feeData = [
  { date: 'Jul 8', fee: 0, salary: 0 },
  { date: 'Jul 9', fee: 0, salary: 0 },
  { date: 'Jul 10', fee: 0, salary: 0 },
  { date: 'Jul 11', fee: 0, salary: 0 },
  { date: 'Jul 12', fee: 1, salary: 0.5 },
  { date: 'Jul 13', fee: 3, salary: 2 },
  { date: 'Jul 14', fee: 1, salary: 1 },
  { date: 'Jul 15', fee: 2, salary: 1.5 },
  { date: 'Jul 16', fee: 4, salary: 2.5 },
  { date: 'Jul 17', fee: 3, salary: 2 },
  { date: 'Jul 18', fee: 2, salary: 1 },
];

const eventMap = {
  '2024-09-17': 6,
  '2024-09-18': 2,
  '2024-09-29': 3,
};

function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const navigate = useNavigate();
  const location = useLocation();

  // Calendar event modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [events, setEvents] = useState([
    // Example events
    { type: 'Meeting', date: '2024-09-17', time: '10:00', participants: 'John, Mary', description: 'Staff meeting', title: 'Staff Meeting' },
    { type: 'Class', date: '2024-09-18', time: '14:00', participants: 'Form 1', description: 'Math class', title: 'Math Class' },
    { type: 'Others', date: '2024-09-29', time: '09:00', participants: 'All', description: 'School event', title: 'School Event' },
  ]);
  const [form, setForm] = useState({
    type: 'Meeting',
    date: '',
    time: '',
    participants: '',
    description: '',
    title: '',
  });
  const [formError, setFormError] = useState('');

  // Get events for a date
  const getEventsForDate = date => {
    const key = date.toISOString().slice(0, 10);
    return events.filter(e => e.date === key);
  };

  // Handle calendar date click
  const handleDateClick = date => {
    setModalDate(date);
    setShowEventForm(false);
    setModalOpen(true);
  };

  // Handle form field change
  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Handle add event
  const handleAddEvent = e => {
    e.preventDefault();
    if (!form.title || !form.time || !form.participants || !form.description) {
      setFormError('All fields are required.');
      return;
    }
    setEvents(evts => [
      ...evts,
      { ...form, date: modalDate.toISOString().slice(0, 10) }
    ]);
    setShowEventForm(false);
    setFormError('');
    setForm({ type: 'Meeting', date: '', time: '', participants: '', description: '', title: '' });
  };

  const [studentList, setStudentList] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Get username from sessionStorage
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const username = authUser?.username || 'User';
  useEffect(() => {
    async function fetchStudents() {
      try {
        const students = await api.getStudents();
        setStudentList(students);
      } catch (err) {}
    }
    fetchStudents();
  }, []);

  // Helper to count today's students
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = studentList.filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr).length;

  return (
    <SideTop>
      {/* Place the dashboard and unique content of Admin.jsx here, excluding sidebar/topbar */}
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
      <div className="dashboard-section" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 0 }}>
        <div style={{ flex: '1 1 320px', minWidth: 0, maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ marginBottom: 16, fontWeight: 600, color: '#204080' }}>Student Registration</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={feeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#204080" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#204080" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 8]} tickCount={9} />
              <Tooltip />
              <Area type="monotone" dataKey="fee" stroke="#204080" fillOpacity={1} fill="url(#colorFee)" />
              <Area type="monotone" dataKey="salary" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSalary)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Calendar Section */}
        <div style={{ width: '100%', marginTop: 36, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(32,64,128,0.06)', padding: '24px 12px 12px 12px', maxWidth: 420, minWidth: 0, boxSizing: 'border-box', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: 18, fontWeight: 600, color: '#204080', fontSize: 20 }}>Create Event</h3>
          <div style={{ width: '100%', minWidth: 0, overflowX: 'auto' }}>
            <Calendar
              tileContent={({ date, view }) => {
                // Example event dots: orange for 1-5, green for 5+
                const eventMap = {};
                events.forEach(e => {
                  eventMap[e.date] = (eventMap[e.date] || 0) + 1;
                });
                const key = date.toISOString().slice(0, 10);
                const count = eventMap[key];
                if (view === 'month' && count) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: count > 5 ? '#34c759' : '#f59e0b',
                        margin: '0 2px',
                      }}></span>
                    </div>
                  );
                }
                return null;
              }}
              className="event-calendar"
              onClickDay={handleDateClick}
            />
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 13, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span> [1-5]</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#34c759', borderRadius: '50%', display: 'inline-block' }}></span> [5 +]</span>
          </div>
        </div>
        {/* Event Modal */}
        {modalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(32,64,128,0.18)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalOpen(false)}>
            <div style={{ background: '#fff', borderRadius: 14, maxWidth: 420, width: '95vw', padding: 24, boxShadow: '0 4px 32px rgba(32,64,128,0.13)', position: 'relative', minHeight: 180 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#204080', cursor: 'pointer' }}>&times;</button>
              <div style={{ fontWeight: 600, fontSize: 18, color: '#204080', marginBottom: 10 }}>
                Events for {modalDate && modalDate.toLocaleDateString()}
              </div>
              {/* List events for the date */}
              <div style={{ marginBottom: 18 }}>
                {getEventsForDate(modalDate).length === 0 ? (
                  <div style={{ color: '#888', fontSize: 15 }}>No events for this date.</div>
                ) : (
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                    {getEventsForDate(modalDate).map((evt, idx) => (
                      <li key={idx} style={{ marginBottom: 10, background: '#f7f8fa', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#204080', fontSize: 15 }}>{evt.title}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>{evt.type} &bull; {evt.time} &bull; {evt.participants}</div>
                        <div style={{ fontSize: 13, color: '#444', marginTop: 2 }}>{evt.description}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Plus icon to add event */}
              {!showEventForm && (
                <button onClick={() => { setShowEventForm(true); setForm({ ...form, date: modalDate.toISOString().slice(0, 10) }); }} style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', margin: '0 auto' }}>
                  <FaPlus />
                </button>
              )}
              {/* Event form */}
              {showEventForm && (
                <form onSubmit={handleAddEvent} style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select name="type" value={form.type} onChange={handleFormChange} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }}>
                      <option value="Meeting">Meeting</option>
                      <option value="Class">Class</option>
                      <option value="Others">Others</option>
                    </select>
                    <input type="date" name="date" value={form.date} onChange={handleFormChange} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="time" name="time" value={form.time} onChange={handleFormChange} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
                    <input type="text" name="participants" value={form.participants} onChange={handleFormChange} placeholder="Participants" style={{ flex: 2, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
                  </div>
                  <input type="text" name="title" value={form.title} onChange={handleFormChange} placeholder="Title" style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15 }} required />
                  <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Description" style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15, minHeight: 60 }} required />
                  {formError && <div style={{ color: '#e53e3e', fontSize: 14 }}>{formError}</div>}
                  <button type="submit" style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontSize: 16, fontWeight: 600, marginTop: 4 }}>Add Event</button>
                  <button type="button" onClick={() => setShowEventForm(false)} style={{ background: '#e5e7eb', color: '#204080', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 15, fontWeight: 500, marginTop: 2 }}>Cancel</button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
}

export default Admin; 