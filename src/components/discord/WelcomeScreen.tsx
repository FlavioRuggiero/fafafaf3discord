"use client";

import React from 'react';
import { User } from '@/types/discord';
import { Home } from 'lucide-react';

interface WelcomeScreenProps {
  currentUser: User;
}

export const WelcomeScreen = ({ currentUser }: WelcomeScreenProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] text-[#949ba4] h-full">
      <div className="w-24 h-24 bg-[#2b2d31] rounded-full flex items-center justify-center mb-6 shadow-lg">
        <Home size={48} className="text-brand" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Benvenuto, {currentUser.name}!</h1>
      <p className="max-w-md text-center text-[#b5bac1]">
        Seleziona un server o avvia una conversazione dalla barra laterale per iniziare.
      </p>
    </div>
  );
};