import { useCallback, useEffect, useRef, useState } from 'react'
import { Marker } from 'maplibre-gl'
import type { Map, GeoJSONSource } from 'maplibre-gl'
import type { Position } from 'geojson'
import type { ObjectKind } from '@/services/mapObjectService'
import { geometryFromVertices, validateGeometry } from '@/lib/mapGeometry'
import type { WaterGeometry } from '@/lib/mapGeometry'

export type StartDrawing = (kind: ObjectKind, initial: WaterGeometry | null, complete: (geometry: WaterGeometry) => void) => void

type Drawing = {
  kind: ObjectKind
  vertices: Position[]
  complete: (geometry: WaterGeometry) => void
}

export function useMapDrawing(map: Map | null) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const drawingRef = useRef<Drawing | null>(null)
  const [preview, setPreview] = useState<WaterGeometry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const update = useCallback((next: Drawing | null) => {
    drawingRef.current = next
    setDrawing(next)
    setError(null)
  }, [])
  const start: StartDrawing = useCallback((kind, initial, complete) => {
    const vertices = initial ? initial.type === 'Point' ? [initial.coordinates] : initial.coordinates : []
    update({ kind, vertices: vertices.map((p) => [...p]), complete })
  }, [update])
  const cancel = useCallback(() => update(null), [update])
  const reset = useCallback(() => { update(null); setPreview(null) }, [update])
  const active = drawing !== null

  useEffect(() => {
    if (!map || !active) return
    const zoomEnabled = map.doubleClickZoom.isEnabled()
    map.doubleClickZoom.disable()
    map.getCanvas().style.cursor = 'crosshair'
    return () => {
      if (zoomEnabled) map.doubleClickZoom.enable()
      map.getCanvas().style.cursor = ''
    }
  }, [map, active])

  useEffect(() => {
    if (!map) return
    const onClick = (event: { lngLat: { wrap: () => { lng: number; lat: number } }; originalEvent: MouseEvent }) => {
      const current = drawingRef.current
      if (!current || event.originalEvent.detail > 1) return
      // Marker clicks are handled by the vertex handles, not as new vertices.
      if (event.originalEvent.target instanceof Element && event.originalEvent.target.closest('[data-drawing-vertex]')) return
      const { lng, lat } = event.lngLat.wrap()
      const point = [lng, lat]
      const last = current.vertices.at(-1)
      if (current.kind === 'pipes' && last?.[0] === lng && last?.[1] === lat) return
      update({ ...current, vertices: current.kind === 'points' ? [point] : [...current.vertices, point] })
    }
    map.on('click', onClick)
    return () => { map.off('click', onClick) }
  }, [map, update])

  useEffect(() => {
    if (!map || !drawing) return
    const markers = drawing.vertices.map((position, index) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.dataset.drawingVertex = String(index)
      element.className = 'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-700 text-xs font-bold text-white shadow cursor-move'
      element.textContent = String(index + 1)
      element.title = `Dra punkt ${index + 1} for å flytte det`
      element.setAttribute('aria-label', element.title)
      element.addEventListener('click', (event) => event.stopPropagation())
      const marker = new Marker({ element, draggable: true, anchor: 'center' }).setLngLat([position[0], position[1]]).addTo(map)
      marker.on('drag', () => {
        const current = drawingRef.current
        if (!current) return
        const { lng, lat } = marker.getLngLat().wrap()
        const vertices = current.vertices.map((p, i) => i === index ? [lng, lat] : p)
        const geometry = geometryFromVertices(current.kind, vertices)
        ;(map.getSource('draft-geometry') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: geometry ? [{ type: 'Feature', properties: {}, geometry }] : [] })
      })
      marker.on('dragend', () => {
        const current = drawingRef.current
        if (!current) return
        const { lng, lat } = marker.getLngLat().wrap()
        update({ ...current, vertices: current.vertices.map((p, i) => i === index ? [lng, lat] : p) })
      })
      return marker
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [map, drawing, update])

  useEffect(() => {
    const geometry = drawing ? geometryFromVertices(drawing.kind, drawing.vertices) : preview
    ;(map?.getSource('draft-geometry') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection', features: geometry ? [{ type: 'Feature', properties: {}, geometry }] : [],
    })
  }, [map, drawing, preview])

  useEffect(() => {
    if (!drawing && !preview) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [drawing, preview])

  function finish() {
    if (!drawing) return
    try {
      const geometry = geometryFromVertices(drawing.kind, drawing.vertices)
      validateGeometry(drawing.kind, geometry)
      drawing.complete(geometry)
      setPreview(geometry)
      update(null)
    } catch (error) { setError(error instanceof Error ? error.message : 'Ugyldig geometri.') }
  }

  function removeVertex(index: number) {
    const current = drawingRef.current
    if (current) update({ ...current, vertices: current.vertices.filter((_, i) => i !== index) })
  }
  return { drawing, drawingRef, preview, setPreview, start, cancel, reset, finish, removeVertex, error,
    clear: () => { if (drawingRef.current) update({ ...drawingRef.current, vertices: [] }) },
  }
}
