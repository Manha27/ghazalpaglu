import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import { INITIAL_PLAYLIST } from './data/playlist'

const COLORS = ['#3d0b15','#162a18','#2a1506','#0d1e2a','#0d2520','#1e0a2e','#2a0a00','#001b2e']
const fmt = s => { const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}` }
const getYtId = url => { const m=url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/); return m?m[1]:(/^[a-zA-Z0-9_-]{11}$/.test(url.trim())?url.trim():null) }

export default function App() {
  const [playlist, setPlaylist]   = useState(() => {
    const saved = localStorage.getItem('ghazalpaglu_custom')
    const initial = INITIAL_PLAYLIST.map((t, i) => ({ ...t, uid: `core-${i}` }))
    if (saved) {
      try { 
         const custom = JSON.parse(saved)
         const customWithUids = Array.isArray(custom) 
            ? custom.map((t, i) => ({ ...t, uid: t.uid || `custom-old-${Date.now()}-${i}` }))
            : []
         return [...initial, ...customWithUids]
      } catch (e) { console.error(e) }
    }

    return initial
  })
  const [userPlaylists, setUserPlaylists] = useState(() => {
    const saved = localStorage.getItem('ghazalpaglu_playlists')
    return saved ? JSON.parse(saved) : {}
  })
  const [kebabMenu, setKebabMenu] = useState(null) // { uid, x, y }
  const [queue, setQueue]         = useState(playlist)


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
  const [showPlaylistModal, setShowPlaylistModal] = useState(null) // track object
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [rightTab, setRightTab] = useState('collection') // 'collection' or 'playlists'


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
    playlist.forEach(t => {
      if (t.artistEn && typeof t.artistEn === 'string') {
        artists.add(t.artistEn)
      }
    })
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
  const queueRef    = useRef(queue)
  const curIdxRef   = useRef(curIdx)
  const shuffleRef  = useRef(shuffle)
  const repeatRef   = useRef(repeat)
  const tonearmDownRef = useRef(tonearmDown)


  // keep refs in sync
  useEffect(() => { playlistRef.current = playlist }, [playlist])
  useEffect(() => { queueRef.current = queue },       [queue])
  useEffect(() => { curIdxRef.current = curIdx },     [curIdx])

  useEffect(() => { shuffleRef.current = shuffle },   [shuffle])
  useEffect(() => { repeatRef.current = repeat },     [repeat])
  useEffect(() => { tonearmDownRef.current = tonearmDown }, [tonearmDown])
  
  useEffect(() => {
    const custom = playlist.filter(t => t.uid && typeof t.uid === 'string' && t.uid.startsWith('custom-'))
    localStorage.setItem('ghazalpaglu_custom', JSON.stringify(custom))
  }, [playlist])


  useEffect(() => {
    localStorage.setItem('ghazalpaglu_playlists', JSON.stringify(userPlaylists))
  }, [userPlaylists])


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
      const q   = queueRef.current
      if (idx < 0 || !q[idx]) return
      if (q[idx].type === 'yt' && ytPlayer.current?.getCurrentTime) {
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

  const loadTrack = useCallback((idx, forcePlay = false, customQueue = null) => {
    const q = customQueue || queueRef.current
    if (idx < 0 || idx >= q.length) return
    const t = q[idx]
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
    const q = queueRef.current
    if (!q.length) return
    const next = shuffleRef.current
      ? Math.floor(Math.random() * q.length)
      : (curIdxRef.current + 1) % q.length
    loadTrack(next)
  }, [loadTrack])

  const prevTrack = useCallback(() => {
    const q = queueRef.current
    if (!q.length) return
    const cur = curIdxRef.current
    const elapsed = ytPlayer.current?.getCurrentTime?.() || 0
    if (elapsed > 3) { ytPlayer.current?.seekTo(0, true); return }
    loadTrack((cur - 1 + q.length) % q.length)
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
       setQueue(playlist)
       loadTrack(globalIdx, false, playlist)
       setGlideAnim(null)
       showToast('Click the golden tonearm to play.')
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
    let artistName = fArtist.trim()
    const songTitle = fSong.trim()
    
    // Case-insensitive artist deduplication
    const existing = existingArtists.find(a => a.toLowerCase() === artistName.toLowerCase())
    if (existing) artistName = existing

    const base = { artistEn: artistName, songEn: songTitle, color, uid: `custom-${Date.now()}` }

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
        const result = [...p]
        result.splice(lastArtistIdx + 1, 0, newTrack)
        return result
      }
      return [...p, newTrack]
    })

    setModal(false); setFUrl(''); setFArtist(''); setFSong('')
    showToast('Vinyl added to shelf')
  }

  /* ── DELETE TRACK ── */
  const handleDeleteTrack = (uid) => {
    if (!uid.startsWith('custom-')) {
      showToast('Cannot delete core tracks')
      return
    }
    if (!window.confirm('Delete this vinyl from your collection?')) return
    
    setPlaylist(p => p.filter(t => t.uid !== uid))
    
    // Also remove from playlists
    setUserPlaylists(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(name => {
        updated[name] = updated[name].filter(t => t.uid !== uid)
      })
      return updated
    })
    
    setKebabMenu(null)
    showToast('Vinyl removed')
  }

  /* ── PLAYLISTS ── */
  const handleAddToPlaylist = (track, name) => {
    const pName = name.trim()
    if (!pName) return
    
    setUserPlaylists(prev => {
      const current = prev[pName] || []
      if (current.find(t => t.uid === track.uid)) {
        showToast(`Already in ${pName}`)
        return prev
      }
      return { ...prev, [pName]: [...current, track] }
    })
    
    setShowPlaylistModal(null)
    setNewPlaylistName('')
    showToast(`Added to ${pName}`)
  }

  const removeFromPlaylist = (trackUid, pName) => {
    setUserPlaylists(prev => ({
      ...prev,
      [pName]: prev[pName].filter(t => t.uid !== trackUid)
    }))
    showToast('Removed from playlist')
  }

  const deletePlaylist = (pName) => {
    if (!window.confirm(`Delete playlist "${pName}"?`)) return
    setUserPlaylists(prev => {
      const updated = { ...prev }
      delete updated[pName]
      return updated
    })
    showToast('Playlist deleted')
  }

  const handlePlayPlaylist = (pName) => {
    const tracks = userPlaylists[pName]
    if (!tracks || tracks.length === 0) return
    setQueue(tracks)
    loadTrack(0, true, tracks)
    showToast(`Playing playlist: ${pName}`)
  }



  const getVolIcon = () => {
    if (volume === 0) return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--gold)"><path d="M3.63 3.63L2.22 5.04L7 9.83V15h4l5 5V12.83l3.07 3.07c-.62.52-1.31.94-2.07 1.21v2.06c1.3-.33 2.48-.96 3.5-1.82l2.48 2.48l1.41-1.41L3.63 3.63zM12 4L9.91 6.09L12 8.18V4zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z"/></svg>
    )
    if (volume < 50) return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--gold)"><path d="M7 9v6h4l5 5V4l-5 5H7zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
    )
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--gold)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
    )
  }

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
            <button className="vol-btn" onClick={() => setVolOpen(v => !v)}>{getVolIcon()}</button>

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
                      <div className="lbl-urdu">{curIdx >= 0 ? queue[curIdx]?.urduSong?.split(' ')[0] : 'غزل'}</div>
                      <div className="lbl-en">{curIdx >= 0 ? queue[curIdx]?.artistEn?.split(' ')[0]?.toUpperCase()?.slice(0,7) : 'MEHFIL'}</div>

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
              <div className="np-song" style={{marginTop: 10, fontSize: 18, color: 'var(--gold)'}}>{curIdx >= 0 ? queue[curIdx]?.artistEn?.toUpperCase() : 'MEHFIL-E-GHAZAL'}</div>
              <div className="np-sub" style={{marginTop: 5, fontSize: 12, letterSpacing: '0.1em'}}>{curIdx >= 0 ? queue[curIdx]?.songEn?.toUpperCase() : 'Choose a card from the mehfil to begin...'}</div>

              {status && <div className="np-status" style={{marginTop: 10}}>{status}</div>}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="right">
            <div className="rack-tabs">
              <button 
                className={`rt-tab ${rightTab === 'collection' ? 'active' : ''}`}
                onClick={() => setRightTab('collection')}
              >
                Collection
              </button>
              <button 
                className={`rt-tab ${rightTab === 'playlists' ? 'active' : ''}`}
                onClick={() => setRightTab('playlists')}
              >
                Playlists
              </button>
            </div>

            {rightTab === 'collection' ? (
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
                        <div key={t.uid} className="ao-vinyl" onClick={(e) => handleTrackSelect(e, t.globalIdx)} title="Click to load">
                          <div className="rv-inner" style={{background: t.color || '#1a1208'}}>
                            <div className="rv-en" style={{marginTop: 0, fontSize: 8}}>{t.artistEn?.split(' ')[0]}</div>
                            <div className="rv-hole" />
                          </div>
                          <div className="ao-song-title">{t.songEn}</div>
                          
                          {/* Kebab Menu Trigger */}
                          <button 
                            className="ao-kebab" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setKebabMenu({ uid: t.uid, x: rect.left, y: rect.top, track: t });
                            }}
                          >
                            ⋮
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="playlists-view">
                {Object.keys(userPlaylists).length === 0 ? (
                  <div className="empty-state">
                    No playlists yet. Add vinyls to create one!
                  </div>
                ) : (
                  <div className="playlists-grid">
                    {Object.keys(userPlaylists).map(pName => (
                      <div key={pName} className="playlist-card">
                        <div className="pc-header">
                          <div className="pc-title">{pName}</div>
                          <div className="pc-actions">
                            <button className="pc-play" onClick={() => handlePlayPlaylist(pName)} title="Play Playlist">▶</button>
                            <button className="pc-del" onClick={() => deletePlaylist(pName)} title="Delete Playlist">✕</button>
                          </div>
                        </div>
                        <div className="pc-tracks">
                          {userPlaylists[pName].map((t, idx) => {
                            // Find the index of this track within the playlist's tracks array
                            return (
                              <div key={idx} className="pc-track" onClick={(e) => {
                                setQueue(userPlaylists[pName])
                                loadTrack(idx, true, userPlaylists[pName])
                              }}>
                                <div className="pc-track-info">
                                  <div className="pc-track-song">{t.songEn}</div>
                                  <div className="pc-track-artist">{t.artistEn}</div>
                                </div>
                                <button 
                                  className="pc-track-remove" 
                                  onClick={(e) => { e.stopPropagation(); removeFromPlaylist(t.uid, pName); }}
                                >
                                  −
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    ))}
                  </div>
                )}
              </div>
            )}


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
          <div className="rv-inner" style={{background: queue[glideAnim.idx]?.color || '#1a1208', transform: 'translate(-50%, -50%) scale(1.6)'}}>

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

      {/* ── KEBAB DROPDOWN ── */}
      {kebabMenu && (
        <>
          <div className="dropdown-overlay" onClick={() => setKebabMenu(null)} />
          <div 
            className="kebab-dropdown" 
            style={{ top: kebabMenu.y + 30, left: kebabMenu.x - 120 }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setShowPlaylistModal(kebabMenu.track); setKebabMenu(null); }}>
              Add to Playlist
            </button>
            {kebabMenu.uid.startsWith('custom-') && (
              <button className="del" onClick={() => handleDeleteTrack(kebabMenu.uid)}>
                Remove from Mehfil
              </button>
            )}
          </div>
        </>
      )}

      {/* ── PLAYLIST MODAL ── */}
      {showPlaylistModal && (
        <div className="modal-overlay" onClick={() => setShowPlaylistModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setShowPlaylistModal(null)}>✕</button>
            <div className="modal-title">Add to Playlist</div>
            <div className="modal-sub">"{showPlaylistModal.songEn}" by {showPlaylistModal.artistEn}</div>

            {Object.keys(userPlaylists).length > 0 && (
              <>
                <label>Existing Playlists</label>
                <div className="playlist-list">
                  {Object.keys(userPlaylists).map(name => (
                    <button 
                      key={name} 
                      className="playlist-item"
                      onClick={() => handleAddToPlaylist(showPlaylistModal, name)}
                    >
                      {name} <span>({userPlaylists[name].length} tracks)</span>
                    </button>
                  ))}
                </div>
                <div style={{margin: '20px 0', textAlign: 'center', opacity: 0.3}}>— or —</div>
              </>
            )}

            <label>New Playlist Name</label>
            <input 
              type="text" 
              placeholder="Enter name..." 
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
            />

            <div className="modal-actions">
              <button 
                className="btn-primary" 
                onClick={() => handleAddToPlaylist(showPlaylistModal, newPlaylistName)}
                disabled={!newPlaylistName.trim()}
              >
                Create & Add
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
