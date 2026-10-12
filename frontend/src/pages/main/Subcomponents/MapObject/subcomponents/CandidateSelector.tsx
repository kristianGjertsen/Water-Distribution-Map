import type { ObjectSelection } from '@/pages/main/types/waterObjects'

type Props = { selected: ObjectSelection; candidates: ObjectSelection[]; onSelect: (selection: ObjectSelection) => void }
const key = (item: ObjectSelection) => `${item.kind}:${item.feature.id}`

export default function CandidateSelector({ selected, candidates, onSelect }: Props) {
  if (candidates.length < 2) return null
  return <label className="mb-4 block text-sm">Flere objekter på dette stedet
    <select value={key(selected)} onChange={event => {
      const next = candidates.find(item => key(item) === event.target.value)
      if (next) onSelect(next)
    }} className="mt-1 w-full rounded border border-slate-300 p-2">
      {candidates.map(item => <option key={key(item)} value={key(item)}>{item.kind === 'pipes' ? 'Ledning' : 'Punkt'} #{item.feature.id}</option>)}
    </select>
  </label>
}
