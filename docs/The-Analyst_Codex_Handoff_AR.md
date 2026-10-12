# The Analyst — سياق المشروع وتسليم العمل إلى Codex

هذه الوثيقة دليل للعمل على المشروع الموجود، وليست طلبًا لإعادة إنشائه. اقرأها مع `AGENTS.md` والكود الحالي. عند اختلاف النسخة المحلية عن المرجع أدناه، افحص الفروق أولًا؛ لا ترجع المشروع إلى هذا الـcommit تلقائيًا.

## 1. النسخة المرجعية وحدود المراجعة

- المستودع: https://github.com/AhmedAbdelmoaty/the-analyst.git
- الموقع: https://the-analyst-game.lovable.app
- المرجع الذي قرئ: `0aa20f46458ccd6a5c56ba83d701f4809b0f8c4b`، على `main` يوم 7 أكتوبر 2026. تاريخ الـcommit: 6 أكتوبر 2026، 19:40 UTC.
- تمت قراءة مسارات التطبيق والحسابات، وظيفة واتساب، ملفات اللعبتين، الحفظ والتوقيت وPWA، وملفات الاختبار. لا تُعامل هذه القراءة على أنها تجربة كاملة للموقع المنشور أو إثبات أن النشر يطابق هذا الـcommit.
- شُغلت وحدات TypeScript الفعلية للحسابات والتقييم عبر Node: تطابقت مجموعتا الإحصاءات و6 حالات تقييم. هذا ليس تشغيلًا لكامل اختبارات Bun أو اختبارًا للواجهات.
- فشل `npm ci --ignore-scripts --no-audit --no-fund` بسبب عدم مطابقة `package-lock.json` لـ`package.json`. لم يُشغل build بعده، ولم تُختبر حسابات حقيقية أو يُرسل OTP خلال هذه المراجعة.
- لم يُعدل الكود المنتج، ولم تُنشر نسخة، ولم تتغير قاعدة البيانات.

## 2. من نحن وما الذي نبنيه؟

IMP: Institute of Management Professionals. The Analyst علامة وتجربة تعليمية مرتبطة بالتفكير التحليلي وتحويل المعلومات إلى قرار عمل أفضل.

الجمهور المستهدف موظفون محترفون، Seniors، Managers، Team Leaders وصناع قرار. نريد لعبة ممتعة ومشهدًا وقصة ومشاركة فعلية، دون إحساس بامتحان مدرسي أو محاضرة طويلة. الحوار داخل الألعاب بالمصرية الطبيعية المهنية. واجهات الحسابات تستخدم عربية واضحة ومختصرة، مثل «إنشاء حساب» و«تسجيل الدخول».

المشروع بدأ بلعبة واحدة عن Problem Framing، ثم أضيفت الحسابات بواتساب، ثم Landing Page وتثبيت PWA، ثم صفحة ألعاب ولعبة إحصاء قصصية ثانية. الاتجاه المستقبلي منصة/مجتمع لتجارب متعددة تحت حساب وهوية واحدة. كلمة مجتمع لا تعني أن هناك الآن منشورات أو دردشة أو نظام مجموعات؛ هذه غير منفذة وغير مطلوبة تلقائيًا.

يوجد الآن لعبتان داخل هذا المستودع:
1. «أقل من المتوقع.. مقارنة بإيه؟» — اللعبة الأصلية عن صياغة المشكلة.
2. «قرار التكريم» — مقارنة أداء فريقين وتفسير الإحصاءات وبناء توصية.

Perception Lab مشروع آخر ومصدر بصري، وليس لعبة مدمجة هنا حتى هذا المرجع. اللعبة الإحصائية 3D القديمة مصدر لفكرة شاشة المقارنة ولوحة التوصية، وليست محركًا يجب استيراده.

## 3. قرارات الهوية والتصميم

- الأحمر المعتمد: `#A61E25`، مع الأبيض، الرمادي المحايد والفحمي.
- العربية Cairo؛ الإنجليزية Poppins عند الحاجة إلى نصوص إنجليزية مصممة. افحص توفر الخط فعلًا؛ لا تفترض أن كل المواضع تستخدمه.
- لا pink shadows أو glow وردي أو gradients أو ألوان مستوردة من لعبة الإحصاء القديمة.
- استخدم شعارات The Analyst وIMP الموجودة. لا تُعد رسمها.
- السطوح التفاعلية والحسابات فاتحة. الصور السينمائية قد يكون فوقها غطاء داكن للقراءة؛ لا تستبدل صور المشاهد لمجرد تطبيق light theme.
- لا تجعل لونًا أو ترتيبًا أو أيقونة يدل على الإجابة الصحيحة قبل التقديم.
- نسختا الحوار: بيضاء وفحمية، مع اسم وصورة المتحدث؛ اللون لا يكفي وحده للتمييز.
- اللاعب أبيض، والطرف الآخر فحمي في حواره معه. حوار شخصيتين أخريين يوزع النسختين بثبات.
- الشخصية في أقصى اليمين في RTL. هناك فجوة حالية تستحق تحققًا بصريًا مذكورة لاحقًا.
- الموبايل portrait والديسكتوب landscape، مع صور مشاهد منفصلة لكل اتجاه في اللعبة الجديدة. لا تفرض landscape على الهاتف.
- قلل التمرير والحشو، لكن لا تُخْفِ محتوى أو تُصغّر النص بصورة مؤذية لإجبار عدم التمرير.

## 4. التقنية وخريطة الدخول

React 18 + TypeScript + Vite 5 + React Router 6 + Tailwind + shadcn/Radix + Framer Motion + Supabase client + vite-plugin-pwa. ليس تطبيق Next.js أو TanStack Start، ولا يوجد سيرفر Node محلي مطلوب للحسابات في مسار التشغيل المقترح.

