import type { ExpressionSpecification, Map, SymbolLayerSpecification } from 'maplibre-gl'
import { draftPointStyle, fallbackPointStyle, hiddenPointStyle, pointTypeAliases, pointTypes, selectedPointStyle } from '@/lib/mapPointStyles'
import type { PointStyle } from '@/lib/mapPointStyles'
import { operationStatuses, operationStatusExpression, statusFallback } from '@/lib/operationStatus'

function addIcon(map: Map, id: string, style: PointStyle) {
  if (map.hasImage(id)) return
  const pixelRatio = 2
  const extent = style.radius + style.strokeWidth + 1
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.ceil(extent * 2 * pixelRatio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Kunne ikke tegne punktikon.')
  context.scale(pixelRatio, pixelRatio)
  const center = canvas.width / pixelRatio / 2
  const radius = style.radius + style.strokeWidth / 2
  context.beginPath()
  if (style.shape === 'square') context.rect(center - radius, center - radius, radius * 2, radius * 2)
  else context.arc(center, center, radius, 0, Math.PI * 2)
  context.fillStyle = style.color
  context.fill()
  if (style.strokeWidth > 0) {
    context.strokeStyle = style.strokeColor
    context.lineWidth = style.strokeWidth
    context.stroke()
  }
  map.addImage(id, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio })
}

export function registerPointIcons(map: Map) {
  for (const [name, base] of Object.entries({ ...pointTypes, fallback: fallbackPointStyle })) {
    for (const [status, color] of Object.entries({ ...operationStatuses, other: statusFallback }).map(([status, config]) => [status, config.color])) {
      addIcon(map, `water-point-${name}-operations-${status}`, { ...base, color })
    }
    for (const hidden of [false, true]) {
      const style = hidden ? { ...base, ...hiddenPointStyle } : base
      const id = `water-point-${name}${hidden ? '-hidden' : ''}`
      addIcon(map, id, style)
      addIcon(map, `${id}-selected`, {
        ...style,
        color: selectedPointStyle.color,
        radius: style.radius + style.strokeWidth + selectedPointStyle.padding,
        strokeWidth: 0,
      })
    }
  }
  addIcon(map, 'water-point-draft', draftPointStyle)
}

export function pointIconExpression(selected = false, operations = false): ExpressionSpecification {
  const names = { ...Object.fromEntries(Object.keys(pointTypes).map(name => [name, name])), ...pointTypeAliases }
  const [first, ...rest] = Object.entries(names)
  const icon = (name: string): ExpressionSpecification => operations
    ? operationStatusExpression(status => `water-point-${name}-operations-${status}`, `water-point-${name}-operations-other`)
    : ['case', ['==', ['get', 'is_visible'], false],
      `water-point-${name}-hidden${selected ? '-selected' : ''}`, `water-point-${name}${selected ? '-selected' : ''}`]
  if (!first) return icon('fallback')
  return ['match', ['get', 'point_type'], first[0], icon(first[1]), ...rest.flatMap(([alias, name]) => [alias, icon(name)]), icon('fallback')]
}

export function pointIconLayout(image: string | ExpressionSpecification): SymbolLayerSpecification['layout'] {
  return {
    'icon-image': image,
    'icon-size': 1,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-pitch-alignment': 'map',
    'icon-rotation-alignment': 'map',
  }
}
