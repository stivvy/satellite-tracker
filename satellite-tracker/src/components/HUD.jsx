import { useSatellite } from '../context/SatelliteContext'
import './HUD.css'

function fmt(n, decimals = 2) {
  return Number(n).toFixed(decimals)
}

function fmtCoord(deg, posLabel, negLabel) {
  const abs = Math.abs(deg)
  const dir = deg >= 0 ? posLabel : negLabel
  return `${fmt(abs, 4)}° ${dir}`
}

export default function HUD() {
  const { hudData } = useSatellite()

  return (
    <div className="hud">
      <div className="hud-panel hud-identity">
        <div className="hud-tag">TRACKING</div>
        <div className="hud-sat-name">{hudData.name}</div>
        <div className="hud-norad">NORAD #{hudData.noradId}</div>
      </div>

      <div className="hud-panel hud-position">
        <div className="hud-section-label">ISS POSITION</div>
        <div className="hud-row">
          <span className="hud-key">LAT</span>
          <span className="hud-val">{fmtCoord(hudData.lat, 'N', 'S')}</span>
        </div>
        <div className="hud-row">
          <span className="hud-key">LON</span>
          <span className="hud-val">{fmtCoord(hudData.lon, 'E', 'W')}</span>
        </div>
        <div className="hud-row">
          <span className="hud-key">ALT</span>
          <span className="hud-val">{fmt(hudData.alt, 1)} km</span>
        </div>

        {hudData.userLat !== undefined && (
          <>
            <div className="hud-divider" />
            <div className="hud-section-label hud-section-label--green">YOUR LOCATION</div>
            <div className="hud-row">
              <span className="hud-key">LAT</span>
              <span className="hud-val hud-val--green">{fmtCoord(hudData.userLat, 'N', 'S')}</span>
            </div>
            <div className="hud-row">
              <span className="hud-key">LON</span>
              <span className="hud-val hud-val--green">{fmtCoord(hudData.userLon, 'E', 'W')}</span>
            </div>
          </>
        )}
      </div>

      <div className="hud-panel hud-orbital">
        <div className="hud-section-label">ORBITAL DATA</div>
        <div className="hud-row">
          <span className="hud-key">VELOCITY</span>
          <span className="hud-val">{fmt(hudData.velocity, 2)} km/s</span>
        </div>
        <div className="hud-row">
          <span className="hud-key">PERIOD</span>
          <span className="hud-val">{fmt(hudData.period, 1)} min</span>
        </div>
        <div className="hud-row">
          <span className="hud-key">INCLINATION</span>
          <span className="hud-val">51.64°</span>
        </div>
      </div>

      <div className="hud-panel hud-status">
        <div className="hud-status-dot"></div>
        <span className="hud-status-text">LIVE</span>
      </div>

      <div className="corner tl" />
      <div className="corner tr" />
      <div className="corner bl" />
      <div className="corner br" />
    </div>
  )
}