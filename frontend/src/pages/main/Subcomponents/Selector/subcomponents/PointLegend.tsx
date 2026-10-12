import { pointTypes, hiddenPointStyle } from '@/pages/main/lib/mapPointStyles'

export default function PointLegend() {
  return (
    <div className="space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-2"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill={hiddenPointStyle.color} stroke={hiddenPointStyle.strokeColor} strokeWidth={hiddenPointStyle.strokeWidth} /></svg>Ikke synlig i driftskartet</div>
          {Object.entries(pointTypes).map(([label, style]) => {
            const size = 2 * (style.radius + style.strokeWidth)
            return <div key={label} className="flex items-center gap-2"><svg width={size} height={size} aria-hidden="true">{style.shape === 'square' ? <rect x={style.strokeWidth / 2} y={style.strokeWidth / 2} width={2 * style.radius + style.strokeWidth} height={2 * style.radius + style.strokeWidth} fill={style.color} stroke={style.strokeColor} strokeWidth={style.strokeWidth} /> : <circle cx={size / 2} cy={size / 2} r={style.radius + style.strokeWidth / 2} fill={style.color} stroke={style.strokeColor} strokeWidth={style.strokeWidth} />}</svg>{label}</div>
          })}
        </div>
  )
}
