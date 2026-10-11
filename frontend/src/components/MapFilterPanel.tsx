import type { Feature, FeatureCollection } from 'geojson'
import { pointTypes, hiddenPointStyle } from '@/lib/mapPointStyles'
import type { ObjectKind } from '@/services/mapObjectService'
import { defaultFilters, pipeCategories } from '@/lib/mapFilters'
import type { MapFilters, VisibilityFilter } from '@/lib/mapFilters'

type Props = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  pipes: FeatureCollection | null
  points: FeatureCollection | null
  total: number
  onSelect: (feature: Feature, kind: ObjectKind) => void
}


export default function MapFilterPanel({ filters, onChange }: Props) {
  return (
    <details open className="rounded-lg bg-white/95 p-3 text-sm shadow">
      <summary className="cursor-pointer font-semibold text-slate-900">Lag og filtre</summary>
      <div className="mt-3 space-y-3">
        {([
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
        <div className="space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-2"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill={hiddenPointStyle.color} stroke={hiddenPointStyle.strokeColor} strokeWidth={hiddenPointStyle.strokeWidth} /></svg>Ikke synlig (is_visible = false)</div>
          {Object.entries(pointTypes).map(([label, style]) => {
            const size = 2 * (style.radius + style.strokeWidth)
            return <div key={label} className="flex items-center gap-2"><svg width={size} height={size} aria-hidden="true">{style.shape === 'square' ? <rect x={style.strokeWidth / 2} y={style.strokeWidth / 2} width={2 * style.radius + style.strokeWidth} height={2 * style.radius + style.strokeWidth} fill={style.color} stroke={style.strokeColor} strokeWidth={style.strokeWidth} /> : <circle cx={size / 2} cy={size / 2} r={style.radius + style.strokeWidth / 2} fill={style.color} stroke={style.strokeColor} strokeWidth={style.strokeWidth} />}</svg>{label}</div>
          })}
        </div>
        <button type="button" onClick={() => onChange(defaultFilters)} className="text-sky-700 underline">Nullstill filtre</button>
        
      </div>
    </details>
  )
}
