import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './components/Welcome.jsx';
import Signin from './components/Signin.jsx';
import Signup from './components/Signup.jsx';
import Admin from './components/Admin.jsx';
import AdminStudents from './components/AdminStudent.jsx';
import AdminTeachers from './components/AdminTeacher.jsx';
import AdminClass from './components/AdminClass.jsx';
import Finance from './components/Finance.jsx';
import Specialty from './components/Specialty.jsx';
import Message from './components/Message.jsx';
import ID from './components/ID.jsx';
// If you have a Dashboard component, import it:
// import Dashboard from './components/Dashboard.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin-student" element={<AdminStudents />} />
      <Route path="/admin-teacher" element={<AdminTeachers />} />
      <Route path="/admin-class" element={<AdminClass />} />
      <Route path="/admin-finance" element={<Finance />} />
      <Route path="/admin-specialty" element={<Specialty />} />
      <Route path="/admin-messages" element={<Message />} />
      <Route path="/admin-idcards" element={<ID />} />
      {/* Uncomment if you have a Dashboard component */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
