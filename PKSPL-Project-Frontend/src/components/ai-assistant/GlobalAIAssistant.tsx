import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../peneliti/context/ProjectContext';
import {
  aiAssistantService,
  AIGenerateResponse,
  AIConversationSummary,
  AIMessageDetail,
} from '../../services/aiAssistantService';
import { AIFloatingButton } from './AIFloatingButton';
import { AIChatDrawer } from './AIChatDrawer';
import { ChatMessageItem } from './AIMessageBubble';

const ACTIVE_SESSION_STORAGE_KEY = 'pkspl_ai_active_session_id';

// Helper to determine route / page context name
function resolvePageContext(pathname: string): { label: string; key: string } {
  if (pathname.includes('/maps')) return { label: 'Peta & Spasial Kawasan', key: 'maps' };
  if (pathname.includes('/index')) return { label: 'Indeks Nilai & Indikator', key: 'index' };
  if (pathname.includes('/data-master')) return { label: 'Data Master & Ekosistem', key: 'data-master' };
  if (pathname.includes('/services-methods') || pathname.includes('/jasa-metode'))
    return { label: 'Jasa Ekosistem & Metode Valuasi', key: 'services-methods' };
  if (pathname.includes('/valuation-data') || pathname.includes('/data-valuasi'))
    return { label: 'Input Data Valuasi & Survei', key: 'valuation-data' };
  if (pathname.includes('/calculation') || pathname.includes('/perhitungan'))
    return { label: 'Kalkulator TEV & Perhitungan Nilai', key: 'calculation' };
  if (pathname.includes('/analytics') || pathname.includes('/analitik'))
    return { label: 'Analisis & Visualisasi Statistik', key: 'analytics' };
  if (pathname.includes('/review')) return { label: 'Review Laporan & Kebijakan', key: 'review' };
  if (pathname.includes('/messages') || pathname.includes('/pesan'))
    return { label: 'Pusat Komunikasi Tim', key: 'messages' };
  if (pathname.startsWith('/peneliti/projects')) return { label: 'Daftar Portofolio Riset', key: 'project-list' };
  if (pathname.startsWith('/admin/dashboard')) return { label: 'Dashboard Eksekutif Admin', key: 'admin-dashboard' };
  if (pathname.startsWith('/admin/master-data')) return { label: 'Master Data Global PKSPL', key: 'admin-master-data' };
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/manajemen-pengguna'))
    return { label: 'Manajemen Pengguna Sistem', key: 'admin-users' };
  if (pathname.startsWith('/admin/projects')) return { label: 'Manajemen Program PKSPL', key: 'admin-projects' };
  if (pathname.startsWith('/admin/activity') || pathname.startsWith('/admin/riwayat-aktivitas'))
    return { label: 'Audit Log & Riwayat Aktivitas', key: 'admin-activity' };
  if (pathname.startsWith('/admin/verifikasi-data')) return { label: 'Verifikasi Data Valuasi', key: 'admin-verifikasi' };
  if (pathname.startsWith('/admin/kebijakan')) return { label: 'Rekomendasi Kebijakan PKSPL', key: 'admin-kebijakan' };

  return { label: 'Sistem Valuasi Ekonomi PKSPL', key: 'general' };
}

