import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../assets/logo.png';
import apiService from '../services/api';
import { MdPerson, MdSchool, MdAdminPanelSettings, MdPeople, MdLock, MdVisibility, MdVisibilityOff, MdClose } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';
import Loader from './Loader';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    username: '',
    phoneNumber: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetError, setResetError] = useState('');
  const [selectedRole, setSelectedRole] = useState('Parent');

  const roleOptions = [
    { key: 'Admin', icon: <MdAdminPanelSettings size={28} />, label: 'Admin' },
    { key: 'Student', icon: <MdSchool size={28} />, label: 'Student' },
    { key: 'Teacher', icon: <MdPeople size={28} />, label: 'Teacher' },
    { key: 'Parent', icon: <MdPerson size={28} />, label: 'Parent' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { username, password } = formData;
      const response = await apiService.login(username, password);
      sessionStorage.setItem('authUser', JSON.stringify({
        ...response.user,
        initials: username.charAt(0).toUpperCase()
      }));
      
      // Redirect based on user role
      setTimeout(() => {
        setLoading(false);
        const userRole = response.user.role;
        if (userRole === 'admin') {
          navigate('/dashboard', { replace: true });
        } else if (userRole === 'teacher') {
          navigate('/teacher-dashboard', { replace: true });
        } else {
          // student and parent go to user dashboard
          navigate('/user-dashboard', { replace: true });
        }
      }, 1000);
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleForgotPasswordInputChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData(prev => ({ ...prev, [name]: value }));
    setResetError('');
  };

  const handleCheckUser = async () => {
    try {
      setLoading(true);
      setResetError('');
      const response = await apiService.checkUser(
        forgotPasswordData.username,
        forgotPasswordData.phoneNumber
      );
      if (response.exists) {
        setShowForgotPasswordModal(false);
        setShowResetPasswordModal(true);
      } else {
        setResetError('No account found with these credentials.');
      }
    } catch (error) {
      setResetError(error.message || 'Failed to verify account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setResetError('');
      if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
        setResetError('Passwords do not match.');
        setLoading(false);
        return;
      }
      await apiService.resetPassword(
        forgotPasswordData.username,
        forgotPasswordData.phoneNumber,
        forgotPasswordData.newPassword
      );
      setShowResetPasswordModal(false);
      setShowSuccessMessage(true);
      setForgotPasswordData({
        username: '',
        phoneNumber: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => {
        setShowSuccessMessage(false);
        navigate('/');
      }, 2000);
    } catch (error) {
      setResetError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleClick = (role) => {
    setSelectedRole(role);
    // Optionally, navigate to a different login route for each role
    // For now, just update the UI
  };

  if (loading) return <Loader />;

  return (
    <div className="login-portal-root">
      <div className="login-portal-card">
        {/* Left Panel */}
        <div className="login-portal-left">
          <div className="login-portal-logo-section">
            <img src={logo} alt="MPASAT Logo" className="login-portal-logo" />
            <h1 className="login-portal-title">MPASAT</h1>
          </div>
          <div className="login-portal-school-title">School Portal</div>
          <div className="login-portal-subtitle">Select your role to login</div>
          <div className="login-portal-roles-grid">
            {roleOptions.map(opt => (
              <div
                key={opt.key}
                className={`login-portal-role-card${selectedRole === opt.key ? ' selected' : ''}`}
                onClick={() => handleRoleClick(opt.key)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right Panel */}
        <div className="login-portal-right">
          <div className="login-portal-form-card">
            <h2 className="login-portal-form-title">{selectedRole} Login</h2>
            <form onSubmit={handleSubmit} className="login-portal-form">
              {error && <div className="login-portal-error">{error}</div>}
              <div className="login-portal-form-group">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username or parent ID"
                  className="login-portal-input"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="login-portal-form-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="login-portal-input"
                  autoComplete="current-password"
                  required
                />
                <span className="login-portal-password-toggle" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                </span>
              </div>
              <button type="submit" className="login-portal-login-btn">Login</button>
            </form>
            <div className="login-portal-links">
              <div>
                Forgot password? <span className="login-portal-link" onClick={() => setShowForgotPasswordModal(true)}>Reset</span>
              </div>
              <div style={{ marginTop: 8 }}>
                Don't have an account? <span className="login-portal-link" onClick={() => navigate('/account')}>Create Account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="modal-overlay">
          <div className="modal forgot-password-modal">
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setResetError('');
                  setForgotPasswordData({
                    username: '',
                    phoneNumber: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
              >
                <MdClose />
              </button>
            </div>
            {resetError && <div className="error-message">{resetError}</div>}
            <div className="form-group">
              <label htmlFor="reset-username">Username</label>
              <input
                type="text"
                id="reset-username"
                name="username"
                value={forgotPasswordData.username}
                onChange={handleForgotPasswordInputChange}
                placeholder="Enter your username"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone-number">Phone Number</label>
              <input
                type="tel"
                id="phone-number"
                name="phoneNumber"
                value={forgotPasswordData.phoneNumber}
                onChange={handleForgotPasswordInputChange}
                placeholder="Enter your phone number"
                className="form-input"
                required
              />
            </div>
            <button 
              className="check-button"
              onClick={handleCheckUser}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Check'}
            </button>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="modal-overlay">
          <div className="modal reset-password-modal">
            <div className="modal-header">
              <h2>Set New Password</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetError('');
                  setForgotPasswordData({
                    username: '',
                    phoneNumber: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
              >
                <MdClose />
              </button>
            </div>
            {resetError && <div className="error-message">{resetError}</div>}
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="password-input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  id="new-password"
                  name="newPassword"
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordInputChange}
                  placeholder="Enter new password"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="password-input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirm-password"
                  name="confirmPassword"
                  value={forgotPasswordData.confirmPassword}
                  onChange={handleForgotPasswordInputChange}
                  placeholder="Confirm new password"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
            </div>
            <button 
              className="reset-button"
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset'}
            </button>
          </div>
        </div>
      )}
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message-overlay">
          <div className="success-message">
            <FaCheckCircle />
            Password reset successful! Redirecting to login...
          </div>
        </div>
      )}
    </div>
  );
}

export default Login; 