import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import '../index.css';

const DocumentationPage = () => {
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
          <Link to="/dashboard" className="nav-item">Back to Dashboard</Link>
        </div>
      </nav>

      <main className="policy-content">
        <h1>Clariva Documentation</h1>
        <p className="last-updated">Last Updated: May 13, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>Clariva is an AI-powered platform designed to help product managers, founders, and engineers generate professional documentation in seconds. By leveraging advanced AI models, Clariva turns your product ideas into structured, industry-standard documents.</p>
        </section>

        <section>
          <h2>2. Getting Started</h2>
          <p>To start using Clariva, you can either use a guest session or create an account:</p>
          <ul>
            <li><strong>Guest Session:</strong> Allows you to try the platform immediately. Note that your work and credits will not be saved after the session expires.</li>
            <li><strong>Registered Account:</strong> Sign up with email or Google to save your chat history, generated documents, and manage your credit balance.</li>
          </ul>
        </section>

        <section>
          <h2>3. Document Types</h2>
          <p>Clariva currently specializes in two primary document types:</p>
          <ul>
            <li><strong>SOW (Statement of Work):</strong> A formal document that defines the scope, deliverables, and timelines of a project. Ideal for freelancers and agencies.</li>
            <li><strong>PRD (Product Requirements Document):</strong> A comprehensive guide that defines a product's features, purpose, and technical requirements. Perfect for product teams and developers.</li>
            <li><strong>Both:</strong> You can choose to generate both documents simultaneously for a complete project overview.</li>
          </ul>
        </section>

        <section>
          <h2>4. The Generation Flow</h2>
          <p>Clariva uses a guided process to ensure high-quality output:</p>
          <ol>
            <li><strong>The Brief:</strong> Start by describing your idea in the chat. Be as specific as possible about the target audience and core features.</li>
            <li><strong>Analysis:</strong> Clariva's AI will analyse your idea and summarize the key components.</li>
            <li><strong>Clarification:</strong> If the AI needs more context, it will ask a few tailored questions. You can answer them or type "skip" to continue.</li>
            <li><strong>Generation:</strong> Once enough context is gathered, Clariva generates the professional DOCX file for you to download.</li>
          </ol>
        </section>

        <section>
          <h2>5. Refining Your Documents</h2>
          <p>The first version isn't always the final one. You can use the chat interface to request specific edits:</p>
          <p><em>Example: "Add a section about mobile responsiveness" or "Change the budget estimation to be more conservative."</em></p>
          <p>Clariva will update the document and provide a new download link immediately.</p>
        </section>

        <section>
          <h2>6. Credits & Plans</h2>
          <p>Clariva uses a credit-based system for document generation and AI chat:</p>
          <ul>
            <li><strong>Free Plan:</strong> 10 credits every 4 hours. Great for occasional use.</li>
            <li><strong>Pro Plan:</strong> 25 credits every 2 hours. Designed for power users and professionals.</li>
            <li><strong>Guest Plan:</strong> 10 credits every 30 minutes (non-persistent).</li>
          </ul>
          <p>Generating a document or performing a revision consumes credits. Your balance is visible in the Dashboard header.</p>
        </section>

        <section>
          <h2>7. Managing Your Data</h2>
          <p>You have full control over your data in the <strong>Settings</strong> modal:</p>
          <ul>
            <li><strong>Delete Chats:</strong> Permanently remove individual or all chat sessions.</li>
            <li><strong>Delete Documents:</strong> Remove generated documents from our secure storage.</li>
            <li><strong>Account Deletion:</strong> Permanently delete your account and all associated data.</li>
          </ul>
        </section>

        <section>
          <h2>8. Frequently Asked Questions (FAQ)</h2>
          <div className="faq-item">
            <h3>How do I get more credits?</h3>
            <p>Credits refill automatically based on your plan. If you need more credits immediately, consider upgrading to the Pro plan in your settings (coming soon).</p>
          </div>
          <div className="faq-item">
            <h3>Can I download documents in PDF?</h3>
            <p>Currently, Clariva exports to DOCX to allow for easy manual editing. You can easily save your DOCX as a PDF using any word processor.</p>
          </div>
          <div className="faq-item">
            <h3>Is my data secure?</h3>
            <p>Yes. We use industry-standard encryption and secure cloud storage. We do not share your documents or ideas with third parties beyond the AI models used for generation.</p>
          </div>
          <div className="faq-item">
            <h3>What happens if I lose my guest session?</h3>
            <p>Guest sessions are temporary. To ensure your work is saved, we recommend creating a free account before you start generating documents.</p>
          </div>
        </section>

        <section>
          <h2>9. Support</h2>
          <p>If you encounter any issues or have feedback, please reach out to our team:</p>
          <ul>
            <li><strong>Email:</strong> support@clarivaai.tech</li>
            <li><strong>Feedback:</strong> Use the "Send Feedback" link in your Settings modal.</li>
          </ul>
        </section>
      </main>

      <footer className="footer" style={{ marginTop: '60px' }}>
        <p>&copy; 2026 Clariva. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DocumentationPage;
