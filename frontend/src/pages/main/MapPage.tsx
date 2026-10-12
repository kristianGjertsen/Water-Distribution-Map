import AccountPanel from './Subcomponents/Account/AccountPanel'
import { mapIds } from '@/pages/main/lib/mapConfig'
import { useWaterMap } from '@/pages/main/hooks/useWaterMap'
import { useMapSelection } from '@/pages/main/hooks/useMapSelection'
import Selector from '@/pages/main/Subcomponents/Selector/Selector'
import ObjectPanel from '@/pages/main/Subcomponents/MapObject/subcomponents/ObjectPanel'
import CandidateSelector from '@/pages/main/Subcomponents/MapObject/subcomponents/CandidateSelector'
import type { MapMode } from '@/pages/main/types/mapMode'
import { upsertMapObject, removeMapObject } from '@/pages/main/lib/mapObjectUpdates'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import type { GeoJSONSource } from 'maplibre-gl'
import { defaultFilters, filterFeatures } from '@/pages/main/lib/mapFilters'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapObjectDetails from '@/pages/main/Subcomponents/MapObject/MapObjectDetails'
import { featureWithObject } from '@/pages/main/services/mapObjectService'
import { filterVisibleFeatures } from '@/pages/main/lib/mapOperations'
import { setOperationsStyle } from '@/pages/main/lib/mapLayers'
import { useMapDrawing } from '@/pages/main/hooks/useMapDrawing'
import DrawingToolbar from '@/pages/main/Subcomponents/Drawing/DrawingToolbar'
import MapObjectCreator from '@/pages/main/Subcomponents/MapObject/MapObjectCreator'
import type { ObjectKind, ObjectSelection, WaterObject } from '@/pages/main/types/waterObjects'


function MapPage({ userId, email }: { userId: string; email?: string }) {
  const { container, mapRef, mapInstance, data, setData, error } = useWaterMap()
  const snapDataRef = useRef<{ pipes: FeatureCollection; points: FeatureCollection } | null>(null)
  const drawingTools = useMapDrawing(mapInstance, snapDataRef)
  const { drawingRef, reset: resetDrawing } = drawingTools
  const [filters, setFilters] = useState(defaultFilters)
  const [mode, setMode] = useState<MapMode>('objects')
  const modeRef = useRef(mode)
  const onSelectMode = useCallback(() => { modeRef.current = 'objects'; setMode('objects') }, [])
  const { selected, setSelected, candidates, setCandidates, editingRef, selectionKeyRef, updateEditingState, canLeaveEditor, selectObject, closeEditor } = useMapSelection(mapInstance, data, drawingRef, resetDrawing, modeRef, onSelectMode)
  function handleSaved(selection: ObjectSelection, record: WaterObject) {
    resetDrawing()
    const feature = featureWithObject(selection.feature, record)
    setData(current => upsertMapObject(current, selection.kind, feature))
    setSelected({ ...selection, feature })
    setCandidates((current) => current.map((item) => item.kind === selection.kind && String(item.feature.id) === String(record.id) ? { ...item, feature } : item))
  }
  function handleDeleted(selection: ObjectSelection) {
    const id = selection.feature.id ?? selection.feature.properties?.id
    setData(current => removeMapObject(current, selection.kind, id))
    resetDrawing()
    editingRef.current = { dirty: false, saving: false }
    selectionKeyRef.current = null
    setSelected(null)
    setCandidates([])
  }
  function handleCreated(kind: ObjectKind, record: WaterObject) {
    resetDrawing()
    const feature = featureWithObject({ type: 'Feature', properties: {}, geometry: record.geometry }, record)
    setData(current => upsertMapObject(current, kind, feature))
    setFilters(defaultFilters)
    editingRef.current = { dirty: false, saving: false }
    selectionKeyRef.current = `${kind}:${record.id}`
    const next = { kind, feature }
    setSelected(next)
    setCandidates([next])
    modeRef.current = 'objects'
    setMode('objects')
  }
  const filtered = useMemo(() => data ? {
    pipes: mode === 'operations' ? filterVisibleFeatures(data.pipes) : filterFeatures(data.pipes, filters, 'pipes'),
    points: mode === 'operations' ? filterVisibleFeatures(data.points) : filterFeatures(data.points, filters, 'points'),
  } : null, [data, filters, mode])
  useEffect(() => {
    snapDataRef.current = filtered
    const map = mapInstance
    if (!map || !mapInstance || !filtered) return
    const pipes = map.getSource(mapIds.pipesSource) as GeoJSONSource | undefined
    const points = map.getSource(mapIds.pointsSource) as GeoJSONSource | undefined
    setOperationsStyle(map, mode === 'operations')
    pipes?.setData(filtered.pipes)
    points?.setData(filtered.points)
  }, [filtered, mapInstance, mode])
  useEffect(() => {
    const source = mapInstance?.getSource(mapIds.selectedSource) as GeoJSONSource | undefined
    const visible = selected && filtered?.[selected.kind].features.find((feature) => String(feature.id) === String(selected.feature.id))
    source?.setData({ type: 'FeatureCollection', features: visible ? [visible] : [] })
  }, [selected, filtered, mapInstance])
  function changeMode(next: MapMode) {
    if (next === mode || !canLeaveEditor()) return
    resetDrawing()
    editingRef.current = { dirty: false, saving: false }
    selectionKeyRef.current = null
    setSelected(null)
    setCandidates([])
    modeRef.current = next
    setMode(next)
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = ''
  }
  return (
    <main className="relative h-dvh w-full">
      <div ref={container} className="h-full w-full" aria-label="Kart over vannledningsnettet" />
      <Selector hidden={Boolean(drawingTools.drawing)} mode={mode} onModeChange={changeMode}
        filters={filters} onFiltersChange={setFilters}
        visibleTotal={filtered ? filtered.pipes.features.length + filtered.points.features.length : undefined} />
      {mode === 'create' && (
        <ObjectPanel label="Opprett kartobjekt" title="Opprett objekt" hidden={Boolean(drawingTools.drawing)} onClose={() => changeMode('objects')}>
          <MapObjectCreator onStartDrawing={drawingTools.start} drawing={Boolean(drawingTools.drawing)} ready={Boolean(mapInstance)} onResetGeometry={resetDrawing} onCreated={handleCreated} onEditingState={updateEditingState} />
        </ObjectPanel>
      )}
      {selected && mode !== 'create' && (
        <ObjectPanel label="Objektinformasjon" title={`${selected.kind === 'pipes' ? 'Ledning' : 'Punkt'} #${selected.feature.id}`} hidden={Boolean(drawingTools.drawing)} onClose={closeEditor}>
          <CandidateSelector selected={selected} candidates={candidates} onSelect={next => { selectObject(next, candidates) }} />
          <MapObjectDetails key={`${selected.kind}:${selected.feature.id}`} selection={selected} onSaved={handleSaved} onDeleted={handleDeleted} onEditingState={updateEditingState} onStartDrawing={drawingTools.start} drawing={Boolean(drawingTools.drawing)} onResetGeometry={resetDrawing} />
        </ObjectPanel>
      )}
      <DrawingToolbar tools={drawingTools} />
      <AccountPanel userId={userId} email={email} />
      {error && (
        <p role="alert" className="absolute bottom-32 left-4 right-16 rounded bg-white p-3 text-sm text-red-700 shadow">
          {error}
        </p>
      )}
    </main>
  )
}
export default MapPage
