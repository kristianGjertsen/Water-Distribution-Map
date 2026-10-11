import type { Map, ExpressionSpecification } from 'maplibre-gl'
import { pipeCategories } from '@/lib/mapFilters'
import { pointIconExpression, pointIconLayout, registerPointIcons } from '@/lib/mapPointIcons'
import { operationColors } from '@/lib/mapOperations'

const normalPipeColor: ExpressionSpecification = ['case', ['==', ['get', 'is_visible'], false], '#9ca3af', ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.color, 'service', pipeCategories.service.color, pipeCategories.unknown.color]]


export function setOperationsStyle(map: Map, operations: boolean) {
  const lineColor: string | ExpressionSpecification = operations
    ? [
        'match',
        ['get', 'status'],
        'operational', operationColors.operational,
        'non-operational', operationColors.not_operational,
        'maintenance-needed', operationColors.maintenance,
        'unknown', operationColors.unknown,
        operationColors.other, // Fallback
      ]
    : normalPipeColor;

  map.setPaintProperty('water-pipes-layer', 'line-color', lineColor);

  map.setLayoutProperty(
    'water-points-layer',
    'icon-image',
    pointIconExpression(false, operations)
  );
}

// Sources must be registered before adding their layers. Order controls stacking.
export function addWaterMapLayers(map: Map) {
  registerPointIcons(map)
  map.addLayer({
    id: 'water-pipes-outline',
    type: 'line',
    source: 'water-pipes',
    filter: ['==', ['get', 'is_visible'], false],
    paint: {
      'line-color': '#000000',
      'line-width': ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.width + 4, pipeCategories.service.width + 4],
    },
  })
  map.addLayer({
    id: 'water-pipes-layer',
    type: 'line',
    source: 'water-pipes',
    layout: { 'line-sort-key': ['match', ['get', 'pipe_category'], 'main', 1, 0] },
    paint: {
      'line-color': normalPipeColor,
      'line-width': ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.width, pipeCategories.service.width],
    },
  })
  map.addLayer({
    id: 'water-points-layer',
    type: 'symbol',
    source: 'water-points',
    layout: pointIconLayout(pointIconExpression()),
  })

  map.addLayer({
    id: 'selected-pipe', type: 'line', source: 'selected-object',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#22d3ee', 'line-width': 10 },
  }, 'water-pipes-outline')
  map.addLayer({
    id: 'selected-point', type: 'symbol', source: 'selected-object',
    filter: ['==', ['geometry-type'], 'Point'],
    layout: pointIconLayout(pointIconExpression(true)),
  }, 'water-points-layer')

  map.addLayer({
    id: 'draft-line', type: 'line', source: 'draft-geometry',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#0284c7', 'line-width': 5, 'line-dasharray': [2, 1] },
  })
  map.addLayer({
    id: 'draft-point', type: 'symbol', source: 'draft-geometry',
    filter: ['==', ['geometry-type'], 'Point'],
    layout: pointIconLayout('water-point-draft'),
  })
}
