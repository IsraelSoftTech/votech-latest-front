import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../assets/logo.png';
import apiService from '../services/api';
import { MdVisibility, MdVisibilityOff, MdClose } from 'react-icons/md';
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleForgotPasswordInputChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setResetError('');
  };

  const handleCheckUser = async () => {
    try {
      setLoading(true);
      setResetError('');
      
      // Call API to check if user exists with given username and phone number
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

      // Call API to reset password
      await apiService.resetPassword(
        forgotPasswordData.username,
        forgotPasswordData.phoneNumber,
        forgotPasswordData.newPassword
      );

      setShowResetPasswordModal(false);
      setShowSuccessMessage(true);
      
      // Clear form data
      setForgotPasswordData({
        username: '',
        phoneNumber: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Redirect to login after 2 seconds
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { username, password } = formData;
      const response = await apiService.login(username, password);
      
      // Store user data in sessionStorage
      sessionStorage.setItem('authUser', JSON.stringify({
        ...response.user,
        initials: username.charAt(0).toUpperCase()
      }));
      
      // Redirect based on role
      const role = response.user?.role;
      setTimeout(() => {
        setLoading(false);
        if (role === 'admin') {
          navigate('/dashboard', { replace: true });
        } else if (role === 'user') {
          navigate('/user-dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 1000);
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <img src={logo} alt="MPASAT Logo" className="logo" />
          <h1>MPASAT</h1>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder="Enter your username"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-group">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your password"
                className="form-input"
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
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="forgot-password-section">
            <span>Forgot password?</span>
            <button 
              type="button"
              className="reset-button"
              onClick={() => setShowForgotPasswordModal(true)}
            >
              Reset
            </button>
          </div>

          <div className="create-account-link">
            Don't have an account? <span onClick={() => navigate('/account')}>Create Account</span>
          </div>
        </form>
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