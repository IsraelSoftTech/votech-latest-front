import React, { useState } from 'react';
import './Signin.css';
import logo from '../assets/logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle, FaKey } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import api from '../services/api';
import Loader from './Loader';
import SuccessMessage from './SuccessMessage';

const STEPS = [
  { id: 1, title: 'Username', label: 'Enter Username' },
  { id: 2, title: 'Email', label: 'Enter Email' },
  { id: 3, title: 'New Password', label: 'Enter new password' },
  { id: 4, title: 'Confirm', label: 'Confirm password' },
];

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState('success');

  const navigate = useNavigate();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
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
      const user = response.data?.user || response.user;
      if (user) {
        setSuccess('Sign in successful! Redirecting...');
        setSuccessType('success');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
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
          } else if (user.role === "Psychosocialist") {
            navigate('/psycho-dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 3000);
      } else {
        setError('Invalid username or password.');
        setSuccess('Sign in failed. Please try again.');
        setSuccessType('error');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
      }
    } catch (err) {
      setError('Signin failed. Try again.');
      setSuccess('Sign in failed. Please try again.');
      setSuccessType('error');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
    setLoading(false);
  };

  const openForgotModal = () => {
    setShowForgotModal(true);
    setForgotStep(1);
    setForgotUsername('');
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotSuccess(false);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotUsername('');
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotSuccess(false);
  };

  const handleForgotNext = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (forgotStep === 1) {
      if (!forgotUsername.trim()) {
        setForgotError('Please enter your username.');
        return;
      }
      setForgotStep(2);
      return;
    }

    if (forgotStep === 2) {
      if (!forgotEmail.trim()) {
        setForgotError('Please enter your email.');
        return;
      }
      setForgotLoading(true);
      try {
        await api.verifyForgotPasswordAccount(forgotUsername.trim(), forgotEmail.trim());
        setForgotStep(3);
      } catch (err) {
        setForgotError(err.message || 'No account found with that username and email.');
      }
      setForgotLoading(false);
      return;
    }

    if (forgotStep === 3) {
      if (!forgotNewPassword || forgotNewPassword.length < 6) {
        setForgotError('Password must be at least 6 characters.');
        return;
      }
      setForgotStep(4);
      return;
    }

    if (forgotStep === 4) {
      if (forgotNewPassword !== forgotConfirmPassword) {
        setForgotError('Passwords do not match.');
        return;
      }
      setForgotLoading(true);
      try {
        await api.resetPasswordWithEmail(forgotUsername.trim(), forgotEmail.trim(), forgotNewPassword);
        setForgotSuccess(true);
        setTimeout(() => {
          closeForgotModal();
        }, 2200);
      } catch (err) {
        setForgotError(err.message || 'Failed to reset password. Please try again.');
      }
      setForgotLoading(false);
    }
  };

  const handleForgotBack = () => {
    setForgotError('');
    if (forgotStep > 1) setForgotStep(forgotStep - 1);
  };

  const getForgotStepLabel = () => {
    if (forgotStep === 1) return 'Enter Username';
    if (forgotStep === 2) return 'Enter Email';
    if (forgotStep === 3) return 'Enter new password';
    return 'Confirm password';
  };

  return (
    <div className="signin-root">
      {showSuccess && <SuccessMessage message={success} type={successType} onClose={() => setShowSuccess(false)} />}
      <header className="signin-header" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          title="Back to Welcome"
          className="signin-header-back"
          style={{ position: 'absolute', right: 16, top: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#204080', fontSize: 20 }}
        >
          <FaArrowLeft />
        </button>
        <div className="signin-header-group">
          <img src={logo} alt="VOTECH Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <span style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: 1.5, color: '#204080' }}>VOTECH</span>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Link className={`signin-header-link${location.pathname === '/signin' || location.pathname === '/' ? ' active' : ''}`} to="/signin">Sign In</Link>
            <Link className={`signin-header-link${location.pathname === '/signup' ? ' active' : ''}`} to="/signup">Sign Up</Link>
          </div>
        </div>
      </header>
      <main className="signin-main">
        {showLoader ? (
          <Loader poweredBy />
        ) : (
          <form className="signin-form" onSubmit={handleSubmit}>
            <div className="signin-form-back-arrow">
              <button type="button" className="signin-back-arrow" onClick={() => navigate('/')} title="Back">
                <FaArrowLeft />
              </button>
            </div>
            <h2 className="signin-form-title">Sign In</h2>
            <button type="button" className="signin-google-btn">
              <FcGoogle className="signin-google-icon" />
              Continue with google authentication
            </button>
            <div className="signin-or-divider">
              <span className="signin-line"></span>
              <span className="signin-or-text">Or</span>
              <span className="signin-line"></span>
            </div>
            <label className="signin-input-label">Username *</label>
            <input className="signin-input-field" type="text" name="username" value={form.username} onChange={handleChange} placeholder="Enter Username" />
            <label className="signin-input-label">Password *</label>
            <div className="signin-password-field-wrapper">
              <input className="signin-input-field" type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Enter Password" />
              <span className="signin-eye-icon" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <button
              type="button"
              className="signin-forgot-link"
              onClick={openForgotModal}
              style={{ alignSelf: 'flex-end', marginBottom: 8 }}
            >
              Forgot Password?
            </button>
            {error && <div className="signin-error-message">{error}</div>}
            <button type="submit" className="signin-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            <div className="signin-form-bottom-text">
              Don't have an account?{" "}
              <Link to="/signup" className="signin-signup-link">
                Sign Up
              </Link>
            </div>
          </form>
        )}

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="signin-forgot-overlay" onClick={closeForgotModal}>
            <div className="signin-forgot-modal" onClick={e => e.stopPropagation()}>
              <div className="signin-forgot-modal-header">
                <div className="signin-forgot-modal-title-row">
                  <FaKey className="signin-forgot-icon" />
                  <h2>Forgot Password?</h2>
                </div>
                <button type="button" className="signin-forgot-close" onClick={closeForgotModal} aria-label="Close">&times;</button>
              </div>

              <div className="signin-forgot-steps">
                {STEPS.map(s => (
                  <div key={s.id} className={`signin-forgot-step-dot ${forgotStep >= s.id ? 'active' : ''} ${forgotStep === s.id ? 'current' : ''}`}>
                    <span>{s.id}</span>
                  </div>
                ))}
              </div>

              {forgotSuccess ? (
                <div className="signin-forgot-success">
                  <FaCheckCircle className="signin-forgot-success-icon" />
                  <h3>Password reset successful!</h3>
                  <p>You can now sign in with your new password.</p>
                </div>
              ) : (
                <form onSubmit={handleForgotNext} className="signin-forgot-form">
                  <p className="signin-forgot-step-label">{getForgotStepLabel()}</p>

                  {forgotStep === 1 && (
                    <input
                      className="signin-input-field"
                      type="text"
                      placeholder="Enter your username"
                      value={forgotUsername}
                      onChange={e => setForgotUsername(e.target.value)}
                      autoFocus
                    />
                  )}

                  {forgotStep === 2 && (
                    <input
                      className="signin-input-field"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      autoFocus
                    />
                  )}

                  {forgotStep === 3 && (
                    <div className="signin-password-field-wrapper">
                      <input
                        className="signin-input-field"
                        type={showForgotPassword ? 'text' : 'password'}
                        placeholder="Enter new password (min 6 characters)"
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        minLength={6}
                        autoFocus
                      />
                      <span className="signin-eye-icon" onClick={() => setShowForgotPassword(v => !v)}>
                        {showForgotPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                  )}

                  {forgotStep === 4 && (
                    <div className="signin-password-field-wrapper">
                      <input
                        className="signin-input-field"
                        type={showForgotPassword ? 'text' : 'password'}
                        placeholder="Confirm your new password"
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        autoFocus
                      />
                      <span className="signin-eye-icon" onClick={() => setShowForgotPassword(v => !v)}>
                        {showForgotPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                  )}

                  {forgotError && <div className="signin-error-message">{forgotError}</div>}

                  <div className="signin-forgot-actions">
                    {forgotStep > 1 && (
                      <button type="button" className="signin-forgot-back-btn" onClick={handleForgotBack}>
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      className="signin-forgot-next-btn"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Verifying...' : forgotStep === 4 ? 'Reset Password' : 'Next'}
                    </button>
                  </div>
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
