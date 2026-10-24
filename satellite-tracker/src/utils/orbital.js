import * as satellite from 'satellite.js'

export const ISS_TLE = {
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   26041.52781250  .00013422  00000-0  24316-3 0  9997',
  line2: '2 25544  51.6419 142.3821 0002569  31.5282 328.6068 15.49422158438750',
}

export function parseTLE(tle) {
  return satellite.twoline2satrec(tle.line1, tle.line2)
}

export function propagate(satrec, date) {
  const posVel = satellite.propagate(satrec, date)
  if (!posVel.position) return null
  return posVel
}

export function eciToGeodetic(positionEci, date) {
  const gmst = satellite.gstime(date)
  const geodetic = satellite.eciToGeodetic(positionEci, gmst)
  return {
    lat: satellite.degreesLat(geodetic.latitude),
    lon: satellite.degreesLong(geodetic.longitude),
    alt: geodetic.height,
  }
}

export const EARTH_RADIUS = 1
export const KM_PER_UNIT  = 6371

export function geodeticToCartesian(lat, lon, altKm) {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  const r = EARTH_RADIUS + altKm / KM_PER_UNIT

  return {
    x:  r * Math.cos(latRad) * Math.cos(lonRad),
    y:  r * Math.sin(latRad),
    z: -r * Math.cos(latRad) * Math.sin(lonRad),
  }
}

export function velocityMagnitude(velocity) {
  if (!velocity) return 0
  return Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
}