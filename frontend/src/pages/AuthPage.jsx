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

  const handleGoogleLogin = () => {
    window.location.href = `${API}/auth/login`;
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
              {loading ? (isRegister ? 'Signing up...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button type="button" className="google-auth-btn" onClick={handleGoogleLogin}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            {isRegister ? 'Sign up with Google' : 'Sign in with Google'}
          </button>

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
