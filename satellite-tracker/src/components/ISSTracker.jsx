import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Trail } from '@react-three/drei'
import * as THREE from 'three'
import {
  ISS_TLE,
  parseTLE,
  propagate,
  eciToGeodetic,
  geodeticToCartesian,
  velocityMagnitude,
} from '../utils/orbital'
import { useSatellite } from '../context/SatelliteContext'

// Parse the TLE once when the module loads — expensive operation
const satrec = parseTLE(ISS_TLE)

// How often to push data to the HUD (ms) — avoid flooding React state
const HUD_UPDATE_INTERVAL = 1000

export default function ISSTracker() {
  const meshRef = useRef()
  const lastHudUpdate = useRef(0)
  const { positionRef, setHudData } = useSatellite()

  // The animation loop — runs ~60 times per second via useFrame
  useFrame(() => {
    const now = new Date()

    // 1. Run SGP4 propagation for current timestamp
    const posVel = propagate(satrec, now)
    if (!posVel || !posVel.position) return

    // 2. Convert ECI → Geodetic (lat/lon/alt in degrees and km)
    const geo = eciToGeodetic(posVel.position, now)

    // 3. Convert Geodetic → Three.js Cartesian (XYZ)
    const xyz = geodeticToCartesian(geo.lat, geo.lon, geo.alt)

    // 4. Update the mesh position
    if (meshRef.current) {
      meshRef.current.position.set(xyz.x, xyz.y, xyz.z)
    }

    // 5. Store in shared ref (no React re-render, just for other components)
    positionRef.current = { ...geo, ...xyz }

    // 6. Throttled HUD update — only once per second
    const nowMs = Date.now()
    if (nowMs - lastHudUpdate.current > HUD_UPDATE_INTERVAL) {
      lastHudUpdate.current = nowMs
      setHudData(prev => ({
        ...prev,
        lat: geo.lat,
        lon: geo.lon,
        alt: geo.alt,
        velocity: velocityMagnitude(posVel.velocity),
      }))
    }
  })

  return (
    <Trail
      width={0.008}
      length={80}
      color={new THREE.Color(0x38bdf8)}
      attenuation={(t) => t * t}
    >
      <mesh ref={meshRef}>
        {/* ISS dot — small glowing sphere */}
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshBasicMaterial color={0x38bdf8} />
      </mesh>
    </Trail>
  )
}