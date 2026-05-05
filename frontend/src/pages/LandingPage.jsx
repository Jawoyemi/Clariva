import React, { useState, useEffect } from 'react';
import '../index.css';
import Logo from '../Logo';
import LoginModal from '../LoginModal';

const LandingPage = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on refresh
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.scroll-anim');
    hiddenElements.forEach((el) => observer.observe(el));

    return () => {
      hiddenElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-brand anim-fade-in">
          <Logo className="logo-svg" style={{ width: '140px', height: 'auto' }} />
        </div>
        <div className="nav-links anim-fade-in" style={{ animationDelay: '0.1s' }}>
          <a href="#how" className="nav-item">How it works</a>
          <a href="#features" className="nav-item">Features</a>
          <button className="btn-primary" onClick={() => setIsLoginOpen(true)}>Try it for free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        {/* Animated orb background */}
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-orb hero-orb-3"></div>
        {/* Dot grid overlay */}
        <div className="hero-grid-overlay"></div>

        <div className="hero-content">
          <div className="hero-badge anim-fade-up" style={{ animationDelay: '0s' }}>
            <span className="hero-badge-dot"></span>
            AI-powered document generation
          </div>
          <h1 className="hero-title anim-fade-up" style={{ animationDelay: '0.15s' }}>
            Think it.<br/>
            <span className="hero-title-gradient">Clariva</span> builds it.
          </h1>
          <p className="hero-subtitle anim-fade-up" style={{ animationDelay: '0.3s' }}>
            Describe your product idea in plain English. Clariva generates a
            professional SOW or PRD document instantly, no technical
            knowledge required.
          </p>
          <div className="hero-cta anim-fade-up" style={{ animationDelay: '0.45s' }}>
            <button className="btn-primary btn-glow" onClick={() => setIsLoginOpen(true)}>Try it for free</button>
            <a href="#how" className="btn-link">
              See how it works
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Interactive UI Mockup */}
        <div className="hero-mockup anim-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="mockup-header">
            <div className="mockup-dots"><span></span><span></span><span></span></div>
            <div className="mockup-title">Clariva Assistant</div>
          </div>
          <div className="mockup-body">
            <div className="mockup-chat mockup-chat-user">
              I need a PRD for a freelance invoice tracker app.
            </div>
            <div className="mockup-chat mockup-chat-ai">
              📋 Great, I'll prepare a <strong>Product Requirements Document (PRD)</strong>. First, describe who it is for, what problem it solves, and the key features.
            </div>
          </div>
          <div className="mockup-input">
            <div className="mockup-input-bar">Describe the product...</div>
            <div className="mockup-input-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></div>
          </div>
          
          {/* Floating stat card overlapping the mockup */}
          <div className="mockup-float-card anim-float">
            <span className="float-card-num">2 min</span>
            <span className="float-card-label">avg. generation time</span>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="how" className="steps-section">
        <div className="section-header scroll-anim">
          <h2 className="section-title">From idea to document in<br/>minutes</h2>
        </div>
        <div className="steps-grid">
          {/* Step 1 */}
          <div className="step-card scroll-anim delay-100">
            <div className="step-number">01</div>
            <h3 className="step-title">Describe</h3>
            <p className="step-desc">
              Tell Clariva about your product idea in plain English. No technical knowledge needed.
            </p>
          </div>
          {/* Step 2 */}
          <div className="step-card scroll-anim delay-200">
            <div className="step-number">02</div>
            <h3 className="step-title">Refine</h3>
            <p className="step-desc">
              Answer a few simple questions. Clariva builds a complete picture of what you want to create.
            </p>
          </div>
          {/* Step 3 */}
          <div className="step-card scroll-anim delay-300">
            <div className="step-number">03</div>
            <h3 className="step-title">Generate</h3>
            <p className="step-desc">
              Receive a professional SOW or PRD document, ready to hand to any developer or agency.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="capabilities-section">
        <div className="capabilities-content-wrapper scroll-anim">
          <span className="capabilities-label">CAPABILITIES</span>
          <h2 className="section-title">Everything you need to brief a developer</h2>
          
          <div className="cap-grid">
            <div className="cap-card scroll-anim delay-100">
              <div className="cap-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 className="cap-title">Instant SOW Generation</h3>
              <p className="cap-desc">Detailed Statement of Work documents created in seconds from your initial pitch.</p>
            </div>

            <div className="cap-card scroll-anim delay-200">
              <div className="cap-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
              <h3 className="cap-title">Instant PRD Generation</h3>
              <p className="cap-desc">Comprehensive Product Requirement Documents that cover every edge case and feature.</p>
            </div>

            <div className="cap-card scroll-anim delay-300">
              <div className="cap-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3 className="cap-title">No Technical Knowledge Required</h3>
              <p className="cap-desc">Speak naturally. We translate your business needs into technical specifications.</p>
            </div>

            <div className="cap-card scroll-anim delay-100">
              <div className="cap-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3 className="cap-title">AI Clarifying Questions</h3>
              <p className="cap-desc">Our AI asks the right questions to fill in technical gaps you might have missed.</p>
            </div>

            <div className="cap-card scroll-anim delay-200">
              <div className="cap-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="18"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3 className="cap-title">PDF Export</h3>
              <p className="cap-desc">Professional, branded PDFs ready for sharing with stakeholders or dev teams.</p>
            </div>

            <div className="cap-card scroll-anim delay-300">
              <div className="cap-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="cap-title">Guest Access</h3>
              <p className="cap-desc">Invite team members to collaborate on refining your product vision together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-bg-layer"></div>
        <div className="cta-content scroll-anim">
          <h2 className="cta-title">Ready to build something?</h2>
          <p className="cta-subtitle">Generate your first SOW or PRD free. No account required.</p>
          <button className="btn-primary" onClick={() => setIsLoginOpen(true)}>Get started for free</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer scroll-anim delay-100">
        <div className="footer-brand">
          <Logo className="logo-svg" style={{ width: '120px', height: 'auto' }} />
          <p className="footer-brand-desc">
            Think it. Clariva builds it. The professional standard for product documentation.
          </p>
        </div>
        
        <div className="footer-col">
          <h4>PRODUCT</h4>
          <div className="footer-links">
            <a href="#" className="footer-link">Home</a>
            <a href="#features" className="footer-link">Features</a>
            <a href="#how" className="footer-link">How it works</a>
          </div>
        </div>
        
        <div className="footer-col">
          <h4>COMPANY</h4>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2026 Clariva. All rights reserved.</p>
          <div className="social-links">
            <a href="#" className="footer-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
              </svg>
            </a>
            <a href="#" className="footer-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Login Modal Overlay */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default LandingPage;
