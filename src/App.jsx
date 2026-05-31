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
  const [globalSearch, setGlobalSearch] = useState('')
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('ghazalpaglu_favorites')
    return saved ? JSON.parse(saved) : []
  })
  const [showSendModal, setShowSendModal] = useState(false)
  const [receivedNote, setReceivedNote] = useState(null)
  const [addingToPlaylistName, setAddingToPlaylistName] = useState(null)
  const [editingPlaylistName, setEditingPlaylistName] = useState(null)
  const [editNameInput, setEditNameInput] = useState('')
  const [showAddFromMehfilModal, setShowAddFromMehfilModal] = useState(false)
  const [playlistKebabMenu, setPlaylistKebabMenu] = useState(null)

  const artistsList = useMemo(() => {
    const map = {}
    playlist.forEach((t, i) => {
      const name = t.artistEn?.trim()
      if (!name) return
      // Filter by global search (poet name or song title)
      const matchesSearch = name.toLowerCase().includes(globalSearch.toLowerCase()) || 
                           t.songEn.toLowerCase().includes(globalSearch.toLowerCase())
      
      if (globalSearch && !matchesSearch) return

      const existingKey = Object.keys(map).find(k => k.toLowerCase() === name.toLowerCase())
      if (existingKey) {
        map[existingKey].tracks.push({ ...t, globalIdx: i })
      } else {
        map[name] = { en: name, urdu: t.urduArtist || name, color: t.color || '#1a1208', tracks: [{ ...t, globalIdx: i }] }
      }
    })
    return Object.values(map)
  }, [playlist, globalSearch])

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

  useEffect(() => {
    localStorage.setItem('ghazalpaglu_favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    if (tonearmDown && toast === 'Click the golden tonearm to play.') {
      setToastOn(false)
    }
  }, [tonearmDown, toast])

  /* ── TOAST ── */
  const showToast = useCallback((msg, duration = 2800) => {
    setToast(msg); setToastOn(true)
    clearTimeout(toastTimer.current)
    if (duration > 0) {
      toastTimer.current = setTimeout(() => setToastOn(false), duration)
    }
  }, [])

  const toggleFavorite = useCallback((trackUid) => {
    setFavorites(prev => {
      const isFav = prev.includes(trackUid)
      const next = isFav ? prev.filter(id => id !== trackUid) : [...prev, trackUid]
      showToast(isFav ? 'Removed from favorites' : 'Added to favorites', 1500)
      return next
    })
  }, [showToast])

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
            onError: () => { 
              showToast('Video unavailable — skipping...', 2000)
              setPlaying(false)
              setTimeout(() => nextTrack(), 2000)
            }
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

  // Handle shared track from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const trackUid = params.get('track')
    const note = params.get('note')
    
    if (trackUid) {
      const idx = playlistRef.current.findIndex(t => t.uid === trackUid)
      if (idx !== -1) {
        if (note) {
          setReceivedNote({
            text: note,
            trackIdx: idx
          })
        } else {
          // No note, just load the track and auto-play
          setTimeout(() => {
            loadTrack(idx, true, playlistRef.current)
            setTonearmDown(true)
            showToast('Playing shared ghazal!')
          }, 1500)
        }
      }
    }
  }, [loadTrack, showToast])


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
       showToast('Click the golden tonearm to play.', 0)
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
      if (e.code === 'ArrowRight') {
        if (ytPlayer.current?.getCurrentTime) {
          ytPlayer.current.seekTo(ytPlayer.current.getCurrentTime() + 10, true)
          showToast('Seek forward 10s', 1500)
        }
      }
      if (e.code === 'ArrowLeft')  {
        if (ytPlayer.current?.getCurrentTime) {
          ytPlayer.current.seekTo(Math.max(0, ytPlayer.current.getCurrentTime() - 10), true)
          showToast('Seek backward 10s', 1500)
        }
      }
      if (e.key.toLowerCase() === 's') {
        setShuffle(prev => {
          const next = !prev
          showToast(next ? 'Shuffle on' : 'Shuffle off', 1500)
          return next
        })
      }
      if (e.key.toLowerCase() === 'r') {
        setRepeat(prev => {
          const next = !prev
          showToast(next ? 'Repeat on' : 'Repeat off', 1500)
          return next
        })
      }
      if (e.key.toLowerCase() === 'f') {
        if (curIdx >= 0) {
          toggleFavorite(queue[curIdx].uid)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playing, curIdx, queue, toggleFavorite, showToast])

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



  const handleSaveRename = (oldName) => {
    const trimmed = editNameInput.trim()
    if (!trimmed) {
      showToast('Playlist name cannot be empty')
      return
    }
    if (trimmed === oldName) {
      setEditingPlaylistName(null)
      return
    }
    if (userPlaylists[trimmed]) {
      showToast('A playlist with that name already exists')
      return
    }
    setUserPlaylists(prev => {
      const updated = { ...prev }
      updated[trimmed] = updated[oldName]
      delete updated[oldName]
      return updated
    })
    setEditingPlaylistName(null)
    showToast(`Playlist renamed to "${trimmed}"`)
  }

  const handleTrackClickInAddMode = (track) => {
    setUserPlaylists(prev => {
      const current = prev[addingToPlaylistName] || []
      const exists = current.some(t => t.uid === track.uid)
      let updated
      if (exists) {
        updated = current.filter(t => t.uid !== track.uid)
        showToast(`Removed "${track.songEn}" from ${addingToPlaylistName}`)
      } else {
        updated = [...current, track]
        showToast(`Added "${track.songEn}" to ${addingToPlaylistName}`)
      }
      return { ...prev, [addingToPlaylistName]: updated }
    })
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

                  {/* Visualizer Rings */}
                  {playing && (
                    <div className="visualizer">
                      <div className="v-ring" style={{ animationDelay: '0s' }} />
                      <div className="v-ring" style={{ animationDelay: '0.4s' }} />
                      <div className="v-ring" style={{ animationDelay: '0.8s' }} />
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="controls">
                  <button className={`ctrl-sm ${shuffle?'on':''}`} onClick={() => { setShuffle(s=>!s); showToast(shuffle?'Shuffle off':'Shuffle on') }}>≪ SHUFFLE</button>
                  <button className="ctrl-btn" onClick={prevTrack}>◄◄</button>
                  <button className="play-btn" onClick={togglePlay}>{playing ? '❚❚' : '▶'}</button>
                  <button className="ctrl-btn" onClick={nextTrack}>►►</button>
                  <button className={`ctrl-sm ${repeat?'on':''}`} onClick={() => { setRepeat(r=>!r); showToast(repeat?'Repeat off':'Repeat on') }}>REPEAT ≫</button>
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

              <div className="np-actions" style={{ marginTop: 15 }}>
                <button 
                  className="np-action-btn" 
                  onClick={() => setShowSendModal(true)} 
                  disabled={curIdx < 0}
                  style={{ width: '100%', padding: '12px 18px', fontSize: '12px', fontWeight: 'bold' }}
                >
                  SEND A GHAZAL
                </button>
              </div>

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
              <button 
                className={`rt-tab ${rightTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setRightTab('favorites')}
              >
                Favorites
              </button>
            </div>

            {rightTab === 'collection' && (
              <div className="search-wrap" style={{ marginBottom: '12px' }}>
                <input 
                  type="text" 
                  className="global-search" 
                  placeholder="Search poet or ghazal..." 
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                />
              </div>
            )}

            {rightTab === 'collection' ? (
              <div className="wooden-shelf-wrapper">
                {addingToPlaylistName && (
                  <div className="add-mode-banner">
                    <span>Adding tracks to <strong>{addingToPlaylistName}</strong></span>
                    <button className="add-mode-done" onClick={() => {
                      setAddingToPlaylistName(null)
                      setRightTab('playlists')
                      showToast(`Saved playlist "${addingToPlaylistName}"!`)
                    }}>Done</button>
                  </div>
                )}
                <div className="wooden-shelf">
                  {artistsList.map((artist, i) => (
                    <div key={i} className="shelf-cubby">
                      <div className="vinyl-pack" style={{background: artist.color}} onClick={() => { 
                        setActiveArtist(artist); 
                        setArtistSearch('');
                      }}>
                        <div className="pack-spine" />
                        <div className="pack-cover">
                          <div className="pack-urdu" style={{ fontSize: '24px', color: '#ebd173', fontWeight: 'bold' }}>{artist.urdu}</div>
                          <div className="pack-en" style={{ fontSize: '13px', color: '#f4ebd8', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.05em' }}>{artist.en}</div>
                          <div className="pack-count" style={{ fontSize: '10px', color: '#ebd173', fontWeight: 'bold' }}>{artist.tracks.length} {artist.tracks.length === 1 ? 'Track' : 'Tracks'}</div>
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
                      {activeArtist.tracks.filter(t => t.songEn.toLowerCase().includes(artistSearch.toLowerCase())).map((t) => {
                        const isSelectedInAddMode = addingToPlaylistName && userPlaylists[addingToPlaylistName]?.some(pt => pt.uid === t.uid);
                        return (
                          <div 
                            key={t.uid} 
                            className={`ao-vinyl ${isSelectedInAddMode ? 'selected-in-add-mode' : ''}`} 
                            onClick={(e) => {
                              if (addingToPlaylistName) {
                                handleTrackClickInAddMode(t)
                              } else {
                                handleTrackSelect(e, t.globalIdx)
                              }
                            }} 
                            title={addingToPlaylistName ? "Click to add/remove from playlist" : "Click to load"}
                          >
                            <div className="rv-inner" style={{background: t.color || '#1a1208'}}>
                              <div className="rv-en" style={{marginTop: 0, fontSize: 8}}>{t.artistEn?.split(' ')[0]}</div>
                              <div className="rv-hole" />
                            </div>
                            <div className="ao-song-title">{t.songEn}</div>
                            
                            {/* Checkmark in Add Mode */}
                            {isSelectedInAddMode && (
                              <div className="add-mode-checkmark">✓</div>
                            )}
                            
                            {/* Heart Icon */}
                            {!addingToPlaylistName && (
                              <button 
                                className={`ao-fav ${favorites.includes(t.uid) ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(t.uid); }}
                              >
                                ♥
                              </button>
                            )}

                            {/* Kebab Menu Trigger */}
                            {!addingToPlaylistName && (
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
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : rightTab === 'playlists' ? (
              <div className="playlists-view">
                {/* ... existing playlists view ... */}
                {Object.keys(userPlaylists).length === 0 ? (
                  <div className="empty-state">
                    No playlists yet. Add vinyls to create one!
                  </div>
                ) : (
                  <div className="playlists-grid">
                    {Object.keys(userPlaylists).map(pName => (
                      <div key={pName} className="playlist-card">
                        <div className="pc-header">
                          {editingPlaylistName === pName ? (
                            <div className="pc-rename-wrap" onClick={e => e.stopPropagation()}>
                              <input 
                                type="text"
                                className="pc-rename-input"
                                value={editNameInput}
                                onChange={e => setEditNameInput(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveRename(pName)
                                  if (e.key === 'Escape') setEditingPlaylistName(null)
                                }}
                              />
                              <button className="pc-rename-btn save" onClick={() => handleSaveRename(pName)} title="Save name">✓</button>
                              <button className="pc-rename-btn cancel" onClick={() => setEditingPlaylistName(null)} title="Cancel">✕</button>
                            </div>
                          ) : (
                            <>
                              <div className="pc-title">{pName}</div>
                              <div className="pc-actions">
                                <button className="pc-play" onClick={() => handlePlayPlaylist(pName)} title="Play Playlist">▶</button>
                                <button 
                                  className="pc-kebab" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setPlaylistKebabMenu({ pName, x: rect.left, y: rect.top });
                                  }}
                                  title="Playlist Options"
                                >
                                  ⋮
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="pc-tracks">
                          {userPlaylists[pName].map((t, idx) => (
                            <div key={idx} className="pc-track" onClick={() => {
                              setQueue(userPlaylists[pName])
                              loadTrack(idx, true, userPlaylists[pName])
                            }}>
                              <div className="pc-track-info">
                                <div className="pc-track-song">{t.songEn}</div>
                                <div className="pc-track-artist">{t.artistEn}</div>
                              </div>
                              <div className="pc-track-right">
                                <button className={`pc-fav ${favorites.includes(t.uid) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(t.uid); }}>♥</button>
                                <button className="pc-track-remove" onClick={(e) => { e.stopPropagation(); removeFromPlaylist(t.uid, pName); }}>−</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="favorites-view">
                {favorites.length === 0 ? (
                  <div className="empty-state">
                    No favorites yet. Click the heart on any track to add it!
                  </div>
                ) : (
                  <div className="fav-list">
                    {playlist.filter(t => favorites.includes(t.uid)).map((t, idx, arr) => (
                      <div key={t.uid} className="pc-track" onClick={() => {
                        setQueue(arr)
                        loadTrack(idx, true, arr)
                      }}>
                        <div className="pc-track-info">
                          <div className="pc-track-song">{t.songEn}</div>
                          <div className="pc-track-artist">{t.artistEn}</div>
                        </div>
                        <button className="pc-fav active" onClick={(e) => { e.stopPropagation(); toggleFavorite(t.uid); }}>♥</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightTab === 'playlists' && (
              <button className="add-btn-mehfil" onClick={() => setShowAddFromMehfilModal(true)}>
                <span style={{fontSize:18,marginRight:6}}>✦</span>
                Add from Mehfil
              </button>
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

      {/* ── PLAYLIST KEBAB DROPDOWN ── */}
      {playlistKebabMenu && (
        <>
          <div className="dropdown-overlay" onClick={() => setPlaylistKebabMenu(null)} />
          <div 
            className="kebab-dropdown" 
            style={{ top: playlistKebabMenu.y + 30, left: playlistKebabMenu.x - 120 }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => {
              setAddingToPlaylistName(playlistKebabMenu.pName)
              setRightTab('collection')
              showToast(`Mehfil Mode: Click tracks to add to "${playlistKebabMenu.pName}"`, 0)
              setPlaylistKebabMenu(null)
            }}>
              ＋ Add from Mehfil
            </button>
            <button onClick={() => {
              setEditingPlaylistName(playlistKebabMenu.pName)
              setEditNameInput(playlistKebabMenu.pName)
              setPlaylistKebabMenu(null)
            }}>
              ✎ Rename Playlist
            </button>
            <button className="del" onClick={() => {
              deletePlaylist(playlistKebabMenu.pName)
              setPlaylistKebabMenu(null)
            }}>
              ✕ Delete Playlist
            </button>
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

      {/* ── SEND A GHAZAL MODAL ── */}
      {showSendModal && curIdx >= 0 && (
        <SendModal 
          track={queue[curIdx]} 
          onClose={() => setShowSendModal(false)} 
          showToast={showToast} 
        />
      )}

      {/* ── RECEIVED GHAZAL MODAL ── */}
      {receivedNote && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ textAlign: 'center', border: '1px solid var(--gold)', boxShadow: '0 0 50px rgba(201,168,76,0.3)', width: '460px', maxWidth: '95vw' }}>
            <div className="modal-title" style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '22px', marginBottom: '8px' }}>
              A Gift of Melody
            </div>
            <div style={{ fontStyle: 'italic', color: 'var(--muted)', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '20px', textTransform: 'uppercase' }}>
              Someone has sent you a ghazal
            </div>
            
            {receivedNote.text && (
              <div className="received-note-content" style={{ 
                background: 'rgba(201, 168, 76, 0.05)', 
                border: '1px solid rgba(201, 168, 76, 0.15)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
                fontFamily: "'Amiri', serif",
                fontSize: '18px',
                color: 'var(--ivory)',
                lineHeight: '1.6',
                fontStyle: 'italic'
              }}>
                "{receivedNote.text}"
              </div>
            )}

            <div style={{ marginBottom: '30px' }}>
              <div style={{ color: 'var(--gold)', fontSize: '16px', fontFamily: "'Cinzel', serif", fontWeight: 'bold' }}>
                {playlist[receivedNote.trackIdx]?.songEn?.toUpperCase()}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px', letterSpacing: '0.1em' }}>
                BY {playlist[receivedNote.trackIdx]?.artistEn?.toUpperCase()}
              </div>
            </div>

            <button className="btn-primary" onClick={() => {
              loadTrack(receivedNote.trackIdx, true, playlist)
              setTonearmDown(true)
              setReceivedNote(null)
              window.history.replaceState({}, document.title, window.location.pathname)
            }} style={{ padding: '14px 28px', fontSize: '11px', letterSpacing: '0.1em' }}>
              LISTEN ON VINYL
            </button>
          </div>
        </div>
      )}
      {/* ── ADD FROM MEHFIL MODAL ── */}
      {showAddFromMehfilModal && (
        <AddFromMehfilModal
          userPlaylists={userPlaylists}
          setUserPlaylists={setUserPlaylists}
          setAddingToPlaylistName={setAddingToPlaylistName}
          setRightTab={setRightTab}
          onClose={() => setShowAddFromMehfilModal(false)}
          showToast={showToast}
        />
      )}

    </>
  )
}

function SendModal({ track, onClose, showToast }) {
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`
    const params = new URLSearchParams()
    params.set('track', track.uid)
    if (note.trim()) {
      params.set('note', note.trim())
    }
    return `${base}?${params.toString()}`
  }, [track.uid, note])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      showToast('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }).catch(err => {
      console.error('Failed to copy link: ', err)
    })
  }

  const shareWhatsApp = () => {
    const text = `Suno! I've sent you a beautiful ghazal: "${track.songEn}" by ${track.artistEn}\n\nListen to it here on the retro vinyl player:\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareTwitter = () => {
    const text = `Listening to "${track.songEn}" by ${track.artistEn} on Mehfil-e-Ghazal!`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const shareTelegram = () => {
    const text = `Suno! I've sent you a beautiful ghazal: "${track.songEn}" by ${track.artistEn}`
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '460px', maxWidth: '95vw', border: '1px solid var(--gold)' }}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <div className="modal-title" style={{ fontSize: '20px', letterSpacing: '0.05em' }}>SEND A GHAZAL</div>
        <div className="modal-sub">Share this beautiful melody with someone special</div>

        <div style={{ 
          background: 'rgba(201, 168, 76, 0.05)', 
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '8px', 
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 'bold', fontFamily: "'Cinzel', serif" }}>
            {track.songEn?.toUpperCase()}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
            BY {track.artistEn?.toUpperCase()}
          </span>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--gold3)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Personal Note (Optional)
          </label>
          <textarea 
            placeholder="Write a message to send along with the ghazal..." 
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: '80px', 
              background: 'rgba(201,168,76,0.05)', 
              border: '1px solid var(--border)', 
              borderRadius: '6px', 
              padding: '11px 13px', 
              color: 'var(--ivory)', 
              fontFamily: "'Amiri', serif", 
              fontSize: '16px', 
              outline: 'none', 
              resize: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--gold3)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Share Link
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              style={{ 
                flex: 1, 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                padding: '10px 12px', 
                color: 'var(--muted)', 
                fontSize: '11px', 
                margin: 0,
                outline: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} 
            />
            <button 
              onClick={copyToClipboard}
              className="btn-primary"
              style={{ 
                padding: '10px 16px', 
                fontSize: '11px', 
                letterSpacing: '0.1em',
                flexShrink: 0,
                background: copied ? '#2e7d32' : 'var(--gold)',
                color: copied ? '#fff' : '#0e0b07'
              }}
            >
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--gold3)', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>
            Or Share Directly Via
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button 
              onClick={shareWhatsApp}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                borderRadius: '6px',
                color: '#25D366',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)'}
            >
              WhatsApp
            </button>
            <button 
              onClick={shareTwitter}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              Twitter (X)
            </button>
            <button 
              onClick={shareFacebook}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(24, 119, 242, 0.1)',
                border: '1px solid rgba(24, 119, 242, 0.3)',
                borderRadius: '6px',
                color: '#1877F2',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(24, 119, 242, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(24, 119, 242, 0.1)'}
            >
              Facebook
            </button>
            <button 
              onClick={shareTelegram}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(0, 136, 204, 0.1)',
                border: '1px solid rgba(0, 136, 204, 0.3)',
                borderRadius: '6px',
                color: '#0088cc',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 136, 204, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 136, 204, 0.1)'}
            >
              Telegram
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddFromMehfilModal({ userPlaylists, setUserPlaylists, setAddingToPlaylistName, setRightTab, onClose, showToast }) {
  const [newPlaylistName, setNewPlaylistName] = useState('')
  
  const handleSelect = (pName) => {
    setAddingToPlaylistName(pName)
    setRightTab('collection')
    showToast(`Mehfil Mode: Click tracks to add to "${pName}"`, 0)
    onClose()
  }

  const handleCreate = () => {
    const trimmed = newPlaylistName.trim()
    if (!trimmed) return
    if (userPlaylists[trimmed]) {
      showToast('A playlist with that name already exists')
      return
    }
    setUserPlaylists(prev => ({ ...prev, [trimmed]: [] }))
    setAddingToPlaylistName(trimmed)
    setRightTab('collection')
    showToast(`Mehfil Mode: Click tracks to add to "${trimmed}"`, 0)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ border: '1px solid var(--gold)' }}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <div className="modal-title" style={{ fontSize: '20px', letterSpacing: '0.05em' }}>ADD FROM MEHFIL</div>
        <div className="modal-sub">Choose a playlist or create a new one to add songs from collection</div>

        {Object.keys(userPlaylists).length > 0 && (
          <>
            <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--gold3)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Select Existing Playlist
            </label>
            <div className="playlist-list" style={{ marginBottom: '20px' }}>
              {Object.keys(userPlaylists).map(name => (
                <button 
                  key={name} 
                  className="playlist-item"
                  onClick={() => handleSelect(name)}
                >
                  {name} <span>({userPlaylists[name].length} tracks)</span>
                </button>
              ))}
            </div>
            <div style={{ margin: '16px 0', textAlign: 'center', opacity: 0.3, letterSpacing: '0.1em' }}>— OR —</div>
          </>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--gold3)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Create New Playlist
          </label>
          <input 
            type="text" 
            placeholder="Enter new playlist name..." 
            value={newPlaylistName}
            onChange={e => setNewPlaylistName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newPlaylistName.trim()) {
                handleCreate()
              }
            }}
            style={{
              width: '100%',
              background: 'rgba(201,168,76,0.05)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '11px 13px',
              color: 'var(--ivory)',
              fontSize: '13px',
              outline: 'none',
              marginBottom: 0
            }}
          />
        </div>

        <div className="modal-actions">
          <button 
            className="btn-primary" 
            onClick={handleCreate}
            disabled={!newPlaylistName.trim()}
            style={{ padding: '12px', fontSize: '11px', letterSpacing: '0.15em' }}
          >
            Create & Add
          </button>
          <button 
            className="btn-sec" 
            onClick={onClose}
            style={{ padding: '12px 20px', fontSize: '11px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

