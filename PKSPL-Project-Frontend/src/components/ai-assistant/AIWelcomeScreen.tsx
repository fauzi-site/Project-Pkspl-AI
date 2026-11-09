import React from 'react';
import { Sparkles, HelpCircle, ArrowUpRight, ShieldCheck, Database } from 'lucide-react';

interface AIWelcomeScreenProps {
  userName?: string;
  projectName?: string;
  onSelectPrompt: (prompt: string) => void;
}

export const AIWelcomeScreen: React.FC<AIWelcomeScreenProps> = ({
  userName,
  projectName,
  onSelectPrompt,
}) => {
  const samplePrompts = [
    {
      title: 'Konsep Dasar TEV',
      prompt: 'Jelaskan konsep Total Economic Value (TEV) pada valuasi ekonomi pesisir.',
      desc: 'Nilai guna langsung, tidak langsung, dan pilihan.',
    },
    {
      title: 'Perbandingan CVM & TCM',
      prompt: 'Apa perbedaan mendasar antara metode Contingent Valuation Method (CVM) dan Travel Cost Method (TCM)?',
      desc: 'WTP vs Biaya Perjalanan pada ekosistem pesisir.',
    },
    {
      title: 'Valuasi Ekosistem Mangrove',
      prompt: 'Bagaimana cara dan rumus menghitung nilai ekonomi ekosistem mangrove?',
      desc: 'Penyerap karbon, pelindung abrasi, dan perikanan.',
    },
    ...(projectName
      ? [
          {
            title: `Valuasi ${projectName}`,
            prompt: `Jelaskan hasil valuasi dan data ekosistem pada proyek ${projectName}.`,
            desc: 'Analisis berbasis data riil proyek yang sedang aktif.',
          },
        ]
      : [
          {
            title: 'Metode Valuasi PKSPL',
            prompt: 'Apa saja metode valuasi yang didukung oleh sistem valuasi ekonomi PKSPL IPB?',
            desc: 'Daftar metode standar dan penerapannya.',
          },
        ]),
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center my-auto animate-fade-in select-none">
      {/* Bot Icon with glowing halo */}
      <div className="relative mb-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 ring-4 ring-teal-50">
          <Sparkles className="w-7 h-7" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
        </span>
      </div>

      {/* Greeting */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
        {userName ? `Halo, ${userName}!` : 'Selamat Datang di PKSPL AI!'}
      </h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
        Asisten Cerdas Valuasi Ekonomi Sumberdaya Pesisir & Lautan terintegrasi dengan Google Gemini dan basis data riset PKSPL IPB.
      </p>

      {/* Grounding Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
          <Database className="w-3 h-3 text-teal-600" />
          <span>PostgreSQL tafauzi</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Controlled RAG</span>
        </span>
      </div>

      {/* Prompt Suggestion Cards */}
      <div className="w-full text-left space-y-2 max-w-md">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 px-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Contoh Pertanyaan yang Bisa Anda Ajukan:</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {samplePrompts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/40 hover:border-teal-300 text-left transition-all duration-200 shadow-xs hover:shadow-sm cursor-pointer flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                  {item.title}
                </span>
                <span className="block text-[11px] text-slate-500 truncate mt-0.5">
                  {item.desc}
                </span>
              </div>
              <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-teal-600 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIWelcomeScreen;
