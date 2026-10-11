
import { supabase } from "@/lib/supabase";
import type { FeatureCollection } from "geojson";

export async function getWaterPipes(): Promise<FeatureCollection> {
  const { data, error } = await supabase.rpc("get_water_pipes");

  if (error) throw error;

  return data as FeatureCollection;
}

export async function getWaterPoints(): Promise<FeatureCollection> {
  const { data, error } = await supabase.rpc("get_water_points");

  if (error) throw error;

  return data as FeatureCollection;
}
