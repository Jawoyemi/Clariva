import React from 'react';

const CreditsModal = ({ isOpen, onClose, balance, max, nextRefill, refillCountdown, plan }) => {
  if (!isOpen) return null;

  const getRefillAmount = () => {
    if (plan === 'pro') return 25;
    if (plan === 'free') return 10;
    return 10;
  };

  const getRefillInterval = () => {
    if (plan === 'pro') return '2 hours';
    if (plan === 'free') return '4 hours';
    return '30 minutes';
  };

  return (
    <div className="modal-overlay">
      <div className="settings-modal" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="settings-modal-header" style={{ borderBottom: 'none', marginBottom: '0' }}>
          <div style={{ width: '100%' }}>
            <div className="document-card-icon" style={{ margin: '0 auto 20px', width: '60px', height: '60px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Out of Credits</h2>
            <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)' }}>
              You've used all your available credits for now.
            </p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px' }}>×</button>
        </div>

        <div className="settings-credits-container" style={{ margin: '30px 0', background: 'rgba(255, 255, 255, 0.05)' }}>
          <div className="settings-credits-row" style={{ flexDirection: 'column', gap: '15px' }}>
            <div className="settings-credits-info" style={{ alignItems: 'center' }}>
              <span className="settings-credits-label">Current Balance</span>
              <span className="settings-credits-value" style={{ color: '#F44336' }}>{balance} / {max}</span>
            </div>
            
            <div className="settings-credits-timer" style={{ alignItems: 'center' }}>
              <span className="settings-timer-label">Next Refill In</span>
              <span className="settings-timer-value" style={{ fontSize: '28px', padding: '8px 20px' }}>
                {refillCountdown || '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(192, 158, 96, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(192, 158, 96, 0.2)' }}>
          <p style={{ color: 'var(--accent-gold)', fontSize: '14px', fontWeight: '500', margin: 0 }}>
             Every {getRefillInterval()}, your balance will be topped up by <strong>+{getRefillAmount()} credits</strong> (up to {max}).
          </p>
        </div>

        <button className="settings-save-btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
};

export default CreditsModal;
