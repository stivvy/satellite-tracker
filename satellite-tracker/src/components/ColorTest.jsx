import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ColorTest() {
  const ref = useRef()

  useEffect(() => {
    if (!ref.current) return
    const color = new THREE.Color()
    for (let i = 0; i < 10; i++) {
      color.setHSL(i / 10, 1, 0.5)
      ref.current.setColorAt(i, color)
    }
    ref.current.instanceColor.needsUpdate = true
  }, [])

  const dummy = new THREE.Object3D()
  useFrame(() => {
    if (!ref.current) return
    for (let i = 0; i < 10; i++) {
      dummy.position.set(i * 0.3 - 1.5, 1.5, 0)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, 10]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}