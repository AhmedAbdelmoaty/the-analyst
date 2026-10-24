-- Run ONLY against the ephemeral local test database created by scripts/test-paymob-db.sh.
DO $$
DECLARE uid uuid:='11111111-1111-4111-8111-111111111111'; other_uid uuid:='22222222-2222-4222-8222-222222222222'; begun jsonb; oid uuid; second_attempt uuid; result text; original_expiry timestamptz;
BEGIN
 begun:=public.payment_begin(uid,'test',40000,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ARRAY[200]::bigint[]);
 oid:=(begun->>'orderId')::uuid;
 IF (public.payment_begin(uid,'test',40000,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ARRAY[200]::bigint[])->>'orderId')::uuid<>oid THEN RAISE EXCEPTION 'retry duplicated order'; END IF;
 UPDATE public.payment_attempts SET provider_order_id=300,status='pending' WHERE id=(begun->>'attemptId')::uuid;
 BEGIN
  PERFORM public.payment_begin(uid,'test',120000,gen_random_uuid(),ARRAY[200]::bigint[]);
  RAISE EXCEPTION 'unresolved order allowed another charge';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'payment_attempt_pending' THEN RAISE; END IF; END;
 result:=public.payment_apply_event('test','wrong-amount',100,300,200,120000,'EGP','paid',now());
 IF result<>'mismatch' OR EXISTS(SELECT 1 FROM annual_entitlements) THEN RAISE EXCEPTION 'wrong amount activated'; END IF;
 IF public.payment_apply_event('test','wrong-currency',100,300,200,40000,'USD','paid',now())<>'mismatch' THEN RAISE EXCEPTION 'wrong currency accepted'; END IF;
 IF public.payment_apply_event('test','wrong-order',100,999,200,40000,'EGP','paid',now())<>'unmatched' THEN RAISE EXCEPTION 'wrong order accepted'; END IF;
 IF public.payment_apply_event('live','wrong-env',100,300,200,40000,'EGP','paid',now())<>'unmatched' THEN RAISE EXCEPTION 'environment mixed'; END IF;
 IF public.payment_apply_event('test','confirmed',100,300,200,40000,'EGP','paid',now())<>'paid' THEN RAISE EXCEPTION 'confirmed payment not activated'; END IF;
 -- Matching callback activates once; repeat cannot extend it.
 SELECT expires_at INTO original_expiry FROM annual_entitlements WHERE order_id=oid;
 IF public.payment_apply_event('test','confirmed',100,300,200,40000,'EGP','paid',now())<>'duplicate' THEN RAISE EXCEPTION 'not deduplicated'; END IF;
 PERFORM public.payment_apply_event('test','delayed-pending',100,300,200,40000,'EGP','pending',null);
 PERFORM public.payment_apply_event('test','delayed-failure',100,300,200,40000,'EGP','failed',null);
 IF (SELECT status FROM payment_orders WHERE id=oid)<>'paid' THEN RAISE EXCEPTION 'paid regressed'; END IF;
 INSERT INTO payment_attempts(order_id,environment,request_key,integration_ids,provider_order_id,status) VALUES(oid,'test',gen_random_uuid(),ARRAY[200],301,'pending') RETURNING id INTO second_attempt;
 PERFORM public.payment_apply_event('test','second-paid',101,301,200,40000,'EGP','paid',now());
 IF (SELECT count(*) FROM annual_entitlements WHERE order_id=oid)<>1 OR (SELECT expires_at FROM annual_entitlements WHERE order_id=oid)<>original_expiry THEN RAISE EXCEPTION 'multiple attempts extended subscription'; END IF;
 PERFORM public.payment_apply_event('test','refund',100,300,200,40000,'EGP','refunded',null);
 PERFORM public.payment_apply_event('test','late-paid',100,300,200,40000,'EGP','paid',now());
 IF (SELECT revoked_at FROM annual_entitlements WHERE order_id=oid) IS NULL OR (SELECT status FROM payment_orders WHERE id=oid)<>'refunded' THEN RAISE EXCEPTION 'refund undone'; END IF;
 IF EXISTS(SELECT 1 FROM annual_entitlements WHERE user_id=other_uid) THEN RAISE EXCEPTION 'wrong customer granted'; END IF;
 IF has_function_privilege('authenticated','public.payment_begin(uuid,text,integer,uuid,bigint[])','execute') OR has_function_privilege('authenticated','public.payment_apply_event(text,text,bigint,bigint,bigint,integer,text,text,timestamptz)','execute') THEN RAISE EXCEPTION 'customer can activate'; END IF;
 IF has_table_privilege('authenticated','annual_entitlements','insert') OR has_table_privilege('authenticated','payment_orders','update') THEN RAISE EXCEPTION 'customer can write payment'; END IF;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.payment_orders) OR EXISTS(SELECT 1 FROM public.annual_entitlements) THEN RAISE EXCEPTION 'RLS exposed another customer'; END IF;
 BEGIN UPDATE public.payment_orders SET status='paid'; RAISE EXCEPTION 'unauthorized update succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.annual_entitlements(user_id,order_id,environment,transaction_id,starts_at,expires_at) VALUES(gen_random_uuid(),gen_random_uuid(),'test',999,now(),now()); RAISE EXCEPTION 'unauthorized entitlement succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$
DECLARE begun jsonb; oid uuid;
BEGIN
 begun:=public.payment_begin('33333333-3333-4333-8333-333333333333','test',120000,gen_random_uuid(),ARRAY[200]::bigint[]); oid:=(begun->>'orderId')::uuid;
 UPDATE payment_attempts SET provider_order_id=500,status='pending' WHERE order_id=oid;
 PERFORM public.payment_apply_event('test','pending',500,500,200,120000,'EGP','pending',null);
 IF EXISTS(SELECT 1 FROM annual_entitlements WHERE order_id=oid) THEN RAISE EXCEPTION 'pending granted'; END IF;
 PERFORM public.payment_apply_event('test','failed',500,500,200,120000,'EGP','failed',null);
 IF EXISTS(SELECT 1 FROM annual_entitlements WHERE order_id=oid) THEN RAISE EXCEPTION 'failed granted'; END IF;
 PERFORM public.payment_apply_event('test','delayed-confirmed',500,500,200,120000,'EGP','paid','2024-02-29T12:30:00Z');
 IF (SELECT expires_at FROM annual_entitlements WHERE order_id=oid)<>'2025-02-28T12:30:00Z' THEN RAISE EXCEPTION 'calendar year incorrect'; END IF;
 PERFORM public.payment_apply_event('test','void',500,500,200,120000,'EGP','voided',null);
 IF (SELECT revoked_at FROM annual_entitlements WHERE order_id=oid) IS NULL THEN RAISE EXCEPTION 'void did not revoke'; END IF;
END $$;
SELECT 'paymob local SQL security and transitions passed' AS result;