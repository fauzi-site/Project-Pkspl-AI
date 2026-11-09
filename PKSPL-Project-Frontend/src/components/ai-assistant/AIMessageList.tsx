import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { AIMessageBubble, ChatMessageItem } from './AIMessageBubble';
import { AIWelcomeScreen } from './AIWelcomeScreen';

interface AIMessageListProps {
  messages: ChatMessageItem[];
  isLoading: boolean;
  userName?: string;
  projectName?: string;
  onSelectPrompt: (prompt: string) => void;
}

export const AIMessageList: React.FC<AIMessageListProps> = ({
  messages,
  isLoading,
  userName,
  projectName,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new message or loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col justify-center">
        <AIWelcomeScreen
          userName={userName}
          projectName={projectName}
          onSelectPrompt={onSelectPrompt}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1">
      {messages.map((msg) => (
        <AIMessageBubble key={msg.id} message={msg} />
      ))}

      {/* Loading Skeleton / Pulse indicator */}
      {isLoading && (
        <div className="flex justify-start gap-2.5 my-3 animate-fade-in">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs shadow-teal-500/20">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs max-w-[85%]">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"></span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                ></span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                ></span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                AI sedang memeriksa database & menganalisis...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default AIMessageList;
