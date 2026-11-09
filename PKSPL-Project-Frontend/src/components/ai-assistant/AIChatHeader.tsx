import React from 'react';
import { Sparkles, Plus, History, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface AIChatHeaderProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  onClose: () => void;
  isHistoryOpen: boolean;
  isConnected: boolean;
  modelName?: string;
}

export const AIChatHeader: React.FC<AIChatHeaderProps> = ({
  onNewChat,
  onToggleHistory,
  onClose,
  isHistoryOpen,
  isConnected,
  modelName = 'Gemini 2.5 Flash',
}) => {
  return (
    <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 select-none shadow-2xs">
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-teal-500/20">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
              PKSPL AI Assistant
            </h3>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
              RAG
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
            {isConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-700 font-medium">Terhubung</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 truncate">{modelName}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span className="text-amber-700 font-medium">Memeriksa koneksi</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          className="p-1.5 sm:px-2 sm:py-1 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
          title="Percakapan Baru"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Baru</span>
        </button>

        {/* Conversation History Toggle */}
        <button
          type="button"
          onClick={onToggleHistory}
          className={`p-1.5 sm:px-2 sm:py-1 rounded-xl border transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer ${
            isHistoryOpen
              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
              : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50 border-slate-200 hover:border-teal-200'
          }`}
          title="Riwayat Percakapan"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">Riwayat</span>
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-0.5"
          title="Tutup Asisten AI"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AIChatHeader;