| المسار | الوظيفة |
|---|---|
| `/` | Landing عامة، إنشاء الحساب افتراضيًا لزائر بلا جلسة |
| `/login` | نفس إطار Landing بوضع الدخول |
| `/signup` | نفس إطار Landing بوضع التسجيل |
| `/forgot-password` | الاستعادة داخل نفس الإطار |
| `/app` | فحص الجلسة والملف، دعوة تثبيت اختيارية، ثم صفحة الألعاب |
| `/setup` | اختيار شخصية اللاعب واستكمال الملف |
| `/play` | اللعبة الأصلية، محمية بالجلسة والملف المكتمل |
| `/games/reward-decision` | قرار التكريم، محمية بالجلسة والملف المكتمل |
| `/admin/login` | تسجيل الإدارة بالبريد وكلمة المرور |
| `/admin/board-9k2x` | لوحة الإدارة؛ الصلاحية تُفحص ولا تُستنتج من المسار |

الملفات الأساسية: `src/App.tsx`, `src/pages/AppEntry.tsx`, `src/pages/Games.tsx`, `src/components/auth/Landing.tsx`, `src/pages/PlayerAuth.tsx`, `src/pages/Setup.tsx`, `src/contexts/AuthContext.tsx`.

`RequireProfile` لا يفك تركيب اللعب أثناء تحديث بيانات نفس المستخدم بالخلفية. `AuthContext` يستخدم UID ورقم طلب لمنع نتائج قديمة من استبدال ملف حساب جديد. حافظ على هذا السلوك.

نصوص Landing الحالية: «متعة اللعب، وقيمة التعلّم.»، «درّب طريقة تفكيرك… بتجربة تفاعلية.»، والوصف عن الأسئلة والأدلة والافتراضات. في النهاية `An experience by IMP` وشعار IMP.

## 5. التشغيل المحلي: الطريقة الأسرع المعتمدة

شغّل الواجهة محليًا واترك الـbackend الحالي في السحابة. لا تنشئ backend جديدًا، ولا تنقل الحسابات، ولا تفعل Twilio أو SMS. يلزم الإنترنت.

```bash
git clone https://github.com/AhmedAbdelmoaty/the-analyst.git
cd the-analyst
git switch -c codex/local-development
npm install
npm run dev
```

الرابط المتوقع `http://localhost:8080` وفق `vite.config.ts`؛ استخدم الرابط الذي يطبعه Vite إن تغير المنفذ. يفضّل Node LTS حديثًا متوافقًا مع الحزم، مثل Node 22. رقم Node هنا توصية للإعداد، وليس نسخة مقفلة في المستودع.

**لماذا npm install بدل npm ci في البداية؟** القفل الحالي ناقص حزم موجودة في manifest، منها Cairo وcountry-flag-icons وvite-plugin-pwa وحزم Drizzle. أصلح المطابقة داخل الفرع، دون ترقية مقصودة للحزم أو تغيير package manager عشوائيًا. `npm install` قد يولّد فروقًا في القفل؛ راجعها. لا تَعُد بنجاح الإعداد قبل تشغيل البناء.

الأوامر المتوفرة: `npm run dev`, `npm run build`, `npm run build:dev`, `npm run lint`, `npm run preview`. لا يوجد script باسم `npm test` حاليًا. اختبارات الوحدة تستخدم `bun:test`:

```bash
bun test tests/reward-decision.test.ts tests/round-persistence.test.ts
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
```

تشغيل Bun يتطلب تثبيته أولًا؛ لا تُحوّل الاختبارات إلى أداة أخرى لمجرد أنه غير متوفر دون سبب. lint قد يكشف مسائل قديمة؛ افصل baseline عن أخطاء التغيير الجديد.

### متغيرات الواجهة

ملف `.env` موجود في المرجع ويحمل أسماء:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`src/integrations/supabase/client.ts` يقرأ URL والمفتاح ويصنع العميل. `src/lib/supabase.ts` يعيد تصديره. لا تُنشئ عميلًا ثانيًا.

المشروع المتصل معرفه `cfpyfwcccjzzhltyordf`. لا يلزم نسخ المفتاح داخل هذه الوثيقة؛ اقرأ القيم من بيئة المستودع دون طباعتها. إذا احتجت overrides استخدم `.env.local`؛ نمط `*.local` متجاهل بالفعل. أعد تشغيل Vite بعد تغيير البيئة.

الـpublishable key مخصص للمتصفح؛ ليس Chakra token ولا service-role. لا تضع أي سر داخل متغير يبدأ بـ`VITE_`.

### ما الذي يعمل محليًا وما الذي يحتاج تحققًا؟

| الوظيفة | المتوقع عند الاتصال بالـbackend الحالي |
|---|---|
| الدخول برقم وكلمة مرور لحساب قائم | يعمل عبر managed Auth؛ جلسة localhost جديدة |
| تسجيل جديد/OTP/استعادة | يستدعي وظيفة phone-auth المنشورة؛ الأسرار تظل هناك |
| الملف والشخصية | تُقرأ/تُكتب في نفس بيانات السحابة |
| اللعبة الأصلية ونتيجتها | حالة محلية؛ النتيجة النهائية قد تُكتب في backend الحقيقي |
| قرار التكريم | الحساب مشترك، الجولة والنتيجة محليتان حاليًا |
| أصوات وصور اللعبة الأصلية | معظمها ملفات فعلية بالمستودع |
| صور قرار التكريم المؤقتة | تحتاج معالجة مسارات Lovable الخاصة الموضحة أدناه |
| PWA في npm run dev | worker معطل عمدًا؛ هذا طبيعي |

