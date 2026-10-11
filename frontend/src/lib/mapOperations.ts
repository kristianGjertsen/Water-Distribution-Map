import type { FeatureCollection } from 'geojson'

export const operationColors = {
  operational: '#16a34a',
  unknown: '#02c4e6',
  not_operational: '#dc2626',
  maintenance: '#6a05f7',
  other: '#000000',
} as const

export function filterOperationalMap(data: FeatureCollection): FeatureCollection {
  return { ...data, features: data.features.filter(feature => feature.properties?.is_visible === true) }
}
