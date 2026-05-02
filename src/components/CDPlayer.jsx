import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Disc3 } from 'lucide-react';
import { NeedleArm } from './NeedleArm';

export const CDPlayer = ({ currentTrack, isPlaying, setIsPlaying, onEnded }) => {
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);

  const handleProgress = (e) => {
    const current = e.target.currentTime;
    const dur = e.target.duration;
    if (dur > 0) {
      setProgress(current / dur);
    }
  };

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        const playPromise = playerRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Autoplay prevented or audio error:", error);
            setIsPlaying(false);
          });
        }
      } else {
        playerRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack, setIsPlaying]);

  const handlePlayPause = () => {
    if (currentTrack) {
      setIsPlaying(!isPlaying);
    }
  };

  const displayProgress = isNaN(progress) ? 0 : Math.floor(progress * 100);

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center mb-12 mt-4">
      {/* Wood Base / Player Chassis */}
      <div className="absolute inset-4 sm:inset-0 bg-gp-sepia rounded-3xl shadow-2xl border-4 border-gp-dark flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/50 pointer-events-none" />
        
        {/* Platter Base */}
        <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gp-dark shadow-inner border border-gp-gold/20 flex items-center justify-center">
          <div className="absolute w-70 h-70 rounded-full bg-black shadow-[inset_0_0_20px_rgba(0,0,0,1)]" />
        </div>

        {/* The Disc */}
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: "linear",
            type: "tween"
          }}
          className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-full vinyl-grooves shadow-2xl border border-white/5 flex items-center justify-center z-20"
        >
          {/* Vinyl Reflections */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 via-transparent to-white/10" />
          
          {/* Center Label */}
          <div className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full ${currentTrack?.coverColor || 'bg-gp-burgundy'} border-2 border-gp-gold flex items-center justify-center overflow-hidden`}>
            {currentTrack?.coverImage ? (
              <img src={currentTrack.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="text-center p-2 opacity-80">
                <p className="text-[10px] sm:text-xs text-gp-ivory uppercase tracking-widest">{currentTrack?.label || 'GhazalPaglu'}</p>
                <p className="text-[8px] mt-1 font-nastaliq">{currentTrack?.poetUrdu}</p>
              </div>
            )}
            {/* Spindle hole */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full border border-gray-600 shadow-inner" />
          </div>
        </motion.div>

        {/* Needle Arm Component */}
        <NeedleArm isPlaying={isPlaying} />

        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-40">
          <button
            onClick={handlePlayPause}
            className={`w-14 h-14 rounded-full flex items-center justify-center glass-panel text-gp-gold transition-all duration-300 ${!currentTrack ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:bg-gp-burgundy/80'}`}
            disabled={!currentTrack}
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>

          {/* Progress Arc Visualizer (simplified as a small indicator for now) */}
          <div className="text-gp-gold/70 text-xs font-mono mb-2">
            {displayProgress}%
          </div>
        </div>
      </div>

      {/* Native HTML5 Audio Player */}
      {currentTrack && currentTrack.audioUrl && (
        <audio
          ref={playerRef}
          src={currentTrack.audioUrl}
          onTimeUpdate={handleProgress}
          onEnded={onEnded}
          autoPlay
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};
