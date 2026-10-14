-- Run this once in Supabase SQL Editor for an existing database.

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS item_source text NOT NULL DEFAULT 'found'
  CHECK (item_source IN ('found','lost'));

-- Existing Unfound rows are treated as lost-item records.
UPDATE public.found_items
SET item_source = 'lost'
WHERE status = 'unfound';

-- Lost reports that are approved after this migration will be created as status='unfound'
-- and item_source='lost' by the updated review_lost_report function.

CREATE OR REPLACE FUNCTION public.review_lost_report(
  p_report_id bigint,
  p_decision text,
  p_reviewer_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_row public.lost_reports%rowtype;
  new_item_id bigint;
BEGIN
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid lost-report decision.';
  END IF;

  SELECT * INTO report_row
  FROM public.lost_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lost report not found.';
  END IF;

  IF report_row.status <> 'open' THEN
    RAISE EXCEPTION 'This lost report has already been reviewed.';
  END IF;

  IF p_decision = 'approved' THEN
    INSERT INTO public.found_items
      (item_name, description, category, location_found, date_found, status, item_source, image_path, found_by)
    VALUES
      (report_row.item_name, report_row.description, report_row.category,
       report_row.last_seen_location, report_row.date_lost, 'unfound', 'lost',
       report_row.image_path, p_reviewer_id)
    RETURNING id INTO new_item_id;

    UPDATE public.lost_reports
    SET status = 'matched', updated_at = now()
    WHERE id = p_report_id;

    INSERT INTO public.notifications(user_id, title, message)
    VALUES (report_row.user_id, 'Lost report approved',
      'Your lost-item report was approved and posted as Unfound. Staff can mark it Found when it is recovered.');

    RETURN jsonb_build_object('decision', p_decision, 'found_item_id', new_item_id, 'deleted_image_path', null);
  END IF;

  INSERT INTO public.notifications(user_id, title, message)
  VALUES (report_row.user_id, 'Lost report rejected',
    'Your lost-item report was rejected and removed from the system.');

  DELETE FROM public.lost_reports WHERE id = p_report_id;

  RETURN jsonb_build_object('decision', p_decision, 'found_item_id', null, 'deleted_image_path', report_row.image_path);
END;
$$;

REVOKE ALL ON FUNCTION public.review_lost_report(bigint, text, bigint) FROM public;
REVOKE ALL ON FUNCTION public.review_lost_report(bigint, text, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.review_lost_report(bigint, text, bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.review_lost_report(bigint, text, bigint) TO service_role;
