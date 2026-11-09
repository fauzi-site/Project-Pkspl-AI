import React, { useState } from 'react';
import { AIChatHeader } from './AIChatHeader';
import { AIMessageList } from './AIMessageList';
import { AIChatInput } from './AIChatInput';
import { AIConversationHistory } from './AIConversationHistory';
import { ChatMessageItem } from './AIMessageBubble';
import { AIConversationSummary } from '../../services/aiAssistantService';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessageItem[];
  isLoading: boolean;
  isConnected: boolean;
  userName?: string;
  activeProjectName?: string;
  pageContextName?: string;
  activeSessionId?: string | null;
  conversations: AIConversationSummary[];
  isHistoryLoading: boolean;
  onSendMessage: (text: string) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRefreshHistory: () => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isLoading,
  isConnected,
  userName,
  activeProjectName,
  pageContextName,
  activeSessionId,
  conversations,
  isHistoryLoading,
  onSendMessage,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRefreshHistory,
}) => {
  const [isHistoryView, setIsHistoryView] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for Mobile / Semi-dim on desktop if desired */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[9994] transition-opacity duration-300 md:bg-slate-900/15"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[460px] md:w-[480px] lg:w-[500px] bg-slate-50 border-l border-slate-200/80 shadow-2xl z-[9995] flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Panel Asisten AI PKSPL"
      >
        {/* Main Header */}
        <AIChatHeader
          onNewChat={() => {
            onNewChat();
            setIsHistoryView(false);
          }}
          onToggleHistory={() => setIsHistoryView((prev) => !prev)}
          onClose={onClose}
          isHistoryOpen={isHistoryView}
          isConnected={isConnected}
        />

        {/* Dynamic Body: Chat List or History List */}
        {isHistoryView ? (
          <AIConversationHistory
            conversations={conversations}
            activeSessionId={activeSessionId}
            isLoading={isHistoryLoading}
            onSelectSession={(sessionId) => {
              onSelectSession(sessionId);
              setIsHistoryView(false);
            }}
            onDeleteSession={onDeleteSession}
            onRefresh={onRefreshHistory}
            onClose={() => setIsHistoryView(false)}
          />
        ) : (
          <>
            <AIMessageList
              messages={messages}
              isLoading={isLoading}
              userName={userName}
              projectName={activeProjectName}
              onSelectPrompt={onSendMessage}
            />

            <AIChatInput
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              activeProjectName={activeProjectName}
              pageContextName={pageContextName}
            />
          </>
        )}
      </aside>
    </>
  );
};

export default AIChatDrawer;
