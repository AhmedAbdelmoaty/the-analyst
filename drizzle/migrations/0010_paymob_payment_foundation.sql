CREATE TABLE public.payment_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 environment text NOT NULL CHECK(environment IN ('test','live')),
 amount_minor integer NOT NULL CHECK(amount_minor IN (40000,120000)),
 currency text NOT NULL DEFAULT 'EGP' CHECK(currency='EGP'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded','voided','review')),
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz,
 UNIQUE(id,environment)
);
GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_orders_owner ON public.payment_orders FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE TABLE public.payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL,
 environment text NOT NULL CHECK(environment IN ('test','live')),
 request_key uuid NOT NULL, status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','sending','unknown','pending','failed','paid','refunded','voided','review')),
 provider_intention_id text, provider_order_id bigint, integration_ids bigint[] NOT NULL,
 last_reconciled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,request_key), UNIQUE(environment,provider_order_id), UNIQUE(environment,provider_intention_id),
 FOREIGN KEY(order_id,environment) REFERENCES public.payment_orders(id,environment)
);
GRANT ALL ON public.payment_attempts TO service_role;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_webhook_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), environment text NOT NULL,
 transaction_id bigint NOT NULL, fingerprint text NOT NULL,
 order_id uuid REFERENCES public.payment_orders(id), state text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(environment,fingerprint)
);
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.annual_entitlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 order_id uuid NOT NULL UNIQUE REFERENCES public.payment_orders(id),
 environment text NOT NULL CHECK(environment IN ('test','live')),
 transaction_id bigint NOT NULL,
 starts_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, revocation_reason text,
 UNIQUE(environment,transaction_id)
);
GRANT SELECT ON public.annual_entitlements TO authenticated;
GRANT ALL ON public.annual_entitlements TO service_role;
ALTER TABLE public.annual_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY annual_entitlements_owner ON public.annual_entitlements FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE TABLE public.payment_status_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.payment_orders(id),
 event_id uuid REFERENCES public.payment_webhook_events(id),
 from_status text NOT NULL, to_status text NOT NULL, reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_status_audit TO service_role;
