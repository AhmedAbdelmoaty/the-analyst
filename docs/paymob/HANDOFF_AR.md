# تجهيز Paymob — 24 أكتوبر 2026

## الحالة والملفات

هذا **تجهيز محلي معطّل، وليس إطلاقًا أو اعتمادًا إنتاجيًا**. لم تُستدعَ Paymob ولم تُطبق SQL على Cloud، ولم تُنشر وظائف أو واجهة أو يُدفع Git. لم تُعدّل حسابات/اشتراكات حقيقية أو قواعد وصول الألعاب. راجعت الترحيلات الموجودة في المصدر؛ سجل الترحيلات والسياسات الحالية على Cloud غير متحقق منه بهذه المهمة.

- SQL المعروض للمراجعة: `docs/paymob/payment-foundation.sql`؛ خمسة جداول جديدة: الطلبات، المحاولات، أحداث الإشعار، الاستحقاقات السنوية، وسجل انتقالات الحالة. لا يغيّر/يحذف سجلات أو سياسات المشروع الحالية. صلاحيات القراءة للعملاء مقيدة بالمالك؛ الكتابة وRPCs للخادم فقط. لا FK جديد إلى Auth ولا ملفات شخصية جديدة.
- وظائف قابلة للتشغيل مُجهزة في `docs/paymob/functions/`: `paymob-checkout`, `paymob-webhook`, `paymob-subscription`, `paymob-reconcile` و`_shared`. وُضعت خارج مجلد النشر التلقائي عمدًا. بعد موافقة منفصلة فقط تُنقل للموضع المعتمد، وتُنشر الوظائف المحددة؛ لا يُمس `phone-auth`.
- صفحات ملخص الاشتراك واشتراكي أعيد استخدامها؛ أُضيف `/subscription/return` وحالات انتظار/فشل/تحديث. لا تُعرض طرق دفع على أنها متاحة. حقول فاتورة Paymob تُعرض عند التفعيل فقط؛ لا تغيّر سعر الهاتف ولا بيانات الحساب.
- بوابتا `PAYMOB_ROLLOUT_APPROVED` و`PAYMENT_UI_ENABLED` تظلان `false`. إضافة مفاتيح وحدها لا تفتح الدفع. لا توجد قيود ألعاب جديدة.

## المواصفات الرسمية التي فُحصت

