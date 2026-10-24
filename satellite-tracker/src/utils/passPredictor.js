import * as satellite from 'satellite.js'
import { parseTLE, ISS_TLE } from './orbital'

const satrec = parseTLE(ISS_TLE)

// ─── Constants ────────────────────────────────────────────────────────────────
const EARTH_RADIUS_KM = 6371
const DEG = Math.PI / 180

// ─── Convert lat/lon to ECEF unit vector ─────────────────────────────────────
function latLonToECEF(lat, lon) {
  const latR = lat * DEG
  const lonR = lon * DEG
  return {
    x: Math.cos(latR) * Math.cos(lonR),
    y: Math.cos(latR) * Math.sin(lonR),
    z: Math.sin(latR),
  }
}

// ─── Get satellite ECI position at a date ────────────────────────────────────
function getSatECI(date) {
  const posVel = satellite.propagate(satrec, date)
  if (!posVel || !posVel.position) return null
  return posVel.position // { x, y, z } in km (ECI frame)
}

// ─── Calculate elevation angle of satellite from observer ────────────────────
// Returns elevation in degrees (-90 to +90)
// Positive = above horizon = VISIBLE
export function getElevation(userLat, userLon, date) {
  const posECI = getSatECI(date)
  if (!posECI) return null

  const gmst = satellite.gstime(date)

  // Convert observer position to ECI
  const obsGeodetic = {
    latitude:  userLat * DEG,
    longitude: userLon * DEG,
    height: 0.01, // km above surface
  }

  const obsECI = satellite.geodeticToEci(obsGeodetic, gmst)

  // Vector from observer to satellite
  const rx = posECI.x - obsECI.x
  const ry = posECI.y - obsECI.y
  const rz = posECI.z - obsECI.z
  const rangeMag = Math.sqrt(rx * rx + ry * ry + rz * rz)

  // Observer's up vector in ECI (via ECEF then rotated by GMST)
  const cosLat = Math.cos(obsGeodetic.latitude)
  const sinLat = Math.sin(obsGeodetic.latitude)
  const cosLon = Math.cos(obsGeodetic.longitude + gmst)
  const sinLon = Math.sin(obsGeodetic.longitude + gmst)

  const upX = cosLat * cosLon
  const upY = cosLat * sinLon
  const upZ = sinLat

  // Elevation = angle between range vector and horizon plane
  // = arcsin of dot product of (range unit vector) and (up vector)
  const dot = (rx * upX + ry * upY + rz * upZ) / rangeMag
  const elevationRad = Math.asin(Math.max(-1, Math.min(1, dot)))

  return elevationRad / DEG // degrees
}

// ─── Find next pass over user location ───────────────────────────────────────
// Scans forward in time and returns pass details:
// { aos, los, maxEl, maxElTime, duration }
// aos = Acquisition Of Signal (rises above horizon)
// los = Loss Of Signal (drops below horizon)
export function findNextPass(userLat, userLon, startDate = new Date()) {
  const STEP_COARSE = 60      // seconds — coarse scan step
  const STEP_FINE   = 5       // seconds — fine scan near transitions
  const MAX_HOURS   = 12      // how far ahead to search
  const MIN_ELEV    = 0       // degrees — above this = visible

  const maxMs = startDate.getTime() + MAX_HOURS * 3600 * 1000
  let t = startDate.getTime()

  // ── Coarse scan: find when elevation crosses 0° ───────────────────────────
  let prevElev = getElevation(userLat, userLon, new Date(t))
  let aosMs = null
  let losMs = null
  let maxEl = -90
  let maxElTime = null

  while (t < maxMs) {
    t += STEP_COARSE * 1000
    const elev = getElevation(userLat, userLon, new Date(t))
    if (elev === null) continue

    if (prevElev <= MIN_ELEV && elev > MIN_ELEV) {
      // ── Rising: fine-scan backwards to find exact AOS ──
      let fineT = t - STEP_COARSE * 1000
      while (fineT < t) {
        const fineElev = getElevation(userLat, userLon, new Date(fineT))
        if (fineElev > MIN_ELEV) {
          aosMs = fineT
          break
        }
        fineT += STEP_FINE * 1000
      }
      if (!aosMs) aosMs = t
    }

    if (aosMs && elev > maxEl) {
      maxEl = elev
      maxElTime = new Date(t)
    }

    if (aosMs && prevElev > MIN_ELEV && elev <= MIN_ELEV) {
      // ── Setting: fine-scan backwards to find exact LOS ──
      let fineT = t - STEP_COARSE * 1000
      losMs = t
      while (fineT < t) {
        const fineElev = getElevation(userLat, userLon, new Date(fineT))
        if (fineElev <= MIN_ELEV) {
          losMs = fineT
          break
        }
        fineT += STEP_FINE * 1000
      }
      break // Found a complete pass
    }

    prevElev = elev
  }

  if (!aosMs || !losMs) return null

  return {
    aos:        new Date(aosMs),
    los:        new Date(losMs),
    maxEl:      Math.round(maxEl * 10) / 10,
    maxElTime,
    durationSec: Math.round((losMs - aosMs) / 1000),
  }
}

// ─── Format a Date as HH:MM:SS UTC ───────────────────────────────────────────
export function formatUTC(date) {
  if (!date) return '--:--:--'
  return date.toUTCString().slice(17, 25)
}

// ─── Format seconds as Xm Ys ─────────────────────────────────────────────────
export function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

// ─── Format countdown (ms until event) ───────────────────────────────────────
export function formatCountdown(targetDate) {
  const diffMs = targetDate.getTime() - Date.now()
  if (diffMs <= 0) return 'NOW'
  const totalSec = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}