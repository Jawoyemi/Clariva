import React, { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LoginModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      let endpoint = '';
      let body = {};

      if (mode === 'register') {
        endpoint = '/auth/register';
        body = { email, password, name };
      } else if (mode === 'login') {
        endpoint = '/auth/login/email';
        body = { email, password };
      } else if (mode === 'forgot') {
        endpoint = '/auth/forgot-password';
        body = { email };
      } else if (mode === 'reset') {
        endpoint = '/auth/reset-password';
        body = { email, code: resetCode, new_password: newPassword };
      }

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (mode === 'forgot') {
        setSuccessMessage('Reset code sent to your email.');
        setMode('reset');
      } else if (mode === 'reset') {
        setSuccessMessage('Password reset successfully. You can now log in.');
        setMode('login');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create your account'}
            {mode === 'forgot' && 'Forgot Password'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="modal-subtitle">
            {mode === 'login' && 'Sign in to continue to Clariva.'}
            {mode === 'register' && 'Get started with Clariva for free.'}
            {mode === 'forgot' && 'Enter your email to receive a reset code.'}
            {mode === 'reset' && 'Enter the code sent to your email and your new password.'}
          </p>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name" className="form-label">Full name</label>
                <input
                  id="auth-name"
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
              <div className="form-group">
                <label htmlFor="auth-email" className="form-label">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={mode === 'reset'}
                  autoComplete="email"
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="auth-password" className="form-label">Password</label>
                  {mode === 'login' && (
                    <button type="button" className="forgot-link-btn" onClick={() => setMode('forgot')}>
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  className="form-input"
                  placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div className="form-group">
                  <label htmlFor="reset-code" className="form-label">Reset Code</label>
                  <input
                    id="reset-code"
                    type="text"
                    className="form-input"
                    placeholder="Enter code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-password" className="form-label">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    className="form-input"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </>
            )}

            {error && <p className="auth-error">{error}</p>}
            {successMessage && <p className="auth-success">{successMessage}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Processing...' : (
                mode === 'login' ? 'Sign in' : 
                mode === 'register' ? 'Create account' :
                mode === 'forgot' ? 'Send Reset Code' : 'Reset Password'
              )}
            </button>
            
            {(mode === 'forgot' || mode === 'reset') && (
              <button type="button" className="auth-back-btn" onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}>
                Back to login
              </button>
            )}
          </form>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="auth-switch-btn" onClick={switchMode}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Google Login */}
          <button
            type="button"
            className="google-btn"
            onClick={() => {
              window.location.href = `${API}/auth/login`;
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="modal-divider">
            <span>or</span>
          </div>

          {/* Guest Access */}
          <button
            type="button"
            className="guest-btn"
            onClick={async () => {
              try {
                const res = await fetch(`${API}/auth/guest`, {
                  method: 'POST',
                  credentials: 'include',
                });
                if (res.ok || res.redirected) {
                  window.location.href = `${window.location.origin}/dashboard`;
                }
              } catch (e) {
                console.error('Guest login failed', e);
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Continue as Guest
          </button>

          <p className="guest-disclaimer">
            Guest sessions last 30 minutes. You'll be asked to sign in to save your work.
          </p>
        </div>
        
        <div className="modal-footer">
          <p>By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
