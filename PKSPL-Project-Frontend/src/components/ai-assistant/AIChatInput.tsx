import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Sparkles } from 'lucide-react';

interface AIChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  activeProjectName?: string;
  pageContextName?: string;
}

export const AIChatInput: React.FC<AIChatInputProps> = ({
  onSendMessage,
  isLoading,
  activeProjectName,
  pageContextName,
}) => {
  const [input, setInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
      {/* Context Badge Pill (if inside active project or page) */}
      {(activeProjectName || pageContextName) && (
        <div className="flex items-center gap-1.5 mb-2 px-1 text-[10px] text-slate-500 overflow-hidden">
          <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
          <span className="font-semibold text-slate-700 shrink-0">Konteks:</span>
          {activeProjectName && (
            <span className="bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded truncate">
              {activeProjectName}
            </span>
          )}
          {pageContextName && (
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded truncate">
              {pageContextName}
            </span>
          )}
        </div>
      )}

      {/* Input Box */}
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 rounded-2xl p-1.5 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          placeholder="Tanyakan analisis valuasi, metode TEV, data survei..."
          className="flex-1 bg-transparent resize-none px-2.5 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-28 min-h-[38px] leading-relaxed disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={`p-2 rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center cursor-pointer ${
            input.trim() && !isLoading
              ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs shadow-teal-600/30 hover:scale-105 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          title="Kirim (Enter)"
        >
          <Send className="w-4 h-4 translate-x-[0.5px]" />
        </button>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1 select-none">
        <span className="flex items-center gap-1">
          <CornerDownLeft className="w-2.5 h-2.5" />
          <span>Enter kirim, Shift+Enter baris baru</span>
        </span>
        <span className="hidden sm:inline">Google Gemini 2.5 Flash</span>
      </div>
    </div>
  );
};

export default AIChatInput;
