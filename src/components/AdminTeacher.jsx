import React, { useState, useEffect } from "react";
import "./AdminTeacher.css";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaClipboardList,
  FaTachometerAlt,
  FaSignOutAlt,
  FaPlus,
  FaTimes,
  FaBook,
  FaMoneyBill,
  FaFileAlt,
  FaChartBar,
  FaPenFancy,
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaIdCard,
  FaCog,
  FaSpinner,
  FaEye,
} from "react-icons/fa";
import logo from "../assets/logo.png";
import SuccessMessage from "./SuccessMessage";
import { useLocation } from "react-router-dom";
import ReactDOM from "react-dom";
import SideTop from "./SideTop";
import api from "../services/api";

const years = Array.from({ length: 26 }, (_, i) => `20${25 + i}/20${26 + i}`);

export default function AdminTeacher() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    sex: "",
    id_card: "",
    dob: "",
    pob: "",
    subjects: "",
    classes: "",
    contact: "",
  });
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [applications, setApplications] = useState([]);
  const [approvedStaff, setApprovedStaff] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem("authUser"));
  const isAdmin1 = authUser?.role === "Admin1";
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showSubjectsDropdown, setShowSubjectsDropdown] = useState(false);
  const [showClassesDropdown, setShowClassesDropdown] = useState(false);
  const [approveStates, setApproveStates] = useState({});
  const [approveLoading, setApproveLoading] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const canApprove = authUser?.role === "Admin3";
  const [disapproveId, setDisapproveId] = useState(null);
  const [disapproveLoading, setDisapproveLoading] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Fetch applications from backend
  useEffect(() => {
    fetchApplications();
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    // Filter approved applications
    const approved = applications.filter((app) => app.status === "approved");
    console.log("[DEBUG] Filtering approved applications:", {
      totalApplications: applications.length,
      approvedCount: approved.length,
      allStatuses: applications.map((app) => ({
        id: app.id,
        status: app.status,
        name: app.applicant_name,
      })),
    });
    setApprovedStaff(approved);
  }, [applications]);

  useEffect(() => {
    // Sync approveStates with applications list (local only)
    setApproveStates(
      Object.fromEntries(applications.map((a) => [a.id, a.status]))
    );
  }, [applications]);

  const fetchApplications = async () => {
    try {
      console.log(
        "[DEBUG] Fetching applications for user:",
        authUser?.username,
        "Role:",
        authUser?.role
      );
      const res = await api.getApplications();
      console.log("[DEBUG] Applications fetched:", res.length, "applications");
      console.log("[DEBUG] Applications data:", res);
      setApplications(res);
    } catch (err) {
      console.error("[DEBUG] Error fetching applications:", err);
      setError(`Failed to fetch applications: ${err.message}`);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.getClasses();
      setClasses(res);
    } catch (err) {}
  };
  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      setSubjects(res);
    } catch (err) {}
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "classes") {
      setForm((f) => {
        const arr = Array.isArray(f.classes)
          ? f.classes
          : f.classes
          ? f.classes.split(",")
          : [];
        return {
          ...f,
          classes: checked ? [...arr, value] : arr.filter((c) => c !== value),
        };
      });
    } else if (name === "subjects") {
      setForm((f) => {
        const arr = Array.isArray(f.subjects)
          ? f.subjects
          : f.subjects
          ? f.subjects.split(",")
          : [];
        return {
          ...f,
          subjects: checked ? [...arr, value] : arr.filter((s) => s !== value),
        };
      });
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setRegistering(true);
    try {
      const submitForm = {
        ...form,
        classes: Array.isArray(form.classes)
          ? form.classes.join(",")
          : form.classes,
        subjects: Array.isArray(form.subjects)
          ? form.subjects.join(",")
          : form.subjects,
      };
      if (editingId) {
        await api.updateTeacher(editingId, submitForm);
        setSuccess("Teacher updated!");
      } else {
        await api.addTeacher(submitForm);
        setSuccess("Teacher registered!");
      }
      setShowModal(false);
      setForm({
        full_name: "",
        sex: "",
        id_card: "",
        dob: "",
        pob: "",
        subjects: "",
        classes: "",
        contact: "",
      });
      setEditingId(null);
      fetchApplications();
    } catch (err) {
      setError("Failed to save teacher");
    }
    setRegistering(false);
    setTimeout(() => setSuccess(""), 1200);
  };

  const handleEdit = (t) => {
    setForm({ ...t });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
  };
  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteTeacher(deleteId);
      setDeleteId(null);
      fetchApplications();
    } catch (err) {
      setError("Failed to delete teacher");
    }
    setDeleteLoading(false);
  };
  const cancelDelete = () => {
    setDeleteId(null);
  };

  const handleToggleApprove = (id) => {
    setApproveStates((prev) => ({
      ...prev,
      [id]: prev[id] === "approved" ? "pending" : "approved",
    }));
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCertificate(null);
  };

  return (
    <SideTop>
      {/* Success Message */}
      {success && <SuccessMessage message={success} />}

      <div className="dashboard-cards">
        <div className="card teachers">
          <div className="icon">
            <FaChalkboardTeacher />
          </div>
          <div className="count">{approvedStaff.length}</div>
          <div className="desc">Approved Staff</div>
        </div>
        <div className="card discipline">
          <div className="icon">
            <FaClipboardList />
          </div>
          <div className="count">3</div>
          <div className="desc">Discipline Cases</div>
        </div>
      </div>
      <div className="teacher-section">
        <div className="teacher-header-row">
          <h2>Approved Staff Members</h2>
          <p>List of all approved staff members by Admin4</p>
        </div>
        <div
          className="teacher-table-wrapper"
          style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}
        >
          <table className="teacher-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Subject(s)</th>
                <th>Class(es) Assigned</th>
                <th>Contact</th>
                <th>Application Date</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {approvedStaff.map((staff, i) => (
                <tr key={staff.id || i}>
                  <td>{i + 1}</td>
                  <td className="staff-name">
                    {staff.applicant_name || staff.applicant_full_name}
                  </td>
                  <td>{staff.applicant_username}</td>
                  <td>{staff.subjects}</td>
                  <td>
                    {staff.classes
                      ? staff.classes
                          .split(",")
                          .filter((c) => c.trim() !== "undefined")
                          .join(", ")
                      : ""}
                  </td>
                  <td>{staff.contact}</td>
                  <td>
                    {staff.submitted_at
                      ? new Date(staff.submitted_at).toLocaleDateString()
                      : ""}
                  </td>
                  <td>
                    {staff.certificate_url ? (
                      <button
                        className="action-btn view-certificate"
                        title="View Certificate"
                        onClick={() => handleViewCertificate(staff)}
                      >
                        <FaEye />
                      </button>
                    ) : (
                      <span style={{ color: "#999", fontSize: "12px" }}>
                        No certificate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {approvedStaff.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <FaChalkboardTeacher />
            </div>
            <h3>No Approved Staff</h3>
            <p>
              There are no approved staff members yet. Staff members will appear
              here once their applications are approved by Admin4.
            </p>
          </div>
        )}
      </div>
      {showCertificateModal && selectedCertificate && (
        <div className="modal-overlay" onClick={closeCertificateModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              width: "auto",
              height: "auto",
            }}
          >
            <button className="modal-close" onClick={closeCertificateModal}>
              <FaTimes />
            </button>
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <h3 style={{ color: "#204080", marginBottom: 16, fontSize: 20 }}>
                Certificate -{" "}
                {selectedCertificate.applicant_name ||
                  selectedCertificate.applicant_full_name}
              </h3>
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#f8f9fa",
                  minHeight: 400,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {selectedCertificate.certificate_url ? (
                  (() => {
                    const fileExtension = selectedCertificate.certificate_url
                      .split(".")
                      .pop()
                      ?.toLowerCase();
                    const certificateUrl =
                      selectedCertificate.certificate_url.startsWith("http")
                        ? selectedCertificate.certificate_url
                        : `http://localhost:5000${selectedCertificate.certificate_url}`;

                    if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
                      // Display image
                      return (
                        <img
                          src={certificateUrl}
                          alt="Certificate"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "70vh",
                            objectFit: "contain",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                          }}
                        />
                      );
                    } else if (fileExtension === "pdf") {
                      // Display PDF
                      return (
                        <iframe
                          src={certificateUrl}
                          title="Certificate PDF"
                          style={{
                            width: "100%",
                            height: "70vh",
                            border: "none",
                            borderRadius: 4,
                          }}
                        />
                      );
                    } else {
                      // Fallback for unknown file types
                      return (
                        <div style={{ padding: 20, textAlign: "center" }}>
                          <FaFileAlt
                            style={{
                              fontSize: 48,
                              color: "#666",
                              marginBottom: 16,
                            }}
                          />
                          <p style={{ color: "#666", marginBottom: 16 }}>
                            Certificate file:{" "}
                            {selectedCertificate.certificate_url
                              .split("/")
                              .pop()}
                          </p>
                          <a
                            href={certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "10px 20px",
                              background: "#204080",
                              color: "#fff",
                              textDecoration: "none",
                              borderRadius: 4,
                              fontWeight: 500,
                              transition: "background 0.18s",
                            }}
                          >
                            Download Certificate
                          </a>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div style={{ padding: 20, textAlign: "center" }}>
                    <FaFileAlt
                      style={{ fontSize: 48, color: "#666", marginBottom: 16 }}
                    />
                    <p style={{ color: "#666" }}>No certificate available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
}
