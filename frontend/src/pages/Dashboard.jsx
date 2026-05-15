import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData, Link, useParams, useNavigate } from 'react-router-dom';
import '../index.css';
import Logo from '../Logo';
import LoginModal from '../LoginModal';
import CreditsModal from '../CreditsModal';

const SUGGESTION_GROUPS = [
  [
    'Build a SaaS platform for freelancers to manage client contracts and invoices',
    'Create a client portal for agencies to share project updates and collect approvals',
    'Design a PRD for a B2B project management tool with AI task estimation',
  ],
  [
    'Create a mobile app that generates SOWs from voice notes for consultants',
    'Build an AI assistant that turns meeting notes into product requirements',
    'Design a document automation tool for startup founders preparing MVP specs',
  ],
  [
    'Build a marketplace for local service providers to receive bookings and payments',
    'Create an e-commerce returns management platform for small online stores',
    'Design a vendor onboarding portal for restaurants and suppliers',
  ],
  [
    'Create a fintech dashboard that helps freelancers track income, taxes, and invoices',
    'Build a budgeting app for students with savings goals and spending insights',
    'Design a loan application workflow for small business owners',
  ],
  [
    'Build a healthtech appointment booking app for clinics and patients',
    'Create a patient intake form system with secure document uploads',
    'Design a care coordination dashboard for home health providers',
  ],
  [
    'Create an internal HR tool for onboarding new employees and tracking tasks',
    'Build a CRM for boutique agencies to manage leads, proposals, and follow-ups',
    'Design an operations dashboard for tracking team workload and deadlines',
  ],
  [
    'Build a learning platform for bootcamp students to submit projects and get feedback',
    'Create a mentorship matching app for founders and industry experts',
    'Design a course marketplace with instructor dashboards and student progress tracking',
  ],
];

const API = import.meta.env.VITE_API_URL || '/api';

const getRotatingSuggestions = (date = new Date()) => {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - startOfYear) / 86400000);
  return SUGGESTION_GROUPS[dayOfYear % SUGGESTION_GROUPS.length];
};

const toDisplayText = (value) => {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || '—';
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (item == null) return null;
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return item.feature || item.action || item.value || null;
        }
        return String(item);
      })
      .filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  if (typeof value === 'object') {
    if ('value' in value) return toDisplayText(value.value);
    if ('level' in value) return toDisplayText(value.level);
  }

  return '—';
};

// Chat message types: 'user' | 'assistant' | 'clarify' | 'error'

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft('Full');
      return;
    }

    const update = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Refilling soon...');
        return;
      }

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return <span>Full</span>;
  return <span>{timeLeft}</span>;
};

