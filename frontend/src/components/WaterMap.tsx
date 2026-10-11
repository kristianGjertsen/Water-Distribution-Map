import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LngLatBounds, Map, Marker, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONSource } from 'maplibre-gl'
import MapFilterPanel from '@/components/MapFilterPanel'
import { defaultFilters, filterFeatures, pipeCategories } from '@/lib/mapFilters'
import { getWaterPipes, getWaterPoints } from '@/services/mapServices'
import 'maplibre-gl/dist/maplibre-gl.css'
import CoordinateBox from '@/components/CoordinateBox'
import type { Coordinates } from '@/components/CoordinateBox'
import MapObjectEditor from '@/components/MapObjectEditor'
import { featureWithObject } from '@/services/mapObjectService'
import type { ObjectSelection, WaterObject } from '@/services/mapObjectService'

setWorkerUrl(workerUrl)

function extendBounds(bounds: LngLatBounds, geometry: Geometry) {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((item) => extendBounds(bounds, item))
    return
  }

  const positions = geometry.type === 'Point' ? [geometry.coordinates]
    : geometry.type === 'MultiPoint' || geometry.type === 'LineString' ? geometry.coordinates
      : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat(2)
        : geometry.coordinates.flat()

  for (const [lng, lat] of positions) bounds.extend([lng, lat])
}

async function loadMapData(map: Map, signal: AbortSignal) {
  const [pipes, points] = await Promise.all([getWaterPipes(), getWaterPoints()])
  if (signal.aborted) return

  map.addSource('water-pipes', { type: 'geojson', data: pipes })
  map.addSource('water-points', { type: 'geojson', data: points })

  map.addLayer({
    id: 'water-pipes-layer',
    type: 'line',
    source: 'water-pipes',
    layout: { 'line-sort-key': ['match', ['get', 'pipe_category'], 'main', 1, 0] },
    paint: {
      'line-color': ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.color, 'service', pipeCategories.service.color, pipeCategories.unknown.color],
      'line-width': ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.width, pipeCategories.service.width],
    },
  })
  map.addLayer({
    id: 'water-points-layer',
    type: 'circle',
    source: 'water-points',
    paint: {
      'circle-radius': 5,
      'circle-color': '#ffaa00',
      'circle-stroke-color': '#000000',
      'circle-stroke-width': 2,
      'circle-pitch-alignment': 'map',
      'circle-pitch-scale': 'viewport',
    },
  })

  map.addSource('selected-object', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'selected-pipe', type: 'line', source: 'selected-object',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#22d3ee', 'line-width': 10 },
  }, 'water-pipes-layer')
  map.addLayer({
    id: 'selected-point', type: 'circle', source: 'selected-object',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-color': '#22d3ee', 'circle-radius': 10, 'circle-pitch-alignment': 'map', 'circle-pitch-scale': 'viewport' },
  }, 'water-points-layer')

  const bounds = new LngLatBounds()
  for (const collection of [pipes, points]) {
    for (const { geometry } of collection.features) {
      if (geometry) extendBounds(bounds, geometry)
    }
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 48, maxZoom: 17, pitch: 60, duration: 0 })
  }
  return { pipes, points }
}

