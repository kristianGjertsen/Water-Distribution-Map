import PointLegend from './PointLegend'

export default function OperationsLegend({ total }: { total?: number }) {
  return <section aria-label="Driftskart" className="space-y-2 rounded-lg bg-white/95 p-3 text-sm shadow">
    <h2 className="font-semibold">Driftskart</h2>
    <p>Viser objekter merket som synlige, uansett driftsstatus.</p>
    <PointLegend mode="operations" />
    <p role="status">{total === undefined ? 'Laster objekter …' : `${total} synlige objekter`}</p>
    <p>Klikk på en ledning eller et punkt for å se og endre informasjon.</p>
  </section>
}
