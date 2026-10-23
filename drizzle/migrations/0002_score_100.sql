-- 0002_score_100.sql
-- Updates the buyer trust score system to a 0–100 scale starting at 50:
--   * Everyone starts at 50 (Max 100, Min 0)
--   * Trusted:   score >= 70 (Max 100) -> Standard COD unlocked
--   * Neutral:   score 35..69          -> Protected COD or Full Upfront (no Standard COD)
--   * Watchlist: score 21..34 (< 35, first restriction at 30) -> Protected COD or Full Upfront
--   * High Risk: score <= 20           -> Full Upfront only
--   * AI Review stores the pre-screening report for human moderation without automatically changing points.

ALTER TABLE public.buyer_profiles
  ALTER COLUMN trust_score SET DEFAULT 50,
  ALTER COLUMN risk_factor SET DEFAULT 'Neutral';

CREATE OR REPLACE FUNCTION public.compute_risk_factor(_score integer, _resolved integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _score >= 70 THEN 'Trusted'
    WHEN _score >= 35 THEN 'Neutral'
    WHEN _score > 20 THEN 'Watchlist'
    ELSE 'High Risk' END
$$;

-- Recompute existing buyer_profiles from baseline 50 + parcel impacts, clamped to 0..100
UPDATE public.buyer_profiles bp
SET
  trust_score = LEAST(100, GREATEST(0,
    50
    + COALESCE((SELECT SUM(score_impact) FROM public.parcel_records pr WHERE pr.account_id = bp.account_id AND pr.score_impact IS NOT NULL), 0)
  )),
  risk_factor = public.compute_risk_factor(
    LEAST(100, GREATEST(0,
      50
      + COALESCE((SELECT SUM(score_impact) FROM public.parcel_records pr WHERE pr.account_id = bp.account_id AND pr.score_impact IS NOT NULL), 0)
    )),
    bp.confirmed_deliveries + bp.missed_returned_count
  );

CREATE OR REPLACE FUNCTION public.place_order(_phone_hash text)
RETURNS public.parcel_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prof public.buyer_profiles; rec public.parcel_records;
BEGIN
  IF _phone_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid phone hash'; END IF;
  INSERT INTO public.buyer_profiles (phone_hash, trust_score, risk_factor, pending_count)
  VALUES (_phone_hash, 50, 'Neutral', 1)
  ON CONFLICT (phone_hash) DO UPDATE SET pending_count = public.buyer_profiles.pending_count + 1
  RETURNING * INTO prof;
  INSERT INTO public.parcel_records (account_id, phone_hash) VALUES (prof.account_id, prof.phone_hash)
  RETURNING * INTO rec;
  RETURN rec;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_parcel(_order_id text, _reason text)
RETURNS public.buyer_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts integer; st text; rec public.parcel_records; prof public.buyer_profiles;
BEGIN
  SELECT p, s INTO pts, st FROM (VALUES
    ('Confirmed Received — Standard COD', 10, 'Confirmed Received'),
    ('Confirmed Received — Protected COD (With Deposit)', 15, 'Confirmed Received'),
    ('Requested Reschedule / Valid Prior Notice', -5, 'Missed / Returned'),
    ('Temporarily Unavailable on 1st Attempt', -8, 'Missed / Returned'),
    ('Buyer Unreachable (Missed Courier Calls/SMS)', -15, 'Missed / Returned'),
    ('No Cash Ready Upon Delivery', -18, 'Missed / Returned'),
    ('Refused Parcel at Doorstep Without Valid Reason', -25, 'Missed / Returned'),
    ('Fake Address / Bogus Order', -35, 'Missed / Returned')
  ) AS r(reason, p, s) WHERE r.reason = _reason;
  IF pts IS NULL THEN RAISE EXCEPTION 'Unknown reason'; END IF;

  UPDATE public.parcel_records SET parcel_status = st, reason = _reason, score_impact = pts
  WHERE order_id = _order_id AND parcel_status = 'Pending' RETURNING * INTO rec;
  IF rec.id IS NULL THEN RAISE EXCEPTION 'Parcel not pending'; END IF;

  UPDATE public.buyer_profiles SET
    trust_score = LEAST(100, GREATEST(0, trust_score + pts)),
    pending_count = GREATEST(pending_count - 1, 0),
    confirmed_deliveries = confirmed_deliveries + (CASE WHEN st = 'Confirmed Received' THEN 1 ELSE 0 END),
    missed_returned_count = missed_returned_count + (CASE WHEN st = 'Missed / Returned' THEN 1 ELSE 0 END)
  WHERE account_id = rec.account_id RETURNING * INTO prof;

  UPDATE public.buyer_profiles SET risk_factor = public.compute_risk_factor(trust_score, confirmed_deliveries + missed_returned_count)
  WHERE id = prof.id RETURNING * INTO prof;
  RETURN prof;
END $$;

CREATE OR REPLACE FUNCTION public.apply_appeal(
  _order_id text, _category text, _explanation text, _evidence text,
  _verdict text, _restored integer, _summary text, _checks jsonb
) RETURNS public.buyer_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec public.parcel_records; prof public.buyer_profiles;
BEGIN
  SELECT * INTO rec FROM public.parcel_records WHERE order_id = _order_id FOR UPDATE;
  IF rec.id IS NULL THEN RAISE EXCEPTION 'Unknown order'; END IF;
  IF rec.parcel_status <> 'Missed / Returned' OR COALESCE(rec.score_impact, 0) >= 0 THEN
    RAISE EXCEPTION 'Order was not penalized';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appeals WHERE order_id = _order_id) THEN
    RAISE EXCEPTION 'Order already appealed';
  END IF;

  -- AI Review stores the report for human moderation without automatically modifying trust_score (restored_points = 0)
  INSERT INTO public.appeals (order_id, account_id, category, explanation, evidence, verdict, restored_points, summary, checks)
  VALUES (_order_id, rec.account_id, _category, _explanation, _evidence, _verdict, 0, _summary, _checks);

  SELECT * INTO prof FROM public.buyer_profiles WHERE account_id = rec.account_id;
  RETURN prof;
END $$;