دخول الهاتف بكلمة المرور والـOTP المخصص لا يعتمدان على OAuth redirect. لا تغير redirect settings تلقائيًا كشرط لتجربة هذه الرحلة. إذا أضيف OAuth أو email-link لاحقًا، افحص allowlist الخاصة بروابطه. إذا فشل الطلب محليًا، افحص Console/Network: البيئة، OPTIONS/CORS، حالة الوظيفة وHTTP، ثم payload؛ لا تعطل الحراسة أو تضف service-role للمتصفح.

### حقيقة مهمة: الفرع ليس بيئة بيانات منفصلة

محلي + نفس البيئة = نفس الحسابات والبيانات الحقيقية. إنشاء حساب أو تغيير اسمه أو استعادة كلمة مروره له أثر حقيقي. استخدم حساب تجربة مخصصًا، ولا تحذف عملاء أو تعِد تعيين حساباتهم. لا تختبر الرسائل بإرسال متكرر لأرقام حقيقية. إرسال اختبار واتساب يحتاج رقمًا يحدده المستخدم.

الجلسات والحفظ المحلي معزولة حسب origin: الموقع وlocalhost مختلفان، وحتى localhost و127.0.0.1 أو منفذان مختلفان. ستسجل الدخول مرة أخرى، ولن تجد تقدمًا سابقًا تلقائيًا. هذا لا يعني حذف الحساب أو حدوث خلل بالحفظ.

## 6. صور Lovable ليست كلها ملفات صور داخل clone

**هذه نقطة إعداد محلي مؤكدة من الكود، يجب فحصها مبكرًا.** صور قرار التكريم مُشار إليها عبر ملفات `*.webp.asset.json`. تحتوي metadata و`url` يبدأ بـ`/__l5e/assets-v1/...`، وليس image bytes. `data/assets.ts` يستورد JSON ويستخدم `.url`.

لا يوجد مسار Vite proxy خاص بهذه الملفات في `vite.config.ts`، ولا مجلد `public/__l5e` يؤمنها في التشغيل المعتاد. لذلك الرابط النسبي سيتجه إلى localhost، وقد يرجع HTML fallback أو 404 بدل الصورة. المفتاح الصحيح وحده لا يحل ذلك.

لأسرع نسخة محلية مستقرة:
1. افحص عينة URL من JSON في الموقع المنشور، وتحقق من أن Content-Type صورة، وليس صفحة HTML ترجع 200.
2. إن كانت الأصول متاحة علنًا، اجلب الصور المؤقتة إلى مجلد محلي واضح، مع حفظ mapping للـasset IDs وportrait/landscape. لا تعيد توليدها.
3. أو استخدم resolver مركزي يوجّه هذه المسارات فقط إلى مصدرها المنشور أثناء التطوير، إذا كانت متاحة. تجنب تعديل عشرات المستهلكين يدويًا. هذا مؤقت ويظل معتمدًا على الشبكة والمصدر.
4. إن لم تكن متاحة، استخدم placeholders محلية مناسبة للاتجاه، أو اطلب تصدير الأصول من Lovable. حافظ على IDs ومخطط الاستبدال.
5. افحص صورة بطاقة اللعبة في `Games.tsx` وصور الشخصيات أيضًا؛ ليست الخلفيات وحدها المعتمدة على metadata.
6. فشل صورة لا يجب أن يسبب شاشة سوداء. fallback محلي + تحميل واضح + Error Boundary.

لا تفترض أن مجرد وجود JSON يعني وجود الأصل محليًا. لا تجعل placeholder landscape بديلًا دائمًا للـportrait. لا تستورد تصميم أو محرك 3D لهذه المعالجة.

## 7. الحسابات وواتساب — العقد الذي يجب الحفاظ عليه

### رحلة المستخدم

التسجيل: الاسم الأول والأخير + رقم واتساب + كلمة مرور وتأكيدها → إنشاء حساب native phone/password غير مؤكد → إرسال كود → التحقق → الدخول/اختيار الشخصية → صفحة الألعاب.

الدخول العادي: رقم + كلمة مرور عبر `supabase.auth.signInWithPassword`. لا إرسال OTP في كل دخول. رقم غير مؤكد يُرفض، والواجهة توفر إكمال التحقق.

الاستعادة: الرقم → كود واتساب → تحقق ينتج reset token محدودًا → كلمة مرور جديدة → الدخول. لا fake emails ولا تخزين كلمات مرور في جدول مخصص.

الحد الأدنى لكلمة المرور 8 أحرف/رموز/أرقام بأي تركيبة، دون فرض uppercase أو رمز أو تعقيد آخر. لا helper ثابت طويل تحت الحقل. رسالة الخطأ عند عدم تحقيق الحد لازمة.

### أين التنفيذ؟

- الواجهة: `src/pages/PlayerAuth.tsx`, `src/lib/phoneAuth.ts`, مكونات `src/components/auth/`.
- الدخول والجلسات والملف: `src/contexts/AuthContext.tsx`.
- وظيفة السيرفر: `supabase/functions/phone-auth/index.ts`.
- واجهة الاستدعاء: `supabase.functions.invoke('phone-auth', { body: { action, ...payload } })`.
- الإجراءات: `signup`, `send_signup_code`, `change_phone`, `verify_signup`, `recovery_start`, `recovery_verify`, `recovery_reset`.
- الأرقام E.164 داخل الحساب، وإزالة + فقط عند بناء recipient للإرسال. لا تغير normalization في موضع واحد وتترك الآخر.

### أسرار السيرفر

