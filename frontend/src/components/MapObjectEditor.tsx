import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { deleteWaterObject, getWaterObject, parseObjectProperties, updateWaterObject } from '@/services/mapObjectService'
import GeometryButton from '@/components/GeometryButton'
import StatusSelect from '@/components/StatusSelect'
import { pointTypes } from '@/lib/mapGeometry'
import type { WaterGeometry } from '@/lib/mapGeometry'
import type { StartDrawing } from '@/hooks/useMapDrawing'
import type { ObjectChanges, ObjectSelection, WaterObject } from '@/services/mapObjectService'

type Props = {
  selection: ObjectSelection
  onStartDrawing: StartDrawing
  drawing: boolean
  onResetGeometry: () => void
  onDeleted: (selection: ObjectSelection) => void
  onSaved: (selection: ObjectSelection, record: WaterObject) => void
  onEditingState: (dirty: boolean, saving: boolean) => void
}

type Draft = {
  geometry: WaterGeometry
  type: string
  category: string
  status: string
  visible: boolean
  properties: string
}
const makeDraft = (record: WaterObject): Draft => ({
  geometry: record.geometry,
  type: record.pipe_type ?? record.point_type ?? '',
  category: record.pipe_category ?? '',
  status: record.status ?? '',
  visible: record.is_visible,
  properties: JSON.stringify(record.properties, null, 2),
})

