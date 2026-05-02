import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import { INITIAL_PLAYLIST } from './data/playlist'

const COLORS = ['#3d0b15','#162a18','#2a1506','#0d1e2a','#0d2520','#1e0a2e','#2a0a00','#001b2e']
const fmt = s => { const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}` }
const getYtId = url => { const m=url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/); return m?m[1]:(/^[a-zA-Z0-9_-]{11}$/.test(url.trim())?url.trim():null) }

export default function App() {
  const [playlist, setPlaylist]   = useState(() => {
    const saved = localStorage.getItem('ghazalpaglu_custom')
    if (saved) {
      try { 
         const custom = JSON.parse(saved) 
         return [...INITIAL_PLAYLIST, ...custom]
      } catch (e) { console.error(e) }
    }
    return INITIAL_PLAYLIST
  })
  const [curIdx, setCurIdx]       = useState(-1)
  const [playing, setPlaying]     = useState(false)
  const [shuffle, setShuffle]     = useState(true)
  const [repeat, setRepeat]       = useState(false)
  const [progress, setProgress]   = useState(0)
  const [timeCur, setTimeCur]     = useState('0:00')
  const [timeDur, setTimeDur]     = useState('0:00')
  const [volume, setVolume]       = useState(80)
  const [volOpen, setVolOpen]     = useState(false)
  const [modal, setModal]         = useState(false)
  const [activeTab, setActiveTab] = useState('yt')
  const [status, setStatus]       = useState('')
  const [toast, setToast]         = useState('')
  const [toastOn, setToastOn]     = useState(false)

  // New features state
  const [tonearmDown, setTonearmDown] = useState(false)
  const [activeArtist, setActiveArtist] = useState(null)
  const [glideAnim, setGlideAnim] = useState(null)
  const [artistSearch, setArtistSearch] = useState('')

  const artistsList = useMemo(() => {
    const map = {}
    playlist.forEach((t, i) => {
      const name = t.artistEn
      if(!map[name]) map[name] = { en: name, color: t.color || '#1a1208', tracks: [] }
      map[name].tracks.push({ ...t, globalIdx: i })
    })
    return Object.values(map)
  }, [playlist])

  // form fields
  const [fUrl, setFUrl]       = useState('')
  const [fArtist, setFArtist] = useState('')
  const [fSong, setFSong]     = useState('')
  const [fArtistInput, setFArtistInput] = useState('')
  const [showArtistDropdown, setShowArtistDropdown] = useState(false)
  const [fetchingTitle, setFetchingTitle] = useState(false)

  // Get unique existing artists
  const existingArtists = useMemo(() => {
    const artists = new Set()
    playlist.forEach(t => artists.add(t.artistEn))
    return Array.from(artists).sort()
  }, [playlist])

  // Filter artists based on input
  const filteredArtists = useMemo(() => {
    if (!fArtistInput) return existingArtists
    return existingArtists.filter(a => a.toLowerCase().includes(fArtistInput.toLowerCase()))
  }, [fArtistInput, existingArtists])

  const ytPlayer  = useRef(null)
  const ytReady   = useRef(false)
  const progTimer = useRef(null)
  const toastTimer= useRef(null)
  const playlistRef = useRef(playlist)
  const curIdxRef   = useRef(curIdx)
  const shuffleRef  = useRef(shuffle)
  const repeatRef   = useRef(repeat)
  const tonearmDownRef = useRef(tonearmDown)

  // keep refs in sync
  useEffect(() => { playlistRef.current = playlist }, [playlist])
  useEffect(() => { curIdxRef.current = curIdx },     [curIdx])
  useEffect(() => { shuffleRef.current = shuffle },   [shuffle])
  useEffect(() => { repeatRef.current = repeat },     [repeat])
  useEffect(() => { tonearmDownRef.current = tonearmDown }, [tonearmDown])
  
  // Persist custom vinyls
  useEffect(() => {
    const custom = playlist.slice(INITIAL_PLAYLIST.length)
    if (custom.length > 0) localStorage.setItem('ghazalpaglu_custom', JSON.stringify(custom))
  }, [playlist])

  /* ── TOAST ── */
  const showToast = useCallback(msg => {
    setToast(msg); setToastOn(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastOn(false), 2800)
  }, [])

  /* ── YOUTUBE API ── */
  useEffect(() => {
    const initPlayer = () => {
      ytReady.current = true
      if (!ytPlayer.current) {
        ytPlayer.current = new window.YT.Player('yt-player-div', {
          width: 640, height: 360,
          playerVars: { autoplay:0, controls:0, disablekb:1, fs:0, rel:0, modestbranding:1 },
          events: {
            onReady: () => ytPlayer.current.setVolume(80),
            onStateChange: e => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING)   { setPlaying(true);  setStatus(''); setTonearmDown(true) }
              if (e.data === S.PAUSED)    { setPlaying(false); setTonearmDown(false) }
              if (e.data === S.BUFFERING) { setStatus('Buffering...') }
              if (e.data === S.ENDED) {
                if (repeatRef.current) { ytPlayer.current.seekTo(0); ytPlayer.current.playVideo() }
                else nextTrack()
              }
            },
            onError: () => { showToast('Video unavailable — try another'); setPlaying(false) }
          }
        })
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(s)
      }
    }
    return () => { clearInterval(progTimer.current) }
  }, [])

  /* ── PROGRESS TICKER ── */
  const startProg = useCallback(() => {
    clearInterval(progTimer.current)
    progTimer.current = setInterval(() => {
      const idx = curIdxRef.current
      const pl  = playlistRef.current
      if (idx < 0 || !pl[idx]) return
      if (pl[idx].type === 'yt' && ytPlayer.current?.getCurrentTime) {
        const c = ytPlayer.current.getCurrentTime() || 0
        const d = ytPlayer.current.getDuration()    || 0
        setProgress(d > 0 ? (c/d)*100 : 0)
        setTimeCur(fmt(c)); setTimeDur(fmt(d))
      }
    }, 500)
  }, [])

  const stopProg = useCallback(() => clearInterval(progTimer.current), [])

  useEffect(() => { playing ? startProg() : stopProg() }, [playing])

  /* ── LOAD TRACK ── */
  const loadTrack = useCallback((idx, forcePlay = false) => {
    const pl = playlistRef.current
    if (idx < 0 || idx >= pl.length) return
    const t = pl[idx]
    setCurIdx(idx)
    setProgress(0); setTimeCur('0:00'); setTimeDur('0:00')

    if (t.type === 'yt') {
      if (!ytPlayer.current || !ytReady.current) { showToast('Player loading, try again in a moment'); return }
      if (forcePlay || tonearmDownRef.current) {
        ytPlayer.current.loadVideoById(t.id)
      } else {
        ytPlayer.current.cueVideoById(t.id)
      }
    }
  }, [showToast])

  /* ── NEXT / PREV ── */
  const nextTrack = useCallback(() => {
    const pl = playlistRef.current
    if (!pl.length) return
    const next = shuffleRef.current
      ? Math.floor(Math.random() * pl.length)
      : (curIdxRef.current + 1) % pl.length
    loadTrack(next)
  }, [loadTrack])

  const prevTrack = useCallback(() => {
    const pl = playlistRef.current
    if (!pl.length) return
    const cur = curIdxRef.current
    const elapsed = ytPlayer.current?.getCurrentTime?.() || 0
    if (elapsed > 3) { ytPlayer.current?.seekTo(0, true); return }
    loadTrack((cur - 1 + pl.length) % pl.length)
  }, [loadTrack])

  /* ── PLAY / PAUSE & TONEARM ── */
  const playClickSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05)
      gain.gain.setValueAtTime(1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    } catch(e) {}
  }

  const toggleTonearm = () => {
    if (curIdx === -1) { showToast('Place a vinyl on the platter first'); return }
    if (!ytPlayer.current || !ytReady.current) { showToast('Player still loading...'); return }
    
    playClickSound()
    if (!tonearmDown) {
      setTonearmDown(true)
      ytPlayer.current.playVideo()
    } else {
      setTonearmDown(false)
      ytPlayer.current.pauseVideo()
    }
  }

  const togglePlay = () => toggleTonearm()

  const handleTrackSelect = (e, globalIdx) => {
    const srcRect = e.currentTarget.getBoundingClientRect()
    const platter = document.querySelector('.platter').getBoundingClientRect()
    
    setGlideAnim({
       startX: srcRect.left, startY: srcRect.top, startW: srcRect.width,
       endX: platter.left + (platter.width/2) - (srcRect.width/2), 
       endY: platter.top + (platter.height/2) - (srcRect.width/2), 
       idx: globalIdx
    })
    setActiveArtist(null)
    
    setTimeout(() => {
       setTonearmDown(false) // raise arm
       loadTrack(globalIdx)
       setGlideAnim(null)
       showToast('Vinyl placed. Click the golden tonearm to lower it and play.')
    }, 800)
  }

  /* ── SEEK ── */
  const handleSeek = e => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    if (ytPlayer.current?.getDuration) {
      ytPlayer.current.seekTo(ratio * (ytPlayer.current.getDuration() || 0), true)
    }
  }

  /* ── VOLUME ── */
  useEffect(() => {
    if (ytPlayer.current?.setVolume) ytPlayer.current.setVolume(volume)
  }, [volume])

  /* ── KEYBOARD ── */
  useEffect(() => {
    const handler = e => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return
      if (e.code === 'Space')      { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowRight') nextTrack()
      if (e.code === 'ArrowLeft')  prevTrack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playing, curIdx])

  /* ── FETCH YOUTUBE TITLE ── */
  useEffect(() => {
    const fetchYouTubeTitle = async () => {
      const ytId = getYtId(fUrl)
      if (!ytId || !modal) return
      
      setFetchingTitle(true)
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${ytId}`
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`)
        if (response.ok) {
          const data = await response.json()
          setFSong(data.title)
        }
      } catch (e) {
        console.error('Failed to fetch YouTube title:', e)
      } finally {
        setFetchingTitle(false)
      }
    }

    const timer = setTimeout(fetchYouTubeTitle, 800)
    return () => clearTimeout(timer)
  }, [fUrl, modal])

  /* ── ADD TRACK ── */
  const handleAdd = () => {
    if (!fArtist.trim()) { showToast('Select or enter an artist name'); return }
    if (!fSong.trim()) { showToast('Enter a song title'); return }
    
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const artistName = fArtist.trim()
    const songTitle = fSong.trim()
    const base = { artistEn: artistName, songEn: songTitle, color }

    const ytId = getYtId(fUrl)
    if (!ytId) { showToast('Paste a valid YouTube URL'); return }
    
    setPlaylist(p => {
      const newTrack = { ...base, type:'yt', id:ytId }
      
      // Find the LAST occurrence of this artist in the playlist
      let lastArtistIdx = -1
      for (let i = p.length - 1; i >= 0; i--) {
        if (p[i].artistEn === artistName) {
          lastArtistIdx = i
          break
        }
      }
      
      if (lastArtistIdx !== -1) {
        // Insert after the last track of this artist
        const result = [...p]
        result.splice(lastArtistIdx + 1, 0, newTrack)
        return result
      }
      // Artist doesn't exist, add at end
      return [...p, newTrack]
    })

    setModal(false); setFUrl(''); setFArtist(''); setFSong('')
    setTimeout(() => {
      const newIdx = playlistRef.current.findIndex(t => t.id === ytId && t.artistEn === artistName && t.songEn === songTitle)
      if (newIdx !== -1) loadTrack(newIdx)
    }, 100)
  }

  const volIcon = volume===0?'🔇':volume<33?'🔈':volume<66?'🔉':'🔊'

  return (
    <>
      {/* Off-screen YouTube player — real dimensions required by browser */}
      <div style={{position:'fixed',left:'-9999px',top:'-9999px',width:'640px',height:'360px',pointerEvents:'none',zIndex:-1}}>
        <div id="yt-player-div" />
      </div>

      <div className="wrapper">
        {/* ── HEADER ── */}
        <header>
          <div className="hdr-ornament">— Est. the golden age of Urdu poetry —</div>
          <div className="hdr-urdu">محفلِ غزل</div>
          <div className="hdr-en">M E H F I L - E - G H A Z A L</div>
          <div className="vol-wrap" onClick={e => e.stopPropagation()}>
            <button className="vol-btn" onClick={() => setVolOpen(v => !v)}>{volIcon}</button>
            {volOpen && (
              <div className="vol-panel">
                <label>Volume</label>
                <input type="range" min="0" max="100" value={volume}
                  onChange={e => setVolume(+e.target.value)} />
              </div>
            )}
          </div>
        </header>

        <div className="main" onClick={() => setVolOpen(false)}>
          {/* ── LEFT ── */}
          <div className="left">
            <div className="turntable">
              <div className="tt-inner">
                <div className="platter">
                  <div className="platter-rim" />
                  <div className="vinyl" style={{animationPlayState: playing ? 'running' : 'paused'}}>
                    <div className={`vinyl-label ${playing ? 'pulse' : ''}`}>
                      <div className="lbl-urdu">{curIdx >= 0 ? playlist[curIdx]?.urduSong?.split(' ')[0] : 'غزل'}</div>
                      <div className="lbl-en">{curIdx >= 0 ? playlist[curIdx]?.artistEn?.split(' ')[0]?.toUpperCase()?.slice(0,7) : 'MEHFIL'}</div>
                    </div>
                    <div className="vinyl-hole" />
                  </div>

                  {/* Tonearm */}
                  <div className={`tonearm ${tonearmDown ? 'playing' : ''}`} onClick={toggleTonearm} title="Click to lower/raise tonearm">
                    <div style={{position: 'absolute', inset: -15, zIndex: 20}} />
                    <div className="tonearm-pivot" />
                    <svg width="134" height="134" viewBox="0 0 134 134" fill="none" style={{position: 'relative', zIndex: 10}}>
                      <line x1="20" y1="20" x2="98" y2="98" stroke="#c9a84c" strokeWidth="6" strokeLinecap="round"/>
                      <line x1="98" y1="98" x2="112" y2="90" stroke="#c9a84c" strokeWidth="5" strokeLinecap="round"/>
                      <line x1="112" y1="90" x2="119" y2="103" stroke="#c9a84c" strokeWidth="5" strokeLinecap="round"/>
                      <circle cx="120" cy="104" r="4.5" fill="#e8c97e"/>
                      <rect x="4" y="12" width="22" height="14" rx="4" fill="#7a6028" stroke="#c9a84c" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>

                {/* Controls */}
                <div className="controls">
                  <button className={`ctrl-sm ${shuffle?'on':''}`} onClick={() => { setShuffle(s=>!s); showToast(shuffle?'Shuffle off':'Shuffle on') }}>⇌ SHUFFLE</button>
                  <button className="ctrl-btn" onClick={prevTrack}>&#9664;&#9664;</button>
                  <button className="play-btn" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
                  <button className="ctrl-btn" onClick={nextTrack}>&#9654;&#9654;</button>
                  <button className={`ctrl-sm ${repeat?'on':''}`} onClick={() => { setRepeat(r=>!r); showToast(repeat?'Repeat off':'Repeat on') }}>↺ REPEAT</button>
                </div>

                {/* Progress */}
                <div className="prog-wrap">
                  <div className="prog-bg" onClick={handleSeek}>
                    <div className="prog-fill" style={{width:`${progress}%`}} />
                  </div>
                  <div className="prog-times">
                    <span>{timeCur}</span>
                    <span>{timeDur}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Now Playing */}
            <div className="now-playing">
              <div className="np-badge">Now Playing</div>
              <div className="np-song" style={{marginTop: 10, fontSize: 18, color: 'var(--gold)'}}>{curIdx >= 0 ? playlist[curIdx]?.artistEn?.toUpperCase() : 'MEHFIL-E-GHAZAL'}</div>
              <div className="np-sub" style={{marginTop: 5, fontSize: 12, letterSpacing: '0.1em'}}>{curIdx >= 0 ? playlist[curIdx]?.songEn?.toUpperCase() : 'Choose a card from the mehfil to begin...'}</div>
              {status && <div className="np-status" style={{marginTop: 10}}>{status}</div>}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="right">
            <div className="rack-title" style={{ marginTop: 0 }}>
              <div className="rt-en">THE VINYL COLLECTION</div>
            </div>

            <div className="wooden-shelf-wrapper">
              <div className="wooden-shelf">
                {artistsList.map((artist, i) => (
                  <div key={i} className="shelf-cubby">
                    <div className="vinyl-pack" style={{background: artist.color}} onClick={() => { setActiveArtist(artist); setArtistSearch('') }}>
                      <div className="pack-spine" />
                      <div className="pack-cover">
                        <div className="pack-en" style={{fontSize: 12, marginBottom: 8}}>{artist.en}</div>
                        <div className="pack-count">{artist.tracks.length} {artist.tracks.length === 1 ? 'Track' : 'Tracks'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded Artist Overlay */}
              {activeArtist && (
                <div className="artist-overlay">
                  <div className="ao-header" style={{flexDirection: 'column', gap: 10, alignItems: 'stretch'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div className="ao-title" style={{fontFamily: "'Cinzel', serif", letterSpacing: '0.05em', fontSize: 26}}>{activeArtist.en.toUpperCase()}</div>
                      <button className="ao-close" onClick={() => { setActiveArtist(null); setArtistSearch('') }}>✕</button>
                    </div>
                    <input 
                      className="ao-search"
                      placeholder={`Search ${activeArtist.en}'s tracks...`}
                      value={artistSearch}
                      onChange={e => setArtistSearch(e.target.value)}
                    />
                  </div>
                  <div className="ao-vinyls">
                    {activeArtist.tracks.filter(t => t.songEn.toLowerCase().includes(artistSearch.toLowerCase())).map((t) => (
                      <div key={t.globalIdx} className="ao-vinyl" onClick={(e) => handleTrackSelect(e, t.globalIdx)} title="Click to load">
                        <div className="rv-inner" style={{background: t.color || '#1a1208'}}>
                          <div className="rv-en" style={{marginTop: 0, fontSize: 8}}>{t.artistEn?.split(' ')[0]}</div>
                          <div className="rv-hole" />
                        </div>
                        <div className="ao-song-title">{t.songEn}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="add-btn" onClick={() => {
              setModal(true)
              setFUrl('')
              setFSong('')
              setFArtistInput('')
              setFArtist('')
              setShowArtistDropdown(false)
            }} style={{ marginTop: '10px' }}>
              <span style={{fontSize:20,lineHeight:1}}>+</span>
              Add Custom Vinyl
            </button>
          </div>
        </div>
      </div>

      {/* Gliding Vinyl Animation */}
      {glideAnim && (
        <div className="gliding-vinyl" style={{
          '--startX': `${glideAnim.startX}px`,
          '--startY': `${glideAnim.startY}px`,
          '--startW': `${glideAnim.startW}px`,
          '--endX': `${glideAnim.endX}px`,
          '--endY': `${glideAnim.endY}px`,
        }}>
          <div className="rv-inner" style={{background: playlist[glideAnim.idx].color || '#1a1208', transform: 'translate(-50%, -50%) scale(1.6)'}}>
            <div className="rv-hole" />
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setModal(false)}>✕</button>
            <div className="modal-title">Add Custom Vinyl</div>
            <div className="modal-sub">YouTube link only - title fetches automatically</div>

            <label>YouTube URL</label>
            <input 
              type="text"
              value={fUrl} 
              onChange={e => setFUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." 
            />

            <label>Artist Name</label>
            <div style={{position: 'relative'}}>
              <input 
                type="text"
                value={fArtistInput}
                onChange={e => {
                  setFArtistInput(e.target.value)
                  setFArtist(e.target.value)
                  setShowArtistDropdown(true)
                }}
                onFocus={() => setShowArtistDropdown(true)}
                placeholder="Select or type artist name..."
                style={{width: '100%'}}
              />
              {showArtistDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#2a2a2a',
                  border: '1px solid #d4af37',
                  borderRadius: '4px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  {filteredArtists.length > 0 ? (
                    filteredArtists.map(artist => (
                      <div
                        key={artist}
                        onClick={() => {
                          setFArtistInput(artist)
                          setFArtist(artist)
                          setShowArtistDropdown(false)
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #444',
                          color: '#d4af37',
                          fontSize: '14px'
                        }}
                        onMouseEnter={e => e.target.style.background = '#3a3a3a'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                      >
                        {artist}
                      </div>
                    ))
                  ) : fArtistInput ? (
                    <div style={{padding: '8px 12px', color: '#888', fontSize: '14px'}}>
                      New artist: "{fArtistInput}"
                    </div>
                  ) : (
                    <div style={{padding: '8px 12px', color: '#888', fontSize: '14px'}}>
                      No artists found
                    </div>
                  )}
                </div>
              )}
            </div>

            <label>Song Title {fetchingTitle && <span style={{fontSize: '12px', color: '#d4af37'}}>  (fetching...)</span>}</label>
            <input 
              type="text"
              value={fSong} 
              onChange={e => setFSong(e.target.value)}
              placeholder={fetchingTitle ? "Fetching from YouTube..." : "Ghazal Title"} 
              disabled={fetchingTitle}
            />

            <div className="modal-actions">
              <button className="btn-primary" onClick={handleAdd} disabled={fetchingTitle || !fUrl.trim() || !fArtistInput.trim() || !fSong.trim()}>Add to Mehfil</button>
              <button className="btn-sec" onClick={() => {
                setModal(false)
                setFUrl('')
                setFSong('')
                setFArtistInput('')
                setFArtist('')
                setShowArtistDropdown(false)
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`toast ${toastOn?'show':''}`}>{toast}</div>
    </>
  )
}
