import type { Feature, FeatureCollection } from 'geojson'

export const pipeCategories = {
  main: { label: 'Hovedledning', color: '#dc2626', width: 5 },
  service: { label: 'Vanlig ledning', color: '#1684ce', width: 3 },
  unknown: { label: 'Ukjent', color: '#eab308', width: 3 },
} as const

export type PipeCategory = keyof typeof pipeCategories
export type VisibilityFilter = 'all' | 'yes' | 'no' | 'unknown'
export type MapFilters = {
  visible: VisibilityFilter
  categories: PipeCategory[]
  showPoints: boolean
}
export const defaultFilters: MapFilters = {
  visible: 'all', categories: ['main', 'service', 'unknown'], showPoints: true,
}

export function pipeCategory(feature: Feature): PipeCategory {
  const value = feature.properties?.pipe_category
  return value === 'main' || value === 'service' ? value : 'unknown'
}

function matchesVisibility(value: unknown, filter: VisibilityFilter) {
  if (filter === 'all') return true
  if (filter === 'unknown') return value !== true && value !== false
  return value === (filter === 'yes')
}

export function filterFeatures(data: FeatureCollection, filters: MapFilters, kind: 'pipes' | 'points'): FeatureCollection {
  return {
    ...data,
    features: data.features.filter((feature) =>
      matchesVisibility(feature.properties?.is_visible, filters.visible)
      && (kind === 'pipes' ? filters.categories.includes(pipeCategory(feature)) : filters.showPoints),
    ),
  }
}
