import { useEffect, useRef } from 'react'
import { LngLatBounds, Map, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, LineString, Point } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

const files = import.meta.glob('./assets/map/*.geojson', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const layers = Object.entries(files).map(([path, contents]) => ({
  id: path.split('/').pop()!.replace('.geojson', ''),
  data: JSON.parse(contents as string) as FeatureCollection<LineString | Point>,
}))

const bounds = new LngLatBounds()
for (const { data } of layers) {
  for (const { geometry } of data.features) {
    const positions = geometry.type === 'Point'
      ? [geometry.coordinates]
      : geometry.coordinates
    for (const [lng, lat] of positions) bounds.extend([lng, lat])
  }
}

function App() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    const map = new Map({
      container: container.current,
      bounds,
      pitch: 60,
      maxPitch: 80,
      fitBoundsOptions: { padding: 48, maxZoom: 17, pitch: 60 },
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

    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      for (const { id, data } of layers) {
        map.addSource(id, { type: 'geojson', data })
        map.addLayer({
          id: `${id}-lines`,
          type: 'line',
          source: id,
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: { 'line-color': '#0284c7', 'line-width': 3 },
        })
      }

      // Draw points last so they remain visible above every pipeline layer.
      for (const { id } of layers) {
        map.addLayer({
          id: `${id}-points`,
          type: 'circle',
          source: id,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-pitch-alignment': 'map',
            'circle-pitch-scale': 'viewport',
            'circle-radius': 4,
            'circle-color': '#f97316',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        })
      }
    })

    return () => map.remove()
  }, [])

  return <div ref={container} className="h-dvh w-full" aria-label="Kart over vannledningsnettet" />
}

export default App
