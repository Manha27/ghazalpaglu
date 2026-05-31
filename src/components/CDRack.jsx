import React from 'react';
import { motion } from 'framer-motion';

export const CDRack = ({ ghazals, currentTrack, onSelect }) => {
  return (
    <div className="w-full h-full p-6 flex flex-col">
      <div className="flex-1 overflow-y-auto hide-scrollbar pr-2 pb-20">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {ghazals.map((ghazal, idx) => {
            const isSelected = currentTrack?.id === ghazal.id;
            
            return (
              <motion.div
                key={ghazal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(ghazal)}
                className={`
                  aspect-square cursor-pointer rounded shadow-2xl relative overflow-hidden transition-all duration-300
                  ${isSelected ? 'ring-4 ring-gp-gold scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'ring-1 ring-white/10 hover:ring-gp-gold/50'}
                  ${ghazal.coverColor || 'bg-gp-burgundy'}
                `}
              >
                {/* Texture overlay */}
                <div className="absolute top-0 bottom-0 left-0 w-3 bg-black/40 border-r border-white/20 z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10 pointer-events-none" />
                
                {/* Optional cover image */}
                {ghazal.coverImage && (
                  <img src={ghazal.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
                )}

                <div className="absolute inset-0 flex flex-col justify-between p-3 pl-5">
                  <div className="font-nastaliq text-xl md:text-2xl text-gp-gold drop-shadow-md leading-relaxed text-right opacity-90">
                    {ghazal.poetUrdu}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base leading-tight text-gp-ivory drop-shadow-md">{ghazal.poet}</h3>
                    <p className="text-xs text-gp-ivory/80 italic mt-1 truncate">{ghazal.title}</p>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gp-gold animate-pulse shadow-[0_0_10px_#d4af37]" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
