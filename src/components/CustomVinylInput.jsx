import React, { useState } from 'react';
import { Plus, Link as LinkIcon } from 'lucide-react';

export const CustomVinylInput = ({ onAddTrack }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [poet, setPoet] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) return;
    
    // Create a new track object
    const newTrack = {
      id: Date.now(),
      poet: poet || 'Unknown Artist',
      poetUrdu: 'نامعلوم فنکار',
      title: title || 'Custom Vinyl',
      sher: 'A custom selection playing for you...',
      audioUrl: url,
      coverColor: 'bg-gp-dark',
      label: 'Custom'
    };
    
    onAddTrack(newTrack);
    setIsOpen(false);
    setUrl('');
    setTitle('');
    setPoet('');
  };

  return (
    <div className="w-full max-w-lg mx-auto mb-8 relative z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-gp-gold/30 text-gp-gold hover:bg-gp-gold/10 transition-colors backdrop-blur-sm"
        >
          <Plus size={18} />
          <span>Add Custom Vinyl (YouTube / Audio Link)</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h4 className="text-gp-gold text-lg mb-4 flex items-center gap-2">
            <LinkIcon size={18} />
            Drop a Link
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gp-ivory/70 mb-1 uppercase tracking-wider">Media URL (YouTube, MP3, etc)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-black/40 border border-gp-gold/20 rounded p-2 text-white focus:outline-none focus:border-gp-gold"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gp-ivory/70 mb-1 uppercase tracking-wider">Track Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Song Name"
                  className="w-full bg-black/40 border border-gp-gold/20 rounded p-2 text-white focus:outline-none focus:border-gp-gold"
                />
              </div>
              <div>
                <label className="block text-xs text-gp-ivory/70 mb-1 uppercase tracking-wider">Artist</label>
                <input
                  type="text"
                  value={poet}
                  onChange={(e) => setPoet(e.target.value)}
                  placeholder="Artist Name"
                  className="w-full bg-black/40 border border-gp-gold/20 rounded p-2 text-white focus:outline-none focus:border-gp-gold"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gp-gold text-gp-dark font-bold py-2 rounded hover:bg-gp-gold-light transition-colors"
              >
                Drop Needle
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
