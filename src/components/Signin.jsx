import React, { useState } from 'react';
import './Signin.css';
import logo from '../assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import api from '../services/api';
import Loader from './Loader';

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.login(form.username, form.password);
      // Support both response.data.user and response.user
      const user = response.data?.user || response.user;
      if (user) {
        // Role-based navigation only, no localStorage
        if (["Admin1", "Admin2", "Admin3", "Admin4"].includes(user.role)) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError('Signin failed. Try again.');
    }
    setLoading(false);
  };

  const handleAdminClick = () => {
    setShowLoader(true);
    setTimeout(() => {
      setShowLoader(false);
      navigate('/admin');
    }, 1500);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetMessage('');
    setResetLoading(true);
    try {
      await api.resetPassword(resetUsername, resetPassword);
      setResetMessage('Password reset successful! You can now sign in.');
      setResetUsername('');
      setResetPassword('');
    } catch (err) {
      setResetMessage('Password reset failed. Please check the username.');
    }
    setResetLoading(false);
  };

  return (
    <div className="signin-root">
      <header className="signin-header">
        <div className="header-left">
          <span className="back-arrow" onClick={() => navigate('/')}> <FaArrowLeft /> </span>
          <img src={logo} alt="VOLTECH Logo" className="header-logo" />
          <span className="header-voltech">VOLTECH</span>
        </div>
        <div className="header-right">
          <Link className="header-link active" to="/signin">Sign In</Link>
          <Link className="header-link" to="/signup">Sign Up</Link>
        </div>
      </header>
      <main className="signin-main">
        {showLoader ? (
          <Loader />
        ) : (
          <form className="signin-form" onSubmit={handleSubmit}>
            <h2 className="form-title">Sign In</h2>
            <button type="button" className="google-btn">
              <FcGoogle className="google-icon" />
              Continue with google authentication
            </button>
            <div className="or-divider">
              <span className="line"></span>
              <span className="or-text">Or</span>
              <span className="line"></span>
            </div>
            <label className="input-label">Username *</label>
            <input className="input-field" type="text" name="username" value={form.username} onChange={handleChange} placeholder="Enter Username" />
            <label className="input-label">Password *</label>
            <div className="password-field-wrapper">
              <input className="input-field" type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Enter Password" />
              <span className="eye-icon" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <div className="form-links">
              <button type="button" className="forgot-link" onClick={() => setShowForgot(true)}>
                Forgot Password?
              </button>
            </div>
            <div className="form-bottom-text">
              Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="signin-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        )}
        {showForgot && (
          <div className="modal-overlay" onClick={() => setShowForgot(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Reset Password</h2>
                <button className="close-button" onClick={() => setShowForgot(false)}>&times;</button>
              </div>
              <form onSubmit={handleForgotPassword}>
                <label className="input-label">Username</label>
                <input className="input-field" type="text" value={resetUsername} onChange={e => setResetUsername(e.target.value)} required />
                <label className="input-label">New Password</label>
                <input className="input-field" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required />
                {resetMessage && <div className={resetMessage.includes('successful') ? 'success-message' : 'error-message'}>{resetMessage}</div>}
                <button type="submit" className="signin-btn" disabled={resetLoading}>{resetLoading ? 'Resetting...' : 'Reset Password'}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Signin; 