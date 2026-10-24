import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ISS_TLE,
  parseTLE,
  propagate,
  eciToGeodetic,
  geodeticToCartesian,
} from '../utils/orbital'

const satrec = parseTLE(ISS_TLE)

// How many minutes to sample for past and future tracks
const PAST_MINUTES   = 92    // ~1 full orbit back
const FUTURE_MINUTES = 92    // ~1 full orbit ahead
const SAMPLE_SECONDS = 30    // one point every 30 seconds

// Build an array of XYZ points for a time range
function buildTrackPoints(centerDate, startOffsetMin, endOffsetMin) {
  const points = []
  const startMs = centerDate.getTime() + startOffsetMin * 60 * 1000
  const endMs   = centerDate.getTime() + endOffsetMin   * 60 * 1000
  const stepMs  = SAMPLE_SECONDS * 1000

  for (let t = startMs; t <= endMs; t += stepMs) {
    const date   = new Date(t)
    const posVel = propagate(satrec, date)
    if (!posVel || !posVel.position) continue

    const geo = eciToGeodetic(posVel.position, date)
    const xyz = geodeticToCartesian(geo.lat, geo.lon, geo.alt)
    points.push(new THREE.Vector3(xyz.x, xyz.y, xyz.z))
  }

  // Split into segments whenever the track wraps around the globe
  // (large jump in position = passing through the far side)
  const segments = []
  let current = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const dist = points[i].distanceTo(points[i - 1])
    if (dist > 0.5) {
      // Large jump — start a new segment
      if (current.length > 1) segments.push(current)
      current = [points[i]]
    } else {
      current.push(points[i])
    }
  }
  if (current.length > 1) segments.push(current)

  return segments
}

// ─── Past track (solid cyan line) ────────────────────────────────────────────
function PastTrack() {
  const groupRef = useRef()
  const lastUpdate = useRef(0)

  useFrame(() => {
    // Rebuild track every 30 seconds
    if (Date.now() - lastUpdate.current < 30000) return
    lastUpdate.current = Date.now()

    // Remove old lines
    if (groupRef.current) {
      groupRef.current.clear()
      const segments = buildTrackPoints(new Date(), -PAST_MINUTES, 0)

      segments.forEach((pts, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(pts)
        // Fade opacity along the track — older = more faded
        const totalSegs = segments.length
        const alpha = 0.15 + (i / totalSegs) * 0.55
        const material = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: alpha,
          linewidth: 1,
        })
        groupRef.current.add(new THREE.Line(geometry, material))
      })
    }
  })

  // Build initial track on mount
  useEffect(() => {
    if (!groupRef.current) return
    const segments = buildTrackPoints(new Date(), -PAST_MINUTES, 0)
    segments.forEach((pts, i) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(pts)
      const totalSegs = Math.max(segments.length, 1)
      const alpha = 0.15 + (i / totalSegs) * 0.55
      const material = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: alpha,
        linewidth: 1,
      })
      groupRef.current.add(new THREE.Line(geometry, material))
    })
    lastUpdate.current = Date.now()
  }, [])

  return <group ref={groupRef} />
}

// ─── Future track (dashed orange line) ───────────────────────────────────────
function FutureTrack() {
  const groupRef = useRef()
  const lastUpdate = useRef(0)

  function buildFuture() {
    if (!groupRef.current) return
    groupRef.current.clear()
    const segments = buildTrackPoints(new Date(), 0, FUTURE_MINUTES)

    segments.forEach((pts, i) => {
      const totalSegs = Math.max(segments.length, 1)
      // Fade out — closer = brighter
      const alpha = 0.45 - (i / totalSegs) * 0.35

      // Dashed effect: only draw every other sub-segment
      for (let j = 0; j < pts.length - 1; j += 2) {
        if (j + 1 >= pts.length) break
        const geo = new THREE.BufferGeometry().setFromPoints([pts[j], pts[j + 1]])
        const mat = new THREE.LineBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: alpha,
          linewidth: 1,
        })
        groupRef.current.add(new THREE.Line(geo, mat))
      }
    })
  }

  useEffect(() => {
    buildFuture()
    lastUpdate.current = Date.now()
  }, [])

  useFrame(() => {
    if (Date.now() - lastUpdate.current < 30000) return
    lastUpdate.current = Date.now()
    buildFuture()
  })

  return <group ref={groupRef} />
}

// ─── Exported combined component ─────────────────────────────────────────────
export default function GroundTrack() {
  return (
    <group>
      <PastTrack />
      <FutureTrack />
    </group>
  )
}