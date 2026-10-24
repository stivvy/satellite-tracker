import { useState, useEffect, useRef } from 'react'
import { formatUTC, formatDuration, formatCountdown } from '../utils/passPredictor'
import { ISS_TLE } from '../utils/orbital'
import { useSatellite } from '../context/SatelliteContext'
import './PassPanel.css'

export default function PassPanel() {
  const { hudData } = useSatellite()
  const [pass, setPass]           = useState(null)
  const [countdown, setCountdown] = useState('')
  const [status, setStatus]       = useState('waiting')
  const workerRef = useRef(null)
  const calcDone  = useRef(false)

  useEffect(() => {
    if (!hudData.userLat || calcDone.current) return
    calcDone.current = true
    setStatus('calculating')

    // Spin up the web worker
    workerRef.current = new Worker(
      new URL('../utils/passWorker.js', import.meta.url),
      { type: 'module' }
    )

    workerRef.current.onmessage = (e) => {
      if (!e.data) { setStatus('none'); return }
      const d = e.data
      setPass({
        aos:         new Date(d.aos),
        los:         new Date(d.los),
        maxEl:       d.maxEl,
        maxElTime:   d.maxElTime ? new Date(d.maxElTime) : null,
        durationSec: d.durationSec,
      })
      setStatus('waiting')
      workerRef.current.terminate()
    }

    workerRef.current.postMessage({
      line1:   ISS_TLE.line1,
      line2:   ISS_TLE.line2,
      userLat: hudData.userLat,
      userLon: hudData.userLon,
    })

    return () => workerRef.current?.terminate()
  }, [hudData.userLat])

  useEffect(() => {
    if (!pass) return
    const interval = setInterval(() => {
      const now = Date.now()
      if (now >= pass.aos.getTime() && now <= pass.los.getTime()) {
        setStatus('visible')
        setCountdown(formatCountdown(pass.los))
      } else if (now < pass.aos.getTime()) {
        setStatus('waiting')
        setCountdown(formatCountdown(pass.aos))
      } else {
        calcDone.current = false
        setPass(null)
        setStatus('waiting')
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [pass])

  if (!hudData.userLat) return null

  return (
    <div className={`pass-panel ${status === 'visible' ? 'pass-panel--visible' : ''}`}>
      <div className="pass-panel__header">
        <span className="pass-panel__label">NEXT PASS OVER YOUR LOCATION</span>
        {status === 'visible' && (
          <span className="pass-panel__badge pass-panel__badge--visible">VISIBLE NOW</span>
        )}
      </div>

      {status === 'calculating' && (
        <div className="pass-panel__calculating">Calculating...</div>
      )}
      {status === 'none' && (
        <div className="pass-panel__calculating">No pass found in 12h</div>
      )}

      {pass && status !== 'calculating' && (
        <>
          <div className="pass-panel__countdown">
            <span className="pass-panel__countdown-label">
              {status === 'visible' ? 'ENDS IN' : 'IN'}
            </span>
            <span className={`pass-panel__countdown-value ${status === 'visible' ? 'pass-panel__countdown-value--visible' : ''}`}>
              {countdown}
            </span>
          </div>
          <div className="pass-panel__grid">
            <div className="pass-panel__cell">
              <div className="pass-panel__cell-label">AOS</div>
              <div className="pass-panel__cell-value">{formatUTC(pass.aos)}</div>
              <div className="pass-panel__cell-sub">UTC</div>
            </div>
            <div className="pass-panel__cell">
              <div className="pass-panel__cell-label">MAX EL</div>
              <div className="pass-panel__cell-value">{pass.maxEl}°</div>
              <div className="pass-panel__cell-sub">{pass.maxEl > 60 ? 'EXCELLENT' : pass.maxEl > 30 ? 'GOOD' : 'LOW'}</div>
            </div>
            <div className="pass-panel__cell">
              <div className="pass-panel__cell-label">LOS</div>
              <div className="pass-panel__cell-value">{formatUTC(pass.los)}</div>
              <div className="pass-panel__cell-sub">UTC</div>
            </div>
            <div className="pass-panel__cell">
              <div className="pass-panel__cell-label">DURATION</div>
              <div className="pass-panel__cell-value">{formatDuration(pass.durationSec)}</div>
              <div className="pass-panel__cell-sub">TOTAL</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}