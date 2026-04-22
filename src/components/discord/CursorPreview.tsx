import React from 'react';

export const CursorPreview = ({ id }: { id: string }) => {
  switch (id) {
    case 'cursor-neon':
      return (
        <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.2)] mb-1.5 relative">
          <div className="absolute inset-0 bg-[#39ff14]/10 rounded-full animate-ping opacity-50"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#111214" stroke="#39ff14" strokeWidth="2" className="drop-shadow-[0_0_5px_#39ff14] animate-pulse relative z-10">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </div>
      );
    case 'cursor-flame':
      return (
        <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-[#ff4500] shadow-[0_0_10px_rgba(255,69,0,0.2)] mb-1.5 relative overflow-hidden">
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#ff4500]/40 to-transparent animate-pulse"></div>
          <div className="absolute w-2 h-2 bg-orange-500 rounded-full blur-[1px] animate-[bounce_1s_infinite] bottom-2 left-2"></div>
          <div className="absolute w-1.5 h-1.5 bg-orange-400 rounded-full blur-[1px] animate-[bounce_1.5s_infinite] bottom-4 right-2"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff4500" stroke="#ff8c00" strokeWidth="2" className="drop-shadow-[0_0_5px_#ff4500] relative z-10">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </div>
      );
    case 'cursor-magic':
      return (
        <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.2)] mb-1.5 relative">
          <span className="absolute top-1 right-1 text-[10px] animate-[spin_2s_linear_infinite]">✨</span>
          <span className="absolute bottom-1 left-1 text-[8px] animate-[spin_3s_linear_infinite_reverse]">✨</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#a855f7" stroke="#d8b4fe" strokeWidth="2" className="drop-shadow-[0_0_5px_#a855f7]">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </div>
      );
    case 'cursor-sword':
      return (
        <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-[#cbd5e1] shadow-[0_0_10px_rgba(203,213,225,0.2)] mb-1.5 relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-blue-400/20 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#cbd5e1" stroke="#475569" strokeWidth="2" className="drop-shadow-[0_0_3px_#cbd5e1] group-hover:rotate-45 transition-transform duration-300">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </div>
      );
    case 'cursor-dragon':
      return (
        <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.2)] mb-1.5 relative">
          {/* Mini coda animata per l'anteprima */}
          <div className="absolute w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-400 border border-yellow-400 rounded-full -bottom-0 -right-0 shadow-[0_0_5px_#eab308] animate-[bounce_1s_infinite]"></div>
          <div className="absolute w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-400 border border-yellow-400 rounded-full -bottom-2 -right-2 shadow-[0_0_5px_#eab308] animate-[bounce_1s_infinite_0.2s]"></div>
          <div className="absolute w-1.5 h-1.5 bg-red-500 rounded-full -bottom-4 -right-4 shadow-[0_0_5px_#ef4444] animate-[bounce_1s_infinite_0.4s]"></div>
          
          <span className="text-2xl drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] relative z-10 -ml-1 -mt-1">🐲</span>
        </div>
      );
    default:
      return null;
  }
};