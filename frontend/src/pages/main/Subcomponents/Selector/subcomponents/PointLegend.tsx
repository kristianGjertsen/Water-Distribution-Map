import { pointTypes, hiddenPointStyle } from '@/pages/main/lib/mapPointStyles'
import type { PointStyle } from '@/pages/main/lib/mapPointStyles'
import { operationStatuses, statusFallback } from '@/pages/main/lib/operationStatus'

type Props = {
  mode?: 'objects' | 'operations'
  className?: string
}

function PointSymbol({ style }: { style: PointStyle }) {
  const { color, strokeColor, strokeWidth, radius, shape } = style
  const size = 2 * (radius + strokeWidth)
  return <svg width={Math.min(size, 24)} height={Math.min(size, 24)} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
    {shape === 'square' ? (
      <rect x={strokeWidth / 2} y={strokeWidth / 2}
        width={2 * radius + strokeWidth} height={2 * radius + strokeWidth}
        fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
    ) : (
      <circle cx={size / 2} cy={size / 2} r={radius + strokeWidth / 2}
        fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
    )}
  </svg>
}

function LegendItem({ label, styles }: { label: string; styles: PointStyle[] }) {
  return <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
    {styles.map((style, index) => (
      <div key={index} className="flex size-6 shrink-0 items-center justify-center">
        <PointSymbol style={style} />
      </div>
    ))}
    <span className="text-sm text-slate-700">{label}</span>
  </div>
}

// Operations colors replace point-type colors, just as they do in the map icons.
export default function PointLegend({ mode = 'objects', className = '' }: Props) {
  const operations = mode === 'operations'
  return <section aria-label={operations ? 'Tegnforklaring for driftsstatus' : 'Tegnforklaring for punkter'} className={`space-y-2 ${className}`}>
    <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {operations ? 'Driftsstatus' : 'Punkttyper'}
    </h3>
    <div className="space-y-0.5">
      {operations
        ? [...Object.entries(operationStatuses), ['fallback', statusFallback] as const].map(([key, status]) => (
          <LegendItem key={key} label={status.label} styles={[
            { ...pointTypes.Stoppekran, color: status.color },
            { ...pointTypes.Pumpehus, color: status.color },
          ]} />
        ))
        : Object.entries(pointTypes).map(([label, style]) => (
          <LegendItem key={label} label={label} styles={[style]} />
        ))}
    </div>
    {operations ? (
      <div className="space-y-1 px-2 text-xs text-slate-600">
        <p>Fargene viser driftsstatus for både punkter og ledninger.</p>
        <p>Sirkel: Stoppekran. Firkant: Pumpehus og Tankhus.</p>
      </div>
    ) : (
      <div className="border-t border-slate-200 pt-2">
        <LegendItem label="Ikke synlig i driftskartet" styles={[{ ...pointTypes.Stoppekran, ...hiddenPointStyle }]} />
      </div>
    )}
  </section>
}
