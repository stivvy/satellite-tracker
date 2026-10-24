import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geodeticToCartesian } from '../utils/orbital'
import { useSatellite } from '../context/SatelliteContext'

function surfacePoint(lat, lon) {
  return geodeticToCartesian(lat, lon, 0)
}

function PulseRing({ position }) {
  const ringRef = useRef()
  const scaleRef = useRef(1)

  useFrame((_, delta) => {
    if (!ringRef.current) return
    scaleRef.current += delta * 0.6
    if (scaleRef.current > 3) scaleRef.current = 1
    const s = scaleRef.current
    ringRef.current.scale.set(s, s, s)
    ringRef.current.material.opacity = Math.max(0, 0.6 - (s - 1) / 2.5)
  })

  return (
    <mesh ref={ringRef} position={[position.x, position.y, position.z]}>
      <ringGeometry args={[0.012, 0.016, 32]} />
      <meshBasicMaterial
        color={0x4ade80}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function UserMarker() {
  const [location, setLocation] = useState(null)
  const { setHudData } = useSatellite()

  useEffect(() => {
    if (!navigator.geolocation) return

    function onSuccess(pos) {
      const { latitude, longitude } = pos.coords
      setLocation({ lat: latitude, lon: longitude })
      setHudData(prev => ({ ...prev, userLat: latitude, userLon: longitude }))
    }

    function onError(err) {
      console.warn('GPS failed, using Nairobi default:', err.message)
      // Fallback to Nairobi coordinates so the app still works
      const lat = -1.2921
      const lon = 36.8219
      setLocation({ lat, lon })
      setHudData(prev => ({ ...prev, userLat: lat, userLon: lon }))
    }

    // Try low-accuracy first — works on localhost without HTTPS
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000,
    })
  }, [])

  if (!location) return null

  const pos = surfacePoint(location.lat, location.lon)

  return (
    <group>
      <mesh position={[pos.x, pos.y, pos.z]}>
        <sphereGeometry args={[0.007, 16, 16]} />
        <meshBasicMaterial color={0x4ade80} />
      </mesh>
      <PulseRing position={pos} />
    </group>
  )
}