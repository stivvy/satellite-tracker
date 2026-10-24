import { useState } from 'react'
import Scene from './components/Scene'
import HUD from './components/HUD'
import PassPanel from './components/PassPanel'
import SearchPanel from './components/SearchPanel'
import SatDetail from './components/SatDetail'
import LiveFeed from './components/LiveFeed'
import ARView from './components/ARView'
import { SatelliteProvider, useSatellite } from './context/SatelliteContext'
import './App.css'

function AppInner() {
  const {
    catalogue, categories, loadStatus,
    selectedIndex, selectSatellite,
    hudData, flyTarget,
  } = useSatellite()
  const [categoryFilter, setCategoryFilter] = useState(null)

  return (
    <div className="app">
      <Scene
        categoryFilter={categoryFilter}
        flyTarget={flyTarget}
      />
      <HUD />
      <PassPanel />
      <SatDetail />
      <LiveFeed />
      <ARView />
      <SearchPanel
        satellites={catalogue}
        categories={categories}
        selectedIndex={selectedIndex}
        onSelect={selectSatellite}
        loadStatus={loadStatus}
        onCategoryFilter={setCategoryFilter}
        userLat={hudData?.userLat}
        userLon={hudData?.userLon}
      />
    </div>
  )
}

export default function App() {
  return (
    <SatelliteProvider>
      <AppInner />
    </SatelliteProvider>
  )
}n