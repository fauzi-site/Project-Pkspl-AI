import React, { useState } from 'react';
import { User, Sparkles, Copy, Check, AlertCircle, Percent, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { AIMarkdownRenderer } from './AIMarkdownRenderer';
import { AIReferenceCard } from './AIReferenceCard';
import { AIReference } from '../../services/aiAssistantService';

export interface ChatMessageItem {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  references?: AIReference[];
  confidence?: number;
  limitations?: string;
  databaseGrounded?: boolean;
  isError?: boolean;
  timestamp: string;
}

interface AIMessageBubbleProps {
  message: ChatMessageItem;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(true);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Gagal menyalin teks:', err);
    }
  };

  // Format Confidence Score badge
  const renderConfidenceBadge = (score?: number) => {
    if (score === undefined || score === null) return null;
    let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score < 60) {
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (score < 80) {
      badgeColor = 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }

    return (
      <span
        title={`Tingkat keyakinan model: ${score}%`}
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
      >
        <Percent className="w-2.5 h-2.5" />
        <span>Keyakinan {score}%</span>
      </span>
    );
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 my-3 group">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-xs sm:text-sm leading-relaxed break-words font-sans">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 mr-1">
            {message.timestamp}
          </span>
        </div>
        <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  // Assistant Bubble
  return (
    <div className="flex justify-start gap-2.5 my-3 group animate-fade-in">
      {/* Bot Avatar */}
      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs shadow-teal-500/20">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      <div className="flex flex-col items-start max-w-[90%] sm:max-w-[85%] min-w-0">
        {/* Main Bubble Box */}
        <div
          className={`w-full rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs border text-slate-800 ${
            message.isError
              ? 'bg-rose-50/80 border-rose-200 text-rose-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Header Bar inside Bubble: Badges & Copy button */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-800">PKSPL AI</span>
              {renderConfidenceBadge(message.confidence)}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title={copied ? 'Tersalin!' : 'Salin Jawaban'}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Optional Executive Summary Box */}
          {message.summary && (
            <div className="mb-2.5 p-2 rounded-xl bg-teal-50/70 border border-teal-100 text-xs">
              <button
                type="button"
                onClick={() => setShowSummary((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-teal-800 cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-teal-600" />
                  <span>Ringkasan Eksekutif</span>
                </span>
                {showSummary ? (
                  <ChevronUp className="w-3 h-3 text-teal-600" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-teal-600" />
                )}
              </button>
              {showSummary && (
                <p className="mt-1 text-[11px] text-teal-900 leading-relaxed font-sans">
                  {message.summary}
                </p>
              )}
            </div>
          )}

          {/* Main Answer Content (Rendered Markdown) */}
          {message.isError ? (
            <div className="flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{message.content}</span>
            </div>
          ) : (
            <AIMarkdownRenderer content={message.content} />
          )}

          {/* Grounding Reference Cards */}
          {message.references && message.references.length > 0 && (
            <AIReferenceCard
              references={message.references}
              databaseGrounded={message.databaseGrounded}
            />
          )}

          {/* Limitations Note (if any) */}
          {message.limitations && (
            <p className="mt-2 text-[10px] text-slate-400 italic font-sans border-t border-slate-100 pt-1.5">
              Catatan: {message.limitations}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-slate-400 mt-1 ml-1">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
};

export default AIMessageBubble;
