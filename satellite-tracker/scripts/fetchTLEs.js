import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const GROUPS = [
  { key: 'stations', label: 'Space Stations', color: 4513664  },
  { key: 'active',   label: 'Active',          color: 9868950  },
  { key: 'starlink', label: 'Starlink',         color: 6579300  },
  { key: 'weather',  label: 'Weather',          color: 16498468 },
  { key: 'amateur',  label: 'Amateur Radio',    color: 6640364  },
]

function parseTLEText(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const sats  = []
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name  = lines[i].replace(/^0 /, '').trim()
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
      const norad = line1.substring(2, 7).trim()
      sats.push({ name, line1, line2, norad })
    }
  }
  return sats
}

async function fetchGroup(key) {
  // Request TLE format — returns raw 3-line TLE text
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${key}&FORMAT=TLE`
  console.log(`Fetching ${key}...`)
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 Educational Satellite Tracker',
      'Accept': 'text/plain',
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  if (text.includes('No GP data found')) throw new Error('No data')
  const sats = parseTLEText(text)
  console.log(`  ✓ ${key}: ${sats.length} satellites`)
  return sats
}

async function main() {
  const result = { fetchedAt: new Date().toISOString(), groups: {} }

  for (const group of GROUPS) {
    try {
      const sats = await fetchGroup(group.key)
      result.groups[group.key] = {
        label:      group.label,
        color:      group.color,
        satellites: sats,
      }
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.warn(`  ✗ ${group.key} failed:`, err.message)
      result.groups[group.key] = { label: group.label, color: group.color, satellites: [] }
    }
  }

  const outDir  = join(__dirname, '..', 'public')
  const outFile = join(outDir, 'satellites.json')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, JSON.stringify(result))

  const total = Object.values(result.groups).reduce((s, g) => s + g.satellites.length, 0)
  console.log(`\nDone! ${total} satellites saved to public/satellites.json`)
}

main()