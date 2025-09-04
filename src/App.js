// App.jsx — merged (duplicates removed; second app's data preferred on conflicts)
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Loader from "./components/Loader";
import Signin from "./components/Signin";
import Signup from "./components/Signup";

// Admin / Core
import Admin from "./components/Admin.jsx";
import Admin2Dash from "./components/Admin2Dash.jsx";
import AdminStudents from "./components/AdminStudent.jsx";
import AdminTeachers from "./components/AdminTeacher.jsx";
import AdminClass from "./components/AdminClass.jsx";
import Finance from "./components/Finance.jsx";
import Specialty from "./components/Specialty.jsx";
import Message from "./components/Message.jsx";
import UserChat from "./components/UserChat";
import ID from "./components/ID.jsx";
import Users from "./components/Users.jsx";
import MonitorUsers from "./components/MonitorUsers.jsx";
import Fee from "./components/Fee";
import StudentFeeDetails from "./components/StudentFeeDetails";
import Salary from "./components/Salary.jsx";
import PaySlip from "./components/PaySlip";
import Admin2PaySlip from "./components/Admin2PaySlip";

import AdminDisciplineCases from "./components/AdminDisciplineCases.jsx";
import AdminCounsellingCases from "./components/AdminCounsellingCases.jsx";
import AdminHODs from "./components/AdminHODs.jsx";

// Academics / Marks module
import Subjects from "./components/Subjects.jsx";
import LessonPlan from "./components/LessonPlan.jsx";
import Marks from "./components/Marks.jsx";
 
import TimeTable from "./components/TimeTable.jsx";
import { AcademicYear } from "./components/marks-module/pages/AccademicYearPage/AcademicYear.page";
import { SubjectPage } from "./components/marks-module/pages/SubjectsPage/Subject.page";
import { ClassPage } from "./components/marks-module/pages/ClassPage/Class.page";
import { AcademicBandsPage } from "./components/marks-module/pages/AcademicBandsPage/AcademicBands";
import { MarksUploadPage } from "./components/marks-module/pages/MarkPage/MarkPage.page";
import { ReportCardHomePage } from "./components/marks-module/pages/ReportCardHomePage/ReportCardHome.page";
import { ReportCardPage } from "./components/marks-module/pages/ReportCardPage/ReportCard.page";

// Discipline / Attendance / Counseling
import DisciplineSideTop from "./components/DisciplineSideTop";
import DisciplineDashboard from "./components/DisciplineDashboard";
import DiscMessage from "./components/DiscMessage.jsx";
import DiscUserChat from "./components/DiscUserChat.jsx";
 
import Attendance from "./components/Attendance.jsx";
import StaffAttendance from "./components/StaffAttendance.jsx";
import DisciplineCases from "./components/DisciplineCases";
import DiscEvents from "./components/DiscEvents.jsx";
import SideTop from "./components/SideTop.jsx";

// Teacher / Dean / Psycho / Events
import TeacherDash from "./components/TeacherDash";
import TeacherMessage from "./components/TeacherMessage.jsx";
import Dean from "./components/Dean.jsx";
import DeanMessage from "./components/DeanMessage.jsx";
import DeanEvent from "./components/DeanEvent";
import DeanLessonPlan from "./components/DeanLessonPlan.jsx";
import UserEvents from "./components/UserEvents";

// Inventory / Misc
import Inventory from "./components/Inventory.jsx";
import GroupChat from "./components/GroupChat";
import PsycoDash from "./components/PsycoDash.jsx";
import Cases from "./components/Cases.jsx";
import PsychoMessage from "./components/PsychoMessage.jsx";
import PsychoChat from "./components/PsychoChat.jsx";
import TeacherCases from "./components/TeacherCases.jsx";
import MasterSheetPage from "./components/marks-module/pages/MasterSheetPage/MasterSheet.page";
import UnauthorizedPage from "./components/Unauthorized.page";

