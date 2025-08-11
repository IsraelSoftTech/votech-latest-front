import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaBook,
  FaMoneyBill,
  FaClipboardList,
  FaChartBar,
  FaFileAlt,
  FaPenFancy,
  FaTachometerAlt,
  FaSignOutAlt,
  FaChevronDown,
  FaEnvelope,
  FaIdCard,
  FaCog,
  FaFileInvoiceDollar,
  FaBoxes,
  FaCreditCard,
  FaUserTie,
  FaChartPie,
  FaCalendarAlt,
  FaGraduationCap,
  FaChalkboard,
  FaChevronCircleUp,
  FaChevronCircleDown,
  FaCalendar,
} from "react-icons/fa";
import logo from "../assets/logo.png";
import ReactDOM from "react-dom";
import "./SideTop.css";
import api from "../services/api";

export default function SideTop({ children, hasUnread, activeTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem("authUser"));
  const username = authUser?.username || "User";

  let menuItems = [];

  if (authUser?.role === "Admin1") {
    menuItems = [
      { label: "Dashboard", icon: <FaTachometerAlt />, path: "/admin" },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      {
        label: "Departments",
        icon: <FaClipboardList />,
        path: "/admin-specialty",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      { label: "Subjects", icon: <FaBook />, path: "/admin-subjects" },
      { label: "Reports", icon: <FaFileAlt /> },
      // { label: "Exam/Marks", icon: <FaChartBar /> },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/admin-lesson-plans",
      },
      {
        label: "Accademics",
        icon: <FaGraduationCap />,
        submenu: [
          {
            label: "Subjects",
            path: "/subjects",
            icon: <FaChalkboardTeacher />,
          },
          {
            label: "Academic Years",
            path: "/academics/academic-years",
            icon: <FaCalendar />,
          },
          // { label: "Exams", path: "/marks-exams" },
          // { label: "Reports", path: "/marks-reports" },
        ],
      },
    ];
  } else if (authUser?.role === "Admin2") {
    menuItems = [
      { label: "Dashboard", icon: <FaTachometerAlt />, path: "/admin" },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
      {
        label: "Financial Summary",
        icon: <FaMoneyBill />,
        path: "/admin-finance",
      },
      { label: "Fee", icon: <FaCreditCard />, path: "/admin-fee" },
      { label: "Salary", icon: <FaFileInvoiceDollar />, path: "/admin-salary" },
      { label: "Inventory", icon: <FaBoxes />, path: "/admin-inventory" },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      { label: "Marks", icon: <FaChartBar />, path: "/admin-marks" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/admin-lesson-plans",
      },
    ];
  } else if (authUser?.role === "Admin3") {
    menuItems = [
      { label: "Dashboard", icon: <FaTachometerAlt />, path: "/admin" },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      {
        label: "Departments",
        icon: <FaClipboardList />,
        path: "/admin-specialty",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      { label: "Subjects", icon: <FaBook />, path: "/admin-subjects" },
      { label: "Marks", icon: <FaChartBar />, path: "/admin-marks" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/admin-lesson-plans",
      },
      {
        label: "Display Users",
        icon: <FaUserGraduate />,
        path: "/admin-users",
      },
    ];
  } else if (authUser?.role === "Admin4") {
    menuItems = [
      { label: "Dashboard", icon: <FaTachometerAlt />, path: "/dean" },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      {
        label: "Departments",
        icon: <FaClipboardList />,
        path: "/admin-specialty",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/dean-messages" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      { label: "Subjects", icon: <FaBook />, path: "/admin-subjects" },
      { label: "Marks", icon: <FaChartBar />, path: "/dean-marks" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/dean-lesson-plans",
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/dean-events" },
      { label: "Staff Management", icon: <FaUserTie />, path: "/dean-staff" },
    ];
  } else if (authUser?.role === "Teacher") {
    menuItems = [
      {
        label: "Dashboard",
        icon: <FaTachometerAlt />,
        path: "/teacher-dashboard",
      },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
      { label: "Messages", icon: <FaEnvelope />, path: "/teacher-messages" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/teacher-lesson-plans",
      },
      { label: "Marks", icon: <FaChartBar />, path: "/teacher-marks" },
    ];
  } else if (authUser?.role === "Discipline") {
    menuItems = [
      { label: "Dashboard", icon: <FaTachometerAlt />, path: "/admin" },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      {
        label: "Departments",
        icon: <FaClipboardList />,
        path: "/admin-specialty",
      },
      {
        label: "Attendance",
        icon: <FaClipboardList />,
        path: "/admin-attendance",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      { label: "Subjects", icon: <FaBook />, path: "/admin-subjects" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/discipline-lesson-plans",
      },
    ];
  } else if (authUser?.role === "Psychosocialist") {
    menuItems = [
      {
        label: "Dashboard",
        icon: <FaTachometerAlt />,
        path: "/psycho-dashboard",
      },
      { label: "Application", icon: <FaClipboardList />, path: "/application" },
      { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
      { label: "Cases", icon: <FaClipboardList />, path: "/psycho-cases" },
      {
        label: "Lesson Plan",
        icon: <FaPenFancy />,
        path: "/psychosocialist-lesson-plans",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/psycho-messages" },
    ];
  }

  // Automatically expand parent menu if a submenu route is active
  useEffect(() => {
    // If on /admin-fee, expand Finances and do not activate Dashboard
    if (location.pathname.startsWith("/admin-fee")) {
      setExpandedMenu("Finances");
    } else {
      const activeSubmenu = menuItems.find(
        (item) =>
          item.submenu &&
          item.submenu.some((sub) => location.pathname.startsWith(sub.path))
      );
      if (activeSubmenu) {
        setExpandedMenu(activeSubmenu.label);
      }
    }
  }, [location.pathname]);

  // Only show Finances for Admin2
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.label === "Finances") {
      return authUser?.role === "Admin2";
    }
    return true;
  });

  // Filter out My Classes for Admin1 users (but keep Application)
  const filterMenuItems = (items) => {
    if (authUser?.role === "Admin1") {
      return items.filter((item) => item.label !== "My Classes");
    }
    return items;
  };

  let menuToShow = filterMenuItems(menuItems);

  // Determine if user is a teacher
  const isTeacher = authUser?.role === "Teacher";
  const [teacherStatus, setTeacherStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      if (isTeacher) {
        try {
          const all = await api.getAllTeachers();
          let rec = null;

          // Try to match by user_id first (most reliable)
          if (authUser?.id) {
            rec = all.find((t) => t.user_id === authUser.id);
          }

          // If not found, try to match by contact (same as DeanManager logic)
          if (!rec && authUser?.contact) {
            rec = all.find((t) => t.contact === authUser.contact);
          }

          // If still not found, try to match by full_name (same as DeanManager logic)
          if (!rec && authUser?.name) {
            rec = all.find((t) => t.full_name === authUser.name);
          }

          // If still not found, try to match by username (fallback)
          if (!rec && authUser?.username) {
            rec = all.find(
              (t) =>
                t.full_name
                  ?.toLowerCase()
                  .includes(authUser.username.toLowerCase()) ||
                t.contact
                  ?.toLowerCase()
                  .includes(authUser.username.toLowerCase())
            );
          }

          console.log("Teacher matching:", {
            authUser: {
              id: authUser?.id,
              contact: authUser?.contact,
              name: authUser?.name,
              username: authUser?.username,
            },
            foundRecord: rec,
            allTeachers: all.length,
          });

          if (isMounted) {
            setTeacherStatus(rec?.status || "pending");
          }
        } catch (err) {
          console.error("Error fetching teacher status:", err);
          if (isMounted) setTeacherStatus("pending");
        }
      }
    }
    fetchStatus();
    // Listen for status update events
    window.addEventListener("teacher-status-updated", fetchStatus);
    return () => {
      isMounted = false;
      window.removeEventListener("teacher-status-updated", fetchStatus);
    };
  }, [isTeacher, authUser]);

  // Teacher menu items (from deleted TeacherSideTop)
  const teacherMenuItems = [
    {
      label: "Dashboard",
      icon: <FaTachometerAlt />,
      path: "/teacher-dashboard",
    },
    { label: "Application", icon: <FaClipboardList />, path: "/application" },
    { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
    { label: "Messages", icon: <FaEnvelope />, path: "/teacher-messages" },
    { label: "Students", icon: <FaUserGraduate />, path: "/teacher-students" },
    { label: "Marks", icon: <FaChartBar />, path: "/teacher-marks" },
    {
      label: "Attendance",
      icon: <FaClipboardList />,
      path: "/teacher-attendance",
    },
    {
      label: "Lesson Plans",
      icon: <FaPenFancy />,
      path: "/teacher-lesson-plans",
    },
    {
      label: "Marks",
      icon: <FaChartBar />,
      submenu: [
        { label: "Continuous Assessment", path: "/marks-ca" },
        { label: "Exams", path: "/marks-exams" },
        { label: "Reports", path: "/marks-reports" },
      ],
    },
  ];

  // Dean/Admin4 menu items (from provided image)
  const deanMenuItems = [
    { label: "Dashboard", icon: <FaTachometerAlt />, path: "/dean" },
    { label: "Application", icon: <FaClipboardList />, path: "/application" },
    { label: "My Classes", icon: <FaBook />, path: "/my-classes" },
    { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
    { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
    { label: "Classes", icon: <FaBook />, path: "/admin-class" },
    {
      label: "Departments",
      icon: <FaClipboardList />,
      path: "/admin-specialty",
    },
    { label: "Messages", icon: <FaEnvelope />, path: "/dean-messages" },
    { label: "Events", icon: <FaClipboardList />, path: "/dean-events" },
    { label: "Timetables", icon: <FaClipboardList />, path: "/timetables" },
    { label: "Marks", icon: <FaChartBar />, path: "/dean-marks" },
    { label: "Lesson Plans", icon: <FaPenFancy />, path: "/dean-lesson-plans" },
  ];

  // Use correct menu for each role
  if (isTeacher) menuToShow = filterMenuItems(teacherMenuItems);
  if (authUser?.role === "Admin4") menuToShow = filterMenuItems(deanMenuItems);
  if (authUser?.role === "Admin3") menuToShow = filterMenuItems(menuItems);

  return (
    <div className="admin-container">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <img src={logo} alt="logo" className="sidebar-logo" />
          <span className="logo-text">VOTECH</span>
        </div>
        <nav className="menu">
          {menuToShow.map((item) => (
            // <div
            //   key={item.label}
            //   className={`menu-item${
            //     (activeTab && item.label === activeTab) ||
            //     location.pathname === item.path ||
            //     (item.path && location.pathname.startsWith(item.path + "/"))
            //       ? " active"
            //       : ""
            //   }`}
            //   onClick={() => item.path && navigate(item.path)}
            //   style={{ position: "relative" }}
            // >
            //   <span className="icon">{item.icon}</span>
            //   {item.label === "Messages" && hasUnread && (
            //     <span
            //       style={{
            //         position: "absolute",
            //         top: 8,
            //         right: 8,
            //         width: 10,
            //         height: 10,
            //         background: "#e53e3e",
            //         borderRadius: "50%",
            //         display: "inline-block",
            //       }}
            //     ></span>
            //   )}
            //   <span>{item.label}</span>
            // </div>
            <div key={item.label}>
              <div
                className={`menu-item${
                  location.pathname === item.path ||
                  (item.submenu && expandedMenu === item.label)
                    ? " active"
                    : ""
                }`}
                onClick={() => {
                  if (item.submenu) {
                    setExpandedMenu(
                      expandedMenu === item.label ? null : item.label
                    );
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.submenu && (
                  <span style={{ marginLeft: "auto" }}>
                    {expandedMenu === item.label ? (
                      <FaChevronCircleUp />
                    ) : (
                      <FaChevronCircleDown />
                    )}
                  </span>
                )}
              </div>

              {item.submenu && expandedMenu === item.label && (
                <div className="submenu">
                  {item.submenu.map((sub) => (
                    <div
                      key={sub.label}
                      className={`submenu-item${
                        location.pathname === sub.path ? " active" : ""
                      }`}
                      onClick={() => navigate(sub.path)}
                      style={{ paddingLeft: 32, cursor: "pointer" }}
                    >
                      {sub.icon}
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* {!isTeacher && showSeeMore && !expandedMenu && ( // This block is removed
            <button
              className="menu-item see-more-btn"
              style={{ background: '#4669b3', color: '#fff', margin: '8px 12px', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem', padding: '12px 0' }}
              onClick={() => setMenuExpanded(v => !v)}
            >
              {menuExpanded ? 'See Less' : 'See More...'}
            </button>
          )} */}
        </nav>
      </aside>
      <div
        className="main-content"
        style={{
          paddingTop: 32,
          minHeight: "calc(100vh - 0px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        <header
          className="admin-header"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            width: "100%",
          }}
        >
          <div
            className="admin-header-left"
            style={{ display: "flex", alignItems: "center", gap: 18 }}
          >
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={logo}
                alt="logo"
                style={{ width: 44, height: 44, objectFit: "contain" }}
              />
              <span
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: "#204080",
                }}
              >
                VOTECH
              </span>
            </div>
          </div>
          <div className="admin-actions">
            <button
              style={{
                background: "none",
                border: "none",
                color: "#204080",
                fontWeight: 600,
                fontSize: 17,
                cursor: "pointer",
                position: "relative",
                padding: "4px 12px",
                borderRadius: 6,
              }}
              onClick={() => setUserMenuOpen((v) => !v)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 180)}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {username}
                {isTeacher && (
                  <div
                    className={`status-dot ${
                      teacherStatus === "approved"
                        ? "approved"
                        : teacherStatus === "pending"
                        ? "pending"
                        : "rejected"
                    }`}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      display: "inline-block",
                      backgroundColor:
                        teacherStatus === "approved"
                          ? "#22bb33"
                          : teacherStatus === "pending"
                          ? "#e53e3e"
                          : "#888",
                      boxShadow:
                        teacherStatus === "approved"
                          ? "0 0 0 2px rgba(34, 187, 51, 0.2)"
                          : teacherStatus === "pending"
                          ? "0 0 0 2px rgba(229, 62, 62, 0.2)"
                          : "0 0 0 2px rgba(136, 136, 136, 0.2)",
                      transition: "all 0.2s ease",
                    }}
                    title={
                      teacherStatus === "approved"
                        ? "Application Approved"
                        : teacherStatus === "pending"
                        ? "Application Pending"
                        : "Application Rejected"
                    }
                  ></div>
                )}
              </div>
            </button>
            {userMenuOpen &&
              ReactDOM.createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: 64,
                    right: 24,
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 4px 24px rgba(32,64,128,0.13)",
                    minWidth: 160,
                    zIndex: 99999,
                    padding: "10px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    overflow: "visible",
                  }}
                >
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "none",
                      border: "none",
                      color: "#204080",
                      fontWeight: 500,
                      fontSize: 16,
                      padding: "10px 18px",
                      cursor: "pointer",
                      borderRadius: 0,
                      textAlign: "left",
                    }}
                  >
                    <FaCog style={{ fontSize: 17 }} /> Settings
                  </button>
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "none",
                      border: "none",
                      color: "#e53e3e",
                      fontWeight: 500,
                      fontSize: 16,
                      padding: "10px 18px",
                      cursor: "pointer",
                      borderRadius: 0,
                      textAlign: "left",
                    }}
                    onClick={() => {
                      sessionStorage.removeItem("token");
                      sessionStorage.removeItem("authUser");
                      window.location.href = "/signin";
                    }}
                  >
                    <FaSignOutAlt style={{ fontSize: 17 }} /> Logout
                  </button>
                </div>,
                document.body
              )}
          </div>
        </header>
        <div style={{ marginTop: 32 }}>{children}</div>
      </div>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
