import { useState, useEffect, useRef } from 'react'
import * as satellite from 'satellite.js'
import { useSatellite } from '../context/SatelliteContext'
import './ARView.css'

const DEG = Math.PI / 180

function getAzEl(userLat, userLon, satLat, satLon, satAlt) {
  const R = 6371
  const dLat = (satLat - userLat) * DEG
  const dLon = (satLon - userLon) * DEG
  const lat1 = userLat * DEG
  const lat2 = satLat * DEG
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  const groundDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const elevation = Math.atan2(satAlt, groundDist) / DEG
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon)
  const azimuth = ((Math.atan2(y, x) / DEG) + 360) % 360
  return { azimuth, elevation }
}

function azElToScreen(azimuth, elevation, phoneAzimuth, phonePitch, screenW, screenH) {
  let relAz = azimuth - phoneAzimuth
  while (relAz > 180)  relAz -= 360
  while (relAz < -180) relAz += 360
  const relEl = elevation - phonePitch
  const HFOV = 60
  const VFOV = 45
  const x = screenW/2 + (relAz / HFOV) * screenW
  const y = screenH/2 - (relEl / VFOV) * screenH
  const inView = x > -50 && x < screenW+50 && y > -50 && y < screenH+50
  return { x, y, inView }
}

const CAT_COLORS = {
  stations: '#4ade80',
  starlink: '#818cf8',
  weather:  '#fbbf24',
  amateur:  '#f472b6',
  active:   '#38bdf8',
}

export default function ARView() {
  const { catalogue, hudData } = useSatellite()
  const [isOpen, setIsOpen]           = useState(false)
  const [error, setError]             = useState(null)
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 })
  const [visibleSats, setVisibleSats] = useState([])
  const [selectedSat, setSelectedSat] = useState(null)
  const [screenSize, setScreenSize]   = useState({ w: window.innerWidth, h: window.innerHeight })

  const videoRef   = useRef()
  const streamRef  = useRef()
  const orientRef  = useRef({ alpha: 0, beta: 0, gamma: 0 })

  useEffect(() => {
    const onResize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleOrientation(e) {
    orientRef.current = {
      alpha: e.alpha || 0,
      beta:  e.beta  || 0,
      gamma: e.gamma || 0,
    }
    setOrientation({ ...orientRef.current })
  }

  async function startAR() {
    setError(null)
    setIsOpen(true)

    // Small delay to let the overlay render first
    await new Promise(r => setTimeout(r, 100))

    // Start camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      setError('Camera denied — ' + err.message)
    }

    // Start gyroscope
    window.addEventListener('deviceorientation', handleOrientation, true)
  }

  function stopAR() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    window.removeEventListener('deviceorientation', handleOrientation, true)
    setIsOpen(false)
    setVisibleSats([])
    setSelectedSat(null)
    setError(null)
  }

  // Calculate visible satellites
  useEffect(() => {
    if (!isOpen || !hudData.userLat) return
    function update() {
      const now  = new Date()
      const sats = []
      const pool = catalogue.slice(0, 500)
      for (const sat of pool) {
        try {
          const satrec = satellite.twoline2satrec(sat.line1, sat.line2)
          const pv     = satellite.propagate(satrec, now)
          if (!pv?.position) continue
          const gmst = satellite.gstime(now)
          const geo  = satellite.eciToGeodetic(pv.position, gmst)
          const lat  = satellite.degreesLat(geo.latitude)
          const lon  = satellite.degreesLong(geo.longitude)
          const alt  = geo.height
          const { azimuth, elevation } = getAzEl(
            hudData.userLat, hudData.userLon, lat, lon, alt
          )
          if (elevation > 0) {
            sats.push({ ...sat, azimuth, elevation, lat, lon, alt })
          }
        } catch {}
      }
      sats.sort((a, b) => b.elevation - a.elevation)
      setVisibleSats(sats.slice(0, 30))
    }
    update()
    const interval = setInterval(update, 2000)
    return () => clearInterval(interval)
  }, [isOpen, catalogue, hudData.userLat, hudData.userLon])

  const dots = visibleSats.map(sat => {
    const { x, y, inView } = azElToScreen(
      sat.azimuth, sat.elevation,
      orientRef.current.alpha,
      orientRef.current.beta,
      screenSize.w, screenSize.h,
    )
    return { ...sat, screenX: x, screenY: y, inView }
  }).filter(s => s.inView)

  return (
    <>
      {/* Trigger button — using onTouchEnd for Android */}
      <button
        className="ar-trigger"
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); startAR() }}
        onClick={startAR}
      >
        <span className="ar-trigger-icon">🔭</span>
        <span>SKY VIEW</span>
      </button>

      {isOpen && (
        <div className="ar-overlay">
          <video
            ref={videoRef}
            className="ar-video"
            autoPlay
            playsInline
            muted
          />
          <div className="ar-tint" />

          {dots.map((sat, i) => (
            <div
              key={i}
              className={`ar-dot ${selectedSat?.name === sat.name ? 'ar-dot--selected' : ''}`}
              style={{
                left: sat.screenX,
                top:  sat.screenY,
                '--dot-color': CAT_COLORS[sat.category] || '#38bdf8',
              }}
              onTouchEnd={(e) => { e.preventDefault(); setSelectedSat(sat) }}
              onClick={() => setSelectedSat(sat)}
            >
              <div className="ar-dot-circle" />
              <div className="ar-dot-label">
                <div className="ar-dot-name">{sat.name}</div>
                <div className="ar-dot-el">{sat.elevation.toFixed(1)}°</div>
              </div>
            </div>
          ))}

          <div className="ar-crosshair">
            <div className="ar-crosshair-h" />
            <div className="ar-crosshair-v" />
          </div>

          <div className="ar-hud-top">
            <div className="ar-hud-row">
              <span className="ar-hud-key">HEADING</span>
              <span className="ar-hud-val">{Math.round(orientation.alpha)}°</span>
            </div>
            <div className="ar-hud-row">
              <span className="ar-hud-key">PITCH</span>
              <span className="ar-hud-val">{Math.round(orientation.beta)}°</span>
            </div>
            <div className="ar-hud-row">
              <span className="ar-hud-key">VISIBLE SATS</span>
              <span className="ar-hud-val">{visibleSats.length}</span>
            </div>
          </div>

          {selectedSat && (
            <div className="ar-sat-info">
              <div className="ar-sat-name">{selectedSat.name}</div>
              <div className="ar-sat-details">
                <span>AZ {selectedSat.azimuth.toFixed(1)}°</span>
                <span>EL {selectedSat.elevation.toFixed(1)}°</span>
                <span>ALT {selectedSat.alt.toFixed(0)} km</span>
              </div>
              <button
                className="ar-sat-close"
                onTouchEnd={(e) => { e.preventDefault(); setSelectedSat(null) }}
                onClick={() => setSelectedSat(null)}
              >✕</button>
            </div>
          )}

          <div className="ar-compass">
            <div
              className="ar-compass-needle"
              style={{ transform: `rotate(${-orientation.alpha}deg)` }}
            >N</div>
          </div>

          <button
            className="ar-close"
            onTouchEnd={(e) => { e.preventDefault(); stopAR() }}
            onClick={stopAR}
          >✕ EXIT AR</button>

          {error && <div className="ar-error">{error}</div>}
        </div>
      )}
    </>
  )
}