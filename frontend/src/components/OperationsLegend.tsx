import { operationStatuses, statusFallback } from '@/lib/operationStatus'

export default function OperationsLegend({ total }: { total?: number }) {
  return <section aria-label="Driftskart" className="space-y-2 rounded-lg bg-white/95 p-3 text-sm shadow">
    <h2 className="font-semibold">Driftskart</h2>
    <p>Viser objekter merket som synlige, uansett driftsstatus.</p>
    {[...Object.entries(operationStatuses), ['fallback', statusFallback] as const].map(([key, status]) =>
      <p key={key} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />{status.label}</p>)}
    <p role="status">{total === undefined ? 'Laster objekter …' : `${total} synlige objekter`}</p>
    <p>Klikk på en ledning eller et punkt for å se og endre informasjon.</p>
  </section>
}
