import { mapIds } from '@/pages/main/lib/mapConfig'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Map } from 'maplibre-gl'
import type { MapData, ObjectSelection } from '@/pages/main/types/waterObjects'

export function useMapSelection(map: Map | null, data: MapData | null, drawingRef: RefObject<unknown>, resetDrawing: () => void, modeRef: RefObject<string>, onSelectMode: () => void) {
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])
  const [selected, setSelected] = useState<ObjectSelection | null>(null)
  const [candidates, setCandidates] = useState<ObjectSelection[]>([])
  const editingRef = useRef({ dirty: false, saving: false })
  const selectionKeyRef = useRef<string | null>(null)
  const updateEditingState = useCallback((dirty: boolean, saving: boolean) => {
    editingRef.current = { dirty, saving }
  }, [])
  const canLeaveEditor = useCallback(() => {
    if (editingRef.current.saving) return false
    return (!editingRef.current.dirty && !drawingRef.current) || window.confirm('Forkaste ulagrede endringer?')
  }, [drawingRef])
  const selectObject = useCallback((next: ObjectSelection, nearby: ObjectSelection[] = [next]) => {
    const key = `${next.kind}:${next.feature.id}`
    if (key !== selectionKeyRef.current) {
      if (!canLeaveEditor()) return false
      editingRef.current = { dirty: false, saving: false }
      resetDrawing()
    }
    selectionKeyRef.current = key
    if (modeRef.current !== 'operations') onSelectMode()
    setSelected(next)
    setCandidates(nearby)
    return true
  }, [canLeaveEditor, resetDrawing, modeRef, onSelectMode])
  function closeEditor() {
    if (!canLeaveEditor()) return
    resetDrawing()
    editingRef.current = { dirty: false, saving: false }
    selectionKeyRef.current = null
    setSelected(null)
    setCandidates([])
  }
  useEffect(() => {
    if (!map) return
    const nearbyObjects = (point: { x: number; y: number }): ObjectSelection[] => {
      if (!dataRef.current || !map.getLayer(mapIds.pointsLayer)) return []
      const hits = map.queryRenderedFeatures([[point.x - 5, point.y - 5], [point.x + 5, point.y + 5]], {
        layers: [mapIds.pointsLayer, mapIds.pipesLayer],
      })
      const seen = new Set<string>()
      return hits.flatMap((hit) => {
        const kind = hit.source === mapIds.pipesSource ? 'pipes' : 'points'
        const key = `${kind}:${hit.id}`
        if (seen.has(key)) return []
        seen.add(key)
        // Rendered geometries may be clipped to tiles; edit the complete source feature.
        const feature = dataRef.current?.[kind].features.find((item) => String(item.id) === String(hit.id))
        return feature ? [{ kind, feature } as ObjectSelection] : []
      })
    }
    const onMove = ({ point }: { point: { x: number; y: number } }) => {
      if (drawingRef.current) { map.getCanvas().style.cursor = 'crosshair'; return }
      map.getCanvas().style.cursor = modeRef.current !== 'create' && nearbyObjects(point).length ? 'pointer' : ''
    }
    const onClick = ({ point }: { point: { x: number; y: number } }) => {
      if (drawingRef.current || modeRef.current === 'create') return
      const nearby = nearbyObjects(point)
      if (nearby.length) selectObject(nearby[0], nearby)
    }
    map.on('mousemove', onMove)
    map.on('click', onClick)
    return () => { map.off('mousemove', onMove); map.off('click', onClick) }
  }, [map, drawingRef, modeRef, selectObject])
  return { selected, setSelected, candidates, setCandidates, editingRef, selectionKeyRef, updateEditingState, canLeaveEditor, selectObject, closeEditor }
}
