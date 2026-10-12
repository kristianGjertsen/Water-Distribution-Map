import type { Feature } from 'geojson'
import { validateGeometry } from '@/lib/mapGeometry'
import { supabase } from '@/lib/supabase'

import type { ObjectKind, WaterObject, ObjectChanges } from '@/types/waterObjects'

export async function getWaterObject(kind: ObjectKind, id: string | number, signal: AbortSignal): Promise<WaterObject> {
  const { data, error } = await supabase.rpc('get_water_object', { p_kind: kind, p_id: id }).abortSignal(signal)
  if (error) throw error
  return data as WaterObject
}

async function saveObject(kind: ObjectKind, changes: ObjectChanges, original?: WaterObject): Promise<WaterObject> {
  validateGeometry(kind, changes.geometry)
  const payload = {
    geometry: changes.geometry,
    status: changes.status,
    is_visible: changes.is_visible,
    properties: changes.properties,
    ...(kind === 'pipes'
      ? { pipe_type: changes.pipe_type, pipe_category: changes.pipe_category }
      : { point_type: changes.point_type }),
  }
  const { data, error } = await supabase.rpc('save_water_object', {
    p_kind: kind, p_changes: payload,
    p_id: original?.id ?? null, p_expected_updated_at: original?.updated_at ?? null,
  })
  if (error?.code === 'P0002') {
    throw new Error('Objektet er endret av en annen bruker, slettet, eller du mangler skrivetilgang. Last inn på nytt før du lagrer.')
  }
  if (error?.code === '22023') throw new Error('Ugyldig geometri eller objekttype. Kontroller tegningen og feltene.')
  if (error) throw new Error('Kunne ikke lagre. Sjekk nettforbindelsen og at du har karttilgang.')
  return data as WaterObject
}

export function updateWaterObject(kind: ObjectKind, original: WaterObject, changes: ObjectChanges) {
  return saveObject(kind, changes, original)
}

export function createWaterObject(kind: ObjectKind, changes: ObjectChanges) {
  return saveObject(kind, changes)
}

export async function deleteWaterObject(kind: ObjectKind, original: WaterObject): Promise<void> {
  const table = kind === 'pipes' ? 'water_pipes' : 'water_points'
  let request = supabase.from(table).delete().eq('id', original.id)
  request = original.updated_at === null
    ? request.is('updated_at', null)
    : request.eq('updated_at', original.updated_at)
  const { error } = await request.select('id').single()
  if (error?.code === 'PGRST116') {
    throw new Error('Objektet er endret, allerede slettet, eller du mangler slettetilgang. Last inn på nytt før du prøver igjen.')
  }
  if (error) throw new Error('Kunne ikke slette objektet. Sjekk nettforbindelsen og karttilgangen din.')
}

export function featureWithObject(feature: Feature, record: WaterObject): Feature {
  const { properties, geometry, ...fields } = record
  return { ...feature, id: record.id, geometry, properties: { ...properties, ...fields } }
}

export function parseObjectProperties(text: string): Record<string, unknown> | null {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('Egenskaper må være gyldig JSON.') }
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    throw new Error('Egenskaper må være et JSON-objekt eller null.')
  }
  return value as Record<string, unknown> | null
}
