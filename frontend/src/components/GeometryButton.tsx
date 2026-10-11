export default function GeometryButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded border border-sky-700 px-3 py-2 text-sm font-medium text-sky-800 disabled:opacity-40">
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13Z" /><circle cx="12" cy="9" r="3" /></svg>
    {label}
  </button>
}
