import Button from '@/components/Button';
import type { MapMode } from '@/pages/main/types/mapMode'

type Props = { mode: MapMode; onChange: (mode: MapMode) => void }
const modes = { objects: 'Velg objekt', create: 'Opprett', operations: 'Driftskart' } as const


export default function ModeSelector({ mode, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Klikkmodus"
      className="flex gap-1 rounded-lg bg-white p-1 shadow"
    >
      {(Object.keys(modes) as MapMode[]).map((value) => (
        <Button
          key={value}
          type="button"
          variant={mode === value ? 'default' : 'ghost'}
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className="flex-1"
        >
          {modes[value]}
        </Button>
      ))}
    </div>
  )
}
