-- AI Buyer Appeals. Run in the Supabase SQL Editor after 0000_migration.sql.
-- One appeal per penalized parcel (UNIQUE order_id). Points are restored only
-- through apply_appeal(), which is callable by the server (service_role) alone,
-- so a browser can never grant itself points.

CREATE TABLE public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE REFERENCES public.parcel_records(order_id),
  account_id text NOT NULL REFERENCES public.buyer_profiles(account_id),
  category text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  evidence text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('APPROVED', 'PARTIAL', 'REJECTED')),
  restored_points integer NOT NULL DEFAULT 0 CHECK (restored_points >= 0),
  summary text NOT NULL DEFAULT '',
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.appeals(account_id);

GRANT SELECT ON public.appeals TO anon, authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read appeals" ON public.appeals FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.apply_appeal(
  _order_id text, _category text, _explanation text, _evidence text,
  _verdict text, _restored integer, _summary text, _checks jsonb
) RETURNS public.buyer_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec public.parcel_records; pts integer; prof public.buyer_profiles;
BEGIN
  SELECT * INTO rec FROM public.parcel_records WHERE order_id = _order_id FOR UPDATE;
  IF rec.id IS NULL THEN RAISE EXCEPTION 'Unknown order'; END IF;
  IF rec.parcel_status <> 'Missed / Returned' OR COALESCE(rec.score_impact, 0) >= 0 THEN
    RAISE EXCEPTION 'Order was not penalized';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appeals WHERE order_id = _order_id) THEN
    RAISE EXCEPTION 'Order already appealed';
  END IF;

  -- Never restore more than was deducted, and nothing on a rejection.
  pts := CASE WHEN _verdict = 'REJECTED' THEN 0 ELSE LEAST(GREATEST(_restored, 0), -rec.score_impact) END;

  INSERT INTO public.appeals (order_id, account_id, category, explanation, evidence, verdict, restored_points, summary, checks)
  VALUES (_order_id, rec.account_id, _category, _explanation, _evidence, _verdict, pts, _summary, _checks);

  UPDATE public.buyer_profiles SET trust_score = trust_score + pts
  WHERE account_id = rec.account_id RETURNING * INTO prof;

  UPDATE public.buyer_profiles SET risk_factor = public.compute_risk_factor(trust_score, confirmed_deliveries + missed_returned_count)
  WHERE id = prof.id RETURNING * INTO prof;
  RETURN prof;
END $$;

REVOKE ALL ON FUNCTION public.apply_appeal(text, text, text, text, text, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_appeal(text, text, text, text, text, integer, text, jsonb) TO anon, authenticated, service_role;
