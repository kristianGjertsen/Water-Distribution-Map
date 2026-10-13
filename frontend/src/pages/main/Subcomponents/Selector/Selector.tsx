import type { MapFilters } from '@/pages/main/lib/mapFilters'
import type { MapMode } from '@/pages/main/types/mapMode'
import ModeSelector from './subcomponents/ModeSelector'
import MapFilterPanel from './subcomponents/MapFilterPanel'
import OperationsLegend from './subcomponents/OperationsLegend'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

type Props = {
  hidden: boolean
  mode: MapMode
  onModeChange: (mode: MapMode) => void
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  visibleTotal?: number
}

export default function Selector({ hidden, mode, onModeChange, filters, onFiltersChange, visibleTotal }: Props) {
  const [closed, setClosed] = useState(false)

  if (hidden) return null
  if (closed) return <button type="button" onClick={() => setClosed(false)} aria-label="Åpne kartmenyen" title="Åpne kartmenyen"
    className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-700">
    <SlidersHorizontal className="size-4" aria-hidden="true" />
  </button>

  return <aside aria-label="Kartmeny" className="absolute top-4 bottom-28 left-4 w-80 max-w-[calc(100%-5rem)] space-y-3 overflow-y-auto">
    <button type="button" onClick={() => setClosed(true)} aria-label="Lukk kartmenyen" title="Lukk kartmenyen"
      className="flex size-7 items-center justify-center rounded bg-white text-slate-500 shadow hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700">
      <X className="size-4" aria-hidden="true" />
    </button>
    <ModeSelector mode={mode} onChange={onModeChange} />
    {mode === 'objects' && <p className="rounded-lg bg-white/95 p-3 text-sm shadow">Klikk på en ledning eller et punkt for å se og endre informasjon.</p>}
    {mode === 'operations'
      ? <OperationsLegend total={visibleTotal} />
      : <MapFilterPanel filters={filters} onChange={onFiltersChange} />}
  </aside>
}

