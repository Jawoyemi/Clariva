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
    <div className="modal-overlay" style={{ padding: '20px' }}>
      <div className="settings-modal" style={{ 
        maxWidth: '480px', 
        width: '100%',
        textAlign: 'center',
        padding: window.innerWidth < 480 ? '24px 16px' : '32px 24px',
        margin: 'auto'
      }}>
        <div className="settings-modal-header" style={{ borderBottom: 'none', marginBottom: '0', position: 'relative' }}>
          <div style={{ width: '100%' }}>
            <div className="document-card-icon" style={{ 
              margin: '0 auto 16px', 
              width: window.innerWidth < 480 ? '48px' : '60px', 
              height: window.innerWidth < 480 ? '48px' : '60px' 
            }}>
              <svg width={window.innerWidth < 480 ? "24" : "32"} height={window.innerWidth < 480 ? "24" : "32"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ fontSize: window.innerWidth < 480 ? '20px' : '24px', marginBottom: '8px' }}>Out of Credits</h2>
            <p style={{ fontSize: window.innerWidth < 480 ? '14px' : '16px', color: 'rgba(255, 255, 255, 0.7)' }}>
              You've used all your available credits for now.
            </p>
          </div>
          <button 
            className="modal-close" 
            type="button" 
            onClick={onClose} 
            style={{ 
              position: 'absolute', 
              top: '-8px', 
              right: '-8px',
              width: '32px',
              height: '32px',
              fontSize: '24px'
            }}
          >
            ×
          </button>
        </div>

        <div className="settings-credits-container" style={{ margin: '24px 0', background: 'rgba(255, 255, 255, 0.05)', padding: '16px' }}>
          <div className="settings-credits-row" style={{ flexDirection: 'column', gap: '12px' }}>
            <div className="settings-credits-info" style={{ alignItems: 'center' }}>
              <span className="settings-credits-label" style={{ fontSize: '11px' }}>Current Balance</span>
              <span className="settings-credits-value" style={{ color: '#F44336', fontSize: '20px' }}>{balance} / {max}</span>
            </div>
            
            <div className="settings-credits-timer" style={{ alignItems: 'center' }}>
              <span className="settings-timer-label" style={{ fontSize: '11px' }}>Next Refill In</span>
              <span className="settings-timer-value" style={{ 
                fontSize: window.innerWidth < 480 ? '22px' : '28px', 
                padding: '6px 16px',
                minWidth: '120px'
              }}>
                {refillCountdown || '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'rgba(192, 158, 96, 0.08)', 
          borderRadius: '12px', 
          padding: '12px', 
          marginBottom: '20px', 
          border: '1px solid rgba(192, 158, 96, 0.2)' 
        }}>
          <p style={{ color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '500', margin: 0, lineHeight: '1.4' }}>
             Every {getRefillInterval()}, your balance will be topped up by <strong>+{getRefillAmount()} credits</strong>.
          </p>
        </div>

        <button className="settings-save-btn" onClick={onClose} style={{ padding: '14px' }}>
          Got it
        </button>
      </div>
    </div>
  );
};

export default CreditsModal;
