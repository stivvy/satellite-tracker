import * as satellite from 'satellite.js'

const DEG = Math.PI / 180

function getElevation(satrec, userLat, userLon, date) {
  const posVel = satellite.propagate(satrec, date)
  if (!posVel || !posVel.position) return null

  const gmst = satellite.gstime(date)

  // Observer position in ECF (Earth-Centered Fixed)
  const obsEcf = satellite.geodeticToEcf({
    latitude:  userLat * DEG,
    longitude: userLon * DEG,
    height:    0.001,
  })

  // Satellite ECI → ECF
  const satEcf = satellite.eciToEcf(posVel.position, gmst)

  // Look angles from observer to satellite
  const lookAngles = satellite.ecfToLookAngles(
    { latitude: userLat * DEG, longitude: userLon * DEG, height: 0.001 },
    satEcf
  )

  return lookAngles.elevation / DEG
}

self.onmessage = function(e) {
  const { line1, line2, userLat, userLon } = e.data
  const satrec = satellite.twoline2satrec(line1, line2)

  const start  = Date.now()
  const MAX_MS = 12 * 3600 * 1000
  const STEP   = 60 * 1000
  const FINE   = 5  * 1000

  let t = start
  let prevElev = getElevation(satrec, userLat, userLon, new Date(t))
  let aosMs = null, losMs = null, maxEl = -90, maxElTime = null

  while (t < start + MAX_MS) {
    t += STEP
    const elev = getElevation(satrec, userLat, userLon, new Date(t))
    if (elev === null) continue

    if (prevElev <= 0 && elev > 0) {
      let ft = t - STEP
      while (ft < t) {
        if (getElevation(satrec, userLat, userLon, new Date(ft)) > 0) { aosMs = ft; break }
        ft += FINE
      }
      if (!aosMs) aosMs = t
    }

    if (aosMs && elev > maxEl) { maxEl = elev; maxElTime = new Date(t) }

    if (aosMs && prevElev > 0 && elev <= 0) {
      let ft = t - STEP
      losMs = t
      while (ft < t) {
        if (getElevation(satrec, userLat, userLon, new Date(ft)) <= 0) { losMs = ft; break }
        ft += FINE
      }
      break
    }
    prevElev = elev
  }

  if (!aosMs || !losMs) { self.postMessage(null); return }

  self.postMessage({
    aos:         aosMs,
    los:         losMs,
    maxEl:       Math.round(maxEl * 10) / 10,
    maxElTime:   maxElTime?.getTime(),
    durationSec: Math.round((losMs - aosMs) / 1000),
  })
}