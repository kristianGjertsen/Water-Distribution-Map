import Button from '@/components/Button'
import { pipeCategories } from '@/pages/main/lib/mapFilters'
import { operationStatuses, statusAliases, statusFallback } from '@/pages/main/lib/operationStatus'
import type { ObjectKind, WaterObject } from '@/pages/main/types/waterObjects'
import ObjectMetadata from './subcomponents/ObjectMetadata'

type Props = {
  record: WaterObject
  kind: ObjectKind
  saved: boolean
  onEdit: () => void
  onRefresh: () => void
}

export default function MapObjectView({ record, kind, saved, onEdit, onRefresh }: Props) {
  const canonicalStatus = Object.entries(statusAliases).find(([alias]) => alias === record.status)?.[1] ?? record.status
  const status = Object.entries(operationStatuses).find(([value]) => value === canonicalStatus)?.[1]
  const category = Object.entries(pipeCategories).find(([value]) => value === record.pipe_category)?.[1]
  return <div className="space-y-4 text-slate-900">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">Visning</span>
      <Button onClick={onEdit} variant="default">Rediger</Button>
    </div>
    {saved && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Endringene er lagret. Kartet er oppdatert.</p>}
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-semibold">Egenskaper</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
        {kind === 'pipes' && <><dt className="text-slate-500">Kategori</dt><dd>{category?.label ?? (record.pipe_category || 'Ikke angitt')}</dd></>}
        <dt className="text-slate-500">Status</dt>
        <dd className="flex items-center gap-2"><span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: status?.color ?? statusFallback.color }} />{status?.label ?? (record.status || 'Ikke angitt')}</dd>
        <dt className="text-slate-500">Synlig i driftskartet</dt><dd>{record.is_visible ? 'Ja' : 'Nei'}</dd>
      </dl>
    </section>
    <ObjectMetadata record={record} />
    <section className="space-y-2 rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold">Plassering og geometri</h3>
      <p className="break-words font-mono text-xs text-slate-600">{record.geometry.type === 'Point'
        ? record.geometry.coordinates.map(value => value.toFixed(7)).join(', ')
        : `${record.geometry.coordinates.length} knekkpunkter`}</p>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">Vis koordinater (WGS84)</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(record.geometry, null, 2)}</pre>
      </details>
    </section>
    <details className="rounded-xl border border-slate-200 p-4 text-sm">
      <summary className="cursor-pointer font-medium">Øvrige egenskaper</summary>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-600">{JSON.stringify(record.properties, null, 2)}</pre>
    </details>
    <button type="button" onClick={onRefresh} className="text-sm text-slate-600 underline">Last inn på nytt</button>
  </div>
}
