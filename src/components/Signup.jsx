import React, { useState, useEffect } from "react";
import "./Signup.css";
import logo from "../assets/logo.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import api from "../services/api";
import SuccessMessage from "./SuccessMessage";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    gender: "",
    role: "",
    password: "",
    repeatPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [successType, setSuccessType] = useState("success");
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const [admin3Exists, setAdmin3Exists] = useState(false);
  const [admin3Count, setAdmin3Count] = useState(0);
  const [checkingAdmin3, setCheckingAdmin3] = useState(true);

  useEffect(() => {
    const checkAdmin3Status = async () => {
      try {
        setCheckingAdmin3(true);
        const admin3Exists = await api.checkIfAdmin3Exists();
        setAdmin3Exists(admin3Exists);

        const admin3Count = await api.getAdmin3Count();
        setAdmin3Count(admin3Count);
      } catch (error) {
        console.error('Error checking Admin3 status:', error);
        setAdmin3Exists(false);
        setAdmin3Count(0);
      } finally {
        setCheckingAdmin3(false);
      }
    };

    checkAdmin3Status();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (admin3Exists) {
      if (form.role !== "Admin3") {
        setError("Meet Admin3 for your account creation. Only Admin3 accounts can be created at this time.");
        setSuccess("Account creation restricted. Please contact Admin3.");
        setSuccessType("error");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        return;
      }
    } else {
      if (form.role !== "Admin3") {
        setError("Only Admin3 accounts can be created initially. Please select Admin3 role.");
        setSuccess("Please select Admin3 role for initial account creation.");
        setSuccessType("error");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        return;
      }
    }

    if (form.role === "Admin3" && admin3Count >= 3) {
      setError("Limit Reached");
      setSuccess("Admin3 account limit reached. Please contact existing Admin3 users.");
      setSuccessType("error");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      return;
    }

    if (!form.username || !form.password || !form.role || !form.name) {
      setError("Please fill all required fields.");
      return;
    }
    if (form.password !== form.repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.createAccount({
        username: form.username,
        contact: form.phone,
        password: form.password,
        role: form.role,
        name: form.name,
        email: form.email,
        gender: form.gender,
      });
      setSuccess("Account created successfully! Redirecting to sign in...");
      setSuccessType("success");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      setTimeout(() => navigate("/signin"), 2000);
    } catch (err) {
      setError("Signup failed. Try another username.");
      setSuccess("Signup failed. Please try again.");
      setSuccessType("error");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
    setLoading(false);
  };

  const isLimited = !checkingAdmin3 && admin3Count >= 3;

  return (
    <div className={`signup-root${isLimited ? " signup-root--limited" : ""}`}>
      {showSuccess && (
        <SuccessMessage
          message={success}
          type={successType}
          onClose={() => setShowSuccess(false)}
        />
      )}
      {isLimited && (
        <div className="signup-top-banner">
          <div className="signup-banner-content">
            <span className="signup-banner-icon">🚫</span>
            <span className="signup-banner-text">Sorry, you cannot create an account.</span>
          </div>
        </div>
      )}
      <header className="signup-header">
        <div className="signup-header-inner">
          <div className="signup-header-left">
            <button
              type="button"
              onClick={() => navigate("/")}
              title="Back to Welcome"
              className="signup-header-back"
            >
              <FaArrowLeft />
            </button>
            <div className="signup-brand">
              <img src={logo} alt="VOTECH Logo" className="signup-brand-logo" />
              <span className="signup-brand-name">VOTECH</span>
            </div>
          </div>
          <nav className="signup-header-nav">
            <Link
              className={`signup-header-link${location.pathname === "/signin" ? " active" : ""}`}
              to="/signin"
            >
              Sign In
            </Link>
            <Link
              className={`signup-header-link${location.pathname === "/signup" ? " active" : ""}`}
              to="/signup"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>
      <main className={`signup-main${isLimited ? " disabled" : ""}`}>
        <div className="signup-form-shell">
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-form-intro">
              <h2 className="signup-form-title">Sign Up</h2>
              <p className="signup-form-subtitle">Create your account to get started with VOTECH.</p>
            </div>

            {isLimited && (
              <div className="signup-info-message signup-error">
                Limit Reached
              </div>
            )}
            {!checkingAdmin3 && admin3Count > 0 && admin3Count < 3 && (
              <div className="signup-info-message signup-debug">
                Debug: Admin3 count: {admin3Count}/3
              </div>
            )}

            <button type="button" className="signup-google-btn">
              <FcGoogle className="signup-google-icon" />
              Continue with Google
            </button>
            <div className="signup-or-divider">
              <span className="signup-line"></span>
              <span className="signup-or-text">Or</span>
              <span className="signup-line"></span>
            </div>

            <label className="signup-input-label" htmlFor="signup-name">
              Full Name <span className="signup-req">*</span>
            </label>
            <input
              id="signup-name"
              className="signup-input-field"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              autoComplete="name"
            />

            <label className="signup-input-label" htmlFor="signup-email">
              Email <span className="signup-req">*</span>
            </label>
            <input
              id="signup-email"
              className="signup-input-field"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email"
              autoComplete="email"
            />

            <label className="signup-input-label" htmlFor="signup-phone">
              Phone Number <span className="signup-req">*</span>
            </label>
            <input
              id="signup-phone"
              className="signup-input-field"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              autoComplete="tel"
            />

            <label className="signup-input-label" htmlFor="signup-username">
              Username <span className="signup-req">*</span>
            </label>
            <input
              id="signup-username"
              className="signup-input-field"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
              autoComplete="username"
            />

            <label className="signup-input-label" htmlFor="signup-gender">
              Gender <span className="signup-req">*</span>
            </label>
            <select
              id="signup-gender"
              className="signup-input-field"
              name="gender"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <label className="signup-input-label" htmlFor="signup-role">
              Role <span className="signup-req">*</span>
            </label>
            <select
              id="signup-role"
              className="signup-input-field"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="">Select role</option>
              <option value="Admin1">Admin1</option>
              <option value="Admin2">Admin2</option>
              <option value="Admin3">Admin3</option>
              <option value="Admin4">Admin4</option>
              <option value="Teacher">Teacher</option>
              <option value="Discipline">Discipline</option>
              <option value="Psychosocialist">Psychosocialist</option>
            </select>

            <label className="signup-input-label" htmlFor="signup-password">
              Password <span className="signup-req">*</span>
            </label>
            <div className="signup-password-field-wrapper">
              <input
                id="signup-password"
                className="signup-input-field"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="new-password"
              />
              <span
                className="signup-eye-icon"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <label className="signup-input-label" htmlFor="signup-repeat-password">
              Repeat Password <span className="signup-req">*</span>
            </label>
            <div className="signup-password-field-wrapper">
              <input
                id="signup-repeat-password"
                className="signup-input-field"
                type={showRepeatPassword ? "text" : "password"}
                name="repeatPassword"
                value={form.repeatPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
              <span
                className="signup-eye-icon"
                onClick={() => setShowRepeatPassword((v) => !v)}
              >
                {showRepeatPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {error && <div className="signup-error-message">{error}</div>}
            <button type="submit" className="signup-btn" disabled={loading || admin3Count >= 3}>
              {loading ? "Signing Up..." : admin3Count >= 3 ? "Form Disabled" : "Sign Up"}
            </button>
            <div className="signup-form-bottom-text">
              Already have an account?{" "}
              <Link to="/signin" className="signup-signin-link">
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Signup;
