import React from 'react';
import { Sparkles, X, MessageSquare } from 'lucide-react';

interface AIFloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasActiveSession?: boolean;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({
  isOpen,
  onClick,
  hasActiveSession,
}) => {
  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9993] select-none">
      <button
        type="button"
        onClick={onClick}
        aria-label={isOpen ? 'Tutup PKSPL AI Assistant' : 'Buka PKSPL AI Assistant'}
        title={isOpen ? 'Tutup AI Assistant' : 'Tanya PKSPL AI Assistant'}
        className={`group relative flex items-center justify-center rounded-2xl shadow-xl transition-all duration-300 ease-out cursor-pointer focus:outline-none focus:ring-4 focus:ring-teal-500/30 ${
          isOpen
            ? 'w-12 h-12 bg-slate-800 text-slate-200 hover:bg-slate-900 rotate-90 scale-95'
            : 'w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white hover:shadow-teal-500/30 hover:scale-105 active:scale-95'
        }`}
      >
        {/* Subtle Halo / Pulse Animation when closed */}
        {!isOpen && (
          <span className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 opacity-40 blur-xs group-hover:opacity-75 transition duration-500 -z-10 animate-pulse"></span>
        )}

        {/* Icon toggle */}
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-300" />
        ) : (
          <div className="flex items-center justify-center">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:rotate-12" />
          </div>
        )}

        {/* Online / Active Indicator Dot */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>
        )}

        {/* Floating Tooltip Bubble on Desktop */}
        {!isOpen && (
          <span className="absolute right-full mr-3.5 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden md:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Tanya PKSPL AI Assistant</span>
          </span>
        )}
      </button>
    </div>
  );
};

export default AIFloatingButton;
