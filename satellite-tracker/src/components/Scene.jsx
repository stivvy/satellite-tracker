import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import Earth from './Earth'
import ISSTracker from './ISSTracker'
import Starfield from './Starfield'
import GroundTrack from './GroundTrack'
import UserMarker from './UserMarker'
import SatelliteSwarm from './SatelliteSwarm'
import { useSatellite } from '../context/SatelliteContext'

function CameraController({ targetPosition }) {
  const { camera, controls } = useThree()
  const animating = useRef(false)
  const startPos  = useRef(new THREE.Vector3())
  const endPos    = useRef(new THREE.Vector3())
  const progress  = useRef(0)

  useEffect(() => {
    if (!targetPosition) return
    const dir = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
      .normalize()
      .multiplyScalar(2.5)
    startPos.current.copy(camera.position)
    endPos.current.copy(dir)
    progress.current = 0
    animating.current = true
  }, [targetPosition])

  useEffect(() => {
    if (!animating.current) return
    let frameId
    const animate = () => {
      if (!animating.current) return
      progress.current += 0.02
      const t = progress.current < 1 ? 1 - Math.pow(1 - progress.current, 3) : 1
      camera.position.lerpVectors(startPos.current, endPos.current, t)
      camera.lookAt(0, 0, 0)
      if (controls?.target) {
        controls.target.set(0, 0, 0)
        controls.update?.()
      }
      if (progress.current >= 1) {
        animating.current = false
      } else {
        frameId = requestAnimationFrame(animate)
      }
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [targetPosition])

  return null
}

export default function Scene({ categoryFilter, flyTarget, onWeatherUpdate }) {
  const { catalogue, selectedIndex, selectSatellite } = useSatellite()

  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45, near: 0.001, far: 1000 }}
      style={{ background: '#000005' }}
      gl={{ antialias: true, alpha: false }}
    >
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={2.5} color={0xfff5e0} />
      <directionalLight position={[-5, -2, -3]} intensity={0.08} color={0x4466ff} />

      <Starfield />
      <CameraController targetPosition={flyTarget} />

      <Suspense fallback={null}>
        <Earth onWeatherUpdate={onWeatherUpdate} />
        <GroundTrack />
        <ISSTracker />
        <UserMarker />
        {catalogue.length > 0 && (
          <SatelliteSwarm
            satellites={catalogue}
            selectedIndex={selectedIndex}
            onSelect={selectSatellite}
            categoryFilter={categoryFilter}
          />
        )}
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={1.2}
        maxDistance={8}
        rotateSpeed={0.4}
        zoomSpeed={0.6}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  )
}