`CHAKRA_ACCESS_TOKEN`, `OTP_HMAC_SECRET`، وبيئة Supabase السيرفر `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` تُقرأ في الوظيفة المنشورة. ليست values مستنسخة من GitHub، ولا تحتاجها لتطوير الواجهة التي تستدعي السيرفر الموجود.

التكوين غير السري الموجود في الكود:
- Plugin ID: `176a71cc-6f86-4e29-b2cf-ec39b75c9dff`
- Sender phone-number ID: `972655752602773`؛ هذا معرف API وليس الرقم البشري المرئي.
- Template: `analyst_verification`، language `en`.
- Endpoint: `https://api.chakrahq.com/v1/ext/plugin/whatsapp/{pluginId}/phoneNumber/{recipient}/send-template-message`.
- Body يتضمن `whatsappPhoneNumberId`, `templateName`, `languageCode`, وmapping property `1` بقيمة الكود.

الرسائل تخرج من رقم الشركة المرتبط، لا من localhost. المستخدم أكد في مراحل سابقة وصول الأكواد فعليًا. لا تعتبر ذلك اختبارًا جديدًا في هذه النسخة.

الكود عشوائي cryptographic من 6 أرقام، صالح 5 دقائق؛ resend 60 ثانية؛ attempts 5 عبر وظيفة SQL قفل صف. الحفظ HMAC فقط. Recovery reset-token مهلة 10 دقائق واستهلاك مرة واحدة. حدود إرسال/تحقق الهاتف وIP موجودة. لا تسجل code أو password أو token أو response قد يعيد code.

حافظ على auto-confirm للهاتف مغلقًا، والتأكيد/تغيير كلمة المرور privileged على السيرفر بعد التحقق. لا تستخدم SMS hook ولا تفعل Twilio.

## 8. قاعدة البيانات والتشغيل الخلفي

الكيانات الرئيسية: `profiles`, `user_roles`, `completed_players`, `otp_challenges`, `otp_rate_events`.

- `profiles.phone` هوية موثقة تُكتب من السيرفر فقط؛ العميل يغير الاسم/الشخصية في نطاقه.
- بيانات OTP لا يقرأها العميل.
- الإدارة تعتمد role لا مجرد واجهة admin.
- نتيجة اللعبة الأصلية مرتبطة بـ`user_id` و`round_id`، مع upsert وunique index يمنع تكرار الجولة.

**يوجد تاريخ schema في مجلدين:** `supabase/migrations/` و`drizzle/migrations/`. الأخير يتضمن `0000_phone_otp_auth.sql`, `0001_profiles_phone_e164.sql`, `0002_completed_players_round_id.sql`. لا تفترض أن تشغيل مجلد Supabase وحده يبني backend كاملًا مطابقًا للمنشور. `drizzle/schema.ts` فارغ تلقائيًا، و`drizzle.config.ts` يشير إلى `LOVABLE_DB_MIGRATION_URL`. لا تطلب هذا السر لتشغيل الواجهة.

لا تنفذ migration أو db push على backend الحقيقي كجزء من clone/start. الحالة المنشورة للإعدادات والأسرار ومطبَّق migrations لا يمكن إثباتها من Git وحده. لا تعرض أسرارًا لتأكيد وجودها.

`supabase/config.toml` يحتوي project_id؛ لا يصوّر كل Auth settings أو إعداد نشر الوظيفة. إذا قررت تشغيل backend منفصلًا مستقبلًا، افحص أيضًا نشر phone-auth وJWT verification/CORS والأسرار وإعداد Auth، وليس ملفات SQL فقط.

## 9. اللعبة الأصلية: قصة ومحرك يجب عدم الإضرار بهما

العنوان «أقل من المتوقع.. مقارنة بإيه؟». منصور يكلف المحلل، ثم سفر ووصول إلى Velaro ومقابلة هشام صاحب المحل. اللاعب يطرح أسئلة ويجمع مستندات وملاحظات ثم يصيغ التقرير ويرسله ويستمع لرد منصور.

الفكرة: هشام يرى المبيعات أقل من المتوقع، لكن المقارنة بسنة تضمنت تحويلات استثنائية من فروع أخرى تضخم المرجع. الهدف فهم المشكلة والـbaseline قبل الانجراف لحل تدريب أو أسعار المنافسين أو التسويق.

المسار الأصلي: company-briefing → travel → velaro-street → arrival → inquiry → reflection → framing → email-send → mansour-receives → incoming-call → phone-call → result.

المحرك: spine `S1..S5`، ومسارات بديلة A/C/D وتجمعات موضوعات تمنع تكرار السؤال. ميزانية الأسئلة الأساسية 7؛ يوجد حد لإعادة الاستقصاء مرتين. التقرير المعروض حاليًا قسمان: التفسير الأدق للمشكلة والقرار التالي، رغم وجود أنواع/اختيارات أقدم للـclient_view داخل الكود. لا تعِد القسم الثالث لمجرد وجوده في البيانات.

ملفات الفهم:
- `src/contexts/PFGameContext.tsx`
- `src/lib/pf-case-engine/gameStateMachine.ts`
- `src/lib/pf-case/case-tree.ts`, `case-meta.ts`, `framing-board.ts`, `evidence-catalog.ts`
- `src/components/game/screens/`
- `src/components/game/EnhancedDialogue.tsx`, `ReportDocument.tsx`, `PFNotebook.tsx`
- `src/hooks/useSceneAudio.ts`، وملفات `src/lib/voiceover/`
- الأصول في `src/assets/`, `public/voiceover/`, `public/sounds/`.

