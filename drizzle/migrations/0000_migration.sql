CREATE SEQUENCE public.account_seq START 1001;
CREATE SEQUENCE public.order_seq START 10001;

CREATE TABLE public.buyer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL UNIQUE DEFAULT ('ACC-' || nextval('public.account_seq')),
  phone_hash text NOT NULL UNIQUE,
  trust_score integer NOT NULL DEFAULT 0,
  risk_factor text NOT NULL DEFAULT 'New / Unrated',
  confirmed_deliveries integer NOT NULL DEFAULT 0,
  missed_returned_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.parcel_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE DEFAULT ('ORD-' || nextval('public.order_seq')),
  account_id text NOT NULL REFERENCES public.buyer_profiles(account_id),
  phone_hash text NOT NULL REFERENCES public.buyer_profiles(phone_hash),
  parcel_status text NOT NULL DEFAULT 'Pending',
  reason text NOT NULL DEFAULT 'Pending',
  score_impact integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.parcel_records(account_id);
CREATE INDEX ON public.parcel_records(parcel_status);

GRANT SELECT ON public.buyer_profiles TO anon, authenticated;
GRANT SELECT ON public.parcel_records TO anon, authenticated;
GRANT ALL ON public.buyer_profiles TO service_role;
GRANT ALL ON public.parcel_records TO service_role;

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.buyer_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read parcels" ON public.parcel_records FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.compute_risk_factor(_score integer, _resolved integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _resolved = 0 THEN 'New / Unrated'
    WHEN _score >= 20 THEN 'Trusted'
    WHEN _score >= -10 THEN 'Watchlist'
    ELSE 'High Risk' END
$$;

CREATE OR REPLACE FUNCTION public.place_order(_phone_hash text)
RETURNS public.parcel_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prof public.buyer_profiles; rec public.parcel_records;
BEGIN
  IF _phone_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid phone hash'; END IF;
  INSERT INTO public.buyer_profiles (phone_hash, pending_count) VALUES (_phone_hash, 1)
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
    trust_score = trust_score + pts,
    pending_count = GREATEST(pending_count - 1, 0),
    confirmed_deliveries = confirmed_deliveries + (CASE WHEN st = 'Confirmed Received' THEN 1 ELSE 0 END),
    missed_returned_count = missed_returned_count + (CASE WHEN st = 'Missed / Returned' THEN 1 ELSE 0 END)
  WHERE account_id = rec.account_id RETURNING * INTO prof;

  UPDATE public.buyer_profiles SET risk_factor = public.compute_risk_factor(trust_score, confirmed_deliveries + missed_returned_count)
  WHERE id = prof.id RETURNING * INTO prof;
  RETURN prof;
END $$;

REVOKE ALL ON FUNCTION public.place_order(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_parcel(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_parcel(text, text) TO anon, authenticated;