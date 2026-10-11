-- Editing follows the same approved-user scope as the existing SELECT policies.
CREATE POLICY "Approved users can update pipes"
ON public.water_pipes FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.map_access WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.map_access WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Approved users can update points"
ON public.water_points FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.map_access WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.map_access WHERE user_id = (SELECT auth.uid())));

-- Server-owned timestamps allow the client to reject stale edits.
CREATE OR REPLACE FUNCTION public.touch_water_object_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER water_pipes_updated_at BEFORE UPDATE ON public.water_pipes
FOR EACH ROW EXECUTE FUNCTION public.touch_water_object_updated_at();
CREATE TRIGGER water_points_updated_at BEFORE UPDATE ON public.water_points
FOR EACH ROW EXECUTE FUNCTION public.touch_water_object_updated_at();
