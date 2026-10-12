import type { ReactNode } from 'react'

type Props = { label: string; title: string; hidden: boolean; onClose: () => void; children: ReactNode }

export default function ObjectPanel({ label, title, hidden, onClose, children }: Props) {
  return <aside aria-label={label} className={`${hidden ? 'hidden' : ''} absolute top-4 right-4 bottom-4 z-10 w-96 max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button type="button" onClick={onClose} className="text-sm text-slate-600 underline">Lukk</button>
    </div>
    {children}
  </aside>
}