ALTER TABLE public.payment_status_audit ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.payment_begin(_uid uuid,_environment text,_amount integer,_request uuid,_integrations bigint[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.payment_orders; a public.payment_attempts;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text||_environment,0));
 SELECT pa.* INTO a FROM payment_attempts pa JOIN payment_orders po ON po.id=pa.order_id
  WHERE po.user_id=_uid AND po.environment=_environment AND pa.request_key=_request;
 IF FOUND THEN RETURN jsonb_build_object('orderId',a.order_id,'attemptId',a.id,'status',a.status); END IF;
 IF EXISTS(SELECT 1 FROM annual_entitlements WHERE user_id=_uid AND environment=_environment AND revoked_at IS NULL AND expires_at>now()) THEN
  RAISE EXCEPTION 'subscription_already_active';
 END IF;
 IF EXISTS(SELECT 1 FROM payment_attempts pa JOIN payment_orders po ON po.id=pa.order_id WHERE po.user_id=_uid AND po.environment=_environment AND pa.status IN ('sending','unknown','pending','creating')) THEN RAISE EXCEPTION 'payment_attempt_pending'; END IF;
 SELECT * INTO o FROM payment_orders WHERE user_id=_uid AND environment=_environment AND status='pending'
 AND amount_minor=_amount AND created_at>now()-interval '1 day' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN INSERT INTO payment_orders(user_id,environment,amount_minor) VALUES(_uid,_environment,_amount) RETURNING * INTO o; END IF;
 IF EXISTS(SELECT 1 FROM payment_attempts WHERE order_id=o.id AND status IN ('creating','sending','unknown','pending')) THEN RAISE EXCEPTION 'payment_attempt_pending'; END IF;
 IF (SELECT count(*) FROM payment_attempts pa JOIN payment_orders po ON po.id=pa.order_id WHERE po.user_id=_uid AND po.environment=_environment AND pa.created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'rate_limited'; END IF;
 INSERT INTO payment_attempts(order_id,environment,request_key,integration_ids) VALUES(o.id,_environment,_request,_integrations) RETURNING * INTO a;
 RETURN jsonb_build_object('orderId',o.id,'attemptId',a.id,'status',a.status);
END $$;
REVOKE ALL ON FUNCTION public.payment_begin(uuid,text,integer,uuid,bigint[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_begin(uuid,text,integer,uuid,bigint[]) TO service_role;

CREATE FUNCTION public.payment_apply_event(_environment text,_fingerprint text,_transaction bigint,_provider_order bigint,_integration bigint,_amount integer,_currency text,_state text,_confirmed_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.payment_attempts; o public.payment_orders; e uuid; next_status text; existing_transaction bigint;
BEGIN
 SELECT * INTO a FROM payment_attempts WHERE environment=_environment AND provider_order_id=_provider_order;
 IF NOT FOUND THEN RETURN 'unmatched'; END IF;
 SELECT * INTO o FROM payment_orders WHERE id=a.order_id FOR UPDATE;
 IF o.environment<>_environment OR o.amount_minor<>_amount OR o.currency<>_currency OR NOT (_integration=ANY(a.integration_ids)) THEN RETURN 'mismatch'; END IF;
 IF _state NOT IN ('pending','failed','paid','refunded','voided','review') THEN RETURN 'unexpected'; END IF;
 INSERT INTO payment_webhook_events(environment,transaction_id,fingerprint,order_id,state)
 VALUES(_environment,_transaction,_fingerprint,o.id,_state) ON CONFLICT DO NOTHING RETURNING id INTO e;
 IF e IS NULL THEN RETURN 'duplicate'; END IF;
 SELECT transaction_id INTO existing_transaction FROM annual_entitlements WHERE order_id=o.id;
 next_status := _state;
 IF _state IN ('refunded','voided') THEN
  IF existing_transaction IS NOT NULL AND existing_transaction<>_transaction THEN next_status:=o.status;
  ELSE UPDATE annual_entitlements SET revoked_at=COALESCE(revoked_at,now()),revocation_reason=_state WHERE order_id=o.id; END IF;
 ELSIF o.status IN ('refunded','voided','review') THEN next_status:=o.status;
 ELSIF _state='review' THEN
  UPDATE annual_entitlements SET revoked_at=COALESCE(revoked_at,now()),revocation_reason='review' WHERE order_id=o.id;
 ELSIF _state='paid' THEN
  IF _confirmed_at IS NULL OR _confirmed_at>now()+interval '5 minutes' THEN RAISE EXCEPTION 'invalid_confirmation_time'; END IF;
  IF EXISTS(SELECT 1 FROM annual_entitlements WHERE environment=_environment AND transaction_id=_transaction AND order_id<>o.id) THEN RAISE EXCEPTION 'transaction_already_bound'; END IF;
  INSERT INTO annual_entitlements(user_id,order_id,environment,transaction_id,starts_at,expires_at)
  VALUES(o.user_id,o.id,_environment,_transaction,_confirmed_at,(_confirmed_at AT TIME ZONE 'UTC'+interval '12 months') AT TIME ZONE 'UTC')
  ON CONFLICT(order_id) DO NOTHING;
  next_status:='paid';
 ELSIF o.status='paid' THEN next_status:=o.status;
 ELSIF _state='pending' AND o.status='failed' THEN next_status:=o.status;
 END IF;
 UPDATE payment_attempts SET status=CASE WHEN _state IN ('paid','refunded','voided') THEN _state WHEN status IN ('paid','refunded','voided') THEN status ELSE _state END WHERE id=a.id;
 UPDATE payment_orders SET status=next_status,paid_at=CASE WHEN next_status='paid' THEN COALESCE(paid_at,_confirmed_at) ELSE paid_at END WHERE id=o.id;
 INSERT INTO payment_status_audit(order_id,event_id,from_status,to_status,reason) VALUES(o.id,e,o.status,next_status,_state);
 RETURN next_status;
END $$;
REVOKE ALL ON FUNCTION public.payment_apply_event(text,text,bigint,bigint,bigint,integer,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_apply_event(text,text,bigint,bigint,bigint,integer,text,text,timestamptz) TO service_role;