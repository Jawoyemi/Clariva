import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLoaderData, Link } from 'react-router-dom';
import Logo from '../Logo';
import '../index.css';

const API = import.meta.env.VITE_API_URL || '/api';

const VerifyEmail = () => {
  const user = useLoaderData();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!pastedData) return;

    const newCode = [...code];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex].focus();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const verificationCode = code.join('');
    if (verificationCode.length < 6) {
      setError('Please enter the full 6-character code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Invalid or expired code. Please try again.');
        setLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;

    setResending(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/resend-verification`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setResendTimer(60); // 1 minute cooldown
        setError('New code sent to your email.');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      navigate('/login'); // Redirect anyway
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-info-side">
        <div className="auth-info-content">
          <Link to="/" className="auth-logo">
            <Logo style={{ width: '160px', height: 'auto' }} />
          </Link>
          <div className="auth-info-text">
            <h1 className="auth-info-title">
              Verify your <br/>
              <span className="text-gradient">account.</span>
            </h1>
            <p className="auth-info-subtitle" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginTop: '1rem' }}>
              We've sent a 6-digit verification code to <br/>
              <strong style={{ color: '#fff' }}>{user.email}</strong>
            </p>
          </div>
          <div className="auth-info-footer">
            <p>&copy; 2026 Clariva. Security first.</p>
          </div>
        </div>
        <div className="auth-orb"></div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container anim-fade-up" style={{ maxWidth: '440px' }}>
          <div className="auth-mobile-header">
            <Link to="/"><Logo style={{ width: '120px', height: 'auto' }} /></Link>
          </div>
          
          <div className="auth-form-header">
            <h2 className="auth-title">Enter Verification Code</h2>
            <p className="auth-subtitle">
              Check your inbox and paste the 6-character code below to activate your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-page-form">
            <div className="verification-code-inputs">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength="1"
                  className="code-input"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  required
                  autoComplete="off"
                />
              ))}
            </div>

            {error && (
              <div className={`auth-error-box ${error.includes('sent') ? 'success' : ''}`} style={error.includes('sent') ? { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' } : {}}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary auth-btn" disabled={loading || code.some(d => !d)}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="auth-footer-actions" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p className="auth-subtitle" style={{ fontSize: '0.9rem' }}>
              Didn't receive the code?{' '}
              <button 
                onClick={handleResend} 
                className="resend-link"
                disabled={resendTimer > 0 || resending}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#C09E60', 
                  fontWeight: '600', 
                  cursor: resendTimer > 0 || resending ? 'not-allowed' : 'pointer',
                  opacity: resendTimer > 0 || resending ? 0.5 : 1
                }}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : resending ? 'Sending...' : 'Resend Code'}
              </button>
            </p>
            <button 
              onClick={handleLogout} 
              className="back-link" 
              style={{ 
                display: 'block', 
                width: '100%',
                marginTop: '1.5rem', 
                color: '#9ca3af', 
                background: 'none',
                border: 'none',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