- [Create Intention](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention): `POST https://accept.paymob.com/v1/intention/`, اعتماد `Token` باستخدام Secret Key. مبلغ `amount` بوحدة القرش: 40000 أو 120000؛ العملة EGP. حفظ `id` و`intention_order_id` قبل تحويل اللاعب. `special_reference` هو معرف محاولة محلية، لا هوية المستخدم.
- [Unified Checkout](https://developers.paymob.com/paymob-docs/developers/checkout-experiences/unified-checkout-redirection): `https://eg.checkout.paymob.com/?publicKey=…&clientSecret=…`، وليس مسار checkout القديم. لا نحفظ/نسجل client secret أو URL الدفع في السجلات.
- [Transaction callbacks](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/transaction-callbacks) و[HMAC](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac/hmac-transaction-callback): POST `obj`، توقيع query `hmac`، عشرون حقلًا بالترتيب الرسمي، HMAC-SHA512، تحقق تشفيري WebCrypto. لا ثقة في extras أو merchant reference غير الموقع؛ الربط بالـprovider order المحفوظ، المبلغ، العملة، integration والمالك المحلي.
- [Inquiry overview](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/transaction-inquiry)، [transaction](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/transaction-inquiry/by-transaction-id)، [order](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/transaction-inquiry/by-order-id-or-reference)، [auth token](https://developers.paymob.com/paymob-docs/developers/authentication-request-generate-auth-token-1): API Key منفصل لتوليد token الاستعلام؛ ليس مسار إنشاء Intention القديم. يعاد الاستعلام قبل التفعيل لمنع إشعار قديم من تجاوز استرداد أحدث.

## الأمان والاشتراك

السعر يُستخرج من `getUser(token)` وهاتف Auth المؤكد بنمط الهاتف المصري المعتمد؛ لا سعر أو خصم في جسم الطلب. 12 شهرًا تقويميًا مع ضبط 29 فبراير، دفع مرة واحدة وتجديد يدوي بعد انتهاء الاشتراك. لا تتجدد المدة بتكرار callback أو تعدد المحاولات؛ transaction فريد وorder واحد ينتج استحقاقًا واحدًا داخل معاملة ذرية.

فشل/انتظار لا يفعلان اشتراكًا. استرداد/إلغاء الدفع يسحب الاستحقاق المرتبط؛ إشعار نجاح قديم لا يعيده. معاملات authorization/capture/child غير المتوقعة تُحال للمراجعة ولا تمنح وصولًا. الاسترداد الجزئي يُعامل تحفظيًا بسحب الاستحقاق عند ظهور `is_refunded`؛ سياسة المنتج ومعنى أعلام الاسترداد يحتاجان اعتمادًا قبل Live. لا توجد أوامر لتنفيذ refund/void من التطبيق.

الطلب غير المحسوم بسبب انقطاع الشبكة لا يعاد إنشاؤه تلقائيًا؛ يعاد الاستعلام عنه. callback المبكر قبل حفظ الربط يرجع 503، والتسوية بالاستعلام بديل لتأخر الإشعار. إعادة فحص العميل مقيدة بالمالك و30 ثانية بين فحوص كل محاولة؛ إنشاء الدفع محدود بخمس محاولات/ساعة. عدم العثور على حالة موثوقة يترك الدفع غير محسوم، لا يعامله كفشل قطعي ولا يسمح بطلب بديل قد يكرر الخصم.

## إعدادات Secrets المطلوبة

أدخلها لاحقًا عبر **Lovable Cloud → Secrets** أو نموذج الأسرار الآمن عند الموافقة، وليس الشات ولا VITE ولا ملف في Git:

| Test | Live | المصدر |
|---|---|---|
| `PAYMOB_TEST_SECRET_KEY` | `PAYMOB_LIVE_SECRET_KEY` | Paymob Developers / Integration Credentials |
| `PAYMOB_TEST_PUBLIC_KEY` | `PAYMOB_LIVE_PUBLIC_KEY` | نفس صفحة بيانات التكامل |
| `PAYMOB_TEST_HMAC_SECRET` | `PAYMOB_LIVE_HMAC_SECRET` | HMAC الخاص بالتكامل |
| `PAYMOB_TEST_API_KEY` | `PAYMOB_LIVE_API_KEY` | API Key للاستعلام الخادمي |
| `PAYMOB_TEST_INTEGRATION_IDS` | `PAYMOB_LIVE_INTEGRATION_IDS` | Payment Integrations؛ أرقام مفصولة بفواصل ومطابقة للبيئة وEGP |

إعدادات تشغيل خادمية: `PAYMOB_ENVIRONMENT=test|live`، `PAYMOB_ENABLED=false` افتراضيًا، `PAYMOB_APP_ORIGIN`، `PAYMOB_WEBHOOK_URL`. `PAYMOB_NAIVE_TIMESTAMP_UTC_VERIFIED` يبقى غير مفعل حتى تأكيد منطقة زمن timestamps غير الموسومة من Paymob. مفاتيح Cloud الداخلية يوفرها التشغيل؛ لا يحتاج المستخدم استخراج service-role key ولا تُكشف قيمه.

## webhook والعودة

**لم تُنشر الوظيفة؛ لذلك لا يوجد endpoint منشور مؤكد أو مسجل لدى Paymob.** بعد اعتماد النشر في بيئة Test معزولة يُؤخذ عنوان HTTPS الفعلي لوظيفة `paymob-webhook`، ويُسجل في `PAYMOB_WEBHOOK_URL` ويُعرض لك حينها. لا ننشره تخمينًا ولا ندعي تسجيله.

عنوان العودة المخطط على الدومين الحالي: `https://theanalystedu.com/subscription/return`. يضيف الخادم `?order=<local order UUID>` عند إنشاء Intention؛ هذه الصفحة غير منشورة بهذه المهمة. في Test استخدم أصل الواجهة المعزولة المعتمد بدل الدومين الحي.

1. لكل Integration ID فعلي في Paymob: اضبط Transaction Processed Callback على عنوان الوظيفة المعتمد، وليس صفحة المتصفح.
2. اضبط Transaction Response/return على صفحة العودة للطرق التي تدعمه. يتم إرسال `notification_url` و`redirection_url` كذلك في Intention.
3. التوثيق يقول notification لكل الطرق، لكن redirection للبطاقة والمحفظة فقط؛ kiosk/غيرها لا يُفترض تحويل تلقائي لها. يجب التحقق من إعداد كل طريقة فعليًا؛ لا تُعلن طريقة قبل تأكيد تفعيلها.
4. لا نعتمد HMAC redirect أو `success=true` لمنح الاشتراك؛ توثيق GET نفسه يختلف بين `order` و`order_id`، ولا يضر ذلك لأن الصفحة لا تقيمه.

## الاختبارات والتشخيص

```sh
bun test tests/paymob.test.ts tests/subscription-ui.test.ts tests/subscription-pricing-ui.test.tsx
deno test tests/paymob-handlers.deno.ts
bash scripts/test-paymob-db.sh
deno check docs/paymob/functions/paymob-checkout/index.ts docs/paymob/functions/paymob-webhook/index.ts docs/paymob/functions/paymob-subscription/index.ts docs/paymob/functions/paymob-reconcile/index.ts
```

اختبار SQL ينشئ PostgreSQL محليًا مؤقتًا على Unix socket فقط، لا يستخدم اتصال Cloud، وينظفه بعد الانتهاء. يطبق SQL نفسه ثم يتحقق من RLS، منع الكتابة/التفعيل، المبلغ والعملة والبيئة، تأخر/تكرار الأحداث، محاولتين لنفس الطلب، الاسترداد والإلغاء ومدة السنة. اختبارات HMAC تستخدم مفتاح fixture عام صناعي وليس مفتاح تاجر. فُحصت صفحات المعاينة بجلسة حقيقية: زر الدفع معطل، redirect مزيف لم يفعل اشتراكًا، وصفر استدعاءات دفع؛ تم اعتراض كتابات تتبع الزيارة في هذا الفحص.

عند تأخر callback: تأكد من ID والبيئة والعملة وnotification_url، وجود POST ووصوله إلى الوظيفة، HTTP status، ثم الربط المحفوظ وحالة الطلب. استخدم الاستعلام الموثق والتحقق من المالك بدل إعادة الدفع. لا تسجل payload/هاتف/PAN/مفاتيح/URL checkout أو توقيع. المصدر لا يسجل هذه البيانات؛ احتفظ فقط بمعرفات داخلية وسجل انتقالات محدود داخل الجداول المحمية. لا تغيّر حالة paid يدويًا. مراجعة محاولتين نجحتا على طلب واحد يجب أن تراجع خصمًا مزدوجًا لدى التاجر؛ الكود لا يمنح سنتين ولا يرد أموالًا آليًا.

## ما يحتاج موافقة / الاعتماد قبل Test ثم Live

- [ ] موافقة مستقلة على SQL المعروض؛ أثره إضافي فقط. تحقق من ledger Cloud الحالي قبل التطبيق، لا تعِد تشغيل ترحيلات المشروع كلها.
- [ ] بيئة Cloud Test معزولة مع أسرار Test، ثم موافقة نشر الوظائف المحددة فقط. لا تستخدم قاعدة الحسابات الحقيقية لاختبار نجاح مصطنع.
- [ ] إعداد webhook لكل طريقة ودفع Test فعلي: نجاح، فشل/إلغاء، انتظار ثم نجاح متأخر، callback مكرر، شبكة منقطعة، استرداد/void، ومحاولة إعادة دفع. مراجعة RLS deployed عبر مستخدمين Test، لا الاعتماد على فحص المصدر وحده.
- [ ] تأكيد timestamps: `created_at` وقت إنشاء المعاملة وقد يسبق التسوية في طرق الانتظار؛ يلزم إثبات حقل/مصدر وقت الدفع المؤكد لكل طريقة، وتعديل العقد قبل enablement إن اختلف. الدوال تحفظ بداية الموعد فقط من الوقت الخادمي المتحقق، ولا تثق بالمتصفح.
- [ ] تأكيد source_data/null contracts لكل طريقة، معاني refund/child/capture، وAPI retrieval الذي يعيد آخر معاملة فقط. لا يُفتح أي integration لا يطابق العقد المختبر.
- [ ] اعتماد سياسة refund/dispute والتجديد وتغطية كتالوج الألعاب. مصدر الحالة لا يمثل نظام نزاعات كاملًا؛ أحداث مجهولة تحفظ عدم التفعيل/المراجعة.
- [ ] التحقق من انتهاء/تعليق الاشتراك وعرضه والتجديد اليدوي، وعودة المتصفح دون callback والعكس، وعدم تجاوز الهاتف المصري غير المؤكد.
- [ ] مراجعة أمان واعتماد اختبار end-to-end كامل قبل تغيير بوابتي التعطيل. بيانات Test لا تمنح وصول Live.
- [ ] موافقة مستقلة للنشر الحي، أسرار Live ومطابقة IDs، تسجيل webhook الحي والتحقق منه، ثم إذن enable checkout ونشر الواجهة. لا توجد موافقة ضمنية هنا.
- [ ] قيود الألعاب تحتاج إذنًا مستقلًا وتنفيذًا خادميًا مناسبًا للألعاب التي تعمل محليًا؛ لم تُضف بهذه المهمة.

النجاح الحالي محلي/صناعي فقط، لا يثبت صحة حساب التاجر أو التسليم أو تحصيل Paymob. المعلّقات أعلاه تمنع وصف التكامل بأنه جاهز لتحصيل أموال حقيقية.