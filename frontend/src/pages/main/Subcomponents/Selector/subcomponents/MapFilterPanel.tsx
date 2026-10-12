import PointLegend from './PointLegend'
import { defaultFilters, pipeCategories } from '@/pages/main/lib/mapFilters'
import type { MapFilters, PipeCategory, VisibilityFilter } from '@/pages/main/lib/mapFilters'
import Button from '@/components/Button'
import Select from '@/components/Select'
import Checkbox from '@/components/Checkbox'

type Props = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void

}


const visibilityOptions = [
  { value: 'yes', label: 'Kun synlige' },
  { value: 'no', label: 'Kun skjulte' },
  { value: 'all', label: 'Alle (inkludert skjulte' },
  { value: 'unknown', label: 'Ukjent' },
] satisfies { value: VisibilityFilter; label: string }[]

export default function MapFilterPanel({ filters, onChange }: Props) {
  return (
    <div className='bg-white p-4 rounded-md'>
      <h2 className="font-semibold text-slate-900">Lag og filtre</h2>
      <div className="mt-3 space-y-3">
        <label className="flex items-center justify-between gap-2">
          Synlig i kartet
          <Select
            value={filters.visible}
            onValueChange={(value) => {
              const option = visibilityOptions.find((option) => option.value === value)
              if (option) onChange({ ...filters, visible: option.value })
            }}
            options={visibilityOptions}
          />
        </label>


        {/* Display Componenets */}
        <fieldset className="space-y-2">

          {(Object.keys(pipeCategories) as PipeCategory[]).map((category) => (
            <Checkbox
              key={category}
              checked={filters.categories.includes(category)}
              variant='default'
              onChange={(event) =>
                onChange({
                  ...filters,
                  categories: event.target.checked
                    ? [...filters.categories, category]
                    : filters.categories.filter((value) => value !== category),
                })
              }
              size="sm"
              className="w-full"
            >
              <svg width="24" height="10" aria-hidden="true">
                <line
                  x1="0"
                  y1="5"
                  x2="24"
                  y2="5"
                  stroke={pipeCategories[category].color}
                  strokeWidth={pipeCategories[category].width}
                />
              </svg>

              {pipeCategories[category].label}
            </Checkbox>
          ))}
        </fieldset>
        <Checkbox variant="default" size="sm" className="w-full"
          checked={filters.showPoints}
          onChange={(event) => onChange({ ...filters, showPoints: event.target.checked })}>
          Vis punkter
        </Checkbox>
        <PointLegend />
        <Button onClick={() => onChange(defaultFilters)}
          variant='default'>
          Nullstill filtre
        </Button>
      </div>
    </div>
  )
}