نصوص وصوت وتوقيت وترتيب اللعبة الأصلية معتمدة. لا تختصرها بسبب أن اللعبة الجديدة اختصرت. لا تحرك الصوت دون تحديث مطابق للنص، ولا تضع أصوات جديدة فوق القديمة.

### الوقت والإيقاف والحفظ

- 7 دقائق active play فقط من «ابدأ الآن» على cover. لا يبدأ من تسجيل الدخول أو اختيار الشخصية.
- التوقف/إخفاء الصفحة/تبديل تطبيق/الخروج يوقف الوقت أيضًا. السياسة القديمة التي كانت تخصم الغياب ألغيت.
- قبول إرسال التقرير يوقف المهلة؛ الاتصال والنتيجة بعدها يكملان دون تهديد الوقت.
- إذا نفد الوقت قبل قبول الإرسال تظهر نهاية الوقت. send عند deadline أو بعدها يُرفض.
- لا صوت للعداد. نبض مرئي عند اقتراب النهاية، مع احترام reduced motion.
- العودة/restore تبدأ paused حتى «متابعة اللعب» فقط، دون رسالة طويلة.
- الحفظ نفس الجهاز والمتصفح/origin؛ ليس cloud sync. بعد reload قد يبدأ الصوت من بداية الجملة المحفوظة، وليس نفس عينة الصوت بالمللي ثانية.

ملفات العقود: `pf-time-challenge.ts` active remaining+runningSince، `pf-pause.ts` virtual timers/media/AudioContexts، `pf-game-persistence.ts` snapshot+scene progress، `pf-round-owner.ts` ملكية تبويب، `src/pages/Index.tsx` التنسيق بينها.

مفاتيح: `pf-game-save-v2:{uid}`, `pf-scene-v1:{uid}`, `pf-time-challenge-v2:{uid}`. scene scope بـroundId|screen. لا تستخدم مفتاح guest القديم لتوحيد الحسابات.

النتيجة: `ResultScreen.tsx` يحاول upsert `(user_id, round_id)` ويعلم النجاح محليًا بعد تأكيد الخادم ويعيد المحاولة. `duration_ms` الحالي مشتق من تاريخ بدء الاستقصاء وقد يشمل الغياب؛ ليس مساويًا تلقائيًا لمدة active timer. إن تغير عرض المدة أو ترتيب اللوحة، افهم هذا الفرق أولًا.

## 10. قرار التكريم: الحالة الفعلية بعد التعديل الأخير

المجلد `src/features/reward-decision/` معزول عن محرك اللعبة الأصلية. الحساب والشخصية مشتركان؛ لا timer ولا leaderboard backend خاص به الآن.

الشركة روّاد للأجهزة الكهربائية. شريف CEO وليس COO. حسام مدير المبيعات، داليا HR، مروان قائد الفريق الأول، محمود قائد الثاني. مروان ومحمود يظهران في السياق؛ لا مقابلات اختيارية حاليًا.

المهمة اختيار التكريم الجماعي، لا أعلى إجمالي وحده. معيار الفرد 85% أو أكثر، مع انتشار الأداء المقبول وتقارب النتائج. لا استنتاج أن قائدًا يجب معاقبته، ولا أن SD يضمن أداء المستقبل.

### البيانات الصحيحة

| المؤشر | فريق مروان | فريق محمود |
|---|---|---|
| أفراد الفريق | 10 | 10 |
| النتائج % | 72,75,78,80,82,84,99,112,119,149 | 85,86,87,87,88,88,89,89,90,91 |
| Mean | 95% | 88% |
| Median | 83% | 88% |
| Range | 77 نقطة مئوية | 6 نقاط مئوية |
| Population SD | 23.5 تقريبًا | 1.7 تقريبًا |
| Q1 / Q3 | 78 / 112 | 87 / 89 |
| IQR، وسيط النصفين | 34 نقطة مئوية | نقطتان مئويتان |
| الأفراد ≥85 | 4/10 | 10/10 |

العتبة ليست أداة زر حاليًا؛ العدد الأخير تفسير داخلي/بيانات أفراد، لا نتيجة يجب إظهارها تلقائيًا قبل التحليل. الأرقام القديمة 96/89.5 والرسوم القديمة لا تُستورد. مستهدف كل فرد مليون، وإجمالي المبيعات 9.5 و8.8 مليون في المستند.

### المشاهد والنصوص

الحوار الأساسي 5 محادثات × 3 مداخلات = 15 سطرًا. بياناته `data/script.ts`. احتفال قصير → خلاف حسام وداليا → تكليف شريف → مكاتب المبيعات وHR بأي ترتيب → تحليل → توصية → اجتماع 5 مداخلات بحسب التقرير → أثر وخلاصة.

المراحل `cover, celebration, debate, briefing, hub, sales, hr, workbench, recommendation, meeting, resolution, debrief`. `shotFor` يربط مراحل إلى A00..A25؛ ليس كل asset ID مشهدًا مستخدمًا بعد الاختصار. لا تعتبر عدد IDs هو عدد الصور المختلفة المطلوبة فورًا.

حسام يسلّم sales-summary وindividual-records، داليا policy عبر `Line.documentId`. عند الوصول للسطر يحفظ المستند وتبدأ حركة CSS، وبطاقة الفتح تظهر بعد اكتمال الكتابة. `CaseFile` يعرض المستندات والأدوات المستخدمة. لا زر حفظ للمستند أو المقارنة.

### التحليل والشارت المرجعي

الأدوات الخمس: Mean, Median, Range, SD, IQR. تظهر في شاشة Workbench واحدة، تفعَّل للفريقين وتحسب قيمها من `TEAMS`+`statistics.ts`. على الهاتف تبويب فريق، وعلى الكمبيوتر رسمان.

