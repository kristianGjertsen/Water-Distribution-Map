import { useCallback, useEffect, useRef, useState } from 'react'
import { Marker } from 'maplibre-gl'
import type { Map, GeoJSONSource } from 'maplibre-gl'
import type { RefObject } from 'react'
import { nearestSnap, snapCandidates, SNAP_RADIUS } from '@/lib/mapSnapping'
import type { SnapData, SnapObject } from '@/lib/mapSnapping'
import type { Position } from 'geojson'
import type { ObjectKind } from '@/services/mapObjectService'
import { geometryFromVertices, validateGeometry } from '@/lib/mapGeometry'
import type { WaterGeometry } from '@/lib/mapGeometry'

export type StartDrawing = (kind: ObjectKind, initial: WaterGeometry | null, complete: (geometry: WaterGeometry) => void, exclude?: SnapObject) => void

type Drawing = {
  kind: ObjectKind
  exclude?: SnapObject
  vertices: Position[]
  complete: (geometry: WaterGeometry) => void
}

export function useMapDrawing(map: Map | null, snapData: RefObject<SnapData>) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const drawingRef = useRef<Drawing | null>(null)
  const [preview, setPreview] = useState<WaterGeometry | null>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const draggingIndexRef = useRef<number | null>(null)
  const snapMarkerRef = useRef<Marker | null>(null)
  const [snapped, setSnapped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = useCallback((next: Drawing | null) => {
    drawingRef.current = next
    setDrawing(next)
    setError(null)
    setSnapped(false)
  }, [])
  const start: StartDrawing = useCallback((kind, initial, complete, exclude) => {
    const vertices = initial ? initial.type === 'Point' ? [initial.coordinates] : initial.coordinates : []
    update({ kind, exclude, vertices: vertices.map((p) => [...p]), complete })
  }, [update])
  const cancel = useCallback(() => update(null), [update])
  const reset = useCallback(() => { update(null); setPreview(null) }, [update])
  const active = drawing !== null

  const snap = useCallback((point: { x: number; y: number }, movingIndex?: number) => {
    const current = drawingRef.current
    if (!map || !current) return null
    const candidates = snapCandidates(snapData.current, current.exclude)
    // Other vertices in the draft can also be used as connection points.
    if (current.kind === 'pipes') candidates.push(...current.vertices.filter((_, index) => index !== movingIndex))
    const project = (position: Position) => map.project([position[0], position[1]])
    const nearest = nearestSnap(point, candidates, project)
    if (nearest) return nearest
    // Terrain rendering can differ from CPU projection. Hit-test the actual
    // rendered points, but retain canonical coordinates (not tile-quantized ones).
    if (!map.getLayer('water-points-layer')) return null
    const hits = map.queryRenderedFeatures([
      [point.x - SNAP_RADIUS, point.y - SNAP_RADIUS],
      [point.x + SNAP_RADIUS, point.y + SNAP_RADIUS],
    ], { layers: ['water-points-layer'] })
    const ids = new Set(hits.map((feature) => String(feature.id)))
    const rendered = snapCandidates({ pipes: { type: 'FeatureCollection', features: [] }, points: {
      type: 'FeatureCollection',
      features: snapData.current?.points.features.filter((feature) => ids.has(String(feature.id))) ?? [],
    } }, current.exclude)
    return nearestSnap(point, rendered, project, Infinity)
  }, [map, snapData])

  const showSnap = useCallback((position: Position | null) => {
    setSnapped(Boolean(position))
    const marker = snapMarkerRef.current
    if (!marker) return
    marker.getElement().hidden = !position
    if (position) marker.setLngLat([position[0], position[1]])
  }, [])

  useEffect(() => {
    if (!map || !active) return
    const element = document.createElement('div')
    element.className = 'pointer-events-none h-9 w-9 rounded-full border-4 border-emerald-500 bg-emerald-400/20'
    element.hidden = true
    element.setAttribute('aria-hidden', 'true')
    const marker = new Marker({ element, anchor: 'center' }).setLngLat([0, 0]).addTo(map)
    snapMarkerRef.current = marker
    const onMove = (event: { point: { x: number; y: number } }) => {
      pointerRef.current = event.point
      showSnap(snap(event.point, draggingIndexRef.current ?? undefined))
    }
    const onLeave = () => { pointerRef.current = null; showSnap(null) }
    map.on('mousemove', onMove)
    map.on('touchmove', onMove)
    map.getCanvas().addEventListener('mouseleave', onLeave)
    return () => {
      map.off('mousemove', onMove)
      map.off('touchmove', onMove)
      map.getCanvas().removeEventListener('mouseleave', onLeave)
      marker.remove()
      snapMarkerRef.current = null
      draggingIndexRef.current = null
      pointerRef.current = null
    }
  }, [map, active, snap, showSnap])

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
    const onClick = (event: { point: { x: number; y: number }; lngLat: { wrap: () => { lng: number; lat: number } }; originalEvent: MouseEvent }) => {
      const current = drawingRef.current
      if (!current || event.originalEvent.detail > 1) return
      // Marker clicks are handled by the vertex handles, not as new vertices.
      if (event.originalEvent.target instanceof Element && event.originalEvent.target.closest('[data-drawing-vertex]')) return
      const { lng, lat } = event.lngLat.wrap()
      const target = snap(event.point)
      const point = target ?? [lng, lat]
      const last = current.vertices.at(-1)
      if (current.kind === 'pipes' && last?.[0] === point[0] && last?.[1] === point[1]) return
      update({ ...current, vertices: current.kind === 'points' ? [point] : [...current.vertices, point] })
      showSnap(target)
    }
    map.on('click', onClick)
    return () => { map.off('click', onClick) }
  }, [map, update, snap, showSnap])

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
      let dragPosition = [...position]
      marker.on('dragstart', () => { draggingIndexRef.current = index })
      marker.on('drag', () => {
        const current = drawingRef.current
        if (!current) return
        const { lng, lat } = marker.getLngLat().wrap()
        const target = snap(pointerRef.current ?? map.project([lng, lat]), index)
        showSnap(target)
        const point = target ?? [lng, lat]
        dragPosition = point
        if (target) marker.setLngLat([point[0], point[1]])
        element.classList.toggle('bg-emerald-600', Boolean(target))
        element.classList.toggle('bg-sky-700', !target)
        const vertices = current.vertices.map((p, i) => i === index ? point : p)
        const geometry = geometryFromVertices(current.kind, vertices)
        ;(map.getSource('draft-geometry') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: geometry ? [{ type: 'Feature', properties: {}, geometry }] : [] })
      })
      marker.on('dragend', () => {
        const current = drawingRef.current
        if (!current) return
        draggingIndexRef.current = null
        update({ ...current, vertices: current.vertices.map((p, i) => i === index ? dragPosition : p) })
        showSnap(null)
      })
      return marker
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [map, drawing, update, snap, showSnap])

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
  return { drawing, drawingRef, preview, setPreview, start, cancel, reset, finish, removeVertex, error, snapped,
    clear: () => { if (drawingRef.current) update({ ...drawingRef.current, vertices: [] }) },
  }
}
