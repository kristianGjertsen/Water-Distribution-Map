import { mapIds } from '@/lib/mapConfig'
import type { Map, ExpressionSpecification } from 'maplibre-gl'
import { pipeCategories } from '@/lib/mapFilters'
import { pointIconExpression, pointIconLayout, registerPointIcons } from '@/lib/mapPointIcons'
import { operationStatuses, operationStatusExpression, statusFallback } from '@/lib/operationStatus'

const normalPipeColor: ExpressionSpecification = ['case', ['==', ['get', 'is_visible'], false], '#9ca3af', ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.color, 'service', pipeCategories.service.color, pipeCategories.unknown.color]]


export function setOperationsStyle(map: Map, operations: boolean) {
  const lineColor: string | ExpressionSpecification = operations
    ? operationStatusExpression(status => operationStatuses[status].color, statusFallback.color)
    : normalPipeColor

  map.setPaintProperty(mapIds.pipesLayer, 'line-color', lineColor)
  map.setLayoutProperty(mapIds.pipesOutline, 'visibility', operations ? 'none' : 'visible')

  map.setLayoutProperty(
    mapIds.pointsLayer,
    'icon-image',
    pointIconExpression(false, operations)
  )
}

// Sources must be registered before adding their layers. Order controls stacking.
export function addWaterMapLayers(map: Map) {
  registerPointIcons(map)
  map.addLayer({
    id: mapIds.pipesOutline,
    type: 'line',
    source: mapIds.pipesSource,
    filter: ['==', ['get', 'is_visible'], false],
    paint: {
      'line-color': '#000000',
      'line-width': ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.width + 4, 'service', pipeCategories.service.width + 4, pipeCategories.unknown.width + 4],
    },
  })
  map.addLayer({
    id: mapIds.pipesLayer,
    type: 'line',
    source: mapIds.pipesSource,
    layout: { 'line-sort-key': ['match', ['get', 'pipe_category'], 'main', 1, 0] },
    paint: {
      'line-color': normalPipeColor,
      'line-width': ['match', ['get', 'pipe_category'], 'main', pipeCategories.main.width, 'service', pipeCategories.service.width, pipeCategories.unknown.width],
    },
  })
  map.addLayer({
    id: mapIds.pointsLayer,
    type: 'symbol',
    source: mapIds.pointsSource,
    layout: pointIconLayout(pointIconExpression()),
  })

  map.addLayer({
    id: mapIds.selectedPipe, type: 'line', source: mapIds.selectedSource,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#22d3ee', 'line-width': 10 },
  }, mapIds.pipesOutline)
  map.addLayer({
    id: mapIds.selectedPoint, type: 'symbol', source: mapIds.selectedSource,
    filter: ['==', ['geometry-type'], 'Point'],
    layout: pointIconLayout(pointIconExpression(true)),
  }, mapIds.pointsLayer)

  map.addLayer({
    id: mapIds.draftLine, type: 'line', source: mapIds.draftSource,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#0284c7', 'line-width': 5, 'line-dasharray': [2, 1] },
  })
  map.addLayer({
    id: mapIds.draftPoint, type: 'symbol', source: mapIds.draftSource,
    filter: ['==', ['geometry-type'], 'Point'],
    layout: pointIconLayout('water-point-draft'),
  })
}
