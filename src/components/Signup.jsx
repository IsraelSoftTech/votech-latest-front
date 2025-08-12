import React, { useState } from 'react';
import './Signup.css';
import logo from '../assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    gender: '',
    role: '',
    password: '',
    repeatPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password || !form.role) {
      setError('Please fill all required fields.');
      return;
    }
    if (form.password !== form.repeatPassword) {
      setError('Passwords do not match.');
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
        gender: form.gender
      });
      setSuccess('success');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError('Signup failed. Try another username.');
    }
    setLoading(false);
  };

  return (
    <div className="signup-root">
      <header className="signup-header">
        <div className="signup-header-group">
          <img src={logo} alt="VOTECH Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <span style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: 1.5, color: '#204080' }}>VOTECH</span>
          <Link className={`signup-header-link${window.location.pathname === '/signin' ? ' active' : ''}`} to="/signin">Sign In</Link>
          <Link className={`signup-header-link${window.location.pathname === '/signup' ? ' active' : ''}`} to="/signup">Sign Up</Link>
        </div>
      </header>
      <main className="signup-main">
        <form className="signup-form" onSubmit={handleSubmit}>
          <h2 className="signup-form-title">Sign Up</h2>
          <button type="button" className="signup-google-btn">
            <FcGoogle className="signup-google-icon" />
            Continue with google authentication
          </button>
          <div className="signup-or-divider">
            <span className="signup-line"></span>
            <span className="signup-or-text">Or</span>
            <span className="signup-line"></span>
          </div>
          <label className="signup-input-label">Full Name *</label>
          <input className="signup-input-field" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter Full Name" />
          <label className="signup-input-label">Email *</label>
          <input className="signup-input-field" type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter Email" />
          <label className="signup-input-label">Phone Number *</label>
          <input className="signup-input-field" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Enter Phone Number" />
          <label className="signup-input-label">Username *</label>
          <input className="signup-input-field" type="text" name="username" value={form.username} onChange={handleChange} placeholder="Enter Username" />
          <label className="signup-input-label">Gender *</label>
          <select className="signup-input-field" name="gender" value={form.gender} onChange={handleChange}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
          <label className="signup-input-label">Role *</label>
          <select className="signup-input-field" name="role" value={form.role} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="Admin1">Admin1</option>
            <option value="Admin2">Admin2</option>
            <option value="Admin3">Admin3</option>
            <option value="Admin4">Admin4</option>
            <option value="Teacher">Teacher</option>
            <option value="Discipline">Discipline</option>
            <option value="Psychosocialist">Psychosocialist</option>
          </select>
          <label className="signup-input-label">Password *</label>
          <div className="signup-password-field-wrapper">
            <input className="signup-input-field" type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Enter Password" />
            <span className="signup-eye-icon" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <label className="signup-input-label">Repeat Password *</label>
          <div className="signup-password-field-wrapper">
            <input className="signup-input-field" type={showRepeatPassword ? 'text' : 'password'} name="repeatPassword" value={form.repeatPassword} onChange={handleChange} placeholder="Repeat password" />
            <span className="signup-eye-icon" onClick={() => setShowRepeatPassword(v => !v)}>
              {showRepeatPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <div className="signup-form-bottom-text">
            Already have an account? <Link to="/signin" className="signup-signin-link">Sign In</Link>
          </div>
          {error && <div className="signup-error-message">{error}</div>}
          {success && <SuccessMessage message={success} />}
          <button type="submit" className="signup-btn" disabled={loading}>{loading ? 'Signing Up...' : 'Sign Up'}</button>
        </form>
      </main>
    </div>
  );
};

export default Signup; 