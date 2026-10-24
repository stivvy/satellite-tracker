import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as satellite from 'satellite.js'
import { geodeticToCartesian } from '../utils/orbital'

function parseSatrecs(sats) {
  return sats.map(s => {
    try { return satellite.twoline2satrec(s.line1, s.line2) }
    catch { return null }
  })
}

const CATEGORY_INFO = [
  { key: 'stations', color: 0x4ade80 },
  { key: 'starlink', color: 0x818cf8 },
  { key: 'weather',  color: 0xfbbf24 },
  { key: 'amateur',  color: 0xf472b6 },
  { key: 'active',   color: 0x38bdf8 },
]

function CategoryMesh({ sats, satrecs, color, dimmed, selectedGlobalIndex, globalOffset, onSelect, positions }) {
  const meshRef = useRef()
  const dummy   = useMemo(() => new THREE.Object3D(), [])
  const count   = sats.length

  useFrame(() => {
    if (!meshRef.current || !count) return
    const now = new Date()
    for (let i = 0; i < count; i++) {
      const satrec = satrecs[i]
      if (!satrec) {
        dummy.position.set(0, -10, 0)
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }
      try {
        const pv = satellite.propagate(satrec, now)
        if (!pv?.position) throw new Error()
        const gmst = satellite.gstime(now)
        const geo  = satellite.eciToGeodetic(pv.position, gmst)
        const lat  = satellite.degreesLat(geo.latitude)
        const lon  = satellite.degreesLong(geo.longitude)
        const alt  = geo.height
        const xyz  = geodeticToCartesian(lat, lon, alt)
        positions[globalOffset + i] = { ...xyz, lat, lon, alt }
        dummy.position.set(xyz.x, xyz.y, xyz.z)
        const isSelected = (globalOffset + i) === selectedGlobalIndex
        dummy.scale.setScalar(isSelected ? 3 : 1)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
      } catch {
        dummy.position.set(0, -10, 0)
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (e.instanceId !== undefined && onSelect)
      onSelect(globalOffset + e.instanceId)
  }

  if (!count) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      onClick={handleClick}
    >
      <sphereGeometry args={[0.004, 4, 4]} />
      <meshBasicMaterial
        color={dimmed ? 0x1e293b : color}
        transparent={dimmed}
        opacity={dimmed ? 0.2 : 1}
      />
    </instancedMesh>
  )
}

export default function SatelliteSwarm({ satellites, selectedIndex, onSelect, categoryFilter }) {
  const allSatrecs = useMemo(() => satellites.map(s => {
    try { return satellite.twoline2satrec(s.line1, s.line2) }
    catch { return null }
  }), [satellites])

  const positions = useRef([])

  // Group satellites by category
  const groups = useMemo(() => {
    const map = {}
    CATEGORY_INFO.forEach(c => { map[c.key] = { sats: [], satrecs: [], indices: [], color: c.color } })
    satellites.forEach((sat, i) => {
      const key = sat.category || 'active'
      if (!map[key]) map[key] = { sats: [], satrecs: [], indices: [], color: 0x38bdf8 }
      map[key].sats.push(sat)
      map[key].satrecs.push(allSatrecs[i])
      map[key].indices.push(i)
    })
    return map
  }, [satellites, allSatrecs])

  if (!satellites.length) return null

  return (
    <group>
      {CATEGORY_INFO.map(({ key, color }) => {
        const group = groups[key]
        if (!group?.sats.length) return null
        const dimmed = categoryFilter && categoryFilter !== key
        const globalOffset = group.indices[0] || 0
        return (
          <CategoryMesh
            key={key}
            sats={group.sats}
            satrecs={group.satrecs}
            color={color}
            dimmed={dimmed}
            selectedGlobalIndex={selectedIndex}
            globalOffset={globalOffset}
            onSelect={onSelect}
            positions={positions.current}
          />
        )
      })}
    </group>
  )
}