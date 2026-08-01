import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // error is already set in context
    }
  };

  return (
    <div className="login-container">
      {/* Left gradient panel */}
      <div className="login-hero">
        <h1>Manage your society: residents, flats, and visitors in one place</h1>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-box">
          <div className="login-header">
            <div className="login-logo">
              <i className="fas fa-building"></i>
              <span>SocietyMS</span>
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-icon-wrapper">
                <i className="fas fa-envelope"></i>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@society.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {(localError || error) && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                {localError || error}
              </div>
            )}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="login-footer">
              <p>Demo Credentials:</p>
              <div className="demo-credentials">
                <span>Admin: admin@society.com / admin123</span>
                <span>Resident: resident@society.com / resident123</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;