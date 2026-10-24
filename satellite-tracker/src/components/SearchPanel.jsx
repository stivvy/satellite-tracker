import { useState, useMemo } from 'react'
import './SearchPanel.css'

const CAT_COLORS = {
  stations: '#4ade80',
  starlink: '#818cf8',
  weather:  '#fbbf24',
  amateur:  '#f472b6',
  active:   '#38bdf8',
}

export default function SearchPanel({
  satellites, categories, selectedIndex,
  onSelect, loadStatus, onCategoryFilter,
}) {
  const [query, setQuery]             = useState('')
  const [activeCategory, setCategory] = useState('all')
  const [focused, setFocused]         = useState(false)

  function handleCategory(key) {
    setCategory(key)
    onCategoryFilter?.(key === 'all' ? null : key)
  }

  // Only show results when user is actively searching or filtered to a category
  const showResults = focused || query.length > 0 || activeCategory !== 'all'

  const filtered = useMemo(() => {
    let pool = satellites
    if (activeCategory !== 'all')
      pool = pool.filter(s => s.category === activeCategory)
    if (query)
      pool = pool.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    return pool
  }, [satellites, query, activeCategory])

  const shown = filtered.slice(0, 15)
  const categoryKeys = categories ? Object.keys(categories) : []

  return (
    <div className={`search-panel ${showResults && shown.length > 0 ? 'search-panel--expanded' : ''}`}>

      {/* Search input */}
      <div className="search-input-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search satellites..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); setFocused(false) }}>✕</button>
        )}
      </div>

      {/* Category filters */}
      <div className="search-cats">
        <button
          className={`search-cat ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => handleCategory('all')}
        >ALL</button>
        {categoryKeys.map(key => (
          <button
            key={key}
            className={`search-cat ${activeCategory === key ? 'active' : ''}`}
            style={activeCategory === key ? {
              borderColor: CAT_COLORS[key],
              color: CAT_COLORS[key],
            } : {}}
            onClick={() => handleCategory(key)}
          >
            {categories[key]?.label?.toUpperCase() || key.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Loading status */}
      {loadStatus && !satellites.length && (
        <div className="search-status">{loadStatus}</div>
      )}

      {/* Results — only shown when searching or category selected */}
      {showResults && shown.length > 0 && (
        <div className="search-results">
          {shown.map((sat, i) => {
            const idx = satellites.indexOf(sat)
            return (
              <div
                key={i}
                className={`search-result ${selectedIndex === idx ? 'active' : ''}`}
                onClick={() => { onSelect(idx); setFocused(false) }}
              >
                <div className="search-result-left">
                  <span
                    className="search-result-dot"
                    style={{ background: CAT_COLORS[sat.category] || '#38bdf8' }}
                  />
                  <span className="search-result-name">{sat.name}</span>
                </div>
                <span className="search-result-cat">{sat.category}</span>
              </div>
            )
          })}
          <div className="search-results-hint">
            showing 15 of {filtered.length.toLocaleString()} — type to search
          </div>
        </div>
      )}

      {/* Total count — always visible */}
      {satellites.length > 0 && (
        <div className="search-count">
          {satellites.length.toLocaleString()} satellites tracked
        </div>
      )}
    </div>
  )
}