import { createContext, useContext, useRef, useState, useEffect } from 'react'
import * as satellite from 'satellite.js'
import { loadCatalogue } from '../utils/catalogue'
import { geodeticToCartesian } from '../utils/orbital'

const SatelliteContext = createContext(null)

export function SatelliteProvider({ children }) {
  const positionRef = useRef({ lat: 0, lon: 0, alt: 0, x: 0, y: 0, z: 0 })

  const [hudData, setHudData] = useState({
    lat: 0, lon: 0, alt: 408, velocity: 7.66,
    period: 92.9, name: 'ISS (ZARYA)', noradId: 25544,
  })

  const [catalogue, setCatalogue]         = useState([])
  const [categories, setCategories]       = useState({})
  const [loadStatus, setLoadStatus]       = useState('Initializing...')
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [selectedSat, setSelectedSat]     = useState(null)
  const [flyTarget, setFlyTarget]         = useState(null)

  useEffect(() => {
    loadCatalogue((msg) => setLoadStatus(msg))
      .then(({ satellites, categories }) => {
        setCatalogue(satellites)
        setCategories(categories)
        setLoadStatus(`${satellites.length.toLocaleString()} satellites loaded`)
      })
      .catch(err => {
        console.error('Catalogue load failed:', err)
        setLoadStatus('Failed to load catalogue')
      })
  }, [])

  function selectSatellite(index, position) {
    setSelectedIndex(index)
    if (index !== null && catalogue[index]) {
      setSelectedSat(catalogue[index])
      setHudData(prev => ({
        ...prev,
        name: catalogue[index].name,
        noradId: catalogue[index].norad || '—',
      }))

      // If no position passed (clicked from list), calculate it now
      if (!position) {
        try {
          const sat    = catalogue[index]
          const satrec = satellite.twoline2satrec(sat.line1, sat.line2)
          const now    = new Date()
          const pv     = satellite.propagate(satrec, now)
          if (pv?.position) {
            const gmst = satellite.gstime(now)
            const geo  = satellite.eciToGeodetic(pv.position, gmst)
            const lat  = satellite.degreesLat(geo.latitude)
            const lon  = satellite.degreesLong(geo.longitude)
            const alt  = geo.height
            const xyz  = geodeticToCartesian(lat, lon, alt)
            position   = { ...xyz }
          }
        } catch (e) {
          console.warn('Could not compute position for fly-to')
        }
      }

      if (position) {
        setFlyTarget({ ...position, _t: Date.now() })
      }
    }
  }

  return (
    <SatelliteContext.Provider value={{
      positionRef, hudData, setHudData,
      catalogue, categories, loadStatus,
      selectedIndex, selectedSat, selectSatellite,
      flyTarget,
    }}>
      {children}
    </SatelliteContext.Provider>
  )
}

export function useSatellite() {
  return useContext(SatelliteContext)
}