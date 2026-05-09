import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import '../index.css';

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-container">
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/"><Logo style={{ width: '140px', height: 'auto' }} /></Link>
        </div>
        <div className="nav-links">
          <Link to="/" className="nav-item">Back to Home</Link>
        </div>
      </nav>

      <main className="policy-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: May 9, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>Welcome to Clariva. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, clarivaai.tech.</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We collect information that you provide directly to us when you register for an account, use our AI generation tools, or communicate with us. This may include:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, and account credentials. When you use Google Sign-In, we only request and store your <code>openid</code>, <code>email</code>, and <code>profile</code> information as provided by Google.</li>
            <li><strong>Usage Data:</strong> Information about how you use our website, including document generation history and interaction with our AI.</li>
            <li><strong>Device Information:</strong> IP address, browser type, and operating system.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain our services.</li>
            <li>Improve and personalize your experience on Clariva.</li>
            <li>Process transactions and manage your account.</li>
            <li>Communicate with you regarding updates, security, and support.</li>
            <li>Develop new features and functionality.</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>
          <p>We use industry-standard security measures to protect your data. Your information is stored securely using cloud providers (such as Supabase and Cloudflare R2). While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
        </section>

        <section>
          <h2>5. Third-Party Services</h2>
          <p>We use third-party services to power Clariva, including:</p>
          <ul>
            <li><strong>Google Cloud:</strong> We use Google OAuth for authentication. We only request access to your <code>openid</code>, <code>email</code>, and <code>profile</code> information. We do not access your private files or other sensitive data.</li>
            <li><strong>AI Providers (Groq, Anthropic):</strong> To process your inputs and generate documentation.</li>
            <li><strong>Resend:</strong> For email delivery.</li>
          </ul>
          <p>These third parties have access to your information only to perform specific tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>
        </section>

        <section>
          <h2>6. Your Data Rights</h2>
          <p>Depending on your location, you may have the right to access, correct, or delete your personal data. You can manage your profile settings in the Dashboard or contact us for assistance.</p>
        </section>

        <section>
          <h2>7. Changes to This Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@clarivaai.tech.</p>
        </section>
      </main>

      <footer className="footer" style={{ marginTop: '60px' }}>
        <p>&copy; 2026 Clariva. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PrivacyPage;
