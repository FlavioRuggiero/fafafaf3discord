import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface CustomAudioPlayerProps {
  src: string;
}

export const CustomAudioPlayer = ({ src }: CustomAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="flex items-center bg-[#2b2d31] rounded-md p-2 gap-3 w-full border border-[#1e1f22]"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button 
        onClick={togglePlay}
        type="button"
        className="w-8 h-8 rounded-full bg-[#1e1f22] hover:bg-[#35373c] flex items-center justify-center text-[#dbdee1] transition-colors flex-shrink-0"
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        <div 
          className="h-1.5 bg-[#1e1f22] rounded-full overflow-hidden cursor-pointer relative"
          ref={progressBarRef}
          onClick={handleSeek}
        >
           <div 
             className="absolute top-0 left-0 h-full bg-brand transition-all duration-100 ease-linear"
             style={{ width: `${progressPercent}%` }}
           />
        </div>
        <div className="flex justify-between text-[10px] text-[#949ba4] font-medium font-mono leading-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="w-8 h-8 flex items-center justify-center text-[#949ba4] flex-shrink-0">
        <Volume2 size={16} />
      </div>
    </div>
  );
};