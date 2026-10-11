-- Preserve invoker permissions and existing row-level access rules.
CREATE OR REPLACE FUNCTION public.get_water_pipes()
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'id', id,
      'geometry', extensions.ST_AsGeoJSON(geometry)::jsonb,
      'properties', COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
        'id', id, 'pipe_type', pipe_type, 'status', status,
        'source_dataset', source_dataset,
        'cad_visible', cad_visible, 'is_visible', is_visible,
        'pipe_category', pipe_category
      )
    )), '[]'::jsonb)
  ) FROM public.water_pipes;
$function$;

CREATE OR REPLACE FUNCTION public.get_water_points()
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'id', id,
      'geometry', extensions.ST_AsGeoJSON(geometry)::jsonb,
      'properties', COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
        'id', id, 'point_type', point_type, 'status', status,
        'source_dataset', source_dataset,
        'cad_visible', cad_visible, 'is_visible', is_visible
      )
    )), '[]'::jsonb)
  ) FROM public.water_points;
$function$;
