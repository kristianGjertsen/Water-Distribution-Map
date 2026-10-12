import type { Feature } from 'geojson'
import type { WaterGeometry } from '@/lib/mapGeometry'

// Status and category remain raw to preserve imported/legacy values when saving.
export type ObjectKind = 'pipes' | 'points'
export type ObjectSelection = { kind: ObjectKind; feature: Feature }
export type WaterObject = {
  id: number
  geometry: WaterGeometry
  source_dataset: string
  source_id: string | null
  status: string | null
  is_visible: boolean
  pipe_type?: string | null
  point_type?: string | null
  pipe_category?: string | null
  properties: Record<string, unknown> | null
  updated_at: string | null
}
export type ObjectChanges = Pick<WaterObject, 'geometry' | 'status' | 'is_visible' | 'properties' | 'pipe_type' | 'point_type' | 'pipe_category'>

export type MapData = Record<ObjectKind, import('geojson').FeatureCollection>