function App() {
  const [showLoader, setShowLoader] = React.useState(true);
  const [showPoweredBy, setShowPoweredBy] = React.useState(false);
  const [authUser, setAuthUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    const timer1 = setTimeout(() => setShowPoweredBy(true), 1500); // show text after 1.5s
    const timer2 = setTimeout(() => setShowLoader(false), 2500); // total 2.5s
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Handle auth user state (reads sessionStorage, listens cross-tab + custom events)
  React.useEffect(() => {
    const checkAuthUser = () => {
      try {
        const storedUser = sessionStorage.getItem("authUser");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // keep console logs for debug — remove if you want clean console
          console.log("App: Setting auth user:", parsedUser);
          setAuthUser(parsedUser);
        } else {
          console.log("App: No auth user found, setting to null");
          setAuthUser(null);
        }
      } catch (error) {
        console.error("App: Error parsing auth user:", error);
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    // Run immediately
    console.log("App: Initial auth check");
    checkAuthUser();

    // Listen for storage changes (login/logout on other tabs)
    const handleStorageChange = (e) => {
      if (e.key === "authUser") {
        console.log("App: Storage change detected for authUser");
        checkAuthUser();
      }
    };

    // Listen for custom events (dispatch new Event('authUserChanged') after login/logout)
    const handleAuthChange = () => {
      console.log("App: Custom auth change event received");
      checkAuthUser();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authUserChanged", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authUserChanged", handleAuthChange);
    };
  }, []);

  if (showLoader) return <Loader poweredBy={showPoweredBy} />;

  return (
    <>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Signin />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />

        {/* Admin / Core */}
        <Route
          path="/admin"
          element={authUser?.role === "Admin2" ? <Admin2Dash /> : <Admin />}
        />
        <Route path="/admin-student" element={<AdminStudents />} />
        <Route path="/admin-teacher" element={<AdminTeachers />} />
        <Route path="/admin-class" element={<AdminClass />} />
        <Route path="/admin-finance" element={<Finance />} />
        <Route path="/admin-specialty" element={<Specialty />} />
        <Route path="/admin-messages" element={<Message />} />
        <Route path="/admin-messages/:userId" element={<UserChat />} />
        <Route path="/admin-idcards" element={<ID />} />
        <Route path="/admin-users" element={<Users />} />
        <Route path="/monitor-users" element={<MonitorUsers />} />

        {/* Fees & Payroll */}
        <Route path="/admin-fee" element={<Fee />} />
        <Route path="/admin-fee/:studentId" element={<StudentFeeDetails />} />
        <Route path="/admin-salary" element={<Salary authUser={authUser} />} />
        <Route
          path="/admin-payslip"
          element={<PaySlip authUser={authUser} />}
        />
        <Route
          path="/admin2-payslip"
          element={<Admin2PaySlip authUser={authUser} />}
        />
        <Route path="/payslip" element={<PaySlip />} />

        {/* Attendance / Staff */}
        <Route
          path="/staff-attendance"
          element={
            <SideTop>
              <StaffAttendance />
            </SideTop>
          }
        />

        {/* Academics */}
        <Route path="/admin-subjects" element={<Subjects />} />
        <Route path="/admin-lesson-plans" element={<LessonPlan />} />
        <Route path="/lesson-plans" element={<LessonPlan />} />
        
        <Route path="/admin-inventory" element={<Inventory />} />
        <Route
          path="/admin-timetable"
          element={<TimeTable authUser={authUser} />}
        />
        <Route path="/timetables" element={<TimeTable authUser={authUser} />} />

        {/* Group / Chats */}
        <Route path="/admin-group-messages/:groupId" element={<GroupChat />} />
        <Route path="/user-messages/:userId" element={<UserChat />} />



        {/* Discipline area */}
        <Route path="/discipline" element={<DisciplineDashboard />} />
        
        <Route path="/discipline-messages" element={<DiscMessage />} />
        <Route path="/discipline-messages/:userId" element={<DiscUserChat />} />
        <Route
          path="/discipline-students"
          element={
            <DisciplineSideTop>
              <div>Students Page</div>
            </DisciplineSideTop>
          }
        />
        <Route
          path="/attendance"
          element={
            <DisciplineSideTop>
              <Attendance />
            </DisciplineSideTop>
          }
        />
        <Route
          path="/discipline-cases"
          element={
            <DisciplineSideTop>
              <DisciplineCases />
            </DisciplineSideTop>
          }
        />
        <Route
          path="/discipline-counseling"
          element={
            <DisciplineSideTop>
              <div>Counseling Records Page</div>
            </DisciplineSideTop>
          }
        />
        <Route
          path="/discipline-security"
          element={
            <DisciplineSideTop>
              <div>Security Incidents Page</div>
            </DisciplineSideTop>
          }
        />
        <Route path="/discipline-lesson-plans" element={<LessonPlan />} />
        <Route
          path="/admin-discipline-cases"
          element={
            <SideTop>
              <AdminDisciplineCases />
            </SideTop>
          }
        />
        <Route
          path="/admin-counselling-cases"
          element={
            <SideTop>
              <AdminCounsellingCases />
            </SideTop>
          }
        />

        <Route path="/discipline-events" element={<DiscEvents />} />

        {/* Teacher / Dean */}
        <Route path="/teacher-dashboard" element={<TeacherDash />} />
        <Route path="/teacher-messages" element={<TeacherMessage />} />
        <Route path="/teacher-messages/:userId" element={<TeacherMessage />} />
        <Route path="/teacher-lesson-plans" element={<LessonPlan />} />
        <Route path="/dean" element={<Dean />} />
        <Route path="/dean-messages" element={<DeanMessage />} />
        <Route path="/dean-messages/:userId" element={<DeanMessage />} />
        <Route path="/dean-events" element={<DeanEvent />} />
        <Route path="/my-events" element={<UserEvents />} />
        <Route path="/dean-operations" element={<Dean />} />
        <Route path="/dean-inventory" element={<Dean />} />
        <Route path="/dean-scheduling" element={<Dean />} />
        <Route path="/dean-academic" element={<Dean />} />
        <Route path="/dean-lesson-plans" element={<DeanLessonPlan />} />
        <Route path="/admin-hods" element={<AdminHODs />} />


        {/* Marks / Reports */}
        <Route path="/admin-marks" element={<Marks />} />
        <Route path="/dean-marks" element={<Marks />} />
        <Route path="/teacher-marks" element={<Marks />} />
        <Route path="/psychosocialist-lesson-plans" element={<LessonPlan />} />

        {/* Psychosocialist Routes */}
        <Route path="/psycho-dashboard" element={<PsycoDash />} />
        <Route path="/psycho-cases" element={<Cases />} />
        <Route path="/psycho-discipline-cases" element={
          <SideTop>
            <DisciplineCases />
          </SideTop>
        } />
        <Route path="/psycho-messages" element={<PsychoMessage />} />
        <Route path="/psycho-chat/:userId" element={<PsychoChat />} />
        <Route path="/teacher-cases" element={<TeacherCases />} />

        {/* ----------------------------------------- */}
        {/* Academics - marks-module pages */}
        <Route path="/academics/academic-years" element={<AcademicYear />} />
        <Route path="/academics/subjects" element={<SubjectPage />} />
        <Route path="/academics/classes" element={<ClassPage />} />
        <Route path="/academics/bands" element={<AcademicBandsPage />} />
        <Route
          path="/academics/mark-upload/:id"
          element={<MarksUploadPage />}
        />
        <Route
          path="/academics/report-cards"
          element={<ReportCardHomePage />}
        />
        <Route path="/academics/report-card/:id" element={<ReportCardPage />} />
        <Route path="/academics/master-sheets" element={<MasterSheetPage />} />
        {/* ----------------------------------------- */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer position="bottom-right" autoClose={8000} />
    </>
  );
}

export default App;
