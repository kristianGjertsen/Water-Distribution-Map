import { useState } from 'react'

export type Coordinates = { lng: number; lat: number }

type Props = {
  coordinates: Coordinates | null
  pinned: boolean
  onResume: () => void
}

export default function CoordinateBox({ coordinates, pinned, onResume }: Props) {
  const [copyStatus, setCopyStatus] = useState('')
  const longitude = coordinates?.lng.toFixed(7)
  const latitude = coordinates?.lat.toFixed(7)
  const value = coordinates ? `[${longitude}, ${latitude}]` : ''

  async function copyCoordinates() {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus('Kopiert!')
    } catch {
      setCopyStatus('Kunne ikke kopiere. Marker koordinatene og kopier manuelt.')
    }
  }

  return (
    <section aria-label="Koordinater" className="rounded-lg bg-white/95 p-3 text-sm shadow">
      <h2 className="font-semibold text-slate-900">{pinned ? 'Valgt punkt' : 'Musekoordinater'}</h2>
      <p className="mt-1 text-xs text-slate-500">WGS84 · EPSG:4326</p>
      {coordinates ? (
        <>
          <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 text-slate-700">
            <dt>Lengdegrad (lng)</dt><dd className="font-mono tabular-nums">{longitude}</dd>
            <dt>Breddegrad (lat)</dt><dd className="font-mono tabular-nums">{latitude}</dd>
          </dl>
          <p className="mt-2 select-all break-all font-mono text-xs">{value}</p>
        </>
      ) : <p className="mt-2 text-slate-600">Flytt pekeren over kartet.</p>}
      <p className="mt-2 text-xs text-slate-600">{pinned ? 'Lengdegrad først, breddegrad sist.' : 'Klikk i kartet for å låse et punkt.'}</p>
      {pinned && (
        <div className="mt-2 flex gap-4">
          <button type="button" onClick={copyCoordinates} className="font-medium text-sky-700 underline">Kopier koordinater</button>
          <button type="button" onClick={() => { setCopyStatus(''); onResume() }} className="text-slate-600 underline">Følg musen</button>
        </div>
      )}
      {copyStatus && <p role="status" className="mt-2 text-xs text-slate-600">{copyStatus}</p>}
    </section>
  )
}
