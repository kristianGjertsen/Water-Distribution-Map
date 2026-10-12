import type { MapFilters } from '@/pages/main/lib/mapFilters'
import type { MapMode } from '@/pages/main/types/mapMode'
import ModeSelector from './subcomponents/ModeSelector'
import MapFilterPanel from './subcomponents/MapFilterPanel'
import OperationsLegend from './subcomponents/OperationsLegend'

type Props = {
  hidden: boolean
  mode: MapMode
  onModeChange: (mode: MapMode) => void
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  visibleTotal?: number
}

export default function Selector({ hidden, mode, onModeChange, filters, onFiltersChange, visibleTotal }: Props) {
  return <aside className={`${hidden ? 'hidden' : ''} absolute top-4 bottom-28 left-4 w-80 max-w-[calc(100%-5rem)] space-y-3 overflow-y-auto`}>
    <ModeSelector mode={mode} onChange={onModeChange} />
    {mode === 'objects' && <p className="rounded-lg bg-white/95 p-3 text-sm shadow">Klikk på en ledning eller et punkt for å se og endre informasjon.</p>}
    {mode === 'operations'
      ? <OperationsLegend total={visibleTotal} />
      : <MapFilterPanel filters={filters} onChange={onFiltersChange} />}
  </aside>
}
