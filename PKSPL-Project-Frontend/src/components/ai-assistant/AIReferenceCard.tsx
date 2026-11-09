import React, { useState } from 'react';
import { Database, BookOpen, Layers, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { AIReference } from '../../services/aiAssistantService';

interface AIReferenceCardProps {
  references: AIReference[];
  databaseGrounded?: boolean;
}

export const AIReferenceCard: React.FC<AIReferenceCardProps> = ({ references, databaseGrounded }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!references || references.length === 0) return null;

  const displayedRefs = isExpanded ? references : references.slice(0, 2);

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'database':
      case 'sql':
      case 'db_table':
        return <Database className="w-3 h-3 text-emerald-600" />;
      case 'method':
      case 'model':
        return <Layers className="w-3 h-3 text-cyan-600" />;
      default:
        return <BookOpen className="w-3 h-3 text-blue-600" />;
    }
  };

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'database':
      case 'sql':
      case 'db_table':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'method':
      case 'model':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-200/80">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <BookOpen className="w-3.5 h-3.5 text-teal-600" />
          <span>Sumber & Referensi ({references.length})</span>
          {databaseGrounded && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Database className="w-2.5 h-2.5" />
              <span>Database Terverifikasi</span>
            </span>
          )}
        </div>

        {references.length > 2 && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Sembunyikan</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>Lihat semua ({references.length})</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {displayedRefs.map((ref, idx) => (
          <div
            key={idx}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate">
                {getIconForType(ref.type)}
                <span className="truncate">{ref.title}</span>
              </div>
              {ref.type && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getBadgeStyle(
                    ref.type
                  )}`}
                >
                  {ref.type}
                </span>
              )}
            </div>

            {ref.snippet && (
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {ref.snippet}
              </p>
            )}

            {ref.source && (
              <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <span>Sumber:</span>
                <span className="text-slate-600 truncate">{ref.source}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIReferenceCard;
