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
import LessonPlan from './components/LessonPlan.jsx';
import DeanEvent from './components/DeanEvent';
import Admin2Dash from './components/Admin2Dash.jsx';
import Application from './components/Application.jsx';
import DeanLessonPlan from './components/DeanLessonPlan.jsx';
import Marks from './components/Marks.jsx';
import MyClasses from './components/MyClasses.jsx';
import DiscClass from './components/DiscClass.jsx';
import Salary from './components/Salary.jsx';
import Inventory from './components/Inventory.jsx';
import GroupChat from './components/GroupChat';
import PsycoDash from './components/PsycoDash.jsx';
import PaySlip from './components/PaySlip';
import TimeTable from './components/TimeTable.jsx';

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
      <Route path="/admin-salary" element={<Salary authUser={authUser} />} />
      <Route path="/admin-payslip" element={<PaySlip authUser={authUser} />} />
      <Route path="/admin-subjects" element={<Subjects />} />
      <Route path="/admin-lesson-plans" element={<LessonPlan />} />
      <Route path="/admin-inventory" element={<Inventory />} />
      <Route path="/admin-timetable" element={<TimeTable authUser={authUser} />} />
      <Route path="/timetables" element={<TimeTable authUser={authUser} />} />
      <Route path="/admin-group-messages/:groupId" element={<GroupChat />} />
      <Route path="/user-messages/:userId" element={<UserChat />} />
      <Route path="/lesson-plans" element={<LessonPlan />} />
      <Route path="/application" element={<Application authUser={authUser} />} />
      <Route path="/my-classes" element={<MyClasses authUser={authUser} />} />

      <Route path="/discipline" element={<DisciplineDashboard />} />
      <Route path="/discipline-my-classes" element={<DiscClass authUser={authUser} />} />
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
      <Route path="/discipline-lesson-plans" element={<LessonPlan />} />
      <Route path="/teacher-dashboard" element={<TeacherDash />} />
      <Route path="/teacher-messages" element={<TeacherMessage />} />
      <Route path="/teacher-messages/:userId" element={<TeacherMessage />} />
      <Route path="/teacher-lesson-plans" element={<LessonPlan />} />
      <Route path="/dean" element={<Dean />} />
      <Route path="/dean-messages" element={<DeanMessage />} />
      <Route path="/dean-messages/:userId" element={<DeanMessage />} />
      <Route path="/dean-events" element={<DeanEvent />} />
      <Route path="/dean-operations" element={<Dean />} />
      <Route path="/dean-inventory" element={<Dean />} />
      <Route path="/dean-scheduling" element={<Dean />} />
      <Route path="/dean-academic" element={<Dean />} />
      <Route path="/dean-lesson-plans" element={<DeanLessonPlan />} />
      <Route path="/admin-marks" element={<Marks />} />
      <Route path="/dean-marks" element={<Marks />} />
      <Route path="/teacher-marks" element={<Marks />} />
      <Route path="/psychosocialist-lesson-plans" element={<LessonPlan />} />

      {/* Psychosocialist Routes */}
      <Route path="/psycho-dashboard" element={<PsycoDash />} />
      <Route path="/psycho-cases" element={<PsycoDash initialTab="Cases" />} />
      <Route path="/psycho-messages" element={<PsycoDash initialTab="Messages" />} />

      {/* Uncomment if you have a Dashboard component */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;