export async function loadCatalogue(onProgress) {
  onProgress?.('Loading satellite catalogue...')

  const res = await fetch('/satellites.json')
  if (!res.ok) throw new Error('Could not load satellites.json')

  const data = await res.json()
  const categories = {}

  // Build a map of norad -> satellite, letting later (more specific) groups overwrite
  // Order matters: active first, then specific categories overwrite
  const satMap = new Map()

  // First pass: load active as base
  for (const [key, group] of Object.entries(data.groups)) {
    if (!group.satellites?.length) continue
    categories[key] = {
      label:   group.label,
      color:   group.color,
    }
    group.satellites.forEach(s => {
      const id = s.norad || s.name
      // Only set if not already set by a more specific group
      if (!satMap.has(id)) {
        satMap.set(id, { ...s, category: key, color: group.color })
      }
    })
  }

  // Second pass: let specific categories (starlink, weather, amateur, stations) overwrite active
  const specificGroups = ['stations', 'starlink', 'weather', 'amateur']
  for (const key of specificGroups) {
    const group = data.groups[key]
    if (!group?.satellites?.length) continue
    group.satellites.forEach(s => {
      const id = s.norad || s.name
      // Overwrite with specific category
      satMap.set(id, { ...s, category: key, color: group.color })
    })
  }

  const all = Array.from(satMap.values())

  onProgress?.(`Ready — ${all.length.toLocaleString()} satellites`)
  return { satellites: all, categories }
}