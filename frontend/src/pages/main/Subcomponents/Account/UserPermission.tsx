import type { MapPermission } from '@/pages/main/hooks/useMapPermission'

const labels: Record<MapPermission, string> = {
  loading: 'Henter tilgang …',
  full: 'Full karttilgang',
  none: 'Ingen karttilgang',
  error: 'Kunne ikke hente tilgang',
}

export default function UserPermission({ permission }: { permission: MapPermission }) {
  return <span role="status" title={permission === 'full' ? 'Kan lese, opprette, redigere og slette kartobjekter' : undefined}
    className={`rounded-full px-2 py-1 text-xs ${permission === 'full' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
    {labels[permission]}
  </span>
}
