import type { FeatureCollection, Position } from 'geojson'

export type SnapData = { pipes: FeatureCollection; points: FeatureCollection } | null
export type SnapObject = { kind: 'pipes' | 'points'; id: string | number }
export const SNAP_RADIUS = 24
type ScreenPoint = { x: number; y: number }

export function snapCandidates(data: SnapData, exclude?: SnapObject): Position[] {
  if (!data) return []
  return (['points', 'pipes'] as const).flatMap((kind) => data[kind].features.flatMap((feature) => {
    if (exclude?.kind === kind && String(feature.id) === String(exclude.id)) return []
    if (feature.geometry.type === 'Point') return [feature.geometry.coordinates]
    if (feature.geometry.type === 'LineString') return feature.geometry.coordinates
    return []
  }))
}

// Screen pixels keep the snap distance consistent at different zooms and pitches.
export function nearestSnap(point: ScreenPoint, candidates: Position[], project: (position: Position) => ScreenPoint, radius = SNAP_RADIUS): Position | null {
  let nearest: Position | null = null
  let distance = radius * radius
  for (const candidate of candidates) {
    const screen = project(candidate)
    const squared = (screen.x - point.x) ** 2 + (screen.y - point.y) ** 2
    if (Number.isFinite(squared) && squared <= distance) {
      nearest = candidate
      distance = squared
    }
  }
  return nearest ? [...nearest] : null
}