export const GlobalAIAssistant: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Try-catch safe ProjectContext lookup
  let projectCtx: any = null;
  try {
    projectCtx = useProject();
  } catch {
    projectCtx = null;
  }

  // State Management
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || null;
  });

  // History Conversations list
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // 1. Role Authorization Check
  // Allowed: Super Admin, Admin, Administrator, Peneliti
  // Hidden for: Guest, Unauthenticated, or Login/Register pages
  const userRole = (user as any)?.role?.nama_role || (user as any)?.role || '';
  const isAllowedRole = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    const normalized = String(userRole).toLowerCase();
    if (normalized.includes('guest') || normalized === '') return false;
    return (
      normalized.includes('admin') ||
      normalized.includes('peneliti') ||
      normalized.includes('researcher')
    );
  }, [isAuthenticated, user, userRole]);

  // Route Blacklist: Do not show on auth or standalone print pages
  const isExcludedRoute = useMemo(() => {
    const p = location.pathname;
    return (
      p === '/login' ||
      p === '/register' ||
      p === '/forgot-password' ||
      p === '/reset-password' ||
      p.startsWith('/auth/') ||
      p.includes('/preview') // Standalone print/PDF preview
    );
  }, [location.pathname]);

  // 2. Health Check on Mount
  useEffect(() => {
    if (!isAllowedRole || isExcludedRoute) return;

    let isMounted = true;
    aiAssistantService
      .checkHealth()
      .then((res) => {
        if (isMounted) {
          setIsConnected(res.success && res.status === 'connected');
        }
      })
      .catch(() => {
        if (isMounted) setIsConnected(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAllowedRole, isExcludedRoute]);

  // 3. Resolve Current Active Project & Page Context
  const activeProjectId = useMemo<number | null>(() => {
    // Check URL pattern: /peneliti/projects/:projectId/...
    const match = location.pathname.match(/\/projects\/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    // Fallback to ProjectContext activeProject
    if (projectCtx?.activeProject?.id) {
      const parsed = parseInt(String(projectCtx.activeProject.id), 10);
      return !isNaN(parsed) ? parsed : null;
    }
    return null;
  }, [location.pathname, projectCtx?.activeProject]);

  const activeProjectName = useMemo<string | undefined>(() => {
    if (projectCtx?.activeProject?.name) {
      return projectCtx.activeProject.name;
    }
    return undefined;
  }, [projectCtx?.activeProject]);

  const pageContext = useMemo(() => {
    return resolvePageContext(location.pathname);
  }, [location.pathname]);

  // 4. Fetch Conversations History
  const fetchConversations = useCallback(async () => {
    if (!isAllowedRole) return;
    setIsHistoryLoading(true);
    try {
      const list = await aiAssistantService.getConversations();
      setConversations(list);
    } catch (err) {
      console.warn('Gagal memuat percakapan AI:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [isAllowedRole]);

  // Load history when drawer opens
  useEffect(() => {
    if (isOpen && isAllowedRole) {
      fetchConversations();
    }
  }, [isOpen, isAllowedRole, fetchConversations]);

  // 5. New Chat Handler
  const handleNewChat = useCallback(() => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, newSessionId);
    setMessages([]);
  }, []);

  // 6. Select Previous Conversation
  const handleSelectSession = useCallback(async (selectedSessionId: string) => {
    setIsLoading(true);
    try {
      const historyMessages = await aiAssistantService.getConversationMessages(selectedSessionId);
      setSessionId(selectedSessionId);
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, selectedSessionId);

      // Convert AIMessageDetail into ChatMessageItem pairs (User prompt + AI response)
      const mapped: ChatMessageItem[] = [];
      historyMessages.forEach((item) => {
        const timeFormatted = item.created_at
          ? new Intl.DateTimeFormat('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(item.created_at))
          : 'Baru saja';

        // 1. User Message
        mapped.push({
          id: `u-${item.id_ai_history}`,
          role: 'user',
          content: item.prompt,
          timestamp: timeFormatted,
        });

        // 2. Assistant Message
        mapped.push({
          id: `a-${item.id_ai_history}`,
          role: 'assistant',
          content: item.answer,
          summary: item.summary,
          references: item.references || [],
          confidence: item.confidence,
          limitations: item.limitations,
          databaseGrounded: item.source === 'database_grounded' || (item.references && item.references.length > 0),
          timestamp: timeFormatted,
        });
      });

      setMessages(mapped);
    } catch (err: any) {
      console.error('Gagal mengambil sesi percakapan:', err);
      // Fallback: reset to clean session
      handleNewChat();
    } finally {
      setIsLoading(false);
    }
  }, [handleNewChat]);

  // 7. Delete Conversation
  const handleDeleteSession = useCallback(async (targetSessionId: string) => {
    try {
      await aiAssistantService.deleteConversation(targetSessionId);
      setConversations((prev) => prev.filter((c) => c.session_id !== targetSessionId));

      if (sessionId === targetSessionId) {
        handleNewChat();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus percakapan.');
    }
  }, [sessionId, handleNewChat]);

  // 8. Send Message to Backend AI Assistant
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const currentSession = sessionId || crypto.randomUUID();
    if (!sessionId) {
      setSessionId(currentSession);
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, currentSession);
    }

    const now = new Date();
    const timeFormatted = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    // Append User Message to UI
    const userMsg: ChatMessageItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: timeFormatted,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response: AIGenerateResponse = await aiAssistantService.generate({
        prompt: text,
        session_id: currentSession,
        id_proyek: activeProjectId,
        page_context: pageContext.key,
      });

      // Update session_id if backend normalized it
      if (response.session_id && response.session_id !== currentSession) {
        setSessionId(response.session_id);
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, response.session_id);
      }

      // Append Assistant Message to UI
      const assistantMsg: ChatMessageItem = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        summary: response.summary,
        references: response.references || [],
        confidence: response.confidence,
        limitations: response.limitations,
        databaseGrounded: response.database_grounded,
        timestamp: timeFormatted,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh history sidebar list in background
      fetchConversations();
    } catch (err: any) {
      // Append Error Message to UI
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: err.message || 'Mohon maaf, terjadi kendala saat menghubungi AI Assistant. Silakan periksa kembali beberapa saat lagi.',
        isError: true,
        timestamp: timeFormatted,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, activeProjectId, pageContext.key, fetchConversations]);

  // Early return if not permitted
  if (!isAllowedRole || isExcludedRoute) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <AIFloatingButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        hasActiveSession={Boolean(sessionId && messages.length > 0)}
      />

      {/* Slide-over Drawer Panel */}
      <AIChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        isLoading={isLoading}
        isConnected={isConnected}
        userName={(user as any)?.nama || (user as any)?.name}
        activeProjectName={activeProjectName}
        pageContextName={pageContext.label}
        activeSessionId={sessionId}
        conversations={conversations}
        isHistoryLoading={isHistoryLoading}
        onSendMessage={handleSendMessage}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRefreshHistory={fetchConversations}
      />
    </>
  );
};

export default GlobalAIAssistant;