المستخدم وافق على رسم توضيحي يشبه مرجع Misunderstanding Statistics: أعمدة ومنحنى، الأول واسع ومتباعد والثاني ضيق متجمع. يجوز أن لا يمثل raw data حرفيًا بشرط «تصوّر توضيحي للتوزيع»، دون محاور كمية زائفة أو annotations تكشف الحل. القيم الحقيقية في المقارنة منفصلة. لا تسمه Normal Distribution بسبب مظهره فقط.

التنفيذ الحالي يستخدم heights ثابتة في `Workbench.tsx` وSVG polyline، مع عبارة الوصف وبدون محور رقمي. هذا مجرد تنفيذ أولي، وليس تحققًا من جودة المنحنى أو اكتمال overlays.

### التوصية والتقييم

مسودة: فريق+مستند مرجعي+حجتان بالضبط. الخيارات مرتبطة بما جُمع من docs وما استُخدم من tools. واجهة الإرسال تختبر الاكتمال فقط. بعد الإرسال تُحفظ نسخة `FinalReport` مع timestamp و`Evaluation`، ولا يوجد دفاع جديد أو اعتماد ثانٍ.

النجاح `supported`: محمود + policy + حجة أداء/انتشار صحيحة + حجة spread صحيحة.
اختيار محمود مع سوء تفسير/مستند غير مناسب/نوع ناقص: `insufficient`.
اختيار مروان: `criterion_mismatch`.

Argument IDs:
- `median-mahmoud`: وسيط محمود88 مقابل83، مستوى الأداء الأوسط أعلى؛ صحيحة.
- `records-coverage`: كشف الأفراد جميع محمود≥85؛ صحيحة إذا المستند مكتسب.
- `range-mahmoud`, `sd-mahmoud`, `iqr-mahmoud`: حجج تقارب صحيحة إذا استُخدمت أداة كل منها.
- `mean-marwan`: متوسط مروان الأعلى يثبت وحده الاستحقاق؛ خاطئة.
- `median-proves-all`: الوسيط≥85 يعني الجميع≥85؛ خاطئة.
- `spread-proves-level`: التشتت المنخفض وحده يثبت مستوى الأداء العالي؛ خاطئة.
- `spread-predicts-future`: التقارب يضمن تحسن المستقبل؛ خاطئة.

الفريق الصحيح بالصدفة لا ينجح. حجتا تشتت وحدهما لا تكفيان. Meeting يعرض التوصية المحفوظة في سطر اللاعب، ثم ردود على reason. الردود الحالية شرطية على تصنيف السبب، وليست مخصصة بالكامل لكل زوج حجج.

الخاتمة supported تشير لتحسن في تقرير الشهر التالي، wrong-team لتراجع بعض النتائج الاستثنائية، insufficient لضعف المبررات. هذه أحداث قصصية لا causal forecast؛ حاليًا عبارة قصيرة وليست dataset جديدة مفصلة أو مشهدًا سينمائيًا نهائيًا.

### حفظ الجولة

`schemaVersion:3`, `caseVersion:'rowad-v2'`؛ storage key ما زال `the-analyst:reward-decision:v1:{uid}`. لا تغير المفتاح من تلقاء نفسك بسبب أن الاسم v1 قديم، وإلا تفقد الجولات.

يحفظ phase/stage/dialogueIndex/visibleGraphemes، visited/docs، usedTools/visibleTools/activeTeamChart، draft/submitted/evaluation، paused/revision/runId. restore يفرض paused خارج cover.

ترحيل schema2 يحوّل أدوات ev_* وdocs والـdraft وينقل مراحل متأخرة إلى recommendation، لا يمنح نتيجة قديمة نجاحًا جديدًا. schema1 يعد corrupt حاليًا. افحص الترحيل نفسه قبل ادعاء أنه يغطي كل مرحلة.

ملكية tab عبر `ownership.ts`، lease 5 ثوانٍ وتجديد كل ثانيتين. تمنع كتابة تبويب خاسر لنفس run. توجد مخاطر different-run موضحة لاحقًا.

## 11. الأصول والحركة والصوت — ما بقي فعليًا

- صور المرحلة الحالية مؤقتة مستعارة من Perception Lab عبر metadata. final assets لم تولد بعد.
- أنواع مشاهد cover/hub/office/file/data/meeting لكل منها portrait+landscape، و26shotIDs تربط بها.
- صور شريف/حسام/داليا مؤقتة. مروان ومحمود بلا صورة placeholder: initial badge مقصود بدل استعارة وجه خاطئ.
- اللاعب يستخدم analyst أو sara وفق الجنس.
- `SHOT_MOTION` و`SHOT_ASSETS.motionEnabled` كلاهما disabled؛ camera motion النهائي مؤجل. الإعدادات موجودة لكنها ليست حركة منفذة.
- `ScenePlayer` crossfade .35 ثانية، وانتقال المحتوى .2 ثانية. وجود قيم إضافية في `TRANSITIONS` لا يثبت أنها موصولة.
- لا تسجيلات VO للعبة الجديدة. لا تعد المستخدم بأن استبدال الصور فقط سيجعل كل الصوت والحركة النهائية جاهزين.
- عندما تُولد الأصول لاحقًا: وصف اللقطة، focal point، مناطق UI الآمنة، ثبات شكل الشخصية والإضاءة، نسخة portrait/landscape. الحركة المبنية على تكوين الصورة تحتاج ضبطًا وقت الاستبدال، ولا يُعاد بناء flow لأجل تغيير الصورة.

## 12. PWA

