import { useEffect, useState } from 'react'
import { useSatellite } from '../context/SatelliteContext'
import { findNextPass, formatUTC, formatDuration, formatCountdown } from '../utils/passPredictor'
import './SatDetail.css'

const CAT_COLORS = {
  stations: '#4ade80',
  starlink: '#818cf8',
  weather:  '#fbbf24',
  amateur:  '#f472b6',
  active:   '#38bdf8',
}

export default function SatDetail() {
  const { selectedSat, hudData } = useSatellite()
  const [pass, setPass]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!selectedSat || !hudData.userLat) return
    setPass(null)
    setLoading(true)

    const worker = new Worker(
      new URL('../utils/passWorker.js', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e) => {
      if (e.data) {
        setPass({
          aos:         new Date(e.data.aos),
          los:         new Date(e.data.los),
          maxEl:       e.data.maxEl,
          durationSec: e.data.durationSec,
        })
      }
      setLoading(false)
      worker.terminate()
    }
    worker.postMessage({
      line1:   selectedSat.line1,
      line2:   selectedSat.line2,
      userLat: hudData.userLat,
      userLon: hudData.userLon,
    })
    return () => worker.terminate()
  }, [selectedSat?.name, hudData.userLat])

  useEffect(() => {
    if (!pass) return
    const t = setInterval(() => setCountdown(formatCountdown(pass.aos)), 1000)
    return () => clearInterval(t)
  }, [pass])

  if (!selectedSat) return null

  const color = CAT_COLORS[selectedSat.category] || '#38bdf8'

  return (
    <div className="sat-detail">
      <div className="sat-detail__header">
        <span className="sat-detail__dot" style={{ background: color }} />
        <div>
          <div className="sat-detail__name">{selectedSat.name}</div>
          <div className="sat-detail__meta">
            NORAD #{selectedSat.norad} · {selectedSat.category?.toUpperCase()}
          </div>
        </div>
        <div className="sat-detail__category" style={{ color }}>
          {selectedSat.category?.toUpperCase()}
        </div>
      </div>

      <div className="sat-detail__pass">
        <div className="sat-detail__pass-label">NEXT PASS OVER YOU</div>
        {loading && <div className="sat-detail__calculating">Calculating...</div>}
        {!loading && !pass && <div className="sat-detail__calculating">No pass in 12h</div>}
        {pass && (
          <div className="sat-detail__pass-data">
            <div className="sat-detail__countdown">{countdown || formatCountdown(pass.aos)}</div>
            <div className="sat-detail__pass-grid">
              <div>
                <div className="sat-detail__cell-label">AOS</div>
                <div className="sat-detail__cell-val">{formatUTC(pass.aos)}</div>
              </div>
              <div>
                <div className="sat-detail__cell-label">MAX EL</div>
                <div className="sat-detail__cell-val">{pass.maxEl}°</div>
              </div>
              <div>
                <div className="sat-detail__cell-label">DURATION</div>
                <div className="sat-detail__cell-val">{formatDuration(pass.durationSec)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}