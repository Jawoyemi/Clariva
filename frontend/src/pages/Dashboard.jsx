import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData } from 'react-router-dom';
import '../index.css';
import Logo from '../Logo';
import LoginModal from '../LoginModal';

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

const API = 'http://localhost:8000';

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
const Dashboard = () => {
  const userLoadData = useLoaderData();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const [currentDocument, setCurrentDocument] = useState(null);
  const [recentChats, setRecentChats] = useState([]);
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
  const currentChatIdRef = useRef(null);
  const requestInFlightRef = useRef(false);

  const userName = userLoadData?.name || 'Guest';
  const userInitial = userName.charAt(0).toUpperCase();
  const isGuest = userLoadData?.is_guest ?? true;
  const suggestions = getRotatingSuggestions();

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
    await loadRecentChats();
    return session.id;
  };

  const saveMessage = async (role, content, meta) => {
    if (meta?.typing) return;
    if (!['user', 'assistant', 'error'].includes(role)) return;

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
      console.error(error);
    }
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
      const refill = detail.next_refill_at
        ? ` Next refill: ${new Date(detail.next_refill_at).toLocaleString()}.`
        : '';
      return `Insufficient credits. You have ${detail.balance}, but this needs ${detail.required}.${refill}`;
    }
    if (typeof detail === 'string') return detail;
    return fallback;
  };

  const loadCreditBalance = async () => {
    try {
      const res = await fetch(`${API}/credits/balance`, { credentials: 'include' });
      if (!res.ok) return;
      const payload = await res.json();
      setCreditBalance(payload);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSettings = async () => {
    if (isGuest) {
      setShowLogin(true);
      return;
    }

    try {
      const res = await fetch(`${API}/settings`, { credentials: 'include' });
      if (!res.ok) throw new Error(formatApiError(await res.json(), 'Failed to load settings'));
      setSettingsData(await res.json());
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

  const resetConversation = () => {
    setMessages([]);
    setPhase('idle');
    setClarifyingQuestions([]);
    setClarifyingIndex(0);
    setSelectedDocType(null);
    setCurrentBrief(null);
    setClarifyingAnswers([]);
    setCurrentDocument(null);
    currentChatIdRef.current = null;
    setCurrentChatId(null);
  };

  const startDocumentChat = (document) => {
    currentChatIdRef.current = null;
    setCurrentChatId(null);
    setMessages([]);
    setCurrentDocument(document);
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

  const loadChatSession = async (sessionId) => {
    try {
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
      const latestDocumentMessage = [...loadedMessages].reverse().find((msg) => msg.meta?.document);

      currentChatIdRef.current = payload.id;
      setCurrentChatId(payload.id);
      setMessages(loadedMessages);
      setCurrentDocument(latestDocumentMessage?.meta?.document || null);
      setPhase(latestDocumentMessage?.meta?.document ? 'done' : 'idle');
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
      throw new Error((await res.json()).detail || 'Failed to chat with Clariva');
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

    const compileRes = await fetch(`${API}/documents/sow/compile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        answers: Array.isArray(answersData) ? answersData : [],
        sow_outline: sowOutline,
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

    setCurrentDocument(document);
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

    const compileRes = await fetch(`${API}/documents/prd/compile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        answers: Array.isArray(answersData) ? answersData : [],
        prd_outline: prdOutline,
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

    const compileRes = await fetch(`${API}/documents/both/compile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        answers: Array.isArray(answersData) ? answersData : [],
        sow_outline: sowOutline,
        prd_outline: prdOutline,
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

    setCurrentDocument(documents[documents.length - 1]);
    documents.forEach((document) => {
      addMessage('assistant', `Your ${document.type} is ready to download. You can keep chatting to request edits.`, { document });
    });
    await loadRecentDocuments();
    await loadCreditBalance();
  };

  const reviseCurrentDocument = async (instruction) => {
    if (!currentDocument?.id) {
      addMessage('assistant', 'I can make edits after a document has been generated.');
      return;
    }

    addMessage('assistant', `Updating **${currentDocument.title}**…`, { typing: true });

    const res = await fetch(`${API}/documents/${currentDocument.id}/revise`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction }),
    });

    setMessages((prev) => prev.filter((m) => !m.meta?.typing));

    if (!res.ok) {
      throw new Error((await res.json()).detail || 'Failed to revise document');
    }

    const payload = await res.json();
    const updatedDocument = payload.document;
    if (!updatedDocument) {
      throw new Error('The document was revised, but no download file was returned');
    }
    setCurrentDocument(updatedDocument);
    addMessage(
      'assistant',
      payload.message || `Updated ${updatedDocument.type} document is ready to download.`,
      { document: updatedDocument }
    );
    await loadRecentDocuments();
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || loading || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setInputValue('');
    setLoading(true);

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
        if (!res.ok) throw new Error((await res.json()).detail || 'Something went wrong');

        const payload = await res.json();

        // Remove typing indicator, replace with real response
        setMessages((prev) => prev.filter((m) => !m.meta?.typing));

        if (payload.intent === 'general_chat') {
          addMessage('assistant', payload.reply || 'I\'m here and ready to help.');
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
      addMessage('user', text);
      try {
        if (currentDocument?.id && isLikelyRevisionInstruction(text)) {
          await reviseCurrentDocument(text);
        } else {
          await sendGeneralChat(text);
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => !m.meta?.typing));
        addMessage('error', `❌ ${err.message}`);
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
      {/* Sidebar */}
      <aside className={`dashboard-sidebar${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && <Logo className="sidebar-logo" style={{ width: '100px', height: 'auto' }} />}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Collapse' : 'Expand'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>
        </div>

        {sidebarOpen && (
          <>
            <button className="new-doc-btn" onClick={resetConversation}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Document
            </button>
            <div className="sidebar-section">
              <h4 className="sidebar-subtitle">Recent Chats</h4>
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
            <div className="sidebar-section">
              <h4 className="sidebar-subtitle">Recent Documents</h4>
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
                        startDocumentChat(loadedDocument);
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
          </>
        )}

        <div className="sidebar-bottom">
          <form method="POST" action={`${API}/auth/logout`}>
            <button type="submit" className={`logout-btn${sidebarOpen ? '' : ' logout-btn-collapsed'}`} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {sidebarOpen && <span>Logout</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main" ref={mainRef}>
        <header className="dashboard-header">
          {isGuest && (
            <div className="guest-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Guest session — your work won't be saved.
              <button className="guest-signin-link" onClick={() => setShowLogin(true)}>Sign in to save →</button>
            </div>
          )}
          <div className="header-spacer"></div>
          <div className="credit-pill" title={creditBalance.next_refill_at ? `Next refill: ${new Date(creditBalance.next_refill_at).toLocaleString()}` : 'Credits'}>
            <span>{creditBalance.plan}</span>
            <strong>{creditBalance.credits_balance}/{creditBalance.credits_max}</strong>
          </div>
          <div className="user-profile">
            <button className="avatar avatar-button" type="button" onClick={loadSettings} title="Settings">
              {userInitial}
            </button>
          </div>
        </header>

        <div className={`dashboard-content${isEmpty ? ' dashboard-content-empty' : ''}`}>
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
                    className="intake-textarea"
                    placeholder="Describe the product you want to document…"
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
                  <textarea
                    className="intake-textarea"
                    placeholder={
                      phase === 'clarifying' ? 'Answer this question, or type "continue" to move on…'
                      : phase === 'choose_type' ? 'Type SOW, PRD, or both…'
                      : 'Chat with Clariva…'
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
      {showSettings && settingsData && (
        <div className="modal-overlay">
          <div className="settings-modal">
            <div className="settings-modal-header">
              <div>
                <h2>Settings</h2>
                <p>Profile details help Clariva tailor generated documents.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowSettings(false)}>×</button>
            </div>

            <div className="settings-grid">
              <section className="settings-section-card">
                <h3>Profile</h3>
                <label>
                  Display name
                  <input value={settingsData.display_name || ''} onChange={(e) => setSettingsData({ ...settingsData, display_name: e.target.value })} />
                </label>
                <label>
                  Company
                  <input value={settingsData.company_name || ''} onChange={(e) => setSettingsData({ ...settingsData, company_name: e.target.value })} />
                </label>
                <label>
                  Role
                  <input value={settingsData.role || ''} onChange={(e) => setSettingsData({ ...settingsData, role: e.target.value })} />
                </label>
                <label>
                  Industry
                  <input value={settingsData.industry || ''} onChange={(e) => setSettingsData({ ...settingsData, industry: e.target.value })} />
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
                  Save profile
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
                    <option value="pdf">PDF</option>
                    <option value="markdown">Markdown</option>
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

              <section className="settings-section-card settings-usage-card">
                <h3>Usage</h3>
                <div className="usage-stat">
                  <span>Current plan</span>
                  <strong>{settingsData.plan}</strong>
                </div>
                <div className="usage-stat">
                  <span>Credits</span>
                  <strong>{settingsData.credits_balance}/{settingsData.credits_max}</strong>
                </div>
                <div className="usage-stat">
                  <span>Next refill</span>
                  <strong>{settingsData.next_refill_at ? new Date(settingsData.next_refill_at).toLocaleString() : 'Full or not available'}</strong>
                </div>
                {settingsData.plan === 'free' && <button className="settings-secondary-btn">Upgrade</button>}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
