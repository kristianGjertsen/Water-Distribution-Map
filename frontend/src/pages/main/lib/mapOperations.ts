import type { FeatureCollection } from 'geojson'

export function filterVisibleFeatures(data: FeatureCollection): FeatureCollection {
  return { ...data, features: data.features.filter(feature => feature.properties?.is_visible === true) }
}