function WaterMap() {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const pinnedRef = useRef(false)
  const [data, setData] = useState<{ pipes: FeatureCollection; points: FeatureCollection } | null>(null)
  const [filters, setFilters] = useState(defaultFilters)
  const dataRef = useRef(data)
  const [mode, setMode] = useState<'coordinates' | 'objects'>('coordinates')
  const modeRef = useRef(mode)
  const [selected, setSelected] = useState<ObjectSelection | null>(null)
  const [candidates, setCandidates] = useState<ObjectSelection[]>([])
  const editingRef = useRef({ dirty: false, saving: false })
  const selectionKeyRef = useRef<string | null>(null)
  const updateEditingState = useCallback((dirty: boolean, saving: boolean) => {
    editingRef.current = { dirty, saving }
  }, [])

  const canLeaveEditor = useCallback(() => {
    if (editingRef.current.saving) return false
    return !editingRef.current.dirty || window.confirm('Forkaste ulagrede endringer?')
  }, [])

  const selectObject = useCallback((next: ObjectSelection, nearby: ObjectSelection[] = [next]) => {
    const key = `${next.kind}:${next.feature.id}`
    if (key !== selectionKeyRef.current) {
      if (!canLeaveEditor()) return false
      editingRef.current = { dirty: false, saving: false }
    }
    selectionKeyRef.current = key
    modeRef.current = 'objects'
    setMode('objects')
    setSelected(next)
    setCandidates(nearby)
    markerRef.current?.remove()
    markerRef.current = null
    return true
  }, [canLeaveEditor])

  function closeEditor() {
    if (!canLeaveEditor()) return
    editingRef.current = { dirty: false, saving: false }
    selectionKeyRef.current = null
    setSelected(null)
    setCandidates([])
  }

  function handleSaved(selection: ObjectSelection, record: WaterObject) {
    const feature = featureWithObject(selection.feature, record)
    setData((current) => current ? {
      ...current,
      [selection.kind]: {
        ...current[selection.kind],
        features: current[selection.kind].features.map((item) => String(item.id) === String(record.id) ? feature : item),
      },
    } : current)
    setSelected({ ...selection, feature })
    setCandidates((current) => current.map((item) => item.kind === selection.kind && String(item.feature.id) === String(record.id) ? { ...item, feature } : item))
  }

  useEffect(() => { dataRef.current = data }, [data])
  const filtered = useMemo(() => data ? {
    pipes: filterFeatures(data.pipes, filters, 'pipes'),
    points: filterFeatures(data.points, filters, 'points'),
  } : null, [data, filters])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !filtered) return
    const pipes = map.getSource('water-pipes') as GeoJSONSource | undefined
    const points = map.getSource('water-points') as GeoJSONSource | undefined
    pipes?.setData(filtered.pipes)
    points?.setData(filtered.points)
  }, [filtered])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-object') as GeoJSONSource | undefined
    const visible = selected && filtered?.[selected.kind].features.find((feature) => String(feature.id) === String(selected.feature.id))
    source?.setData({ type: 'FeatureCollection', features: visible ? [visible] : [] })
  }, [selected, filtered])
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [pinned, setPinned] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!container.current) return

    const controller = new AbortController()
    setError(null)

    const map = new Map({
      container: container.current,
      center: [10.615, 59.691],
      zoom: 14,
      pitch: 60,
      maxPitch: 80,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
          terrain: {
            type: 'raster-dem',
            url: 'https://tiles.mapterhorn.com/tilejson.json',
            encoding: 'terrarium',
            tileSize: 512,
          },
          hillshade: {
            type: 'raster-dem',
            url: 'https://tiles.mapterhorn.com/tilejson.json',
            encoding: 'terrarium',
            tileSize: 512,
          },
        },
        layers: [
          { id: 'background-map', type: 'raster', source: 'osm' },
          {
            id: 'terrain-shading',
            type: 'hillshade',
            source: 'hillshade',
            paint: { 'hillshade-exaggeration': 0.3 },
          },
        ],
        terrain: { source: 'terrain', exaggeration: 1 },
      },
    })

    mapRef.current = map

    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')

    function nearbyObjects(point: { x: number; y: number }): ObjectSelection[] {
      if (!dataRef.current || !map.getLayer('water-points-layer')) return []
      const hits = map.queryRenderedFeatures([[point.x - 5, point.y - 5], [point.x + 5, point.y + 5]], {
        layers: ['water-points-layer', 'water-pipes-layer'],
      })
      const seen = new Set<string>()
      return hits.flatMap((hit) => {
        const kind = hit.source === 'water-pipes' ? 'pipes' : 'points'
        const key = `${kind}:${hit.id}`
        if (seen.has(key)) return []
        seen.add(key)
        // Rendered geometries may be clipped to tiles; edit the complete source feature.
        const feature = dataRef.current?.[kind].features.find((item) => String(item.id) === String(hit.id))
        return feature ? [{ kind, feature } as ObjectSelection] : []
      })
    }

    map.on('mousemove', ({ lngLat, point }) => {
      if (modeRef.current === 'objects') {
        map.getCanvas().style.cursor = nearbyObjects(point).length ? 'pointer' : ''
        return
      }
      map.getCanvas().style.cursor = 'crosshair'
      if (!pinnedRef.current) {
        const { lng, lat } = lngLat.wrap()
        setCoordinates({ lng, lat })
      }
    })
    map.on('click', ({ lngLat, point }) => {
      if (modeRef.current === 'objects') {
        const nearby = nearbyObjects(point)
        if (nearby.length) selectObject(nearby[0], nearby)
        return
      }
      const { lng, lat } = lngLat.wrap()
      pinnedRef.current = true
      setPinned(true)
      setCoordinates({ lng, lat })
      markerRef.current?.remove()
      markerRef.current = new Marker({ color: '#0f172a' })
        .setLngLat([lng, lat])
        .addTo(map)
    })

    map.once('load', () => {
      void loadMapData(map, controller.signal).then((result) => {
        if (result && !controller.signal.aborted) setData(result)
      }).catch(() => {
        if (!controller.signal.aborted) {
          setError('Kunne ikke hente kartdata. Last siden på nytt for å prøve igjen.')
        }
      })
    })

    return () => {
      controller.abort()
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [selectObject])

  return (
    <main className="relative h-dvh w-full">
      <div ref={container} className="h-full w-full" aria-label="Kart over vannledningsnettet" />
      <aside className="absolute top-4 bottom-28 left-4 w-80 max-w-[calc(100%-5rem)] space-y-3 overflow-y-auto">
        <div role="group" aria-label="Klikkmodus" className="flex gap-1 rounded-lg bg-white p-1 shadow">
          {(['coordinates', 'objects'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => {
              if (value === mode || !canLeaveEditor()) return
              editingRef.current = { dirty: false, saving: false }
              selectionKeyRef.current = null
              setSelected(null)
              setCandidates([])
              modeRef.current = value
              setMode(value)
              pinnedRef.current = false
              setPinned(false)
              setCoordinates(null)
              markerRef.current?.remove()
              markerRef.current = null
              if (mapRef.current) mapRef.current.getCanvas().style.cursor = value === 'coordinates' ? 'crosshair' : ''
            }} className={`flex-1 rounded px-3 py-2 text-sm font-medium ${mode === value ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
              {value === 'coordinates' ? 'Koordinater' : 'Velg objekt'}
            </button>
          ))}
        </div>
        {mode === 'objects' && <p className="rounded-lg bg-white/95 p-3 text-sm shadow">Klikk på en ledning eller et punkt for å se og endre informasjon.</p>}
        {mode === 'coordinates' && <CoordinateBox
          key={pinned ? `${coordinates?.lng},${coordinates?.lat}` : 'live'}
          coordinates={coordinates}
          pinned={pinned}
          onResume={() => {
            pinnedRef.current = false
            setPinned(false)
            setCoordinates(null)
            markerRef.current?.remove()
            markerRef.current = null
          }}
        />}
        <MapFilterPanel
          filters={filters}
          onChange={setFilters}
          pipes={filtered?.pipes ?? null}
          points={filtered?.points ?? null}
          total={(data?.pipes.features.length ?? 0) + (data?.points.features.length ?? 0)}
          onSelect={(feature, kind) => {
            if (!selectObject({ feature, kind })) return
            if (!feature.geometry || !mapRef.current) return
            const bounds = new LngLatBounds()
            extendBounds(bounds, feature.geometry)
            if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, {
              padding: { top: 60, right: Math.min(420, (container.current?.clientWidth ?? 800) / 3), bottom: 100, left: Math.min(360, (container.current?.clientWidth ?? 800) / 3) },
              maxZoom: 18, duration: 600,
            })
          }}
        />
      </aside>
      {selected && mode === 'objects' && (
        <aside aria-label="Objektinformasjon" className="absolute top-4 right-4 bottom-4 z-10 w-96 max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{selected.kind === 'pipes' ? 'Ledning' : 'Punkt'} #{selected.feature.id}</h2>
            <button type="button" onClick={closeEditor} className="text-sm text-slate-600 underline">Lukk</button>
          </div>
          {candidates.length > 1 && (
            <label className="mb-4 block text-sm">Flere objekter på dette stedet
              <select value={`${selected.kind}:${selected.feature.id}`} onChange={(event) => {
                const next = candidates.find((item) => `${item.kind}:${item.feature.id}` === event.target.value)
                if (next) selectObject(next, candidates)
              }} className="mt-1 w-full rounded border border-slate-300 p-2">
                {candidates.map((item) => <option key={`${item.kind}:${item.feature.id}`} value={`${item.kind}:${item.feature.id}`}>{item.kind === 'pipes' ? 'Ledning' : 'Punkt'} #{item.feature.id}</option>)}
              </select>
            </label>
          )}
          <MapObjectEditor key={`${selected.kind}:${selected.feature.id}`} selection={selected} onSaved={handleSaved} onEditingState={updateEditingState} />
        </aside>
      )}
      {error && (
        <p role="alert" className="absolute bottom-32 left-4 right-16 rounded bg-white p-3 text-sm text-red-700 shadow">
          {error}
        </p>
      )}
    </main>
  )
}

export default WaterMap
