import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
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
  FaUsers,
  FaUser,
  FaCamera,
  FaTimes,
  FaGraduationCap,
  FaChalkboard,
  FaChevronCircleUp,
  FaChevronCircleDown,
  FaCalendar,
  FaLayerGroup,
  FaBookOpen,
  FaTable,
} from "react-icons/fa";
import logo from "../assets/logo.png";
import ReactDOM from "react-dom";
import "./SideTop.css";
import api from "../services/api";
import NotificationBell from "./NotificationBell";
import MessageIcon from "./MessageIcon";

export default function SideTop({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [myPayslipCount, setMyPayslipCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "",
    profileImage: null,
    profileImageUrl: null,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Added: local active tab to prevent undefined reference and allow visual highlight if needed
  const [activeTab, setActiveTab] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const authUser = JSON.parse(sessionStorage.getItem("authUser"));
  const username = authUser?.username || "User";

  // Added: derive unread flag to avoid undefined reference
  const hasUnread = unreadMessageCount > 0;

  // Track if the user has manually toggled a submenu to prevent auto-override
  const userToggledRef = useRef(false);

  let menuItems = [];

  if (authUser?.role === "Admin1") {
    menuItems = [
      { label: "Dashboard", icon: <MdDashboard />, path: "/admin" },
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      // { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      {
        label: "Departments",
        icon: <FaClipboardList />,
        path: "/admin-specialty",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      { label: "Monitor Users", icon: <FaUsers />, path: "/monitor-users" },
      { label: "Fee", icon: <FaMoneyBill />, path: "/admin-fee" },
      { label: "Salary", icon: <FaFileInvoiceDollar />, path: "/admin-salary" },
      { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
      // { label: "Subjects", icon: <FaBook />, path: "/admin-subjects" },
      {
        label: "Subjects",
        path: "/academics/subjects",
        icon: <FaBookOpen />,
      },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/admin-lesson-plans",
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/my-events" },
      {
        label: "Disciplinary Cases",
        icon: <FaClipboardList />,
        path: "/admin-discipline-cases",
      },
      {
        label: "Counselling Cases",
        icon: <FaClipboardList />,
        path: "/admin-counselling-cases",
      },
    ];
  } else if (authUser?.role === "Admin2") {
    menuItems = [
      { label: "Dashboard", icon: <MdDashboard />, path: "/admin" },
 
      {
        label: "Financial Summary",
        icon: <FaMoneyBill />,
        path: "/admin-finance",
      },
      {
        label: "Subjects",
        path: "/academics/subjects",
        icon: <FaBookOpen />,
      },
      { label: "Fee", icon: <FaCreditCard />, path: "/admin-fee" },
      { label: "Salary", icon: <FaFileInvoiceDollar />, path: "/admin-salary" },
      {
        label: "Pay Slip",
        icon: <FaFileInvoiceDollar />,
        path: "/admin2-payslip",
      },
      { label: "Inventory", icon: <FaBoxes />, path: "/admin-inventory" },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      // { label: "Marks", icon: <FaChartBar />, path: "/admin-marks" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/admin-lesson-plans",
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/my-events" },
    ];
  } else if (authUser?.role === "Admin3") {
    menuItems = [
      { label: "Dashboard", icon: <MdDashboard />, path: "/admin" },
 
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      // { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      // {
      //   label: "Departments",
      //   icon: <FaClipboardList />,
      //   path: "/admin-specialty",
      // },
      { label: "Messages", icon: <FaEnvelope />, path: "/admin-messages" },
      { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      // { label: "Subjects", icon: <FaBook />, path: "/admin-subjects" },
      // { label: "Marks", icon: <FaChartBar />, path: "/admin-marks" },
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
      {
        label: "Accademics",
        icon: <FaGraduationCap />,
        submenu: [
          {
            label: "Subjects",
            path: "/academics/subjects",
            icon: <FaChalkboardTeacher />,
          },
          {
            label: "Academic Years",
            path: "/academics/academic-years",
            icon: <FaCalendar />,
          },
          {
            label: "Classes",
            path: "/academics/classes",
            icon: <FaChalkboard />,
          },
          {
            label: "Academic Bands",
            path: "/academics/bands",
            icon: <FaLayerGroup />,
          },
          {
            label: "Report Cards",
            path: "/academics/report-cards",
            icon: <FaBookOpen />,
          },
          // {
          //   label: "Master Sheets",
          //   path: "/academics/master-sheets",
          //   icon: <FaTable />,
          // },
        ],
      },
      { label: "Monitor Users", icon: <FaUsers />, path: "/monitor-users" },
      {
        label: "Staff Attendance",
        icon: <FaClipboardList />,
        path: "/staff-attendance",
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/my-events" },
    ];
  } else if (authUser?.role === "Admin4") {
    menuItems = [
      { label: "Dashboard", icon: <MdDashboard />, path: "/dean" },
 
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      // { label: "Classes", icon: <FaBook />, path: "/admin-class" },
      {
        label: "Departments",
        icon: <FaClipboardList />,
        path: "/admin-specialty",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/dean-messages" },
      { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      {
        label: "Subjects",
        path: "/academics/subjects",
        icon: <FaBookOpen />,
      },
      // { label: "Marks", icon: <FaChartBar />, path: "/dean-marks" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/dean-lesson-plans",
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/dean-events" },
      { label: "My Events", icon: <FaCalendarAlt />, path: "/my-events" },
      { label: "Staff Management", icon: <FaUserTie />, path: "/dean-staff" },
    ];
  } else if (authUser?.role === "Teacher") {
    menuItems = [
      {
        label: "Dashboard",
        icon: <MdDashboard />,
        path: "/teacher-dashboard",
      },
 
      { label: "Messages", icon: <FaEnvelope />, path: "/teacher-messages" },
      { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/teacher-lesson-plans",
      },
      // { label: "Marks", icon: <FaChartBar />, path: "/teacher-marks" },
      {
        label: "Subjects",
        path: "/academics/subjects",
        icon: <FaBookOpen />,
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/my-events" },
    ];
  } else if (authUser?.role === "Discipline") {
    menuItems = [
      { label: "Dashboard", icon: <MdDashboard />, path: "/admin" },
 
      { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
      { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
      // { label: "Classes", icon: <FaBook />, path: "/admin-class" },
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
      { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
      { label: "ID Cards", icon: <FaIdCard />, path: "/admin-idcards" },
      {
        label: "Subjects",
        path: "/academics/subjects",
        icon: <FaBookOpen />,
      },
      {
        label: "Lesson Plans",
        icon: <FaPenFancy />,
        path: "/discipline-lesson-plans",
      },
      { label: "Events", icon: <FaCalendarAlt />, path: "/my-events" },
    ];
  } else if (authUser?.role === "Psychosocialist") {
    menuItems = [
      { label: "Dashboard", icon: <MdDashboard />, path: "/psycho-dashboard" },
 
      { label: "Cases", icon: <FaClipboardList />, path: "/psycho-cases" },
      {
        label: "Subjects",
        path: "/academics/subjects",
        icon: <FaBookOpen />,
      },
      {
        label: "Lesson Plan",
        icon: <FaPenFancy />,
        path: "/psychosocialist-lesson-plans",
      },
      { label: "Messages", icon: <FaEnvelope />, path: "/psycho-messages" },
    ];
  }

  // Automatically expand parent menu on first load if a submenu route is active,
  // but do not override after the user manually toggles.
  useEffect(() => {
    if (userToggledRef.current) return;

    // If on /admin-fee, expand Finances (kept as-is from your logic; harmless if not present)
    if (location.pathname.startsWith("/admin-fee")) {
      setExpandedMenu("Finances");
      return;
    }

    const activeSubmenu = menuItems.find(
      (item) =>
        item.submenu &&
        item.submenu.some((sub) => location.pathname.startsWith(sub.path))
    );
    if (activeSubmenu) {
      setExpandedMenu(activeSubmenu.label);
    }
  }, [location.pathname, menuItems]);

  // Filter out My Classes for Admin1 users
  const filterMenuItems = (items) => {
    if (authUser?.role === "Admin1") {
      return items.filter((item) => item?.label !== "My Classes");
    }
    return items;
  };

  let menuToShow = filterMenuItems(menuItems);

  // Fetch my payslip count for roles that have Pay Slip
  useEffect(() => {
    let isMounted = true;
    async function fetchPayslipCount() {
      try {
        const list = await api.getMyPaidSalaries();
        if (isMounted) setMyPayslipCount(Array.isArray(list) ? list.length : 0);
      } catch (e) {
        if (isMounted) setMyPayslipCount(0);
      }
    }
    fetchPayslipCount();
    const interval = setInterval(fetchPayslipCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authUser?.id]);

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

          // If not found, try to match by contact
          if (!rec && authUser?.contact) {
            rec = all.find((t) => t.contact === authUser.contact);
          }

          // If still not found, try to match by full_name
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

          if (isMounted) {
            setTeacherStatus(rec?.status || "pending");
          }
        } catch (err) {
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
      icon: <MdDashboard />,
      path: "/teacher-dashboard",
    },
    
    { label: "Messages", icon: <FaEnvelope />, path: "/teacher-messages" },
    { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
    { label: "Students", icon: <FaUserGraduate />, path: "/teacher-students" },
    {
      label: "Subjects",
      path: "/academics/subjects",
      icon: <FaBookOpen />,
    },
    // { label: "Marks", icon: <FaChartBar />, path: "/teacher-marks" },
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
    { label: "My Events", icon: <FaCalendarAlt />, path: "/my-events" },
  ];

  // Dean/Admin4 menu items (from provided image)
  const deanMenuItems = [
    { label: "Dashboard", icon: <MdDashboard />, path: "/dean" },
    
    { label: "Students", icon: <FaUserGraduate />, path: "/admin-student" },
    { label: "Staff", icon: <FaChalkboardTeacher />, path: "/admin-teacher" },
    { label: "Classes", icon: <FaBook />, path: "/admin-class" },
    {
      label: "Departments",
      icon: <FaClipboardList />,
      path: "/admin-specialty",
    },
    { label: "Messages", icon: <FaEnvelope />, path: "/dean-messages" },
    { label: "Pay Slip", icon: <FaFileInvoiceDollar />, path: "/payslip" },
    { label: "My Events", icon: <FaCalendarAlt />, path: "/my-events" },
    { label: "Timetables", icon: <FaClipboardList />, path: "/timetables" },

    // { label: "Marks", icon: <FaChartBar />, path: "/dean-marks" },
    {
      label: "Subjects",
      path: "/academics/subjects",
      icon: <FaBookOpen />,
    },
    { label: "Lesson Plans", icon: <FaPenFancy />, path: "/dean-lesson-plans" },
  ];

  // Use correct menu for each role
  if (isTeacher) menuToShow = filterMenuItems(teacherMenuItems);
  if (authUser?.role === "Admin4") menuToShow = filterMenuItems(deanMenuItems);
  if (authUser?.role === "Admin3") menuToShow = filterMenuItems(menuItems);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await api.getTotalUnreadCount();
        setUnreadMessageCount(count);
      } catch (error) {
        setUnreadMessageCount(0);
      }
    };

    fetchUnreadCount();

    // Set up periodic refresh every 30 seconds for messages
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for custom events when messages are sent/received
    const handleMessageChange = () => {
      fetchUnreadCount();
    };

    window.addEventListener("messageSent", handleMessageChange);
    window.addEventListener("messageReceived", handleMessageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("messageSent", handleMessageChange);
      window.removeEventListener("messageReceived", handleMessageChange);
    };
  }, []);

  // Function to refresh events count (can be called from other components)
  const refreshEventsCount = async () => {
    try {
      const events = await api.getEvents();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingEvents = events.filter((event) => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });

      setUpcomingEventsCount(upcomingEvents.length);
    } catch (error) {
      setUpcomingEventsCount(0);
    }
  };

  useEffect(() => {
    refreshEventsCount();
    const interval = setInterval(refreshEventsCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle bell click to navigate to events
  const handleBellClick = () => {
    // Navigate to the appropriate events page based on user role
    if (authUser?.role === "Admin4") {
      navigate("/dean-events");
    } else {
      navigate("/my-events");
    }
  };

  // Handle message click to navigate to messages
  const handleMessageClick = () => {
    if (authUser?.role === "Admin4") {
      navigate("/dean-messages");
    } else {
      navigate("/admin-messages");
    }
  };

  // Profile management functions
  const openProfileModal = () => {
    setProfileData({
      username: authUser?.username || "",
      profileImage: null,
      profileImageUrl:
        authUser?.profileImageUrl || authUser?.profile_image_url || null,
    });
    setShowProfileModal(true);
    setUserMenuOpen(false);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData((prev) => ({
          ...prev,
          profileImage: file,
          profileImageUrl: e.target.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileData.username.trim()) return;

    setIsUpdating(true);
    try {
      const fileToUpload = profileData.profileImage || null;
      const result = await api.updateMyProfile({
        username: profileData.username,
        profileFile: fileToUpload,
      });
      const updated = result?.user
        ? {
            ...authUser,
            ...result.user,
            profileImageUrl:
              result.user.profileImageUrl ||
              result.user.profile_image_url ||
              null,
          }
        : { ...authUser, username: profileData.username };
      sessionStorage.setItem("authUser", JSON.stringify(updated));
      setShowProfileModal(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const removeProfileImage = () => {
    setProfileData((prev) => ({
      ...prev,
      profileImage: null,
      profileImageUrl: null,
    }));
  };

  return (
    <div className="admin-container">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <img src={logo} alt="logo" className="sidebar-logo" />
          <span className="logo-text">VOTECH</span>
        </div>

        <nav className="menu">
          {menuToShow.filter(Boolean).map((item) => {
            const hasSubmenu =
              Array.isArray(item.submenu) && item.submenu.length > 0;
            const isExpanded = hasSubmenu && expandedMenu === item.label;
            const isActive =
              (item.path &&
                (location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/"))) ||
              (hasSubmenu &&
                item.submenu.some((sub) =>
                  location.pathname.startsWith(sub.path)
                ));

            const submenuId = `submenu-${item.label
              .replace(/\s+/g, "-")
              .toLowerCase()}`;

            return (
              <div key={item.label} style={{ width: "100%" }}>
                <div
                  className={`menu-item${isActive ? " active" : ""} ${
                    hasSubmenu ? " has-submenu" : ""
                  } ${isExpanded ? " expanded" : ""}`}
                  onClick={() => {
                    if (hasSubmenu) {
                      userToggledRef.current = true;
                      setExpandedMenu((prev) =>
                        prev === item.label ? null : item.label
                      );
                    } else if (item.path) {
                      setActiveTab(item.label);
                      navigate(item.path);
                      setSidebarOpen(false);
                    }
                  }}
                  role={hasSubmenu ? "button" : "link"}
                  aria-expanded={hasSubmenu ? Boolean(isExpanded) : undefined}
                  aria-controls={hasSubmenu ? submenuId : undefined}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (hasSubmenu) {
                        userToggledRef.current = true;
                        setExpandedMenu((prev) =>
                          prev === item.label ? null : item.label
                        );
                      } else if (item.path) {
                        setActiveTab(item.label);
                        navigate(item.path);
                        setSidebarOpen(false);
                      }
                    }
                  }}
                  style={{ position: "relative" }}
                >
                  <span className="icon">{item.icon}</span>

                  {item.label === "Messages" && hasUnread && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 10,
                        height: 10,
                        background: "#e53e3e",
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />
                  )}

                  <span className="menu-label" title={item.label}>
                    {item.label}
                  </span>

                  {hasSubmenu && (
                    <span className="chevron" aria-hidden="true">
                      <FaChevronCircleDown />
                    </span>
                  )}

                  {item.label === "Pay Slip" && myPayslipCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        right: hasSubmenu ? 28 : 10,
                        top: 10,
                        background: "#204080",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "1px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {myPayslipCount}
                    </span>
                  )}
                </div>

                {hasSubmenu && (
                  <div
                    id={submenuId}
                    className={`submenu ${isExpanded ? "expanded" : ""}`}
                  >
                    {item.submenu.map((sub) => {
                      const subActive = location.pathname.startsWith(sub.path);
                      return (
                        <div
                          key={`${item.label}-${sub.label}`}
                          className={`submenu-item${
                            subActive ? " active" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(sub.path);
                            setSidebarOpen(false);
                          }}
                        >
                          <span className="icon">{sub.icon}</span>
                          <span className="menu-label" title={sub.label}>
                            {sub.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
            <MessageIcon
              count={unreadMessageCount}
              onClick={handleMessageClick}
            />
            <NotificationBell
              count={upcomingEventsCount}
              onClick={handleBellClick}
            />
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
                {authUser?.profileImageUrl || authUser?.profile_image_url ? (
                  <img
                    src={authUser.profileImageUrl || authUser.profile_image_url}
                    alt="Profile"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #eaf3ff",
                    }}
                  />
                ) : (
                  <span>{username}</span>
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
                    onClick={openProfileModal}
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

      {/* Profile Settings Modal */}
      {showProfileModal &&
        ReactDOM.createPortal(
          <div
            className="profile-modal-overlay"
            onClick={() => setShowProfileModal(false)}
          >
            <div
              className="profile-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="profile-modal-header">
                <h2>Profile Settings</h2>
                <button
                  className="profile-modal-close"
                  onClick={() => setShowProfileModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="profile-modal-body">
                {/* Profile Image Section */}
                <div className="profile-image-section">
                  <div className="profile-image-preview">
                    {profileData.profileImageUrl ? (
                      <img
                        src={profileData.profileImageUrl}
                        alt="Profile Preview"
                        className="profile-preview-img"
                      />
                    ) : (
                      <div className="profile-placeholder">
                        <FaUser />
                      </div>
                    )}
                    <div className="profile-image-overlay">
                      <label
                        htmlFor="profile-image-input"
                        className="camera-icon"
                      >
                        <FaCamera />
                      </label>
                      <input
                        id="profile-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: "none" }}
                      />
                    </div>
                  </div>
                  {profileData.profileImageUrl && (
                    <button
                      className="remove-image-btn"
                      onClick={removeProfileImage}
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                {/* Username Section */}
                <div className="profile-input-section">
                  <label htmlFor="username-input">Username</label>
                  <input
                    id="username-input"
                    type="text"
                    value={profileData.username}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="Enter username"
                    className="profile-input"
                  />
                </div>
              </div>

              <div className="profile-modal-footer">
                <button
                  className="profile-cancel-btn"
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="profile-update-btn"
                  onClick={handleProfileUpdate}
                  disabled={isUpdating || !profileData.username.trim()}
                >
                  {isUpdating ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