const Dashboard = () => {
  const userLoadData = useLoaderData();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [sidebarView, setSidebarView] = useState('chats');
  const mainRef = useRef(null);
  const [showLogin, setShowLogin] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | clarifying | done
  const [clarifyingQuestions, setClarifyingQuestions] = useState([]);
  const [clarifyingIndex, setClarifyingIndex] = useState(0);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [currentBrief, setCurrentBrief] = useState(null);
  const [clarifyingAnswers, setClarifyingAnswers] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [recentChats, setRecentChats] = useState([]);
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [currentChatId, setCurrentChatId] = useState(null);
  const [creditBalance, setCreditBalance] = useState({
    plan: userLoadData?.plan || 'guest',
    credits_balance: userLoadData?.credits_balance ?? 0,
    credits_max: userLoadData?.credits_max ?? 0,
    next_refill_at: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showIndividualChats, setShowIndividualChats] = useState(false);
  const [showIndividualDocs, setShowIndividualDocs] = useState(false);
  const [typingPlaceholder, setTypingPlaceholder] = useState('');
  const [documentEditValue, setDocumentEditValue] = useState('');
  const [composerMode, setComposerMode] = useState('edit');
  const currentChatIdRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const requestInFlightRef = useRef(false);
  const [refillCountdown, setRefillCountdown] = useState(null);
  const refillTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  const userName = userLoadData?.name || 'Guest';
  const userEmail = userLoadData?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();
  const isGuest = userLoadData?.is_guest ?? true;
  const suggestions = getRotatingSuggestions();

  useEffect(() => {
    if (phase !== 'idle') {
      setTypingPlaceholder('');
      return;
    }

    let timeoutId;
    let currentSuggestionIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;

    const typingSuggestions = [
      'Build a SaaS platform for freelancers...',
      'Create a mobile app that generates SOWs...',
      'Design a healthtech appointment booking app...',
      'Build an internal HR tool for onboarding...',
      'Create an e-commerce returns platform...',
    ];

    const type = () => {
      const currentSuggestion = typingSuggestions[currentSuggestionIndex];

      if (isDeleting) {
        setTypingPlaceholder(currentSuggestion.substring(0, currentCharIndex - 1));
        currentCharIndex--;
      } else {
        setTypingPlaceholder(currentSuggestion.substring(0, currentCharIndex + 1));
        currentCharIndex++;
      }

      let typingSpeed = isDeleting ? 25 : 60;

      if (!isDeleting && currentCharIndex === currentSuggestion.length) {
        typingSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && currentCharIndex === 0) {
        isDeleting = false;
        currentSuggestionIndex = (currentSuggestionIndex + 1) % typingSuggestions.length;
        typingSpeed = 400;
      }

      timeoutId = setTimeout(type, typingSpeed);
    };

    timeoutId = setTimeout(type, 1000);

    return () => clearTimeout(timeoutId);
  }, [phase]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const cleanChatTitle = (value) => {
    const text = String(value || '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'New chat';
  };

  const loadRecentChats = async () => {
    try {
      const res = await fetch(`${API}/chat/sessions`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const payload = await res.json();
      setRecentChats(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
    }
  };

  const ensureChatSession = async (title) => {
    if (currentChatIdRef.current) return currentChatIdRef.current;

    const res = await fetch(`${API}/chat/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'New chat' }),
    });
    if (!res.ok) return null;

    const session = await res.json();
    currentChatIdRef.current = session.id;
    setCurrentChatId(session.id);
    navigate(`/dashboard/${session.id}`);
    await loadRecentChats();
    return session.id;
  };

  const saveMessage = (role, content, meta) => {
    if (meta?.typing) return;
    if (!['user', 'assistant', 'error'].includes(role)) return;

    // Use a queue to ensure messages are saved sequentially and prevent race conditions
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        const titleSource = meta?.document?.title || content;
        const sessionId = await ensureChatSession(cleanChatTitle(titleSource).slice(0, 60));
        if (!sessionId) return;

        await fetch(`${API}/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            content,
            metadata: meta || null,
          }),
        });
        await loadRecentChats();
      } catch (error) {
        console.error("Failed to save message:", error);
      }
    });
  };

  const addMessage = (role, content, meta) => {
    setMessages((prev) => [...prev, { role, content, meta, id: Date.now() + Math.random() }]);
    saveMessage(role, content, meta);
  };

  const documentDownloadUrl = (document) => {
    if (!document?.download_url) return '#';
    return document.download_url.startsWith('http')
      ? document.download_url
      : `${API}${document.download_url}`;
  };

  const formatApiError = (payload, fallback) => {
    const detail = payload?.detail;
    if (detail?.error === 'insufficient_credits') {
      setShowCreditsModal(true);
      return `You've run out of credits.`;
    }
    if (typeof detail === 'string') return detail;
    return fallback;
  };

  const deleteRequest = async (path, fallbackMessage) => {
    let res = await fetch(`${API}${path}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.status === 405 && !path.endsWith('/')) {
      res = await fetch(`${API}${path}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }

    if (!res.ok) {
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      throw new Error(formatApiError(payload, fallbackMessage));
    }
  };

  const loadCreditBalance = async () => {
    try {
      const res = await fetch(`${API}/credits/balance`, { credentials: 'include' });
      if (!res.ok) return;
      const payload = await res.json();
      setCreditBalance(payload);
      if (payload.next_refill_at) {
        startRefillTimer(payload.next_refill_at);
      } else {
        stopRefillTimer();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startRefillTimer = (nextRefillAt) => {
    if (refillTimerRef.current) clearInterval(refillTimerRef.current);
    if (!nextRefillAt) {
      setRefillCountdown(null);
      return;
    }

    const update = () => {
      const now = new Date().getTime();
      const target = new Date(nextRefillAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setRefillCountdown('Refreshing...');
        if (refillTimerRef.current) clearInterval(refillTimerRef.current);
        loadCreditBalance(); // Refresh balance when timer hits zero
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setRefillCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    update();
    refillTimerRef.current = setInterval(update, 1000);
  };

  const stopRefillTimer = () => {
    if (refillTimerRef.current) {
      clearInterval(refillTimerRef.current);
      refillTimerRef.current = null;
    }
    setRefillCountdown(null);
  };

  const loadSettings = async () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
    if (isGuest) {
      setShowLogin(true);
      return;
    }

    try {
      const res = await fetch(`${API}/settings`, { credentials: 'include' });
      if (!res.ok) throw new Error(formatApiError(await res.json(), 'Failed to load settings'));
      const data = await res.json();
      setSettingsData(data);
      if (data.next_refill_at) {
        startRefillTimer(data.next_refill_at);
      }
      setShowSettings(true);
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    }
  };

  const saveSettingsSection = async (section, payload) => {
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API}/settings/${section}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responsePayload = await res.json();
      if (!res.ok) throw new Error(formatApiError(responsePayload, 'Failed to save settings'));
      setSettingsData(responsePayload.settings);
      await loadCreditBalance();
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleClearChats = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all your chat history?')) return;
    try {
      await deleteRequest('/chat/sessions', 'Failed to clear chats');
      setRecentChats([]);
      if (!currentDocument) resetConversation();
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    }
  };

  const handleClearDocuments = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all your generated documents?')) return;
    try {
      await deleteRequest('/documents', 'Failed to clear documents');
      setRecentDocuments([]);
      if (currentDocument) resetConversation();
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    }
  };

  const handleDeleteSpecificChat = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;
    try {
      await deleteRequest(`/chat/sessions/${id}`, 'Failed to delete chat');
      setRecentChats((prev) => prev.filter((chat) => chat.id !== id));
      if (currentChatId === id) resetConversation();
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    }
  };

  const handleDeleteSpecificDoc = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteRequest(`/documents/${id}`, 'Failed to delete document');
      setRecentDocuments((prev) => prev.filter((doc) => doc.id !== id));
      if (currentDocument?.id === id) resetConversation();
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/settings/account`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete account');
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${API}/auth/logout`;
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      addMessage('error', `❌ ${error.message}`);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');
    
    if (passwordForm.newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityError('New passwords do not match');
      return;
    }
    
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API}/auth/security/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: passwordForm.oldPassword || null,
          new_password: passwordForm.newPassword
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update password');
      
      setSecuritySuccess('Password updated successfully');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setSecurityError(error.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetConversation = () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
    setMessages([]);
    setPhase('idle');
    setClarifyingQuestions([]);
    setClarifyingIndex(0);
    setSelectedDocType(null);
    setCurrentBrief(null);
    setClarifyingAnswers([]);
    setActiveDocuments([]);
    setCurrentDocument(null);
    setDocumentEditValue('');
    setComposerMode('edit');
    currentChatIdRef.current = null;
    setCurrentChatId(null);
  };

  const startDocumentChat = (document) => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
    currentChatIdRef.current = document.chat_session_id || null;
    setCurrentChatId(document.chat_session_id || null);
    setMessages([]);
    setActiveDocuments([document]);
    setCurrentDocument(document);
    setDocumentEditValue('');
    setComposerMode('edit');
    setPhase('done');
    setClarifyingQuestions([]);
    setClarifyingIndex(0);
    setSelectedDocType(null);
    setCurrentBrief(null);
    setClarifyingAnswers([]);

    addMessage(
      'assistant',
      `Loaded ${document.title}. Tell me what you'd like to change, or keep chatting with Clariva.`,
      { document }
    );
  };

  const loadRecentDocuments = async () => {
    try {
      const res = await fetch(`${API}/documents`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const payload = await res.json();
      setRecentDocuments(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
    }
  };

  const getDocumentsFromMessages = (items) => {
    const seen = new Map();
    for (const item of items) {
      const document = item?.meta?.document;
      if (document?.id) {
        seen.set(document.id, document);
      }
    }
    return Array.from(seen.values());
  };

  const detectDocumentTypeFromText = (text) => {
    const lc = String(text || '').toLowerCase();
    if (lc.includes('sow') || lc.includes('statement of work')) return 'SOW';
    if (lc.includes('prd') || lc.includes('product requirements')) return 'PRD';
    return null;
  };

  const chooseDocumentTarget = (documents, text, fallbackDocument = null) => {
    if (!Array.isArray(documents) || !documents.length) return fallbackDocument;

    const requestedType = detectDocumentTypeFromText(text);
    if (requestedType) {
      const matched = documents.find((doc) => doc.type === requestedType);
      if (matched) return matched;
    }

    if (fallbackDocument?.id) {
      const exact = documents.find((doc) => doc.id === fallbackDocument.id);
      if (exact) return exact;
    }

    return documents[documents.length - 1];
  };

  const setDocumentTarget = (documentId) => {
    const nextDocument = activeDocuments.find((doc) => doc.id === documentId);
    if (!nextDocument) return;
    setCurrentDocument(nextDocument);
    setComposerMode('edit');
  };

  const loadChatSession = async (sessionId, preferredDocumentId = null) => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
    try {
      if (sessionId !== currentChatIdRef.current) {
        navigate(`/dashboard/${sessionId}`);
      }
      const res = await fetch(`${API}/chat/sessions/${sessionId}`, {
        credentials: 'include',
      });
      if (!res.ok) return;

      const payload = await res.json();
      const loadedMessages = (payload.messages || []).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        meta: msg.metadata || undefined,
      }));
      const documents = getDocumentsFromMessages(loadedMessages);
      const latestDocumentMessage = [...loadedMessages].reverse().find((msg) => msg.meta?.document);
      const preferredDocument = preferredDocumentId
        ? documents.find((doc) => doc.id === preferredDocumentId) || null
        : null;
      const defaultDocument = preferredDocument || latestDocumentMessage?.meta?.document || null;

      currentChatIdRef.current = payload.id;
      setCurrentChatId(payload.id);
      setMessages(loadedMessages);
      setActiveDocuments(documents);
      setCurrentDocument(defaultDocument);
      setDocumentEditValue('');
      setComposerMode(defaultDocument ? 'edit' : 'chat');
      setPhase(defaultDocument ? 'done' : 'idle');
      setClarifyingQuestions([]);
      setClarifyingIndex(0);
      setSelectedDocType(null);
      setCurrentBrief(null);
      setClarifyingAnswers([]);
    } catch (error) {
      console.error(error);
    }
  };

  const isLikelyRevisionInstruction = (text) => {
    const lc = text.toLowerCase();
    return [
      'add ', 'remove ', 'change ', 'update ', 'revise ', 'rewrite ', 'make it',
      'make this', 'edit ', 'replace ', 'shorten', 'expand', 'include ',
      'delete ', 'regenerate', 'modify ', 'fix ', 'turn it into'
    ].some((token) => lc.includes(token));
  };

  const sendGeneralChat = async (text) => {
    addMessage('assistant', 'Thinking…', { typing: true });
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(`${API}/chat/message`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history }),
    });

    setMessages((prev) => prev.filter((m) => !m.meta?.typing));

    if (!res.ok) {
      throw new Error(formatApiError(await res.json(), 'Failed to chat with Clariva'));
    }

    const payload = await res.json();
    addMessage('assistant', payload.reply || 'I am here.');
  };

  const getRequestedDocType = (text) => {
    const lc = text.toLowerCase();
    if (lc.includes('both') || (lc.includes('prd') && lc.includes('sow'))) return 'BOTH';
    if (lc.includes('prd') || lc.includes('product req')) return 'PRD';
    if (lc.includes('sow') || lc.includes('statement of work')) return 'SOW';
    return null;
  };

  const getBriefProductLabel = (briefData) => {
    const productType = briefData?.product_type;
    if (!productType) return 'New chat';
    if (typeof productType === 'string') return cleanChatTitle(productType);
    if (typeof productType === 'object' && productType.value) {
      return cleanChatTitle(productType.value);
    }
    return 'New chat';
  };

  const isDocTypeOnlyInput = (text) => {
    const cleaned = text.trim().toLowerCase().replace(/[.?!]/g, '');
    return ['prd', 'sow', 'both', 'sow and prd', 'prd and sow', 'product requirements document', 'statement of work'].includes(cleaned);
  };

  const formatDocGenerationStart = (docType) => {
    if (docType === 'BOTH') {
      return 'Great, I\'ll prepare both a **Statement of Work (SOW)** and a **Product Requirements Document (PRD)**. First, describe your product idea in a few lines: who it is for, what problem it solves, and the key features.';
    }
    if (docType === 'SOW') {
      return '📄 Great, I\'ll prepare a **Statement of Work (SOW)**. First, describe your product idea in a few lines: who it is for, what problem it solves, and the key features.';
    }
    if (docType === 'PRD') {
      return '📋 Great, I\'ll prepare a **Product Requirements Document (PRD)**. First, describe your product idea in a few lines: who it is for, what problem it solves, and the key features.';
    }
    return 'Great. Please describe your product idea in a few lines so I can start.';
  };

  const generateSowDocument = async ({ briefData, answersData }) => {
    if (!briefData) {
      addMessage('error', '❌ I need a product brief before I can generate the SOW.');
      return;
    }

    let sowOutline = [];
    if (Array.isArray(answersData) && answersData.length > 0) {
      const outlineRes = await fetch(`${API}/documents/outline`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefData,
          answers: answersData,
        }),
      });

      if (outlineRes.ok) {
        const outlinePayload = await outlineRes.json();
        sowOutline = Array.isArray(outlinePayload.sow_outline) ? outlinePayload.sow_outline : [];
      }
    }

    const chatSessionId = await ensureChatSession(`${getBriefProductLabel(briefData)} SOW`.slice(0, 60));

    const compileRes = await fetch(`${API}/documents/sow/compile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        answers: Array.isArray(answersData) ? answersData : [],
        sow_outline: sowOutline,
        chat_session_id: chatSessionId,
      }),
    });

    if (!compileRes.ok) {
      throw new Error(formatApiError(await compileRes.json(), 'Failed to generate SOW'));
    }

    const compilePayload = await compileRes.json();
    const document = compilePayload.document;

    if (!document) {
      addMessage('assistant', 'I generated the SOW content, but the document file was not created.');
      return;
    }

    setActiveDocuments([document]);
    setCurrentDocument(document);
    setDocumentEditValue('');
    setComposerMode('edit');
    addMessage('assistant', `Your ${document.type} is ready to download. You can keep chatting to request edits.`, { document });
    await loadRecentDocuments();
    await loadCreditBalance();
  };

  const generatePrdDocument = async ({ briefData, answersData }) => {
    if (!briefData) {
      addMessage('error', 'I need a product brief before I can generate the PRD.');
      return;
    }

    let prdOutline = [];
    if (Array.isArray(answersData) && answersData.length > 0) {
      const outlineRes = await fetch(`${API}/documents/outline`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefData,
          answers: answersData,
        }),
      });

      if (outlineRes.ok) {
        const outlinePayload = await outlineRes.json();
        prdOutline = Array.isArray(outlinePayload.prd_outline) ? outlinePayload.prd_outline : [];
      }
    }

    const chatSessionId = await ensureChatSession(`${getBriefProductLabel(briefData)} PRD`.slice(0, 60));

    const compileRes = await fetch(`${API}/documents/prd/compile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        answers: Array.isArray(answersData) ? answersData : [],
        prd_outline: prdOutline,
        chat_session_id: chatSessionId,
      }),
    });

    if (!compileRes.ok) {
      throw new Error(formatApiError(await compileRes.json(), 'Failed to generate PRD'));
    }

    const compilePayload = await compileRes.json();
    const document = compilePayload.document;

    if (!document) {
      addMessage('assistant', 'I generated the PRD content, but the document file was not created.');
      return;
    }

    setCurrentDocument(document);
    setDocumentEditValue('');
    setComposerMode('edit');
    addMessage('assistant', `Your ${document.type} is ready to download. You can keep chatting to request edits.`, { document });
    await loadRecentDocuments();
    await loadCreditBalance();
  };

  const generateBothDocuments = async ({ briefData, answersData }) => {
    if (!briefData) {
      addMessage('error', 'I need a product brief before I can generate both documents.');
      return;
    }

    let sowOutline = [];
    let prdOutline = [];
    if (Array.isArray(answersData) && answersData.length > 0) {
      const outlineRes = await fetch(`${API}/documents/outline`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefData,
          answers: answersData,
        }),
      });

      if (outlineRes.ok) {
        const outlinePayload = await outlineRes.json();
        sowOutline = Array.isArray(outlinePayload.sow_outline) ? outlinePayload.sow_outline : [];
        prdOutline = Array.isArray(outlinePayload.prd_outline) ? outlinePayload.prd_outline : [];
      }
    }

    const chatSessionId = await ensureChatSession(`${getBriefProductLabel(briefData)} docs`.slice(0, 60));

    const compileRes = await fetch(`${API}/documents/both/compile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        answers: Array.isArray(answersData) ? answersData : [],
        sow_outline: sowOutline,
        prd_outline: prdOutline,
        chat_session_id: chatSessionId,
      }),
    });

    if (!compileRes.ok) {
      throw new Error(formatApiError(await compileRes.json(), 'Failed to generate documents'));
    }

    const compilePayload = await compileRes.json();
    const documents = Array.isArray(compilePayload.documents) ? compilePayload.documents : [];

    if (!documents.length) {
      addMessage('assistant', 'I generated the bundle request, but no document files were returned.');
      return;
    }

    setActiveDocuments(documents);
    setCurrentDocument(chooseDocumentTarget(documents, selectedDocType || '', documents[documents.length - 1]));
    setDocumentEditValue('');
    setComposerMode('edit');
    documents.forEach((document) => {
      addMessage('assistant', `Your ${document.type} is ready to download. You can keep chatting to request edits.`, { document });
    });
    await loadRecentDocuments();
    await loadCreditBalance();
  };

  const reviseCurrentDocument = async (instruction, explicitDocument = null) => {
    const targetDocument = chooseDocumentTarget(activeDocuments, instruction, explicitDocument || currentDocument);
    if (!targetDocument?.id) {
      addMessage('assistant', 'I can make edits after a document has been generated.');
      return;
    }

    setCurrentDocument(targetDocument);
    addMessage('assistant', `Updating **${targetDocument.title}**…`, { typing: true });

    const res = await fetch(`${API}/documents/${targetDocument.id}/edit`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction }),
    });

    setMessages((prev) => prev.filter((m) => !m.meta?.typing));

    if (!res.ok) {
      throw new Error(formatApiError(await res.json(), 'Failed to revise document'));
    }

    const payload = await res.json();
    const updatedDocument = payload.document;
    if (!updatedDocument) {
      throw new Error('The document was revised, but no download file was returned');
    }
    setActiveDocuments((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const index = next.findIndex((doc) => doc.id === updatedDocument.id);
      if (index >= 0) {
        next[index] = updatedDocument;
      } else {
        next.push(updatedDocument);
      }
      return next;
    });
    setCurrentDocument(updatedDocument);
    setDocumentEditValue('');
    addMessage(
      'assistant',
      payload.message || `Updated ${updatedDocument.type} document is ready to download.`,
      { document: updatedDocument }
    );
    await loadRecentDocuments();
    await loadCreditBalance();
  };

  const handleDocumentEditSubmit = async () => {
    const instruction = documentEditValue.trim();
    if (!instruction || loading || requestInFlightRef.current || !currentDocument?.id) return;

    addMessage('user', instruction);
    setDocumentEditValue('');
    setLoading(true);
    requestInFlightRef.current = true;

    try {
      await reviseCurrentDocument(instruction);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => !m.meta?.typing));
      addMessage('error', `âŒ ${err.message}`);
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
      loadCreditBalance();
    }
  };

  const handleComposerSendInDoneState = async (text) => {
    addMessage('user', text);
    try {
      if (composerMode === 'chat') {
        await sendGeneralChat(text);
      } else {
        await reviseCurrentDocument(text, currentDocument);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => !m.meta?.typing));
      addMessage('error', `âŒ ${err.message}`);
    } finally {
      loadCreditBalance();
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || loading || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setInputValue('');
    setLoading(true);
    
    // Auto-focus immediately after clear
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setTimeout(() => textareaRef.current.focus(), 10);
    }

    try {
    if (phase === 'idle') {
      if (isDocTypeOnlyInput(text)) {
        const requestedType = getRequestedDocType(text);
        addMessage('user', text);
        setSelectedDocType(requestedType);
        setCurrentBrief(null);
        setClarifyingAnswers([]);
        addMessage('assistant', formatDocGenerationStart(requestedType));
        requestInFlightRef.current = false;
        setLoading(false);
        return;
      }

      // Step 1: Dynamic routing (general chat vs document generation)
      addMessage('user', text);
      addMessage('assistant', '⏳ Analysing your idea…', { typing: true });

      try {
        const history = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));

        const messageForRouting = selectedDocType
          ? `Document type: ${selectedDocType}. Product idea: ${text}`
          : text;

        const res = await fetch(`${API}/chat/message`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageForRouting, history }),
        });

        if (res.status === 401) {
          setShowLogin(true);
          requestInFlightRef.current = false;
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(formatApiError(await res.json(), 'Something went wrong'));
        }

        const payload = await res.json();

        // Remove typing indicator, replace with real response
        setMessages((prev) => prev.filter((m) => !m.meta?.typing));

        if (payload.intent === 'general_chat') {
          addMessage('assistant', payload.reply || 'I\'m here and ready to help.');
          loadCreditBalance(); // Update credits
          requestInFlightRef.current = false;
          setLoading(false);
          return;
        }

        if (payload.metadata?.selected_doc_type) {
          setSelectedDocType(payload.metadata.selected_doc_type);
        }

        const resolvedDocType = payload.metadata?.selected_doc_type || selectedDocType;

        const newBrief = payload.brief;
        if (!newBrief) {
          addMessage('assistant', payload.reply || 'Please share a bit more about your product idea so I can continue.');
          if (payload.metadata?.phase === 'awaiting_idea') {
            setPhase('idle');
          }
          requestInFlightRef.current = false;
          setLoading(false);
          return;
        }

        setCurrentBrief(newBrief);
        setClarifyingAnswers([]);

        const summary = [
          `I've analysed your idea. Here's what I've gathered:`,
          '',
          `📦 **Product type:** ${toDisplayText(newBrief.product_type)}`,
          `🎯 **Target audience:** ${toDisplayText(newBrief.target_audience)}`,
          `🔑 **Core problem:** ${toDisplayText(newBrief.core_problem)}`,
          `⚙️ **Complexity:** ${toDisplayText(newBrief.estimated_complexity)}`,
        ].join('\n');

        addMessage('assistant', summary);

        if (payload.questions?.length) {
          setClarifyingQuestions(payload.questions);
          setClarifyingIndex(0);
          setPhase('clarifying');
          addMessage('assistant', payload.questions[0]);
        } else {
          if (resolvedDocType === 'SOW') {
            setPhase('done');
            addMessage('assistant', '📄 Generating your **Statement of Work (SOW)**… This usually takes a few seconds.');
            await generateSowDocument({ briefData: newBrief, answersData: [] });
          } else if (resolvedDocType === 'PRD') {
            setPhase('done');
            addMessage('assistant', '📋 Generating your **Product Requirements Document (PRD)**… Hold tight!');
            await generatePrdDocument({ briefData: newBrief, answersData: [] });
          } else if (resolvedDocType === 'BOTH') {
            setPhase('done');
            addMessage('assistant', 'Generating both your **SOW** and **PRD**. This can take a little longer.');
            await generateBothDocuments({ briefData: newBrief, answersData: [] });
          } else {
            setPhase('choose_type');
            addMessage('assistant', 'I have enough context. What format would you like me to generate: **SOW**, **PRD**, or **both**?');
          }
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => !m.meta?.typing));
        addMessage('error', `❌ ${err.message}`);
      }

    } else if (phase === 'clarifying') {
      // Step 2: Ask clarifying questions one by one
      addMessage('user', text);

      const userWantsToContinue = ['continue', 'skip', 'next', 'done'].some((token) =>
        text.toLowerCase().includes(token)
      );

      const currentQuestion = clarifyingQuestions[clarifyingIndex];
      let nextAnswers = clarifyingAnswers;
      if (!userWantsToContinue && currentQuestion) {
        const answerItem = { question: currentQuestion, answer: text };
        nextAnswers = [...clarifyingAnswers, answerItem];
        setClarifyingAnswers(nextAnswers);
      }

      const nextIndex = clarifyingIndex + 1;
      const hasMoreQuestions = nextIndex < clarifyingQuestions.length;

      if (!userWantsToContinue && hasMoreQuestions) {
        setClarifyingIndex(nextIndex);
        addMessage('assistant', clarifyingQuestions[nextIndex]);
      } else {
        if (selectedDocType === 'SOW') {
          setPhase('done');
          addMessage('assistant', '📄 Generating your **Statement of Work (SOW)**… This usually takes a few seconds.');
          await generateSowDocument({ briefData: currentBrief, answersData: nextAnswers });
        } else if (selectedDocType === 'PRD') {
          setPhase('done');
          addMessage('assistant', '📋 Generating your **Product Requirements Document (PRD)**… Hold tight!');
          await generatePrdDocument({ briefData: currentBrief, answersData: nextAnswers });
        } else if (selectedDocType === 'BOTH') {
          setPhase('done');
          addMessage('assistant', 'Generating both your **SOW** and **PRD**. This can take a little longer.');
          await generateBothDocuments({ briefData: currentBrief, answersData: nextAnswers });
        } else {
          setPhase('choose_type');
          addMessage('assistant', 'Thanks, that helps. What format would you like me to generate: **SOW**, **PRD**, or **both**?');
        }
      }

    } else if (phase === 'choose_type') {
      // Step 3: User picks SOW or PRD
      addMessage('user', text);
      const lc = text.toLowerCase();
      if (lc.includes('both') || (lc.includes('sow') && lc.includes('prd'))) {
        setSelectedDocType('BOTH');
        addMessage('assistant', 'Generating both your **SOW** and **PRD**. This can take a little longer.');
        setPhase('done');
        await generateBothDocuments({ briefData: currentBrief, answersData: clarifyingAnswers });
      } else if (lc.includes('sow') || lc.includes('statement')) {
        setSelectedDocType('SOW');
        addMessage('assistant', '📄 Generating your **Statement of Work (SOW)**… This usually takes a few seconds.');
        setPhase('done');
        await generateSowDocument({ briefData: currentBrief, answersData: clarifyingAnswers });
      } else if (lc.includes('prd') || lc.includes('product req')) {
        setSelectedDocType('PRD');
        addMessage('assistant', '📋 Generating your **Product Requirements Document (PRD)**… Hold tight!');
        setPhase('done');
        await generatePrdDocument({ briefData: currentBrief, answersData: clarifyingAnswers });
      } else {
        addMessage('assistant', 'Please confirm: do you want a **SOW**, **PRD**, or **both**?');
      }
    } else if (phase === 'done') {
      await handleComposerSendInDoneState(text);
      return;
      addMessage('user', text);
      try {
        if ((currentDocument?.id || activeDocuments.length) && isLikelyRevisionInstruction(text)) {
          await reviseCurrentDocument(text);
        } else {
          await sendGeneralChat(text);
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => !m.meta?.typing));
        addMessage('error', `❌ ${err.message}`);
      } finally {
        loadCreditBalance(); // Always update balance after a message attempt
      }
    }
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  // Scroll to top on mount (full page refresh)
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    loadRecentDocuments();
    loadRecentChats();
    loadCreditBalance();
  }, []);

  // Sync state with URL sessionId
  useEffect(() => {
    if (sessionId && sessionId !== currentChatId) {
      loadChatSession(sessionId);
    } else if (!sessionId && currentChatId) {
      // If user clears the URL but we have a chat open, maybe reset?
      // For now, just keep it.
    }
  }, [sessionId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0 && mainRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' || lastMessage.role === 'error') {
        mainRef.current.scrollTo({
          top: mainRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else if (lastMessage.role === 'user') {
        // User messages can also scroll to bottom but maybe more instantly
        mainRef.current.scrollTo({
          top: mainRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-mobile-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && (
            <Link to="/" className="sidebar-logo-link">
              <Logo className="sidebar-logo" style={{ width: '100px', height: 'auto' }} />
            </Link>
          )}
          {isGuest && sidebarOpen && (
            <div className="sidebar-guest-nav" style={{padding: '0 16px', marginBottom: '16px'}}>
              <Link to="/" className="recent-item">Home</Link>
              <Link to="/login" className="recent-item">Login</Link>
            </div>
          )}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Collapse' : 'Expand'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>
        </div>

        <button className={`new-doc-btn ${sidebarOpen ? '' : 'collapsed'}`} onClick={resetConversation} title="New Document">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {sidebarOpen && <span>New Document</span>}
        </button>

        <div className="sidebar-scroll-area">
          {sidebarOpen ? (
            <>
              <div className="sidebar-tabs">
                <button 
                  className={`sidebar-tab ${sidebarView === 'chats' ? 'active' : ''}`}
                  onClick={() => setSidebarView('chats')}
                >
                  Chats
                </button>
                <button 
                  className={`sidebar-tab ${sidebarView === 'documents' ? 'active' : ''}`}
                  onClick={() => setSidebarView('documents')}
                >
                  Documents
                </button>
              </div>

              {sidebarView === 'chats' ? (
                <div className="sidebar-section">
                  {recentChats.length ? (
                    <div className="recent-list">
                      {recentChats.slice(0, 8).map((chat) => (
                        <button
                          key={chat.id}
                          className={`recent-item${chat.id === currentChatId ? ' recent-item-active' : ''}`}
                          type="button"
                          onClick={() => loadChatSession(chat.id)}
                          title={chat.title}
                        >
                          {chat.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="sidebar-empty">No chats yet.</p>
                  )}
                </div>
              ) : (
                <div className="sidebar-section">
                  {recentDocuments.length ? (
                    <div className="recent-list">
                      {recentDocuments.slice(0, 8).map((doc) => (
                        <button
                          key={doc.id}
                          className="recent-item"
                          type="button"
                          onClick={() => {
                            const loadedDocument = {
                              ...doc,
                              download_url: `/documents/${doc.id}/download`,
                            };
                            if (loadedDocument.chat_session_id) {
                              loadChatSession(loadedDocument.chat_session_id, loadedDocument.id);
                            } else {
                              startDocumentChat(loadedDocument);
                            }
                          }}
                          title={doc.title}
                        >
                          {doc.type}: {doc.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="sidebar-empty">No documents yet. Start building!</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="sidebar-collapsed-nav">
              <button className={`collapsed-nav-icon ${sidebarView === 'chats' ? 'active' : ''}`} title="Chats" onClick={() => { setSidebarView('chats'); setSidebarOpen(true); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </button>
              <button className={`collapsed-nav-icon ${sidebarView === 'documents' ? 'active' : ''}`} title="Documents" onClick={() => { setSidebarView('documents'); setSidebarOpen(true); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className={`sidebar-profile-card ${profileMenuOpen ? 'profile-menu-active' : ''}`}>
            {profileMenuOpen && (
              <div className="profile-dropdown-menu">
                <button className="dropdown-item" onClick={() => { setProfileMenuOpen(false); loadSettings(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  Settings
                </button>
                <div className="dropdown-divider"></div>
                <form method="POST" action={`${API}/auth/logout`} className="dropdown-item dropdown-logout" style={{ margin: 0, padding: 0 }}>
                  <button type="submit" className="dropdown-item dropdown-logout" style={{ width: '100%' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </form>
              </div>
            )}

            {sidebarOpen ? (
              <button className="profile-card-btn" onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
                <div className="profile-card-avatar">{userInitial}</div>
                <div className="profile-card-info">
                  <div className="profile-card-name">{userName}</div>
                  <div className="profile-card-email">{userEmail}</div>
                </div>
                <svg className={`profile-chevron ${profileMenuOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ) : (
              <button className="collapsed-profile-btn" onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(prev => !prev); }} title="Profile">
                <div className="profile-card-avatar">{userInitial}</div>
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="dashboard-main" onClick={() => { if(profileMenuOpen) setProfileMenuOpen(false); }}>
        <header className="dashboard-header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            {isGuest && (
              <div className="guest-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="guest-banner-text">Guest session — your work won't be saved.</span>
                <Link to="/login" className="guest-signin-link">Sign in to save</Link>
              </div>
            )}
          </div>
          <div className="header-spacer"></div>
          {(() => {
            const ratio = creditBalance.credits_max > 0 ? creditBalance.credits_balance / creditBalance.credits_max : 0;
            const healthClass = ratio > 0.5 ? 'credit-healthy' : ratio > 0.2 ? 'credit-warning' : 'credit-critical';
            return (
              <div className={`credit-pill ${healthClass}`}>
                <span>Credits:</span>
                <strong>{creditBalance.credits_balance}/{creditBalance.credits_max}</strong>
              </div>
            );
          })()}
        </header>

        <div className={`dashboard-content${isEmpty ? ' dashboard-content-empty' : ''}`} ref={mainRef}>
          {/* EMPTY STATE — everything centered as a unit */}
          {isEmpty && (
            <div className="centered-state">
              <div className="greeting-wrapper">
                <h1 className="dashboard-greeting">{getGreeting()}, {userName}</h1>
                <p className="dashboard-prompt">Describe your product idea and I'll generate a professional SOW or PRD.</p>
              </div>

              <div className="intake-wrapper">
                <div className="intake-container">
                  <textarea
                    ref={textareaRef}
                    className="intake-textarea"
                    placeholder={window.innerWidth < 768 ? "Describe your idea..." : (typingPlaceholder || "Describe your idea...")}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                  ></textarea>
                  <div className="intake-footer">
                    <span className="intake-hint">{inputValue.length > 0 ? 'Shift+Enter for new line · Enter to send' : ''}</span>
                    <button
                      className={`submit-idea-btn${inputValue.trim() && !loading ? '' : ' submit-disabled'}`}
                      disabled={!inputValue.trim() || loading}
                      onClick={handleSend}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="suggestions-grid">
                  {suggestions.map((text, i) => (
                    <div key={i} className="suggestion-card" onClick={() => setInputValue(text)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, marginTop:'2px'}}>
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CHAT STATE — messages fill top, input anchors bottom */}
          {!isEmpty && (
            <>
              {currentDocument && (
                <div className="document-edit-panel">
                  <div className="document-edit-panel-copy">
                    <span className="document-edit-panel-label">Active document</span>
                    <strong>{currentDocument.title}</strong>
                    <p>Keep chatting below, or send a direct edit instruction here for a faster revision pass.</p>
                    {activeDocuments.length > 1 && (
                      <div className="document-target-switcher">
                        {activeDocuments.map((document) => (
                          <button
                            key={document.id}
                            type="button"
                            className={`document-target-chip${currentDocument?.id === document.id ? ' active' : ''}`}
                            onClick={() => setDocumentTarget(document.id)}
                          >
                            {document.type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="document-edit-panel-controls">
                    <textarea
                      className="document-edit-textarea"
                      placeholder={`What should Clariva change in ${currentDocument.title}?`}
                      rows={2}
                      value={documentEditValue}
                      onChange={(e) => setDocumentEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleDocumentEditSubmit();
                        }
                      }}
                    ></textarea>
                    <button
                      type="button"
                      className={`document-edit-submit${documentEditValue.trim() && !loading ? '' : ' submit-disabled'}`}
                      disabled={!documentEditValue.trim() || loading}
                      onClick={handleDocumentEditSubmit}
                    >
                      Update document
                    </button>
                  </div>
                </div>
              )}

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble chat-bubble-${msg.role}`}>
                    <div className={`bubble-avatar bubble-avatar-${msg.role === 'user' ? 'user' : 'ai'}`}>
                      {msg.role === 'user' ? userInitial : 'C'}
                    </div>
                    <div className="bubble-body">
                      {msg.meta?.document ? (
                        <div className="document-card">
                          <div className="document-card-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <line x1="10" y1="9" x2="8" y2="9"/>
                            </svg>
                          </div>
                          <div className="document-card-body">
                            <span className="document-card-label">{msg.meta.document.type} document</span>
                            <h3>{msg.meta.document.title}</h3>
                            <p>{msg.content}</p>
                          </div>
                          <a
                            className="document-download-btn"
                            href={documentDownloadUrl(msg.meta.document)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download DOCX
                          </a>
                        </div>
                      ) : msg.content.split('\n').map((line, i) => (
                        <p key={i} className={line === '' ? 'bubble-spacer' : ''}>
                          {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="chat-bubble chat-bubble-assistant">
                    <div className="bubble-avatar bubble-avatar-ai">C</div>
                    <div className="bubble-body">
                      <div className="typing-dots"><span/><span/><span/></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="intake-wrapper intake-wrapper-bottom">
                <div className="intake-container">
                  {phase === 'done' && currentDocument && (
                    <div className="composer-mode-bar">
                      <button
                        type="button"
                        className={`composer-mode-chip${composerMode === 'edit' ? ' active' : ''}`}
                        onClick={() => setComposerMode('edit')}
                      >
                        Edit {currentDocument.type}
                      </button>
                      <button
                        type="button"
                        className={`composer-mode-chip${composerMode === 'chat' ? ' active' : ''}`}
                        onClick={() => setComposerMode('chat')}
                      >
                        General chat
                      </button>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    className="intake-textarea"
                    placeholder={
                      phase === 'clarifying' ? 'Answer this question, or type "continue" to move on…'
                      : phase === 'choose_type' ? 'Type SOW, PRD, or both…'
                      : phase === 'done' && currentDocument
                        ? (composerMode === 'edit'
                          ? `Describe the change you want in ${currentDocument.title}...`
                          : 'Ask Clariva something about this project...')
                        : (window.innerWidth < 768 ? 'Describe your idea...' : (typingPlaceholder || 'Ask Clariva something...'))
                    }
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                  ></textarea>
                  <div className="intake-footer">
                    <span className="intake-hint">{inputValue.length > 0 ? 'Shift+Enter for new line · Enter to send' : ''}</span>
                    <button
                      className={`submit-idea-btn${inputValue.trim() && !loading ? '' : ' submit-disabled'}`}
                      disabled={!inputValue.trim() || loading}
                      onClick={handleSend}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <CreditsModal 
        isOpen={showCreditsModal} 
        onClose={() => setShowCreditsModal(false)}
        balance={creditBalance.credits_balance}
        max={creditBalance.credits_max}
        nextRefill={creditBalance.next_refill_at}
        refillCountdown={refillCountdown}
        plan={creditBalance.plan}
      />
      {showSettings && settingsData && (
        <div className="modal-overlay">
          <div className="settings-modal">
            <div className="settings-modal-header">
              <div>
                <h2>Settings</h2>
                <p>Profile details help Clariva tailor generated documents.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => { stopRefillTimer(); setShowSettings(false); }}>×</button>
            </div>

            <div className="settings-grid">
              <section className="settings-section-card">
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Credits & Usage
                </h3>
                <div className="settings-credits-container">
                  <div className="settings-credits-row">
                    <div className="settings-credits-info">
                      <span className="settings-credits-label">Available Balance</span>
                      <span className="settings-credits-value">
                        {settingsData.credits_balance} / {settingsData.credits_max}
                      </span>
                    </div>
                    {refillCountdown ? (
                      <div className="settings-credits-timer">
                        <span className="settings-timer-label">Next Refill In</span>
                        <span className="settings-timer-value">{refillCountdown}</span>
                      </div>
                    ) : (
                      settingsData.credits_balance >= settingsData.credits_max && (
                        <div className="settings-credit-full">
                          Balance Full
                        </div>
                      )
                    )}
                  </div>
                  <div className="settings-credits-progress">
                    <div 
                      className="settings-credits-bar" 
                      style={{ width: `${Math.min(100, (settingsData.credits_balance / settingsData.credits_max) * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="settings-credit-note">
                  Credits are automatically replenished based on your plan. 
                  {settingsData.plan === 'pro' ? ' You are on the Pro plan (25 credits every 2h).' : 
                   settingsData.plan === 'free' ? ' You are on the Free plan (10 credits every 4h).' : 
                   ' Guest sessions receive 10 credits every 30m.'}
                </p>
              </section>

              <section className="settings-section-card">
                <h3>Account Information</h3>
                <label>
                  Display Name
                  <input value={settingsData.display_name || ''} onChange={(e) => setSettingsData({ ...settingsData, display_name: e.target.value })} />
                </label>
                <label>
                  Email Address
                  <input value={settingsData.email || ''} readOnly className="input-readonly" />
                </label>
                <label>
                  Account Created
                  <input value={new Date(settingsData.created_at).toLocaleDateString()} readOnly className="input-readonly" />
                </label>
                <button
                  className="settings-save-btn"
                  disabled={settingsSaving}
                  onClick={() => saveSettingsSection('profile', {
                    display_name: settingsData.display_name,
                    company_name: settingsData.company_name,
                    role: settingsData.role,
                    industry: settingsData.industry,
                  })}
                >
                  Save Account Info
                </button>
              </section>

              <section className="settings-section-card">
                <h3>Preferences</h3>
                <label>
                  Default output
                  <select value={settingsData.default_output} onChange={(e) => setSettingsData({ ...settingsData, default_output: e.target.value })}>
                    <option value="both">Both</option>
                    <option value="sow">SOW only</option>
                    <option value="prd">PRD only</option>
                  </select>
                </label>
                <label>
                  Tone
                  <select value={settingsData.preferred_tone} onChange={(e) => setSettingsData({ ...settingsData, preferred_tone: e.target.value })}>
                    <option value="formal">Formal</option>
                    <option value="conversational">Conversational</option>
                  </select>
                </label>
                <label>
                  Export format
                  <select value={settingsData.export_format} onChange={(e) => setSettingsData({ ...settingsData, export_format: e.target.value })}>
                    <option value="docx">DOCX</option>
                  </select>
                </label>
                <button
                  className="settings-save-btn"
                  disabled={settingsSaving}
                  onClick={() => saveSettingsSection('preferences', {
                    default_output: settingsData.default_output,
                    preferred_tone: settingsData.preferred_tone,
                    export_format: settingsData.export_format,
                  })}
                >
                  Save preferences
                </button>
              </section>

              <section className="settings-section-card">
                <h3>Security</h3>
                <p className="settings-section-desc">
                  {settingsData.hashed_password ? 'Update your account password.' : 'Set a password for your account to enable email/password login.'}
                </p>
                <div className="settings-password-form">
                  {settingsData.hashed_password && (
                    <label>
                      Current Password
                      <input 
                        type="password" 
                        value={passwordForm.oldPassword} 
                        onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                        placeholder="••••••••"
                      />
                    </label>
                  )}
                  <label>
                    New Password
                    <input 
                      type="password" 
                      value={passwordForm.newPassword} 
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      placeholder="Min. 8 characters"
                    />
                  </label>
                  <label>
                    Confirm New Password
                    <input 
                      type="password" 
                      value={passwordForm.confirmPassword} 
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                    />
                  </label>
                  
                  {securityError && <p className="settings-error-msg" style={{color: '#f87171', fontSize: '12px', marginTop: '8px'}}>{securityError}</p>}
                  {securitySuccess && <p className="settings-success-msg" style={{color: '#4ade80', fontSize: '12px', marginTop: '8px'}}>{securitySuccess}</p>}
                  
                  <button 
                    type="button" 
                    className="settings-save-btn" 
                    disabled={settingsSaving}
                    onClick={handleUpdatePassword}
                    style={{marginTop: '16px'}}
                  >
                    {settingsSaving ? 'Saving...' : (settingsData.hashed_password ? 'Update Password' : 'Set Password')}
                  </button>
                </div>
              </section>

              <section className="settings-section-card settings-danger-card">
                <h3>Data Management</h3>
                <p className="settings-danger-desc">Manage your workspace data.</p>
                
                <div className="settings-danger-actions">
                  <button type="button" className="settings-danger-btn" onClick={handleClearChats}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Delete All Chats
                  </button>
                  <button type="button" className="settings-danger-btn" onClick={handleClearDocuments}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Delete All Docs
                  </button>
                </div>

                <div className="settings-individual-delete">
                  <button type="button" className="settings-toggle-btn" onClick={() => setShowIndividualChats(!showIndividualChats)}>
                    {showIndividualChats ? 'Hide Chats ▲' : 'Show Chats ▼'}
                  </button>
                  {showIndividualChats && (
                    <div className="settings-item-list">
                      {recentChats.map((chat) => (
                        <div key={chat.id} className="settings-item-row">
                          <span className="settings-item-title" title={chat.title}>{chat.title}</span>
                          <button type="button" className="settings-trash-btn" onClick={() => handleDeleteSpecificChat(chat.id)} title="Delete Chat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      ))}
                      {recentChats.length === 0 && <p className="settings-empty">No chats to display.</p>}
                    </div>
                  )}

                  <button type="button" className="settings-toggle-btn" onClick={() => setShowIndividualDocs(!showIndividualDocs)}>
                    {showIndividualDocs ? 'Hide Docs ▲' : 'Show Docs ▼'}
                  </button>
                  {showIndividualDocs && (
                    <div className="settings-item-list">
                      {recentDocuments.map((doc) => (
                        <div key={doc.id} className="settings-item-row">
                          <span className="settings-item-title" title={doc.title}>{doc.type}: {doc.title}</span>
                          <button type="button" className="settings-trash-btn" onClick={() => handleDeleteSpecificDoc(doc.id)} title="Delete Document">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      ))}
                      {recentDocuments.length === 0 && <p className="settings-empty">No documents to display.</p>}
                    </div>
                  )}
                </div>
              </section>

              <section className="settings-section-card">
                <h3>Help & Support</h3>
                <div className="settings-support-links">
                  <Link to="/docs" className="settings-support-link">Documentation</Link>
                  <a href="#" className="settings-support-link">Contact Support</a>
                  <a href="#" className="settings-support-link">Send Feedback</a>
                </div>
              </section>

              <section className="settings-section-card settings-danger-card">
                <h3>Danger Zone</h3>
                <p className="settings-danger-desc">Permanently delete your account and all data.</p>
                <div className="settings-danger-actions">
                  <button type="button" className="settings-danger-btn" onClick={handleDeleteAccount}>
                    Delete Account
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
