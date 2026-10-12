import type { FeatureCollection } from 'geojson'

// Visibility is independent of operational status.
export function filterVisibleFeatures(data: FeatureCollection): FeatureCollection {
  return { ...data, features: data.features.filter(feature => feature.properties?.is_visible === true) }
}
