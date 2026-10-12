import type { Feature } from 'geojson'
import type { MapData, ObjectKind } from '@/pages/main/types/waterObjects'

export const featureId = (feature: Feature) => feature.id ?? feature.properties?.id
// Updating a feature also supports legacy collections with IDs in properties only.
export function upsertMapObject(data: MapData | null, kind: ObjectKind, feature: Feature): MapData | null {
  if (!data) return data
  const id = String(featureId(feature))
  const exists = data[kind].features.some(item => String(featureId(item)) === id)
  const features = exists ? data[kind].features.map(item => String(featureId(item)) === id ? feature : item) : [...data[kind].features, feature]
  return { ...data, [kind]: { ...data[kind], features } }
}
export function removeMapObject(data: MapData | null, kind: ObjectKind, id: string | number): MapData | null {
  if (!data) return data
  return { ...data, [kind]: { ...data[kind], features: data[kind].features.filter(feature => String(featureId(feature)) !== String(id)) } }
}
