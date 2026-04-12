"use client";

import React from 'react';
import { User } from '@/types/discord';
import { Leaf, Sparkles, TreePine, Menu } from 'lucide-react';

interface ShopViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

export const ShopView = ({ currentUser, onToggleSidebar }: ShopViewProps) => {
  return (
    <div className="flex-1 flex flex-col bg-[#2b2d31] relative overflow-hidden h-full min-w-0">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#2b2d31] z-10 flex-shrink-0">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <Leaf className="mr-2 text-[#23a559]" size={20} />
          Cardi E-Shop
        </div>
        <div className="flex items-center bg-[#1e1f22] px-3 py-1 rounded-full border border-[#23a559]/30 shadow-inner">
          <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 mr-2 object-contain" />
          <span className="text-[#23a559] font-bold">{currentUser?.digitalcardus || 0}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
        {/* Nature Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#23a559]/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#23a559]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 h-full flex flex-col">
          <div className="text-center mb-12 mt-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#23a559] to-emerald-400 mb-4 flex items-center justify-center drop-shadow-sm">
              <Sparkles className="mr-3 text-[#23a559]" />
              Benvenuto nel Cardi E-Shop
              <Sparkles className="ml-3 text-emerald-400" />
            </h1>
            <p className="text-[#dbdee1] text-lg max-w-2xl mx-auto font-medium">
              Usa i tuoi Digitalcardus per acquistare oggetti esclusivi, ruoli speciali e molto altro. La natura offre i suoi frutti migliori a chi sa aspettare.
            </p>
          </div>

          <div className="bg-[#1e1f22]/80 backdrop-blur-md border border-[#23a559]/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-2xl flex-1 min-h-[300px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#23a559]/20 blur-xl rounded-full"></div>
              <div className="w-24 h-24 bg-[#2b2d31] rounded-full flex items-center justify-center border-2 border-[#23a559]/30 relative z-10 shadow-inner">
                <TreePine className="text-[#23a559] w-12 h-12" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Lo shop è attualmente vuoto</h2>
            <p className="text-[#949ba4] max-w-md">
              I folletti stanno ancora piantando i semi per i nuovi oggetti. Torna più tardi per scoprire i frutti del loro lavoro!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};