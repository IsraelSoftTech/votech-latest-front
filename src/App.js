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
  return (
    <Routes>
      <Route path="/" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin-student" element={<AdminStudents />} />
      <Route path="/admin-teacher" element={<AdminTeachers />} />
      <Route path="/admin-class" element={<AdminClass />} />
      <Route path="/admin-finance" element={<Finance />} />
      <Route path="/admin-specialty" element={<Specialty />} />
      <Route path="/admin-messages" element={<Message />} />
      <Route path="/admin-idcards" element={<ID />} />
      <Route path="/admin-users" element={<Users />} />
      <Route path="/admin-fee" element={<Fee />} />
      <Route path="/admin-fee/:studentId" element={<StudentFeeDetails />} />
      {/* Uncomment if you have a Dashboard component */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