export default function MapObjectEditor({ selection, onDeleted, onSaved, onEditingState, onStartDrawing, drawing, onResetGeometry }: Props) {
  const [record, setRecord] = useState<WaterObject | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const busy = saving || deleting
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [reload, setReload] = useState(0)
  const id = selection.feature.id ?? selection.feature.properties?.id
  const dirty = record !== null && draft !== null && JSON.stringify(draft) !== JSON.stringify(makeDraft(record))

  useEffect(() => {
    const controller = new AbortController()
    void getWaterObject(selection.kind, id, controller.signal).then((next) => {
      if (controller.signal.aborted) return
      setRecord(next)
      setDraft(makeDraft(next))
    }).catch(() => {
      if (!controller.signal.aborted) setError('Kunne ikke hente objektet. Sjekk nettforbindelsen og karttilgangen din.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [selection.kind, id, reload])

  useEffect(() => { onEditingState(dirty, busy) }, [dirty, busy, onEditingState])
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setError(null)
    setSaved(false)
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!record || !draft || busy || drawing || !dirty) return
    setError(null)
    setSaved(false)
    try {
      const changes: ObjectChanges = {
        geometry: draft.geometry,
        status: draft.status || null,
        is_visible: draft.visible,
        properties: parseObjectProperties(draft.properties),
        ...(selection.kind === 'pipes'
          ? { pipe_type: draft.type || null, pipe_category: draft.category || null }
          : { point_type: draft.type || null }),
      }
      setSaving(true)
      onEditingState(dirty, true)
      const updated = await updateWaterObject(selection.kind, record, changes)
      setRecord(updated)
      setDraft(makeDraft(updated))
      onSaved(selection, updated)
      setSaved(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kunne ikke lagre endringene.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!record || loading || busy || drawing) return
    const label = selection.kind === 'pipes' ? 'ledningen' : 'punktet'
    if (!window.confirm(`Slette ${label} #${record.id} permanent fra databasen? Dette kan ikke angres i appen.`)) return
    setDeleting(true)
    setError(null)
    setSaved(false)
    onEditingState(dirty, true)
    try {
      await deleteWaterObject(selection.kind, record)
      onDeleted(selection)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kunne ikke slette objektet.')
    } finally { setDeleting(false) }
  }

  const inputClass = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-sky-600'
  return (
    <div>
      {loading ? <p role="status">Henter informasjon …</p> : record && draft && (
        <form onSubmit={save} className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 break-all text-xs text-slate-600">
            <dt>ID</dt><dd>{record.id}</dd>
            <dt>Kildedatasett</dt><dd>{record.source_dataset}</dd>
            <dt>Kilde-ID</dt><dd>{record.source_id ?? '—'}</dd>
            <dt>Sist oppdatert</dt><dd>{record.updated_at ? new Date(record.updated_at).toLocaleString('nb-NO') : '—'}</dd>
          </dl>
          <fieldset disabled={busy || drawing} className="space-y-3 disabled:opacity-60">
            {selection.kind === 'pipes' && (
              <label className="block text-sm font-medium">Ledningskategori
                <select value={draft.category} onChange={(e) => change('category', e.target.value)} className={inputClass}>
                  <option value="main">Hovedledning (main)</option>
                  <option value="service">Vanlig ledning (service)</option>
                  <option value="unknown">Ukjent (unknown)</option>
                  <option value="">Ikke angitt</option>
                  {draft.category && !['main', 'service', 'unknown'].includes(draft.category) && <option value={draft.category}>{draft.category}</option>}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium">{selection.kind === 'pipes' ? 'Ledningstype' : 'Punkttype'}
              <input value={draft.type} list={selection.kind === 'points' ? 'point-types' : undefined} onChange={(e) => change('type', e.target.value)} className={inputClass} />
              {selection.kind === 'points' && <datalist id="point-types">{Object.keys(pointTypes).map((type) => <option key={type} value={type} />)}</datalist>}
            </label>
            <label className="block text-sm font-medium">Status
              <StatusSelect value={draft.status} onChange={(value) => change('status', value)} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={draft.visible} onChange={(e) => change('visible', e.target.checked)} /> Synlig (is_visible)
            </label>
            <label className="block text-sm font-medium">Øvrige egenskaper (JSON)
              <textarea value={draft.properties} onChange={(e) => change('properties', e.target.value)} rows={10} spellCheck={false} className={`${inputClass} font-mono text-xs`} />
            </label>
            <GeometryButton label={selection.kind === 'pipes' ? 'Endre trase i kartet' : 'Flytt punkt i kartet'} onClick={() => onStartDrawing(selection.kind, draft.geometry, (geometry) => change('geometry', geometry))} />
            <p className="text-xs text-slate-600">{draft.geometry.type === 'Point' ? draft.geometry.coordinates.map((n) => n.toFixed(7)).join(', ') : `${draft.geometry.coordinates.length} knekkpunkter`}</p>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!dirty || busy} className="rounded bg-sky-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Lagrer …' : 'Lagre endringer'}</button>
              <button type="button" disabled={!dirty} onClick={() => { setDraft(makeDraft(record)); setError(null); setSaved(false); onResetGeometry() }} className="text-sm text-slate-600 underline disabled:opacity-50">Forkast</button>
            </div>
          </fieldset>
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer">Geometri / koordinater (WGS84)</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(draft.geometry, null, 2)}</pre>
          </details>
        </form>
      )}
      {drawing && <p role="status" className="mt-3 text-sm text-sky-800">Endre geometrien i kartet og trykk «Bruk geometri» nederst.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-green-800">Lagret i databasen. Kart og filtre er oppdatert.</p>}
      {!loading && record && <div className="mt-5 border-t border-slate-200 pt-4">
        <button type="button" onClick={remove} disabled={busy || drawing} className="rounded border border-red-700 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40">
          {deleting ? 'Sletter …' : selection.kind === 'pipes' ? 'Slett ledning' : 'Slett punkt'}
        </button>
      </div>}
      {!loading && <button type="button" disabled={busy || drawing} onClick={() => {
        if (!dirty || window.confirm('Forkaste ulagrede endringer og hente objektet på nytt?')) {
          onResetGeometry()
          setLoading(true)
          setError(null)
          setSaved(false)
          setReload((value) => value + 1)
        }
      }} className="mt-3 text-xs text-sky-700 underline disabled:opacity-50">Last inn på nytt</button>}
    </div>
  )
}
