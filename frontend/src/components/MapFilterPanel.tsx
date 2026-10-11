import type { Feature, FeatureCollection } from 'geojson'
import type { ObjectKind } from '@/services/mapObjectService'
import { defaultFilters, pipeCategories, pipeCategory } from '@/lib/mapFilters'
import type { MapFilters, VisibilityFilter } from '@/lib/mapFilters'

type Props = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  pipes: FeatureCollection | null
  points: FeatureCollection | null
  total: number
  onSelect: (feature: Feature, kind: ObjectKind) => void
}

const booleanLabel = (value: unknown) => value === true ? 'Ja' : value === false ? 'Nei' : 'Ukjent'

export default function MapFilterPanel({ filters, onChange, pipes, points, total, onSelect }: Props) {
  const count = (pipes?.features.length ?? 0) + (points?.features.length ?? 0)
  return (
    <details open className="rounded-lg bg-white/95 p-3 text-sm shadow">
      <summary className="cursor-pointer font-semibold text-slate-900">Lag og filtre</summary>
      <div className="mt-3 space-y-3">
        {([
          ['cad', 'Synlig i CAD'],
          ['visible', 'Synlig (is_visible)'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-2">
            {label}
            <select value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value as VisibilityFilter })} className="rounded border border-slate-300 bg-white px-2 py-1">
              <option value="all">Alle</option>
              <option value="yes">Ja</option>
              <option value="no">Nei</option>
              <option value="unknown">Ukjent</option>
            </select>
          </label>
        ))}
        <fieldset className="space-y-2">
          <legend className="mb-2 font-medium">Ledningstyper</legend>
          {(['main', 'service'] as const).map((category) => (
            <label key={category} className="flex items-center gap-2">
              <input type="checkbox" checked={filters.categories.includes(category)} onChange={(event) => onChange({
                ...filters,
                categories: event.target.checked ? [...filters.categories, category] : filters.categories.filter((value) => value !== category),
              })} />
              <svg width="24" height="10" aria-hidden="true"><line x1="0" y1="5" x2="24" y2="5" stroke={pipeCategories[category].color} strokeWidth={pipeCategories[category].width} /></svg>
              {pipeCategories[category].label}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={filters.showPoints} onChange={(event) => onChange({ ...filters, showPoints: event.target.checked })} />
          Vis punkter
        </label>
        <button type="button" onClick={() => onChange(defaultFilters)} className="text-sky-700 underline">Nullstill filtre</button>
        <p className="text-xs text-slate-500">CAD-synlighet angir ikke om ledningen er i drift.</p>
        <p role="status" className="font-medium">{pipes ? `${count} av ${total} objekter` : 'Laster objekter …'}</p>
        <div className="max-h-52 overflow-y-auto border-t border-slate-200">
          {pipes && count === 0 && <p className="py-3 text-slate-600">Ingen objekter matcher filtrene.</p>}
          {([['pipes', pipes], ['points', points]] as const).flatMap(([kind, collection]) => collection?.features.map((feature, index) => (
            <button key={`${kind}-${feature.id ?? index}`} type="button" onClick={() => onSelect(feature, kind)} className="block w-full border-b border-slate-100 py-2 text-left hover:bg-sky-50 focus-visible:bg-sky-50">
              <span className="block font-medium">{kind === 'pipes' ? pipeCategories[pipeCategory(feature)].label : feature.properties?.point_type ?? 'Punkt'} · #{feature.id ?? feature.properties?.id ?? index + 1}</span>
              <span className="block text-xs text-slate-600">CAD: {booleanLabel(feature.properties?.cad_visible)} · Synlig: {booleanLabel(feature.properties?.is_visible)}</span>
            </button>
          )) ?? [])}
        </div>
      </div>
    </details>
  )
}
