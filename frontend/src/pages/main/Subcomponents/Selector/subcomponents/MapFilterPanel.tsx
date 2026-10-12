import PointLegend from './PointLegend'
import { defaultFilters, pipeCategories } from '@/pages/main/lib/mapFilters'
import type { MapFilters, PipeCategory, VisibilityFilter } from '@/pages/main/lib/mapFilters'
import Button from '@/components/Button'
import Select from '@/components/Select'

type Props = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void

}


const filterOptions = [
  { value: 'unknown', label: 'Ukjent' },
  { value: 'operational', label: 'Operativ' },
  { value: 'non-operational', label: 'Ute av drift' },
  { value: 'maintenance-needed', label: 'Vedlikehold kreves' },
]

export default function MapFilterPanel({ filters, onChange }: Props) {
  return (
    <div className='bg-white p-4 '>
      <h2 className="font-semibold text-slate-900">Lag og filtre</h2>
      <div className="mt-3 space-y-3">
        {([
          ['visible', 'Synlig i kartet'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-2">
            {label}
            <Select
              value={filters[key]}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  [key]: value as VisibilityFilter,
                })
              }
              options={filterOptions}
            />

          </label>
        ))}
        <fieldset className="space-y-2">
          <legend className="mb-2 font-medium">Ledningstyper</legend>
          {(Object.keys(pipeCategories) as PipeCategory[]).map((category) => (
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
        <PointLegend />
        <Button onClick={() => onChange(defaultFilters)}
          variant='default'>
          Nullstill filtre
        </Button>
      </div>
    </div>
  )
}