`public/manifest.webmanifest`: The Analyst، id/start_url `/app`، scope `/`، standalone، portrait-primary، أحمر IMP وأيقونات192/512 وmaskable. هذا Web App وليس Android/iOS native package.

`InstallContext` يلتقط الطلب المتاح، تثبيت اختياري بعد الحساب وقبل دخول الألعاب، إرشادات عند غياب beforeinstallprompt، ولا زر وهمي يعمل على كل متصفح. الإلغاء/التأجيل محفوظ.

`registerAppWorker.ts` لا يسجل worker في development أو iframe/preview/`?sw=off`. عند production يفحص update عند الظهور/الرجوع ويؤجله داخل `/play` و`/games/reward-decision`. `UpdateGate` يطبقه في نقطة آمنة خارج اللعب؛ اللعبة الأصلية توفر إجراء تحديث أثناء pause. لا تفترض أن اللعبة الجديدة توفر نفس الزر؛ افحصها.

ليس هناك وعد offline كامل. الحساب والرسائل ونتائج اللعبة الأصلية تتطلب الشبكة. نظام caching محدود ولا يخزن Auth أو OTP أو بيانات اللاعبين.

التعديل المنشور يصل للتطبيق المثبت عبر الشبكة/worker وقد ينتظر نقطة آمنة، وليس لحظيًا مضمونًا لكل جهاز. لا تكسر session أو save لتحقيق تحديث فوري.

## 13. فجوات وملاحظات مستندة إلى الكود — ليست تغييرات مأذونًا بتنفيذها كلها الآن

هذه قائمة تمنع Codex من افتراض الكمال. ابدأ بالإعداد المحلي، ثم اعرض أثر أي إصلاح gameplay قبل تغيير السلوك المعتمد.

| النقطة | دليل النسخة الحالية | الإجراء المناسب عند العمل عليها |
|---|---|---|
| npm clean install | package-lock غير مطابق، npm ci فشل فعلًا | أصلح القفل داخل الفرع وراجع build |
| الصور المحلية | JSON URLs `/__l5e` بدون proxy/ملفات public | resolver أو تنزيل أصول/placeholder محلي؛ افحص network |
| الحوار مع HR | player light وداليا light في SPEAKERS | tone حسب سياق المحادثة، مع ثبات الطرفين |
| مكان الصورة | grid RTL 1fr+6.5rem، portrait في column2 عبر CSS | تحقق screenshot من اليمين/اليسار وأصلح placement إن لازم |
| إخفاء الأدوات | visibleTools يغير زر active لكن جدول القيم يستخدم usedTools | افصل المستخدمة للحفظ عن الظاهرة للعرض |
| overlays والمنحنى | الرسم ثابت وpolyline بدون tool overlay props | أكمل العلامات/المنحنى مع عدم إيهام دقة الرسم التوضيحي |
| مصدر أرقام موحد | أرقام sales-summary وARGUMENTS النصية ثابتة أيضًا | عند تغيير بيانات مستقبلًا امنع drift باشتقاق العرض أو tests |
| فتح الملف | fileOpen لا يدخل frozen في DialoguePanel | تحقق توقف الكتابة خلف الملف؛ لا تعِد السطر عند الإغلاق |
| زيارة مكتب مكتمل | visit يعيد talk دائمًا | إن طلب المستخدم، افتح docs دون إعادة الحوار |
| save قديم | migrateV2 يحتفظ stage/index قديمين رغم اختصار script | خريطة stage/line ID آمنة؛ اختبر sales doc وcelebration/debate |
| validation الحفظ | schema3 دمج مباشر مع base دون validation شامل | تحقق enums/IDs/index/submitted/evaluation قبل render |
| تبويبان بجولتين | owner key per user+run، save يرفض stale لنفس run فقط | اختبر restart في tab آخر؛ لا تدع run قديم يكتب فوق الجديد |
| reduced motion vs pause | MotionConfig reducedMotion لا يجمد كل opacity transition | تحقق freeze الحقيقي للانتقالات، لا تعتبر تقليل الحركة pause |
| صفحة الألعاب | ما زالت «اختار قضيتك»/«فتح القضية» و«دافع عن توصيتك» | تحديث copy خاص باللعبة الجديدة عند طلبه دون إعادة كتابة الأصلية |
| meeting | فرع reason عام، player report طويل في سطر واحد | تحسين pacing/feedback لاحقًا دون إعادة فتح القرار |
| النتائج الجديدة | Reward Decision local فقط | لا تضف leaderboard/cloud results تلقائيًا |

لا نعتمد على Median وحده لإثبات أن كل الأفراد يحققون المعيار. ولا نسوّي بين «spread منخفض» و«أداء عالٍ». policy+data هما سياق صلاحية القرار، والإحصاءات أدوات تفسير.

## 14. الاختبارات والخطوات الأولى لـCodex

1. اقرأ `AGENTS.md` وهذه الوثيقة. افحص `git status`, branch وHEAD، ثم الفروق عن المرجع إن كان مختلفًا.
2. لا تعمل reset/force-push لاستعادة المرجع. العمل على feature branch.
3. راجع manifest/lock والبيئة بأسماء المتغيرات دون values. أصلح install minimal وأشغل Vite.
4. أصلح صور metadata للتشغيل المحلي عبر mapping/resolver، مع fallback، دون تغيير قصة اللعبة.
5. اطلب من المستخدم تسجيل الدخول بحساب تجربة في المتصفح المحلي؛ لا تطلب password في الدردشة. لا تنشئ حساب عميل أو ترسل رسالة له تلقائيًا.
6. تحقق Landing → auth → setup إن لازم → /app → كل لعبة. لا حاجة إلى backend migration لهذه المرحلة.
7. شغّل حسابات/evaluator tests، ثم build/typecheck. اختبر وحدة Bun عند توفره.
8. للـUI: الاختبار `tests/e2e/reward_decision_flow.py` يستعمل Playwright وmocked backend/session؛ لا يثبت وصول واتساب. شغله على localhost فقط مع route interception. هذه fake session داخل اختبار، ليست auth bypass للشحن.
9. اختبر reload/pause عند تسليم المستند والتحليل والتوصية وبعد submit. تحقق الملف والحجج وتفرعات النتيجة.
10. إذا بقيت عقبات، حدّدها بوضوح مع سببها. لا تقل «جاهز بالكامل» إذا رأيت الصفحة فقط.

