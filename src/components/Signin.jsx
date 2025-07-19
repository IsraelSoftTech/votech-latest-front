import React, { useState } from 'react';
import './Signin.css';
import logo from '../assets/logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import api from '../services/api';
import Loader from './Loader';
import SuccessMessage from './SuccessMessage';

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
        setShowLoader(true);
        setTimeout(() => {
          setShowLoader(false);
          if (["Admin1", "Admin2", "Admin3", "Admin4"].includes(user.role)) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 3000);
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
        <div className="header-group">
          <img src={logo} alt="VOTECH Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <span style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: 1.5, color: '#204080' }}>VOTECH</span>
          <Link className={`header-link${location.pathname === '/signin' || location.pathname === '/' ? ' active' : ''}`} to="/signin">Sign In</Link>
          <Link className={`header-link${location.pathname === '/signup' ? ' active' : ''}`} to="/signup">Sign Up</Link>
        </div>
      </header>
      <main className="signin-main">
        {showLoader ? (
          <Loader poweredBy />
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
              <form onSubmit={handleForgotPassword} className="forgot-form">
                <label className="input-label">Username</label>
                <input className="input-field" type="text" value={resetUsername} onChange={e => setResetUsername(e.target.value)} required />
                <label className="input-label">New Password</label>
                <div className="password-field-wrapper">
                  <input className="input-field" type={showForgotPassword ? 'text' : 'password'} value={resetPassword} onChange={e => setResetPassword(e.target.value)} required />
                  <span className="eye-icon" onClick={() => setShowForgotPassword(v => !v)}>
                    {showForgotPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {resetMessage && (resetMessage.includes('successful') ? <SuccessMessage message={resetMessage} /> : <div className="error-message">{resetMessage}</div>)}
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