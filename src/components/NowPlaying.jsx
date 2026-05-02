import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const NowPlaying = ({ currentTrack }) => {
  return (
    <div className="w-full max-w-lg mx-auto min-h-[150px] relative mt-4 mb-8">
      <AnimatePresence mode="wait">
        {currentTrack ? (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center text-center p-6 glass-panel rounded-lg"
          >
            <h3 className="font-nastaliq text-3xl md:text-4xl text-gp-gold mb-2 drop-shadow-md">
              {currentTrack.poetUrdu}
            </h3>
            <h4 className="text-xl md:text-2xl font-semibold tracking-wide text-white mb-4">
              {currentTrack.title}
            </h4>
            
            <div className="relative pt-4">
              <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gp-gold/30 text-4xl font-serif">"</span>
              <p className="text-lg md:text-xl italic text-gp-ivory/90 font-light max-w-md mx-auto leading-relaxed">
                {currentTrack.sher}
              </p>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-gp-gold uppercase tracking-[0.2em]">
              <span className="w-8 h-[1px] bg-gp-gold/50"></span>
              Now Playing
              <span className="w-8 h-[1px] bg-gp-gold/50"></span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center p-8 border border-white/5 rounded-lg h-full"
          >
            <p className="text-gp-gold/50 italic text-lg">
              Select a ghazal from the rack or add your own vinyl.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
