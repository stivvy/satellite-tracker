import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../utils/orbital'

const DAY_URL     = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'
const NORMAL_URL  = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg'
const NIGHT_URL   = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png'

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 normal  = normalize(vNormal);
    float sunDot = dot(normal, normalize(sunDirection));

    // dayMix: 1 on day side, 0 on night side
    float dayMix   = smoothstep(-0.2, 0.2, sunDot);
    float nightMix = 1.0 - dayMix;

    vec4 dayColor   = texture2D(dayTexture,   vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);

    // Boost city lights so they're clearly visible
    vec3 lights = nightColor.rgb * 3.0;

    // Blend day and night
    vec3 color = dayColor.rgb * dayMix + lights * nightMix;

    // Blue tint at terminator line
    float terminator = smoothstep(0.0, 0.2, abs(sunDot));
    color = mix(color * vec3(0.5, 0.6, 0.9), color, terminator);

    gl_FragColor = vec4(color, 1.0);
  }
`

export default function Earth({ onWeatherUpdate }) {
  const meshRef     = useRef()
  const materialRef = useRef()
  const sunDir      = useRef(new THREE.Vector3(5, 3, 5).normalize())

  const [dayMap, normalMap, nightMap] = useLoader(TextureLoader, [
    DAY_URL, NORMAL_URL, NIGHT_URL,
  ])

  useFrame((_, delta) => {
    if (meshRef.current)
      meshRef.current.rotation.y += delta * (2 * Math.PI) / 86164
    if (materialRef.current)
      materialRef.current.uniforms.sunDirection.value.copy(sunDir.current)
  })

  return (
    <group>
      <Sphere ref={meshRef} args={[EARTH_RADIUS, 64, 64]}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            dayTexture:   { value: dayMap },
            nightTexture: { value: nightMap },
            sunDirection: { value: sunDir.current.clone() },
          }}
        />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere args={[EARTH_RADIUS * 1.015, 64, 64]}>
        <meshPhongMaterial
          color={0x4488ff}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </Sphere>

      {/* Outer haze */}
      <Sphere args={[EARTH_RADIUS * 1.03, 64, 64]}>
        <meshPhongMaterial
          color={0x2255cc}
          transparent
          opacity={0.025}
          depthWrite={false}
        />
      </Sphere>
    </group>
  )
}