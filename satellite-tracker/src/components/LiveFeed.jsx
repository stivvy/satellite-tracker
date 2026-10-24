import { useState, useEffect, useRef } from 'react'
import { useSatellite } from '../context/SatelliteContext'
import './LiveFeed.css'

// Great-circle distance between two lat/lon points in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// GOES-East full disk true color image — updates every 10 minutes
const GOES_URL = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/1808x1808.jpg'

// NASA ISS Live Stream (official YouTube live stream)
const ISS_STREAM_URL = 'https://www.youtube.com/embed/fO9e9jnhYK8?autoplay=1&mute=1&controls=1&rel=0'

const PROXIMITY_KM = 2000 // trigger distance

export default function LiveFeed() {
  const { hudData } = useSatellite()
  const [activeTab, setActiveTab]         = useState('iss') // 'iss' | 'goes'
  const [isOpen, setIsOpen]               = useState(false)
  const [isNearby, setIsNearby]           = useState(false)
  const [distanceKm, setDistanceKm]       = useState(null)
  const [goesUrl, setGoesUrl]             = useState(GOES_URL)
  const [goesLoaded, setGoesLoaded]       = useState(false)
  const [autoOpened, setAutoOpened]       = useState(false)
  const goesTimerRef = useRef(null)

  // Check ISS proximity every second
  useEffect(() => {
    if (!hudData.userLat || !hudData.lat) return

    const dist = haversineKm(
      hudData.userLat, hudData.userLon,
      hudData.lat, hudData.lon
    )
    setDistanceKm(Math.round(dist))

    const nearby = dist < PROXIMITY_KM
    setIsNearby(nearby)

    // Auto-open when ISS enters proximity for first time
    if (nearby && !autoOpened) {
      setIsOpen(true)
      setActiveTab('iss')
      setAutoOpened(true)
    }

    // Reset auto-open when ISS leaves
    if (!nearby && autoOpened) {
      setAutoOpened(false)
    }
  }, [hudData.lat, hudData.lon, hudData.userLat, hudData.userLon])

  // Refresh GOES image every 10 minutes
  useEffect(() => {
    function refreshGOES() {
      setGoesLoaded(false)
      setGoesUrl(`${GOES_URL}?t=${Date.now()}`)
    }
    goesTimerRef.current = setInterval(refreshGOES, 10 * 60 * 1000)
    return () => clearInterval(goesTimerRef.current)
  }, [])

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`livefeed-trigger ${isNearby ? 'livefeed-trigger--nearby' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="Live feeds"
      >
        <span className="livefeed-trigger-icon">📡</span>
        <span className="livefeed-trigger-label">LIVE</span>
        {isNearby && <span className="livefeed-trigger-ping" />}
      </button>

      {/* Main panel */}
      {isOpen && (
        <div className="livefeed-panel">

          {/* Header */}
          <div className="livefeed-header">
            <div className="livefeed-title">
              <span className="livefeed-dot" />
              LIVE FEEDS
            </div>
            <button className="livefeed-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* ISS proximity alert */}
          {isNearby && (
            <div className="livefeed-alert">
              <span className="livefeed-alert-icon">🛸</span>
              <span>
                ISS is {distanceKm?.toLocaleString()} km from you —
                <strong> live view from above your region</strong>
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="livefeed-tabs">
            <button
              className={`livefeed-tab ${activeTab === 'iss' ? 'active' : ''}`}
              onClick={() => setActiveTab('iss')}
            >
              🛸 ISS Live
            </button>
            <button
              className={`livefeed-tab ${activeTab === 'goes' ? 'active' : ''}`}
              onClick={() => setActiveTab('goes')}
            >
              🌍 GOES Earth
            </button>
          </div>

          {/* ISS Feed */}
          {activeTab === 'iss' && (
            <div className="livefeed-content">
              <div className="livefeed-video-wrap">
                <iframe
                  src={ISS_STREAM_URL}
                  title="ISS Live Stream"
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="livefeed-iframe"
                />
              </div>
              <div className="livefeed-info">
                <div className="livefeed-info-row">
                  <span className="livefeed-info-key">ISS POSITION</span>
                  <span className="livefeed-info-val">
                    {Math.abs(hudData.lat).toFixed(2)}°{hudData.lat >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(hudData.lon).toFixed(2)}°{hudData.lon >= 0 ? 'E' : 'W'}
                  </span>
                </div>
                <div className="livefeed-info-row">
                  <span className="livefeed-info-key">ALTITUDE</span>
                  <span className="livefeed-info-val">{hudData.alt?.toFixed(1)} km</span>
                </div>
                <div className="livefeed-info-row">
                  <span className="livefeed-info-key">DISTANCE FROM YOU</span>
                  <span className={`livefeed-info-val ${isNearby ? 'livefeed-info-val--nearby' : ''}`}>
                    {distanceKm?.toLocaleString()} km
                    {isNearby && ' 🟢'}
                  </span>
                </div>
                <div className="livefeed-note">
                  Black screen = ISS on night side · Blue screen = signal loss · ~5-30s delay
                </div>
              </div>
            </div>
          )}

          {/* GOES Feed */}
          {activeTab === 'goes' && (
            <div className="livefeed-content">
              <div className="livefeed-goes-wrap">
                {!goesLoaded && (
                  <div className="livefeed-loading">Loading latest Earth image...</div>
                )}
                <img
                  src={goesUrl}
                  alt="GOES-East Live Earth"
                  className="livefeed-goes-img"
                  style={{ opacity: goesLoaded ? 1 : 0 }}
                  onLoad={() => setGoesLoaded(true)}
                />
              </div>
              <div className="livefeed-info">
                <div className="livefeed-info-row">
                  <span className="livefeed-info-key">SOURCE</span>
                  <span className="livefeed-info-val">GOES-16 (GOES-East)</span>
                </div>
                <div className="livefeed-info-row">
                  <span className="livefeed-info-key">COVERAGE</span>
                  <span className="livefeed-info-val">Full Earth Disk</span>
                </div>
                <div className="livefeed-info-row">
                  <span className="livefeed-info-key">UPDATE RATE</span>
                  <span className="livefeed-info-val">Every 10 minutes</span>
                </div>
                <div className="livefeed-note">
                  True color imagery from 35,786 km altitude · NOAA / NESDIS
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}