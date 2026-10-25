-- Game-access feature flag storage. No client grants: only service_role can read/write rows;
-- clients and edge functions read the flag through the SECURITY DEFINER helper below.
CREATE TABLE public.app_flags (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_flags TO service_role;
ALTER TABLE public.app_flags ENABLE ROW LEVEL SECURITY;

-- Server-controlled enforcement switch. Defaults to OFF when the flag row is missing,
-- so credentials, sandbox payments or frontend publishes can never enable restrictions.
CREATE OR REPLACE FUNCTION public.paid_game_enforcement()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT coalesce((SELECT value FROM public.app_flags WHERE key = 'paid_game_enforcement'), 'off') = 'on'
$fn$;

-- Caller-owned access snapshot: enforcement flag plus the caller's active annual entitlement.
CREATE OR REPLACE FUNCTION public.my_game_access()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE uid uuid := auth.uid(); e record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO e FROM public.annual_entitlements
    WHERE user_id = uid AND revoked_at IS NULL AND starts_at <= now() AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'enforcement', public.paid_game_enforcement(),
    'entitled', e.id IS NOT NULL,
    'expires_at', e.expires_at,
    'environment', e.environment
  );
END $fn$;

-- Admin: payments/subscriptions overview metrics. Pending never counts as collected revenue.
CREATE OR REPLACE FUNCTION public.admin_payments_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'paid_count', (SELECT count(*) FROM public.payment_orders WHERE status = 'paid'),
    'collected_minor', (SELECT coalesce(sum(amount_minor), 0) FROM public.payment_orders WHERE status = 'paid'),
    'pending_count', (SELECT count(*) FROM public.payment_orders WHERE status = 'pending'),
    'failed_count', (SELECT count(*) FROM public.payment_orders WHERE status = 'failed'),
    'refunded_count', (SELECT count(*) FROM public.payment_orders WHERE status IN ('refunded','voided')),
    'review_count', (SELECT count(*) FROM public.payment_orders WHERE status = 'review'),
    'active_subscriptions', (SELECT count(*) FROM public.annual_entitlements WHERE revoked_at IS NULL AND expires_at > now()),
    'expired_subscriptions', (SELECT count(*) FROM public.annual_entitlements WHERE revoked_at IS NULL AND expires_at <= now()),
    'revoked_subscriptions', (SELECT count(*) FROM public.annual_entitlements WHERE revoked_at IS NOT NULL),
    'webhook_events', (SELECT count(*) FROM public.payment_webhook_events),
    'stuck_attempts', (SELECT count(*) FROM public.payment_attempts WHERE status IN ('creating','sending','unknown') AND created_at < now() - interval '1 hour')
  );
END $fn$;

-- Admin: payment orders with owner identity and latest attempt/provider references.
CREATE OR REPLACE FUNCTION public.admin_payment_orders(_status text DEFAULT NULL, _search text DEFAULT NULL, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE q text := nullif(trim(coalesce(_search, '')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN (
    WITH base AS (
      SELECT o.id, o.user_id, o.environment, o.amount_minor, o.currency, o.status, o.created_at, o.paid_at,
        p.first_name, p.last_name, p.phone,
        (SELECT a.provider_order_id FROM public.payment_attempts a WHERE a.order_id = o.id ORDER BY a.created_at DESC LIMIT 1) AS provider_order_id,
        (SELECT a.status FROM public.payment_attempts a WHERE a.order_id = o.id ORDER BY a.created_at DESC LIMIT 1) AS attempt_status,
        (SELECT en.transaction_id FROM public.annual_entitlements en WHERE en.order_id = o.id) AS transaction_id,
        (SELECT en.revoked_at IS NULL AND en.expires_at > now() FROM public.annual_entitlements en WHERE en.order_id = o.id) AS subscription_active
      FROM public.payment_orders o LEFT JOIN public.profiles p ON p.user_id = o.user_id
      WHERE (_status IS NULL OR o.status = _status)
        AND (q IS NULL OR concat_ws(' ', p.first_name, p.last_name) ILIKE '%'||q||'%' OR p.phone LIKE '%'||q||'%' OR o.id::text = q)
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM base),
      'rows', coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.created_at DESC) FROM (SELECT * FROM base LIMIT least(greatest(_limit,1),200) OFFSET greatest(_offset,0)) b), '[]'::jsonb)
    )
  );
END $fn$;

-- Admin: subscription/entitlement list with owner identity.
CREATE OR REPLACE FUNCTION public.admin_entitlements(_limit integer DEFAULT 200, _offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN (
    WITH base AS (
      SELECT e.id, e.user_id, e.environment, e.transaction_id, e.starts_at, e.expires_at, e.revoked_at, e.revocation_reason,
        p.first_name, p.last_name, p.phone, o.amount_minor, o.currency, o.status AS order_status
      FROM public.annual_entitlements e
      LEFT JOIN public.profiles p ON p.user_id = e.user_id
      LEFT JOIN public.payment_orders o ON o.id = e.order_id
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM base),
      'rows', coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.expires_at DESC) FROM (SELECT * FROM base LIMIT least(greatest(_limit,1),500) OFFSET greatest(_offset,0)) b), '[]'::jsonb)
    )
  );
END $fn$;