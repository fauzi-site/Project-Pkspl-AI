import React, { useState } from 'react';
import { MessageSquare, Trash2, ArrowLeft, Clock, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { AIConversationSummary } from '../../services/aiAssistantService';

interface AIConversationHistoryProps {
  conversations: AIConversationSummary[];
  activeSessionId?: string | null;
  isLoading: boolean;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRefresh: () => void;
  onClose: () => void;
}

export const AIConversationHistory: React.FC<AIConversationHistoryProps> = ({
  conversations,
  activeSessionId,
  isLoading,
  onSelectSession,
  onDeleteSession,
  onRefresh,
  onClose,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Hapus sesi percakapan ini secara permanen?')) return;

    setDeletingId(sessionId);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden select-none animate-fade-in">
      {/* Subheader */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Kembali ke obrolan"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800">Daftar Riwayat Percakapan</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Muat ulang riwayat"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
            <span className="text-xs">Memuat riwayat sesi...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-600">Belum Ada Riwayat Percakapan</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Mulai tanyakan analisis valuasi atau metode ekosistem pesisir untuk membuat percakapan pertama Anda.
            </p>
          </div>
        ) : (
          conversations.map((item) => {
            const isActive = activeSessionId === item.session_id;
            const isDeleting = deletingId === item.session_id;

            return (
              <div
                key={item.session_id}
                onClick={() => onSelectSession(item.session_id)}
                className={`group p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 shadow-2xs ${
                  isActive
                    ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
              >
                {/* Title & Delete button */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {item.title || item.latest_prompt || 'Percakapan AI'}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.session_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Hapus Percakapan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Latest summary or prompt */}
                <p className="text-[11px] text-slate-500 line-clamp-1 italic font-sans">
                  "{item.latest_summary || item.latest_prompt}"
                </p>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(item.created_at)}</span>
                    </span>
                    {item.message_count > 0 && (
                      <span className="bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded">
                        {item.message_count} pesan
                      </span>
                    )}
                  </div>

                  {item.proyek && (
                    <span className="font-mono text-[9px] text-teal-700 bg-teal-50 px-1 py-0.2 rounded truncate max-w-[120px]">
                      {item.proyek.kode_proyek || item.proyek.nama_proyek}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AIConversationHistory;
