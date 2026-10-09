import { useState } from 'react';
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
    } catch {
      // error is already set in context
    }
  };

  return (
    <div className="login-container">
      <div className="login-shell">
      <div className="login-hero">
        <div className="hero-brand"><span className="hero-brand-icon"><i className="fas fa-building"></i></span><span>SocietyMS</span></div>
        <div className="hero-copy">
          <span className="hero-eyebrow">SOCIETY MANAGEMENT</span>
          <h1>Your community,<br />running smoothly.</h1>
          <p>One place for residents, homes, visitors, and the everyday work of your society.</p>
          <div className="hero-feature-list">
            <span><i className="fas fa-check-circle"></i> Resident and flat records</span>
            <span><i className="fas fa-check-circle"></i> Notices, complaints, and maintenance</span>
            <span><i className="fas fa-check-circle"></i> Visitor check-in and history</span>
          </div>
        </div>
        <div className="hero-footer">A clearer view of your society, every day.</div>
      </div>

      <div className="login-form-panel">
        <div className="login-box">
          <div className="login-header">
            <div className="login-logo">
              <span className="login-logo-icon"><i className="fas fa-building"></i></span>
              <span className="login-logo-name">SocietyMS</span>
            </div>
            <h2>Welcome back</h2>
            <p>Sign in with your society account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
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

            <div className="login-field">
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
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

            <p className="login-help">Use the username or email and password provided by your society administrator.</p>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
