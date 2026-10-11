import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { getWaterObject, parseObjectProperties, updateWaterObject } from '@/services/mapObjectService'
import type { ObjectChanges, ObjectSelection, WaterObject } from '@/services/mapObjectService'

type Props = {
  selection: ObjectSelection
  onSaved: (selection: ObjectSelection, record: WaterObject) => void
  onEditingState: (dirty: boolean, saving: boolean) => void
}

type Draft = {
  type: string
  category: string
  status: string
  cad: string
  visible: boolean
  properties: string
}
const makeDraft = (record: WaterObject): Draft => ({
  type: record.pipe_type ?? record.point_type ?? '',
  category: record.pipe_category ?? '',
  status: record.status ?? '',
  cad: record.cad_visible === null ? 'unknown' : String(record.cad_visible),
  visible: record.is_visible,
  properties: JSON.stringify(record.properties, null, 2),
})

export default function MapObjectEditor({ selection, onSaved, onEditingState }: Props) {
  const [record, setRecord] = useState<WaterObject | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => { onEditingState(dirty, saving) }, [dirty, saving, onEditingState])
  useEffect(() => {
    if (!dirty && !saving) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setError(null)
    setSaved(false)
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!record || !draft || saving || !dirty) return
    setError(null)
    setSaved(false)
    try {
      const changes: ObjectChanges = {
        status: draft.status || null,
        cad_visible: draft.cad === 'unknown' ? null : draft.cad === 'true',
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
          <fieldset disabled={saving} className="space-y-3 disabled:opacity-60">
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
              <input value={draft.type} onChange={(e) => change('type', e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">Status
              <input value={draft.status} onChange={(e) => change('status', e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">Synlig i CAD
              <select value={draft.cad} onChange={(e) => change('cad', e.target.value)} className={inputClass}>
                <option value="true">Ja</option><option value="false">Nei</option><option value="unknown">Ukjent</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={draft.visible} onChange={(e) => change('visible', e.target.checked)} /> Synlig (is_visible)
            </label>
            <label className="block text-sm font-medium">Øvrige egenskaper (JSON)
              <textarea value={draft.properties} onChange={(e) => change('properties', e.target.value)} rows={10} spellCheck={false} className={`${inputClass} font-mono text-xs`} />
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!dirty || saving} className="rounded bg-sky-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Lagrer …' : 'Lagre endringer'}</button>
              <button type="button" disabled={!dirty} onClick={() => { setDraft(makeDraft(record)); setError(null); setSaved(false) }} className="text-sm text-slate-600 underline disabled:opacity-50">Forkast</button>
            </div>
          </fieldset>
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer">Geometri / koordinater (WGS84, kun visning)</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(selection.feature.geometry, null, 2)}</pre>
          </details>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-green-800">Lagret i databasen. Kart og filtre er oppdatert.</p>}
      {!loading && <button type="button" disabled={saving} onClick={() => {
        if (!dirty || window.confirm('Forkaste ulagrede endringer og hente objektet på nytt?')) {
          setLoading(true)
          setError(null)
          setSaved(false)
          setReload((value) => value + 1)
        }
      }} className="mt-3 text-xs text-sky-700 underline disabled:opacity-50">Last inn på nytt</button>}
    </div>
  )
}
