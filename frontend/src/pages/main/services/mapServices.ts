import { supabase } from '@/shared/supabase'
import type { FeatureCollection } from 'geojson'

async function getWaterFeatures(rpc: 'get_water_pipes' | 'get_water_points'): Promise<FeatureCollection> {
  const { data, error } = await supabase.rpc(rpc)
  if (error) throw error
  return data as FeatureCollection
}
export const getWaterPipes = () => getWaterFeatures('get_water_pipes')
export const getWaterPoints = () => getWaterFeatures('get_water_points')
