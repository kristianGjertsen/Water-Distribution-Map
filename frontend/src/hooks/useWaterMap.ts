import { mapIds } from '@/lib/mapConfig'
import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Geometry } from 'geojson'
import type { MapData } from '@/types/waterObjects'
import { getWaterPipes, getWaterPoints } from '@/services/mapServices'
import { addWaterMapLayers } from '@/lib/mapLayers'

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
  map.addSource(mapIds.pipesSource, { type: 'geojson', data: pipes })
  map.addSource(mapIds.pointsSource, { type: 'geojson', data: points })
  map.addSource(mapIds.selectedSource, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addSource(mapIds.draftSource, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  addWaterMapLayers(map)
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
export function useWaterMap() {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const [mapInstance, setMapInstance] = useState<Map | null>(null)
  const [data, setData] = useState<MapData | null>(null)
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
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },

          terrain: {
            type: 'raster-dem',
            tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
            encoding: 'terrarium',
            tileSize: 512,
            maxzoom: 12,
          },
        },
        layers: [
          { id: 'background-map', type: 'raster', source: 'osm' },
          {
            id: 'terrain-shading',
            type: 'hillshade',
            source: 'terrain',
            paint: {
              'hillshade-exaggeration': 0.2
            },
          },
        ],
        terrain: { source: 'terrain', exaggeration: 1 },
      },
    })
    mapRef.current = map
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.once('load', () => {
      void loadMapData(map, controller.signal).then((result) => {
        if (result && !controller.signal.aborted) { setData(result); setMapInstance(map) }
      }).catch(() => {
        if (!controller.signal.aborted) {
          setError('Kunne ikke hente kartdata. Last siden på nytt for å prøve igjen.')
        }
      })
    })
    return () => {
      controller.abort()
      mapRef.current = null
      map.remove()
    }
  }, [])
  return { container, mapRef, mapInstance, data, setData, error }
}
