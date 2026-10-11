import type { Feature } from 'geojson'
import { supabase } from '@/lib/supabase'

export type ObjectKind = 'pipes' | 'points'
export type ObjectSelection = { kind: ObjectKind; feature: Feature }
export type WaterObject = {
  id: number
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
export type ObjectChanges = Pick<WaterObject, 'status' | 'is_visible' | 'properties' | 'pipe_type' | 'point_type' | 'pipe_category'>

const tables = { pipes: 'water_pipes', points: 'water_points' } as const
const commonColumns = 'id,source_dataset,source_id,status,is_visible,properties,updated_at'
const columns = (kind: ObjectKind) => `${commonColumns},${kind === 'pipes' ? 'pipe_type,pipe_category' : 'point_type'}`

export async function getWaterObject(kind: ObjectKind, id: string | number, signal: AbortSignal): Promise<WaterObject> {
  const { data, error } = await supabase.from(tables[kind]).select(columns(kind)).eq('id', id).abortSignal(signal).single()
  if (error) throw error
  return data as unknown as WaterObject
}

export async function updateWaterObject(kind: ObjectKind, original: WaterObject, changes: ObjectChanges): Promise<WaterObject> {
  // Only editable attributes are sent; IDs, provenance, geometry and timestamps are server-owned.
  const payload = {
    status: changes.status,
    is_visible: changes.is_visible,
    properties: changes.properties,
    ...(kind === 'pipes'
      ? { pipe_type: changes.pipe_type, pipe_category: changes.pipe_category }
      : { point_type: changes.point_type }),
  }
  let request = supabase.from(tables[kind]).update(payload).eq('id', original.id)
  request = original.updated_at === null
    ? request.is('updated_at', null)
    : request.eq('updated_at', original.updated_at)
  const { data, error } = await request.select(columns(kind)).single()
  if (error?.code === 'PGRST116') {
    throw new Error('Objektet er endret av en annen bruker, slettet, eller du mangler skrivetilgang. Last inn på nytt før du lagrer.')
  }
  if (error) throw new Error('Kunne ikke lagre. Sjekk nettforbindelsen og at du har skrivetilgang.')
  return data as unknown as WaterObject
}

export function featureWithObject(feature: Feature, record: WaterObject): Feature {
  const { properties, ...fields } = record
  return { ...feature, properties: { ...properties, ...fields } }
}

export function parseObjectProperties(text: string): Record<string, unknown> | null {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('Egenskaper må være gyldig JSON.') }
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    throw new Error('Egenskaper må være et JSON-objekt eller null.')
  }
  return value as Record<string, unknown> | null
}
