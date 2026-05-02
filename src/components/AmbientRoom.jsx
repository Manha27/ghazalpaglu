import React, { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { Volume2, VolumeX } from 'lucide-react';

export const AmbientRoom = ({ children, isAmbientOn, toggleAmbient }) => {
  const crackleRef = useRef(null);

  useEffect(() => {
    crackleRef.current = new Howl({
      src: ['https://actions.google.com/sounds/v1/foley/cassette_tape_hiss.ogg'],
      loop: true,
      volume: 0.3,
    });

    return () => {
      crackleRef.current?.unload();
    };
  }, []);

  useEffect(() => {
    if (isAmbientOn) {
      crackleRef.current?.play();
    } else {
      crackleRef.current?.pause();
    }
  }, [isAmbientOn]);

  return (
    <div 
      className="min-h-screen relative w-full flex flex-col font-garamond text-gp-ivory overflow-hidden bg-gp-dark"
    >
      {/* Arabic Rug Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: "url('/rug.jpg')" }}
      />
      
      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-30 z-0 pointer-events-none" />

      {/* Vignette & Soft Light */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.95)_100%)] z-10 mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-amber-900/10 mix-blend-overlay z-10" />

      {/* Ambient Toggle Button */}
      <button 
        onClick={toggleAmbient}
        className="absolute top-6 right-6 z-[60] p-3 rounded-full glass-panel hover:bg-gp-burgundy/60 transition-all text-gp-gold"
        title="Toggle Vinyl Crackle"
      >
        {isAmbientOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      {/* Header */}
      <header className="w-full text-center py-6 z-50 absolute top-0 left-0">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-nastaliq text-gp-gold drop-shadow-2xl mb-1 text-glow">محفلِ غزل</h1>
        <h2 className="text-sm sm:text-lg font-garamond tracking-[0.4em] uppercase text-gp-ivory/80">Mehfil-e-Ghazal</h2>
      </header>

      <main className="relative z-20 flex-1 w-full h-screen pt-32 pb-6 px-6 lg:px-12">
        {children}
      </main>
    </div>
  );
};
