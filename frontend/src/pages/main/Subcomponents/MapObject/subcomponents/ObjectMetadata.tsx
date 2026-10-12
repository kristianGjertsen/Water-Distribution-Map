import type { WaterObject } from '@/pages/main/types/waterObjects'

export default function ObjectMetadata({ record }: { record: WaterObject }) {
  return (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Objektinformasjon</h3>
            <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-3 gap-y-2 text-xs">
              <dt className="text-slate-500">ID</dt>
              <dd className="break-all font-medium text-slate-800">{record.id}</dd>
              <dt className="text-slate-500">Kildedatasett</dt>
              <dd className="break-all text-slate-800">{record.source_dataset}</dd>
              <dt className="text-slate-500">Sist oppdatert</dt>
              <dd className="text-slate-800">
                {record.updated_at ? new Date(record.updated_at).toLocaleString('nb-NO') : '—'}
              </dd>
            </dl>
          </section>
  )
}
