import { SNAP_RADIUS } from '@/pages/main/lib/mapSnapping'
import type { useMapDrawing } from '@/pages/main/hooks/useMapDrawing'

export default function DrawingToolbar({ tools }: { tools: ReturnType<typeof useMapDrawing> }) {
  if (!tools.drawing) return null
  const { kind, vertices } = tools.drawing
  return (
    <section aria-label="Tegneverktøy" className="absolute bottom-5 left-1/2 z-30 w-96 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-white p-4 shadow-xl">
      <h2 className="font-semibold">{kind === 'pipes' ? 'Tegn ledning' : 'Plasser punkt'}</h2>
      <p className="mt-1 text-sm text-slate-600">{kind === 'pipes' ? 'Klikk for å legge til knekkpunkter. Dra de nummererte punktene for å flytte dem.' : 'Klikk i kartet for ny plassering, eller dra punktet.'}</p>
      <p className="mt-1 text-xs text-slate-500">Snapper automatisk til punkter og ledningsknekkpunkter innen {SNAP_RADIUS} piksler. Grønn ring viser hvor punktet festes.</p>
      <p role="status" className="mt-1 text-xs font-medium text-emerald-700">{tools.snapped ? 'Festet til punkt' : 'Flytt pekeren nær et punkt for å feste'}</p>
      <div className="mt-2 max-h-24 overflow-y-auto text-xs">
        {vertices.map((p, index) => <div key={index} className="flex justify-between gap-2 py-1">
          <span className="font-mono">{index + 1}: {p[0].toFixed(7)}, {p[1].toFixed(7)}</span>
          <button type="button" onClick={() => tools.removeVertex(index)} className="text-red-700 underline" aria-label={`Fjern punkt ${index + 1}`}>Fjern</button>
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={tools.finish} disabled={vertices.length < (kind === 'pipes' ? 2 : 1)} className="rounded bg-sky-700 px-3 py-2 text-white disabled:opacity-40">Bruk geometri</button>
        <button type="button" onClick={() => tools.removeVertex(vertices.length - 1)} disabled={!vertices.length} className="underline disabled:opacity-40">Angre siste</button>
        <button type="button" onClick={tools.clear} disabled={!vertices.length} className="underline disabled:opacity-40">Tegn på nytt</button>
        <button type="button" onClick={tools.cancel} className="underline">Avbryt</button>
      </div>
      {tools.error && <p role="alert" className="mt-2 text-sm text-red-700">{tools.error}</p>}
      <p className="mt-2 text-xs text-slate-500">Geometrien lagres først når du trykker «Lagre» i skjemaet.</p>
    </section>
  )
}
