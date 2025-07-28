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
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: check, 2: reset
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [reset1Password, setReset1Password] = useState('');
  const [reset2Password, setReset2Password] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

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
        setSuccess('Sign in successful!');
        setShowSuccess(true);
        setShowLoader(true);
        setTimeout(() => {
          setShowLoader(false);
          if (["Admin1", "Admin2", "Admin3"].includes(user.role)) {
            navigate('/admin');
          } else if (user.role === "Admin4") {
            navigate('/dean');
          } else if (user.role === "Discipline") {
            navigate('/discipline');
          } else if (user.role === "Teacher") {
            navigate('/teacher-dashboard');
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

  // New forgot password flow
  const handleCheckAccount = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await api.checkUserDetails(forgotUsername, forgotPhone);
      if (res.exists) {
        setForgotStep(2);
      } else {
        setForgotError('No account found with that username and phone number.');
      }
    } catch (err) {
      setForgotError('Error checking account. Please try again.');
    }
    setForgotLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!reset1Password || !reset2Password) {
      setResetError('Please fill both password fields.');
      return;
    }
    if (reset1Password !== reset2Password) {
      setResetError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      await api.resetPassword(forgotUsername, reset1Password);
      setResetSuccess('Password reset successful! Redirecting to sign in...');
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep(1);
        setForgotUsername('');
        setForgotPhone('');
        setReset1Password('');
        setReset2Password('');
        setResetSuccess('');
        setResetError('');
        setForgotError('');
        navigate('/signin');
      }, 1800);
    } catch (err) {
      setResetError('Failed to reset password. Please try again.');
    }
    setForgotLoading(false);
  };

  return (
    <div className="signin-root">
      {showSuccess && <SuccessMessage message={success} onClose={() => setShowSuccess(false)} />}
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
          <div className="modal-overlay" onClick={() => { setShowForgot(false); setForgotStep(1); setForgotError(''); setResetError(''); setResetSuccess(''); }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{forgotStep === 1 ? 'Check Account' : 'Reset Password'}</h2>
                <button className="close-button modal-text-btn" type="button" onClick={() => { setShowForgot(false); setForgotStep(1); setForgotError(''); setResetError(''); setResetSuccess(''); }}>&times;</button>
              </div>
              {forgotStep === 1 ? (
                <form onSubmit={handleCheckAccount} className="forgot-form">
                  <label className="input-label">Username</label>
                  <input className="input-field" type="text" value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} required />
                  <label className="input-label">Phone Number</label>
                  <input className="input-field" type="tel" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} required />
                  {forgotError && <div className="error-message">{forgotError}</div>}
                  <button type="submit" className="modal-text-btn" disabled={forgotLoading}>{forgotLoading ? 'Checking...' : 'Check Account'}</button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="forgot-form">
                  <label className="input-label">Enter New Password</label>
                  <div className="password-field-wrapper">
                    <input className="input-field" type={showForgotPassword ? 'text' : 'password'} value={reset1Password} onChange={e => setReset1Password(e.target.value)} required />
                    <span className="eye-icon" onClick={() => setShowForgotPassword(v => !v)}>
                      {showForgotPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  <label className="input-label">Repeat Password</label>
                  <div className="password-field-wrapper">
                    <input className="input-field" type={showForgotPassword ? 'text' : 'password'} value={reset2Password} onChange={e => setReset2Password(e.target.value)} required />
                    <span className="eye-icon" onClick={() => setShowForgotPassword(v => !v)}>
                      {showForgotPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  {resetError && <div className="error-message">{resetError}</div>}
                  {resetSuccess && <SuccessMessage message={resetSuccess} />}
                  <button type="submit" className="modal-text-btn" disabled={forgotLoading}>{forgotLoading ? 'Resetting...' : 'Reset'}</button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Signin; 