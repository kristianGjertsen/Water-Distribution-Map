const statuses = [
  { value: 'unknown', label: 'Ukjent' },
  { value: 'operational', label: 'Operativ' },
  { value: 'non-operational', label: 'Ute av drift' },
  { value: 'maintenance-needed', label: 'Vedlikehold kreves' },
]

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function StatusSelect({ value, onChange, className }: Props) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
      {!statuses.some((status) => status.value === value) && (
        <option value={value} disabled>{value || 'Ikke angitt'} (eksisterende verdi)</option>
      )}
      {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
    </select>
  )
}