في repo الآن 15 test case في `tests/reward-decision.test.ts`، و`tests/round-persistence.test.ts` لعقود الأصلية. وجود tests لا يثبت مرورها في بيئتك. الاختبار البصري على320/360/390 مهم خصوصًا dropdown options الطويلة والحوار ومكان الصورة.

## 15. المزامنة والعودة إلى Lovable

لا تفصل ربط GitHub ولا تنشئ مشروع Lovable جديدًا. نفس المستودع هو مسار الاستمرار.

قبل البدء تحقق أن Lovable انتهى من تعديلاته وأن sync status متطابق. أبقِ Lovable على الفرع المتزامن، واعمل محليًا على feature branch. بعد المراجعة merge عادي إلى الفرع المتزامن، ثم يلتقط Lovable الكود. لا force-push أو rewrite history على الفرع المشترك. لا تُكمل تعديل نفس الملفات في الأداتين في الوقت نفسه دون تنسيق.

واجهة محلية لا تغير الموقع بمجرد save. Git commit محلي لا يزامن حتى push. Push على feature branch لا يُحدّث Lovable الذي يتابع main. وصول الدمج إلى الفرع المتزامن يحدّث المشروع/preview، وليس النشر العام؛ استخدم Publish بعد اختبار preview.

**نشر الـbackend منفصل:** ملفات وظيفة Edge أو SQL التي تتزامن لا تعني تلقائيًا نشر وظيفة جديدة أو تطبيق migration. إذا تغير `phone-auth`، اطلب نشر الوظيفة في Lovable بعد sync. إذا تغير schema، طبق migration صريحًا على البيئة المختارة بعد مراجعة؛ لا تشغّل كل التاريخ مجددًا على production.

## 16. حفظ السياق في Codex دون استبدال قواعد المستودع

ضع الملف داخل clone في `docs/The-Analyst_Codex_Handoff_AR.md`، ثم أضف إلى `AGENTS.md` الموجود فقرة قصيرة فقط، مع الحفاظ على كل قواعده:

```markdown
## Continuity
- Before project work, read docs/The-Analyst_Codex_Handoff_AR.md.
- Check current HEAD against its reference; newer source is authoritative for implementation.
- Preserve shared authentication and keep each game's state isolated.
- Local frontend uses the existing cloud backend unless explicitly changed.
- Never put Chakra, OTP HMAC, service-role or migration credentials in VITE_ variables.
```

لا تستبدل AGENTS.md كله ولا تلصق وثيقة طويلة مكانه. `AGENTS.md` تعليمات عملية قصيرة؛ هذه الوثيقة سياق تفصيلي وقراءة مباشرة. عند إنجاز تغييرات لاحقة حدّث فقرة «الحالة الحالية» والأعمال المتبقية بدل استمرار وصف قديم.

### الرسالة الأولى التي يرسلها صاحب المشروع إلى Codex

```text
هذا هو المستودع الحالي لـThe Analyst. اقرأ AGENTS.md وdocs/The-Analyst_Codex_Handoff_AR.md، ثم افحص الكود والنسخة المحلية بنفسك. لا تعِد بناء المشروع ولا تنفّذ كل قائمة التحسينات تلقائيًا.

مهمتك الأولى تجهيز وتشغيل النسخة محليًا على feature branch، بالـbackend الحالي، مع الحفاظ على الحسابات وواتساب واللعبتين. أصلح عدم تطابق dependency lock بالطريقة الأقل تغييرًا، وافحص صور asset.json ذات مسارات /__l5e وجهز وصولها محليًا مع fallback. لا تغير قاعدة البيانات أو تنشر Edge Functions أو ترسل WhatsApp test أو تعمل push/publish ضمن هذه المرحلة.

بعد التشغيل: وضح فهمك لسياق المشروع واللعبتين والهوية، واختبر ما تستطيع فعليًا، وأخبرني بما يعمل وما تعذر اختباره. سأسجل الدخول بحساب تجربة في المتصفح المحلي عند الحاجة. بعد ذلك سأعطيك التعديلات التالية. لا تطلب أسرار السيرفر لمجرد تشغيل الواجهة.
```

## 17. المراجع

الكود عند الـcommit المذكور هو مصدر وصف التنفيذ. الاتفاقات الواردة أعلاه سياق المنتج المعتمد، وقائمة الفجوات تميّز بينهما.

- Lovable Git/local work/backend deployment: https://docs.lovable.dev/integrations/git-sync-overview
- Codex AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- Codex local environments: https://learn.chatgpt.com/docs/environments/local-environment
- Supabase client keys: https://supabase.com/docs/guides/getting-started/api-keys
- Phone/password API: https://supabase.com/docs/reference/javascript/auth-signinwithpassword

المراجع مستقرة كروابط لكن تفاصيل الخدمات قد تتغير. افحصها عند تعديل عملية النشر أو إعداد backend جديد. لا تعِد هيكلة حسابات تعمل الآن لمجرد أن وثيقة جديدة تفضل SDK أحدث.
