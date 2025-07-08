import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Account.css';
import logo from '../assets/logo.png';
import ApiService from '../services/api';
import { MdPerson, MdSchool, MdPeople, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';

function Account() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    contact: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState('Student');

  const roleOptions = [
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
    setSuccessMessage('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      await ApiService.createAccount({
        username: formData.username.trim(),
        contact: formData.contact.trim(),
        password: formData.password,
        role: selectedRole.toLowerCase()
      });
      setSuccessMessage('Account created successfully!');
      setFormData({ username: '', contact: '', password: '', confirmPassword: '' });
      setTimeout(() => { navigate('/login'); }, 2500);
    } catch (error) {
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleClick = (role) => {
    setSelectedRole(role);
  };

  return (
    <div className="register-portal-root">
      <div className="register-portal-card">
        {/* Left Panel */}
        <div className="register-portal-left">
          <div className="register-portal-logo-section">
            <img src={logo} alt="MPASAT Logo" className="register-portal-logo" />
            <h1 className="register-portal-title">MPASAT</h1>
          </div>
          <div className="register-portal-school-title">Create Account</div>
          <div className="register-portal-subtitle">Select your role to register</div>
          <div className="register-portal-roles-grid">
            {roleOptions.map(opt => (
              <div
                key={opt.key}
                className={`register-portal-role-card${selectedRole === opt.key ? ' selected' : ''}`}
                onClick={() => handleRoleClick(opt.key)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right Panel */}
        <div className="register-portal-right">
          <div className="register-portal-form-card">
            <h2 className="register-portal-form-title">{selectedRole} Registration</h2>
            <form onSubmit={handleSubmit} className="register-portal-form">
              {error && <div className="register-portal-error">{error}</div>}
              {successMessage && (
                <div className="register-portal-success-message">
                  <FaCheckCircle />
                  {successMessage}
                </div>
              )}
              <div className="register-portal-form-group">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  className="register-portal-input"
                  required
                />
              </div>
              <div className="register-portal-form-group">
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="Enter your contact number"
                  className="register-portal-input"
                  required
                />
              </div>
              <div className="register-portal-form-group">
                <div className="register-portal-password-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="register-portal-input"
                    required
                  />
                  <span className="register-portal-password-toggle" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                  </span>
                </div>
              </div>
              <div className="register-portal-form-group">
                <div className="register-portal-password-input-group">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="register-portal-input"
                    required
                  />
                  <span className="register-portal-password-toggle" onClick={() => setShowConfirmPassword(v => !v)}>
                    {showConfirmPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                  </span>
                </div>
              </div>
              <button type="submit" className="register-portal-button" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
              <div className="register-portal-login-link">
                Already have an account? <span onClick={() => navigate('/')}>Login</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account; 