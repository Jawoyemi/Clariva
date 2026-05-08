import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Logo from '../Logo';
import '../index.css';

const API = import.meta.env.VITE_API_URL || '/api';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine mode from URL path
  const isRegister = location.pathname === '/register';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear errors when switching modes
  useEffect(() => {
    setError('');
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login/email';
      const body = isRegister 
        ? { email, password, name } 
        : { email, password };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || `Server error (${res.status}). Please try again.`);
        setLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Auth error:', err);
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      const res = await fetch(`${API}/auth/guest`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok || res.redirected) {
        navigate('/dashboard');
      }
    } catch (e) {
      setError('Guest login failed. Please try again.');
    }
  };

  return (
    <div className="auth-page-container">
      {/* Left Side: Branding & Info (Hidden on mobile) */}
      <div className="auth-info-side">
        <div className="auth-info-content">
          <Link to="/" className="auth-logo">
            <Logo style={{ width: '160px', height: 'auto' }} />
          </Link>
          <div className="auth-info-text">
            <h1 className="auth-info-title">
              The fastest way to <br/>
              <span className="text-gradient">document your vision.</span>
            </h1>
            <ul className="auth-info-list">
              <li>
                <span className="check-icon">✓</span>
                AI-powered SOW & PRD generation
              </li>
              <li>
                <span className="check-icon">✓</span>
                Professional PDF exports
              </li>
              <li>
                <span className="check-icon">✓</span>
                Real-time technical clarification
              </li>
            </ul>
          </div>
          <div className="auth-info-footer">
            <p>&copy; 2026 Clariva. Join 1,000+ founders.</p>
          </div>
        </div>
        {/* Background Decorative Elements */}
        <div className="auth-orb"></div>
      </div>

      {/* Right Side: Form */}
      <div className="auth-form-side">
        <div className="auth-form-container anim-fade-up">
          <div className="auth-mobile-header">
            <Link to="/"><Logo style={{ width: '120px', height: 'auto' }} /></Link>
          </div>
          
          <div className="auth-form-header">
            <h2 className="auth-title">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="auth-subtitle">
              {isRegister 
                ? 'Start building your product documentation today.' 
                : 'Sign in to access your projects.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-page-form">
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Password</label>
                {!isRegister && <a href="#" className="forgot-link">Forgot?</a>}
              </div>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isRegister ? 8 : undefined}
              />
            </div>

            {error && <div className="auth-error-box">{error}</div>}

            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
              {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button type="button" className="auth-guest-btn" onClick={handleGuestLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Continue as Guest
          </button>

          <p className="auth-mode-switch">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Sign up for free'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
