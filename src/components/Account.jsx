import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Account.css';
import logo from '../assets/logo.png';
import ApiService from '../services/api';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccessMessage('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await ApiService.createAccount({
        username: formData.username.trim(),
        contact: formData.contact.trim(),
        password: formData.password
      });

      // Show success message
      setSuccessMessage('Account created successfully!');
      
      // Reset form
      setFormData({
        username: '',
        contact: '',
        password: '',
        confirmPassword: ''
      });

      // Redirect to login after 2.5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo-section">
          <img src={logo} alt="MPASAT Logo" className="register-logo" />
          <h1>MPASAT</h1>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {error && <div className="register-error-message">{error}</div>}
          {successMessage && (
            <div className="register-success-message">
              <FaCheckCircle />
              {successMessage}
            </div>
          )}
          
          <div className="register-form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder="Enter your username"
              className="register-form-input"
            />
          </div>

          <div className="register-form-group">
            <label htmlFor="contact">Contact</label>
            <input
              type="text"
              id="contact"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              required
              placeholder="Enter your contact number"
              className="register-form-input"
            />
          </div>

          <div className="register-form-group">
            <label htmlFor="password">Password</label>
            <div className="register-password-input-group">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your password"
                className="register-form-input"
              />
              <button
                type="button"
                className="register-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>

          <div className="register-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="register-password-input-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your password"
                className="register-form-input"
              />
              <button
                type="button"
                className="register-toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="register-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="register-login-link">
            Already have an account? <span onClick={() => navigate('/')}>Login</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Account; 