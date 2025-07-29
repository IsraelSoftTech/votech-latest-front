import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loader from './components/Loader';
import Signin from './components/Signin';
import Signup from './components/Signup.jsx';
import Admin from './components/Admin.jsx';
import AdminStudents from './components/AdminStudent.jsx';
import AdminTeachers from './components/AdminTeacher.jsx';
import AdminClass from './components/AdminClass.jsx';
import Finance from './components/Finance.jsx';
import Specialty from './components/Specialty.jsx';
import Message from './components/Message.jsx';
import ID from './components/ID.jsx';
import Users from './components/Users.jsx';
import Fee from './components/Fee';
import StudentFeeDetails from './components/StudentFeeDetails';
import UserChat from './components/UserChat';
import Attendance from './components/Attendance.jsx';
import TeacherDash from './components/TeacherDash';
import TeacherMessage from './components/TeacherMessage.jsx';
import Dean from './components/Dean.jsx';
import DeanMessage from './components/DeanMessage.jsx';
import Subjects from './components/Subjects.jsx';
import DeanManager from './components/DeanManager';
import DeanEvent from './components/DeanEvent';
import Admin2Dash from './components/Admin2Dash.jsx';
import Admin2App from './components/Admin2App.jsx';
import MyClasses from './components/MyClasses.jsx';
import Salary from './components/Salary.jsx';
import Inventory from './components/Inventory.jsx';

import DisciplineSideTop from './components/DisciplineSideTop';
import DisciplineDashboard from './components/DisciplineDashboard';
import DiscMessage from './components/DiscMessage.jsx';
import DiscUserChat from './components/DiscUserChat.jsx';
// If you have a Dashboard component, import it:
// import Dashboard from './components/Dashboard.jsx';

function App() {
  const [showLoader, setShowLoader] = React.useState(true);
  const [showPoweredBy, setShowPoweredBy] = React.useState(false);
  React.useEffect(() => {
    const timer1 = setTimeout(() => setShowPoweredBy(true), 1500); // show text after 1.5s
    const timer2 = setTimeout(() => setShowLoader(false), 2500); // total 2.5s
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);
  if (showLoader) return <Loader poweredBy={showPoweredBy} />;
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  return (
    <Routes>
      <Route path="/" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/admin" element={authUser?.role === 'Admin2' ? <Admin2Dash /> : <Admin />} />
      <Route path="/admin-student" element={<AdminStudents />} />
      <Route path="/admin-teacher" element={<AdminTeachers />} />
      <Route path="/admin-class" element={<AdminClass />} />
      <Route path="/admin-finance" element={<Finance />} />
      <Route path="/admin-specialty" element={<Specialty />} />
      <Route path="/admin-messages" element={<Message />} />
      <Route path="/admin-messages/:userId" element={<UserChat />} />
      <Route path="/admin-idcards" element={<ID />} />
      <Route path="/admin-users" element={<Users />} />
      <Route path="/admin-fee" element={<Fee />} />
      <Route path="/admin-fee/:studentId" element={<StudentFeeDetails />} />
      <Route path="/admin-salary" element={<Salary />} />
      <Route path="/admin-subjects" element={<Subjects />} />
      <Route path="/admin-inventory" element={<Inventory />} />
 
      <Route path="/discipline" element={<DisciplineDashboard />} />
      <Route path="/discipline-messages" element={<DiscMessage />} />
      <Route path="/discipline-messages/:userId" element={<DiscUserChat />} />
      <Route path="/discipline-students" element={
        <DisciplineSideTop>
          <div>Students Page</div>
        </DisciplineSideTop>
      } />
      <Route path="/attendance" element={<DisciplineSideTop><Attendance /></DisciplineSideTop>} />
      <Route path="/discipline-cases" element={
        <DisciplineSideTop>
          <div>Disciplinary Cases Page</div>
        </DisciplineSideTop>
      } />
      <Route path="/discipline-reports" element={
        <DisciplineSideTop>
          <div>Reports Page</div>
        </DisciplineSideTop>
      } />
      <Route path="/discipline-counseling" element={
        <DisciplineSideTop>
          <div>Counseling Records Page</div>
        </DisciplineSideTop>
      } />
      <Route path="/discipline-security" element={
        <DisciplineSideTop>
          <div>Security Incidents Page</div>
        </DisciplineSideTop>
      } />
      <Route path="/teacher-dashboard" element={<TeacherDash />} />
      <Route path="/teacher-application" element={<TeacherDash initialTab="Application" />} />
      <Route path="/teacher-messages" element={<TeacherMessage />} />
      <Route path="/teacher-messages/:userId" element={<TeacherMessage />} />
      <Route path="/dean" element={<Dean />} />
      <Route path="/dean-messages" element={<DeanMessage />} />
      <Route path="/dean-messages/:userId" element={<DeanMessage />} />
      <Route path="/dean-events" element={<DeanEvent />} />
      <Route path="/dean-staff" element={<DeanManager />} />
      <Route path="/dean-operations" element={<Dean />} />
      <Route path="/dean-inventory" element={<Dean />} />
      <Route path="/dean-scheduling" element={<Dean />} />
      <Route path="/dean-academic" element={<Dean />} />
      <Route path="/admin2-application" element={<Admin2App authUser={authUser} />} />
      <Route path="/application" element={<Admin2App authUser={authUser} />} />
      <Route path="/my-classes" element={<MyClasses authUser={authUser} />} />
    
      {/* Uncomment if you have a Dashboard component */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
