import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { createWaterObject } from '@/services/mapObjectService'
import type { ObjectKind, WaterObject } from '@/services/mapObjectService'
import { pointTypes } from '@/lib/mapPointStyles'
import type { WaterGeometry } from '@/lib/mapGeometry'
import type { StartDrawing } from '@/hooks/useMapDrawing'
import GeometryButton from '@/components/GeometryButton'
import StatusSelect from '@/components/StatusSelect'

type Props = {
  onStartDrawing: StartDrawing
  drawing: boolean
  ready: boolean
  onResetGeometry: () => void
  onCreated: (kind: ObjectKind, record: WaterObject) => void
  onEditingState: (dirty: boolean, saving: boolean) => void
}

export default function MapObjectCreator({ onStartDrawing, drawing, ready, onResetGeometry, onCreated, onEditingState }: Props) {
  const [type, setType] = useState('Stoppekran')
  const [geometry, setGeometry] = useState<WaterGeometry | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('unknown')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const kind: ObjectKind = type === 'main' || type === 'service' ? 'pipes' : 'points'
  const dirty = geometry !== null || name !== '' || status !== 'unknown'
  useEffect(() => { onEditingState(dirty, saving) }, [dirty, saving, onEditingState])
  useEffect(() => {
    if (!dirty && !saving) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!geometry || saving || drawing) return
    setError(null)
    setSaving(true)
    onEditingState(true, true)
    try {
      const record = await createWaterObject(kind, {
        geometry, status: status || null, is_visible: true,
        properties: {
          description: 'Manuelt opprettet',
          ...(name.trim() ? { name: name.trim() } : {}),
        },
        ...(kind === 'pipes' ? { pipe_category: type, pipe_type: null } : { point_type: type }),
      })
      onCreated(kind, record)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kunne ikke opprette objektet.')
    } finally { setSaving(false) }
  }

  return <form onSubmit={save} className="space-y-4">
    <fieldset disabled={saving || drawing} className="space-y-4 disabled:opacity-50">
      <label className="block text-sm font-medium">Objekttype
        <select value={type} onChange={(event) => {
          const next = event.target.value
          const nextKind = next === 'main' || next === 'service' ? 'pipes' : 'points'
          if (nextKind !== kind && geometry) {
            if (!window.confirm('Bytte objekttype og forkaste tegnet geometri?')) return
            setGeometry(null)
            onResetGeometry()
          }
          setType(next)
          setError(null)
        }} className="mt-1 w-full rounded border border-slate-300 p-2">
          <optgroup label="Punkter">{Object.keys(pointTypes).map((value) => <option key={value}>{value}</option>)}</optgroup>
          <optgroup label="Ledninger"><option value="main">Hovedledning (main)</option><option value="service">Vanlig ledning (service)</option></optgroup>
        </select>
      </label>
      <label className="block text-sm font-medium">Navn (valgfritt)
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2" />
      </label>
      <label className="block text-sm font-medium">Status
        <StatusSelect value={status} onChange={setStatus} className="mt-1 w-full rounded border border-slate-300 bg-white p-2" />
      </label>
      <GeometryButton disabled={!ready} label={kind === 'pipes' ? 'Tegn ledning i kartet' : 'Plasser punkt i kartet'} onClick={() => onStartDrawing(kind, geometry, (next) => { setGeometry(next); setError(null) })} />
      <p className="text-sm text-slate-600">{geometry ? geometry.type === 'Point' ? `Valgt: ${geometry.coordinates.map((n) => n.toFixed(7)).join(', ')}` : `${geometry.coordinates.length} knekkpunkter valgt` : 'Velg geometri før du lagrer.'}</p>
      <button type="submit" disabled={!geometry || !ready} className="rounded bg-sky-700 px-4 py-2 font-medium text-white disabled:opacity-40">{saving ? 'Lagrer …' : 'Lagre nytt objekt'}</button>
    </fieldset>
    {drawing && <p role="status" className="text-sm text-sky-800">Tegning pågår. Bruk tegneverktøyet nederst.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form>
}
