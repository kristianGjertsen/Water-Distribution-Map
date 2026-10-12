import ObjectMetadata from './subcomponents/ObjectMetadata'
import { pipeCategories } from '@/pages/main/lib/mapFilters'
import { useUnsavedChangesWarning } from '@/pages/main/hooks/useUnsavedChangesWarning'
import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'

import GeometryButton from '@/pages/main/Subcomponents/Drawing/GeometryButton'
import StatusSelect from '@/pages/main/Subcomponents/MapObject/subcomponents/StatusSelect'
import type { StartDrawing } from '@/pages/main/hooks/useMapDrawing'
import type { WaterGeometry } from '@/pages/main/lib/mapGeometry'
import { pointTypes } from '@/pages/main/lib/mapPointStyles'
import {
  deleteWaterObject,
  parseObjectProperties,
  updateWaterObject,
} from '@/pages/main/services/mapObjectService'
import type {
  ObjectChanges,
  ObjectSelection,
  WaterObject,
} from '@/pages/main/types/waterObjects'

type Props = {
  selection: ObjectSelection
  record: WaterObject
  onCancel: () => void
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

const CATEGORY_OPTIONS = [
  ...Object.entries(pipeCategories).map(([value, category]) => ({ value, label: category.label })),
  { value: '', label: 'Ikke angitt' },
]

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed'
const sectionClass = 'space-y-4 rounded-xl border border-slate-200 bg-white p-4'
const labelClass = 'block text-sm font-medium text-slate-700'

function makeDraft(record: WaterObject): Draft {
  return {
    geometry: record.geometry,
    type: record.pipe_type ?? record.point_type ?? '',
    category: record.pipe_category ?? '',
    status: record.status ?? '',
    visible: record.is_visible,
    properties: JSON.stringify(record.properties, null, 2),
  }
}

function geometrySummary(geometry: WaterGeometry): string {
  if (geometry.type === 'Point') {
    return geometry.coordinates.map((value) => value.toFixed(7)).join(', ')
  }
  return `${geometry.coordinates.length} knekkpunkter`
}

export default function MapObjectEditor({
  selection,
  record,
  onCancel,
  onStartDrawing,
  drawing,
  onResetGeometry,
  onDeleted,
  onSaved,
  onEditingState,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => makeDraft(record))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPipe = selection.kind === 'pipes'
  const busy = saving || deleting
  const dirty =
    record !== null &&
    draft !== null &&
    JSON.stringify(draft) !== JSON.stringify(makeDraft(record))

  useEffect(() => {
    onEditingState(dirty, busy)
  }, [dirty, busy, onEditingState])

  useUnsavedChangesWarning(dirty || busy)

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setError(null)
  }

  function cancel() {
    if (busy || drawing) return
    if (dirty && !window.confirm('Forkaste ulagrede endringer?')) return
    onResetGeometry()
    onEditingState(false, false)
    onCancel()
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!record || !draft || busy || drawing || !dirty) return

    setError(null)

    try {
      const changes: ObjectChanges = {
        geometry: draft.geometry,
        status: draft.status || null,
        is_visible: draft.visible,
        properties: parseObjectProperties(draft.properties),
        ...(isPipe
          ? { pipe_type: draft.type || null, pipe_category: draft.category || null }
          : { point_type: draft.type || null }),
      }

      setSaving(true)
      onEditingState(dirty, true)
      const updated = await updateWaterObject(selection.kind, record, changes)

      onEditingState(false, false)
      onSaved(selection, updated)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kunne ikke lagre endringene.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (busy || drawing) return

    const objectLabel = isPipe ? 'ledningen' : 'punktet'
    if (!window.confirm(`Slette ${objectLabel} #${record.id} permanent fra databasen? Dette kan ikke angres i appen.`)) return

    setDeleting(true)
    setError(null)
    onEditingState(dirty, true)

    try {
      await deleteWaterObject(selection.kind, record)
      onDeleted(selection)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kunne ikke slette objektet.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 text-slate-900">
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
            <h3 className="font-semibold">Rediger objekt</h3>
            <p>Endringene lagres når du velger «Lagre endringer».</p>
          </div>
          {/* Read-only source metadata */}
          <ObjectMetadata record={record} />

          <fieldset disabled={busy || drawing} className="min-w-0 space-y-4 disabled:opacity-60">
            {/* Editable attributes */}
            <section className={sectionClass}>
              <div>
                <h3 className="text-sm font-semibold">Egenskaper</h3>
                <p className="mt-1 text-xs text-slate-500">Endre klassifisering og status for objektet.</p>
              </div>

              {isPipe && (
                <label className={labelClass}>
                  Ledningskategori
                  <select value={draft.category} onChange={(event) => change('category', event.target.value)} className={inputClass}>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    {draft.category && !CATEGORY_OPTIONS.some((option) => option.value === draft.category) && (
                      <option value={draft.category}>{draft.category}</option>
                    )}
                  </select>
                </label>
              )}

              <label className={labelClass}>
                {isPipe ? 'Ledningstype' : 'Punkttype'}
                <input
                  value={draft.type}
                  list={isPipe ? undefined : 'point-types'}
                  onChange={(event) => change('type', event.target.value)}
                  className={inputClass}
                />
                {!isPipe && (
                  <datalist id="point-types">
                    {Object.keys(pointTypes).map((type) => <option key={type} value={type} />)}
                  </datalist>
                )}
              </label>

              <label className={labelClass}>
                Status
                <StatusSelect value={draft.status} onChange={(value) => change('status', value)} className={inputClass} />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <span>
                  <span className="block text-sm font-medium">Synlig i kartet</span>
                  <span className="block text-xs text-slate-500">Vis eller skjul objektet.</span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.visible}
                  onChange={(event) => change('visible', event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-sky-700"
                />
              </label>
            </section>

            {/* Map geometry */}
            <section className={sectionClass}>
              <div>
                <h3 className="text-sm font-semibold">Plassering og geometri</h3>
                <p className="mt-1 text-xs text-slate-500">Rediger posisjonen direkte i kartet.</p>
              </div>

              <GeometryButton
                label={isPipe ? 'Endre trasé i kartet' : 'Flytt punkt i kartet'}
                onClick={() => onStartDrawing(
                  selection.kind,
                  draft.geometry,
                  (geometry) => change('geometry', geometry),
                  { kind: selection.kind, id: selection.feature.id! },
                )}
              />
              <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                {geometrySummary(draft.geometry)}
              </p>
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer font-medium hover:text-slate-900">
                  Vis koordinater (WGS84)
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                  {JSON.stringify(draft.geometry, null, 2)}
                </pre>
              </details>
            </section>

            {/* Advanced properties */}
            <section className={sectionClass}>
              <label className={labelClass} htmlFor="water-object-properties">
                Øvrige egenskaper
              </label>
              <p className="text-xs text-slate-500">Avanserte data i JSON-format.</p>
              <textarea
                id="water-object-properties"
                value={draft.properties}
                onChange={(event) => change('properties', event.target.value)}
                rows={8}
                spellCheck={false}
                className={`${inputClass} resize-y font-mono text-xs`}
              />
            </section>

            {/* Primary actions */}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <button
                type="submit"
                disabled={!dirty || busy}
                className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Lagrer …' : 'Lagre endringer'}
              </button>
              <button
                type="button"
                disabled={busy || drawing}
                onClick={cancel}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Avbryt
              </button>
              {dirty && <span className="text-xs text-amber-700">Ulagrede endringer</span>}
            </div>
          </fieldset>
        </form>

      {drawing && (
        <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          Endre geometrien i kartet og trykk «Bruk geometri» nederst.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Administrasjon</h3>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={remove}
              disabled={busy || drawing}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleting ? 'Sletter …' : isPipe ? 'Slett ledning' : 'Slett punkt'}
            </button>
          </div>
        </section>

    </div>
  )
}
