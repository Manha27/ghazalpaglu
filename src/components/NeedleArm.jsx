import React from 'react';
import { motion } from 'framer-motion';

export const NeedleArm = ({ isPlaying }) => {
  return (
    <motion.div
      initial={{ rotate: -25 }}
      animate={{ rotate: isPlaying ? 15 : -25 }}
      transition={{ 
        type: "spring", 
        stiffness: 40, 
        damping: 15,
        mass: 1.5 
      }}
      style={{ originX: 0.5, originY: 0.1 }}
      className="absolute -top-4 right-8 sm:right-16 md:right-24 w-12 h-48 sm:h-64 z-30 filter drop-shadow-2xl"
    >
      <svg viewBox="0 0 100 400" className="w-full h-full text-gp-gold fill-current">
        {/* Base pivot mount */}
        <circle cx="50" cy="40" r="30" className="fill-gp-dark stroke-gp-gold" strokeWidth="4"/>
        <circle cx="50" cy="40" r="15" className="fill-gp-gold"/>
        
        {/* Counterweight */}
        <rect x="35" y="0" width="30" height="25" rx="5" className="fill-gp-sepia" />
        
        {/* Arm tube */}
        <path d="M 45 60 Q 30 200 40 320" fill="none" stroke="currentColor" strokeWidth="6" />
        <path d="M 55 60 Q 70 200 60 320" fill="none" stroke="currentColor" strokeWidth="6" />
        
        {/* Head shell & Stylus */}
        <path d="M 35 320 L 65 320 L 70 370 L 40 375 Z" className="fill-gp-dark stroke-gp-gold" strokeWidth="2"/>
        <circle cx="55" cy="350" r="4" className="fill-gp-gold"/>
      </svg>
    </motion.div>
  );
};
