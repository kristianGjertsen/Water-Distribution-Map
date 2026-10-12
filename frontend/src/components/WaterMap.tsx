import { mapIds } from '@/lib/mapConfig'
import { useWaterMap } from '@/hooks/useWaterMap'
import { useMapSelection } from '@/hooks/useMapSelection'
import OperationsLegend from '@/components/OperationsLegend'
import { upsertMapObject, removeMapObject } from '@/lib/mapObjectUpdates'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import type { GeoJSONSource } from 'maplibre-gl'
import MapFilterPanel from '@/components/MapFilterPanel'
import { defaultFilters, filterFeatures } from '@/lib/mapFilters'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapObjectEditor from '@/components/MapObjectEditor'
import { featureWithObject } from '@/services/mapObjectService'
import { filterVisibleFeatures } from '@/lib/mapOperations'
import { setOperationsStyle } from '@/lib/mapLayers'
import { useMapDrawing } from '@/hooks/useMapDrawing'
import DrawingToolbar from '@/components/DrawingToolbar'
import MapObjectCreator from '@/components/MapObjectCreator'
import type { ObjectKind, ObjectSelection, WaterObject } from '@/types/waterObjects'
function WaterMap() {
  const { container, mapRef, mapInstance, data, setData, error } = useWaterMap()
  const snapDataRef = useRef<{ pipes: FeatureCollection; points: FeatureCollection } | null>(null)
  const drawingTools = useMapDrawing(mapInstance, snapDataRef)
  const { drawingRef, reset: resetDrawing } = drawingTools
  const [filters, setFilters] = useState(defaultFilters)
  const [mode, setMode] = useState<'objects' | 'create' | 'operations'>('objects')
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
  return (
    <main className="relative h-dvh w-full">
      <div ref={container} className="h-full w-full" aria-label="Kart over vannledningsnettet" />
      <aside className={`${drawingTools.drawing ? 'hidden' : ''} absolute top-4 bottom-28 left-4 w-80 max-w-[calc(100%-5rem)] space-y-3 overflow-y-auto`}>
        <div role="group" aria-label="Klikkmodus" className="flex gap-1 rounded-lg bg-white p-1 shadow">
          {(['objects', 'create', 'operations'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => {
              if (value === mode || !canLeaveEditor()) return
              resetDrawing()
              editingRef.current = { dirty: false, saving: false }
              selectionKeyRef.current = null
              setSelected(null)
              setCandidates([])
              modeRef.current = value
              setMode(value)
              if (mapRef.current) mapRef.current.getCanvas().style.cursor = ''
            }} className={`flex-1 rounded px-3 py-2 text-sm font-medium ${mode === value ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
              {value === 'objects' ? 'Velg objekt' : value === 'create' ? 'Opprett' : 'Driftskart'}
            </button>
          ))}
        </div>
        {mode === 'objects' && <p className="rounded-lg bg-white/95 p-3 text-sm shadow">Klikk på en ledning eller et punkt for å se og endre informasjon.</p>}
        {mode === 'operations' ? (
          <OperationsLegend total={filtered ? filtered.pipes.features.length + filtered.points.features.length : undefined} />
        ) : <MapFilterPanel filters={filters} onChange={setFilters} />}
      </aside>
      {mode === 'create' && (
        <aside aria-label="Opprett kartobjekt" className={`${drawingTools.drawing ? 'hidden' : ''} absolute top-4 right-4 bottom-4 z-10 w-96 max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl`}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Opprett objekt</h2>
            <button type="button" className="text-sm underline" onClick={() => {
              if (!canLeaveEditor()) return
              resetDrawing()
              editingRef.current = { dirty: false, saving: false }
              modeRef.current = 'objects'
              setMode('objects')
            }}>Lukk</button>
          </div>
          <MapObjectCreator onStartDrawing={drawingTools.start} drawing={Boolean(drawingTools.drawing)} ready={Boolean(mapInstance)} onResetGeometry={resetDrawing} onCreated={handleCreated} onEditingState={updateEditingState} />
        </aside>
      )}
      {selected && mode !== 'create' && (
        <aside aria-label="Objektinformasjon" className={`${drawingTools.drawing ? 'hidden' : ''} absolute top-4 right-4 bottom-4 z-10 w-96 max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl`}>
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
          <MapObjectEditor key={`${selected.kind}:${selected.feature.id}`} selection={selected} onSaved={handleSaved} onDeleted={handleDeleted} onEditingState={updateEditingState} onStartDrawing={drawingTools.start} drawing={Boolean(drawingTools.drawing)} onResetGeometry={resetDrawing} />
        </aside>
      )}
      <DrawingToolbar tools={drawingTools} />
      {error && (
        <p role="alert" className="absolute bottom-32 left-4 right-16 rounded bg-white p-3 text-sm text-red-700 shadow">
          {error}
        </p>
      )}
    </main>
  )
}
export default WaterMap
